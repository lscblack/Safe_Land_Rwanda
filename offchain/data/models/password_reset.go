package models

import "time"

// PasswordReset represents a password reset token in the database
type PasswordReset struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id" gorm:"index"`
	Email     string     `json:"email" gorm:"index"`
	Token     string     `json:"token" gorm:"uniqueIndex"`
	Status    string     `json:"status" gorm:"default:'active'"` // active, used, expired
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for PasswordReset
func (PasswordReset) TableName() string {
	return "password_resets"
}
