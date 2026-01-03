/**
 * Rate Limit Management
 *
 * Handles rate limit tracking and state management for accounts.
 */

import { DEFAULT_COOLDOWN_MS } from '../constants.js';
import { formatDuration } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/**
 * Check if all accounts are rate-limited
 *
 * @param {Array} accounts - Array of account objects
 * @returns {boolean} True if all accounts are rate-limited
 */
export function isAllRateLimited(accounts) {
    if (accounts.length === 0) return true;
    return accounts.every(acc => acc.isRateLimited);
}

/**
 * Get list of available (non-rate-limited, non-invalid) accounts
 *
 * @param {Array} accounts - Array of account objects
 * @returns {Array} Array of available account objects
 */
export function getAvailableAccounts(accounts) {
    return accounts.filter(acc => !acc.isRateLimited && !acc.isInvalid);
}

/**
 * Get list of invalid accounts
 *
 * @param {Array} accounts - Array of account objects
 * @returns {Array} Array of invalid account objects
 */
export function getInvalidAccounts(accounts) {
    return accounts.filter(acc => acc.isInvalid);
}

/**
 * Clear expired rate limits
 *
 * @param {Array} accounts - Array of account objects
 * @returns {number} Number of rate limits cleared
 */
export function clearExpiredLimits(accounts) {
    const now = Date.now();
    let cleared = 0;

    for (const account of accounts) {
        if (account.isRateLimited && account.rateLimitResetTime && account.rateLimitResetTime <= now) {
            account.isRateLimited = false;
            account.rateLimitResetTime = null;
            cleared++;
            logger.success(`[AccountManager] Rate limit expired for: ${account.email}`);
        }
    }

    return cleared;
}

/**
 * Clear all rate limits to force a fresh check (optimistic retry strategy)
 *
 * @param {Array} accounts - Array of account objects
 */
export function resetAllRateLimits(accounts) {
    for (const account of accounts) {
        account.isRateLimited = false;
        account.rateLimitResetTime = null;
    }
    logger.warn('[AccountManager] Reset all rate limits for optimistic retry');
}

/**
 * Mark an account as rate-limited
 *
 * @param {Array} accounts - Array of account objects
 * @param {string} email - Email of the account to mark
 * @param {number|null} resetMs - Time in ms until rate limit resets (optional)
 * @param {Object} settings - Settings object with cooldownDurationMs
 * @returns {boolean} True if account was found and marked
 */
export function markRateLimited(accounts, email, resetMs = null, settings = {}) {
    const account = accounts.find(a => a.email === email);
    if (!account) return false;

    account.isRateLimited = true;
    const cooldownMs = resetMs || settings.cooldownDurationMs || DEFAULT_COOLDOWN_MS;
    account.rateLimitResetTime = Date.now() + cooldownMs;

    logger.warn(
        `[AccountManager] Rate limited: ${email}. Available in ${formatDuration(cooldownMs)}`
    );

    return true;
}

/**
 * Mark an account as invalid (credentials need re-authentication)
 *
 * @param {Array} accounts - Array of account objects
 * @param {string} email - Email of the account to mark
 * @param {string} reason - Reason for marking as invalid
 * @returns {boolean} True if account was found and marked
 */
export function markInvalid(accounts, email, reason = 'Unknown error') {
    const account = accounts.find(a => a.email === email);
    if (!account) return false;

    account.isInvalid = true;
    account.invalidReason = reason;
    account.invalidAt = Date.now();

    logger.error(
        `[AccountManager] ⚠ Account INVALID: ${email}`
    );
    logger.error(
        `[AccountManager]   Reason: ${reason}`
    );
    logger.error(
        `[AccountManager]   Run 'npm run accounts' to re-authenticate this account`
    );

    return true;
}

/**
 * Get the minimum wait time until any account becomes available
 *
 * @param {Array} accounts - Array of account objects
 * @returns {number} Wait time in milliseconds
 */
export function getMinWaitTimeMs(accounts) {
    if (!isAllRateLimited(accounts)) return 0;

    const now = Date.now();
    let minWait = Infinity;
    let soonestAccount = null;

    for (const account of accounts) {
        if (account.rateLimitResetTime) {
            const wait = account.rateLimitResetTime - now;
            if (wait > 0 && wait < minWait) {
                minWait = wait;
                soonestAccount = account;
            }
        }
    }

    if (soonestAccount) {
        logger.info(`[AccountManager] Shortest wait: ${formatDuration(minWait)} (account: ${soonestAccount.email})`);
    }

    return minWait === Infinity ? DEFAULT_COOLDOWN_MS : minWait;
}
