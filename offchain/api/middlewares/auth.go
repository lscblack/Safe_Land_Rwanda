
package middlewares

import (
	"safeland/offchain/pkg/auth"

	"github.com/gofiber/fiber/v2"
)

// Protected protect routes
func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		_, err := auth.GetUserIDFromToken(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": true,
				"msg":   err.Error(),
			})
		}
		return c.Next()
	}
}
