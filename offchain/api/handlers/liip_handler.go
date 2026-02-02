package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"safeland/offchain/data/database"
	"safeland/offchain/data/models"
	"safeland/offchain/pkg/auth"
	"safeland/offchain/pkg/roles"
	"safeland/offchain/pkg/utils"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
)

type LIIPLoginRequest struct {
	IDOrEmail string `json:"id_or_email"`
	Password  string `json:"password"`
}

type LIIPTokenRequest struct {
	Token string `json:"token"`
}

// LoginLIIPUser login user from LIIP database
// @Description Login user from LIIP database with SHA-256 password verification
// @Summary Login LIIP user
// @Tags LIIP Authentication
// @Accept json
// @Produce json
// @Param user body LIIPLoginRequest true "User"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/liip/login [post]
func LoginLIIPUser(c *fiber.Ctx) error {
	req := new(LIIPLoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.IDOrEmail == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "id_or_email and password are required",
		})
	}

	// Check if input is numeric (ID) or email
	var liipUser models.LIIPUser

	if isNumeric(req.IDOrEmail) {
		// Search by ID
		if err := database.LIIPDB.Where("email = ? OR id_number = ?", req.IDOrEmail, req.IDOrEmail).First(&liipUser).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": true,
				"msg":   "User not found or invalid password",
			})
		}
	} else {
		// Search by email
		if err := database.LIIPDB.Where("email = ?", req.IDOrEmail).First(&liipUser).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": true,
				"msg":   "User not found or invalid password",
			})
		}
	}

	// Verify SHA-256 password
	if !verifySHA256Password(req.Password, liipUser.Password) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "User not found or invalid password",
		})
	}

	// Check if user already exists in our SafeLand database
	var existingUser models.User
	emailCheck := database.DB.Where("email = ?", liipUser.Email).First(&existingUser).Error

	if emailCheck == nil {
		userRoles := fromJSONSlice(existingUser.Role)
		accessToken, err := auth.GenerateNewAccessToken(strconv.Itoa(int(existingUser.ID)), userRoles)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": true,
				"msg":   err.Error(),
			})
		}

		refreshToken, err := auth.GenerateNewRefreshToken(strconv.Itoa(int(existingUser.ID)))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": true,
				"msg":   err.Error(),
			})
		}

		existingUser.Password = ""
		return c.JSON(fiber.Map{
			"error":         false,
			"msg":           "Login successful",
			"user":          existingUser,
			"access_token":  accessToken,
			"refresh_token": refreshToken,
		})
	}

	// Create new user in SafeLand database from LIIP user
	avatar := "from_liip_" + strconv.Itoa(liipUser.ID) + "_avatar"
	userCode, err := utils.GenerateUserCode(roles.Buyer, "RW")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to generate user code: " + err.Error(),
		})
	}

	firstName, lastName := splitFullName(liipUser.FullName)
	if firstName == "" {
		firstName = "from_liip_" + strconv.Itoa(liipUser.ID)
	}
	if lastName == "" {
		lastName = "user"
	}

	username := liipUser.Email
	if username == "" {
		username = "liip_" + strconv.Itoa(liipUser.ID)
	}

	phone := liipUser.PhoneNumber
	if phone == "" {
		phone = "from_liip_" + strconv.Itoa(liipUser.ID) + "_phone"
	}

	idType := liipUser.IDType
	if idType == "" {
		idType = "NID"
	}

	nid := liipUser.IDNumber
	if nid == "" {
		nid = "from_liip_" + strconv.Itoa(liipUser.ID) + "_nid"
	}

	newUser := models.User{
		FirstName:  firstName,
		LastName:   lastName,
		Email:      liipUser.Email,
		Phone:      phone,
		Avatar:     avatar,
		Role:       toJSONSlice([]string{roles.Buyer}),
		IDtype:     idType,
		NIDNumber:  nid,
		UserCode:   userCode,
		Country:    "RW",
		IsActive:   liipUser.IsActive,
		IsVerified: true,
		Username:   username,
		Password:   "", // Don't store LIIP password
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to create user: " + err.Error(),
		})
	}

	userRoles := []string{roles.Buyer}
	accessToken, err := auth.GenerateNewAccessToken(strconv.Itoa(int(newUser.ID)), userRoles)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	refreshToken, err := auth.GenerateNewRefreshToken(strconv.Itoa(int(newUser.ID)))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	newUser.Password = ""
	return c.JSON(fiber.Map{
		"error":         false,
		"msg":           "User created and logged in successfully",
		"user":          newUser,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

// GetLIIPUserFromToken decode LIIP token and return user info
// @Description Get user information from LIIP token
// @Summary Get LIIP user from token
// @Tags LIIP Authentication
// @Accept json
// @Produce json
// @Param token body LIIPTokenRequest true "Token"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/liip/user-from-token [post]
func GetLIIPUserFromToken(c *fiber.Ctx) error {
	req := new(LIIPTokenRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.Token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "token is required",
		})
	}

	// Decode token
	secret := strings.TrimSpace(os.Getenv("LIIP_SECRET_KEY"))
	secret = strings.Trim(secret, "'\"")

	parsedToken, err := jwt.ParseWithClaims(req.Token, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})

	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid token: " + err.Error(),
		})
	}

	if !parsedToken.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Token is not valid",
		})
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid token claims",
		})
	}

	// Get user ID from token (support user_id, sub, id as float or int)
	var userID int

	// Try different claim keys
	var rawUserID interface{}
	if v, ok := claims["user_id"]; ok {
		rawUserID = v
	} else if v, ok := claims["sub"]; ok {
		rawUserID = v
	} else if v, ok := claims["id"]; ok {
		rawUserID = v
	} else {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "User ID not found in token claims",
		})
	}

	// Convert to int (handle both float64 and direct int)
	switch v := rawUserID.(type) {
	case float64:
		userID = int(v)
	case int:
		userID = v
	case int64:
		userID = int(v)
	default:
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid user ID type in token",
		})
	}

	// Get user from LIIP database
	var liipUser models.LIIPUser
	if err := database.LIIPDB.Where("id = ?", userID).First(&liipUser).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": true,
			"msg":   "User not found in LIIP database",
		})
	}

	// Check if user exists in SafeLand database
	var existingUser models.User
	emailCheck := database.DB.Where("email = ?", liipUser.Email).First(&existingUser).Error

	if emailCheck == nil {
		userRoles := fromJSONSlice(existingUser.Role)
		accessToken, err := auth.GenerateNewAccessToken(strconv.Itoa(int(existingUser.ID)), userRoles)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": true,
				"msg":   err.Error(),
			})
		}

		refreshToken, err := auth.GenerateNewRefreshToken(strconv.Itoa(int(existingUser.ID)))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": true,
				"msg":   err.Error(),
			})
		}

		// User exists in SafeLand
		existingUser.Password = ""
		return c.JSON(fiber.Map{
			"error":         false,
			"msg":           "User found",
			"user":          existingUser,
			"access_token":  accessToken,
			"refresh_token": refreshToken,
		})
	}

	// Create user in SafeLand if doesn't exist
	avatar := "from_liip_" + strconv.Itoa(liipUser.ID) + "_avatar"
	userCode, err := utils.GenerateUserCode(roles.Buyer, "RW")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to generate user code: " + err.Error(),
		})
	}

	firstName, lastName := splitFullName(liipUser.FullName)
	if firstName == "" {
		firstName = "from_liip_" + strconv.Itoa(liipUser.ID)
	}
	if lastName == "" {
		lastName = "user"
	}

	username := liipUser.Email
	if username == "" {
		username = "liip_" + strconv.Itoa(liipUser.ID)
	}

	phone := liipUser.PhoneNumber
	if phone == "" {
		phone = "from_liip_" + strconv.Itoa(liipUser.ID) + "_phone"
	}

	idType := liipUser.IDType
	if idType == "" {
		idType = "NID"
	}

	nid := liipUser.IDNumber
	if nid == "" {
		nid = "from_liip_" + strconv.Itoa(liipUser.ID) + "_nid"
	}

	newUser := models.User{
		FirstName:  firstName,
		LastName:   lastName,
		Email:      liipUser.Email,
		Phone:      phone,
		Avatar:     avatar,
		Role:       toJSONSlice([]string{roles.Buyer}),
		IDtype:     idType,
		NIDNumber:  nid,
		UserCode:   userCode,
		Country:    "RW",
		IsActive:   liipUser.IsActive,
		IsVerified: true,
		Username:   username,
		Password:   "",
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to create user: " + err.Error(),
		})
	}

	userRoles := []string{roles.Buyer}
	accessToken, err := auth.GenerateNewAccessToken(strconv.Itoa(int(newUser.ID)), userRoles)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	refreshToken, err := auth.GenerateNewRefreshToken(strconv.Itoa(int(newUser.ID)))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	newUser.Password = ""
	return c.JSON(fiber.Map{
		"error":         false,
		"msg":           "User created from token",
		"user":          newUser,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

// Helper function to verify SHA-256 password
func verifySHA256Password(password, hash string) bool {
	// LIIP uses pbkdf2_sha256 format: algorithm$iterations$salt$hash
	// But for simple SHA-256 comparison
	if strings.HasPrefix(hash, "pbkdf2_sha256$") {
		// For pbkdf2, we'd need the salt and iterations
		// For now, return false if it's pbkdf2 format (would need proper library)
		return false
	}

	if strings.HasPrefix(hash, "sha256$") {
		hash = strings.TrimPrefix(hash, "sha256$")
	}

	// Simple SHA-256 hash comparison
	h := sha256.New()
	h.Write([]byte(password))
	hashedPassword := hex.EncodeToString(h.Sum(nil))

	return strings.EqualFold(hashedPassword, hash)
}

// Helper to split full name into first and last
func splitFullName(fullName string) (string, string) {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

// Helper function to check if string is numeric
func isNumeric(s string) bool {
	_, err := strconv.Atoi(s)
	return err == nil
}
