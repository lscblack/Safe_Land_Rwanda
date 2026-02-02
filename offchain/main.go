package main

import (
	"log"
	"safeland/offchain/api/routes"
	"safeland/offchain/data/database"

	_ "safeland/offchain/docs" // load API docs

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberSwagger "github.com/swaggo/fiber-swagger"
)

// @title SafeLand API
// @version 1.0
// @description This is the API for the SafeLand project. All endpoints (except /api/frontend/login) require Bearer token authentication.
// @termsOfService http://swagger.io/terms/
// @contact.name API Support
// @contact.email fiber@swagger.io
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html
// @host localhost:3000
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.
func main() {
	app := fiber.New()

	// Enable CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	database.ConnectDB()

	// Initialize LIIP database
	if err := database.InitializeLIIPDB(); err != nil {
		log.Printf("Warning: Failed to initialize LIIP database: %v\n", err)
	}

	// Optional: Initialize external databases (LIIP and LAIS)
	// Uncomment and configure when ready
	// liipConfig := database.Config{
	// 	Host:     config.Config("LIIP_DB_HOST"),
	// 	User:     config.Config("LIIP_DB_USER"),
	// 	Password: config.Config("LIIP_DB_PASSWORD"),
	// 	DBName:   config.Config("LIIP_DB_NAME"),
	// 	Port:     config.Config("LIIP_DB_PORT"),
	// 	SSLMode:  config.Config("LIIP_DB_SSLMODE"),
	// }
	// database.InitializeLIIPDB(liipConfig)
	//
	// laisConfig := database.Config{
	// 	Host:     config.Config("LAIS_DB_HOST"),
	// 	User:     config.Config("LAIS_DB_USER"),
	// 	Password: config.Config("LAIS_DB_PASSWORD"),
	// 	DBName:   config.Config("LAIS_DB_NAME"),
	// 	Port:     config.Config("LAIS_DB_PORT"),
	// 	SSLMode:  config.Config("LAIS_DB_SSLMODE"),
	// }
	// database.InitializeLAISDB(laisConfig)

	// Setup routes
	routes.FrontendAuthRoutes(app) // Frontend authentication (no protection)
	routes.UserRoutes(app)
	routes.ExternalServicesRoutes(app) // Protected with frontend token
	routes.LIIPRoutes(app)             // Protected with frontend token

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Safe Land Rwanda Offchain API is running!")
	})

	// Swagger
	app.Get("/swagger/*", fiberSwagger.WrapHandler)

	log.Fatal(app.Listen(":3000"))
}
