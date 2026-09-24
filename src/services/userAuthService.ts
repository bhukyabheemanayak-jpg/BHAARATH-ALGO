import { PLATFORM_ACCESS_TOKEN, PLATFORM_APPLET_ID, PLATFORM_NAME, getMasterAccessToken } from './strategyStorage';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  tradingNickname: string;
  role: string;
  tier: string;
  platformAppletId: string;
  platformName: string;
  defaultBroker: string;
  autoSquareOffTime: string;
  maxDailyRiskLimit: number;
  maxCapitalAllocation: number;
  twoFactorEnabled: boolean;
  lastLoginAt: string;
  sessionActive: boolean;
}

const USER_PROFILE_STORAGE_KEY = 'bhaarath_user_profile_v1';
const AUTH_SESSION_STORAGE_KEY = 'bhaarath_auth_session_active';
const MASTER_PASSWORD_STORAGE_KEY = 'bhaarath_master_password_v1';
const RESET_OTP_STORAGE_KEY = 'bhaarath_password_reset_otp_v1';

export const DEFAULT_MASTER_PASSWORD = 'Bhaarath@2026';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'usr_bheemanayak_1a97c7',
  name: 'Bheemanayak Bhukya',
  email: 'bhukyabheemanayak@gmail.com',
  phone: '+91 98765 43210',
  tradingNickname: 'Bheema_AlgoMaster',
  role: 'Platform Owner (Personal Use)',
  tier: 'Personal Edition Pro',
  platformAppletId: PLATFORM_APPLET_ID,
  platformName: PLATFORM_NAME,
  defaultBroker: 'Zerodha Kite Connect',
  autoSquareOffTime: '15:15 IST',
  maxDailyRiskLimit: 25000,
  maxCapitalAllocation: 500000,
  twoFactorEnabled: true,
  lastLoginAt: new Date().toISOString(),
  sessionActive: true,
};

/**
 * Get current user profile from localStorage or fallback to default
 */
export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_USER_PROFILE,
        ...parsed,
        platformAppletId: PLATFORM_APPLET_ID,
        platformName: PLATFORM_NAME,
      };
    }
  } catch (err) {
    console.error('Error reading user profile:', err);
  }
  return DEFAULT_USER_PROFILE;
}

/**
 * Update user profile
 */
export function saveUserProfile(updates: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated: UserProfile = {
    ...current,
    ...updates,
    platformAppletId: PLATFORM_APPLET_ID,
    platformName: PLATFORM_NAME,
  };
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('bhaarath_profile_updated'));
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
  return updated;
}

/**
 * Check if user session is active (logged in)
 */
export function getIsAuthenticated(): boolean {
  try {
    const session = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    // If not set yet, default to logged in (true) so the user has immediate access to their personal app
    if (session === null) {
      return true;
    }
    return session === 'true';
  } catch {
    return true;
  }
}

/**
 * Log in user
 */
export function loginUser(email?: string, name?: string): UserProfile {
  try {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'true');
    const profile = getUserProfile();
    const updated = {
      ...profile,
      email: email?.trim() || profile.email,
      name: name?.trim() || profile.name,
      lastLoginAt: new Date().toISOString(),
      sessionActive: true,
    };
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('bhaarath_auth_changed'));
    window.dispatchEvent(new Event('bhaarath_profile_updated'));
    return updated;
  } catch (err) {
    console.error('Error logging in:', err);
    return getUserProfile();
  }
}

/**
 * Log out user
 */
export function logoutUser(): void {
  try {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'false');
    const profile = getUserProfile();
    const updated = {
      ...profile,
      sessionActive: false,
    };
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('bhaarath_auth_changed'));
    window.dispatchEvent(new Event('bhaarath_profile_updated'));
  } catch (err) {
    console.error('Error logging out:', err);
  }
}

/**
 * Generate standard TradingView alert JSON payload with the platform's active access token
 */
export function getPlatformAlertJsonPayload(alertName: string = 'HA 1M TEST NCC'): string {
  const token = getMasterAccessToken();
  return JSON.stringify(
    {
      access_token: token,
      alert_type: '{{strategy.order.comment}}',
      alert_name: alertName,
      strategy_id: '{{strategy.order.alert_message}}',
    },
    null,
    2
  );
}

/**
 * Retrieve current master password from storage (or fallback to default)
 */
export function getMasterPassword(): string {
  try {
    const pwd = localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY);
    if (pwd && pwd.trim().length > 0) {
      return pwd;
    }
  } catch (err) {
    console.error('Error reading master password:', err);
  }
  return DEFAULT_MASTER_PASSWORD;
}

/**
 * Validate input password against stored master password
 */
export function validateMasterPassword(enteredPassword: string): boolean {
  if (!enteredPassword) return false;
  const current = getMasterPassword();
  // Support both stored password and default fallback
  return enteredPassword.trim() === current.trim();
}

/**
 * Change master password
 */
export function changeMasterPassword(
  currentPassword: string,
  newPassword: string
): { success: boolean; message: string } {
  if (!currentPassword || !validateMasterPassword(currentPassword)) {
    return { success: false, message: 'Current password is incorrect. Please verify and try again.' };
  }
  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, message: 'New password must be at least 6 characters long.' };
  }
  if (currentPassword.trim() === newPassword.trim()) {
    return { success: false, message: 'New password cannot be the same as the current password.' };
  }

  try {
    localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, newPassword.trim());
    return { success: true, message: 'Master security password updated successfully.' };
  } catch (err) {
    return { success: false, message: 'Failed to save new password to local storage.' };
  }
}

/**
 * Generate a 6-digit OTP for Forgot Password flow
 */
export function generatePasswordResetOtp(email: string): {
  success: boolean;
  code?: string;
  message: string;
} {
  const profile = getUserProfile();
  const inputEmail = email.trim().toLowerCase();
  const profileEmail = profile.email.trim().toLowerCase();

  if (inputEmail !== profileEmail) {
    return {
      success: false,
      message: `Email does not match registered account (${profile.email}). Please enter your personal email.`,
    };
  }

  // Generate 6-digit numeric OTP code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

  try {
    localStorage.setItem(
      RESET_OTP_STORAGE_KEY,
      JSON.stringify({ code, expiresAt, email: inputEmail })
    );
    return {
      success: true,
      code,
      message: `6-digit reset code generated for ${profile.email}. Valid for 15 minutes.`,
    };
  } catch (err) {
    return { success: false, message: 'Could not generate reset code.' };
  }
}

/**
 * Verify OTP and reset master password
 */
export function resetPasswordWithOtp(
  email: string,
  code: string,
  newPassword: string
): { success: boolean; message: string } {
  const profile = getUserProfile();
  const inputEmail = email.trim().toLowerCase();
  const profileEmail = profile.email.trim().toLowerCase();

  if (inputEmail !== profileEmail) {
    return {
      success: false,
      message: 'Email address does not match your registered personal profile.',
    };
  }

  if (!code || code.trim().length !== 6) {
    return {
      success: false,
      message: 'Please enter the complete 6-digit security reset code.',
    };
  }

  try {
    const raw = localStorage.getItem(RESET_OTP_STORAGE_KEY);
    if (!raw) {
      return {
        success: false,
        message: 'No active password reset request found. Please request a new code.',
      };
    }

    const record = JSON.parse(raw);
    if (Date.now() > record.expiresAt) {
      return {
        success: false,
        message: 'Reset code has expired (15 min limit). Please request a new one.',
      };
    }

    if (record.code.trim() !== code.trim()) {
      return {
        success: false,
        message: 'Invalid security code. Please check and re-enter.',
      };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return {
        success: false,
        message: 'New password must be at least 6 characters.',
      };
    }

    // Set new password
    localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, newPassword.trim());
    localStorage.removeItem(RESET_OTP_STORAGE_KEY);

    // Auto-login user
    loginUser(profile.email, profile.name);

    return {
      success: true,
      message: 'Password reset successfully! You are now logged into your workspace.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'Error processing password reset request.',
    };
  }
}

