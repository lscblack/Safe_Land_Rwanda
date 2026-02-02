package models

import "time"

// NotificationLog represents email notification logs
type NotificationLog struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Recipient        string    `gorm:"index" json:"recipient"`
	RecipientType    string    `json:"recipient_type"`                 // "email" or "phone"
	NotificationType string    `gorm:"index" json:"notification_type"` // "otp", "password_reset", "security_alert", "generic"
	Status           string    `json:"status"`                         // "sent", "failed", "bounced"
	SentAt           time.Time `json:"sent_at"`
	ErrorMessage     *string   `json:"error_message"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// TableName specifies the table name for NotificationLog
func (NotificationLog) TableName() string {
	return "notification_logs"
}
