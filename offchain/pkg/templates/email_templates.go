package templates

import (
  "strconv"
  "strings"
)

// TemplateData holds dynamic data for email templates
type TemplateData struct {
	Subject     string
	Message     string
	Email       string
	ActionLink  string
	OTP         string
	Name        string
	TokenExpiry string
	Type        string
	Year        int
}

// OTPEmailData holds data for OTP email template
type OTPEmailData struct {
	Code           string
	ExpiryMinutes  int
	SupportEmail   string
}

// PasswordResetEmailData holds data for password reset email template
type PasswordResetEmailData struct {
	ResetLink    string
	ExpiryHours  int
	SupportEmail string
}

// NotificationEmailData holds data for generic notification email template
type NotificationEmailData struct {
	Title        string
	Message      string
	ActionURL    string
	SupportEmail string
}

// SecurityAlertEmailData holds data for security alert email template
type SecurityAlertEmailData struct {
	Title        string
	Message      string
	ActionURL    string
	ActionText   string
	SupportEmail string
}

// EmailTemplates contains all email template functions
type EmailTemplates struct{}

// NewEmailTemplates creates a new email templates instance
func NewEmailTemplates() *EmailTemplates {
	return &EmailTemplates{}
}

// RenderEmailTemplate renders the main email wrapper with dynamic content
func (et *EmailTemplates) RenderEmailTemplate(data TemplateData) string {
	if data.Year == 0 {
		data.Year = 2024
	}

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>` + data.Subject + `</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0a162e; }
    table { border-collapse: collapse; }
    img { border: 0; max-width: 100%; height: auto; display: block; }
    .container { width: 100%; background-color: #f5f7fb; padding: 24px 0; }
    .card { width: 100%; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
    .header { background: linear-gradient(135deg, #395d91 0%, #2b4b7f 100%); padding: 28px 32px; color: #ffffff; }
    .header-title { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.3px; }
    .header-subtitle { font-size: 13px; opacity: 0.9; margin: 6px 0 0; }
    .content { padding: 32px; }
    .content h2 { margin: 0 0 12px; font-size: 22px; color: #0a162e; }
    .content p { margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: #42526b; }
    .badge { display: inline-block; background: #eaf0fb; color: #395d91; font-weight: 600; font-size: 12px; padding: 6px 10px; border-radius: 999px; letter-spacing: 0.3px; }
    .divider { height: 1px; background: #e6edf7; margin: 24px 0; }
    .security { background: #fff5f5; border-left: 4px solid #e11d48; padding: 12px 14px; border-radius: 8px; font-size: 12px; color: #7a1f3d; }
    .footer { padding: 24px 32px 30px; background: #f8fafc; text-align: center; }
    .footer p { margin: 6px 0; font-size: 12px; color: #667085; }
    .footer a { color: #395d91; text-decoration: none; }
    .action-button { display: inline-block; background: #395d91; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; }
    .otp-box { background: #f0f5ff; border: 1px solid #d7e3ff; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; }
    .otp-code { font-size: 30px; font-weight: 700; letter-spacing: 6px; color: #395d91; margin: 10px 0; font-family: 'Courier New', monospace; }
    .otp-expiry { font-size: 12px; color: #5b6b88; }
    @media (max-width: 620px) {
      .content, .footer { padding: 24px; }
      .header { padding: 24px; }
      .header-title { font-size: 20px; }
    }
  </style>
</head>
<body>
  <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">` + data.Subject + `</span>
  <table role="presentation" class="container" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" class="card" width="620">
          <tr>
            <td class="header">
              <p class="badge">SafeLand Rwanda</p>
              <h1 class="header-title">Secure Land Information Platform</h1>
              <p class="header-subtitle">Trusted updates from your land services team</p>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h2>` + data.Subject + `</h2>
              <p>` + data.Message + `</p>
              {{ACTION_CONTENT}}
              <div class="divider"></div>
              <div class="security">
                <strong>Security Notice:</strong> Never share codes or links from this email. SafeLand will never ask for sensitive information via email.
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p>&copy; ` + formatYear(data.Year) + ` SafeLand Rwanda. All rights reserved.</p>
              <p>Empowering Rwanda's Land Management</p>
              <p><a href="#">Privacy Policy</a> • <a href="#">Terms of Service</a> • <a href="#">Contact Support</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// RenderOTPEmail renders an OTP email template
func (et *EmailTemplates) RenderOTPEmail(data OTPEmailData) string {
	actionContent := `<div class="otp-box">
    <p>Your verification code is:</p>
    <div class="otp-code">` + data.Code + `</div>
    <p class="otp-expiry">This code expires in ` + formatMinutes(data.ExpiryMinutes) + `</p>
  </div>
  <p style="text-align: center; color: #6b7280; font-size: 14px;">
    Enter this code in your app to verify your account.
  </p>`

	templateData := TemplateData{
		Subject: "Your One-Time Password",
		Message: "Use this code to verify your identity",
	}

	template := et.RenderEmailTemplate(templateData)
	return replaceActionContent(template, actionContent)
}

// RenderPasswordResetEmail renders a password reset email template
func (et *EmailTemplates) RenderPasswordResetEmail(data PasswordResetEmailData) string {
	expiryLabel := formatHours(data.ExpiryHours)
	if data.ExpiryHours == 0 {
		expiryLabel = "20 minutes"
	}
	actionContent := `<p style="margin: 20px 0; color: #4b5563;">Click the button below to reset your password:</p>
  <div style="text-align: center;">
    <a href="` + data.ResetLink + `" class="action-button">Reset Password</a>
  </div>
  <p style="font-size: 14px; color: #6b7280;">Or copy this link:
    <br><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">` + data.ResetLink + `</code>
  </p>`

	templateData := TemplateData{
		Subject: "Reset Your Password",
    Message: "Click the button below to reset your password. This link expires in " + expiryLabel + ".",
	}

	template := et.RenderEmailTemplate(templateData)
	return replaceActionContent(template, actionContent)
}

// RenderNotificationEmail renders a generic notification email
func (et *EmailTemplates) RenderNotificationEmail(data NotificationEmailData) string {
	subject := data.Title
	if subject == "" {
		subject = "Notification from SafeLand Rwanda"
	}

	actionContent := ""
	if data.ActionURL != "" {
		actionContent = `<div style="text-align: center;">
    <a href="` + data.ActionURL + `" class="action-button">View Details</a>
  </div>`
	}

	templateData := TemplateData{
		Subject: subject,
		Message: data.Message,
	}

	template := et.RenderEmailTemplate(templateData)
	return replaceActionContent(template, actionContent)
}

// RenderSecurityAlertEmail renders a security alert email
func (et *EmailTemplates) RenderSecurityAlertEmail(data SecurityAlertEmailData) string {
	subject := data.Title
	if subject == "" {
		subject = "Security Alert"
	}

	actionContent := `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 25px 0;">
    <p style="color: #7f1d1d; font-weight: 600; margin-bottom: 12px;">⚠️ ` + subject + `</p>
    <p style="color: #7f1d1d; font-size: 14px; margin-bottom: 20px;">` + data.Message + `</p>`

	if data.ActionURL != "" {
		actionContent += `<div style="text-align: center;">
      <a href="` + data.ActionURL + `" class="action-button" style="display: inline-block;">` + data.ActionText + `</a>
    </div>`
	}

	actionContent += `</div>`

	templateData := TemplateData{
		Subject: subject,
		Message: "Security Notice",
	}

	template := et.RenderEmailTemplate(templateData)
	return replaceActionContent(template, actionContent)
}

// RenderPasswordResetForm renders an HTML form for password reset
func (et *EmailTemplates) RenderPasswordResetForm(resetToken string, baseURL string) string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .form-container {
      width: 100%;
      max-width: 450px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
      overflow: hidden;
    }
    .form-header {
      background: linear-gradient(135deg, #395d91 0%, #2a4175 100%);
      padding: 40px 30px;
      color: white;
      text-align: center;
    }
    .form-header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .form-header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .form-content {
      padding: 40px 30px;
    }
    .form-group {
      margin-bottom: 24px;
    }
    .form-group label {
      display: block;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 16px;
      font-family: inherit;
      transition: border-color 0.3s ease;
    }
    .form-group input:focus {
      outline: none;
      border-color: #395d91;
      box-shadow: 0 0 0 3px rgba(57, 93, 145, 0.1);
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #395d91 0%, #2a4175 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      margin-top: 30px;
    }
    .submit-btn:hover {
      opacity: 0.9;
    }
    .password-requirements {
      background: #f0f9ff;
      border-left: 4px solid #395d91;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 25px;
      font-size: 13px;
      color: #1e40af;
    }
    .password-requirements ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    .password-requirements li {
      margin: 6px 0;
    }
    @media (max-width: 600px) {
      .form-header {
        padding: 30px 20px;
      }
      .form-content {
        padding: 25px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="form-header">
      <h1>🔒 Reset Your Password</h1>
      <p>SafeLand Rwanda</p>
    </div>
    
    <div class="form-content">
      <div class="password-requirements">
        <strong>Password Requirements:</strong>
        <ul>
          <li>At least 8 characters long</li>
          <li>Mix of uppercase and lowercase letters</li>
          <li>At least one number</li>
          <li>At least one special character (!@#$%^&*)</li>
        </ul>
      </div>
      
      <form id="resetForm" method="POST" action="` + baseURL + `/auth/reset-password/confirm">
        <input type="hidden" name="token" value="` + resetToken + `">
        
        <div class="form-group">
          <label for="password">New Password</label>
          <input type="password" id="password" name="password" required placeholder="Enter new password">
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input type="password" id="confirmPassword" name="confirm_password" required placeholder="Confirm password">
        </div>
        
        <button type="submit" class="submit-btn">Reset Password</button>
      </form>
    </div>
  </div>
</body>
</html>`
}

// RenderErrorPage renders an error page
func (et *EmailTemplates) RenderErrorPage(title, message, actionURL string) string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>` + title + `</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 40px; }
    .error { color: #ef4444; font-size: 24px; margin: 20px 0; }
    a { color: #395d91; text-decoration: none; padding: 10px 20px; background: #f0f0f0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>⚠️ ` + title + `</h1>
  <p class="error">` + message + `</p>
  <a href="` + actionURL + `">Go Back</a>
</body>
</html>`
}

// Helper function to replace action content placeholder
func replaceActionContent(template, actionContent string) string {
	return strings.ReplaceAll(template, "{{ACTION_CONTENT}}", actionContent)
}

// Helper formatting functions
func formatMinutes(minutes int) string {
	if minutes == 1 {
		return "1 minute"
	}
  return strconv.Itoa(minutes) + " minutes"
}

func formatHours(hours int) string {
	if hours == 1 {
		return "1 hour"
	}
  return strconv.Itoa(hours) + " hours"
}

func formatYear(year int) string {
  if year == 0 {
    return "2024"
  }
  return strconv.Itoa(year)
}
