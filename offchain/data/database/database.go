package database

import (
	"fmt"
	"log"
	"safeland/offchain/config"
	"safeland/offchain/data/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB gorm connector
var DB *gorm.DB

// ConnectDB connect to db
func ConnectDB() {
	var err error
	p := config.Config("DB_PORT")
	// dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s", config.Config("DB_HOST"), config.Config("DB_USER"), config.Config("DB_PASSWORD"), config.Config("DB_NAME"), p, config.Config("DB_SSLMODE"))
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		config.Config("DB_HOST"),
		config.Config("DB_USER"),
		config.Config("DB_PASSWORD"),
		config.Config("DB_NAME"),
		p,
		config.Config("DB_SSLMODE"))

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	fmt.Println("Connection Opened to Database")
	DB.AutoMigrate(&models.User{}, &models.Property{}, &models.OTP{}, &models.PasswordReset{}, &models.NotificationLog{})
	fmt.Println("Database Migrated")
}
