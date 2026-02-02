package routes

import (
	"safeland/offchain/api/handlers"
	"safeland/offchain/api/middlewares"
	"safeland/offchain/pkg/auth"

	"github.com/gofiber/fiber/v2"
)

// UserRoutes contains all user routes (protected with frontend token)
func UserRoutes(app *fiber.App) {
	// User routes
	api := app.Group("/api")
	user := api.Group("/user", auth.VerifyFrontendToken)
	user.Post("/register", handlers.Register)
	user.Post("/login", handlers.Login)
	user.Put("/role", middlewares.Protected(), handlers.UpdateUserRole)

	// Protected route
	user.Get("/profile", middlewares.Protected(), func(c *fiber.Ctx) error {
		return c.SendString("This is a protected route")
	})

	// Admin routes (protected with frontend token)
	admin := api.Group("/admin", auth.VerifyFrontendToken)
	admin.Post("/create", middlewares.Protected(), handlers.CreateAdmin)

	// Admin area route
	adminArea := user.Group("/admin", middlewares.Protected(), middlewares.RoleRequired("admin"))
	adminArea.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Welcome to the admin area")
	})
}
