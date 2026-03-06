// ============================================================================
// TOUR SERVICE
// Guided tour / onboarding system. Per-user preference storage,
// tour status tracking, and admin feature flag.
// ============================================================================

const TOUR_VERSION = 1; // Increment when tour content changes

// ================================================
// PUBLIC FUNCTIONS
// ================================================

/**
 * Get tour status for the current user.
 * Called from getInitialData() — no extra RPC needed.
 *
 * @returns {Object} { shouldShowTour, currentTourVersion, completedVersion, lastStep, dismissed, globalEnabled }
 */
function getTourStatus() {
  const user = getCurrentUser();
  const globalEnabled = getConfigValue('enableGuidedTour') !== 'false';
  const prefs = getUserPreferences_(user.email);

  const completedVersion = prefs.tourCompletedVersion || 0;
  const dismissed = !!prefs.tourDismissed;
  const lastStep = prefs.tourLastStep || 0;

  return {
    shouldShowTour: globalEnabled && !dismissed && completedVersion < TOUR_VERSION,
    currentTourVersion: TOUR_VERSION,
    completedVersion: completedVersion,
    lastStep: lastStep,
    dismissed: dismissed,
    globalEnabled: globalEnabled,
    onboardingChecklist: prefs.onboardingChecklist || null,
    welcomeScreenSeen: !!prefs.welcomeScreenSeen
  };
}

/**
 * Save tour progress (step reached, or completion).
 *
 * @param {number} stepIndex - Last step reached (0-based)
 * @param {boolean} completed - Whether tour was completed
 * @returns {Object} { success: true }
 */
function saveTourProgress(stepIndex, completed) {
  const user = getCurrentUser();
  const prefs = getUserPreferences_(user.email);

  prefs.tourLastStep = stepIndex;
  if (completed) {
    prefs.tourCompletedVersion = TOUR_VERSION;
    prefs.tourDismissed = false;
  }

  saveUserPreferences_(user.email, prefs);
  return { success: true };
}

/**
 * Dismiss tour (user clicks Skip).
 *
 * @returns {Object} { success: true }
 */
function dismissTour() {
  const user = getCurrentUser();
  const prefs = getUserPreferences_(user.email);
  prefs.tourDismissed = true;
  saveUserPreferences_(user.email, prefs);
  return { success: true };
}

/**
 * Reset tour so it replays for the current user.
 * Called from "Replay Tour" button in guide tabs.
 *
 * @returns {Object} { success: true }
 */
function resetTour() {
  const user = getCurrentUser();
  const prefs = getUserPreferences_(user.email);
  prefs.tourDismissed = false;
  prefs.tourCompletedVersion = 0;
  prefs.tourLastStep = 0;
  saveUserPreferences_(user.email, prefs);
  return { success: true };
}

/**
 * Save onboarding checklist progress.
 * Reuses UserPreferences storage alongside tour prefs.
 *
 * @param {Object} checklistData - { tourDone, mapOpened, hexClicked, plannerVisited, badgeEarned, completed, dismissedAt }
 * @returns {Object} { success: true }
 */
function saveOnboardingProgress(checklistData) {
  const user = getCurrentUser();
  const prefs = getUserPreferences_(user.email);
  prefs.onboardingChecklist = checklistData;
  prefs.welcomeScreenSeen = true;
  saveUserPreferences_(user.email, prefs);
  return { success: true };
}

// ================================================
// PRIVATE: UserPreferences Read/Write
// ================================================

/**
 * Get preferences object for a user.
 * Returns empty object if user has no preferences yet.
 *
 * @param {string} email - User email
 * @returns {Object} Parsed preferences object
 * @private
 */
function getUserPreferences_(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS_.USER_PREFERENCES);
  if (!sheet || sheet.getLastRow() < 2) return {};

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf('email');
  const jsonCol = headers.indexOf('preferencesJson');
  if (emailCol < 0 || jsonCol < 0) return {};

  const emailLower = email.toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emailCol] || '').toLowerCase() === emailLower) {
      return safeJsonParse_(data[i][jsonCol], {});
    }
  }
  return {};
}

/**
 * Save preferences object for a user (upsert).
 * Follows ATLService manual upsert pattern:
 * lock → read → find by email → update in-place or appendRow.
 *
 * @param {string} email - User email
 * @param {Object} prefsObj - Preferences object to save
 * @private
 */
function saveUserPreferences_(email, prefsObj) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS_.USER_PREFERENCES);
    if (!sheet) {
      throw new Error('UserPreferences sheet not found. Please run setup.');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf('email');
    const jsonCol = headers.indexOf('preferencesJson');
    const updatedAtCol = headers.indexOf('updatedAt');
    const now = new Date().toISOString();
    const jsonStr = safeJsonStringify_(prefsObj, '{}');
    const emailLower = email.toLowerCase();

    // Find existing row
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol] || '').toLowerCase() === emailLower) {
        // Update in-place (single row, specific cells)
        sheet.getRange(i + 1, jsonCol + 1).setValue(jsonStr);
        sheet.getRange(i + 1, updatedAtCol + 1).setValue(now);
        return;
      }
    }

    // Not found: insert new row
    const newRow = [];
    for (let h = 0; h < headers.length; h++) {
      switch (headers[h]) {
        case 'email': newRow.push(email); break;
        case 'preferencesJson': newRow.push(jsonStr); break;
        case 'updatedAt': newRow.push(now); break;
        default: newRow.push(''); break;
      }
    }
    sheet.appendRow(newRow);
  } finally {
    lock.releaseLock();
  }
}
