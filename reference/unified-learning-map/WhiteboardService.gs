/**
 * WhiteboardService.gs
 * Whiteboard Drawing Tool for Learning Map System
 *
 * Manages whiteboard images: save to Drive folders, load for editing,
 * copy to student Drive, thumbnail management.
 *
 * Sheet: WhiteboardData
 */

const VALID_WB_STATUSES_ = ['active', 'archived'];

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Extract Google Drive folder ID from a URL or raw ID.
 * Mirrors extractSpreadsheetId_ in ScheduleImportService.gs.
 *
 * @param {string} urlOrId - Drive folder URL or raw folder ID
 * @returns {string|null} Folder ID or null
 */
function extractFolderId_(urlOrId) {
  if (!urlOrId) return null;
  const match = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  // Raw ID (20+ alphanumeric chars, no slash)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId) && urlOrId.indexOf('/') === -1) return urlOrId;
  return null;
}

/**
 * Create a PNG image file in a Drive folder from base64 data.
 *
 * @param {string} folderId - Google Drive folder ID
 * @param {string} base64Data - Raw base64 PNG data (no prefix)
 * @param {string} fileName - Name for the file
 * @returns {{ fileId: string, fileUrl: string }}
 */
function createImageInFolder_(folderId, base64Data, fileName) {
  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    fileId: file.getId(),
    fileUrl: 'https://drive.google.com/uc?id=' + file.getId()
  };
}

/**
 * Validate thumbnail data URL. Must be a small base64 PNG.
 *
 * @param {string} thumbnailDataUrl - Base64 data URL
 * @returns {string} Validated string or empty string
 */
function validateThumbnail_(thumbnailDataUrl) {
  if (!thumbnailDataUrl) return '';
  if (typeof thumbnailDataUrl !== 'string') return '';
  if (thumbnailDataUrl.indexOf('data:image/png;base64,') !== 0 &&
      thumbnailDataUrl.indexOf('data:image/jpeg;base64,') !== 0) return '';
  if (thumbnailDataUrl.length > 8000) return '';
  return thumbnailDataUrl;
}

// ============================================================================
// 1. saveWhiteboardImage
// ============================================================================

/**
 * Save a whiteboard image to a Drive folder and record in sheet.
 * Two-path access: teacher (template) or student (own drawing).
 *
 * @param {string} mapId
 * @param {string} hexId
 * @param {string} base64Data - Full base64 PNG data (with or without prefix)
 * @param {string} thumbnailDataUrl - Small thumbnail base64 for preview
 * @param {string} folderId - Drive folder URL or ID
 * @returns {Object} { whiteboardId, imageFileId, imageFileUrl, thumbnailDataUrl }
 */
function saveWhiteboardImage(mapId, hexId, base64Data, thumbnailDataUrl, folderId) {
  const user = getCurrentUser();
  if (!user || !user.email) throw new Error('Not authenticated.');

  // Determine path: teacher template or student drawing
  let studentEmail = '';
  if (user.canEdit) {
    // Teacher/admin path
    studentEmail = '';
  } else {
    // Student path — verify progress exists on this map
    const progress = findRowsFiltered_(SHEETS_.PROGRESS, { mapId: String(mapId), email: user.email });
    if (progress.length === 0) {
      throw new Error('You do not have access to this map.');
    }
    studentEmail = user.email;
  }

  // Validate inputs
  if (!mapId) throw new Error('Map ID is required.');
  if (!hexId) throw new Error('Hex ID is required.');
  if (!base64Data || typeof base64Data !== 'string') throw new Error('Image data is required.');

  const resolvedFolderId = extractFolderId_(folderId);
  if (!resolvedFolderId) throw new Error('Valid Drive folder URL or ID is required.');

  // Strip data URL prefix if present
  let rawBase64 = base64Data;
  const prefixIdx = rawBase64.indexOf(';base64,');
  if (prefixIdx !== -1) {
    rawBase64 = rawBase64.substring(prefixIdx + 8);
  }

  // Validate thumbnail
  const validThumb = validateThumbnail_(thumbnailDataUrl);

  // Generate filename
  const emailPart = studentEmail ? studentEmail.split('@')[0] : 'template';
  const timestamp = new Date().getTime();
  const fileName = 'wb-' + hexId + '-' + emailPart + '-' + timestamp + '.png';

  // Save to Drive
  const driveResult = createImageInFolder_(resolvedFolderId, rawBase64, fileName);

  const now = new Date().toISOString();

  // Check for existing entry (upsert)
  const existing = findRowsFiltered_(SHEETS_.WHITEBOARD_DATA, {
    mapId: String(mapId),
    hexId: String(hexId),
    studentEmail: studentEmail
  });

  if (existing.length > 0) {
    // Trash old Drive file (non-fatal)
    const oldFileId = existing[0].imageFileId;
    if (oldFileId) {
      try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (e) { /* ignore */ }
    }

    // Update existing row
    updateRowByCompoundMatch_(SHEETS_.WHITEBOARD_DATA,
      { mapId: String(mapId), hexId: String(hexId), studentEmail: studentEmail },
      {
        imageFileId: driveResult.fileId,
        imageFileUrl: driveResult.fileUrl,
        thumbnailDataUrl: validThumb,
        folderId: resolvedFolderId,
        status: 'active',
        updatedAt: now
      }
    );

    return {
      whiteboardId: existing[0].whiteboardId,
      imageFileId: driveResult.fileId,
      imageFileUrl: driveResult.fileUrl,
      thumbnailDataUrl: validThumb
    };
  } else {
    // Create new row
    const wbId = generateWhiteboardId_();
    appendRow_(SHEETS_.WHITEBOARD_DATA, {
      whiteboardId: wbId,
      mapId: String(mapId),
      hexId: String(hexId),
      studentEmail: studentEmail,
      imageFileId: driveResult.fileId,
      imageFileUrl: driveResult.fileUrl,
      thumbnailDataUrl: validThumb,
      folderId: resolvedFolderId,
      status: 'active',
      createdAt: now,
      updatedAt: now
    });

    return {
      whiteboardId: wbId,
      imageFileId: driveResult.fileId,
      imageFileUrl: driveResult.fileUrl,
      thumbnailDataUrl: validThumb
    };
  }
}

// ============================================================================
// 2. getWhiteboardData
// ============================================================================

/**
 * Get whiteboard data for a hex. Teacher gets all entries; student gets own + template.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @returns {{ template: Object|null, studentEntry: Object|null, allEntries: Array }}
 */
function getWhiteboardData(mapId, hexId) {
  const user = getCurrentUser();
  if (!user || !user.email) throw new Error('Not authenticated.');
  if (!mapId || !hexId) throw new Error('Map ID and Hex ID are required.');

  const allRows = findRowsFiltered_(SHEETS_.WHITEBOARD_DATA, {
    mapId: String(mapId),
    hexId: String(hexId)
  });

  // Find template (studentEmail empty)
  let template = null;
  const studentEntries = [];
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row.studentEmail || row.studentEmail === '') {
      template = {
        whiteboardId: row.whiteboardId,
        imageFileUrl: row.imageFileUrl,
        thumbnailDataUrl: row.thumbnailDataUrl,
        updatedAt: row.updatedAt
      };
    } else {
      studentEntries.push(row);
    }
  }

  if (user.canEdit) {
    // Teacher: return everything
    return {
      template: template,
      studentEntry: null,
      allEntries: allRows.map(function(r) {
        return {
          whiteboardId: r.whiteboardId,
          studentEmail: r.studentEmail,
          imageFileUrl: r.imageFileUrl,
          thumbnailDataUrl: r.thumbnailDataUrl,
          status: r.status,
          updatedAt: r.updatedAt
        };
      })
    };
  } else {
    // Student: own entry + template only
    let myEntry = null;
    for (let i = 0; i < studentEntries.length; i++) {
      if (String(studentEntries[i].studentEmail).toLowerCase() === user.email.toLowerCase()) {
        myEntry = {
          whiteboardId: studentEntries[i].whiteboardId,
          imageFileUrl: studentEntries[i].imageFileUrl,
          thumbnailDataUrl: studentEntries[i].thumbnailDataUrl,
          updatedAt: studentEntries[i].updatedAt
        };
        break;
      }
    }
    return {
      template: template,
      studentEntry: myEntry,
      allEntries: []
    };
  }
}

// ============================================================================
// 3. loadWhiteboardImage
// ============================================================================

/**
 * Load full-resolution whiteboard image from Drive as base64.
 * Teacher can load any; student can load own or template.
 *
 * @param {string} whiteboardId
 * @returns {{ base64Data: string, updatedAt: string }}
 */
function loadWhiteboardImage(whiteboardId) {
  const user = getCurrentUser();
  if (!user || !user.email) throw new Error('Not authenticated.');
  if (!whiteboardId) throw new Error('Whiteboard ID is required.');

  const rows = findRowsFiltered_(SHEETS_.WHITEBOARD_DATA, { whiteboardId: String(whiteboardId) });
  if (rows.length === 0) throw new Error('Whiteboard not found.');
  const entry = rows[0];

  // Access control: teacher can load any; student can load own or template
  if (!user.canEdit) {
    const isTemplate = !entry.studentEmail || entry.studentEmail === '';
    const isOwn = String(entry.studentEmail).toLowerCase() === user.email.toLowerCase();
    if (!isTemplate && !isOwn) {
      throw new Error('Access denied.');
    }
  }

  if (!entry.imageFileId) throw new Error('No image file found.');

  const file = DriveApp.getFileById(entry.imageFileId);
  const bytes = file.getBlob().getBytes();
  const base64 = Utilities.base64Encode(bytes);

  return {
    base64Data: 'data:image/png;base64,' + base64,
    updatedAt: entry.updatedAt || ''
  };
}

// ============================================================================
// 4. saveWhiteboardToStudentDrive
// ============================================================================

/**
 * Copy a whiteboard image to the student's own Drive (root folder).
 * Student-only — personal backup.
 *
 * @param {string} whiteboardId
 * @returns {{ copiedFileId: string, copiedFileUrl: string }}
 */
function saveWhiteboardToStudentDrive(whiteboardId) {
  const user = getCurrentUser();
  if (!user || !user.email) throw new Error('Not authenticated.');
  if (!whiteboardId) throw new Error('Whiteboard ID is required.');

  const rows = findRowsFiltered_(SHEETS_.WHITEBOARD_DATA, { whiteboardId: String(whiteboardId) });
  if (rows.length === 0) throw new Error('Whiteboard not found.');
  const entry = rows[0];

  // Must be the student's own entry
  if (String(entry.studentEmail).toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('You can only save your own drawings to your Drive.');
  }

  if (!entry.imageFileId) throw new Error('No image file found.');

  const originalFile = DriveApp.getFileById(entry.imageFileId);
  const newName = 'My Whiteboard - ' + entry.hexId + ' - ' + new Date().toLocaleDateString();
  const copy = originalFile.makeCopy(newName, DriveApp.getRootFolder());

  return {
    copiedFileId: copy.getId(),
    copiedFileUrl: 'https://drive.google.com/file/d/' + copy.getId() + '/view'
  };
}

// ============================================================================
// 5. deleteWhiteboardImage
// ============================================================================

/**
 * Delete a whiteboard image. Teacher/admin for templates; students for own.
 *
 * @param {string} whiteboardId
 * @returns {{ success: boolean }}
 */
function deleteWhiteboardImage(whiteboardId) {
  const user = getCurrentUser();
  if (!user || !user.email) throw new Error('Not authenticated.');
  if (!whiteboardId) throw new Error('Whiteboard ID is required.');

  const rows = findRowsFiltered_(SHEETS_.WHITEBOARD_DATA, { whiteboardId: String(whiteboardId) });
  if (rows.length === 0) throw new Error('Whiteboard not found.');
  const entry = rows[0];

  // Access: teacher/admin for templates, students for own
  const isTemplate = !entry.studentEmail || entry.studentEmail === '';
  if (isTemplate) {
    requireRole(['administrator', 'teacher']);
  } else {
    if (String(entry.studentEmail).toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('Access denied.');
    }
  }

  // Trash Drive file (non-fatal)
  if (entry.imageFileId) {
    try { DriveApp.getFileById(entry.imageFileId).setTrashed(true); } catch (e) { /* ignore */ }
  }

  // Delete sheet row
  deleteRows_(SHEETS_.WHITEBOARD_DATA, 'whiteboardId', String(whiteboardId));

  return { success: true };
}

// ============================================================================
// 6. getWhiteboardThumbnails
// ============================================================================

/**
 * Batch get whiteboard thumbnails for a map. Teacher-only.
 *
 * @param {string} mapId
 * @param {string[]} hexIds - Array of hex IDs to check
 * @returns {Object} { [hexId]: { templateThumbnail, studentCount, latestStudentThumbnail } }
 */
function getWhiteboardThumbnails(mapId, hexIds) {
  requireRole(['administrator', 'teacher']);
  if (!mapId) throw new Error('Map ID is required.');

  const allRows = findRowsFiltered_(SHEETS_.WHITEBOARD_DATA, { mapId: String(mapId) });
  const result = {};

  // Index by hexId
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const hid = String(row.hexId);

    if (!result[hid]) {
      result[hid] = { templateThumbnail: '', studentCount: 0, latestStudentThumbnail: '' };
    }

    if (!row.studentEmail || row.studentEmail === '') {
      result[hid].templateThumbnail = row.thumbnailDataUrl || '';
    } else {
      result[hid].studentCount++;
      // Track latest by updatedAt
      if (!result[hid]._latestAt || (row.updatedAt && row.updatedAt > result[hid]._latestAt)) {
        result[hid].latestStudentThumbnail = row.thumbnailDataUrl || '';
        result[hid]._latestAt = row.updatedAt;
      }
    }
  }

  // Clean up internal tracking field
  for (const hid in result) {
    delete result[hid]._latestAt;
  }

  return result;
}

// ============================================================================
// 7. testDriveFolderAccess
// ============================================================================

/**
 * Test if the current user can access a Drive folder.
 *
 * @param {string} folderUrl - Drive folder URL or ID
 * @returns {{ success: boolean, folderName?: string, error?: string }}
 */
function testDriveFolderAccess(folderUrl) {
  requireRole(['administrator', 'teacher']);

  const folderId = extractFolderId_(folderUrl);
  if (!folderId) {
    return { success: false, error: 'Could not extract folder ID from URL.' };
  }

  try {
    const folder = DriveApp.getFolderById(folderId);
    const name = folder.getName();
    return { success: true, folderName: name };
  } catch (e) {
    return { success: false, error: 'Cannot access folder. Check the URL and sharing permissions.' };
  }
}
