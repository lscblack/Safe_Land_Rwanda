package utils

import (
	"sync"
	"time"
)

// RateLimiter implements a sliding window rate limiter
type RateLimiter struct {
	mu       sync.RWMutex
	attempts map[string][]time.Time
	limit    int
	window   time.Duration
	ticker   *time.Ticker
}

// NewRateLimiter creates a new rate limiter with configurable limit and window
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		attempts: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
		ticker:   time.NewTicker(5 * time.Minute),
	}

	// Background cleanup goroutine
	go func() {
		for range rl.ticker.C {
			rl.cleanupExpired()
		}
	}()

	return rl
}

// IsAllowed checks if a request from a key is allowed, returns (allowed, remaining, retryAfter)
func (rl *RateLimiter) IsAllowed(key string) (bool, int, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	attempts := rl.attempts[key]

	var validAttempts []time.Time
	for _, attempt := range attempts {
		if attempt.After(windowStart) {
			validAttempts = append(validAttempts, attempt)
		}
	}

	if len(validAttempts) < rl.limit {
		validAttempts = append(validAttempts, now)
		rl.attempts[key] = validAttempts
		return true, rl.limit - len(validAttempts), 0
	}

	oldestAttempt := validAttempts[0]
	retryAfter := oldestAttempt.Add(rl.window).Sub(now)
	return false, 0, retryAfter
}

// Reset clears the attempts for a key
func (rl *RateLimiter) Reset(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.attempts, key)
}

// cleanupExpired removes expired entries
func (rl *RateLimiter) cleanupExpired() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	for key, attempts := range rl.attempts {
		var validAttempts []time.Time
		for _, attempt := range attempts {
			if attempt.After(windowStart) {
				validAttempts = append(validAttempts, attempt)
			}
		}

		if len(validAttempts) == 0 {
			delete(rl.attempts, key)
		} else {
			rl.attempts[key] = validAttempts
		}
	}
}

// ResendCooldown tracks cooldown periods for resending codes
type ResendCooldown struct {
	mu       sync.RWMutex
	cooldown map[string]time.Time
	duration time.Duration
}

// NewResendCooldown creates a new resend cooldown tracker
func NewResendCooldown(duration time.Duration) *ResendCooldown {
	return &ResendCooldown{
		cooldown: make(map[string]time.Time),
		duration: duration,
	}
}

// CanResend checks if a key can resend, returns (canResend, secondsUntilCanResend)
func (rc *ResendCooldown) CanResend(key string) (bool, int64) {
	rc.mu.RLock()
	defer rc.mu.RUnlock()

	lastSend, exists := rc.cooldown[key]
	if !exists {
		return true, 0
	}

	nextAllowed := lastSend.Add(rc.duration)
	now := time.Now()

	if now.After(nextAllowed) {
		return true, 0
	}

	secondsUntil := int64(nextAllowed.Sub(now).Seconds())
	return false, secondsUntil
}

// SetCooldown sets the cooldown timer for a key
func (rc *ResendCooldown) SetCooldown(key string) {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	rc.cooldown[key] = time.Now()
}

// Reset clears the cooldown for a key
func (rc *ResendCooldown) Reset(key string) {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	delete(rc.cooldown, key)
}
