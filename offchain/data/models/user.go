package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// User struct
type User struct {
	gorm.Model
	FirstName  string         `json:"first_name"`
	MiddleName string         `json:"middle_name"`
	LastName   string         `json:"last_name"`
	Email      string         `json:"email" gorm:"uniqueIndex"`
	Avatar     string         `json:"avatar" gorm:"default:'offchain/assets/logo_white.png'"`
	Role       datatypes.JSON `json:"role" gorm:"type:jsonb"`
	NIDNumber  string         `json:"nid_number" gorm:"column:n_id_number"`
	IDtype     string         `json:"id_type" gorm:"default:'NID'"`
	Phone      string         `json:"phone"`
	Username   string         `json:"username" gorm:"uniqueIndex"`
	UserCode   string         `json:"user_code" gorm:"uniqueIndex"`
	Country    string         `json:"country"`
	IsActive   bool           `json:"is_active" gorm:"default:true"`
	IsVerified bool           `json:"is_verified" gorm:"default:false"`
	IsDeleted  bool           `json:"is_deleted" gorm:"default:false"`
	Password   string         `json:"password"`
	CreatedAt  time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
}
