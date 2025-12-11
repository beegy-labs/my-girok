package handler

import (
	"net/http"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/service"
	"github.com/gin-gonic/gin"
)

type DomainAccessHandler struct {
	domainAccessService *service.DomainAccessService
}

func NewDomainAccessHandler(domainAccessService *service.DomainAccessService) *DomainAccessHandler {
	return &DomainAccessHandler{
		domainAccessService: domainAccessService,
	}
}

// GrantAccess creates a new domain access token for sharing
// POST /v1/auth/domain-access
func (h *DomainAccessHandler) GrantAccess(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req model.GrantDomainAccessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, accessURL, err := h.domainAccessService.GrantAccess(userID.(string), req.Domain, req.ExpiresInHours)
	if err != nil {
		switch err {
		case service.ErrInvalidDomain:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid domain"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to grant access"})
		}
		return
	}

	c.JSON(http.StatusCreated, model.DomainAccessResponse{
		AccessToken: token.Token,
		ExpiresAt:   token.ExpiresAt,
		AccessURL:   accessURL,
	})
}

// ValidateAccess validates a domain access token
// GET /v1/auth/domain-access/validate
func (h *DomainAccessHandler) ValidateAccess(c *gin.Context) {
	token := c.Query("token")
	domain := c.Query("domain")

	if token == "" || domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token and domain are required"})
		return
	}

	user, err := h.domainAccessService.ValidateAccess(token, domain)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	// Return limited user info for the shared resource
	c.JSON(http.StatusOK, gin.H{
		"valid":      true,
		"userId":     user.ID,
		"externalId": user.ExternalID,
		"name":       user.Name,
		"email":      user.Email,
	})
}

// RevokeAccess revokes a domain access token
// DELETE /v1/auth/domain-access/:domain
func (h *DomainAccessHandler) RevokeAccess(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	domain := c.Param("domain")
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "domain is required"})
		return
	}

	err := h.domainAccessService.RevokeAccess(userID.(string), domain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke access"})
		return
	}

	c.JSON(http.StatusOK, model.MessageResponse{Message: "access revoked successfully"})
}

// GetMyTokens returns all active domain access tokens for the current user
// GET /v1/auth/domain-access
func (h *DomainAccessHandler) GetMyTokens(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	tokens, err := h.domainAccessService.GetUserTokens(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get tokens"})
		return
	}

	// Return token info (without actual token values for security)
	var response []gin.H
	for _, t := range tokens {
		response = append(response, gin.H{
			"id":        t.ID,
			"domain":    t.Domain,
			"expiresAt": t.ExpiresAt,
			"createdAt": t.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, response)
}
