package handlers

import (
	"os"
	"safeland/offchain/pkg/auth"

	"github.com/gofiber/fiber/v2"
)

type FrontendLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// FrontendLogin authenticates the frontend application
// @Description Frontend application login
// @Summary Authenticate frontend application
// @Tags Frontend Auth
// @Accept json
// @Produce json
// @Param request body FrontendLoginRequest true "Frontend Login Request"
// @Success 200 {object} object
// @Router /api/frontend/login [post]
func FrontendLogin(c *fiber.Ctx) error {
	req := new(FrontendLoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid request body",
		})
	}

	// Get credentials from environment
	expectedUsername := os.Getenv("FRONTEND_USERNAME")
	expectedPassword := os.Getenv("FRONTEND_PASSWORD")

	// Validate credentials
	if req.Username != expectedUsername || req.Password != expectedPassword {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid credentials",
		})
	}

	// Generate frontend access token (valid for 24 hours)
	token, err := auth.GenerateFrontendToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to generate token: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"error":        false,
		"msg":          "Frontend authenticated successfully",
		"access_token": token,
		"token_type":   "Bearer",
		"expires_in":   86400, // 24 hours in seconds
	})
}
