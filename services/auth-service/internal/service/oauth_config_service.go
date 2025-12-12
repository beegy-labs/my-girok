package service

import (
	"time"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/repository"
)

type OAuthConfigService struct {
	oauthConfigRepo *repository.OAuthConfigRepository
}

func NewOAuthConfigService(oauthConfigRepo *repository.OAuthConfigRepository) *OAuthConfigService {
	return &OAuthConfigService{
		oauthConfigRepo: oauthConfigRepo,
	}
}

// GetAllProviders returns all OAuth provider configurations
func (s *OAuthConfigService) GetAllProviders() ([]model.OAuthProviderConfig, error) {
	return s.oauthConfigRepo.FindAll()
}

// GetEnabledProviders returns only enabled OAuth providers
func (s *OAuthConfigService) GetEnabledProviders() ([]model.OAuthProviderConfig, error) {
	return s.oauthConfigRepo.FindEnabled()
}

// GetProvider returns a specific OAuth provider configuration
func (s *OAuthConfigService) GetProvider(provider model.AuthProvider) (*model.OAuthProviderConfig, error) {
	return s.oauthConfigRepo.FindByProvider(provider)
}

// ToggleProvider enables or disables an OAuth provider
func (s *OAuthConfigService) ToggleProvider(provider model.AuthProvider, enabled bool, updatedBy string) (*model.OAuthProviderConfig, error) {
	config, err := s.oauthConfigRepo.FindByProvider(provider)
	if err != nil {
		// Create new config if not exists
		config = &model.OAuthProviderConfig{
			Provider:    provider,
			Enabled:     enabled,
			DisplayName: getProviderDisplayName(provider),
			Description: getProviderDescription(provider),
			UpdatedAt:   time.Now(),
			UpdatedBy:   updatedBy,
		}
		if err := s.oauthConfigRepo.Create(config); err != nil {
			return nil, err
		}
		return config, nil
	}

	config.Enabled = enabled
	config.UpdatedAt = time.Now()
	config.UpdatedBy = updatedBy

	if err := s.oauthConfigRepo.Update(config); err != nil {
		return nil, err
	}

	return config, nil
}

// IsProviderEnabled checks if a specific OAuth provider is enabled
func (s *OAuthConfigService) IsProviderEnabled(provider model.AuthProvider) (bool, error) {
	return s.oauthConfigRepo.IsProviderEnabled(provider)
}

// UpdateProviderConfig updates OAuth provider configuration
func (s *OAuthConfigService) UpdateProviderConfig(
	provider model.AuthProvider,
	displayName, description, callbackURL, updatedBy string,
) (*model.OAuthProviderConfig, error) {
	config, err := s.oauthConfigRepo.FindByProvider(provider)
	if err != nil {
		return nil, err
	}

	if displayName != "" {
		config.DisplayName = displayName
	}
	if description != "" {
		config.Description = description
	}
	if callbackURL != "" {
		config.CallbackURL = callbackURL
	}
	config.UpdatedAt = time.Now()
	config.UpdatedBy = updatedBy

	if err := s.oauthConfigRepo.Update(config); err != nil {
		return nil, err
	}

	return config, nil
}

func getProviderDisplayName(provider model.AuthProvider) string {
	names := map[model.AuthProvider]string{
		model.ProviderGoogle: "Google",
		model.ProviderKakao:  "Kakao",
		model.ProviderNaver:  "Naver",
		model.ProviderApple:  "Apple",
	}
	if name, ok := names[provider]; ok {
		return name
	}
	return string(provider)
}

func getProviderDescription(provider model.AuthProvider) string {
	descriptions := map[model.AuthProvider]string{
		model.ProviderGoogle: "Sign in with Google account",
		model.ProviderKakao:  "Sign in with Kakao account",
		model.ProviderNaver:  "Sign in with Naver account",
		model.ProviderApple:  "Sign in with Apple ID",
	}
	if desc, ok := descriptions[provider]; ok {
		return desc
	}
	return ""
}
