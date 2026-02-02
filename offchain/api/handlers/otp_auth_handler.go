package handlers

import (
	"safeland/offchain/data"
	"safeland/offchain/pkg/templates"
	"safeland/offchain/pkg/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// OTPHandler handles OTP-related requests
type OTPHandler struct {
	service *data.OTPService
}

// NewOTPHandler creates a new OTP handler
func NewOTPHandler(db *gorm.DB) *OTPHandler {
	hashProvider := utils.NewHashProvider(nil)
	service := data.NewOTPService(db, hashProvider)
	return &OTPHandler{service: service}
}

// SendOTP handles POST /otp/send
func (h *OTPHandler) SendOTP(c *fiber.Ctx) error {
	var req data.SendOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	resp, err := h.service.SendOTP(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return c.JSON(resp)
}

// VerifyOTP handles POST /otp/verify
func (h *OTPHandler) VerifyOTP(c *fiber.Ctx) error {
	var req data.VerifyOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	resp, err := h.service.VerifyOTP(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return c.JSON(resp)
}

// AuthHandler handles password reset-related requests
type AuthHandler struct {
	service        *data.AuthService
	emailTemplates *templates.EmailTemplates
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(db *gorm.DB) *AuthHandler {
	hashProvider := utils.NewHashProvider(nil)
	service := data.NewAuthService(db, hashProvider)
	return &AuthHandler{
		service:        service,
		emailTemplates: templates.NewEmailTemplates(),
	}
}

// RequestPasswordReset handles POST /auth/reset-password/request
func (h *AuthHandler) RequestPasswordReset(c *fiber.Ctx) error {
	var req data.RequestPasswordResetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	resp, err := h.service.RequestPasswordReset(req.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return c.JSON(resp)
}

// GetPasswordResetForm handles GET /auth/reset-password/form?token=...
func (h *AuthHandler) GetPasswordResetForm(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).SendString(
			h.emailTemplates.RenderErrorPage(
				"Invalid Request",
				"No reset token provided",
				"/auth/reset-password/request",
			),
		)
	}

	valid, _ := h.service.ValidateResetToken(token)
	if !valid {
		return c.Status(fiber.StatusBadRequest).SendString(
			h.emailTemplates.RenderErrorPage(
				"Invalid or Expired Link",
				"This password reset link is invalid or has expired",
				"/auth/reset-password/request",
			),
		)
	}

	baseURL := c.BaseURL()
	html := h.emailTemplates.RenderPasswordResetForm(token, baseURL)
	return c.Type("html").SendString(html)
}

// ConfirmPasswordReset handles POST /auth/reset-password/confirm
func (h *AuthHandler) ConfirmPasswordReset(c *fiber.Ctx) error {
	var req data.ConfirmPasswordResetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	resp, err := h.service.ConfirmPasswordReset(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return c.JSON(resp)
}
