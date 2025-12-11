package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	OAuth    OAuthConfig
}

type ServerConfig struct {
	Port         string
	Environment  string
	AllowOrigins []string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
}

type JWTConfig struct {
	Secret             string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
}

type OAuthConfig struct {
	Google      OAuthProviderConfig
	Kakao       OAuthProviderConfig
	Naver       OAuthProviderConfig
	Apple       AppleOAuthConfig
	FrontendURL string
}

type OAuthProviderConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type AppleOAuthConfig struct {
	ClientID    string
	TeamID      string
	KeyID       string
	PrivateKey  string
	RedirectURL string
}

func Load() (*Config, error) {
	viper.AutomaticEnv()

	// Server
	viper.SetDefault("PORT", "4001")
	viper.SetDefault("NODE_ENV", "development")
	viper.SetDefault("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")

	// Database
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "postgres")
	viper.SetDefault("DB_NAME", "auth")
	viper.SetDefault("DB_SSL_MODE", "disable")

	// JWT
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-in-production")
	viper.SetDefault("JWT_ACCESS_EXPIRY", "15m")
	viper.SetDefault("JWT_REFRESH_EXPIRY", "168h")

	// Frontend URL for OAuth callbacks
	viper.SetDefault("FRONTEND_URL", "http://localhost:3000")

	accessExpiry, _ := time.ParseDuration(viper.GetString("JWT_ACCESS_EXPIRY"))
	refreshExpiry, _ := time.ParseDuration(viper.GetString("JWT_REFRESH_EXPIRY"))

	// Parse CORS origins
	originsStr := viper.GetString("CORS_ORIGINS")
	var origins []string
	if originsStr != "" {
		origins = splitAndTrim(originsStr, ",")
	}

	return &Config{
		Server: ServerConfig{
			Port:         viper.GetString("PORT"),
			Environment:  viper.GetString("NODE_ENV"),
			AllowOrigins: origins,
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetString("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			DBName:   viper.GetString("DB_NAME"),
			SSLMode:  viper.GetString("DB_SSL_MODE"),
		},
		JWT: JWTConfig{
			Secret:             viper.GetString("JWT_SECRET"),
			AccessTokenExpiry:  accessExpiry,
			RefreshTokenExpiry: refreshExpiry,
		},
		OAuth: OAuthConfig{
			FrontendURL: viper.GetString("FRONTEND_URL"),
			Google: OAuthProviderConfig{
				ClientID:     viper.GetString("GOOGLE_CLIENT_ID"),
				ClientSecret: viper.GetString("GOOGLE_CLIENT_SECRET"),
				RedirectURL:  viper.GetString("GOOGLE_REDIRECT_URL"),
			},
			Kakao: OAuthProviderConfig{
				ClientID:     viper.GetString("KAKAO_CLIENT_ID"),
				ClientSecret: viper.GetString("KAKAO_CLIENT_SECRET"),
				RedirectURL:  viper.GetString("KAKAO_REDIRECT_URL"),
			},
			Naver: OAuthProviderConfig{
				ClientID:     viper.GetString("NAVER_CLIENT_ID"),
				ClientSecret: viper.GetString("NAVER_CLIENT_SECRET"),
				RedirectURL:  viper.GetString("NAVER_REDIRECT_URL"),
			},
			Apple: AppleOAuthConfig{
				ClientID:    viper.GetString("APPLE_CLIENT_ID"),
				TeamID:      viper.GetString("APPLE_TEAM_ID"),
				KeyID:       viper.GetString("APPLE_KEY_ID"),
				PrivateKey:  viper.GetString("APPLE_PRIVATE_KEY"),
				RedirectURL: viper.GetString("APPLE_REDIRECT_URL"),
			},
		},
	}, nil
}

func splitAndTrim(s, sep string) []string {
	var result []string
	for _, part := range split(s, sep) {
		trimmed := trim(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func split(s, sep string) []string {
	var result []string
	start := 0
	for i := 0; i < len(s); i++ {
		if i+len(sep) <= len(s) && s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i += len(sep) - 1
		}
	}
	result = append(result, s[start:])
	return result
}

func trim(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
