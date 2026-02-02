package data

import (
	"errors"
	"fmt"
	"time"

	"safeland/offchain/data/models"
	"safeland/offchain/pkg/utils"

	"gorm.io/gorm"
)

// OTPService handles OTP operations
type OTPService struct {
	db             *gorm.DB
	tokenGen       *utils.TokenGenerator
	hashProvider   *utils.HashProvider
	rateLimiter    *utils.RateLimiter
	resendCooldown *utils.ResendCooldown
	otpExpiry      time.Duration
	maxAttempts    int
}

// NewOTPService creates a new OTP service
func NewOTPService(db *gorm.DB, hashProvider *utils.HashProvider) *OTPService {
	return &OTPService{
		db:             db,
		tokenGen:       utils.NewTokenGenerator(),
		hashProvider:   hashProvider,
		rateLimiter:    utils.NewRateLimiter(5, 15*time.Minute),
		resendCooldown: utils.NewResendCooldown(2 * time.Minute),
		otpExpiry:      10 * time.Minute,
		maxAttempts:    5,
	}
}

// SendOTPRequest represents a send OTP request
type SendOTPRequest struct {
	Phone   string `json:"phone"`
	Channel string `json:"channel"`
}

// SendOTPResponse represents the response after sending OTP
type SendOTPResponse struct {
	Success          bool   `json:"success"`
	Message          string `json:"message"`
	VerificationCode string `json:"verification_code"`
	ExpiryMinutes    int    `json:"expiry_minutes"`
}

// SendOTP generates and sends an OTP
func (s *OTPService) SendOTP(req SendOTPRequest) (*SendOTPResponse, error) {
	if req.Phone == "" {
		return nil, errors.New("phone is required")
	}

	// Rate limiting
	allowed, _, retryAfter := s.rateLimiter.IsAllowed(req.Phone)
	if !allowed {
		return nil, fmt.Errorf("rate limited, retry after %d seconds", int64(retryAfter.Seconds()))
	}

	// Resend cooldown check
	canResend, secondsUntil := s.resendCooldown.CanResend(req.Phone)
	if !canResend {
		return nil, fmt.Errorf("too frequent requests, wait %d seconds", secondsUntil)
	}

	// Invalidate previous OTPs for this phone
	s.db.Model(&models.OTP{}).Where("phone = ?", req.Phone).Update("status", "expired")

	// Generate OTP code
	otpCode, err := s.tokenGen.GenerateOTP(6)
	if err != nil {
		return nil, fmt.Errorf("failed to generate OTP: %w", err)
	}

	// Hash the OTP
	otpHash := s.hashProvider.HashOTP(otpCode)

	// Create OTP record
	otp := &models.OTP{
		Phone:            req.Phone,
		OTPCode:          otpHash,
		VerificationCode: generateUUID(),
		Status:           "active",
		ExpiresAt:        time.Now().Add(s.otpExpiry),
	}

	if err := s.db.Create(otp).Error; err != nil {
		return nil, fmt.Errorf("failed to save OTP: %w", err)
	}

	// Set cooldown
	s.resendCooldown.SetCooldown(req.Phone)

	return &SendOTPResponse{
		Success:          true,
		Message:          fmt.Sprintf("OTP sent to %s", req.Phone),
		VerificationCode: otp.VerificationCode,
		ExpiryMinutes:    10,
	}, nil
}

// VerifyOTPRequest represents a verify OTP request
type VerifyOTPRequest struct {
	VerificationCode string `json:"verification_code"`
	OTPCode          string `json:"otp_code"`
}

// VerifyOTPResponse represents the response after OTP verification
type VerifyOTPResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// VerifyOTP verifies an OTP code
func (s *OTPService) VerifyOTP(req VerifyOTPRequest) (*VerifyOTPResponse, error) {
	var otp models.OTP
	if err := s.db.Where("verification_code = ?", req.VerificationCode).First(&otp).Error; err != nil {
		return nil, errors.New("invalid verification code")
	}

	if time.Now().After(otp.ExpiresAt) {
		return nil, errors.New("OTP has expired")
	}

	// Verify code using constant-time comparison
	if !s.hashProvider.VerifyOTP(req.OTPCode, otp.OTPCode) {
		return nil, errors.New("invalid OTP code")
	}

	// Mark as verified
	now := time.Now()
	s.db.Model(&otp).Updates(map[string]interface{}{
		"status":      "verified",
		"verified_at": now,
	})

	// Clear rate limit
	s.rateLimiter.Reset(otp.Phone)
	s.resendCooldown.Reset(otp.Phone)

	return &VerifyOTPResponse{
		Success: true,
		Message: "OTP verified successfully",
	}, nil
}

func generateUUID() string {
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), time.Now().UnixNano()/2)
}
