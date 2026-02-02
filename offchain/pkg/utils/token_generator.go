package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
)

// TokenGenerator generates cryptographically secure random tokens
type TokenGenerator struct{}

// NewTokenGenerator creates a new token generator
func NewTokenGenerator() *TokenGenerator {
	return &TokenGenerator{}
}

// GenerateToken creates a cryptographically secure random token (32 bytes = 64 hex chars)
func (tg *TokenGenerator) GenerateToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// GenerateOTP creates an alphanumeric OTP (letters + numbers)
// Excludes confusing characters (0, O, 1, I, l)
func (tg *TokenGenerator) GenerateOTP(length int) (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	if length < 4 || length > 12 {
		length = 6
	}

	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP: %w", err)
	}

	otp := make([]byte, length)
	for i := range b {
		otp[i] = charset[int(b[i])%len(charset)]
	}

	return string(otp), nil
}

// FormatOTP adds hyphens to make OTP more readable (e.g., ABC-123)
func (tg *TokenGenerator) FormatOTP(otp string, groupSize int) string {
	if groupSize <= 0 {
		groupSize = 3
	}

	var result strings.Builder
	for i, char := range otp {
		if i > 0 && i%groupSize == 0 {
			result.WriteRune('-')
		}
		result.WriteRune(char)
	}

	return result.String()
}
