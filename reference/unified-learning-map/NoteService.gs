/**
 * NoteService.gs
 * Cornell Notes / Second Brain System for Learning Map
 *
 * Students create structured Cornell Notes (cues, notes, summary) per hex.
 * Teachers view note quality metrics for coaching.
 * Notes can be starred as "Intermediate Packets", organized via PARA,
 * progressively summarized (4 layers), and exported to Google Docs for NotebookLM.
 *
 * Sheet: StudentNotes
 * Schema: noteId, studentEmail, mapId, hexId, cuesJson, notesContent, summaryContent,
 *         distilledContent, boldIndicesJson, highlightIndicesJson, tagsJson, isStarred,
 *         lastLayerApplied, wordCount, createdAt, updatedAt
 */

// ============================================================================
// CORE CRUD
// ============================================================================

/**
 * Save or update a student's Cornell Notes for a hex.
 * Student-only — uses current user's email. Must have progress on the hex.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @param {Object} noteData - { cues: string[], notes: string, summary: string }
 * @returns {Object} Saved note record
 */
function saveStudentNote(mapId, hexId, noteData) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!mapId || !hexId) throw new Error('Map ID and Hex ID are required.');
  if (!noteData) throw new Error('Note data is required.');

  // Validate cues — max 10, each max 200 chars
  let cues = [];
  if (noteData.cues && Array.isArray(noteData.cues)) {
    for (let i = 0; i < Math.min(noteData.cues.length, 10); i++) {
      const cue = String(noteData.cues[i] || '').trim();
      if (cue) {
        cues.push(cue.substring(0, 200));
      }
    }
  }

  // Validate notes content — max 5000 chars
  const notesContent = String(noteData.notes || '').substring(0, 5000);

  // Validate summary — max 1000 chars
  const summaryContent = String(noteData.summary || '').substring(0, 1000);

  // Compute word count
  const words = notesContent.trim().split(/\s+/);
  const wordCount = notesContent.trim() ? words.length : 0;

  const now = new Date().toISOString();

  // Check if note already exists (compound match)
  const existingNotes = findRowsFiltered_(SHEETS_.STUDENT_NOTES, {
    studentEmail: email, mapId: mapId, hexId: hexId
  });

  if (existingNotes.length > 0) {
    // Update existing note — cell-level updates only (avoids full-sheet rewrite)
    const updated = updateRowByCompoundMatch_(SHEETS_.STUDENT_NOTES,
      { studentEmail: email, mapId: mapId, hexId: hexId },
      {
        cuesJson: JSON.stringify(cues),
        notesContent: notesContent,
        summaryContent: summaryContent,
        wordCount: wordCount,
        updatedAt: now
      }
    );
    const existing = existingNotes[0];
    existing.cuesJson = JSON.stringify(cues);
    existing.notesContent = notesContent;
    existing.summaryContent = summaryContent;
    existing.wordCount = wordCount;
    existing.updatedAt = now;
    return existing;
  } else {
    // Create new note — atomic append, no full-sheet rewrite
    const record = {
      noteId: generateNoteId_(),
      studentEmail: email,
      mapId: String(mapId),
      hexId: String(hexId),
      cuesJson: JSON.stringify(cues),
      notesContent: notesContent,
      summaryContent: summaryContent,
      distilledContent: '',
      boldIndicesJson: '[]',
      highlightIndicesJson: '[]',
      tagsJson: '[]',
      isStarred: false,
      lastLayerApplied: 1,
      wordCount: wordCount,
      createdAt: now,
      updatedAt: now
    };
    appendRow_(SHEETS_.STUDENT_NOTES, record);
    return record;
  }
}

/**
 * Get a student's note for a specific hex.
 * Students read their own; teachers read any student in their class.
 *
 * @param {string} mapId
 * @param {string} hexId
 * @param {string} [studentEmail] - Optional, for teacher view
 * @returns {Object|null} Note object or null
 */
function getStudentNote(mapId, hexId, studentEmail) {
  const user = getCurrentUser();
  let email;

  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!user.canEdit) throw new Error('Permission denied.');
    email = studentEmail.toLowerCase();
    // Verify teacher has a class containing this student (admins bypass)
    if (!user.isAdmin) {
      const teacherClasses = findRowsFiltered_(SHEETS_.CLASSES, { teacherEmail: user.email });
      let hasAccess = false;
      for (let c = 0; c < teacherClasses.length && !hasAccess; c++) {
        const roster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { classId: String(teacherClasses[c].classId) });
        for (let r = 0; r < roster.length; r++) {
          if (String(roster[r].studentEmail || roster[r].email || '').toLowerCase() === email && roster[r].status !== 'removed') {
            hasAccess = true;
            break;
          }
        }
      }
      if (!hasAccess) throw new Error('Permission denied: student is not in your classes.');
    }
  } else {
    email = user.email.toLowerCase();
  }

  const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
  for (let i = 0; i < allNotes.length; i++) {
    if (String(allNotes[i].studentEmail).toLowerCase() === email &&
        String(allNotes[i].mapId) === String(mapId) &&
        String(allNotes[i].hexId) === String(hexId)) {
      const note = allNotes[i];
      note.cues = safeJsonParse_(note.cuesJson, []);
      note.tags = safeJsonParse_(note.tagsJson, []);
      note.boldIndices = safeJsonParse_(note.boldIndicesJson, []);
      note.highlightIndices = safeJsonParse_(note.highlightIndicesJson, []);
      return note;
    }
  }
  return null;
}

/**
 * Get all notes for a student across all maps.
 * Used by the notebook browser (PARA organization).
 *
 * @param {string} [studentEmail] - Optional, for teacher view
 * @returns {Array<Object>} Array of note objects with parsed JSON fields
 */
function getAllStudentNotes(studentEmail) {
  const user = getCurrentUser();
  let email;

  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!user.canEdit) throw new Error('Permission denied.');
    email = studentEmail.toLowerCase();
    // Verify teacher has a class containing this student (admins bypass)
    if (!user.isAdmin) {
      const teacherClasses = findRowsFiltered_(SHEETS_.CLASSES, { teacherEmail: user.email });
      let hasAccess = false;
      for (let c = 0; c < teacherClasses.length && !hasAccess; c++) {
        const roster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { classId: String(teacherClasses[c].classId) });
        for (let r = 0; r < roster.length; r++) {
          if (String(roster[r].studentEmail || roster[r].email || '').toLowerCase() === email && roster[r].status !== 'removed') {
            hasAccess = true;
            break;
          }
        }
      }
      if (!hasAccess) throw new Error('Permission denied: student is not in your classes.');
    }
  } else {
    email = user.email.toLowerCase();
  }

  const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
  const result = [];

  for (let i = 0; i < allNotes.length; i++) {
    if (String(allNotes[i].studentEmail).toLowerCase() === email) {
      const note = allNotes[i];
      note.cues = safeJsonParse_(note.cuesJson, []);
      note.tags = safeJsonParse_(note.tagsJson, []);
      note.boldIndices = safeJsonParse_(note.boldIndicesJson, []);
      note.highlightIndices = safeJsonParse_(note.highlightIndicesJson, []);
      result.push(note);
    }
  }

  // Sort by updatedAt descending
  result.sort(function(a, b) {
    return (a.updatedAt || '') > (b.updatedAt || '') ? -1 : 1;
  });

  return result;
}

/**
 * Toggle starred status on a note (for Intermediate Packets).
 * Student-only — must own the note.
 *
 * @param {string} noteId
 * @returns {Object} { success: true, isStarred: boolean }
 */
function toggleNoteStarred(noteId) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!noteId) throw new Error('Note ID is required.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
    for (let i = 0; i < allNotes.length; i++) {
      if (String(allNotes[i].noteId) === String(noteId)) {
        if (String(allNotes[i].studentEmail).toLowerCase() !== email) {
          throw new Error('Permission denied.');
        }
        const newStarred = !(allNotes[i].isStarred === true || allNotes[i].isStarred === 'true');
        allNotes[i].isStarred = newStarred;
        allNotes[i].updatedAt = new Date().toISOString();
        writeAll_(SHEETS_.STUDENT_NOTES, allNotes);
        return { success: true, isStarred: newStarred };
      }
    }
    throw new Error('Note not found.');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update tags on a note (for PARA categorization).
 * Student-only — must own the note.
 *
 * @param {string} noteId
 * @param {Array<string>} tags - Max 5 tags, each max 30 chars
 * @returns {Object} { success: true }
 */
function updateNoteTags(noteId, tags) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!noteId) throw new Error('Note ID is required.');

  // Validate tags
  let cleanTags = [];
  if (tags && Array.isArray(tags)) {
    for (let i = 0; i < Math.min(tags.length, 5); i++) {
      const tag = String(tags[i] || '').trim().substring(0, 30);
      if (tag) cleanTags.push(tag);
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
    for (let i = 0; i < allNotes.length; i++) {
      if (String(allNotes[i].noteId) === String(noteId)) {
        if (String(allNotes[i].studentEmail).toLowerCase() !== email) {
          throw new Error('Permission denied.');
        }
        allNotes[i].tagsJson = JSON.stringify(cleanTags);
        allNotes[i].updatedAt = new Date().toISOString();
        writeAll_(SHEETS_.STUDENT_NOTES, allNotes);
        return { success: true };
      }
    }
    throw new Error('Note not found.');
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// TEACHER COACHING (Story 2)
// ============================================================================

/**
 * Get note completion stats for a class + map.
 * Teacher/admin only — verifies class ownership.
 *
 * @param {string} classId
 * @param {string} mapId
 * @returns {Object} { students: [...], summary: {...}, perHexStats: {...} }
 */
function getClassNoteStats(classId, mapId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Only teachers/admins can view note stats.');
  if (!classId || !mapId) throw new Error('Class ID and Map ID are required.');

  // Verify teacher owns this class (admins bypass)
  if (!user.isAdmin) {
    const cls = findRowsFiltered_(SHEETS_.CLASSES, { classId: classId });
    if (cls.length === 0) throw new Error('Class not found.');
    if (String(cls[0].teacherEmail).toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('You do not own this class.');
    }
  }

  // Get roster for this class
  const allRoster = readAll_(SHEETS_.CLASS_ROSTER);
  const classStudents = [];
  for (let r = 0; r < allRoster.length; r++) {
    if (String(allRoster[r].classId) === String(classId) &&
        allRoster[r].status !== 'removed') {
      classStudents.push({
        email: String(allRoster[r].studentEmail || '').trim().toLowerCase(),
        name: String(allRoster[r].studentName || '')
      });
    }
  }

  // Get all notes
  const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
  const notesByStudent = {};

  for (let i = 0; i < allNotes.length; i++) {
    const note = allNotes[i];
    if (String(note.mapId) !== String(mapId)) continue;
    const noteEmail = String(note.studentEmail || '').toLowerCase();
    if (!notesByStudent[noteEmail]) notesByStudent[noteEmail] = [];
    notesByStudent[noteEmail].push(note);
  }

  // Get hex count for the map
  const allMaps = readAll_(SHEETS_.MAPS);
  let totalHexes = 0;
  for (let m = 0; m < allMaps.length; m++) {
    if (String(allMaps[m].mapId) === String(mapId)) {
      const hexes = safeJsonParse_(allMaps[m].hexesJson, []);
      totalHexes = hexes.length;
      break;
    }
  }

  // Compute per-student metrics
  const students = [];
  let totalWordCount = 0;
  let totalCueCount = 0;
  let totalNotesCount = 0;
  let totalWithSummary = 0;
  const allCues = {};
  const perHexStats = {};

  for (let s = 0; s < classStudents.length; s++) {
    const studentEmail = classStudents[s].email;
    const studentNotes = notesByStudent[studentEmail] || [];
    let studentWordCount = 0;
    let studentCueCount = 0;
    let hasSummaryCount = 0;
    let starredCount = 0;
    let lastNoteAt = '';

    for (let n = 0; n < studentNotes.length; n++) {
      const note = studentNotes[n];
      const wc = parseInt(note.wordCount, 10) || 0;
      studentWordCount += wc;
      const cues = safeJsonParse_(note.cuesJson, []);
      studentCueCount += cues.length;
      if (String(note.summaryContent || '').trim()) hasSummaryCount++;
      if (note.isStarred === true || note.isStarred === 'true') starredCount++;
      if (!lastNoteAt || (note.updatedAt || '') > lastNoteAt) {
        lastNoteAt = note.updatedAt || '';
      }

      // Track per-hex stats
      const hid = String(note.hexId);
      if (!perHexStats[hid]) perHexStats[hid] = { noteCount: 0, totalWordCount: 0 };
      perHexStats[hid].noteCount++;
      perHexStats[hid].totalWordCount += wc;

      // Track cues for cloud
      for (let c = 0; c < cues.length; c++) {
        const cueText = cues[c].toLowerCase().trim();
        if (cueText) {
          allCues[cueText] = (allCues[cueText] || 0) + 1;
        }
      }
    }

    totalWordCount += studentWordCount;
    totalCueCount += studentCueCount;
    totalNotesCount += studentNotes.length;
    totalWithSummary += hasSummaryCount;

    students.push({
      email: studentEmail,
      name: classStudents[s].name,
      noteCount: studentNotes.length,
      totalHexes: totalHexes,
      avgWordCount: studentNotes.length > 0 ? Math.round(studentWordCount / studentNotes.length) : 0,
      avgCueCount: studentNotes.length > 0 ? Math.round(studentCueCount / studentNotes.length * 10) / 10 : 0,
      hasSummaryPct: studentNotes.length > 0 ? Math.round(hasSummaryCount / studentNotes.length * 100) : 0,
      starredCount: starredCount,
      lastNoteAt: lastNoteAt
    });
  }

  // Compute per-hex avg word counts
  const hexIds = Object.keys(perHexStats);
  for (let h = 0; h < hexIds.length; h++) {
    const hs = perHexStats[hexIds[h]];
    hs.avgWordCount = hs.noteCount > 0 ? Math.round(hs.totalWordCount / hs.noteCount) : 0;
  }

  // Top cues
  const cueEntries = Object.keys(allCues).map(function(k) { return { text: k, count: allCues[k] }; });
  cueEntries.sort(function(a, b) { return b.count - a.count; });
  const topCues = cueEntries.slice(0, 10);

  // Summary
  const studentsWithNotes = students.filter(function(s) { return s.noteCount > 0; }).length;
  const summary = {
    noteTakingRate: classStudents.length > 0 ? Math.round(studentsWithNotes / classStudents.length * 100) : 0,
    avgNotesPerStudent: classStudents.length > 0 ? Math.round(totalNotesCount / classStudents.length * 10) / 10 : 0,
    avgWordCount: totalNotesCount > 0 ? Math.round(totalWordCount / totalNotesCount) : 0,
    summaryCompletionRate: totalNotesCount > 0 ? Math.round(totalWithSummary / totalNotesCount * 100) : 0,
    topCues: topCues
  };

  return { students: students, summary: summary, perHexStats: perHexStats };
}

/**
 * Get a specific student's notes for a map (teacher review).
 * Teacher/admin only — verifies class ownership via roster.
 *
 * @param {string} studentEmail
 * @param {string} mapId
 * @returns {Array<Object>} Array of note objects
 */
function getStudentNotesForMap(studentEmail, mapId) {
  const user = getCurrentUser();
  if (!user.canEdit) throw new Error('Permission denied.');
  if (!studentEmail || !mapId) throw new Error('Student email and Map ID are required.');

  const email = studentEmail.toLowerCase();

  // Verify teacher has a class containing this student (admins bypass)
  if (!user.isAdmin) {
    const teacherClasses = findRowsFiltered_(SHEETS_.CLASSES, { teacherEmail: user.email });
    let hasAccess = false;
    for (let c = 0; c < teacherClasses.length && !hasAccess; c++) {
      const roster = findRowsFiltered_(SHEETS_.CLASS_ROSTER, { classId: String(teacherClasses[c].classId) });
      for (let r = 0; r < roster.length; r++) {
        if (String(roster[r].studentEmail || roster[r].email || '').toLowerCase() === email && roster[r].status !== 'removed') {
          hasAccess = true;
          break;
        }
      }
    }
    if (!hasAccess) throw new Error('Permission denied: student not in your classes.');
  }

  const notes = findRowsFiltered_(SHEETS_.STUDENT_NOTES, { studentEmail: email, mapId: String(mapId) });
  const result = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    note.cues = safeJsonParse_(note.cuesJson, []);
    note.tags = safeJsonParse_(note.tagsJson, []);
    note.boldIndices = safeJsonParse_(note.boldIndicesJson, []);
    note.highlightIndices = safeJsonParse_(note.highlightIndicesJson, []);
    result.push(note);
  }

  return result;
}

// ============================================================================
// PROGRESSIVE SUMMARIZATION (Story 5)
// ============================================================================

/**
 * Save progressive summarization layers for a note.
 * Student-only — must own the note.
 *
 * @param {string} noteId
 * @param {Object} layers - { boldIndices: number[], highlightIndices: number[], distilled: string }
 * @returns {Object} Updated note
 */
function saveNoteLayers(noteId, layers) {
  const user = getCurrentUser();
  const email = user.email.toLowerCase();

  if (!noteId) throw new Error('Note ID is required.');
  if (!layers) throw new Error('Layer data is required.');

  // Validate bold indices — max 50 items
  let boldIndices = [];
  if (layers.boldIndices && Array.isArray(layers.boldIndices)) {
    for (let i = 0; i < Math.min(layers.boldIndices.length, 50); i++) {
      const idx = parseInt(layers.boldIndices[i], 10);
      if (!isNaN(idx) && idx >= 0) boldIndices.push(idx);
    }
  }

  // Validate highlight indices — must be subset of bold
  let highlightIndices = [];
  if (layers.highlightIndices && Array.isArray(layers.highlightIndices)) {
    const boldSet = {};
    for (let b = 0; b < boldIndices.length; b++) boldSet[boldIndices[b]] = true;
    for (let j = 0; j < layers.highlightIndices.length; j++) {
      const idx = parseInt(layers.highlightIndices[j], 10);
      if (!isNaN(idx) && boldSet[idx]) highlightIndices.push(idx);
    }
  }

  // Validate distilled content — max 500 chars
  const distilled = String(layers.distilled || '').substring(0, 500);

  // Compute last layer applied
  let lastLayer = 1;
  if (boldIndices.length > 0) lastLayer = 2;
  if (highlightIndices.length > 0) lastLayer = 3;
  if (distilled.trim()) lastLayer = 4;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
    for (let i = 0; i < allNotes.length; i++) {
      if (String(allNotes[i].noteId) === String(noteId)) {
        if (String(allNotes[i].studentEmail).toLowerCase() !== email) {
          throw new Error('Permission denied.');
        }
        allNotes[i].boldIndicesJson = JSON.stringify(boldIndices);
        allNotes[i].highlightIndicesJson = JSON.stringify(highlightIndices);
        allNotes[i].distilledContent = distilled;
        allNotes[i].lastLayerApplied = lastLayer;
        allNotes[i].updatedAt = new Date().toISOString();
        writeAll_(SHEETS_.STUDENT_NOTES, allNotes);
        return allNotes[i];
      }
    }
    throw new Error('Note not found.');
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// GOOGLE DOC EXPORT (Story 4)
// ============================================================================

/**
 * Export all notes for a map to a formatted Google Doc.
 * Student or teacher (for preview).
 *
 * @param {string} mapId
 * @param {string} [studentEmail] - Optional, for teacher export
 * @returns {string} Google Doc URL
 */
function exportNotesToDoc(mapId, studentEmail) {
  const user = getCurrentUser();
  let email;

  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!user.canEdit) throw new Error('Permission denied.');
    email = studentEmail.toLowerCase();
  } else {
    email = user.email.toLowerCase();
  }

  if (!mapId) throw new Error('Map ID is required.');

  // Get student name
  const allUsers = readAll_(SHEETS_.USERS);
  let studentName = email;
  for (let u = 0; u < allUsers.length; u++) {
    if (String(allUsers[u].email || '').toLowerCase() === email) {
      studentName = allUsers[u].displayName || allUsers[u].name || email;
      break;
    }
  }

  // Get map title
  const allMaps = readAll_(SHEETS_.MAPS);
  let mapTitle = 'Unknown Map';
  let hexes = [];
  for (let m = 0; m < allMaps.length; m++) {
    if (String(allMaps[m].mapId) === String(mapId)) {
      mapTitle = allMaps[m].title || 'Untitled Map';
      hexes = safeJsonParse_(allMaps[m].hexesJson, []);
      break;
    }
  }

  // Get notes for this map
  const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
  const mapNotes = {};
  for (let i = 0; i < allNotes.length; i++) {
    if (String(allNotes[i].studentEmail).toLowerCase() === email &&
        String(allNotes[i].mapId) === String(mapId)) {
      mapNotes[String(allNotes[i].hexId)] = allNotes[i];
    }
  }

  // Create document
  const docTitle = 'Learning Notes - ' + studentName + ' - ' + mapTitle;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();

  body.appendParagraph(docTitle).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Generated: ' + new Date().toLocaleDateString());
  body.appendParagraph('');

  // Write notes sorted by hex sequence
  let notesWritten = 0;
  for (let h = 0; h < hexes.length; h++) {
    const hex = hexes[h];
    const hid = String(hex.id);
    const note = mapNotes[hid];
    if (!note) continue;

    notesWritten++;
    body.appendParagraph(hex.label || 'Hex ' + hid).setHeading(DocumentApp.ParagraphHeading.HEADING2);

    // Cues
    const cues = safeJsonParse_(note.cuesJson, []);
    if (cues.length > 0) {
      body.appendParagraph('Key Questions (Cues):').setBold(true);
      for (let c = 0; c < cues.length; c++) {
        body.appendListItem(cues[c]);
      }
    }

    // Notes content
    if (note.notesContent) {
      body.appendParagraph('Notes:').setBold(true);
      body.appendParagraph(note.notesContent);
    }

    // Summary
    if (note.summaryContent) {
      body.appendParagraph('Summary:').setBold(true);
      body.appendParagraph(note.summaryContent);
    }

    // Distilled (if exists)
    if (note.distilledContent) {
      body.appendParagraph('Distilled Insight:').setBold(true);
      body.appendParagraph(note.distilledContent);
    }

    // Starred indicator
    if (note.isStarred === true || note.isStarred === 'true') {
      body.appendParagraph('* Starred as Intermediate Packet');
    }

    body.appendParagraph(''); // spacer
  }

  if (notesWritten === 0) {
    body.appendParagraph('No notes found for this map.');
  }

  doc.saveAndClose();
  return doc.getUrl();
}

/**
 * Export starred notes (Intermediate Packets) to Google Doc.
 *
 * @param {string} [studentEmail] - Optional, for teacher export
 * @returns {string} Google Doc URL
 */
function exportStarredNotesToDoc(studentEmail) {
  const user = getCurrentUser();
  let email;

  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!user.canEdit) throw new Error('Permission denied.');
    email = studentEmail.toLowerCase();
  } else {
    email = user.email.toLowerCase();
  }

  // Get student name
  const allUsers = readAll_(SHEETS_.USERS);
  let studentName = email;
  for (let u = 0; u < allUsers.length; u++) {
    if (String(allUsers[u].email || '').toLowerCase() === email) {
      studentName = allUsers[u].displayName || allUsers[u].name || email;
      break;
    }
  }

  // Get all starred notes
  const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
  const starred = [];
  for (let i = 0; i < allNotes.length; i++) {
    if (String(allNotes[i].studentEmail).toLowerCase() === email &&
        (allNotes[i].isStarred === true || allNotes[i].isStarred === 'true')) {
      starred.push(allNotes[i]);
    }
  }

  // Get map titles for context
  const allMaps = readAll_(SHEETS_.MAPS);
  const mapTitles = {};
  const mapHexLabels = {};
  for (let m = 0; m < allMaps.length; m++) {
    mapTitles[String(allMaps[m].mapId)] = allMaps[m].title || 'Untitled';
    const hexes = safeJsonParse_(allMaps[m].hexesJson, []);
    for (let h = 0; h < hexes.length; h++) {
      mapHexLabels[String(allMaps[m].mapId) + '_' + String(hexes[h].id)] = hexes[h].label || '';
    }
  }

  // Create document
  const docTitle = 'Intermediate Packets - ' + studentName;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();

  body.appendParagraph(docTitle).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Starred notes — your reusable building blocks');
  body.appendParagraph('Generated: ' + new Date().toLocaleDateString());
  body.appendParagraph('');

  if (starred.length === 0) {
    body.appendParagraph('No starred notes yet. Star important notes to collect them here.');
  }

  // Group by map
  const byMap = {};
  for (let s = 0; s < starred.length; s++) {
    const mid = String(starred[s].mapId);
    if (!byMap[mid]) byMap[mid] = [];
    byMap[mid].push(starred[s]);
  }

  const mapIds = Object.keys(byMap);
  for (let mi = 0; mi < mapIds.length; mi++) {
    const mid = mapIds[mi];
    body.appendParagraph(mapTitles[mid] || 'Map').setHeading(DocumentApp.ParagraphHeading.HEADING2);

    const notes = byMap[mid];
    for (let n = 0; n < notes.length; n++) {
      const note = notes[n];
      const hexLabel = mapHexLabels[mid + '_' + String(note.hexId)] || 'Hex';
      body.appendParagraph(hexLabel).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      appendNoteContentToDoc_(body, note);
    }
  }

  doc.saveAndClose();
  return doc.getUrl();
}

/**
 * Export all notes organized by PARA structure to Google Doc.
 *
 * @param {string} [studentEmail] - Optional, for teacher export
 * @returns {string} Google Doc URL
 */
function exportAllNotesToDoc(studentEmail) {
  const user = getCurrentUser();
  let email;

  if (studentEmail && studentEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!user.canEdit) throw new Error('Permission denied.');
    email = studentEmail.toLowerCase();
  } else {
    email = user.email.toLowerCase();
  }

  // Get student name
  const allUsers = readAll_(SHEETS_.USERS);
  let studentName = email;
  for (let u = 0; u < allUsers.length; u++) {
    if (String(allUsers[u].email || '').toLowerCase() === email) {
      studentName = allUsers[u].displayName || allUsers[u].name || email;
      break;
    }
  }

  // Get all student notes
  const allNotes = readAll_(SHEETS_.STUDENT_NOTES);
  const myNotes = [];
  for (let i = 0; i < allNotes.length; i++) {
    if (String(allNotes[i].studentEmail).toLowerCase() === email) {
      myNotes.push(allNotes[i]);
    }
  }

  // Get maps + progress for PARA grouping
  const allMaps = readAll_(SHEETS_.MAPS);
  const allProgress = readAll_(SHEETS_.PROGRESS);
  const mapInfo = {};
  for (let m = 0; m < allMaps.length; m++) {
    const mid = String(allMaps[m].mapId);
    const hexes = safeJsonParse_(allMaps[m].hexesJson, []);
    mapInfo[mid] = {
      title: allMaps[m].title || 'Untitled',
      courseId: allMaps[m].courseId || '',
      totalHexes: hexes.length,
      hexLabels: {},
      completedCount: 0
    };
    for (let h = 0; h < hexes.length; h++) {
      mapInfo[mid].hexLabels[String(hexes[h].id)] = hexes[h].label || '';
    }
  }

  // Count completed hexes per map for PARA classification
  for (let p = 0; p < allProgress.length; p++) {
    if (String(allProgress[p].email || '').toLowerCase() === email) {
      const mid = String(allProgress[p].mapId);
      const status = String(allProgress[p].status || '');
      if ((status === 'completed' || status === 'mastered') && mapInfo[mid]) {
        mapInfo[mid].completedCount++;
      }
    }
  }

  // Get course titles
  const allCourses = readAll_(SHEETS_.COURSES);
  const courseTitles = {};
  for (let c = 0; c < allCourses.length; c++) {
    courseTitles[String(allCourses[c].courseId)] = allCourses[c].title || 'Untitled Course';
  }

  // Group notes by map
  const notesByMap = {};
  for (let n = 0; n < myNotes.length; n++) {
    const mid = String(myNotes[n].mapId);
    if (!notesByMap[mid]) notesByMap[mid] = [];
    notesByMap[mid].push(myNotes[n]);
  }

  // Classify maps into PARA
  const projects = []; // active maps
  const archived = []; // completed maps
  const mids = Object.keys(notesByMap);
  for (let mi = 0; mi < mids.length; mi++) {
    const mid = mids[mi];
    const info = mapInfo[mid];
    if (!info) continue;
    const isComplete = info.completedCount >= info.totalHexes && info.totalHexes > 0;
    if (isComplete) {
      archived.push(mid);
    } else {
      projects.push(mid);
    }
  }

  // Create document
  const docTitle = 'My Second Brain - ' + studentName;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();

  body.appendParagraph(docTitle).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('All notes organized by PARA structure');
  body.appendParagraph('Generated: ' + new Date().toLocaleDateString());
  body.appendParagraph('');

  // Active Projects
  body.appendParagraph('Active Projects').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (projects.length === 0) {
    body.appendParagraph('No active project notes.');
  }
  for (let pi = 0; pi < projects.length; pi++) {
    const mid = projects[pi];
    const info = mapInfo[mid];
    body.appendParagraph(info.title).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    const notes = notesByMap[mid] || [];
    for (let n = 0; n < notes.length; n++) {
      const hexLabel = info.hexLabels[String(notes[n].hexId)] || 'Hex';
      body.appendParagraph(hexLabel).setBold(true);
      appendNoteContentToDoc_(body, notes[n]);
    }
  }

  // Resources (starred)
  body.appendParagraph('Resources (Starred Notes)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  let starredCount = 0;
  for (let n = 0; n < myNotes.length; n++) {
    if (myNotes[n].isStarred === true || myNotes[n].isStarred === 'true') {
      starredCount++;
      const mid = String(myNotes[n].mapId);
      const info = mapInfo[mid] || { title: 'Map', hexLabels: {} };
      const hexLabel = info.hexLabels[String(myNotes[n].hexId)] || 'Hex';
      body.appendParagraph(hexLabel + ' (' + info.title + ')').setBold(true);
      appendNoteContentToDoc_(body, myNotes[n]);
    }
  }
  if (starredCount === 0) {
    body.appendParagraph('No starred notes yet.');
  }

  // Archive
  body.appendParagraph('Archive (Completed Maps)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (archived.length === 0) {
    body.appendParagraph('No archived notes.');
  }
  for (let ai = 0; ai < archived.length; ai++) {
    const mid = archived[ai];
    const info = mapInfo[mid];
    body.appendParagraph(info.title).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    const notes = notesByMap[mid] || [];
    for (let n = 0; n < notes.length; n++) {
      const hexLabel = info.hexLabels[String(notes[n].hexId)] || 'Hex';
      body.appendParagraph(hexLabel).setBold(true);
      appendNoteContentToDoc_(body, notes[n]);
    }
  }

  doc.saveAndClose();
  return doc.getUrl();
}

/**
 * Helper: append a note's content to a Google Doc body.
 * @private
 */
function appendNoteContentToDoc_(body, note) {
  const cues = safeJsonParse_(note.cuesJson, []);
  if (cues.length > 0) {
    body.appendParagraph('Cues:').setBold(true);
    for (let c = 0; c < cues.length; c++) {
      body.appendListItem(cues[c]);
    }
  }
  if (note.notesContent) {
    body.appendParagraph('Notes:').setBold(true);
    body.appendParagraph(note.notesContent);
  }
  if (note.summaryContent) {
    body.appendParagraph('Summary:').setBold(true);
    body.appendParagraph(note.summaryContent);
  }
  if (note.distilledContent) {
    body.appendParagraph('Distilled Insight:').setBold(true);
    body.appendParagraph(note.distilledContent);
  }
  body.appendParagraph(''); // spacer
}
