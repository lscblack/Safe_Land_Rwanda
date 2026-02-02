package models

import "time"

// LIIPUser represents a user from LIIP database
type LIIPUser struct {
	ID          int        `json:"id" gorm:"primaryKey"`
	Password    string     `json:"password"`
	LastLogin   *time.Time `json:"last_login"`
	IsSuperuser bool       `json:"is_superuser"`
	Email       string     `json:"email"`
	FullName    string     `json:"full_name"`
	PhoneNumber string     `json:"phone_number"`
	Address     string     `json:"address"`
	Nationality string     `json:"nationality"`
	IDType      string     `json:"id_type" gorm:"column:id_type"`
	IDNumber    string     `json:"id_number" gorm:"column:id_number"`
	Gender      string     `json:"gender"`
	IsActive    bool       `json:"is_active"`
	IsStaff     bool       `json:"is_staff"`
	DateJoined  time.Time  `json:"date_joined"`
}

// TableName specifies the table name for LIIP user
func (LIIPUser) TableName() string {
	return "users_user"
}
