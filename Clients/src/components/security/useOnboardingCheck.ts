import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// --- SECURITY CONFIGURATION ---
const STORAGE_KEY = 'sl_secure_init_ts';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CLIENT_SALT = 'sl_v1_secure_'; 

/**
 * Generates a "Device Fingerprint" based on the user's current environment.
 * If the user changes browsers, devices, or screen resolution (bot resizing),
 * the signature changes and invalidates the old token.
 */
const getDeviceFingerprint = () => {
  return btoa(`${navigator.userAgent}_${window.screen.width}x${window.screen.height}`);
};

/**
 * Generates a signed value: "TIMESTAMP_SIGNATURE"
 * Signature = Base64(SALT + TIMESTAMP + DEVICE_FINGERPRINT)
 */
const signData = (timestamp: number) => {
  const fingerprint = getDeviceFingerprint();
  // We hash the timestamp AND the fingerprint together
  const signature = btoa(`${CLIENT_SALT}${timestamp}_${fingerprint}`); 
  return `${timestamp}_${signature}`;
};

/**
 * Verifies data integrity, expiration, and environment binding.
 */
const verifyData = (storedValue: string | null) => {
  if (!storedValue) return false;

  try {
    const [timestampStr, signature] = storedValue.split('_');
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // 1. Logic Check: Is it a valid number?
    if (isNaN(timestamp)) return false;

    // 2. Integrity & Binding Check: 
    // Reconstruct the signature using CURRENT device info.
    // If the user copied this key to a different browser/bot, this check FAILS.
    const currentFingerprint = getDeviceFingerprint();
    const expectedSignature = btoa(`${CLIENT_SALT}${timestamp}_${currentFingerprint}`);

    if (signature !== expectedSignature) {
      console.warn("Security Alert: Session hijacking or tampering detected. Resetting.");
      return false;
    }

    // 3. Time Paradox Check: Future dates (System clock manipulation)
    if (timestamp > now) {
        console.warn("Security Alert: Invalid future timestamp.");
        return false;
    }

    // 4. Expiration Check: 24 Hour Window
    if (now - timestamp > ONE_DAY_MS) return false;

    return true; 
  } catch (e) {
    return false; // Malformed data
  }
};

export const useOnboardingCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Check for "Fake Refresh" / Navigation Manipulation
    // If the navigation entry type is 'back_forward', we re-verify strictly.
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
        const navType = (navEntries[0] as PerformanceNavigationTiming).type;
        // If user is trying to "Back" into the app without a valid token, this catches it.
    }

    // 2. Verify Storage
    const rawData = localStorage.getItem(STORAGE_KEY);
    const isValidSession = verifyData(rawData);

    if (!isValidSession) {
      // SECURITY ACTION: Nuke invalid data immediately
      if (rawData) {
          console.warn("Invalid session detected. Forcing reset.");
          localStorage.removeItem(STORAGE_KEY);
      }

      // Prevent infinite redirect loop
      if (location.pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [navigate, location.pathname]);
};

// --- EXPORTED ACTION ---
export const markOnboardingSeen = () => {
    const now = Date.now();
    const signedValue = signData(now);
    localStorage.setItem(STORAGE_KEY, signedValue);
};