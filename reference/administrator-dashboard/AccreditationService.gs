/**
 * AccreditationService.gs — Business logic for Accreditation module
 *
 * Manages accreditation frameworks, standards, evidence, and narratives.
 * Includes Google Drive integration for document export and evidence binder.
 * Admin-only module.
 *
 * Uses: DataService, AuthService, Utils
 */

var AccreditationService = (function() {

  // ── Private Helpers ──

  function staffMap_() {
    var allStaff = DataService.getRecords('staff');
    var map = {};
    allStaff.forEach(function(s) { map[s.id] = s; });
    return map;
  }

  function staffName_(map, id) {
    var s = map[id];
    return s ? s.first_name + ' ' + s.last_name : 'Unknown';
  }

  /**
   * Computes readiness for a single standard.
   * @param {string} standardId
   * @param {Object} evidenceByStd - { standardId: [evidence] }
   * @param {Object} narrativesByStd - { standardId: [narrative] }
   * @returns {'green'|'amber'|'red'}
   */
  function computeStandardReadiness_(standardId, evidenceByStd, narrativesByStd) {
    var evidence = evidenceByStd[standardId] || [];
    var narratives = narrativesByStd[standardId] || [];

    var hasApprovedEvidence = evidence.filter(function(e) { return e.status === 'approved'; }).length > 0;
    var hasFinalNarrative = narratives.filter(function(n) { return n.status === 'final'; }).length > 0;

    if (hasApprovedEvidence && hasFinalNarrative) return 'green';
    if (evidence.length > 0 || narratives.length > 0) return 'amber';
    return 'red';
  }

  /**
   * Extracts Google Drive file ID from various URL formats.
   * @param {string} url
   * @returns {string} file ID or empty string
   */
  function extractDriveFileId_(url) {
    if (!url) return '';
    // Match patterns: /file/d/ID, /document/d/ID, /spreadsheets/d/ID, /presentation/d/ID
    var match = url.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    // Fallback: ?id=ID
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return '';
  }

  // ── Valid Enum Values ──
  var FRAMEWORK_STATUSES = ['preparing', 'self_study', 'visit_scheduled', 'completed'];
  var EVIDENCE_STATUSES = ['draft', 'under_review', 'approved', 'insufficient'];
  var EVIDENCE_FILE_TYPES = ['doc', 'pdf', 'sheet', 'image', 'video', 'link'];
  var NARRATIVE_STATUSES = ['draft', 'review', 'final'];

  // ── Public API ──

  /**
   * Admin overview: all frameworks with stats.
   * @param {Object} [filters] - { status? }
   * @returns {{ frameworks: Object[], stats: Object }}
   */
  function getOverview(filters) {
    AuthService.requireAdmin();
    filters = filters || {};

    var frameworks = DataService.query('accreditation_frameworks', {
      sort: { field: 'created_at', direction: 'desc' }
    }).data;

    // Pre-fetch all related data
    var allStandards = DataService.getRecords('accreditation_standards');
    var allEvidence = DataService.getRecords('accreditation_evidence');
    var allNarratives = DataService.getRecords('accreditation_narratives');

    // Group standards by framework_id
    var standardsByFw = {};
    allStandards.forEach(function(s) {
      if (!standardsByFw[s.framework_id]) standardsByFw[s.framework_id] = [];
      standardsByFw[s.framework_id].push(s);
    });

    // Group evidence by standard_id
    var evidenceByStd = {};
    allEvidence.forEach(function(e) {
      if (!evidenceByStd[e.standard_id]) evidenceByStd[e.standard_id] = [];
      evidenceByStd[e.standard_id].push(e);
    });

    // Group narratives by standard_id
    var narrativesByStd = {};
    allNarratives.forEach(function(n) {
      if (!narrativesByStd[n.standard_id]) narrativesByStd[n.standard_id] = [];
      narrativesByStd[n.standard_id].push(n);
    });

    var totalStats = { frameworks: 0, standards: 0, evidence: 0, averageProgress: 0 };
    var progressSum = 0;

    var enriched = frameworks.map(function(fw) {
      if (filters.status && fw.status !== filters.status) return null;

      var standards = standardsByFw[fw.id] || [];
      var domains = {};
      standards.forEach(function(s) {
        if (!domains[s.domain]) domains[s.domain] = [];
        domains[s.domain].push(s);
      });

      var evidenceCount = 0;
      var approvedEvCount = 0;
      var greenCount = 0;
      var amberCount = 0;
      var redCount = 0;

      standards.forEach(function(s) {
        var ev = evidenceByStd[s.id] || [];
        evidenceCount += ev.length;
        approvedEvCount += ev.filter(function(e) { return e.status === 'approved'; }).length;

        var readiness = computeStandardReadiness_(s.id, evidenceByStd, narrativesByStd);
        if (readiness === 'green') greenCount++;
        else if (readiness === 'amber') amberCount++;
        else redCount++;
      });

      var progress = standards.length > 0 ? Math.round((greenCount / standards.length) * 100) : 0;

      totalStats.frameworks++;
      totalStats.standards += standards.length;
      totalStats.evidence += evidenceCount;
      progressSum += progress;

      return {
        id: fw.id,
        name: fw.name,
        description: fw.description || '',
        visitDate: fw.visit_date || '',
        status: fw.status,
        standardCount: standards.length,
        domainCount: Object.keys(domains).length,
        evidenceCount: evidenceCount,
        approvedEvidenceCount: approvedEvCount,
        greenCount: greenCount,
        amberCount: amberCount,
        redCount: redCount,
        progress: progress,
        createdAt: fw.created_at
      };
    }).filter(Boolean);

    totalStats.averageProgress = enriched.length > 0 ? Math.round(progressSum / enriched.length) : 0;

    return {
      frameworks: enriched,
      stats: totalStats
    };
  }

  /**
   * Full framework detail with domains and standards.
   * @param {string} frameworkId
   * @returns {{ framework: Object, domains: Object[] }}
   */
  function getFrameworkDetail(frameworkId) {
    AuthService.requireAdmin();
    if (!frameworkId) throw new Error('VALIDATION: frameworkId is required');

    var fw = DataService.getRecordById('accreditation_frameworks', frameworkId);
    if (!fw) throw new Error('NOT_FOUND: Framework not found');

    var sMap = staffMap_();

    var standards = DataService.query('accreditation_standards', {
      filters: { framework_id: frameworkId },
      sort: { field: 'position', direction: 'asc' }
    }).data;

    // Pre-fetch evidence and narratives for all standards in this framework
    var standardIds = standards.map(function(s) { return s.id; });
    var allEvidence = DataService.getRecords('accreditation_evidence');
    var allNarratives = DataService.getRecords('accreditation_narratives');

    var evidenceByStd = {};
    allEvidence.forEach(function(e) {
      if (standardIds.indexOf(e.standard_id) !== -1) {
        if (!evidenceByStd[e.standard_id]) evidenceByStd[e.standard_id] = [];
        evidenceByStd[e.standard_id].push(e);
      }
    });

    var narrativesByStd = {};
    allNarratives.forEach(function(n) {
      if (standardIds.indexOf(n.standard_id) !== -1) {
        if (!narrativesByStd[n.standard_id]) narrativesByStd[n.standard_id] = [];
        narrativesByStd[n.standard_id].push(n);
      }
    });

    // Group standards by domain
    var domainMap = {};
    var domainOrder = [];
    standards.forEach(function(s) {
      if (!domainMap[s.domain]) {
        domainMap[s.domain] = [];
        domainOrder.push(s.domain);
      }

      var evidence = evidenceByStd[s.id] || [];
      var narratives = (narrativesByStd[s.id] || []).sort(function(a, b) {
        return parseInt(b.version) - parseInt(a.version);
      });
      var latestNarrative = narratives.length > 0 ? narratives[0] : null;
      var readiness = computeStandardReadiness_(s.id, evidenceByStd, narrativesByStd);

      domainMap[s.domain].push({
        id: s.id,
        frameworkId: s.framework_id,
        domain: s.domain,
        standardCode: s.standard_code,
        standardText: s.standard_text,
        position: parseInt(s.position) || 0,
        evidenceCount: evidence.length,
        approvedEvidenceCount: evidence.filter(function(e) { return e.status === 'approved'; }).length,
        latestNarrativeStatus: latestNarrative ? latestNarrative.status : null,
        latestNarrativeVersion: latestNarrative ? parseInt(latestNarrative.version) : 0,
        readiness: readiness
      });
    });

    var domains = domainOrder.map(function(name) {
      var stds = domainMap[name];
      var greenCount = stds.filter(function(s) { return s.readiness === 'green'; }).length;
      return {
        name: name,
        standardCount: stds.length,
        greenCount: greenCount,
        progress: Math.round((greenCount / stds.length) * 100),
        standards: stds
      };
    });

    var totalGreen = standards.filter(function(s) {
      return computeStandardReadiness_(s.id, evidenceByStd, narrativesByStd) === 'green';
    }).length;

    return {
      framework: {
        id: fw.id,
        name: fw.name,
        description: fw.description || '',
        visitDate: fw.visit_date || '',
        status: fw.status,
        createdAt: fw.created_at,
        standardCount: standards.length,
        progress: standards.length > 0 ? Math.round((totalGreen / standards.length) * 100) : 0
      },
      domains: domains
    };
  }

  /**
   * Creates a new accreditation framework.
   * @param {Object} data - { name, description?, visit_date?, status? }
   * @returns {Object}
   */
  function createFramework(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['name']);

    var record = {
      name: data.name,
      description: data.description || '',
      visit_date: data.visit_date || '',
      status: data.status || 'preparing',
      created_at: nowISO()
    };

    if (FRAMEWORK_STATUSES.indexOf(record.status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + FRAMEWORK_STATUSES.join(', '));
    }

    return DataService.createRecord('accreditation_frameworks', record);
  }

  /**
   * Updates a framework.
   * @param {string} frameworkId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateFramework(frameworkId, updates) {
    AuthService.requireAdmin();
    if (!frameworkId) throw new Error('VALIDATION: frameworkId is required');

    var fw = DataService.getRecordById('accreditation_frameworks', frameworkId);
    if (!fw) throw new Error('NOT_FOUND: Framework not found');

    if (updates.status && FRAMEWORK_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + FRAMEWORK_STATUSES.join(', '));
    }

    return DataService.updateRecord('accreditation_frameworks', frameworkId, updates);
  }

  /**
   * Deletes a framework and cascades: evidence → narratives → standards → framework.
   * @param {string} frameworkId
   * @returns {boolean}
   */
  function deleteFramework(frameworkId) {
    AuthService.requireAdmin();
    if (!frameworkId) throw new Error('VALIDATION: frameworkId is required');

    var fw = DataService.getRecordById('accreditation_frameworks', frameworkId);
    if (!fw) throw new Error('NOT_FOUND: Framework not found');

    // Find all standards for this framework
    var standards = DataService.getRelated('accreditation_standards', 'framework_id', frameworkId);

    standards.forEach(function(std) {
      // Delete evidence for this standard
      var evidence = DataService.getRelated('accreditation_evidence', 'standard_id', std.id);
      evidence.forEach(function(e) {
        DataService.deleteRecord('accreditation_evidence', e.id, { hard: true });
      });

      // Delete narratives for this standard
      var narratives = DataService.getRelated('accreditation_narratives', 'standard_id', std.id);
      narratives.forEach(function(n) {
        DataService.deleteRecord('accreditation_narratives', n.id, { hard: true });
      });

      // Delete the standard
      DataService.deleteRecord('accreditation_standards', std.id, { hard: true });
    });

    // Delete the framework
    DataService.deleteRecord('accreditation_frameworks', frameworkId, { hard: true });
    return true;
  }

  /**
   * Creates a standard within a framework.
   * @param {Object} data - { framework_id, domain, standard_code, standard_text, position? }
   * @returns {Object}
   */
  function createStandard(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['framework_id', 'domain', 'standard_code', 'standard_text']);

    var fw = DataService.getRecordById('accreditation_frameworks', data.framework_id);
    if (!fw) throw new Error('VALIDATION: Framework not found');

    // Auto-compute position if not provided
    var position = data.position;
    if (!position) {
      var existing = DataService.getRelated('accreditation_standards', 'framework_id', data.framework_id);
      var maxPos = 0;
      existing.forEach(function(s) {
        var p = parseInt(s.position) || 0;
        if (p > maxPos) maxPos = p;
      });
      position = maxPos + 1;
    }

    return DataService.createRecord('accreditation_standards', {
      framework_id: data.framework_id,
      domain: data.domain,
      standard_code: data.standard_code,
      standard_text: data.standard_text,
      position: String(position)
    });
  }

  /**
   * Updates a standard.
   * @param {string} standardId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateStandard(standardId, updates) {
    AuthService.requireAdmin();
    if (!standardId) throw new Error('VALIDATION: standardId is required');

    var std = DataService.getRecordById('accreditation_standards', standardId);
    if (!std) throw new Error('NOT_FOUND: Standard not found');

    return DataService.updateRecord('accreditation_standards', standardId, updates);
  }

  /**
   * Deletes a standard and cascades evidence + narratives.
   * @param {string} standardId
   * @returns {boolean}
   */
  function deleteStandard(standardId) {
    AuthService.requireAdmin();
    if (!standardId) throw new Error('VALIDATION: standardId is required');

    var std = DataService.getRecordById('accreditation_standards', standardId);
    if (!std) throw new Error('NOT_FOUND: Standard not found');

    var evidence = DataService.getRelated('accreditation_evidence', 'standard_id', standardId);
    evidence.forEach(function(e) {
      DataService.deleteRecord('accreditation_evidence', e.id, { hard: true });
    });

    var narratives = DataService.getRelated('accreditation_narratives', 'standard_id', standardId);
    narratives.forEach(function(n) {
      DataService.deleteRecord('accreditation_narratives', n.id, { hard: true });
    });

    DataService.deleteRecord('accreditation_standards', standardId, { hard: true });
    return true;
  }

  /**
   * Reorders standards by updating position values.
   * @param {string[]} standardIds - ordered array of standard IDs
   * @returns {boolean}
   */
  function reorderStandards(standardIds) {
    AuthService.requireAdmin();
    if (!standardIds || !standardIds.length) throw new Error('VALIDATION: standardIds array is required');

    standardIds.forEach(function(id, idx) {
      DataService.updateRecord('accreditation_standards', id, { position: String(idx + 1) });
    });
    return true;
  }

  /**
   * Full detail for a single standard: evidence + narrative versions.
   * @param {string} standardId
   * @returns {{ standard: Object, evidence: Object[], narratives: Object[] }}
   */
  function getStandardDetail(standardId) {
    AuthService.requireAdmin();
    if (!standardId) throw new Error('VALIDATION: standardId is required');

    var std = DataService.getRecordById('accreditation_standards', standardId);
    if (!std) throw new Error('NOT_FOUND: Standard not found');

    var sMap = staffMap_();

    // Evidence
    var evidence = DataService.query('accreditation_evidence', {
      filters: { standard_id: standardId },
      sort: { field: 'uploaded_at', direction: 'desc' }
    }).data;

    evidence = evidence.map(function(e) {
      return {
        id: e.id,
        standardId: e.standard_id,
        title: e.title,
        description: e.description || '',
        driveFileId: e.drive_file_id || '',
        driveFileUrl: e.drive_file_url || '',
        fileType: e.file_type || 'link',
        uploadedBy: staffName_(sMap, e.uploaded_by),
        uploadedById: e.uploaded_by,
        uploadedAt: e.uploaded_at || '',
        status: e.status,
        reviewerId: e.reviewer_id || '',
        reviewerName: e.reviewer_id ? staffName_(sMap, e.reviewer_id) : '',
        reviewNotes: e.review_notes || ''
      };
    });

    // Narratives (newest version first)
    var narratives = DataService.query('accreditation_narratives', {
      filters: { standard_id: standardId },
      sort: { field: 'version', direction: 'desc' }
    }).data;

    narratives = narratives.map(function(n) {
      return {
        id: n.id,
        standardId: n.standard_id,
        narrativeText: n.narrative_text || '',
        authorId: n.author_id,
        authorName: staffName_(sMap, n.author_id),
        version: parseInt(n.version) || 1,
        status: n.status,
        wordCount: (n.narrative_text || '').split(/\s+/).filter(Boolean).length,
        createdAt: n.created_at || '',
        updatedAt: n.updated_at || ''
      };
    });

    // Compute readiness
    var evidenceByStd = {};
    evidenceByStd[standardId] = DataService.getRelated('accreditation_evidence', 'standard_id', standardId);
    var narrativesByStd = {};
    narrativesByStd[standardId] = DataService.getRelated('accreditation_narratives', 'standard_id', standardId);
    var readiness = computeStandardReadiness_(standardId, evidenceByStd, narrativesByStd);

    return {
      standard: {
        id: std.id,
        frameworkId: std.framework_id,
        domain: std.domain,
        standardCode: std.standard_code,
        standardText: std.standard_text,
        position: parseInt(std.position) || 0,
        readiness: readiness
      },
      evidence: evidence,
      narratives: narratives
    };
  }

  /**
   * Creates an evidence record.
   * @param {Object} data - { standard_id, title, description?, drive_file_url?, file_type? }
   * @returns {Object}
   */
  function createEvidence(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['standard_id', 'title']);

    var std = DataService.getRecordById('accreditation_standards', data.standard_id);
    if (!std) throw new Error('VALIDATION: Standard not found');

    var fileType = data.file_type || 'link';
    if (EVIDENCE_FILE_TYPES.indexOf(fileType) === -1) {
      throw new Error('VALIDATION: Invalid file_type. Must be one of: ' + EVIDENCE_FILE_TYPES.join(', '));
    }

    var user = AuthService.getCurrentUser();
    var driveUrl = data.drive_file_url || '';
    var driveId = extractDriveFileId_(driveUrl);

    return DataService.createRecord('accreditation_evidence', {
      standard_id: data.standard_id,
      title: data.title,
      description: data.description || '',
      drive_file_id: driveId,
      drive_file_url: driveUrl,
      file_type: fileType,
      uploaded_by: user.id,
      uploaded_at: nowISO(),
      status: 'draft',
      reviewer_id: '',
      review_notes: ''
    });
  }

  /**
   * Updates an evidence record.
   * @param {string} evidenceId
   * @param {Object} updates
   * @returns {Object}
   */
  function updateEvidence(evidenceId, updates) {
    AuthService.requireAdmin();
    if (!evidenceId) throw new Error('VALIDATION: evidenceId is required');

    var ev = DataService.getRecordById('accreditation_evidence', evidenceId);
    if (!ev) throw new Error('NOT_FOUND: Evidence not found');

    if (updates.status && EVIDENCE_STATUSES.indexOf(updates.status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + EVIDENCE_STATUSES.join(', '));
    }

    if (updates.file_type && EVIDENCE_FILE_TYPES.indexOf(updates.file_type) === -1) {
      throw new Error('VALIDATION: Invalid file_type. Must be one of: ' + EVIDENCE_FILE_TYPES.join(', '));
    }

    // Re-extract drive_file_id if URL changed
    if (updates.drive_file_url) {
      updates.drive_file_id = extractDriveFileId_(updates.drive_file_url);
    }

    return DataService.updateRecord('accreditation_evidence', evidenceId, updates);
  }

  /**
   * Deletes an evidence record.
   * @param {string} evidenceId
   * @returns {boolean}
   */
  function deleteEvidence(evidenceId) {
    AuthService.requireAdmin();
    if (!evidenceId) throw new Error('VALIDATION: evidenceId is required');

    var ev = DataService.getRecordById('accreditation_evidence', evidenceId);
    if (!ev) throw new Error('NOT_FOUND: Evidence not found');

    DataService.deleteRecord('accreditation_evidence', evidenceId, { hard: true });
    return true;
  }

  /**
   * Reviews evidence: sets reviewer, notes, and status.
   * @param {string} evidenceId
   * @param {Object} data - { status, review_notes? }
   * @returns {Object}
   */
  function reviewEvidence(evidenceId, data) {
    AuthService.requireAdmin();
    if (!evidenceId) throw new Error('VALIDATION: evidenceId is required');
    validateRequired(data, ['status']);

    if (EVIDENCE_STATUSES.indexOf(data.status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + EVIDENCE_STATUSES.join(', '));
    }

    var ev = DataService.getRecordById('accreditation_evidence', evidenceId);
    if (!ev) throw new Error('NOT_FOUND: Evidence not found');

    var user = AuthService.getCurrentUser();

    return DataService.updateRecord('accreditation_evidence', evidenceId, {
      status: data.status,
      reviewer_id: user.id,
      review_notes: data.review_notes || ''
    });
  }

  /**
   * Creates a new narrative version. Each save creates a new version.
   * @param {Object} data - { standard_id, narrative_text }
   * @returns {Object}
   */
  function saveNarrative(data) {
    AuthService.requireAdmin();
    validateRequired(data, ['standard_id', 'narrative_text']);

    var std = DataService.getRecordById('accreditation_standards', data.standard_id);
    if (!std) throw new Error('VALIDATION: Standard not found');

    // Find max version for this standard
    var existing = DataService.getRelated('accreditation_narratives', 'standard_id', data.standard_id);
    var maxVersion = 0;
    existing.forEach(function(n) {
      var v = parseInt(n.version) || 0;
      if (v > maxVersion) maxVersion = v;
    });

    var user = AuthService.getCurrentUser();

    return DataService.createRecord('accreditation_narratives', {
      standard_id: data.standard_id,
      narrative_text: data.narrative_text,
      author_id: user.id,
      version: String(maxVersion + 1),
      status: 'draft',
      created_at: nowISO(),
      updated_at: nowISO()
    });
  }

  /**
   * Updates narrative status (draft → review → final).
   * @param {string} narrativeId
   * @param {string} status
   * @returns {Object}
   */
  function updateNarrativeStatus(narrativeId, status) {
    AuthService.requireAdmin();
    if (!narrativeId) throw new Error('VALIDATION: narrativeId is required');
    if (!status) throw new Error('VALIDATION: status is required');

    if (NARRATIVE_STATUSES.indexOf(status) === -1) {
      throw new Error('VALIDATION: Invalid status. Must be one of: ' + NARRATIVE_STATUSES.join(', '));
    }

    var nar = DataService.getRecordById('accreditation_narratives', narrativeId);
    if (!nar) throw new Error('NOT_FOUND: Narrative not found');

    return DataService.updateRecord('accreditation_narratives', narrativeId, {
      status: status,
      updated_at: nowISO()
    });
  }

  // ── Export Functions (Google Drive Integration) ──

  /**
   * Exports a single standard to a Google Doc.
   * @param {string} standardId
   * @returns {{ docUrl: string, docId: string }}
   */
  function exportStandardDoc(standardId) {
    AuthService.requireAdmin();
    if (!standardId) throw new Error('VALIDATION: standardId is required');

    var std = DataService.getRecordById('accreditation_standards', standardId);
    if (!std) throw new Error('NOT_FOUND: Standard not found');

    // Get latest final narrative, or latest version
    var narratives = DataService.query('accreditation_narratives', {
      filters: { standard_id: standardId },
      sort: { field: 'version', direction: 'desc' }
    }).data;

    var finalNarrative = narratives.filter(function(n) { return n.status === 'final'; })[0] || null;
    var narrative = finalNarrative || (narratives.length > 0 ? narratives[0] : null);

    // Get approved evidence
    var evidence = DataService.query('accreditation_evidence', {
      filters: { standard_id: standardId }
    }).data;

    // Create Google Doc
    var doc = DocumentApp.create('Standard ' + std.standard_code + ' Self-Study');
    var body = doc.getBody();

    // Header
    body.appendParagraph(std.standard_code + ': ' + std.standard_text)
        .setHeading(DocumentApp.ParagraphHeading.HEADING1);

    // Narrative
    body.appendParagraph('Self-Study Narrative')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    if (narrative) {
      body.appendParagraph(narrative.narrative_text);
      body.appendParagraph('Status: ' + narrative.status + ' | Version: ' + narrative.version)
          .setAttributes({ FONT_SIZE: 9, ITALIC: true, FOREGROUND_COLOR: '#666666' });
    } else {
      body.appendParagraph('No narrative has been written for this standard.')
          .setAttributes({ ITALIC: true, FOREGROUND_COLOR: '#999999' });
    }

    // Evidence
    body.appendParagraph('Supporting Evidence')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    if (evidence.length > 0) {
      evidence.forEach(function(e) {
        var item = body.appendListItem(e.title + (e.description ? ' — ' + e.description : ''));
        if (e.drive_file_url) {
          item.setLinkUrl(e.drive_file_url);
        }
        item.appendText(' [' + (e.status || 'draft') + ']');
      });
    } else {
      body.appendParagraph('No evidence has been linked to this standard.')
          .setAttributes({ ITALIC: true, FOREGROUND_COLOR: '#999999' });
    }

    doc.saveAndClose();

    // Move to accreditation folder if configured
    moveDocToFolder_(doc.getId());

    return {
      docUrl: doc.getUrl(),
      docId: doc.getId()
    };
  }

  /**
   * Exports all standards in a domain to a Google Doc.
   * @param {string} frameworkId
   * @param {string} domain
   * @returns {{ docUrl: string, docId: string }}
   */
  function exportDomainDoc(frameworkId, domain) {
    AuthService.requireAdmin();
    if (!frameworkId || !domain) throw new Error('VALIDATION: frameworkId and domain are required');

    var fw = DataService.getRecordById('accreditation_frameworks', frameworkId);
    if (!fw) throw new Error('NOT_FOUND: Framework not found');

    var standards = DataService.query('accreditation_standards', {
      filters: { framework_id: frameworkId },
      sort: { field: 'position', direction: 'asc' }
    }).data.filter(function(s) { return s.domain === domain; });

    if (standards.length === 0) throw new Error('NOT_FOUND: No standards found for domain: ' + domain);

    var doc = DocumentApp.create(fw.name + ' — ' + domain);
    var body = doc.getBody();

    body.appendParagraph(fw.name)
        .setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph('Domain: ' + domain)
        .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
    if (fw.visit_date) {
      body.appendParagraph('Accreditation Visit: ' + fw.visit_date);
    }
    body.appendHorizontalRule();

    standards.forEach(function(std) {
      appendStandardToBody_(body, std);
    });

    doc.saveAndClose();
    moveDocToFolder_(doc.getId());

    return {
      docUrl: doc.getUrl(),
      docId: doc.getId()
    };
  }

  /**
   * Exports the complete self-study document.
   * @param {string} frameworkId
   * @returns {{ docUrl: string, docId: string }}
   */
  function exportSelfStudy(frameworkId) {
    AuthService.requireAdmin();
    if (!frameworkId) throw new Error('VALIDATION: frameworkId is required');

    var fw = DataService.getRecordById('accreditation_frameworks', frameworkId);
    if (!fw) throw new Error('NOT_FOUND: Framework not found');

    var standards = DataService.query('accreditation_standards', {
      filters: { framework_id: frameworkId },
      sort: { field: 'position', direction: 'asc' }
    }).data;

    // Group by domain
    var domainMap = {};
    var domainOrder = [];
    standards.forEach(function(s) {
      if (!domainMap[s.domain]) {
        domainMap[s.domain] = [];
        domainOrder.push(s.domain);
      }
      domainMap[s.domain].push(s);
    });

    var doc = DocumentApp.create(fw.name + ' — Self-Study Report');
    var body = doc.getBody();

    // Title page
    body.appendParagraph(fw.name)
        .setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph('Self-Study Report')
        .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
    if (fw.description) {
      body.appendParagraph(fw.description);
    }
    if (fw.visit_date) {
      body.appendParagraph('Accreditation Visit Date: ' + fw.visit_date);
    }
    body.appendParagraph('Generated: ' + new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }));
    body.appendPageBreak();

    // Table of Contents placeholder
    body.appendParagraph('Table of Contents')
        .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    domainOrder.forEach(function(domain, idx) {
      body.appendParagraph((idx + 1) + '. ' + domain);
    });
    body.appendPageBreak();

    // Each domain
    domainOrder.forEach(function(domain) {
      body.appendParagraph(domain)
          .setHeading(DocumentApp.ParagraphHeading.HEADING1);

      var stds = domainMap[domain];
      stds.forEach(function(std) {
        appendStandardToBody_(body, std);
      });

      body.appendPageBreak();
    });

    doc.saveAndClose();
    moveDocToFolder_(doc.getId());

    return {
      docUrl: doc.getUrl(),
      docId: doc.getId()
    };
  }

  /**
   * Helper: appends a standard's content to a doc body.
   * @private
   */
  function appendStandardToBody_(body, std) {
    body.appendParagraph(std.standard_code + ': ' + std.standard_text)
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    // Narrative
    var narratives = DataService.query('accreditation_narratives', {
      filters: { standard_id: std.id },
      sort: { field: 'version', direction: 'desc' }
    }).data;

    var finalNarrative = narratives.filter(function(n) { return n.status === 'final'; })[0] || null;
    var narrative = finalNarrative || (narratives.length > 0 ? narratives[0] : null);

    body.appendParagraph('Narrative')
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);

    if (narrative) {
      body.appendParagraph(narrative.narrative_text);
    } else {
      body.appendParagraph('No narrative provided.')
          .setAttributes({ ITALIC: true, FOREGROUND_COLOR: '#999999' });
    }

    // Evidence
    var evidence = DataService.query('accreditation_evidence', {
      filters: { standard_id: std.id }
    }).data;

    if (evidence.length > 0) {
      body.appendParagraph('Evidence')
          .setHeading(DocumentApp.ParagraphHeading.HEADING3);

      evidence.forEach(function(e) {
        var item = body.appendListItem(e.title + (e.description ? ' — ' + e.description : ''));
        if (e.drive_file_url) {
          item.setLinkUrl(e.drive_file_url);
        }
      });
    }

    body.appendParagraph(''); // Spacer
  }

  /**
   * Helper: moves a doc to the configured accreditation folder.
   * @private
   */
  function moveDocToFolder_(docId) {
    try {
      var configs = DataService.getRecords('_config');
      var folderId = '';
      for (var i = 0; i < configs.length; i++) {
        if (configs[i].key === 'drive_root_folder_id' && configs[i].value) {
          folderId = configs[i].value;
          break;
        }
      }
      if (folderId) {
        var file = DriveApp.getFileById(docId);
        var folder = DriveApp.getFolderById(folderId);
        folder.addFile(file);
        // Remove from root
        DriveApp.getRootFolder().removeFile(file);
      }
    } catch (e) {
      // Silently fail — doc stays in root if folder not configured
      Logger.log('moveDocToFolder_ warning: ' + e.message);
    }
  }

  /**
   * Converts a Google Doc to PDF.
   * @param {string} docId - Google Doc ID
   * @returns {{ pdfUrl: string, pdfId: string }}
   */
  function exportToPdf(docId) {
    AuthService.requireAdmin();
    if (!docId) throw new Error('VALIDATION: docId is required');

    try {
      var docFile = DriveApp.getFileById(docId);
      var pdfBlob = docFile.getAs('application/pdf');
      pdfBlob.setName(docFile.getName() + '.pdf');

      var pdfFile = DriveApp.createFile(pdfBlob);

      // Move PDF to same folder as doc
      var parents = docFile.getParents();
      if (parents.hasNext()) {
        var folder = parents.next();
        folder.addFile(pdfFile);
        DriveApp.getRootFolder().removeFile(pdfFile);
      }

      return {
        pdfUrl: pdfFile.getUrl(),
        pdfId: pdfFile.getId()
      };
    } catch (e) {
      throw new Error('EXPORT: Failed to convert to PDF — ' + e.message);
    }
  }

  /**
   * Creates an evidence binder folder structure in Google Drive.
   * @param {string} frameworkId
   * @returns {{ folderUrl: string, folderId: string }}
   */
  function createEvidenceBinder(frameworkId) {
    AuthService.requireAdmin();
    if (!frameworkId) throw new Error('VALIDATION: frameworkId is required');

    var fw = DataService.getRecordById('accreditation_frameworks', frameworkId);
    if (!fw) throw new Error('NOT_FOUND: Framework not found');

    var standards = DataService.query('accreditation_standards', {
      filters: { framework_id: frameworkId },
      sort: { field: 'position', direction: 'asc' }
    }).data;

    // Create parent folder
    var parentFolder;
    try {
      var configs = DataService.getRecords('_config');
      var rootFolderId = '';
      for (var i = 0; i < configs.length; i++) {
        if (configs[i].key === 'drive_root_folder_id' && configs[i].value) {
          rootFolderId = configs[i].value;
          break;
        }
      }
      if (rootFolderId) {
        parentFolder = DriveApp.getFolderById(rootFolderId).createFolder('Evidence Binder — ' + fw.name);
      } else {
        parentFolder = DriveApp.createFolder('Evidence Binder — ' + fw.name);
      }
    } catch (e) {
      parentFolder = DriveApp.createFolder('Evidence Binder — ' + fw.name);
    }

    // Group by domain
    var domainMap = {};
    var domainOrder = [];
    standards.forEach(function(s) {
      if (!domainMap[s.domain]) {
        domainMap[s.domain] = [];
        domainOrder.push(s.domain);
      }
      domainMap[s.domain].push(s);
    });

    // Create folder hierarchy
    domainOrder.forEach(function(domain) {
      var domainFolder = parentFolder.createFolder(domain);
      var stds = domainMap[domain];

      stds.forEach(function(std) {
        var stdFolderName = std.standard_code + ' — ' + std.standard_text.substring(0, 50);
        var stdFolder = domainFolder.createFolder(stdFolderName);

        // Link evidence files as shortcuts
        var evidence = DataService.getRelated('accreditation_evidence', 'standard_id', std.id);
        evidence.forEach(function(e) {
          if (e.drive_file_id) {
            try {
              var file = DriveApp.getFileById(e.drive_file_id);
              stdFolder.createShortcut(file.getId());
            } catch (err) {
              // File may not be accessible — create a placeholder doc
              var placeholder = DocumentApp.create(e.title + ' (link broken)');
              var placeholderBody = placeholder.getBody();
              placeholderBody.appendParagraph('Evidence: ' + e.title);
              if (e.drive_file_url) {
                placeholderBody.appendParagraph('Original URL: ' + e.drive_file_url);
              }
              placeholderBody.appendParagraph('Note: The original file could not be linked. It may have been deleted or access was revoked.');
              placeholder.saveAndClose();
              var placeholderFile = DriveApp.getFileById(placeholder.getId());
              stdFolder.addFile(placeholderFile);
              DriveApp.getRootFolder().removeFile(placeholderFile);
            }
          }
        });
      });
    });

    return {
      folderUrl: parentFolder.getUrl(),
      folderId: parentFolder.getId()
    };
  }

  /**
   * Computes visit readiness: gaps, progress, and checklist.
   * @param {string} frameworkId
   * @returns {{ totalStandards, greenCount, amberCount, redCount, progress, gaps: Object[], amberItems: Object[] }}
   */
  function getVisitReadiness(frameworkId) {
    AuthService.requireAdmin();
    if (!frameworkId) throw new Error('VALIDATION: frameworkId is required');

    var fw = DataService.getRecordById('accreditation_frameworks', frameworkId);
    if (!fw) throw new Error('NOT_FOUND: Framework not found');

    var standards = DataService.query('accreditation_standards', {
      filters: { framework_id: frameworkId },
      sort: { field: 'position', direction: 'asc' }
    }).data;

    var allEvidence = DataService.getRecords('accreditation_evidence');
    var allNarratives = DataService.getRecords('accreditation_narratives');

    var evidenceByStd = {};
    allEvidence.forEach(function(e) {
      if (!evidenceByStd[e.standard_id]) evidenceByStd[e.standard_id] = [];
      evidenceByStd[e.standard_id].push(e);
    });

    var narrativesByStd = {};
    allNarratives.forEach(function(n) {
      if (!narrativesByStd[n.standard_id]) narrativesByStd[n.standard_id] = [];
      narrativesByStd[n.standard_id].push(n);
    });

    var greenCount = 0;
    var amberCount = 0;
    var redCount = 0;
    var gaps = [];
    var amberItems = [];

    standards.forEach(function(s) {
      var readiness = computeStandardReadiness_(s.id, evidenceByStd, narrativesByStd);
      var evidence = evidenceByStd[s.id] || [];
      var narratives = narrativesByStd[s.id] || [];

      var hasApprovedEvidence = evidence.filter(function(e) { return e.status === 'approved'; }).length > 0;
      var hasFinalNarrative = narratives.filter(function(n) { return n.status === 'final'; }).length > 0;

      if (readiness === 'green') {
        greenCount++;
      } else if (readiness === 'amber') {
        amberCount++;
        var issues = [];
        if (!hasApprovedEvidence) issues.push('No approved evidence');
        if (!hasFinalNarrative) issues.push('No final narrative');
        amberItems.push({
          standardId: s.id,
          standardCode: s.standard_code,
          standardText: s.standard_text,
          domain: s.domain,
          issues: issues
        });
      } else {
        redCount++;
        var redIssues = [];
        if (evidence.length === 0) redIssues.push('No evidence');
        if (narratives.length === 0) redIssues.push('No narrative');
        gaps.push({
          standardId: s.id,
          standardCode: s.standard_code,
          standardText: s.standard_text,
          domain: s.domain,
          issues: redIssues
        });
      }
    });

    var progress = standards.length > 0 ? Math.round((greenCount / standards.length) * 100) : 0;

    return {
      frameworkName: fw.name,
      visitDate: fw.visit_date || '',
      totalStandards: standards.length,
      greenCount: greenCount,
      amberCount: amberCount,
      redCount: redCount,
      progress: progress,
      gaps: gaps,
      amberItems: amberItems
    };
  }

  // ── Return Public API ──

  return {
    getOverview: getOverview,
    getFrameworkDetail: getFrameworkDetail,
    createFramework: createFramework,
    updateFramework: updateFramework,
    deleteFramework: deleteFramework,
    createStandard: createStandard,
    updateStandard: updateStandard,
    deleteStandard: deleteStandard,
    reorderStandards: reorderStandards,
    getStandardDetail: getStandardDetail,
    createEvidence: createEvidence,
    updateEvidence: updateEvidence,
    deleteEvidence: deleteEvidence,
    reviewEvidence: reviewEvidence,
    saveNarrative: saveNarrative,
    updateNarrativeStatus: updateNarrativeStatus,
    exportStandardDoc: exportStandardDoc,
    exportDomainDoc: exportDomainDoc,
    exportSelfStudy: exportSelfStudy,
    exportToPdf: exportToPdf,
    createEvidenceBinder: createEvidenceBinder,
    getVisitReadiness: getVisitReadiness
  };

})();
