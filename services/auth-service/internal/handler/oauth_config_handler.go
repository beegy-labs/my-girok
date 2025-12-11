package handler

import (
	"net/http"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/repository"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/service"
	"github.com/gin-gonic/gin"
)

type OAuthConfigHandler struct {
	oauthConfigService *service.OAuthConfigService
}

func NewOAuthConfigHandler(oauthConfigService *service.OAuthConfigService) *OAuthConfigHandler {
	return &OAuthConfigHandler{
		oauthConfigService: oauthConfigService,
	}
}

// GetProviders returns all OAuth provider configurations
// GET /v1/admin/oauth-config
func (h *OAuthConfigHandler) GetProviders(c *gin.Context) {
	configs, err := h.oauthConfigService.GetAllProviders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get providers"})
		return
	}

	var response []model.OAuthProviderConfigResponse
	for _, config := range configs {
		response = append(response, config.ToResponse())
	}

	c.JSON(http.StatusOK, response)
}

// GetEnabledProviders returns only enabled OAuth providers (public endpoint)
// GET /v1/auth/oauth/providers
func (h *OAuthConfigHandler) GetEnabledProviders(c *gin.Context) {
	configs, err := h.oauthConfigService.GetEnabledProviders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get providers"})
		return
	}

	var response []model.OAuthProviderStatusResponse
	for _, config := range configs {
		response = append(response, model.OAuthProviderStatusResponse{
			Provider: config.Provider,
			Enabled:  config.Enabled,
		})
	}

	c.JSON(http.StatusOK, response)
}

// GetProvider returns a specific OAuth provider configuration
// GET /v1/admin/oauth-config/:provider
func (h *OAuthConfigHandler) GetProvider(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := model.AuthProvider(providerStr)

	config, err := h.oauthConfigService.GetProvider(provider)
	if err != nil {
		if err == repository.ErrOAuthConfigNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get provider"})
		return
	}

	c.JSON(http.StatusOK, config.ToResponse())
}

// ToggleProvider enables or disables an OAuth provider
// PATCH /v1/admin/oauth-config/:provider/toggle
func (h *OAuthConfigHandler) ToggleProvider(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := model.AuthProvider(providerStr)

	// Validate provider
	if !isValidProvider(provider) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid provider"})
		return
	}

	var req model.ToggleProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	config, err := h.oauthConfigService.ToggleProvider(provider, req.Enabled, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to toggle provider"})
		return
	}

	c.JSON(http.StatusOK, config.ToResponse())
}

// UpdateProvider updates OAuth provider configuration
// PATCH /v1/admin/oauth-config/:provider
func (h *OAuthConfigHandler) UpdateProvider(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := model.AuthProvider(providerStr)

	// Validate provider
	if !isValidProvider(provider) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid provider"})
		return
	}

	var req struct {
		DisplayName string `json:"displayName"`
		Description string `json:"description"`
		CallbackURL string `json:"callbackUrl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	config, err := h.oauthConfigService.UpdateProviderConfig(
		provider,
		req.DisplayName,
		req.Description,
		req.CallbackURL,
		userID.(string),
	)
	if err != nil {
		if err == repository.ErrOAuthConfigNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update provider"})
		return
	}

	c.JSON(http.StatusOK, config.ToResponse())
}

func isValidProvider(provider model.AuthProvider) bool {
	validProviders := map[model.AuthProvider]bool{
		model.ProviderGoogle: true,
		model.ProviderKakao:  true,
		model.ProviderNaver:  true,
		model.ProviderApple:  true,
	}
	return validProviders[provider]
}
