package service

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/config"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/repository"
)

var (
	ErrInvalidDomain     = errors.New("invalid domain")
	ErrDomainAccessDenied = errors.New("domain access denied")
)

// Allowed domains for access tokens
var allowedDomains = map[string]bool{
	"resume":    true,
	"portfolio": true,
}

type DomainAccessService struct {
	cfg              *config.Config
	domainAccessRepo *repository.DomainAccessRepository
	userRepo         *repository.UserRepository
}

func NewDomainAccessService(
	cfg *config.Config,
	domainAccessRepo *repository.DomainAccessRepository,
	userRepo *repository.UserRepository,
) *DomainAccessService {
	return &DomainAccessService{
		cfg:              cfg,
		domainAccessRepo: domainAccessRepo,
		userRepo:         userRepo,
	}
}

// GrantAccess creates a new domain access token for sharing
func (s *DomainAccessService) GrantAccess(userID, domain string, expiresInHours int) (*model.DomainAccessToken, string, error) {
	// Validate domain
	if !allowedDomains[domain] {
		return nil, "", ErrInvalidDomain
	}

	// Validate user exists
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, "", err
	}

	// Generate secure token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	// Calculate expiration
	expiresAt := time.Now().Add(time.Duration(expiresInHours) * time.Hour)

	// Check for existing token and update or create
	existing, err := s.domainAccessRepo.FindByUserAndDomain(userID, domain)
	if err == nil {
		// Update existing token
		existing.Token = token
		existing.ExpiresAt = expiresAt
		if err := s.domainAccessRepo.Update(existing); err != nil {
			return nil, "", err
		}
		return existing, s.buildAccessURL(user.ExternalID, domain, token), nil
	}

	// Create new token
	domainAccess := &model.DomainAccessToken{
		UserID:    userID,
		Domain:    domain,
		Token:     token,
		ExpiresAt: expiresAt,
	}

	if err := s.domainAccessRepo.Create(domainAccess); err != nil {
		return nil, "", err
	}

	return domainAccess, s.buildAccessURL(user.ExternalID, domain, token), nil
}

// ValidateAccess validates a domain access token
func (s *DomainAccessService) ValidateAccess(token, domain string) (*model.User, error) {
	domainAccess, err := s.domainAccessRepo.FindByToken(token)
	if err != nil {
		return nil, ErrDomainAccessDenied
	}

	// Check domain matches
	if domainAccess.Domain != domain {
		return nil, ErrDomainAccessDenied
	}

	// Check expiration
	if time.Now().After(domainAccess.ExpiresAt) {
		return nil, ErrDomainAccessDenied
	}

	// Get user
	return s.userRepo.FindByID(domainAccess.UserID)
}

// RevokeAccess revokes a domain access token
func (s *DomainAccessService) RevokeAccess(userID, domain string) error {
	token, err := s.domainAccessRepo.FindByUserAndDomain(userID, domain)
	if err != nil {
		return err
	}
	return s.domainAccessRepo.DeleteByID(token.ID)
}

// GetUserTokens gets all active domain access tokens for a user
func (s *DomainAccessService) GetUserTokens(userID string) ([]model.DomainAccessToken, error) {
	return s.domainAccessRepo.FindByUserID(userID)
}

// CleanupExpired removes expired tokens
func (s *DomainAccessService) CleanupExpired() error {
	return s.domainAccessRepo.DeleteExpired()
}

func (s *DomainAccessService) buildAccessURL(externalID, domain, token string) string {
	baseURL := s.cfg.App.BaseURL
	if baseURL == "" {
		baseURL = "https://girok.dev"
	}
	return fmt.Sprintf("%s/%s/%s?token=%s", baseURL, domain, externalID, token)
}
