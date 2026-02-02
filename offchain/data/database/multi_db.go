package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	// DB     *gorm.DB
	LAISDB *gorm.DB
)

// Config holds database configuration
type Config struct {
	Host     string
	User     string
	Password string
	DBName   string
	Port     string
	SSLMode  string
}

// InitializeMainDB initializes the main SafeLand database
func InitializeMainDB(config Config) error {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		config.Host,
		config.User,
		config.Password,
		config.DBName,
		config.Port,
		config.SSLMode,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to main database: %v", err)
		return err
	}

	log.Println("Main database connected successfully")
	return nil
}

// InitializeLAISDB initializes the LAIS database
func InitializeLAISDB(config Config) error {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		config.Host,
		config.User,
		config.Password,
		config.DBName,
		config.Port,
		config.SSLMode,
	)

	var err error
	LAISDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to LAIS database: %v", err)
		return err
	}

	log.Println("LAIS database connected successfully")
	return nil
}
