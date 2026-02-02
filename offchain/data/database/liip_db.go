package database

import (
	"fmt"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var LIIPDB *gorm.DB

// InitializeLIIPDB initializes connection to LIIP MySQL database
func InitializeLIIPDB() error {
	host := os.Getenv("LIIP_DB_HOST")
	port := os.Getenv("LIIP_DB_PORT")
	user := os.Getenv("LIIP_DB_USER")
	password := os.Getenv("LIIP_DB_PASSWORD")
	dbName := os.Getenv("LIIP_DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to LIIP database: %w", err)
	}

	LIIPDB = db
	return nil
}
