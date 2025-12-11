package service

import (
	"errors"
	"time"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/config"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/repository"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/utils"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// bcrypt cost as per SECURITY.md policy (12 rounds)
const bcryptCost = 12

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenExpired       = errors.New("token expired")
	ErrUserNotActive      = errors.New("user is not active")
)

type AuthService struct {
	cfg         *config.Config
	userRepo    *repository.UserRepository
	sessionRepo *repository.SessionRepository
}

func NewAuthService(cfg *config.Config, userRepo *repository.UserRepository, sessionRepo *repository.SessionRepository) *AuthService {
	return &AuthService{
		cfg:         cfg,
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
	}
}

type Claims struct {
	jwt.RegisteredClaims
	Email    string             `json:"email"`
	Username string             `json:"username,omitempty"`
	Role     model.Role         `json:"role"`
	Type     string             `json:"type"`
	Provider model.AuthProvider `json:"provider,omitempty"`
}

func (s *AuthService) Register(req *model.RegisterRequest) (*model.AuthResponse, error) {
	// Check if user already exists by email
	_, err := s.userRepo.FindByEmail(req.Email)
	if err == nil {
		return nil, repository.ErrUserAlreadyExists
	}

	// Check if username already taken
	_, err = s.userRepo.FindByUsername(req.Username)
	if err == nil {
		return nil, repository.ErrUsernameAlreadyExists
	}

	// Hash password with 12 rounds as per SECURITY.md
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, err
	}

	// Generate unique external ID with collision checking
	externalID, err := utils.GenerateUniqueExternalID(func(id string) (bool, error) {
		_, err := s.userRepo.FindByExternalID(id)
		if err == repository.ErrUserNotFound {
			return true, nil // ID is unique
		}
		if err != nil {
			return false, err
		}
		return false, nil // ID exists
	})
	if err != nil {
		return nil, err
	}

	// Create user
	user := &model.User{
		ExternalID:   externalID,
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
		Role:         model.RoleUser,
		Provider:     model.ProviderLocal,
		IsActive:     true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Generate tokens
	return s.generateAuthResponse(user, "", "")
}

func (s *AuthService) Login(req *model.LoginRequest, userAgent, ip string) (*model.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, ErrUserNotActive
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Update last login
	now := time.Now()
	user.LastLoginAt = &now
	s.userRepo.Update(user)

	return s.generateAuthResponse(user, userAgent, ip)
}

func (s *AuthService) RefreshToken(refreshToken string) (*model.TokenResponse, error) {
	// Validate refresh token
	claims, err := s.validateToken(refreshToken)
	if err != nil {
		return nil, err
	}

	if claims.Type != "refresh" {
		return nil, ErrInvalidToken
	}

	// Find session
	session, err := s.sessionRepo.FindByRefreshToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// Get user
	user, err := s.userRepo.FindByID(session.UserID)
	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrUserNotActive
	}

	// Generate new access token
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	// Generate new refresh token
	newRefreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	// Update session
	session.RefreshToken = newRefreshToken
	session.ExpiresAt = time.Now().Add(s.cfg.JWT.RefreshTokenExpiry)
	s.sessionRepo.Update(session)

	return &model.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    int64(s.cfg.JWT.AccessTokenExpiry.Seconds()),
	}, nil
}

func (s *AuthService) Logout(refreshToken string) error {
	return s.sessionRepo.DeleteByRefreshToken(refreshToken)
}

func (s *AuthService) GetUserByID(id string) (*model.User, error) {
	return s.userRepo.FindByID(id)
}

func (s *AuthService) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := s.validateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.Type != "access" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (s *AuthService) generateAuthResponse(user *model.User, userAgent, ip string) (*model.AuthResponse, error) {
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	// Create session
	session := &model.Session{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		UserAgent:    userAgent,
		IP:           ip,
		ExpiresAt:    time.Now().Add(s.cfg.JWT.RefreshTokenExpiry),
	}
	s.sessionRepo.Create(session)

	return &model.AuthResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.cfg.JWT.AccessTokenExpiry.Seconds()),
	}, nil
}

func (s *AuthService) generateAccessToken(user *model.User) (string, error) {
	now := time.Now()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.JWT.AccessTokenExpiry)),
		},
		Email:    user.Email,
		Username: user.Username,
		Role:     user.Role,
		Type:     "access",
		Provider: user.Provider,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWT.Secret))
}

func (s *AuthService) generateRefreshToken(user *model.User) (string, error) {
	now := time.Now()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.JWT.RefreshTokenExpiry)),
		},
		Email: user.Email,
		Role:  user.Role,
		Type:  "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWT.Secret))
}

func (s *AuthService) validateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(s.cfg.JWT.Secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// OAuth methods
func (s *AuthService) FindOrCreateOAuthUser(provider model.AuthProvider, providerID, email, name, picture string) (*model.User, error) {
	// Try to find existing user by provider + providerID
	user, err := s.userRepo.FindByProviderID(provider, providerID)
	if err == nil {
		// Update user info
		user.Name = name
		user.Picture = picture
		now := time.Now()
		user.LastLoginAt = &now
		s.userRepo.Update(user)
		return user, nil
	}

	// Try to find by email and link account
	user, err = s.userRepo.FindByEmail(email)
	if err == nil {
		// Link OAuth to existing account
		user.Provider = provider
		user.ProviderID = providerID
		user.Name = name
		user.Picture = picture
		user.EmailVerified = true
		now := time.Now()
		user.LastLoginAt = &now
		s.userRepo.Update(user)
		return user, nil
	}

	// Generate unique external ID for new user
	externalID, err := utils.GenerateUniqueExternalID(func(id string) (bool, error) {
		_, err := s.userRepo.FindByExternalID(id)
		if err == repository.ErrUserNotFound {
			return true, nil
		}
		if err != nil {
			return false, err
		}
		return false, nil
	})
	if err != nil {
		return nil, err
	}

	// Generate unique username from email
	username := generateUsername(email)

	// Create new user
	user = &model.User{
		ExternalID:    externalID,
		Email:         email,
		Username:      username,
		Name:          name,
		Picture:       picture,
		Role:          model.RoleUser,
		Provider:      provider,
		ProviderID:    providerID,
		EmailVerified: true,
		IsActive:      true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AuthService) GenerateOAuthResponse(user *model.User, userAgent, ip string) (*model.AuthResponse, error) {
	return s.generateAuthResponse(user, userAgent, ip)
}

// ChangePassword changes user's password
func (s *AuthService) ChangePassword(userID, currentPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	// OAuth users don't have passwords
	if user.Provider != model.ProviderLocal || user.PasswordHash == "" {
		return errors.New("password change not allowed for OAuth users")
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	// Hash new password with 12 rounds
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return err
	}

	user.PasswordHash = string(hashedPassword)
	return s.userRepo.Update(user)
}

// GenerateTokens generates access and refresh tokens (public method for OAuth handler)
func (s *AuthService) GenerateTokens(user *model.User) (*model.TokenResponse, error) {
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &model.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.cfg.JWT.AccessTokenExpiry.Seconds()),
	}, nil
}

func generateUsername(email string) string {
	// Extract username from email prefix + random suffix
	prefix := ""
	for i, c := range email {
		if c == '@' {
			prefix = email[:i]
			break
		}
	}
	if prefix == "" {
		prefix = email
	}

	// Add random suffix to avoid conflicts
	randomSuffix, _ := utils.GenerateRandomBase62(6)
	return prefix + randomSuffix
}
