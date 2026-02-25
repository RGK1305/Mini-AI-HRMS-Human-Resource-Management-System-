/**
 * Password validation helper
 * Enforces:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function validatePassword(password) {
    if (!password || password.length < 8) {
        return {
            isValid: false,
            message: 'Password must be at least 8 characters long.'
        };
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpper || !hasLower || !hasNum || !hasSpecial) {
        return {
            isValid: false,
            message: 'Password must include uppercase, lowercase, a number, and a special character.'
        };
    }

    return { isValid: true };
}

module.exports = { validatePassword };
