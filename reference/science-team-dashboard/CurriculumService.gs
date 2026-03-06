/**
 * CurriculumService.gs
 * Backend logic for the Curriculum Scope & Sequence board.
 * Manages CurriculumCourses and CurriculumUnits tabs.
 */

const CurriculumService = (function() {

  const COURSES_SHEET = 'CurriculumCourses';
  const UNITS_SHEET   = 'CurriculumUnits';

  // ==================== Board Loader ====================

  /**
   * Get the full curriculum board: courses (sorted) + non-archived units grouped by course.
   * Single call for initial page load.
   * @returns {Object} { courses: [...], units: { courseId: [...] } }
   */
  function getCurriculumBoard() {
    try {
      const courses = DataService.getSheetData(COURSES_SHEET)
        .filter(c => c.IsActive !== false && c.IsActive !== 'false')
        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));

      const allUnits = DataService.getSheetData(UNITS_SHEET)
        .filter(u => u.Status !== 'Archived');

      // Group units by CourseId
      const unitsByCourse = {};
      courses.forEach(c => { unitsByCourse[c.CourseId] = []; });

      allUnits.forEach(u => {
        if (unitsByCourse[u.CourseId]) {
          unitsByCourse[u.CourseId].push(u);
        }
      });

      // Sort units within each course by SortOrder
      Object.keys(unitsByCourse).forEach(courseId => {
        unitsByCourse[courseId].sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
      });

      return { courses: courses, units: unitsByCourse };
    } catch (error) {
      logError('getCurriculumBoard', error);
      throw new Error(error.message);
    }
  }

  // ==================== Course CRUD ====================

  /**
   * Get all active courses sorted by SortOrder.
   * @returns {Array<Object>}
   */
  function getCourses() {
    try {
      return DataService.getSheetData(COURSES_SHEET)
        .filter(c => c.IsActive !== false && c.IsActive !== 'false')
        .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
    } catch (error) {
      logError('getCourses', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a new course (admin only).
   * @param {Object} data - { name, gradeLevel, school, color, description }
   * @returns {Object} the created course
   */
  function createCourse(data) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can create courses.');
      if (!data.name || !data.name.trim()) throw new Error('Course name is required.');

      // Auto sort order: max + 1
      const existing = DataService.getSheetData(COURSES_SHEET);
      let maxSort = 0;
      existing.forEach(c => { if ((c.SortOrder || 0) > maxSort) maxSort = c.SortOrder; });

      const course = {
        CourseId: generateId('course_'),
        Name: data.name.trim(),
        GradeLevel: data.gradeLevel || '',
        School: data.school || 'ALL',
        SortOrder: maxSort + 1,
        Color: data.color || '#0d6efd',
        Description: data.description || '',
        IsActive: true,
        CreatedBy: user.email,
        CreatedDate: new Date().toISOString()
      };

      DataService.appendRow(COURSES_SHEET, course);
      return course;
    } catch (error) {
      logError('createCourse', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update a course (admin only).
   * @param {string} courseId
   * @param {Object} data - fields to update
   * @returns {Object} the updated course
   */
  function updateCourse(courseId, data) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can edit courses.');

      const courses = DataService.getSheetData(COURSES_SHEET);
      const idx = courses.findIndex(c => c.CourseId === courseId);
      if (idx === -1) throw new Error('Course not found.');

      const course = courses[idx];
      if (data.name !== undefined) course.Name = data.name.trim();
      if (data.gradeLevel !== undefined) course.GradeLevel = data.gradeLevel;
      if (data.school !== undefined) course.School = data.school;
      if (data.color !== undefined) course.Color = data.color;
      if (data.description !== undefined) course.Description = data.description;
      if (data.isActive !== undefined) course.IsActive = data.isActive;

      DataService.updateRow(COURSES_SHEET, idx, course);
      return course;
    } catch (error) {
      logError('updateCourse', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a course (admin only). Fails if non-archived units exist.
   * @param {string} courseId
   * @returns {Object} { success: true }
   */
  function deleteCourse(courseId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can delete courses.');

      const units = DataService.getSheetData(UNITS_SHEET);
      const activeUnits = units.filter(u => u.CourseId === courseId && u.Status !== 'Archived');
      if (activeUnits.length > 0) {
        throw new Error('Cannot delete course with ' + activeUnits.length + ' active units. Archive or move them first.');
      }

      const idx = DataService.findRowIndex(COURSES_SHEET, 'CourseId', courseId);
      if (idx === -1) throw new Error('Course not found.');

      DataService.deleteRow(COURSES_SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteCourse', error);
      throw new Error(error.message);
    }
  }

  /**
   * Reorder courses by an array of CourseIds (admin only).
   * @param {Array<string>} orderedIds
   * @returns {Object} { success: true }
   */
  function reorderCourses(orderedIds) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can reorder courses.');

      const courses = DataService.getSheetData(COURSES_SHEET);
      orderedIds.forEach((id, i) => {
        const idx = courses.findIndex(c => c.CourseId === id);
        if (idx !== -1) {
          courses[idx].SortOrder = i + 1;
          DataService.updateRow(COURSES_SHEET, idx, courses[idx]);
        }
      });

      return { success: true };
    } catch (error) {
      logError('reorderCourses', error);
      throw new Error(error.message);
    }
  }

  // ==================== Unit CRUD ====================

  /**
   * Get all non-archived units.
   * @returns {Array<Object>}
   */
  function getAllUnits() {
    try {
      return DataService.getSheetData(UNITS_SHEET)
        .filter(u => u.Status !== 'Archived');
    } catch (error) {
      logError('getAllUnits', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a new unit. Any user can create (starts as Draft).
   * @param {Object} data - { courseId, title, duration, description, topicArea, topicColor, standards, essentialQuestions, resources, assessments, crossCurricular, prerequisites, teacherNotes }
   * @returns {Object} the created unit
   */
  function createUnit(data) {
    try {
      if (!data.title || !data.title.trim()) throw new Error('Unit title is required.');
      if (!data.courseId) throw new Error('Course is required.');
      const user = getCurrentUser();

      // Auto sort order within course
      const allUnits = DataService.getSheetData(UNITS_SHEET);
      let maxSort = 0;
      allUnits.forEach(u => {
        if (u.CourseId === data.courseId && (u.SortOrder || 0) > maxSort) maxSort = u.SortOrder;
      });

      const unit = {
        UnitId: generateId('unit_'),
        CourseId: data.courseId,
        Title: data.title.trim(),
        Duration: data.duration || 0,
        Description: data.description || '',
        TopicArea: data.topicArea || '',
        TopicColor: data.topicColor || '',
        SortOrder: maxSort + 1,
        Standards: ensureJsonString(data.standards),
        EssentialQuestions: ensureJsonString(data.essentialQuestions),
        Resources: ensureJsonString(data.resources),
        Assessments: ensureJsonString(data.assessments),
        CrossCurricular: data.crossCurricular || '',
        Prerequisites: ensureJsonString(data.prerequisites),
        TeacherNotes: data.teacherNotes || '',
        Status: 'Draft',
        CreatedBy: user.email,
        CreatedDate: new Date().toISOString(),
        LastEditedBy: user.email,
        LastEditedDate: new Date().toISOString(),
        OriginalUnitId: ''
      };

      DataService.appendRow(UNITS_SHEET, unit);
      return unit;
    } catch (error) {
      logError('createUnit', error);
      throw new Error(error.message);
    }
  }

  /**
   * Update a unit. Author can edit own Draft; admin can edit anything.
   * @param {string} unitId
   * @param {Object} data - fields to update
   * @returns {Object} the updated unit
   */
  function updateUnit(unitId, data) {
    try {
      const user = getCurrentUser();
      const units = DataService.getSheetData(UNITS_SHEET);
      const idx = units.findIndex(u => u.UnitId === unitId);
      if (idx === -1) throw new Error('Unit not found.');

      const unit = units[idx];

      // Permission: admin can edit anything; author can edit own Draft
      if (!user.isAdmin) {
        if (unit.CreatedBy !== user.email) {
          throw new Error('You can only edit units you created.');
        }
        if (unit.Status !== 'Draft') {
          throw new Error('Non-admin users can only edit Draft units.');
        }
      }

      if (data.title !== undefined) unit.Title = data.title.trim();
      if (data.duration !== undefined) unit.Duration = data.duration;
      if (data.description !== undefined) unit.Description = data.description;
      if (data.topicArea !== undefined) unit.TopicArea = data.topicArea;
      if (data.topicColor !== undefined) unit.TopicColor = data.topicColor;
      if (data.standards !== undefined) unit.Standards = ensureJsonString(data.standards);
      if (data.essentialQuestions !== undefined) unit.EssentialQuestions = ensureJsonString(data.essentialQuestions);
      if (data.resources !== undefined) unit.Resources = ensureJsonString(data.resources);
      if (data.assessments !== undefined) unit.Assessments = ensureJsonString(data.assessments);
      if (data.crossCurricular !== undefined) unit.CrossCurricular = data.crossCurricular;
      if (data.prerequisites !== undefined) unit.Prerequisites = ensureJsonString(data.prerequisites);
      if (data.teacherNotes !== undefined) unit.TeacherNotes = data.teacherNotes;

      unit.LastEditedBy = user.email;
      unit.LastEditedDate = new Date().toISOString();

      DataService.updateRow(UNITS_SHEET, idx, unit);
      return unit;
    } catch (error) {
      logError('updateUnit', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a unit. Author can delete own Draft; admin can delete anything.
   * @param {string} unitId
   * @returns {Object} { success: true }
   */
  function deleteUnit(unitId) {
    try {
      const user = getCurrentUser();
      const units = DataService.getSheetData(UNITS_SHEET);
      const idx = units.findIndex(u => u.UnitId === unitId);
      if (idx === -1) throw new Error('Unit not found.');

      const unit = units[idx];
      if (!user.isAdmin) {
        if (unit.CreatedBy !== user.email) throw new Error('You can only delete units you created.');
        if (unit.Status !== 'Draft') throw new Error('Non-admin users can only delete Draft units.');
      }

      DataService.deleteRow(UNITS_SHEET, idx);
      return { success: true };
    } catch (error) {
      logError('deleteUnit', error);
      throw new Error(error.message);
    }
  }

  /**
   * Reorder units within a course lane.
   * @param {string} courseId
   * @param {Array<string>} orderedUnitIds
   * @returns {Object} { success: true }
   */
  function reorderUnits(courseId, orderedUnitIds) {
    try {
      const units = DataService.getSheetData(UNITS_SHEET);

      orderedUnitIds.forEach((id, i) => {
        const idx = units.findIndex(u => u.UnitId === id);
        if (idx !== -1) {
          units[idx].SortOrder = i + 1;
          DataService.updateRow(UNITS_SHEET, idx, units[idx]);
        }
      });

      return { success: true };
    } catch (error) {
      logError('reorderUnits', error);
      throw new Error(error.message);
    }
  }

  /**
   * Move a unit to a different course lane with a new sort order.
   * @param {string} unitId
   * @param {string} newCourseId
   * @param {number} newSortOrder
   * @returns {Object} { success: true }
   */
  function moveUnitToCourse(unitId, newCourseId, newSortOrder) {
    try {
      const units = DataService.getSheetData(UNITS_SHEET);
      const idx = units.findIndex(u => u.UnitId === unitId);
      if (idx === -1) throw new Error('Unit not found.');

      units[idx].CourseId = newCourseId;
      units[idx].SortOrder = newSortOrder;
      DataService.updateRow(UNITS_SHEET, idx, units[idx]);

      return { success: true };
    } catch (error) {
      logError('moveUnitToCourse', error);
      throw new Error(error.message);
    }
  }

  // ==================== Workflow ====================

  /**
   * Propose a unit for approval: Draft -> Proposed (author only).
   * @param {string} unitId
   * @returns {Object} the updated unit
   */
  function proposeUnit(unitId) {
    try {
      const user = getCurrentUser();
      const units = DataService.getSheetData(UNITS_SHEET);
      const idx = units.findIndex(u => u.UnitId === unitId);
      if (idx === -1) throw new Error('Unit not found.');

      const unit = units[idx];
      if (unit.Status !== 'Draft') throw new Error('Only Draft units can be proposed.');
      if (!user.isAdmin && unit.CreatedBy !== user.email) {
        throw new Error('Only the author can propose a unit.');
      }

      unit.Status = 'Proposed';
      unit.LastEditedBy = user.email;
      unit.LastEditedDate = new Date().toISOString();
      DataService.updateRow(UNITS_SHEET, idx, unit);

      return unit;
    } catch (error) {
      logError('proposeUnit', error);
      throw new Error(error.message);
    }
  }

  /**
   * Approve a unit: Proposed -> Approved (admin only).
   * If the unit has OriginalUnitId, merge changes into original and archive the copy.
   * @param {string} unitId
   * @returns {Object} the approved unit (or merged original)
   */
  function approveUnit(unitId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can approve units.');

      const units = DataService.getSheetData(UNITS_SHEET);
      const idx = units.findIndex(u => u.UnitId === unitId);
      if (idx === -1) throw new Error('Unit not found.');

      const unit = units[idx];
      if (unit.Status !== 'Proposed') throw new Error('Only Proposed units can be approved.');

      // Check if this is a "propose edit" copy
      if (unit.OriginalUnitId) {
        // Merge into original
        const origIdx = units.findIndex(u => u.UnitId === unit.OriginalUnitId);
        if (origIdx !== -1) {
          const orig = units[origIdx];
          // Copy editable fields from the proposed copy to the original
          orig.Title = unit.Title;
          orig.Duration = unit.Duration;
          orig.Description = unit.Description;
          orig.TopicArea = unit.TopicArea;
          orig.TopicColor = unit.TopicColor;
          orig.Standards = unit.Standards;
          orig.EssentialQuestions = unit.EssentialQuestions;
          orig.Resources = unit.Resources;
          orig.Assessments = unit.Assessments;
          orig.CrossCurricular = unit.CrossCurricular;
          orig.Prerequisites = unit.Prerequisites;
          orig.TeacherNotes = unit.TeacherNotes;
          orig.LastEditedBy = user.email;
          orig.LastEditedDate = new Date().toISOString();
          DataService.updateRow(UNITS_SHEET, origIdx, orig);

          // Archive the copy
          unit.Status = 'Archived';
          unit.LastEditedBy = user.email;
          unit.LastEditedDate = new Date().toISOString();
          DataService.updateRow(UNITS_SHEET, idx, unit);

          return orig;
        }
      }

      // Normal approval
      unit.Status = 'Approved';
      unit.LastEditedBy = user.email;
      unit.LastEditedDate = new Date().toISOString();
      DataService.updateRow(UNITS_SHEET, idx, unit);

      return unit;
    } catch (error) {
      logError('approveUnit', error);
      throw new Error(error.message);
    }
  }

  /**
   * Reject a proposed unit: Proposed -> Draft (admin only).
   * @param {string} unitId
   * @returns {Object} the updated unit
   */
  function rejectUnit(unitId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can reject units.');

      const units = DataService.getSheetData(UNITS_SHEET);
      const idx = units.findIndex(u => u.UnitId === unitId);
      if (idx === -1) throw new Error('Unit not found.');

      const unit = units[idx];
      if (unit.Status !== 'Proposed') throw new Error('Only Proposed units can be rejected.');

      unit.Status = 'Draft';
      unit.LastEditedBy = user.email;
      unit.LastEditedDate = new Date().toISOString();
      DataService.updateRow(UNITS_SHEET, idx, unit);

      return unit;
    } catch (error) {
      logError('rejectUnit', error);
      throw new Error(error.message);
    }
  }

  /**
   * Archive a unit (admin only).
   * @param {string} unitId
   * @returns {Object} the updated unit
   */
  function archiveUnit(unitId) {
    try {
      const user = getCurrentUser();
      if (!user.isAdmin) throw new Error('Only admins can archive units.');

      const units = DataService.getSheetData(UNITS_SHEET);
      const idx = units.findIndex(u => u.UnitId === unitId);
      if (idx === -1) throw new Error('Unit not found.');

      const unit = units[idx];
      unit.Status = 'Archived';
      unit.LastEditedBy = user.email;
      unit.LastEditedDate = new Date().toISOString();
      DataService.updateRow(UNITS_SHEET, idx, unit);

      return unit;
    } catch (error) {
      logError('archiveUnit', error);
      throw new Error(error.message);
    }
  }

  /**
   * Propose an edit to an approved unit: creates a Draft copy with OriginalUnitId set.
   * @param {string} unitId - the approved unit to propose changes to
   * @returns {Object} the new Draft copy
   */
  function proposeEditToUnit(unitId) {
    try {
      const user = getCurrentUser();
      const units = DataService.getSheetData(UNITS_SHEET);
      const original = units.find(u => u.UnitId === unitId);
      if (!original) throw new Error('Unit not found.');
      if (original.Status !== 'Approved') throw new Error('Can only propose edits to Approved units.');

      // Create a Draft copy
      const copy = {
        UnitId: generateId('unit_'),
        CourseId: original.CourseId,
        Title: original.Title,
        Duration: original.Duration,
        Description: original.Description,
        TopicArea: original.TopicArea,
        TopicColor: original.TopicColor,
        SortOrder: original.SortOrder,
        Standards: original.Standards,
        EssentialQuestions: original.EssentialQuestions,
        Resources: original.Resources,
        Assessments: original.Assessments,
        CrossCurricular: original.CrossCurricular,
        Prerequisites: original.Prerequisites,
        TeacherNotes: original.TeacherNotes,
        Status: 'Draft',
        CreatedBy: user.email,
        CreatedDate: new Date().toISOString(),
        LastEditedBy: user.email,
        LastEditedDate: new Date().toISOString(),
        OriginalUnitId: unitId
      };

      DataService.appendRow(UNITS_SHEET, copy);
      return copy;
    } catch (error) {
      logError('proposeEditToUnit', error);
      throw new Error(error.message);
    }
  }

  // ==================== Private Helpers ====================

  /**
   * Ensure a value is stored as a JSON string. If already a string, leave it.
   * If it's an array/object, stringify it. If empty, return '[]'.
   */
  function ensureJsonString(value) {
    if (!value) return '[]';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  // ==================== Public API ====================

  return {
    getCurriculumBoard,
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    reorderCourses,
    getAllUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    reorderUnits,
    moveUnitToCourse,
    proposeUnit,
    approveUnit,
    rejectUnit,
    archiveUnit,
    proposeEditToUnit
  };

})();
