package auth

import (
	"github.com/golang-jwt/jwt/v5"
)

type Role string

const (
	RoleGuest   Role = "GUEST"
	RoleUser    Role = "USER"
	RoleManager Role = "MANAGER"
	RoleMaster  Role = "MASTER"
)

type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

type AuthProvider string

const (
	ProviderLocal  AuthProvider = "LOCAL"
	ProviderGoogle AuthProvider = "GOOGLE"
	ProviderKakao  AuthProvider = "KAKAO"
	ProviderNaver  AuthProvider = "NAVER"
	ProviderApple  AuthProvider = "APPLE"
)

// Claims represents JWT payload structure
// Shared between Go auth-service and Node.js personal-service
type Claims struct {
	jwt.RegisteredClaims
	Email    string       `json:"email"`
	Username string       `json:"username,omitempty"`
	Role     Role         `json:"role"`
	Type     TokenType    `json:"type"`
	Provider AuthProvider `json:"provider,omitempty"`
}

// Valid roles for validation
func (r Role) IsValid() bool {
	switch r {
	case RoleGuest, RoleUser, RoleManager, RoleMaster:
		return true
	}
	return false
}

// Valid providers for validation
func (p AuthProvider) IsValid() bool {
	switch p {
	case ProviderLocal, ProviderGoogle, ProviderKakao, ProviderNaver, ProviderApple:
		return true
	}
	return false
}
