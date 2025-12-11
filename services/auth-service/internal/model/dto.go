package model

import "time"

// Request DTOs
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type UpdateUserRequest struct {
	Username *string `json:"username" binding:"omitempty,min=3,max=50"`
	Name     *string `json:"name" binding:"omitempty,max=100"`
	Picture  *string `json:"picture"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=8"`
}

type GrantDomainAccessRequest struct {
	Domain         string `json:"domain" binding:"required"`
	ExpiresInHours int    `json:"expiresInHours" binding:"required,min=1,max=72"`
	RecipientEmail string `json:"recipientEmail" binding:"omitempty,email"`
}

type ToggleProviderRequest struct {
	Enabled bool `json:"enabled"`
}

// Response DTOs
type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	ExpiresIn    int64        `json:"expiresIn"`
}

type UserResponse struct {
	ID            string       `json:"id"`
	ExternalID    string       `json:"externalId"`
	Email         string       `json:"email"`
	Username      string       `json:"username"`
	Name          string       `json:"name"`
	Picture       string       `json:"picture"`
	Role          Role         `json:"role"`
	Provider      AuthProvider `json:"provider"`
	EmailVerified bool         `json:"emailVerified"`
	IsActive      bool         `json:"isActive"`
	CreatedAt     string       `json:"createdAt"`
}

type TokenResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
}

type DomainAccessResponse struct {
	AccessToken string    `json:"accessToken"`
	ExpiresAt   time.Time `json:"expiresAt"`
	AccessURL   string    `json:"accessUrl"`
}

type OAuthProviderStatusResponse struct {
	Provider AuthProvider `json:"provider"`
	Enabled  bool         `json:"enabled"`
}

type OAuthProviderConfigResponse struct {
	ID          string       `json:"id"`
	Provider    AuthProvider `json:"provider"`
	Enabled     bool         `json:"enabled"`
	DisplayName string       `json:"displayName"`
	Description string       `json:"description"`
	CallbackURL string       `json:"callbackUrl"`
	UpdatedAt   string       `json:"updatedAt"`
	UpdatedBy   string       `json:"updatedBy"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

// Convert User to UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:            u.ID,
		ExternalID:    u.ExternalID,
		Email:         u.Email,
		Username:      u.Username,
		Name:          u.Name,
		Picture:       u.Picture,
		Role:          u.Role,
		Provider:      u.Provider,
		EmailVerified: u.EmailVerified,
		IsActive:      u.IsActive,
		CreatedAt:     u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// Convert OAuthProviderConfig to response
func (o *OAuthProviderConfig) ToResponse() OAuthProviderConfigResponse {
	return OAuthProviderConfigResponse{
		ID:          o.ID,
		Provider:    o.Provider,
		Enabled:     o.Enabled,
		DisplayName: o.DisplayName,
		Description: o.Description,
		CallbackURL: o.CallbackURL,
		UpdatedAt:   o.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedBy:   o.UpdatedBy,
	}
}
