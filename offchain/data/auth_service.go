package data

import (
	"errors"
	"fmt"
	"regexp"
	"time"

	"safeland/offchain/data/models"
	"safeland/offchain/pkg/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService handles password reset and authentication
type AuthService struct {
	db          *gorm.DB
	tokenGen    *utils.TokenGenerator
	rateLimiter *utils.RateLimiter
	resetExpiry time.Duration
}

// NewAuthService creates a new auth service
func NewAuthService(db *gorm.DB, hashProvider *utils.HashProvider) *AuthService {
	return &AuthService{
		db:          db,
		tokenGen:    utils.NewTokenGenerator(),
		rateLimiter: utils.NewRateLimiter(3, time.Hour),
		resetExpiry: 2 * time.Hour,
	}
}

// RequestPasswordResetRequest represents a password reset request
type RequestPasswordResetRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// RequestPasswordResetResponse represents the response
type RequestPasswordResetResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"` // For email handler to use
}

// RequestPasswordReset initiates a password reset flow
func (s *AuthService) RequestPasswordReset(email string) (*RequestPasswordResetResponse, error) {
	// Rate limiting (3 per hour per email)
	allowed, _, _ := s.rateLimiter.IsAllowed(email)
	if !allowed {
		// Still return success to prevent enumeration
		return &RequestPasswordResetResponse{
			Success: true,
			Message: "If this email exists, a password reset link has been sent",
		}, nil
	}

	// Check if user exists
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		// User doesn't exist, but return success anyway to prevent enumeration
		return &RequestPasswordResetResponse{
			Success: true,
			Message: "If this email exists, a password reset link has been sent",
		}, nil
	}

	// Generate reset token
	token, err := s.tokenGen.GenerateToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Create password reset record
	reset := &models.PasswordReset{
		UserID:    user.ID,
		Email:     email,
		Token:     token,
		Status:    "active",
		ExpiresAt: time.Now().Add(s.resetExpiry),
	}

	if err := s.db.Create(reset).Error; err != nil {
		return nil, fmt.Errorf("failed to save reset token: %w", err)
	}

	// Return success with token (for email handler)
	return &RequestPasswordResetResponse{
		Success: true,
		Message: "If this email exists, a password reset link has been sent",
		Token:   token,
	}, nil
}

// ConfirmPasswordResetRequest represents a password reset confirmation
type ConfirmPasswordResetRequest struct {
	Token    string `json:"token" form:"token" validate:"required"`
	Password string `json:"password" form:"password" validate:"required"`
}

// ConfirmPasswordResetResponse represents the response
type ConfirmPasswordResetResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// ConfirmPasswordReset confirms and completes the password reset
func (s *AuthService) ConfirmPasswordReset(req ConfirmPasswordResetRequest) (*ConfirmPasswordResetResponse, error) {
	// Validate password strength
	if err := s.validatePassword(req.Password); err != nil {
		return nil, err
	}

	// Find reset token
	var reset models.PasswordReset
	if err := s.db.Where("token = ? AND status = ?", req.Token, "active").First(&reset).Error; err != nil {
		return nil, errors.New("invalid or expired reset link")
	}

	if time.Now().After(reset.ExpiresAt) {
		return nil, errors.New("reset link has expired")
	}

	// Hash new password with bcrypt
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Update user password and mark token as used in transaction
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).Where("id = ?", reset.UserID).Update("password", string(passwordHash)).Error; err != nil {
			return err
		}

		now := time.Now()
		if err := tx.Model(&reset).Updates(map[string]interface{}{
			"status":  "used",
			"used_at": now,
		}).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, fmt.Errorf("failed to update password: %w", err)
	}

	return &ConfirmPasswordResetResponse{
		Success: true,
		Message: "Password reset successfully",
	}, nil
}

// ValidateResetToken validates if a reset token is valid and not expired
func (s *AuthService) ValidateResetToken(token string) (bool, error) {
	var reset models.PasswordReset
	if err := s.db.Where("token = ? AND status = ?", token, "active").First(&reset).Error; err != nil {
		return false, errors.New("invalid reset token")
	}

	if time.Now().After(reset.ExpiresAt) {
		return false, errors.New("reset link has expired")
	}

	return true, nil
}

// validatePassword checks password strength requirements
func (s *AuthService) validatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}

	if !regexp.MustCompile(`[A-Z]`).MatchString(password) {
		return errors.New("password must contain at least one uppercase letter")
	}

	if !regexp.MustCompile(`[a-z]`).MatchString(password) {
		return errors.New("password must contain at least one lowercase letter")
	}

	if !regexp.MustCompile(`[0-9]`).MatchString(password) {
		return errors.New("password must contain at least one number")
	}

	if !regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]`).MatchString(password) {
		return errors.New("password must contain at least one special character")
	}

	return nil
}
