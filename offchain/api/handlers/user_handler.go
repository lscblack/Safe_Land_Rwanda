package handlers

import (
	"encoding/json"
	"safeland/offchain/data/database"
	"safeland/offchain/data/models"
	"safeland/offchain/pkg/auth"
	"safeland/offchain/pkg/roles"
	"safeland/offchain/pkg/utils"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"
)

type RegisterRequest struct {
	FirstName  string `json:"first_name"`
	MiddleName string `json:"middle_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	Avatar     string `json:"avatar"`
	NIDNumber  string `json:"n_id_number"`
	IDtype     string `json:"id_type"`
	Phone      string `json:"phone"`
	Username   string `json:"username"`
	Country    string `json:"country"`
	Password   string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type CreateAdminRequest struct {
	UserID uint     `json:"user_id"`
	Roles  []string `json:"roles"`
}

type UpdateUserRoleRequest struct {
	UserID uint     `json:"user_id"`
	Roles  []string `json:"roles"`
}

// Register user
// @Description Register a new user
// @Summary Register a new user
// @Tags User
// @Accept json
// @Produce json
// @Param user body RegisterRequest true "User"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/user/register [post]
func Register(c *fiber.Ctx) error {
	// Create a new user
	req := new(RegisterRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	user := models.User{
		FirstName:  req.FirstName,
		MiddleName: req.MiddleName,
		LastName:   req.LastName,
		Email:      req.Email,
		Avatar:     req.Avatar,
		Role:       toJSONSlice([]string{roles.Buyer}),
		NIDNumber:  req.NIDNumber,
		IDtype:     req.IDtype,
		Phone:      req.Phone,
		Username:   req.Username,
		Country:    req.Country,
		IsActive:   true,
		Password:   string(hashedPassword),
	}

	// Generate user code automatically
	userCode, err := utils.GenerateUserCode(roles.Buyer, req.Country)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to generate user code: " + err.Error(),
		})
	}
	user.UserCode = userCode

	// Create user
	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	user.Password = ""
	return c.JSON(fiber.Map{
		"error": false,
		"msg":   "User created successfully",
		"user":  user,
	})
}

// Login user
// @Description Login a user
// @Summary Login a user
// @Tags User
// @Accept json
// @Produce json
// @Param user body LoginRequest true "User"
// @Success 200 {object} object
// @Security BearerAuth
// @Router /api/user/login [post]
func Login(c *fiber.Ctx) error {
	// Parse request
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	if req.Username == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   "username is required",
		})
	}

	// Find user by username, email, phone, or NID
	var foundUser models.User
	if err := database.DB.Where(
		"username = ? OR email = ? OR phone = ? OR n_id_number = ?",
		req.Username,
		req.Username,
		req.Username,
		req.Username,
	).First(&foundUser).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": true,
			"msg":   "User not found",
		})
	}

	// Compare password
	if err := bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Invalid password",
		})
	}

	// Generate tokens
	userRoles := fromJSONSlice(foundUser.Role)
	accessToken, err := auth.GenerateNewAccessToken(strconv.Itoa(int(foundUser.ID)), userRoles)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	refreshToken, err := auth.GenerateNewRefreshToken(strconv.Itoa(int(foundUser.ID)))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	// Remove password from response
	foundUser.Password = ""

	return c.JSON(fiber.Map{
		"error":         false,
		"msg":           "Login successful",
		"user":          foundUser,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

// Create admin
// @Description Create a new admin (only superAdmin can access)
// @Summary Create admin
// @Tags Admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param user body CreateAdminRequest true "Admin"
// @Success 200 {object} object
// @Router /api/admin/create [post]
func CreateAdmin(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := strconv.ParseUint(userIDStr, 10, 32)

	var currentUser models.User
	if err := database.DB.First(&currentUser, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Unauthorized",
		})
	}

	// Only superAdmin can create admins
	currentRoles := fromJSONSlice(currentUser.Role)
	if !contains(currentRoles, roles.SuperAdmin) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": true,
			"msg":   "Only superAdmin can create admins",
		})
	}

	req := new(CreateAdminRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	// Validate roles
	for _, role := range req.Roles {
		if !roles.IsValidRole(role) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": true,
				"msg":   "Invalid role: " + role,
			})
		}
	}

	var user models.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": true,
			"msg":   "User not found",
		})
	}

	user.Role = toJSONSlice(req.Roles)
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	user.Password = ""
	return c.JSON(fiber.Map{
		"error": false,
		"msg":   "Admin created successfully",
		"user":  user,
	})
}

// Update user role
// @Description Update user role (role hierarchy enforcement)
// @Summary Update user role
// @Tags User
// @Accept json
// @Produce json
// @Security Bearer
// @Param user body UpdateUserRoleRequest true "User"
// @Success 200 {object} object
// @Router /api/user/role [put]
func UpdateUserRole(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := strconv.ParseUint(userIDStr, 10, 32)

	var currentUser models.User
	if err := database.DB.First(&currentUser, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": true,
			"msg":   "Unauthorized",
		})
	}

	// Check if user has permission to manage roles
	userRoles := fromJSONSlice(currentUser.Role)
	highestRole := roles.GetHighestRole(userRoles)
	canManageRoles := highestRole == roles.SuperAdmin || highestRole == roles.NLA || highestRole == roles.Admin || highestRole == roles.Manager

	if !canManageRoles {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": true,
			"msg":   "You don't have permission to manage roles",
		})
	}

	req := new(UpdateUserRoleRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	var targetUser models.User
	if err := database.DB.First(&targetUser, req.UserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": true,
			"msg":   "User not found",
		})
	}

	// Validate roles and check hierarchy permissions
	for _, newRole := range req.Roles {
		if !roles.IsValidRole(newRole) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": true,
				"msg":   "Invalid role: " + newRole,
			})
		}

		// Check if current user can assign this role
		if !roles.CanAssignRole(highestRole, newRole) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": true,
				"msg":   "You cannot assign role: " + newRole,
			})
		}
	}

	targetUser.Role = toJSONSlice(req.Roles)

	// Generate new user code based on highest role
	highestNewRole := roles.GetHighestRole(req.Roles)
	newUserCode, err := utils.GenerateUserCode(highestNewRole, targetUser.Country)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   "Failed to generate user code: " + err.Error(),
		})
	}
	targetUser.UserCode = newUserCode

	if err := database.DB.Save(&targetUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": true,
			"msg":   err.Error(),
		})
	}

	targetUser.Password = ""
	return c.JSON(fiber.Map{
		"error": false,
		"msg":   "User role updated successfully",
		"user":  targetUser,
	})
}

// Helper function to check if slice contains a string
func contains(slice []string, item string) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}

// Helper function to convert []string to datatypes.JSON
func toJSONSlice(roles []string) datatypes.JSON {
	data, _ := json.Marshal(roles)
	return datatypes.JSON(data)
}

// Helper function to convert datatypes.JSON to []string
func fromJSONSlice(data datatypes.JSON) []string {
	var roles []string
	json.Unmarshal([]byte(data), &roles)
	return roles
}
