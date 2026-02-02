package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"fmt"
)

// HashProvider handles secure hashing operations
type HashProvider struct {
	hmacSecret []byte
}

// NewHashProvider creates a new hash provider with optional HMAC secret
func NewHashProvider(hmacSecret []byte) *HashProvider {
	return &HashProvider{hmacSecret: hmacSecret}
}

// HashPassword hashes a password using SHA256
func (hp *HashProvider) HashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return fmt.Sprintf("%x", hash)
}

// HashOTP hashes an OTP code using SHA256
func (hp *HashProvider) HashOTP(otp string) string {
	hash := sha256.Sum256([]byte(otp))
	return fmt.Sprintf("%x", hash)
}

// HashToken hashes a token using SHA256
func (hp *HashProvider) HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", hash)
}

// VerifyPassword verifies a password against its hash using constant-time comparison
func (hp *HashProvider) VerifyPassword(password, hash string) bool {
	computed := hp.HashPassword(password)
	return hmac.Equal([]byte(computed), []byte(hash))
}

// VerifyOTP verifies an OTP code against its hash using constant-time comparison
func (hp *HashProvider) VerifyOTP(otp, hash string) bool {
	computed := hp.HashOTP(otp)
	return hmac.Equal([]byte(computed), []byte(hash))
}

// VerifyToken verifies a token against its hash using constant-time comparison
func (hp *HashProvider) VerifyToken(token, hash string) bool {
	computed := hp.HashToken(token)
	return hmac.Equal([]byte(computed), []byte(hash))
}

// GenerateHMAC creates an HMAC-SHA256 signature
func (hp *HashProvider) GenerateHMAC(data string) string {
	if hp.hmacSecret == nil || len(hp.hmacSecret) == 0 {
		return ""
	}
	h := hmac.New(sha256.New, hp.hmacSecret)
	h.Write([]byte(data))
	return fmt.Sprintf("%x", h.Sum(nil))
}

// VerifyHMAC verifies an HMAC signature using constant-time comparison
func (hp *HashProvider) VerifyHMAC(data, signature string) bool {
	if hp.hmacSecret == nil || len(hp.hmacSecret) == 0 {
		return false
	}
	computed := hp.GenerateHMAC(data)
	return hmac.Equal([]byte(computed), []byte(signature))
}
