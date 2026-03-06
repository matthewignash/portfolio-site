/**
 * PDService.gs — Professional Development Tracking
 *
 * Tables: pd_offerings, pd_registrations, pd_reflections, pd_activity
 *
 * Mixed-access module: all staff can browse catalog, register, and view own PD.
 * Admin-only operations: create/manage offerings, mark attendance, view all staff data.
 *
 * IIFE module — ES5 only (GAS Rhino runtime).
 */

var PDService = (function() {
  'use strict';

  // ═══════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════

  var PD_CATEGORIES = ['workshop', 'course', 'conference', 'webinar', 'coaching', 'book_study', 'other'];
  var PD_STATUSES = ['draft', 'published', 'completed', 'cancelled'];
  var REG_STATUSES = ['registered', 'waitlisted', 'attended', 'no_show', 'cancelled'];
  var ACTIVITY_TYPES = [
    'offering_created', 'offering_updated', 'offering_published', 'offering_completed',
    'offering_cancelled', 'registered', 'waitlisted', 'cancelled_registration',
    'attendance_marked', 'reflection_added', 'reflection_updated', 'evidence_linked'
  ];

  // ═══════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════

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

  function staffInitials_(map, id) {
    var s = map[id];
    return s ? (s.first_name || '').charAt(0) + (s.last_name || '').charAt(0) : '??';
  }

  /**
   * Logs an activity entry for a PD event.
   */
  function logPDActivity_(offeringId, actionType, fieldName, oldValue, newValue, userId) {
    var uid = userId;
    if (!uid) {
      try {
        var user = AuthService.getCurrentUser();
        uid = user.id;
      } catch (e) {
        uid = 'system';
      }
    }
    DataService.createRecord('pd_activity', {
      offering_id: offeringId || '',
      user_id: uid,
      action_type: actionType,
      field_name: fieldName || '',
      old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : '',
      new_value: newValue !== null && newValue !== undefined ? String(newValue) : '',
      created_at: nowISO()
    });
  }

  /**
   * Hydrates activity entries with user names and initials.
   */
  function hydratePDActivity_(entries) {
    var sMap = staffMap_();
    return entries.map(function(e) {
      var staff = sMap[e.user_id];
      return {
        id: e.id,
        offeringId: e.offering_id,
        userId: e.user_id,
        userName: staff ? staff.first_name + ' ' + staff.last_name : 'System',
        userInitials: staff ? (staff.first_name || '').charAt(0) + (staff.last_name || '').charAt(0) : 'SY',
        actionType: e.action_type,
        fieldName: e.field_name,
        oldValue: e.old_value,
        newValue: e.new_value,
        createdAt: e.created_at
      };
    });
  }

  /**
   * Auto-promotes the next waitlisted person to registered when a slot opens.
   */
  function promoteWaitlist_(offeringId) {
    var regs = DataService.getRelated('pd_registrations', 'offering_id', offeringId);
    var waitlisted = regs.filter(function(r) {
      return r.status === 'waitlisted';
    }).sort(function(a, b) {
      return (Number(a.waitlist_position) || 999) - (Number(b.waitlist_position) || 999);
    });

    if (waitlisted.length > 0) {
      var next = waitlisted[0];
      DataService.updateRecord('pd_registrations', next.id, {
        status: 'registered',
        waitlist_position: '',
        updated_at: nowISO()
      });
      logPDActivity_(offeringId, 'registered', 'status', 'waitlisted', 'registered', next.staff_id);
      // Re-number remaining waitlist
      for (var i = 1; i < waitlisted.length; i++) {
        DataService.updateRecord('pd_registrations', waitlisted[i].id, {
          waitlist_position: String(i),
          updated_at: nowISO()
        });
      }
    }
  }

  // ═══════════════════════════════════════════════
  // Offering functions
  // ═══════════════════════════════════════════════

  /**
   * Returns all offerings with registration counts and facilitator names.
   * @param {Object} filters - { category, status, search, date_from, date_to, facilitator_id }
   * @returns {Object} { offerings: [...], stats: {...} }
   */
  function getOverview(filters) {
    filters = filters || {};
    var allOfferings = DataService.getRecords('pd_offerings');
    var allRegs = DataService.getRecords('pd_registrations');
    var sMap = staffMap_();

    // Build registration counts per offering
    var regCounts = {};
    var attendedCounts = {};
    allRegs.forEach(function(r) {
      if (r.status === 'registered' || r.status === 'attended') {
        regCounts[r.offering_id] = (regCounts[r.offering_id] || 0) + 1;
      }
      if (r.status === 'attended') {
        attendedCounts[r.offering_id] = (attendedCounts[r.offering_id] || 0) + 1;
      }
    });

    // Apply filters
    var filtered = allOfferings.filter(function(o) {
      if (filters.category && o.category !== filters.category) return false;
      if (filters.status && o.status !== filters.status) return false;
      if (filters.facilitator_id && o.facilitator_id !== filters.facilitator_id) return false;
      if (filters.date_from && o.session_date < filters.date_from) return false;
      if (filters.date_to && o.session_date > filters.date_to) return false;
      if (filters.search) {
        var term = filters.search.toLowerCase();
        var haystack = (o.title + ' ' + o.description + ' ' + (o.related_tags || '')).toLowerCase();
        if (haystack.indexOf(term) === -1) return false;
      }
      return true;
    });

    // Sort by session_date descending
    filtered.sort(function(a, b) {
      return (b.session_date || '').localeCompare(a.session_date || '');
    });

    // Hydrate
    var offerings = filtered.map(function(o) {
      return {
        id: o.id,
        title: o.title,
        description: o.description,
        facilitatorId: o.facilitator_id,
        facilitatorName: staffName_(sMap, o.facilitator_id),
        category: o.category,
        sessionDate: o.session_date,
        startTime: o.start_time,
        endTime: o.end_time,
        location: o.location,
        maxCapacity: Number(o.max_capacity) || 0,
        creditHours: Number(o.credit_hours) || 0,
        status: o.status,
        relatedStandardsCsv: o.related_standards_csv || '',
        relatedTags: o.related_tags || '',
        recurrence: o.recurrence || 'none',
        seriesId: o.series_id || '',
        registeredCount: regCounts[o.id] || 0,
        attendedCount: attendedCounts[o.id] || 0,
        createdBy: o.created_by,
        createdAt: o.created_at,
        updatedAt: o.updated_at
      };
    });

    // Stats
    var stats = { total: allOfferings.length, published: 0, completed: 0, cancelled: 0, draft: 0 };
    allOfferings.forEach(function(o) {
      if (stats[o.status] !== undefined) stats[o.status]++;
    });

    return { offerings: offerings, stats: stats };
  }

  /**
   * Returns full offering detail with registrations, reflections, activity.
   */
  function getOfferingDetail(offeringId) {
    var offering = DataService.getRecordById('pd_offerings', offeringId);
    if (!offering) throw new Error('Offering not found: ' + offeringId);

    var sMap = staffMap_();

    // Hydrate offering
    var detail = {
      id: offering.id,
      title: offering.title,
      description: offering.description,
      facilitatorId: offering.facilitator_id,
      facilitatorName: staffName_(sMap, offering.facilitator_id),
      category: offering.category,
      sessionDate: offering.session_date,
      startTime: offering.start_time,
      endTime: offering.end_time,
      location: offering.location,
      maxCapacity: Number(offering.max_capacity) || 0,
      creditHours: Number(offering.credit_hours) || 0,
      status: offering.status,
      relatedStandardsCsv: offering.related_standards_csv || '',
      relatedTags: offering.related_tags || '',
      recurrence: offering.recurrence || 'none',
      seriesId: offering.series_id || '',
      createdBy: offering.created_by,
      createdAt: offering.created_at,
      updatedAt: offering.updated_at
    };

    // Hydrate related standards names
    var stdIds = (offering.related_standards_csv || '').split(',').filter(Boolean);
    if (stdIds.length > 0) {
      var allStandards = DataService.getRecords('pgp_standards');
      var stdMap = {};
      allStandards.forEach(function(s) { stdMap[s.id] = s; });
      detail.relatedStandards = stdIds.map(function(sid) {
        var std = stdMap[sid.trim()];
        return std ? { id: std.id, number: std.standard_number, shortName: std.short_name, hashtag: std.hashtag } : null;
      }).filter(Boolean);
    } else {
      detail.relatedStandards = [];
    }

    // Registrations
    var regs = DataService.getRelated('pd_registrations', 'offering_id', offeringId);
    detail.registrations = regs.map(function(r) {
      return {
        id: r.id,
        staffId: r.staff_id,
        staffName: staffName_(sMap, r.staff_id),
        staffInitials: staffInitials_(sMap, r.staff_id),
        status: r.status,
        registeredAt: r.registered_at,
        attendedAt: r.attended_at,
        cancelledAt: r.cancelled_at,
        waitlistPosition: r.waitlist_position,
        creditHoursEarned: Number(r.credit_hours_earned) || 0
      };
    });

    // Counts
    detail.registeredCount = regs.filter(function(r) { return r.status === 'registered' || r.status === 'attended'; }).length;
    detail.attendedCount = regs.filter(function(r) { return r.status === 'attended'; }).length;
    detail.waitlistedCount = regs.filter(function(r) { return r.status === 'waitlisted'; }).length;

    // Reflections
    var reflections = DataService.getRelated('pd_reflections', 'offering_id', offeringId);
    detail.reflections = reflections.map(function(ref) {
      return {
        id: ref.id,
        staffId: ref.staff_id,
        staffName: staffName_(sMap, ref.staff_id),
        staffInitials: staffInitials_(sMap, ref.staff_id),
        registrationId: ref.registration_id,
        rating: Number(ref.rating) || 0,
        reflectionText: ref.reflection_text || '',
        linkedSelectionId: ref.linked_selection_id || '',
        createdAt: ref.created_at,
        updatedAt: ref.updated_at
      };
    });

    // Average rating
    if (detail.reflections.length > 0) {
      var totalRating = 0;
      detail.reflections.forEach(function(r) { totalRating += r.rating; });
      detail.avgRating = roundTo(totalRating / detail.reflections.length, 1);
    } else {
      detail.avgRating = 0;
    }

    // Activity
    var activities = DataService.getRelated('pd_activity', 'offering_id', offeringId);
    activities.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    detail.activity = hydratePDActivity_(activities.slice(0, 20));

    return detail;
  }

  /**
   * Creates a new PD offering.
   */
  function createOffering(data) {
    validateRequired(data, ['title', 'category', 'session_date']);
    if (PD_CATEGORIES.indexOf(data.category) === -1) {
      throw new Error('Invalid category: ' + data.category);
    }

    var now = nowISO();
    var offering = DataService.createRecord('pd_offerings', {
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description || ''),
      facilitator_id: data.facilitator_id || '',
      category: data.category,
      session_date: data.session_date,
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      location: sanitizeInput(data.location || ''),
      max_capacity: data.max_capacity || '',
      credit_hours: data.credit_hours || '',
      status: data.status || 'draft',
      related_standards_csv: data.related_standards_csv || '',
      related_tags: sanitizeInput(data.related_tags || ''),
      recurrence: data.recurrence || 'none',
      series_id: data.series_id || '',
      created_by: data.created_by || '',
      created_at: now,
      updated_at: now
    });

    logPDActivity_(offering.id, 'offering_created', '', '', offering.title);
    return offering;
  }

  /**
   * Updates an existing PD offering.
   */
  function updateOffering(offeringId, updates) {
    var existing = DataService.getRecordById('pd_offerings', offeringId);
    if (!existing) throw new Error('Offering not found: ' + offeringId);

    if (updates.category && PD_CATEGORIES.indexOf(updates.category) === -1) {
      throw new Error('Invalid category: ' + updates.category);
    }

    var safeUpdates = {};
    var trackFields = ['title', 'description', 'facilitator_id', 'category', 'session_date',
      'start_time', 'end_time', 'location', 'max_capacity', 'credit_hours',
      'related_standards_csv', 'related_tags', 'recurrence'];

    trackFields.forEach(function(f) {
      if (updates[f] !== undefined && updates[f] !== existing[f]) {
        var val = (f === 'title' || f === 'description' || f === 'location' || f === 'related_tags')
          ? sanitizeInput(updates[f]) : updates[f];
        safeUpdates[f] = val;
        logPDActivity_(offeringId, 'offering_updated', f, existing[f], val);
      }
    });

    if (Object.keys(safeUpdates).length === 0) return existing;
    safeUpdates.updated_at = nowISO();
    return DataService.updateRecord('pd_offerings', offeringId, safeUpdates);
  }

  /**
   * Deletes an offering and cascades to registrations, reflections, activity.
   */
  function deleteOffering(offeringId) {
    var existing = DataService.getRecordById('pd_offerings', offeringId);
    if (!existing) throw new Error('Offering not found: ' + offeringId);

    // Cascade delete
    var regs = DataService.getRelated('pd_registrations', 'offering_id', offeringId);
    regs.forEach(function(r) { DataService.deleteRecord('pd_registrations', r.id, { hard: true }); });

    var refs = DataService.getRelated('pd_reflections', 'offering_id', offeringId);
    refs.forEach(function(r) { DataService.deleteRecord('pd_reflections', r.id, { hard: true }); });

    var acts = DataService.getRelated('pd_activity', 'offering_id', offeringId);
    acts.forEach(function(a) { DataService.deleteRecord('pd_activity', a.id, { hard: true }); });

    DataService.deleteRecord('pd_offerings', offeringId, { hard: true });
    return { success: true };
  }

  /**
   * Updates offering status (publish, complete, cancel).
   */
  function updateOfferingStatus(offeringId, newStatus) {
    var existing = DataService.getRecordById('pd_offerings', offeringId);
    if (!existing) throw new Error('Offering not found: ' + offeringId);

    if (PD_STATUSES.indexOf(newStatus) === -1) {
      throw new Error('Invalid status: ' + newStatus);
    }

    // Validate transitions
    var current = existing.status;
    var validTransitions = {
      draft: ['published', 'cancelled'],
      published: ['completed', 'cancelled'],
      completed: [],
      cancelled: ['draft']
    };
    if ((validTransitions[current] || []).indexOf(newStatus) === -1) {
      throw new Error('Cannot transition from ' + current + ' to ' + newStatus);
    }

    logPDActivity_(offeringId, 'offering_' + newStatus, 'status', current, newStatus);
    return DataService.updateRecord('pd_offerings', offeringId, {
      status: newStatus,
      updated_at: nowISO()
    });
  }

  // ═══════════════════════════════════════════════
  // Registration functions
  // ═══════════════════════════════════════════════

  /**
   * Registers a staff member for a PD offering. Auto-waitlists if full.
   */
  function register(offeringId, staffId) {
    var offering = DataService.getRecordById('pd_offerings', offeringId);
    if (!offering) throw new Error('Offering not found: ' + offeringId);
    if (offering.status !== 'published') throw new Error('Cannot register for non-published offering');

    // Check for duplicate
    var existing = DataService.getRelated('pd_registrations', 'offering_id', offeringId);
    var already = existing.filter(function(r) {
      return r.staff_id === staffId && r.status !== 'cancelled';
    });
    if (already.length > 0) throw new Error('Already registered for this offering');

    // Check capacity
    var activeCount = existing.filter(function(r) {
      return r.status === 'registered' || r.status === 'attended';
    }).length;
    var maxCap = Number(offering.max_capacity) || 0;
    var isWaitlisted = maxCap > 0 && activeCount >= maxCap;

    var now = nowISO();
    var waitlistPos = '';
    if (isWaitlisted) {
      var currentWaitlist = existing.filter(function(r) { return r.status === 'waitlisted'; });
      waitlistPos = String(currentWaitlist.length + 1);
    }

    var reg = DataService.createRecord('pd_registrations', {
      offering_id: offeringId,
      staff_id: staffId,
      status: isWaitlisted ? 'waitlisted' : 'registered',
      registered_at: now,
      attended_at: '',
      cancelled_at: '',
      waitlist_position: waitlistPos,
      credit_hours_earned: '',
      created_at: now,
      updated_at: now
    });

    logPDActivity_(offeringId, isWaitlisted ? 'waitlisted' : 'registered', '', '', staffId, staffId);
    return reg;
  }

  /**
   * Cancels a registration. Promotes waitlist if applicable.
   */
  function cancelRegistration(registrationId) {
    var reg = DataService.getRecordById('pd_registrations', registrationId);
    if (!reg) throw new Error('Registration not found: ' + registrationId);

    var wasRegistered = reg.status === 'registered';
    DataService.updateRecord('pd_registrations', registrationId, {
      status: 'cancelled',
      cancelled_at: nowISO(),
      waitlist_position: '',
      updated_at: nowISO()
    });

    logPDActivity_(reg.offering_id, 'cancelled_registration', 'status', reg.status, 'cancelled', reg.staff_id);

    // Promote waitlist if the cancelled person had a slot
    if (wasRegistered) {
      promoteWaitlist_(reg.offering_id);
    }

    return { success: true };
  }

  /**
   * Bulk marks attendance for a list of staff IDs.
   */
  function markAttendance(offeringId, staffIds) {
    var offering = DataService.getRecordById('pd_offerings', offeringId);
    if (!offering) throw new Error('Offering not found: ' + offeringId);

    var creditHours = Number(offering.credit_hours) || 0;
    var regs = DataService.getRelated('pd_registrations', 'offering_id', offeringId);
    var now = nowISO();
    var marked = 0;

    for (var i = 0; i < staffIds.length; i++) {
      var staffId = staffIds[i];
      // Find the registration for this staff
      var reg = null;
      for (var j = 0; j < regs.length; j++) {
        if (regs[j].staff_id === staffId && regs[j].status !== 'cancelled') {
          reg = regs[j];
          break;
        }
      }
      if (reg) {
        DataService.updateRecord('pd_registrations', reg.id, {
          status: 'attended',
          attended_at: now,
          credit_hours_earned: String(creditHours),
          updated_at: now
        });
        marked++;
      }
    }

    logPDActivity_(offeringId, 'attendance_marked', '', '', marked + ' staff attended');
    return { marked: marked };
  }

  /**
   * Returns all registrations for a staff member with offering details.
   */
  function getMyRegistrations(staffId) {
    var allRegs = DataService.getRecords('pd_registrations');
    var myRegs = allRegs.filter(function(r) { return r.staff_id === staffId; });

    // Lookup offerings
    var offeringIds = [];
    myRegs.forEach(function(r) {
      if (offeringIds.indexOf(r.offering_id) === -1) offeringIds.push(r.offering_id);
    });
    var offeringMap = {};
    offeringIds.forEach(function(oid) {
      var o = DataService.getRecordById('pd_offerings', oid);
      if (o) offeringMap[oid] = o;
    });

    // Lookup reflections
    var allReflections = DataService.getRecords('pd_reflections');
    var myReflections = allReflections.filter(function(ref) { return ref.staff_id === staffId; });
    var refByRegId = {};
    myReflections.forEach(function(ref) {
      refByRegId[ref.registration_id] = ref;
    });

    return myRegs.map(function(r) {
      var o = offeringMap[r.offering_id];
      var ref = refByRegId[r.id];
      return {
        id: r.id,
        offeringId: r.offering_id,
        offeringTitle: o ? o.title : 'Unknown',
        category: o ? o.category : '',
        sessionDate: o ? o.session_date : '',
        creditHours: o ? Number(o.credit_hours) || 0 : 0,
        status: r.status,
        registeredAt: r.registered_at,
        attendedAt: r.attended_at,
        creditHoursEarned: Number(r.credit_hours_earned) || 0,
        hasReflection: !!ref,
        reflectionRating: ref ? Number(ref.rating) || 0 : 0
      };
    }).sort(function(a, b) {
      return (b.sessionDate || '').localeCompare(a.sessionDate || '');
    });
  }

  // ═══════════════════════════════════════════════
  // Reflection functions
  // ═══════════════════════════════════════════════

  /**
   * Adds a reflection for a completed PD offering.
   */
  function addReflection(data) {
    validateRequired(data, ['offering_id', 'staff_id', 'rating', 'reflection_text']);

    var rating = Number(data.rating);
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

    // Validate the staff attended this offering
    var regs = DataService.getRelated('pd_registrations', 'offering_id', data.offering_id);
    var attended = regs.filter(function(r) {
      return r.staff_id === data.staff_id && r.status === 'attended';
    });
    if (attended.length === 0) throw new Error('Must have attended the offering to add a reflection');

    // Check for existing reflection
    var existingRefs = DataService.getRelated('pd_reflections', 'offering_id', data.offering_id);
    var already = existingRefs.filter(function(r) { return r.staff_id === data.staff_id; });
    if (already.length > 0) throw new Error('Reflection already exists for this offering');

    var now = nowISO();
    var reflection = DataService.createRecord('pd_reflections', {
      offering_id: data.offering_id,
      staff_id: data.staff_id,
      registration_id: attended[0].id,
      rating: String(rating),
      reflection_text: sanitizeInput(data.reflection_text),
      linked_selection_id: '',
      created_at: now,
      updated_at: now
    });

    logPDActivity_(data.offering_id, 'reflection_added', '', '', 'Rating: ' + rating + '/5', data.staff_id);
    return reflection;
  }

  /**
   * Updates an existing reflection.
   */
  function updateReflection(reflectionId, updates) {
    var existing = DataService.getRecordById('pd_reflections', reflectionId);
    if (!existing) throw new Error('Reflection not found: ' + reflectionId);

    var safeUpdates = {};
    if (updates.rating !== undefined) {
      var rating = Number(updates.rating);
      if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
      safeUpdates.rating = String(rating);
    }
    if (updates.reflection_text !== undefined) {
      safeUpdates.reflection_text = sanitizeInput(updates.reflection_text);
    }

    if (Object.keys(safeUpdates).length === 0) return existing;
    safeUpdates.updated_at = nowISO();

    logPDActivity_(existing.offering_id, 'reflection_updated', '', '', '', existing.staff_id);
    return DataService.updateRecord('pd_reflections', reflectionId, safeUpdates);
  }

  /**
   * Links a reflection to a growth plan standard selection as evidence.
   */
  function linkReflectionToStandard(reflectionId, selectionId) {
    var reflection = DataService.getRecordById('pd_reflections', reflectionId);
    if (!reflection) throw new Error('Reflection not found: ' + reflectionId);

    var selection = DataService.getRecordById('pgp_standard_selections', selectionId);
    if (!selection) throw new Error('Standard selection not found: ' + selectionId);

    // Get offering details for the evidence text
    var offering = DataService.getRecordById('pd_offerings', reflection.offering_id);
    if (!offering) throw new Error('Offering not found for reflection');

    // Build evidence text
    var pdEvidence = '[PD: ' + offering.title + ' (' + offering.session_date + ') - ' + reflection.rating + '\u2605]';
    var currentEvidence = selection.evidence_linked || '';
    var newEvidence = currentEvidence ? currentEvidence + '\n' + pdEvidence : pdEvidence;

    // Update the standard selection via GrowthPlanService
    GrowthPlanService.updateStandardSelection(selectionId, { evidence_linked: newEvidence });

    // Update the reflection with the link
    DataService.updateRecord('pd_reflections', reflectionId, {
      linked_selection_id: selectionId,
      updated_at: nowISO()
    });

    logPDActivity_(reflection.offering_id, 'evidence_linked', '', '', pdEvidence, reflection.staff_id);
    return { success: true, evidenceText: pdEvidence };
  }

  // ═══════════════════════════════════════════════
  // Statistics & reporting
  // ═══════════════════════════════════════════════

  /**
   * Returns aggregate PD statistics for admin reporting.
   */
  function getStats() {
    var allOfferings = DataService.getRecords('pd_offerings');
    var allRegs = DataService.getRecords('pd_registrations');
    var allRefs = DataService.getRecords('pd_reflections');

    var stats = {
      totalOfferings: allOfferings.length,
      publishedCount: 0,
      completedCount: 0,
      totalRegistrations: allRegs.length,
      totalAttended: 0,
      totalCreditHours: 0,
      avgRating: 0,
      byCategory: {},
      topOfferings: []
    };

    // Offering counts by status and category
    allOfferings.forEach(function(o) {
      if (o.status === 'published') stats.publishedCount++;
      if (o.status === 'completed') stats.completedCount++;
      var cat = o.category || 'other';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    });

    // Registration stats
    var attendedByOffering = {};
    allRegs.forEach(function(r) {
      if (r.status === 'attended') {
        stats.totalAttended++;
        stats.totalCreditHours += Number(r.credit_hours_earned) || 0;
        attendedByOffering[r.offering_id] = (attendedByOffering[r.offering_id] || 0) + 1;
      }
    });

    // Average rating
    if (allRefs.length > 0) {
      var totalRating = 0;
      allRefs.forEach(function(r) { totalRating += Number(r.rating) || 0; });
      stats.avgRating = roundTo(totalRating / allRefs.length, 1);
    }

    // Top offerings by attendance
    var offeringMap = {};
    allOfferings.forEach(function(o) { offeringMap[o.id] = o; });
    var topList = Object.keys(attendedByOffering).map(function(oid) {
      var o = offeringMap[oid];
      return {
        id: oid,
        title: o ? o.title : 'Unknown',
        category: o ? o.category : '',
        attendedCount: attendedByOffering[oid]
      };
    });
    topList.sort(function(a, b) { return b.attendedCount - a.attendedCount; });
    stats.topOfferings = topList.slice(0, 5);

    return stats;
  }

  /**
   * Returns PD summary for a specific staff member.
   */
  function getStaffPDSummary(staffId) {
    var allRegs = DataService.getRecords('pd_registrations');
    var myRegs = allRegs.filter(function(r) { return r.staff_id === staffId; });
    var allRefs = DataService.getRecords('pd_reflections');
    var myRefs = allRefs.filter(function(r) { return r.staff_id === staffId; });

    var attended = 0;
    var totalCredits = 0;
    var byCategory = {};

    // Lookup offerings for category
    var offeringMap = {};
    var allOfferings = DataService.getRecords('pd_offerings');
    allOfferings.forEach(function(o) { offeringMap[o.id] = o; });

    myRegs.forEach(function(r) {
      if (r.status === 'attended') {
        attended++;
        totalCredits += Number(r.credit_hours_earned) || 0;
        var o = offeringMap[r.offering_id];
        if (o) {
          var cat = o.category || 'other';
          byCategory[cat] = (byCategory[cat] || 0) + 1;
        }
      }
    });

    var avgRating = 0;
    if (myRefs.length > 0) {
      var total = 0;
      myRefs.forEach(function(r) { total += Number(r.rating) || 0; });
      avgRating = roundTo(total / myRefs.length, 1);
    }

    return {
      attended: attended,
      totalCreditHours: totalCredits,
      reflectionCount: myRefs.length,
      avgRating: avgRating,
      byCategory: byCategory,
      totalRegistrations: myRegs.length
    };
  }

  /**
   * Returns published PD offerings related to a specific standard.
   */
  function getRecommendedForStandard(standardId) {
    var allOfferings = DataService.getRecords('pd_offerings');
    var recommended = allOfferings.filter(function(o) {
      if (o.status !== 'published') return false;
      var ids = (o.related_standards_csv || '').split(',');
      for (var i = 0; i < ids.length; i++) {
        if (ids[i].trim() === standardId) return true;
      }
      return false;
    });

    var sMap = staffMap_();
    return recommended.map(function(o) {
      return {
        id: o.id,
        title: o.title,
        category: o.category,
        sessionDate: o.session_date,
        startTime: o.start_time,
        endTime: o.end_time,
        location: o.location,
        creditHours: Number(o.credit_hours) || 0,
        facilitatorName: staffName_(sMap, o.facilitator_id)
      };
    }).sort(function(a, b) {
      return (a.sessionDate || '').localeCompare(b.sessionDate || '');
    });
  }

  /**
   * Returns activity log for a specific offering.
   */
  function getActivity(offeringId, limit) {
    var activities = DataService.getRelated('pd_activity', 'offering_id', offeringId);
    activities.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
    var sliced = activities.slice(0, limit || 20);
    return hydratePDActivity_(sliced);
  }

  // ═══════════════════════════════════════════════
  // Return public API
  // ═══════════════════════════════════════════════

  return {
    // Offerings
    getOverview: getOverview,
    getOfferingDetail: getOfferingDetail,
    createOffering: createOffering,
    updateOffering: updateOffering,
    deleteOffering: deleteOffering,
    updateOfferingStatus: updateOfferingStatus,
    // Registrations
    register: register,
    cancelRegistration: cancelRegistration,
    markAttendance: markAttendance,
    getMyRegistrations: getMyRegistrations,
    // Reflections
    addReflection: addReflection,
    updateReflection: updateReflection,
    linkReflectionToStandard: linkReflectionToStandard,
    // Stats & reporting
    getStats: getStats,
    getStaffPDSummary: getStaffPDSummary,
    getRecommendedForStandard: getRecommendedForStandard,
    getActivity: getActivity
  };

})();
