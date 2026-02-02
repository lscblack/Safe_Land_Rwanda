package routes

import (
	"safeland/offchain/api/handlers"
	"safeland/offchain/pkg/auth"

	"github.com/gofiber/fiber/v2"
)

// FrontendAuthRoutes contains frontend authentication routes (no protection)
func FrontendAuthRoutes(app *fiber.App) {
	api := app.Group("/api")
	frontend := api.Group("/frontend")

	frontend.Post("/login", handlers.FrontendLogin)
}

// ExternalServicesRoutes contains all external service routes (protected with frontend token)
func ExternalServicesRoutes(app *fiber.App) {
	api := app.Group("/api")
	external := api.Group("/external", auth.VerifyFrontendToken)

	external.Get("/citizen/:nid", handlers.GetCitizenInformation)
	external.Get("/nid/:nid/phonenumbers", handlers.GetPhoneNumbersByNID)
	external.Get("/phoneuser/:phone", handlers.GetNIDByPhoneNumber)

	// Land information endpoints
	external.Post("/parcel", handlers.GetParcelInformation)
	external.Post("/upis", handlers.GetUPIsByOwnerID)
	external.Get("/tax-arrears", handlers.GetTaxArrears)
	external.Get("/title", handlers.GetTitleByUPI)
	external.Get("/gis-extract", handlers.GetPlotShape)

	// Notification endpoints (all protected)
	notifications := api.Group("/notifications", auth.VerifyFrontendToken)
	notifications.Post("/send-email", handlers.SendEmailNotification)
	notifications.Post("/send-otp", handlers.SendSMSOTP)
	notifications.Post("/send-reset-email", handlers.SendPasswordResetEmail)
	notifications.Get("/password-reset-form", handlers.PasswordResetForm)
	notifications.Post("/password-reset", handlers.ResetPassword)
}

// LIIPRoutes contains all LIIP authentication routes (protected with frontend token)
func LIIPRoutes(app *fiber.App) {
	api := app.Group("/api")
	liip := api.Group("/liip", auth.VerifyFrontendToken)

	liip.Post("/login", handlers.LoginLIIPUser)
	liip.Post("/user-from-token", handlers.GetLIIPUserFromToken)
}
