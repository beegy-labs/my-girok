package repository

import (
	"errors"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"gorm.io/gorm"
)

var (
	ErrOAuthConfigNotFound = errors.New("oauth config not found")
)

type OAuthConfigRepository struct {
	db *gorm.DB
}

func NewOAuthConfigRepository(db *gorm.DB) *OAuthConfigRepository {
	return &OAuthConfigRepository{db: db}
}

func (r *OAuthConfigRepository) Create(config *model.OAuthProviderConfig) error {
	return r.db.Create(config).Error
}

func (r *OAuthConfigRepository) FindByProvider(provider model.AuthProvider) (*model.OAuthProviderConfig, error) {
	var config model.OAuthProviderConfig
	result := r.db.Where("provider = ?", provider).First(&config)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrOAuthConfigNotFound
		}
		return nil, result.Error
	}
	return &config, nil
}

func (r *OAuthConfigRepository) FindAll() ([]model.OAuthProviderConfig, error) {
	var configs []model.OAuthProviderConfig
	result := r.db.Order("provider ASC").Find(&configs)
	if result.Error != nil {
		return nil, result.Error
	}
	return configs, nil
}

func (r *OAuthConfigRepository) FindEnabled() ([]model.OAuthProviderConfig, error) {
	var configs []model.OAuthProviderConfig
	result := r.db.Where("enabled = ?", true).Order("provider ASC").Find(&configs)
	if result.Error != nil {
		return nil, result.Error
	}
	return configs, nil
}

func (r *OAuthConfigRepository) Update(config *model.OAuthProviderConfig) error {
	return r.db.Save(config).Error
}

func (r *OAuthConfigRepository) Delete(provider model.AuthProvider) error {
	result := r.db.Delete(&model.OAuthProviderConfig{}, "provider = ?", provider)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrOAuthConfigNotFound
	}
	return nil
}

func (r *OAuthConfigRepository) IsProviderEnabled(provider model.AuthProvider) (bool, error) {
	config, err := r.FindByProvider(provider)
	if err != nil {
		if errors.Is(err, ErrOAuthConfigNotFound) {
			return false, nil
		}
		return false, err
	}
	return config.Enabled, nil
}
