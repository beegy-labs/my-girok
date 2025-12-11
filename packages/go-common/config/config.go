package config

import (
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration for the application
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

type JWTConfig struct {
	Secret             string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
}

type OAuthConfig struct {
	Google GoogleOAuthConfig
	Kakao  KakaoOAuthConfig
	Naver  NaverOAuthConfig
	Apple  AppleOAuthConfig
}

type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type KakaoOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type NaverOAuthConfig struct {
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

// Load loads configuration from environment variables
func Load() (*Config, error) {
	viper.AutomaticEnv()

	// Server defaults
	viper.SetDefault("PORT", "4001")
	viper.SetDefault("NODE_ENV", "development")
	viper.SetDefault("CORS_ORIGINS", "http://localhost:3000")

	// Database defaults
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "postgres")
	viper.SetDefault("DB_NAME", "auth")
	viper.SetDefault("DB_SSL_MODE", "disable")

	// JWT defaults
	viper.SetDefault("JWT_SECRET", "your-secret-key")
	viper.SetDefault("JWT_ACCESS_EXPIRY", "15m")
	viper.SetDefault("JWT_REFRESH_EXPIRY", "168h") // 7 days

	accessExpiry, _ := time.ParseDuration(viper.GetString("JWT_ACCESS_EXPIRY"))
	refreshExpiry, _ := time.ParseDuration(viper.GetString("JWT_REFRESH_EXPIRY"))

	return &Config{
		Server: ServerConfig{
			Port:         viper.GetString("PORT"),
			Environment:  viper.GetString("NODE_ENV"),
			AllowOrigins: viper.GetStringSlice("CORS_ORIGINS"),
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
			Google: GoogleOAuthConfig{
				ClientID:     viper.GetString("GOOGLE_CLIENT_ID"),
				ClientSecret: viper.GetString("GOOGLE_CLIENT_SECRET"),
				RedirectURL:  viper.GetString("GOOGLE_REDIRECT_URL"),
			},
			Kakao: KakaoOAuthConfig{
				ClientID:     viper.GetString("KAKAO_CLIENT_ID"),
				ClientSecret: viper.GetString("KAKAO_CLIENT_SECRET"),
				RedirectURL:  viper.GetString("KAKAO_REDIRECT_URL"),
			},
			Naver: NaverOAuthConfig{
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

// DSN returns PostgreSQL connection string
func (c *DatabaseConfig) DSN() string {
	return "host=" + c.Host +
		" port=" + c.Port +
		" user=" + c.User +
		" password=" + c.Password +
		" dbname=" + c.DBName +
		" sslmode=" + c.SSLMode
}
