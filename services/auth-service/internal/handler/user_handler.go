package handler

import (
	"net/http"
	"strconv"

	"github.com/beegy-labs/my-girok/services/auth-service/internal/model"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/repository"
	"github.com/beegy-labs/my-girok/services/auth-service/internal/service"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userRepo    *repository.UserRepository
	authService *service.AuthService
}

func NewUserHandler(userRepo *repository.UserRepository, authService *service.AuthService) *UserHandler {
	return &UserHandler{
		userRepo:    userRepo,
		authService: authService,
	}
}

func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("perPage", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	users, total, err := h.userRepo.List(page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}

	var responses []model.UserResponse
	for _, user := range users {
		responses = append(responses, user.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"data": responses,
		"meta": gin.H{
			"total":   total,
			"page":    page,
			"perPage": perPage,
		},
	})
}

func (h *UserHandler) Get(c *gin.Context) {
	id := c.Param("id")

	// Check if user is requesting their own data or is admin
	currentUserID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if currentUserID != id && role != "MANAGER" && role != "MASTER" {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	user, err := h.userRepo.FindByID(id)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")

	// Check if user is updating their own data or is admin
	currentUserID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if currentUserID != id && role != "MANAGER" && role != "MASTER" {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req model.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.FindByID(id)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	// Update fields
	if req.Username != nil {
		user.Username = *req.Username
	}
	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Picture != nil {
		user.Picture = *req.Picture
	}

	if err := h.userRepo.Update(user); err != nil {
		if err == repository.ErrUserAlreadyExists {
			c.JSON(http.StatusConflict, gin.H{"error": "username already taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.userRepo.Delete(id); err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetMe returns the current user's profile
// GET /v1/users/me
func (h *UserHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.userRepo.FindByID(userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

// UpdateMe updates the current user's profile
// PATCH /v1/users/me
func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req model.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.FindByID(userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Update fields if provided
	if req.Username != nil {
		// Check if username is already taken by another user
		existingUser, err := h.userRepo.FindByUsername(*req.Username)
		if err == nil && existingUser.ID != user.ID {
			c.JSON(http.StatusConflict, gin.H{"error": "username already taken"})
			return
		}
		user.Username = *req.Username
	}

	if req.Name != nil {
		user.Name = *req.Name
	}

	if req.Picture != nil {
		user.Picture = *req.Picture
	}

	if err := h.userRepo.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

// ChangePassword changes the current user's password
// POST /v1/users/me/change-password
func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req model.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.authService.ChangePassword(userID.(string), req.CurrentPassword, req.NewPassword)
	if err != nil {
		switch err {
		case service.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		case repository.ErrUserNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		default:
			if err.Error() == "password change not allowed for OAuth users" {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to change password"})
		}
		return
	}

	c.JSON(http.StatusOK, model.MessageResponse{Message: "password changed successfully"})
}

// GetByUsername returns a user by their username
// GET /v1/users/by-username/:username
func (h *UserHandler) GetByUsername(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
		return
	}

	user, err := h.userRepo.FindByUsername(username)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find user"})
		return
	}

	// Return limited public info
	c.JSON(http.StatusOK, gin.H{
		"id":         user.ID,
		"externalId": user.ExternalID,
		"username":   user.Username,
		"name":       user.Name,
		"picture":    user.Picture,
	})
}

// GetByExternalID returns a user by their external ID
// GET /v1/users/by-external-id/:externalId
func (h *UserHandler) GetByExternalID(c *gin.Context) {
	externalID := c.Param("externalId")
	if externalID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "externalId is required"})
		return
	}

	user, err := h.userRepo.FindByExternalID(externalID)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find user"})
		return
	}

	// Return limited public info
	c.JSON(http.StatusOK, gin.H{
		"id":         user.ID,
		"externalId": user.ExternalID,
		"username":   user.Username,
		"name":       user.Name,
		"picture":    user.Picture,
	})
}
