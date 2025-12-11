package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
)

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret              string
	AccessTokenExpiry   time.Duration
	RefreshTokenExpiry  time.Duration
}

// DefaultConfig returns default JWT configuration
func DefaultConfig(secret string) *JWTConfig {
	return &JWTConfig{
		Secret:             secret,
		AccessTokenExpiry:  15 * time.Minute,
		RefreshTokenExpiry: 7 * 24 * time.Hour,
	}
}

// JWTManager handles JWT operations
type JWTManager struct {
	config *JWTConfig
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(config *JWTConfig) *JWTManager {
	return &JWTManager{config: config}
}

// GenerateAccessToken generates an access token
func (m *JWTManager) GenerateAccessToken(userID, email, username string, role Role, provider AuthProvider) (string, error) {
	return m.generateToken(userID, email, username, role, provider, TokenTypeAccess, m.config.AccessTokenExpiry)
}

// GenerateRefreshToken generates a refresh token
func (m *JWTManager) GenerateRefreshToken(userID, email, username string, role Role, provider AuthProvider) (string, error) {
	return m.generateToken(userID, email, username, role, provider, TokenTypeRefresh, m.config.RefreshTokenExpiry)
}

func (m *JWTManager) generateToken(userID, email, username string, role Role, provider AuthProvider, tokenType TokenType, expiry time.Duration) (string, error) {
	now := time.Now()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
		},
		Email:    email,
		Username: username,
		Role:     role,
		Type:     tokenType,
		Provider: provider,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.config.Secret))
}

// ValidateToken validates a JWT token and returns claims
func (m *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(m.config.Secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// TokenPair represents access and refresh token pair
type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
}

// GenerateTokenPair generates both access and refresh tokens
func (m *JWTManager) GenerateTokenPair(userID, email, username string, role Role, provider AuthProvider) (*TokenPair, error) {
	accessToken, err := m.GenerateAccessToken(userID, email, username, role, provider)
	if err != nil {
		return nil, err
	}

	refreshToken, err := m.GenerateRefreshToken(userID, email, username, role, provider)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(m.config.AccessTokenExpiry.Seconds()),
	}, nil
}
