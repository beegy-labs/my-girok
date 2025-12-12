package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleGuest   Role = "GUEST"
	RoleUser    Role = "USER"
	RoleManager Role = "MANAGER"
	RoleMaster  Role = "MASTER"
)

type AuthProvider string

const (
	ProviderLocal  AuthProvider = "LOCAL"
	ProviderGoogle AuthProvider = "GOOGLE"
	ProviderKakao  AuthProvider = "KAKAO"
	ProviderNaver  AuthProvider = "NAVER"
	ProviderApple  AuthProvider = "APPLE"
)

type User struct {
	ID             string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ExternalID     string       `gorm:"uniqueIndex;type:varchar(10);not null" json:"externalId"` // 10-char time-based ID for external partners
	Email          string       `gorm:"uniqueIndex;type:varchar(255);not null" json:"email"`
	Username       string       `gorm:"uniqueIndex;type:varchar(100)" json:"username"`
	PasswordHash   string       `gorm:"type:varchar(255)" json:"-"`
	Role           Role         `gorm:"type:varchar(20);default:'USER'" json:"role"`
	Provider       AuthProvider `gorm:"type:varchar(20);default:'LOCAL'" json:"provider"`
	ProviderID     string       `gorm:"column:provider_id;type:varchar(255);index" json:"-"` // OAuth provider user ID
	Name           string       `gorm:"type:varchar(100)" json:"name"`
	Picture        string       `gorm:"type:text" json:"picture"`
	EmailVerified  bool         `gorm:"column:email_verified;default:false" json:"emailVerified"`
	IsActive       bool         `gorm:"default:true" json:"isActive"`
	LastLoginAt    *time.Time   `gorm:"column:last_login_at" json:"lastLoginAt"`
	CreatedAt      time.Time    `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time    `gorm:"column:updated_at" json:"updatedAt"`

	Sessions     []Session           `gorm:"foreignKey:UserID" json:"-"`
	DomainAccess []DomainAccessToken `gorm:"foreignKey:UserID" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

type Session struct {
	ID           string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID       string    `gorm:"type:varchar(36);index;not null" json:"userId"`
	RefreshToken string    `gorm:"type:text;not null" json:"-"`
	UserAgent    string    `gorm:"type:varchar(500)" json:"userAgent"`
	IP           string    `gorm:"type:varchar(45)" json:"ip"`
	ExpiresAt    time.Time `json:"expiresAt"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// DomainAccessToken for time-limited sharing (e.g., resume sharing)
type DomainAccessToken struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID    string    `gorm:"column:user_id;type:varchar(36);index;not null" json:"userId"`
	Domain    string    `gorm:"type:varchar(100);index;not null" json:"domain"` // e.g., 'resume', 'portfolio'
	Token     string    `gorm:"uniqueIndex;type:text;not null" json:"-"`
	ExpiresAt time.Time `gorm:"column:expires_at" json:"expiresAt"`
	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (d *DomainAccessToken) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	return nil
}

// OAuthProviderConfig for managing OAuth provider settings
type OAuthProviderConfig struct {
	ID           string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Provider     AuthProvider `gorm:"type:varchar(20);uniqueIndex;not null" json:"provider"`
	Enabled      bool         `gorm:"default:true" json:"enabled"`
	DisplayName  string       `gorm:"column:display_name;type:varchar(100)" json:"displayName"`
	Description  string       `gorm:"type:text" json:"description"`
	ClientID     string       `gorm:"column:client_id;type:varchar(255)" json:"-"`
	ClientSecret string       `gorm:"column:client_secret;type:varchar(255)" json:"-"`
	CallbackURL  string       `gorm:"column:callback_url;type:varchar(500)" json:"callbackUrl"`
	UpdatedAt    time.Time    `gorm:"column:updated_at" json:"updatedAt"`
	UpdatedBy    string       `gorm:"column:updated_by;type:varchar(36)" json:"updatedBy"`
}

func (o *OAuthProviderConfig) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	return nil
}
