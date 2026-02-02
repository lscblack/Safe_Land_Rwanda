package auth

import (
	"encoding/json"
	"errors"
	"safeland/offchain/config"
	"safeland/offchain/data/database"
	"safeland/offchain/data/models"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
)

// GenerateNewAccessToken func for generate a new access token.
func GenerateNewAccessToken(id string, roles []string) (string, error) {
	// Set secret key from .env file.
	secret := config.Config("JWT_SECRET")

	// Set expires time for token.
	minutesCount, _ := strconv.Atoi(config.Config("ACCESS_TOKEN_EXPIRATION"))

	// Create a new claims.
	claims := jwt.MapClaims{}

	// Set public claims:
	claims["id"] = id
	claims["role"] = roles
	claims["expires"] = time.Now().Add(time.Minute * time.Duration(minutesCount)).Unix()

	// Create a new JWT access token with claims.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate token.
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		// Return error, it JWT token generation failed.
		return "", err
	}

	return t, nil
}

// GenerateNewRefreshToken func for generate a new refresh token.
func GenerateNewRefreshToken(id string) (string, error) {
	// Set secret key from .env file.
	secret := config.Config("JWT_REFRESH_SECRET")

	// Set expires time for token.
	hoursCount, _ := strconv.Atoi(config.Config("REFRESH_TOKEN_EXPIRATION"))

	// Create a new claims.
	claims := jwt.MapClaims{}

	// Set public claims:
	claims["id"] = id
	claims["expires"] = time.Now().Add(time.Hour * time.Duration(hoursCount)).Unix()

	// Create a new JWT refresh token with claims.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate token.
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		// Return error, it JWT token generation failed.
		return "", err
	}

	return t, nil
}

// GetUserIDFromToken func to get user id from token.
func GetUserIDFromToken(c *fiber.Ctx) (string, error) {
	// Get token from header
	tokenString := c.Get("Authorization")

	// Check if token is missing
	if tokenString == "" {
		return "", errors.New("missing or malformed JWT")
	}

	// Parse token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(config.Config("JWT_SECRET")), nil
	})

	if err != nil {
		return "", err
	}

	// Get claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims["id"].(string), nil
	}

	return "", errors.New("invalid token")
}

// HasRole func to check if user has role
func HasRole(c *fiber.Ctx, roles string) (bool, error) {
	// Get user id from token
	userID, err := GetUserIDFromToken(c)
	if err != nil {
		return false, err
	}

	// Find user
	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	// Unmarshal roles from JSON
	var userRoles []string
	if err := json.Unmarshal([]byte(user.Role), &userRoles); err != nil {
		return false, errors.New("invalid role format")
	}

	// Check if user has role
	for _, role := range strings.Split(roles, ",") {
		role = strings.TrimSpace(role)
		for _, userRole := range userRoles {
			if strings.EqualFold(strings.TrimSpace(userRole), role) {
				return true, nil
			}
		}
	}

	return false, nil
}

// GenerateFrontendToken func for generate a frontend access token (valid for 24 hours).
func GenerateFrontendToken() (string, error) {
	// Set secret key from .env file.
	secret := config.Config("JWT_SECRET")

	// Create a new claims.
	claims := jwt.MapClaims{}

	// Set public claims:
	claims["type"] = "frontend"
	claims["expires"] = time.Now().Add(time.Hour * 24).Unix()

	// Create a new JWT access token with claims.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate token.
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return t, nil
}

// VerifyFrontendToken func to verify frontend token from Authorization header.
func VerifyFrontendToken(c *fiber.Ctx) error {
	// Get token from Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Missing Authorization header",
		})
	}

	// Extract token from "Bearer <token>" format
	tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer"))
	if tokenString == authHeader {
		// No "Bearer" prefix found
		tokenString = authHeader
	}

	// Parse and validate token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(config.Config("JWT_SECRET")), nil
	})

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid token: " + err.Error(),
		})
	}

	// Verify token claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Check if token type is frontend
		tokenType, ok := claims["type"].(string)
		if !ok || tokenType != "frontend" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": true,
				"msg":   "Invalid token type",
			})
		}

		// Check if token is expired
		if exp, ok := claims["expires"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": true,
					"msg":   "Token expired",
				})
			}
		}

		// Token is valid, continue to next handler
		return c.Next()
	}

	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": true,
		"msg":   "Invalid token",
	})
}
