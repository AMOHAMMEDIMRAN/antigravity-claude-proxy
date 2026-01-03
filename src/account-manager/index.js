/**
 * Account Manager
 * Manages multiple Antigravity accounts with sticky selection,
 * automatic failover, and smart cooldown for rate-limited accounts.
 */

import { ACCOUNT_CONFIG_PATH } from "../constants.js";
import { loadAccounts, loadDefaultAccount, saveAccounts } from "./storage.js";
import {
  isAllRateLimited as checkAllRateLimited,
  getAvailableAccounts as getAvailable,
  getInvalidAccounts as getInvalid,
  clearExpiredLimits as clearLimits,
  resetAllRateLimits as resetLimits,
  markRateLimited as markLimited,
  markInvalid as markAccountInvalid,
  getMinWaitTimeMs as getMinWait,
} from "./rate-limits.js";
import {
  getTokenForAccount as fetchToken,
  getProjectForAccount as fetchProject,
  clearProjectCache as clearProject,
  clearTokenCache as clearToken,
} from "./credentials.js";
import {
  pickNext as selectNext,
  getCurrentStickyAccount as getSticky,
  shouldWaitForCurrentAccount as shouldWait,
  pickStickyAccount as selectSticky,
} from "./selection.js";
import { logger } from "../utils/logger.js";

export class AccountManager {
  #accounts = [];
  #currentIndex = 0;
  #configPath;
  #settings = {};
  #initialized = false;

  // Per-account caches
  #tokenCache = new Map(); // email -> { token, extractedAt }
  #projectCache = new Map(); // email -> projectId

  constructor(configPath = ACCOUNT_CONFIG_PATH) {
    this.#configPath = configPath;
  }

  /**
   * Initialize the account manager by loading config
   */
  async initialize() {
    if (this.#initialized) return;

    const { accounts, settings, activeIndex } = await loadAccounts(
      this.#configPath
    );

    this.#accounts = accounts;
    this.#settings = settings;
    this.#currentIndex = activeIndex;

    // If config exists but has no accounts, fall back to Antigravity database
    if (this.#accounts.length === 0) {
      logger.warn(
        "[AccountManager] No accounts in config. Falling back to Antigravity database"
      );
      const { accounts: defaultAccounts, tokenCache } = loadDefaultAccount();
      this.#accounts = defaultAccounts;
      this.#tokenCache = tokenCache;
    }

    // Clear any expired rate limits
    this.clearExpiredLimits();

    this.#initialized = true;
  }

  /**
   * Get the number of accounts
   * @returns {number} Number of configured accounts
   */
  getAccountCount() {
    return this.#accounts.length;
  }

  /**
   * Check if all accounts are rate-limited
   * @returns {boolean} True if all accounts are rate-limited
   */
  isAllRateLimited() {
    return checkAllRateLimited(this.#accounts);
  }

  /**
   * Get list of available (non-rate-limited, non-invalid) accounts
   * @returns {Array<Object>} Array of available account objects
   */
  getAvailableAccounts() {
    return getAvailable(this.#accounts);
  }

  /**
   * Get list of invalid accounts
   * @returns {Array<Object>} Array of invalid account objects
   */
  getInvalidAccounts() {
    return getInvalid(this.#accounts);
  }

  /**
   * Clear expired rate limits
   * @returns {number} Number of rate limits cleared
   */
  clearExpiredLimits() {
    const cleared = clearLimits(this.#accounts);
    if (cleared > 0) {
      this.saveToDisk();
    }
    return cleared;
  }

  /**
   * Add a new account
   * @param {Object} accountData - Account data (email, refreshToken, projectId, source)
   * @returns {Promise<void>}
   */
  async addAccount(accountData) {
    // Check if account already exists
    const existing = this.#accounts.find((a) => a.email === accountData.email);

    if (existing) {
      // Update existing account
      existing.refreshToken = accountData.refreshToken;
      existing.projectId = accountData.projectId;
      existing.source = accountData.source || "oauth";
      existing.addedAt = new Date().toISOString();
      existing.isInvalid = false;
      existing.invalidReason = null;
      logger.info(
        `[AccountManager] Updated existing account: ${accountData.email}`
      );
    } else {
      // Add new account
      const newAccount = {
        email: accountData.email,
        refreshToken: accountData.refreshToken,
        projectId: accountData.projectId,
        source: accountData.source || "oauth",
        addedAt: new Date().toISOString(),
        isRateLimited: false,
        rateLimitResetTime: null,
        isInvalid: false,
        invalidReason: null,
        lastUsed: null,
      };

      this.#accounts.push(newAccount);
      logger.info(`[AccountManager] Added new account: ${accountData.email}`);
    }

    await this.saveToDisk();
  }

  /**
   * Remove an account by email
   * @param {string} email - Email of account to remove
   * @returns {Promise<boolean>} True if account was removed
   */
  async removeAccount(email) {
    const initialLength = this.#accounts.length;
    this.#accounts = this.#accounts.filter((a) => a.email !== email);

    if (this.#accounts.length < initialLength) {
      // Account was removed
      logger.info(`[AccountManager] Removed account: ${email}`);

      // Adjust current index if needed
      if (this.#currentIndex >= this.#accounts.length) {
        this.#currentIndex = Math.max(0, this.#accounts.length - 1);
      }

      await this.saveToDisk();
      return true;
    }

    return false;
  }

  /**
   * Clear all rate limits to force a fresh check
   * (Optimistic retry strategy)
   * @returns {void}
   */
  resetAllRateLimits() {
    resetLimits(this.#accounts);
  }

  /**
   * Pick the next available account (fallback when current is unavailable).
   * Sets activeIndex to the selected account's index.
   * @returns {Object|null} The next available account or null if none available
   */
  pickNext() {
    const { account, newIndex } = selectNext(
      this.#accounts,
      this.#currentIndex,
      () => this.saveToDisk()
    );
    this.#currentIndex = newIndex;
    return account;
  }

  /**
   * Get the current account without advancing the index (sticky selection).
   * Used for cache continuity - sticks to the same account until rate-limited.
   * @returns {Object|null} The current account or null if unavailable/rate-limited
   */
  getCurrentStickyAccount() {
    const { account, newIndex } = getSticky(
      this.#accounts,
      this.#currentIndex,
      () => this.saveToDisk()
    );
    this.#currentIndex = newIndex;
    return account;
  }

  /**
   * Check if we should wait for the current account's rate limit to reset.
   * Used for sticky account selection - wait if rate limit is short (≤ threshold).
   * @returns {{shouldWait: boolean, waitMs: number, account: Object|null}}
   */
  shouldWaitForCurrentAccount() {
    return shouldWait(this.#accounts, this.#currentIndex);
  }

  /**
   * Pick an account with sticky selection preference.
   * Prefers the current account for cache continuity, only switches when:
   * - Current account is rate-limited for > 2 minutes
   * - Current account is invalid
   * @returns {{account: Object|null, waitMs: number}} Account to use and optional wait time
   */
  pickStickyAccount() {
    const { account, waitMs, newIndex } = selectSticky(
      this.#accounts,
      this.#currentIndex,
      () => this.saveToDisk()
    );
    this.#currentIndex = newIndex;
    return { account, waitMs };
  }

  /**
   * Mark an account as rate-limited
   * @param {string} email - Email of the account to mark
   * @param {number|null} resetMs - Time in ms until rate limit resets (optional)
   */
  markRateLimited(email, resetMs = null) {
    markLimited(this.#accounts, email, resetMs, this.#settings);
    this.saveToDisk();
  }

  /**
   * Mark an account as invalid (credentials need re-authentication)
   * @param {string} email - Email of the account to mark
   * @param {string} reason - Reason for marking as invalid
   */
  markInvalid(email, reason = "Unknown error") {
    markAccountInvalid(this.#accounts, email, reason);
    this.saveToDisk();
  }

  /**
   * Get the minimum wait time until any account becomes available
   * @returns {number} Wait time in milliseconds
   */
  getMinWaitTimeMs() {
    return getMinWait(this.#accounts);
  }

  /**
   * Get OAuth token for an account
   * @param {Object} account - Account object with email and credentials
   * @returns {Promise<string>} OAuth access token
   * @throws {Error} If token refresh fails
   */
  async getTokenForAccount(account) {
    return fetchToken(
      account,
      this.#tokenCache,
      (email, reason) => this.markInvalid(email, reason),
      () => this.saveToDisk()
    );
  }

  /**
   * Get project ID for an account
   * @param {Object} account - Account object
   * @param {string} token - OAuth access token
   * @returns {Promise<string>} Project ID
   */
  async getProjectForAccount(account, token) {
    return fetchProject(account, token, this.#projectCache);
  }

  /**
   * Clear project cache for an account (useful on auth errors)
   * @param {string|null} email - Email to clear cache for, or null to clear all
   */
  clearProjectCache(email = null) {
    clearProject(this.#projectCache, email);
  }

  /**
   * Clear token cache for an account (useful on auth errors)
   * @param {string|null} email - Email to clear cache for, or null to clear all
   */
  clearTokenCache(email = null) {
    clearToken(this.#tokenCache, email);
  }

  /**
   * Save current state to disk (async)
   * @returns {Promise<void>}
   */
  async saveToDisk() {
    await saveAccounts(
      this.#configPath,
      this.#accounts,
      this.#settings,
      this.#currentIndex
    );
  }

  /**
   * Get status object for logging/API
   * @returns {{accounts: Array, settings: Object}} Status object with accounts and settings
   */
  getStatus() {
    const available = this.getAvailableAccounts();
    const rateLimited = this.#accounts.filter((a) => a.isRateLimited);
    const invalid = this.getInvalidAccounts();

    return {
      total: this.#accounts.length,
      available: available.length,
      rateLimited: rateLimited.length,
      invalid: invalid.length,
      summary: `${this.#accounts.length} total, ${
        available.length
      } available, ${rateLimited.length} rate-limited, ${
        invalid.length
      } invalid`,
      accounts: this.#accounts.map((a) => ({
        email: a.email,
        source: a.source,
        isRateLimited: a.isRateLimited,
        rateLimitResetTime: a.rateLimitResetTime,
        isInvalid: a.isInvalid || false,
        invalidReason: a.invalidReason || null,
        lastUsed: a.lastUsed,
      })),
    };
  }

  /**
   * Get settings
   * @returns {Object} Current settings object
   */
  getSettings() {
    return { ...this.#settings };
  }

  /**
   * Get all accounts (internal use for quota fetching)
   * Returns the full account objects including credentials
   * @returns {Array<Object>} Array of account objects
   */
  getAllAccounts() {
    return this.#accounts;
  }
}

export default AccountManager;
