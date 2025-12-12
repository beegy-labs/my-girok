package main

import (
	"log"
	"os"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/config"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/handler"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/middleware"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/repository"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Setup Gin mode
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to database
	db, err := connectDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate models
	if err := db.AutoMigrate(&model.User{}, &model.Session{}, &model.OAuthProviderConfig{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)

	// Initialize services
	authService := service.NewAuthService(cfg, userRepo, sessionRepo)
	oauthService := service.NewOAuthService(cfg, authService)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	oauthHandler := handler.NewOAuthHandler(oauthService, authService, cfg)
	userHandler := handler.NewUserHandler(userRepo)
	healthHandler := handler.NewHealthHandler(db)

	// Setup router
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.Server.AllowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check (no /v1 prefix per policy)
	r.GET("/health", healthHandler.Health)
	r.GET("/health/ready", healthHandler.Ready)

	// API v1 routes
	v1 := r.Group("/v1")

	// Auth routes (public)
	auth := v1.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)

		// OAuth routes
		auth.GET("/google", oauthHandler.GoogleLogin)
		auth.GET("/google/callback", oauthHandler.GoogleCallback)
		auth.GET("/kakao", oauthHandler.KakaoLogin)
		auth.GET("/kakao/callback", oauthHandler.KakaoCallback)
		auth.GET("/naver", oauthHandler.NaverLogin)
		auth.GET("/naver/callback", oauthHandler.NaverCallback)
	}

	// Protected routes
	authMiddleware := middleware.AuthMiddleware(cfg.JWT.Secret)

	// Auth routes (protected)
	authProtected := v1.Group("/auth")
	authProtected.Use(authMiddleware)
	{
		authProtected.GET("/me", authHandler.Me)
	}

	// User routes (protected)
	users := v1.Group("/users")
	users.Use(authMiddleware)
	{
		users.GET("", middleware.RoleMiddleware("MANAGER", "MASTER"), userHandler.List)
		users.GET("/:id", userHandler.Get)
		users.PATCH("/:id", userHandler.Update)
		users.DELETE("/:id", middleware.RoleMiddleware("MASTER"), userHandler.Delete)
	}

	// Start server
	port := cfg.Server.Port
	if port == "" {
		port = "4001"
	}
	log.Printf("Auth service starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func connectDB(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Silent
	if cfg.Server.Environment == "development" {
		logLevel = logger.Info
	}

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	return gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: newLogger,
	})
}
