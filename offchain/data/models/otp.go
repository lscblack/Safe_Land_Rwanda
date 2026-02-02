package models

import "time"

// OTP represents an OTP record in the database
type OTP struct {
	ID               uint       `json:"id" gorm:"primaryKey"`
	Email            string     `json:"email" gorm:"index"`
	Phone            string     `json:"phone" gorm:"index"`
	OTPCode          string     `json:"otp_code" gorm:"index"`
	VerificationCode string     `json:"verification_code" gorm:"unique"`
	Status           string     `json:"status" gorm:"default:'active'"` // active, verified, expired
	ExpiresAt        time.Time  `json:"expires_at"`
	VerifiedAt       *time.Time `json:"verified_at"`
	CreatedAt        time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for OTP
func (OTP) TableName() string {
	return "otps"
}
