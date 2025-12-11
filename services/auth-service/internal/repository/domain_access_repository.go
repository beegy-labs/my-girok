package repository

import (
	"errors"
	"time"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"gorm.io/gorm"
)

var (
	ErrDomainAccessNotFound = errors.New("domain access token not found")
)

type DomainAccessRepository struct {
	db *gorm.DB
}

func NewDomainAccessRepository(db *gorm.DB) *DomainAccessRepository {
	return &DomainAccessRepository{db: db}
}

func (r *DomainAccessRepository) Create(token *model.DomainAccessToken) error {
	return r.db.Create(token).Error
}

func (r *DomainAccessRepository) FindByToken(token string) (*model.DomainAccessToken, error) {
	var domainAccess model.DomainAccessToken
	result := r.db.Where("token = ? AND expires_at > ?", token, time.Now()).First(&domainAccess)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrDomainAccessNotFound
		}
		return nil, result.Error
	}
	return &domainAccess, nil
}

func (r *DomainAccessRepository) FindByUserAndDomain(userID, domain string) (*model.DomainAccessToken, error) {
	var domainAccess model.DomainAccessToken
	result := r.db.Where("user_id = ? AND domain = ? AND expires_at > ?", userID, domain, time.Now()).First(&domainAccess)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrDomainAccessNotFound
		}
		return nil, result.Error
	}
	return &domainAccess, nil
}

func (r *DomainAccessRepository) FindByUserID(userID string) ([]model.DomainAccessToken, error) {
	var tokens []model.DomainAccessToken
	result := r.db.Where("user_id = ? AND expires_at > ?", userID, time.Now()).Find(&tokens)
	if result.Error != nil {
		return nil, result.Error
	}
	return tokens, nil
}

func (r *DomainAccessRepository) DeleteByID(id string) error {
	result := r.db.Delete(&model.DomainAccessToken{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrDomainAccessNotFound
	}
	return nil
}

func (r *DomainAccessRepository) DeleteExpired() error {
	return r.db.Delete(&model.DomainAccessToken{}, "expires_at <= ?", time.Now()).Error
}

func (r *DomainAccessRepository) Update(token *model.DomainAccessToken) error {
	return r.db.Save(token).Error
}
