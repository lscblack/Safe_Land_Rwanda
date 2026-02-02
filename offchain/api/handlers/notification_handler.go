package handlers

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"os"
	"safeland/offchain/data/database"
	"safeland/offchain/data/models"
	"safeland/offchain/pkg/templates"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// CustomLoginAuth implements SMTP LOGIN authentication
type CustomLoginAuth struct {
	username string
	password string
	step     int
}

func (a *CustomLoginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	a.step = 0
	return "LOGIN", []byte{}, nil
}

func (a *CustomLoginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		prompt := strings.TrimSpace(string(fromServer))
		if prompt != "" {
			if decoded, err := base64.StdEncoding.DecodeString(prompt); err == nil {
				prompt = strings.TrimSpace(string(decoded))
			}
		}

		switch {
		case a.step == 0 || strings.EqualFold(prompt, "Username:"):
			a.step = 1
			return []byte(a.username), nil
		case a.step == 1 || strings.EqualFold(prompt, "Password:"):
			return []byte(a.password), nil
		}
	}
	return nil, nil
}

type EmailRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Title   string `json:"title"`
	Message string `json:"message"`
}

type OTPRequest struct {
	Email string `json:"email"`
	Phone string `json:"phone"`
	Type  string `json:"type"` // "email" or "phone"
}

type ResetEmailRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type ResetPasswordRequest struct {
	Token           string `json:"token" form:"token"`
	Password        string `json:"password" form:"password"`
	ConfirmPassword string `json:"confirm_password" form:"confirm_password"`
}

// SendEmailNotification send a professional email using SMTP settings
// @Description Send email notification
// @Summary Send email
// @Tags Notifications
// @Accept json
// @Produce json
// @Param request body EmailRequest true "Email Request"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/notifications/send-email [post]
func SendEmailNotification(c *fiber.Ctx) error {
	req := new(EmailRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.To == "" || req.Subject == "" || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "to, subject, and message are required",
		})
	}

	if req.Title == "" {
		req.Title = "SafeLand Notification"
	}

	templateEngine := templates.NewEmailTemplates()
	supportEmail := os.Getenv("EMAIL_SENDER_EMAIL")
	html := templateEngine.RenderNotificationEmail(templates.NotificationEmailData{
		Title:        req.Title,
		Message:      req.Message,
		SupportEmail: supportEmail,
	})

	if err := sendSMTPEmail(req.To, req.Subject, html); err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to send email: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"error": false,
		"msg":   "Email sent successfully",
	})
}

// SendSMSOTP send OTP via SMS and Email with the same code
// @Description Send the same OTP code via both SMS (to phone) and Email. The email uses a professional template.
// @Summary Send OTP via SMS and Email
// @Tags Notifications
// @Accept json
// @Produce json
// @Param request body OTPRequest true "OTP Request (phone, email, type)"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/notifications/send-otp [post]
func SendSMSOTP(c *fiber.Ctx) error {
	req := new(OTPRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	// Determine delivery type
	deliveryType := req.Type
	if deliveryType == "" {
		deliveryType = "phone" // default
	}

	if deliveryType == "email" {
		if req.Email == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": true,
				"msg":   "email is required for email OTP delivery",
			})
		}
		return sendEmailOTP(c, req)
	}

	// Default to SMS/Phone
	if req.Phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "phone is required for SMS OTP delivery",
		})
	}

	return sendSMSOTP(c, req)
}

// sendSMSOTP sends OTP via SMS and Email
func sendSMSOTP(c *fiber.Ctx, req *OTPRequest) error {
	otp := generateMixedOTP(6)

	// Prepare SMS message
	smsMessage := fmt.Sprintf("Your SafeLand OTP is %s. It expires in 10 minutes.", otp)

	accessToken, err := getSMSAccessToken()
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to authenticate SMS service: " + err.Error(),
		})
	}

	smsPayload := map[string]string{
		"msisdn":    req.Phone,
		"message":   smsMessage,
		"msgRef":    uuid.NewString(),
		"sender_id": "NLA",
	}

	smsBody, err := json.Marshal(smsPayload)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to build SMS payload: " + err.Error(),
		})
	}

	smsURL := os.Getenv("SMS_SEND")
	smsReq, err := http.NewRequest("POST", smsURL, bytes.NewBuffer(smsBody))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to create SMS request: " + err.Error(),
		})
	}

	smsReq.Header.Set("Authorization", "Bearer "+accessToken)
	smsReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	smsResp, err := client.Do(smsReq)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to send SMS: " + err.Error(),
		})
	}
	defer smsResp.Body.Close()

	respBody, err := io.ReadAll(smsResp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to read SMS response: " + err.Error(),
		})
	}

	// Also send email if email is provided
	emailSent := false
	if req.Email != "" {
		templateEngine := templates.NewEmailTemplates()
		supportEmail := os.Getenv("EMAIL_SENDER_EMAIL")
		html := templateEngine.RenderOTPEmail(templates.OTPEmailData{
			Code:          otp,
			ExpiryMinutes: 10,
			SupportEmail:  supportEmail,
		})

		if err := sendSMTPEmail(req.Email, "SafeLand OTP Code", html); err == nil {
			emailSent = true
		}
	}

	// Save OTP to database
	otpRecord := models.OTP{
		Phone:            req.Phone,
		OTPCode:          otp,
		VerificationCode: uuid.NewString(),
		Status:           "active",
		ExpiresAt:        time.Now().Add(10 * time.Minute),
	}

	if err := database.DB.Create(&otpRecord).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "OTP sent but failed to save record: " + err.Error(),
		})
	}

	responseMsg := "SMS sent successfully"
	if emailSent {
		responseMsg = "OTP sent via SMS and Email successfully"
	}

	return c.Status(smsResp.StatusCode).JSON(fiber.Map{
		"error":             smsResp.StatusCode >= 400,
		"msg":               responseMsg,
		"otp":               otp,
		"verification_code": otpRecord.VerificationCode,
		"expires_in":        "10 minutes",
		"email_sent":        emailSent,
		"response":          string(respBody),
	})
}

// sendEmailOTP sends OTP via email only
func sendEmailOTP(c *fiber.Ctx, req *OTPRequest) error {
	otp := generateMixedOTP(6)

	templateEngine := templates.NewEmailTemplates()
	supportEmail := os.Getenv("EMAIL_SENDER_EMAIL")
	html := templateEngine.RenderOTPEmail(templates.OTPEmailData{
		Code:          otp,
		ExpiryMinutes: 10,
		SupportEmail:  supportEmail,
	})

	if err := sendSMTPEmail(req.Email, "SafeLand OTP Code", html); err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to send email: " + err.Error(),
		})
	}

	// Save OTP to database
	otpRecord := models.OTP{
		Phone:            req.Email, // Store email in phone field for now
		OTPCode:          otp,
		VerificationCode: uuid.NewString(),
		Status:           "active",
		ExpiresAt:        time.Now().Add(10 * time.Minute),
	}

	if err := database.DB.Create(&otpRecord).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "OTP sent but failed to save record: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"error":             false,
		"msg":               "OTP sent to email successfully",
		"otp":               otp,
		"verification_code": otpRecord.VerificationCode,
		"expires_in":        "10 minutes",
	})
}

// SendPasswordResetEmail send password reset email with professional template
// @Description Send password reset email with a professional template
// @Summary Send password reset email
// @Tags Notifications
// @Accept json
// @Produce json
// @Param request body ResetEmailRequest true "Reset Email Request"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/notifications/send-reset-email [post]
func SendPasswordResetEmail(c *fiber.Ctx) error {
	req := new(ResetEmailRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "email is required",
		})
	}

	// Look up user by email to get UserID for foreign key constraint
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": true,
			"msg":   "No account found with this email address",
		})
	}

	// Generate reset token on server side
	resetToken := generateResetToken()

	// Create password reset record in database
	resetRecord := models.PasswordReset{
		UserID:    user.ID,
		Email:     req.Email,
		Token:     resetToken,
		Status:    "active",
		ExpiresAt: time.Now().Add(20 * time.Minute),
	}

	if err := database.DB.Create(&resetRecord).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to create reset token: " + err.Error(),
		})
	}

	baseURL := strings.TrimRight(os.Getenv("BASE_URL"), "/")
	if baseURL == "" {
		baseURL = "http://127.0.0.1:3000"
	}
	resetLink := fmt.Sprintf("%s/api/notifications/password-reset-form?token=%s", baseURL, resetToken)
	templateEngine := templates.NewEmailTemplates()
	supportEmail := os.Getenv("EMAIL_SENDER_EMAIL")
	html := templateEngine.RenderPasswordResetEmail(templates.PasswordResetEmailData{
		ResetLink:    resetLink,
		ExpiryHours:  0,
		SupportEmail: supportEmail,
	})

	if err := sendSMTPEmail(req.Email, "SafeLand Password Reset", html); err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to send reset email: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"error":      false,
		"msg":        "Password reset email sent. Check your email for the reset link.",
		"expires_in": "20 minutes",
	})
}

// PasswordResetForm serves a professional password reset form
// @Description Serve password reset form
// @Summary Password reset form
// @Tags Notifications
// @Produce text/html
// @Param token query string true "Reset Token"
// @Success 200 {string} string
// @Security BearerAuth
// @Router /api/notifications/password-reset-form [get]
func PasswordResetForm(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		c.Set("Content-Type", "text/html; charset=utf-8")
		return c.Status(fiber.StatusBadRequest).SendString(buildResetErrorHTML("Invalid request", "No token provided"))
	}

	// Validate token exists and is not expired/used
	var resetRecord models.PasswordReset
	if err := database.DB.Where("token = ?", token).First(&resetRecord).Error; err != nil {
		c.Set("Content-Type", "text/html; charset=utf-8")
		return c.Status(fiber.StatusNotFound).SendString(buildResetErrorHTML("Invalid Link", "This password reset link does not exist or has expired"))
	}

	// Check if token is already used
	if resetRecord.Status == "used" {
		c.Set("Content-Type", "text/html; charset=utf-8")
		return c.Status(fiber.StatusBadRequest).SendString(buildResetErrorHTML("Link Already Used", "This password reset link has already been used"))
	}

	// Check if token is expired
	if resetRecord.ExpiresAt.Before(time.Now()) || resetRecord.Status == "expired" {
		c.Set("Content-Type", "text/html; charset=utf-8")
		return c.Status(fiber.StatusBadRequest).SendString(buildResetErrorHTML("Link Expired", "This password reset link has expired. Please request a new one"))
	}

	// Token is valid, show reset form
	baseURL := c.BaseURL()
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}
	html := buildResetFormHTML(baseURL, token)
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}

// ResetPassword handles password reset form submissions
// @Description Reset password (validates token and passwords)
// @Summary Reset password
// @Tags Notifications
// @Accept application/x-www-form-urlencoded
// @Produce json
// @Param token formData string true "Reset Token"
// @Param password formData string true "New Password"
// @Param confirm_password formData string true "Confirm Password"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/notifications/password-reset [post]
func ResetPassword(c *fiber.Ctx) error {
	req := new(ResetPasswordRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.Token == "" || req.Password == "" || req.ConfirmPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "token, password, and confirm_password are required",
		})
	}

	if req.Password != req.ConfirmPassword {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "passwords do not match",
		})
	}

	// Validate password strength
	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "password must be at least 8 characters",
		})
	}

	// Validate token
	var resetRecord models.PasswordReset
	if err := database.DB.Where("token = ?", req.Token).First(&resetRecord).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid password reset token",
		})
	}

	// Check if token is already used
	if resetRecord.Status == "used" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "This password reset link has already been used",
		})
	}

	// Check if token is expired
	if resetRecord.ExpiresAt.Before(time.Now()) || resetRecord.Status == "expired" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "This password reset link has expired",
		})
	}

	// Get user by ID
	var user models.User
	if err := database.DB.Where("id = ?", resetRecord.UserID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "User not found",
		})
	}

	// Hash new password with bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to process password",
		})
	}

	// Update user password
	if err := database.DB.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to update password: " + err.Error(),
		})
	}

	// Mark token as used
	now := time.Now()
	if err := database.DB.Model(&resetRecord).Updates(map[string]interface{}{
		"status":  "used",
		"used_at": now,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Password updated but failed to finalize: " + err.Error(),
		})
	}

	// Return success page instead of JSON
	c.Set("Content-Type", "text/html; charset=utf-8")
	frontendURL := os.Getenv("FRONTEND_BASE_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	successHTML := buildResetSuccessHTML(frontendURL, user.Email)
	return c.Status(fiber.StatusOK).SendString(successHTML)
}

func sendSMTPEmail(to, subject, htmlBody string) error {
	host := os.Getenv("EMAIL_SMTP_SERVER")
	port := os.Getenv("EMAIL_SMTP_PORT")
	from := os.Getenv("EMAIL_SENDER_EMAIL")
	password := os.Getenv("EMAIL_SENDER_PASSWORD")
	// For Dynadot SMTP, always use the full email address for authentication
	login := from

	if host == "" || port == "" || from == "" || password == "" {
		return fmt.Errorf("missing SMTP configuration")
	}

	addr := host + ":" + port

	header := make(map[string]string)
	header["From"] = from
	header["To"] = to
	header["Subject"] = subject
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = "text/html; charset=\"UTF-8\""

	var msg bytes.Buffer
	for k, v := range header {
		msg.WriteString(k + ": " + v + "\r\n")
	}
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)

	portNum, _ := strconv.Atoi(port)

	if portNum == 465 {
		return sendSMTPWithTLS(addr, host, login, password, to, msg.Bytes())
	}

	return sendSMTPWithStartTLS(addr, host, login, password, to, msg.Bytes())
}

func sendSMTPWithStartTLS(addr, host, login, password, to string, msg []byte) error {
	c, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer c.Close()

	// STARTTLS is required for this server
	ok, _ := c.Extension("STARTTLS")
	if !ok {
		return fmt.Errorf("STARTTLS not supported by server")
	}

	tlsConfig := &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: false,
	}
	if err := c.StartTLS(tlsConfig); err != nil {
		return fmt.Errorf("STARTTLS failed: %w", err)
	}

	// Use PLAIN auth (matching Python's smtplib default after STARTTLS)
	// Use LOGIN auth (required by Dynadot SMTP server)
	auth := &CustomLoginAuth{
		username: login,
		password: password,
	}
	if err := c.Auth(auth); err != nil {
		return fmt.Errorf("authentication failed: %w", err)
	}

	if err := c.Mail(os.Getenv("EMAIL_SENDER_EMAIL")); err != nil {
		return fmt.Errorf("MAIL command failed: %w", err)
	}

	if err := c.Rcpt(strings.TrimSpace(strings.ToLower(to))); err != nil {
		return fmt.Errorf("RCPT command failed: %w", err)
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("DATA command failed: %w", err)
	}
	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}
	return w.Close()
}

func sendSMTPWithTLS(addr, host, login, password, to string, msg []byte) error {
	tlsConfig := &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: false,
	}
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to establish TLS connection: %w", err)
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer c.Close()

	// Try authentication - skip if server doesn't support it
	if ok, _ := c.Extension("AUTH"); ok {
		auth := smtp.PlainAuth("", login, password, host)
		if err := c.Auth(auth); err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}
	}

	if err := c.Mail(os.Getenv("EMAIL_SENDER_EMAIL")); err != nil {
		return fmt.Errorf("MAIL command failed: %w", err)
	}

	if err := c.Rcpt(strings.TrimSpace(strings.ToLower(to))); err != nil {
		return fmt.Errorf("RCPT command failed: %w", err)
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("DATA command failed: %w", err)
	}
	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}
	return w.Close()
}

func getSMSAccessToken() (string, error) {
	loginPayload := map[string]string{
		"api_username": os.Getenv("SMS_USERNAME"),
		"api_password": os.Getenv("SMS_PASSWORD"),
	}

	payloadBytes, err := json.Marshal(loginPayload)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(os.Getenv("SMS_AUTH"), "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("failed to parse SMS auth response: %w", err)
	}

	accessToken, ok := parsed["access_token"].(string)
	if !ok || accessToken == "" {
		return "", fmt.Errorf("access_token missing from SMS auth response")
	}

	return accessToken, nil
}

func generateMixedOTP(length int) string {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		return "A1B2C3"
	}
	for i := range b {
		b[i] = letters[int(b[i])%len(letters)]
	}
	return string(b)
}

func generateResetToken() string {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return uuid.NewString()
	}
	return fmt.Sprintf("%x", b)
}

func buildEmailTemplate(title, message string) string {
	messageHTML := strings.ReplaceAll(message, "\n", "<br />")

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>SafeLand - %s</title>
	<style>
		body { margin: 0; padding: 0; background-color: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0a162e; }
		table { border-collapse: collapse; }
		.container { width: 100%%; background-color: #f5f7fb; padding: 24px 0; }
		.card { width: 100%%; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
		.header { background: linear-gradient(135deg, #395d91 0%%, #2b4b7f 100%%); padding: 28px 32px; color: #ffffff; }
		.header-title { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.3px; }
		.header-subtitle { font-size: 13px; opacity: 0.9; margin: 6px 0 0; }
		.badge { display: inline-block; background: #eaf0fb; color: #395d91; font-weight: 600; font-size: 12px; padding: 6px 10px; border-radius: 999px; letter-spacing: 0.3px; margin-bottom: 12px; }
		.content { padding: 32px; }
		.content h2 { margin: 0 0 12px; font-size: 22px; color: #0a162e; }
		.content p { margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: #42526b; }
		.divider { height: 1px; background: #e6edf7; margin: 24px 0; }
		.security { background: #fff5f5; border-left: 4px solid #e11d48; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #7a1f3d; }
		.footer { padding: 24px 32px 30px; background: #f8fafc; text-align: center; }
		.footer p { margin: 6px 0; font-size: 12px; color: #667085; }
		.footer a { color: #395d91; text-decoration: none; }
		@media (max-width: 620px) {
			.content, .footer { padding: 24px; }
			.header { padding: 24px; }
			.header-title { font-size: 20px; }
		}
	</style>
</head>
<body>
	<span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">%s</span>
	<table role="presentation" class="container" width="100%%">
		<tr>
			<td align="center">
				<table role="presentation" class="card" width="620">
					<tr>
						<td class="header">
							<div class="badge">SafeLand Rwanda</div>
							<h1 class="header-title">Secure MarketPlace For Land Transctions</h1>
							<p class="header-subtitle">Trusted updates from your land services team</p>
						</td>
					</tr>
					<tr>
						<td class="content">
							<h2>%s</h2>
							<p>%s</p>
							<div class="divider"></div>
							<div class="security">
								<strong>Security Notice:</strong> Never share codes or links from this email. SafeLand will never ask for sensitive information via email.
							</div>
						</td>
					</tr>
					<tr>
						<td class="footer">
							<p>&copy; %d SafeLand Rwanda. All rights reserved.</p>
							<p>Empowering Rwanda's Land Management</p>
							<p><a href="#">Privacy Policy</a> • <a href="#">Terms of Service</a> • <a href="#">Contact Support</a></p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`, title, title, title, messageHTML, time.Now().Year())
}

func buildResetTemplate(title, message string) string {
	return buildEmailTemplate(title, message)
}

func buildResetFormHTML(baseURL, token string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - SafeLand Rwanda</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fb 0%%, #e6edf7 100%%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #0a162e;
    }
    .container { width: 100%%; max-width: 480px; }
    .card { 
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #395d91 0%%, #2b4b7f 100%%);
      padding: 32px 28px;
      text-align: center;
      color: #ffffff;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-weight: 600;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 999px;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .header p {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
    }
    .content { padding: 32px 28px; }
    .info-box {
      background: #f0f5ff;
      border-left: 4px solid #395d91;
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #2d3e5f;
    }
    .form-group { margin-bottom: 20px; }
    .form-group label {
      display: block;
      font-weight: 600;
      color: #0a162e;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .input-wrapper { position: relative; }
    .input-icon {
      position: absolute;
      left: 14px;
      top: 50%%;
      transform: translateY(-50%%);
      color: #6b7b95;
      font-size: 18px;
    }
    .form-group input {
      width: 100%%;
      padding: 12px 14px 12px 42px;
      border: 1.5px solid #d7e3ff;
      border-radius: 10px;
      font-size: 15px;
      font-family: inherit;
      transition: all 0.2s ease;
      background: #ffffff;
    }
    .form-group input:focus {
      outline: none;
      border-color: #395d91;
      box-shadow: 0 0 0 3px rgba(57, 93, 145, 0.1);
    }
    .form-group input.error {
      border-color: #e11d48;
    }
    .error-message {
      color: #e11d48;
      font-size: 12px;
      margin-top: 6px;
      display: none;
    }
    .error-message.show { display: block; }
    .password-strength {
      height: 4px;
      background: #e6edf7;
      border-radius: 2px;
      margin-top: 8px;
      overflow: hidden;
    }
    .password-strength-bar {
      height: 100%%;
      width: 0;
      transition: width 0.3s ease, background-color 0.3s ease;
    }
    .strength-weak { background: #ef4444; width: 33%%; }
    .strength-medium { background: #f59e0b; width: 66%%; }
    .strength-strong { background: #10b981; width: 100%%; }
    .requirements {
      background: #fef9f5;
      border-left: 4px solid #f59e0b;
      padding: 12px 14px;
      border-radius: 8px;
      margin-top: 16px;
      font-size: 12px;
      color: #7a5c3d;
    }
    .requirements ul { margin: 8px 0 0 18px; padding: 0; }
    .requirements li { margin: 4px 0; }
    .submit-btn {
      width: 100%%;
      padding: 14px;
      background: linear-gradient(135deg, #395d91 0%%, #2b4b7f 100%%);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      margin-top: 24px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(57, 93, 145, 0.3);
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spinner {
      display: none;
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%%;
      animation: spin 0.6s linear infinite;
    }
    .submit-btn.loading .spinner { display: block; }
    .submit-btn.loading .btn-text { display: none; }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .footer {
      padding: 20px 28px;
      background: #f8fafc;
      text-align: center;
      border-top: 1px solid #e6edf7;
    }
    .footer p {
      font-size: 12px;
      color: #667085;
      margin: 4px 0;
    }
    @media (max-width: 600px) {
      .content, .footer { padding: 24px 20px; }
      .header { padding: 28px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="badge">SafeLand Rwanda</div>
        <h1>🔒 Reset Password</h1>
        <p>Secure MarketPlace For Land Transctions</p>
      </div>
      
      <div class="content">
        <div class="info-box">
          <strong>Security:</strong> Choose a strong password to protect your account.
        </div>

        <form id="resetForm" method="POST" action="%s/api/notifications/password-reset">
          <input type="hidden" name="token" value="%s">
          
          <div class="form-group">
            <label for="password">New Password</label>
            <div class="input-wrapper">
              <span class="input-icon">🔑</span>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                placeholder="Enter new password"
                minlength="8"
              >
            </div>
            <div class="password-strength">
              <div class="password-strength-bar" id="strengthBar"></div>
            </div>
            <div class="error-message" id="passwordError">Password is required</div>
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <div class="input-wrapper">
              <span class="input-icon">✓</span>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirm_password" 
                required 
                placeholder="Confirm password"
              >
            </div>
            <div class="error-message" id="confirmError">Passwords do not match</div>
          </div>

          <div class="requirements">
            <strong>Password Requirements:</strong>
            <ul>
              <li>At least 8 characters long</li>
              <li>Mix of uppercase and lowercase letters</li>
              <li>At least one number</li>
              <li>At least one special character (!@#$%%^&*)</li>
            </ul>
          </div>
          
          <button type="submit" class="submit-btn" id="submitBtn">
            <span class="spinner"></span>
            <span class="btn-text">Reset Password →</span>
          </button>
        </form>
      </div>
      
      <div class="footer">
        <p>If you didn't request this, you can safely close this page.</p>
        <p style="margin-top: 12px; color: #9ca3af;">SafeLand Rwanda © 2024</p>
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('resetForm');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const submitBtn = document.getElementById('submitBtn');
    const strengthBar = document.getElementById('strengthBar');
    const passwordError = document.getElementById('passwordError');
    const confirmError = document.getElementById('confirmError');

    // Password strength checker
    password.addEventListener('input', function() {
      const value = this.value;
      let strength = 0;
      
      if (value.length >= 8) strength++;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
      if (/\d/.test(value)) strength++;
      if (/[!@#$%%^&*(),.?":{}|<>]/.test(value)) strength++;

      strengthBar.className = 'password-strength-bar';
      if (strength === 0) {
        strengthBar.style.width = '0';
      } else if (strength <= 2) {
        strengthBar.classList.add('strength-weak');
      } else if (strength === 3) {
        strengthBar.classList.add('strength-medium');
      } else {
        strengthBar.classList.add('strength-strong');
      }
    });

    // Form validation
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Reset errors
      password.classList.remove('error');
      confirmPassword.classList.remove('error');
      passwordError.classList.remove('show');
      confirmError.classList.remove('show');

      let isValid = true;

      // Check password
      if (!password.value || password.value.trim() === '') {
        password.classList.add('error');
        passwordError.textContent = 'Password is required';
        passwordError.classList.add('show');
        isValid = false;
      } else if (password.value.length < 8) {
        password.classList.add('error');
        passwordError.textContent = 'Password must be at least 8 characters';
        passwordError.classList.add('show');
        isValid = false;
      }

      // Check confirm password
      if (!confirmPassword.value || confirmPassword.value.trim() === '') {
        confirmPassword.classList.add('error');
        confirmError.textContent = 'Please confirm your password';
        confirmError.classList.add('show');
        isValid = false;
      } else if (password.value !== confirmPassword.value) {
        confirmPassword.classList.add('error');
        confirmError.textContent = 'Passwords do not match';
        confirmError.classList.add('show');
        isValid = false;
      }

      if (!isValid) return;

      // Show loading state
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      // Submit form
      form.submit();
    });

    // Clear error on input
    password.addEventListener('input', function() {
      this.classList.remove('error');
      passwordError.classList.remove('show');
    });

    confirmPassword.addEventListener('input', function() {
      this.classList.remove('error');
      confirmError.classList.remove('show');
    });
  </script>
</body>
</html>`, baseURL, token)
}

func buildResetErrorHTML(title, message string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%s - SafeLand Rwanda</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fb 0%%, #e6edf7 100%%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #0a162e;
    }
    .container { width: 100%%; max-width: 480px; }
    .card { 
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
      overflow: hidden;
      text-align: center;
    }
    .header {
      background: linear-gradient(135deg, #e11d48 0%%, #be123c 100%%);
      padding: 32px 28px;
      color: #ffffff;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    }
    .content { padding: 32px 28px; }
    .content p {
      font-size: 15px;
      line-height: 1.7;
      color: #42526b;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #395d91 0%%, #2b4b7f 100%%);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.2s ease;
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(57, 93, 145, 0.3);
    }
    .footer {
      padding: 20px 28px;
      background: #f8fafc;
      border-top: 1px solid #e6edf7;
    }
    .footer p {
      font-size: 12px;
      color: #667085;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="icon">⚠️</div>
        <h1>%s</h1>
      </div>
      
      <div class="content">
        <p>%s</p>
        <a href="%s/forgot-password" class="btn">Request New Reset Link →</a>
      </div>

      <div class="footer">
        <p>SafeLand Rwanda - Secure MarketPlace For Land Transctions</p>
      </div>
    </div>
  </div>
</body>
</html>`, title, title, message, os.Getenv("FRONTEND_BASE_URL"))
}

func buildResetSuccessHTML(frontendURL, email string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful - SafeLand Rwanda</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fb 0%%, #e6edf7 100%%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #0a162e;
    }
    .container { width: 100%%; max-width: 480px; }
    .card { 
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
      overflow: hidden;
      text-align: center;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);
      padding: 32px 28px;
      color: #ffffff;
    }
    .icon {
      font-size: 56px;
      margin-bottom: 16px;
      animation: bounceIn 0.6s ease;
    }
    @keyframes bounceIn {
      0%% { transform: scale(0); opacity: 0; }
      50%% { transform: scale(1.1); }
      100%% { transform: scale(1); opacity: 1; }
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    }
    .header p {
      font-size: 13px;
      opacity: 0.95;
      margin-top: 6px;
    }
    .content { padding: 32px 28px; }
    .success-message {
      background: #f0fdf4;
      border: 1px solid #dcfce7;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 14px;
      color: #166534;
    }
    .email-display {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 14px;
      margin: 16px 0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #42526b;
      word-break: break-all;
    }
    .content p {
      font-size: 15px;
      line-height: 1.7;
      color: #42526b;
      margin-bottom: 16px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #395d91 0%%, #2b4b7f 100%%);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s ease;
      margin-top: 8px;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(57, 93, 145, 0.4);
    }
    .footer {
      padding: 20px 28px;
      background: #f8fafc;
      border-top: 1px solid #e6edf7;
    }
    .footer p {
      font-size: 12px;
      color: #667085;
      margin: 4px 0;
    }
    .tip {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 14px;
      border-radius: 8px;
      margin-top: 20px;
      font-size: 12px;
      color: #7a5c3d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="icon">✅</div>
        <h1>Password Reset Successful!</h1>
        <p>Your SafeLand account is now secure</p>
      </div>
      
      <div class="content">
        <div class="success-message">
          Your password has been successfully updated. You can now log in with your new password.
        </div>

        <p>Account email:</p>
        <div class="email-display">%s</div>

        <p>Ready to get back to Login Page?</p>
        <a href="%s" class="btn">Go to Dashboard →</a>

        <div class="tip">
          <strong>💡 Tip:</strong> For security, we recommend changing your password every 90 days.
        </div>
      </div>

      <div class="footer">
        <p>SafeLand Rwanda - Secure MarketPlace For Land Transctions</p>
        <p>&copy; 2024 SafeLand Rwanda. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`, email, frontendURL)
}
