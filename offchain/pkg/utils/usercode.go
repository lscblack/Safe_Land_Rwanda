package utils

import (
	"database/sql"
	"fmt"
	"safeland/offchain/data/database"
)

// RolePrefixes maps roles to their user code prefixes
var RolePrefixes = map[string]string{
	"superAdmin": "SPA",
	"nla":        "NLA",
	"admin":      "ADM",
	"manager":    "MGR",
	"agent":      "AGT",
	"notary":     "NOT",
	"blocker":    "BLK",
	"paterns":    "PAT",
	"buyer":      "BUY",
}

// GenerateUserCode generates a unique user code based on role and country
// Format: ROLEPREFIX + NUMBER + COUNTRYCODE
// Example: BLK001RW for Blocker in Rwanda
func GenerateUserCode(role, country string) (string, error) {
	prefix, exists := RolePrefixes[role]
	if !exists {
		prefix = "USR"
	}

	if country == "" {
		country = "RW"
	}

	countryCode := country
	if len(country) > 2 {
		countryCode = country[:2]
	}

	var maxNumber int
	query := `
		SELECT COALESCE(MAX(
			CAST(
				SUBSTRING(user_code FROM LENGTH(?) + 1 FOR LENGTH(user_code) - LENGTH(?) - 2)
				AS INTEGER
			)
		), 0) as max_num
		FROM users
		WHERE user_code LIKE ? || '%' || ?
	`

	result := database.DB.Raw(query, prefix, prefix, prefix, countryCode).Scan(&maxNumber)

	if result.Error != nil && result.Error != sql.ErrNoRows {
		return "", result.Error
	}

	nextNumber := maxNumber + 1

	// Use minimum 3 digits, but allow more as numbers increase
	// 1-999: 3 digits (001-999)
	// 1000+: 4+ digits (1000, 10000, etc.)
	var userCode string
	if nextNumber < 1000 {
		userCode = fmt.Sprintf("%s%03d%s", prefix, nextNumber, countryCode)
	} else {
		userCode = fmt.Sprintf("%s%d%s", prefix, nextNumber, countryCode)
	}

	return userCode, nil
}
