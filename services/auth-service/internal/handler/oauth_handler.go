package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"net/url"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/config"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/service"
	"github.com/gin-gonic/gin"
)

type OAuthHandler struct {
	oauthService *service.OAuthService
	authService  *service.AuthService
	cfg          *config.Config
}

func NewOAuthHandler(oauthService *service.OAuthService, authService *service.AuthService, cfg *config.Config) *OAuthHandler {
	return &OAuthHandler{
		oauthService: oauthService,
		authService:  authService,
		cfg:          cfg,
	}
}

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *OAuthHandler) redirectWithTokens(c *gin.Context, accessToken, refreshToken string) {
	u, _ := url.Parse(h.cfg.OAuth.FrontendURL)
	q := u.Query()
	q.Set("access_token", accessToken)
	q.Set("refresh_token", refreshToken)
	u.RawQuery = q.Encode()
	c.Redirect(http.StatusTemporaryRedirect, u.String())
}

// Google OAuth
func (h *OAuthHandler) GoogleLogin(c *gin.Context) {
	state := generateState()
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)
	authURL := h.oauthService.GetGoogleAuthURL(state)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func (h *OAuthHandler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	user, err := h.oauthService.HandleGoogleCallback(c.Request.Context(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "oauth failed: " + err.Error()})
		return
	}

	resp, err := h.authService.GenerateOAuthResponse(user, c.GetHeader("User-Agent"), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate tokens"})
		return
	}

	h.redirectWithTokens(c, resp.AccessToken, resp.RefreshToken)
}

// Kakao OAuth
func (h *OAuthHandler) KakaoLogin(c *gin.Context) {
	state := generateState()
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)
	authURL := h.oauthService.GetKakaoAuthURL(state)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func (h *OAuthHandler) KakaoCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	user, err := h.oauthService.HandleKakaoCallback(c.Request.Context(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "oauth failed: " + err.Error()})
		return
	}

	resp, err := h.authService.GenerateOAuthResponse(user, c.GetHeader("User-Agent"), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate tokens"})
		return
	}

	h.redirectWithTokens(c, resp.AccessToken, resp.RefreshToken)
}

// Naver OAuth
func (h *OAuthHandler) NaverLogin(c *gin.Context) {
	state := generateState()
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)
	authURL := h.oauthService.GetNaverAuthURL(state)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func (h *OAuthHandler) NaverCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	user, err := h.oauthService.HandleNaverCallback(c.Request.Context(), code, state)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "oauth failed: " + err.Error()})
		return
	}

	resp, err := h.authService.GenerateOAuthResponse(user, c.GetHeader("User-Agent"), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate tokens"})
		return
	}

	h.redirectWithTokens(c, resp.AccessToken, resp.RefreshToken)
}
