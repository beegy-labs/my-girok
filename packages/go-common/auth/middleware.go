package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	ContextUserKey      = "user"
	ContextClaimsKey    = "claims"
)

// AuthMiddleware creates a JWT authentication middleware
func AuthMiddleware(jwtManager *JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header required",
			})
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header format",
			})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			status := http.StatusUnauthorized
			message := "invalid token"
			if err == ErrExpiredToken {
				message = "token has expired"
			}
			c.AbortWithStatusJSON(status, gin.H{
				"error": message,
			})
			return
		}

		// Verify it's an access token
		if claims.Type != TokenTypeAccess {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token type",
			})
			return
		}

		// Set claims in context
		c.Set(ContextClaimsKey, claims)
		c.Set(ContextUserKey, claims.Subject)
		c.Next()
	}
}

// OptionalAuthMiddleware allows requests without token but validates if present
func OptionalAuthMiddleware(jwtManager *JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			c.Next()
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.Next()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		claims, err := jwtManager.ValidateToken(tokenString)
		if err == nil && claims.Type == TokenTypeAccess {
			c.Set(ContextClaimsKey, claims)
			c.Set(ContextUserKey, claims.Subject)
		}
		c.Next()
	}
}

// RoleMiddleware checks if user has required role
func RoleMiddleware(allowedRoles ...Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsValue, exists := c.Get(ContextClaimsKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authentication required",
			})
			return
		}

		claims, ok := claimsValue.(*Claims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "invalid claims",
			})
			return
		}

		for _, role := range allowedRoles {
			if claims.Role == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "insufficient permissions",
		})
	}
}

// GetClaims retrieves claims from context
func GetClaims(c *gin.Context) (*Claims, bool) {
	claimsValue, exists := c.Get(ContextClaimsKey)
	if !exists {
		return nil, false
	}
	claims, ok := claimsValue.(*Claims)
	return claims, ok
}

// GetUserID retrieves user ID from context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get(ContextUserKey)
	if !exists {
		return "", false
	}
	id, ok := userID.(string)
	return id, ok
}
