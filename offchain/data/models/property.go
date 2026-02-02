
package models

import "gorm.io/gorm"

// Property struct
type Property struct {
	gorm.Model
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Address     string  `json:"address"`
	Bedrooms    int     `json:"bedrooms"`
	Bathrooms   int     `json:"bathrooms"`
	SquareFeet  int     `json:"square_feet"`
	Amenities   string  `json:"amenities"`
	OwnerID     uint    `json:"owner_id"`
	Owner       User    `gorm:"foreignKey:OwnerID"`
}
