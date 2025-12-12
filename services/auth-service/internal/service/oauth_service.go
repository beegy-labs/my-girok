package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/config"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type OAuthService struct {
	cfg         *config.Config
	authService *AuthService
}

func NewOAuthService(cfg *config.Config, authService *AuthService) *OAuthService {
	return &OAuthService{
		cfg:         cfg,
		authService: authService,
	}
}

// Google OAuth
func (s *OAuthService) GetGoogleAuthURL(state string) string {
	cfg := &oauth2.Config{
		ClientID:     s.cfg.OAuth.Google.ClientID,
		ClientSecret: s.cfg.OAuth.Google.ClientSecret,
		RedirectURL:  s.cfg.OAuth.Google.RedirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
	return cfg.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *OAuthService) HandleGoogleCallback(ctx context.Context, code string) (*model.User, error) {
	cfg := &oauth2.Config{
		ClientID:     s.cfg.OAuth.Google.ClientID,
		ClientSecret: s.cfg.OAuth.Google.ClientSecret,
		RedirectURL:  s.cfg.OAuth.Google.RedirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}

	token, err := cfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}

	client := cfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return s.authService.FindOrCreateOAuthUser(
		model.ProviderGoogle,
		userInfo.ID, // Google's user ID as providerID
		userInfo.Email,
		userInfo.Name,
		userInfo.Picture,
	)
}

// Kakao OAuth
func (s *OAuthService) GetKakaoAuthURL(state string) string {
	params := url.Values{
		"client_id":     {s.cfg.OAuth.Kakao.ClientID},
		"redirect_uri":  {s.cfg.OAuth.Kakao.RedirectURL},
		"response_type": {"code"},
		"state":         {state},
	}
	return "https://kauth.kakao.com/oauth/authorize?" + params.Encode()
}

func (s *OAuthService) HandleKakaoCallback(ctx context.Context, code string) (*model.User, error) {
	// Exchange code for token
	tokenURL := "https://kauth.kakao.com/oauth/token"
	data := url.Values{
		"grant_type":   {"authorization_code"},
		"client_id":    {s.cfg.OAuth.Kakao.ClientID},
		"redirect_uri": {s.cfg.OAuth.Kakao.RedirectURL},
		"code":         {code},
	}

	if s.cfg.OAuth.Kakao.ClientSecret != "" {
		data.Set("client_secret", s.cfg.OAuth.Kakao.ClientSecret)
	}

	resp, err := http.Post(tokenURL, "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token: %w", err)
	}

	// Get user info
	req, _ := http.NewRequest("GET", "https://kapi.kakao.com/v2/user/me", nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	client := &http.Client{}
	userResp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer userResp.Body.Close()

	var userInfo struct {
		ID           int64 `json:"id"`
		KakaoAccount struct {
			Email   string `json:"email"`
			Profile struct {
				Nickname string `json:"nickname"`
				Image    string `json:"profile_image_url"`
			} `json:"profile"`
		} `json:"kakao_account"`
	}

	if err := json.NewDecoder(userResp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return s.authService.FindOrCreateOAuthUser(
		model.ProviderKakao,
		fmt.Sprintf("%d", userInfo.ID),
		userInfo.KakaoAccount.Email,
		userInfo.KakaoAccount.Profile.Nickname,
		userInfo.KakaoAccount.Profile.Image,
	)
}

// Naver OAuth
func (s *OAuthService) GetNaverAuthURL(state string) string {
	params := url.Values{
		"client_id":     {s.cfg.OAuth.Naver.ClientID},
		"redirect_uri":  {s.cfg.OAuth.Naver.RedirectURL},
		"response_type": {"code"},
		"state":         {state},
	}
	return "https://nid.naver.com/oauth2.0/authorize?" + params.Encode()
}

func (s *OAuthService) HandleNaverCallback(ctx context.Context, code, state string) (*model.User, error) {
	// Exchange code for token
	tokenURL := "https://nid.naver.com/oauth2.0/token"
	params := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {s.cfg.OAuth.Naver.ClientID},
		"client_secret": {s.cfg.OAuth.Naver.ClientSecret},
		"code":          {code},
		"state":         {state},
	}

	resp, err := http.Get(tokenURL + "?" + params.Encode())
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token: %w", err)
	}

	// Get user info
	req, _ := http.NewRequest("GET", "https://openapi.naver.com/v1/nid/me", nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	client := &http.Client{}
	userResp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer userResp.Body.Close()

	body, _ := io.ReadAll(userResp.Body)

	var userInfo struct {
		Response struct {
			ID      string `json:"id"`
			Email   string `json:"email"`
			Name    string `json:"name"`
			Picture string `json:"profile_image"`
		} `json:"response"`
	}

	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	return s.authService.FindOrCreateOAuthUser(
		model.ProviderNaver,
		userInfo.Response.ID,
		userInfo.Response.Email,
		userInfo.Response.Name,
		userInfo.Response.Picture,
	)
}
