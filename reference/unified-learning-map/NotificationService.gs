/**
 * NotificationService.gs
 * In-app notification system for Learning Map
 *
 * Provides bell icon notifications for teachers and students.
 * Notifications are created as side-effects of existing operations
 * (approve, revise, submit, assign) and polled from the frontend.
 *
 * @version 1.0.0
 */

// ============================================================================
// PRIVATE: CREATE NOTIFICATION
// ============================================================================

/**
 * Create a notification record (internal use only).
 * Called by hooks in ProgressService.gs and other services.
 * Always non-fatal — callers should wrap in try/catch.
 *
 * @param {string} recipientEmail - Who receives the notification
 * @param {string} type - Event type: hex_completed|approval_granted|revision_requested|submission_pending|map_assigned
 * @param {string} title - Short display title
 * @param {string} message - Detail text
 * @param {Object} [metadata] - Optional: {sourceEmail, mapId, hexId}
 */
function createNotification_(recipientEmail, type, title, message, metadata) {
  if (!recipientEmail) return;

  const meta = metadata || {};
  const email = recipientEmail.toLowerCase();

  // Dedup check: skip if identical notification created within last 60 seconds
  const recentDupes = findRowsFiltered_(SHEETS_.NOTIFICATIONS, {
    recipientEmail: email, type: type || 'info', mapId: meta.mapId || '', hexId: meta.hexId || ''
  });
  if (recentDupes.length > 0) {
    const cutoff = new Date(Date.now() - 60000).toISOString();
    for (let i = 0; i < recentDupes.length; i++) {
      if (recentDupes[i].createdAt > cutoff &&
          String(recentDupes[i].sourceEmail).toLowerCase() === (meta.sourceEmail || '').toLowerCase()) {
        return; // Duplicate within 60s — skip
      }
    }
  }

  const notification = {
    notificationId: generateId_('ntf'),
    recipientEmail: email,
    type: type || 'info',
    title: (title || '').substring(0, 200),
    message: (message || '').substring(0, 500),
    sourceEmail: (meta.sourceEmail || '').toLowerCase(),
    mapId: meta.mapId || '',
    hexId: meta.hexId || '',
    createdAt: now_(),
    readAt: '',
    status: 'active'
  };

  // appendRow_ is atomic — no lock needed for inserts
  appendRow_(SHEETS_.NOTIFICATIONS, notification);
}

// ============================================================================
// PUBLIC: GET NOTIFICATIONS
// ============================================================================

/**
 * Get notifications for the current user.
 * Returns most recent first, up to limit.
 *
 * @param {number} [limit] - Max notifications to return (default 20)
 * @returns {Object} {notifications: [...], unreadCount: number}
 */
function getNotifications(limit) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  const maxItems = limit || 20;

  // Filtered read — only constructs objects for this user's notifications
  const userNotifs = findRowsFiltered_(SHEETS_.NOTIFICATIONS, { recipientEmail: email });

  // Filter active (non-dismissed) and count unread
  const mine = [];
  let unreadCount = 0;
  for (let i = 0; i < userNotifs.length; i++) {
    const n = userNotifs[i];
    if (n.status !== 'dismissed') {
      mine.push(n);
      if (!n.readAt) {
        unreadCount++;
      }
    }
  }

  // Sort by createdAt desc
  mine.sort(function(a, b) {
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return {
    notifications: mine.slice(0, maxItems),
    unreadCount: unreadCount
  };
}

// ============================================================================
// PUBLIC: MARK AS READ
// ============================================================================

/**
 * Mark a single notification as read.
 *
 * @param {string} notificationId - The notification to mark
 * @returns {boolean} Whether the notification was found and updated
 */
function markNotificationRead(notificationId) {
  // updateRow_ uses lock internally, updates only the changed cell
  return updateRow_(SHEETS_.NOTIFICATIONS, 'notificationId', String(notificationId), { readAt: now_() });
}

// ============================================================================
// PUBLIC: MARK ALL AS READ
// ============================================================================

/**
 * Mark all notifications as read for the current user.
 *
 * @returns {number} Count of notifications marked as read
 */
function markAllNotificationsRead() {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();
  // updateRows_ uses lock internally, updates only changed cells
  // extraMatch: only update rows where readAt is empty (unread)
  return updateRows_(SHEETS_.NOTIFICATIONS, 'recipientEmail', email, { readAt: now_() }, { field: 'readAt', emptyOnly: true });
}

// ============================================================================
// PUBLIC: GET UNREAD COUNT (LIGHTWEIGHT)
// ============================================================================

/**
 * Get just the unread count for polling efficiency.
 * Lighter than getNotifications() — no sorting or slicing.
 *
 * @returns {number} Unread notification count
 */
function getUnreadNotificationCount() {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  const all = readAll_(SHEETS_.NOTIFICATIONS);
  let count = 0;
  for (let i = 0; i < all.length; i++) {
    if (String(all[i].recipientEmail || '').toLowerCase() === email &&
        !all[i].readAt && all[i].status !== 'dismissed') {
      count++;
    }
  }
  return count;
}
