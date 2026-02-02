
package middlewares

import (
	"safeland/offchain/pkg/auth"

	"github.com/gofiber/fiber/v2"
)

// RoleRequired requires the user to have a specific role
func RoleRequired(roles string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		hasRole, err := auth.HasRole(c, roles)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": true,
				"msg":   err.Error(),
			})
		}
		if !hasRole {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": true,
				"msg":   "You are not authorized to access this resource",
			})
		}
		return c.Next()
	}
}
