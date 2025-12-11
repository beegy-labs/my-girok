package utils

import (
	"crypto/rand"
	"errors"
	"time"
)

// Base62 character set (URL-safe: 0-9, A-Z, a-z)
// Ordered for lexicographic sorting: numbers first, then uppercase, then lowercase
const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

// Epoch timestamp (2025-01-01 00:00:00 UTC)
var epochMS = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC).UnixMilli()

// Maximum retry attempts for collision avoidance
const maxRetryAttempts = 3

// Base62Encode encodes a number to Base62 string
func Base62Encode(num int64) string {
	if num == 0 {
		return string(base62Chars[0])
	}

	result := ""
	n := num

	for n > 0 {
		result = string(base62Chars[n%62]) + result
		n = n / 62
	}

	return result
}

// Base62Decode decodes a Base62 string to number
func Base62Decode(str string) (int64, error) {
	var result int64 = 0

	for i := 0; i < len(str); i++ {
		char := str[i]
		value := -1

		for j := 0; j < len(base62Chars); j++ {
			if base62Chars[j] == char {
				value = j
				break
			}
		}

		if value == -1 {
			return 0, errors.New("invalid Base62 character: " + string(char))
		}

		result = result*62 + int64(value)
	}

	return result, nil
}

// GenerateRandomBase62 generates a random Base62 string of given length
func GenerateRandomBase62(length int) (string, error) {
	bytes := make([]byte, length)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}

	result := make([]byte, length)
	for i, b := range bytes {
		result[i] = base62Chars[int(b)%62]
	}

	return string(result), nil
}

// PadLeft pads string with given character to reach target length
func padLeft(s string, padChar byte, length int) string {
	for len(s) < length {
		s = string(padChar) + s
	}
	return s
}

// GenerateExternalID generates a time-based external ID with random suffix
// Format: [8-char timestamp] + [2-char random] = 10 characters
//
// Structure:
// - First 8 characters: Base62-encoded milliseconds since epoch (2025-01-01 UTC)
// - Last 2 characters: Random Base62 characters for collision avoidance
//
// Features:
// - Sortable by creation time (chronological order)
// - URL-safe (no special characters)
// - Collision-resistant (3,844 combinations per millisecond)
// - Compact (10 characters)
func GenerateExternalID() (string, error) {
	now := time.Now().UnixMilli()
	timeSinceEpoch := now - epochMS

	// Encode time part as 8-character Base62 string
	timePart := padLeft(Base62Encode(timeSinceEpoch), '0', 8)

	// Generate 2-character random suffix for collision avoidance
	randomPart, err := GenerateRandomBase62(2)
	if err != nil {
		return "", err
	}

	return timePart + randomPart, nil
}

// CheckUniqueness is a function type for checking if an ID already exists
type CheckUniqueness func(id string) (bool, error)

// GenerateUniqueExternalID generates an external ID with collision checking
// Retries up to maxRetryAttempts times if collision is detected
func GenerateUniqueExternalID(checkUniqueness CheckUniqueness) (string, error) {
	for attempt := 1; attempt <= maxRetryAttempts; attempt++ {
		externalID, err := GenerateExternalID()
		if err != nil {
			return "", err
		}

		isUnique, err := checkUniqueness(externalID)
		if err != nil {
			return "", err
		}

		if isUnique {
			return externalID, nil
		}

		// Collision detected (rare event)
	}

	return "", errors.New("failed to generate unique external ID after maximum attempts")
}

// ExtractTimestampFromExternalID extracts creation timestamp from external ID
func ExtractTimestampFromExternalID(externalID string) (time.Time, error) {
	if len(externalID) != 10 {
		return time.Time{}, errors.New("invalid external ID format")
	}

	timePart := externalID[:8]
	timeSinceEpoch, err := Base62Decode(timePart)
	if err != nil {
		return time.Time{}, err
	}

	return time.UnixMilli(epochMS + timeSinceEpoch), nil
}

// IsValidExternalID validates external ID format
func IsValidExternalID(externalID string) bool {
	if len(externalID) != 10 {
		return false
	}

	for i := 0; i < len(externalID); i++ {
		valid := false
		for j := 0; j < len(base62Chars); j++ {
			if base62Chars[j] == externalID[i] {
				valid = true
				break
			}
		}
		if !valid {
			return false
		}
	}

	return true
}
