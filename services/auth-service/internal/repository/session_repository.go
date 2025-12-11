package repository

import (
	"errors"
	"time"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"gorm.io/gorm"
)

var ErrSessionNotFound = errors.New("session not found")

type SessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(session *model.Session) error {
	return r.db.Create(session).Error
}

func (r *SessionRepository) FindByRefreshToken(token string) (*model.Session, error) {
	var session model.Session
	result := r.db.Where("refresh_token = ? AND expires_at > ?", token, time.Now()).First(&session)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, result.Error
	}
	return &session, nil
}

func (r *SessionRepository) FindByUserID(userID string) ([]model.Session, error) {
	var sessions []model.Session
	result := r.db.Where("user_id = ? AND expires_at > ?", userID, time.Now()).Find(&sessions)
	if result.Error != nil {
		return nil, result.Error
	}
	return sessions, nil
}

func (r *SessionRepository) Delete(id string) error {
	return r.db.Delete(&model.Session{}, "id = ?", id).Error
}

func (r *SessionRepository) DeleteByRefreshToken(token string) error {
	return r.db.Delete(&model.Session{}, "refresh_token = ?", token).Error
}

func (r *SessionRepository) DeleteByUserID(userID string) error {
	return r.db.Delete(&model.Session{}, "user_id = ?", userID).Error
}

func (r *SessionRepository) DeleteExpired() error {
	return r.db.Delete(&model.Session{}, "expires_at < ?", time.Now()).Error
}

func (r *SessionRepository) Update(session *model.Session) error {
	return r.db.Save(session).Error
}
