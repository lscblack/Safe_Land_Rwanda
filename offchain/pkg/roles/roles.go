package roles

// Role constants
const (
	SuperAdmin = "superAdmin"
	NLA        = "nla"
	Admin      = "admin"
	Manager    = "manager"
	Agent      = "agent"
	Notary     = "notary"
	Blocker    = "blocker"
	Paterns    = "paterns"
	Buyer      = "buyer"
)

// RoleHierarchy defines role priority (higher = more powerful)
var RoleHierarchy = map[string]int{
	SuperAdmin: 9,
	NLA:        8,
	Admin:      7,
	Manager:    6,
	Agent:      5,
	Notary:     4,
	Blocker:    3,
	Paterns:    2,
	Buyer:      1,
}

// AllRoles list of all valid roles
var AllRoles = []string{
	SuperAdmin,
	NLA,
	Admin,
	Manager,
	Agent,
	Notary,
	Blocker,
	Paterns,
	Buyer,
}

// GetRoleLevel returns the hierarchy level of a role
func GetRoleLevel(role string) int {
	if level, exists := RoleHierarchy[role]; exists {
		return level
	}
	return 0
}

// CanAssignRole checks if a user with sourceRole can assign targetRole
// Rules:
// - superAdmin and nla can assign any role
// - other users can only assign roles below their level
// - cannot assign a role equal to or higher than their own
func CanAssignRole(sourceRole, targetRole string) bool {
	// superAdmin and nla can assign any role
	if sourceRole == SuperAdmin || sourceRole == NLA {
		return true
	}

	sourceLevel := GetRoleLevel(sourceRole)
	targetLevel := GetRoleLevel(targetRole)

	// Can only assign roles below their level
	return sourceLevel > targetLevel
}

// IsValidRole checks if a role is valid
func IsValidRole(role string) bool {
	_, exists := RoleHierarchy[role]
	return exists
}

// GetHighestRole returns the highest role from a list of roles
func GetHighestRole(userRoles []string) string {
	if len(userRoles) == 0 {
		return ""
	}

	highest := userRoles[0]
	highestLevel := GetRoleLevel(highest)

	for _, role := range userRoles[1:] {
		level := GetRoleLevel(role)
		if level > highestLevel {
			highest = role
			highestLevel = level
		}
	}

	return highest
}
