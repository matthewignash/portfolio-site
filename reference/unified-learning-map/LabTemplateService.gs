/**
 * Lab Template Service — Template CRUD & Preloaded Templates
 *
 * Manages lab report templates stored in the external LabReports spreadsheet.
 * Templates define the structure of a lab report (which sections, in what order,
 * with what scaffolding). Teachers can use preloaded templates or create custom ones.
 *
 * Uses LabConfigService.gs helpers: readLabSheet_, findLabRows_, appendLabRow_,
 * updateLabRow_, deleteLabRow_.
 *
 * Uses LabFrameworks.gs: LAB_SECTION_TYPES, lookupSectionType_().
 *
 * @version 1.0.0
 */


// ============================================================================
// VALID SECTION TYPES (for validation)
// ============================================================================

const VALID_SECTION_TYPES_ = [
  'title_page', 'research_question', 'background', 'hypothesis', 'variables',
  'materials', 'procedure', 'safety', 'raw_data', 'data_processing',
  'analysis', 'conclusion', 'evaluation', 'reflection', 'bibliography', 'custom'
];

const VALID_TEMPLATE_STATUSES_ = ['draft', 'published', 'archived'];


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Get all lab templates.
 * Teacher/admin only. Returns both custom and preloaded templates.
 *
 * @returns {Object} { templates: Array, preloaded: Array }
 */
function getLabTemplates() {
  requireRole(['administrator', 'teacher']);

  let custom = [];
  try {
    custom = readLabSheet_('LabTemplates');
    // Parse sectionsJson for each template
    for (let i = 0; i < custom.length; i++) {
      custom[i].sectionsJson = parseJsonSafe_(custom[i].sectionsJson);
      custom[i].isPreloaded = false;
    }
  } catch (e) {
    Logger.log('getLabTemplates: custom templates unavailable: ' + e.message);
  }

  return {
    templates: custom,
    preloaded: getPreloadedTemplates()
  };
}


/**
 * Get a single lab template by ID.
 * Teacher/admin only.
 *
 * @param {string} templateId - Template ID
 * @returns {Object} Template object with parsed sectionsJson
 */
function getLabTemplate(templateId) {
  requireRole(['administrator', 'teacher']);
  if (!templateId) throw new Error('Template ID is required.');

  // Check preloaded first
  const preloaded = getPreloadedTemplates();
  for (let i = 0; i < preloaded.length; i++) {
    if (preloaded[i].templateId === templateId) {
      return preloaded[i];
    }
  }

  // Check custom templates
  const rows = findLabRows_('LabTemplates', 'templateId', templateId);
  if (rows.length === 0) throw new Error('Template not found: ' + templateId);

  const tpl = rows[0];
  tpl.sectionsJson = parseJsonSafe_(tpl.sectionsJson);
  tpl.isPreloaded = false;
  return tpl;
}


/**
 * Save a lab template (create or update).
 * Teacher/admin only.
 *
 * @param {Object} template - Template data
 * @param {string} [template.templateId] - If provided, update; if absent, create
 * @param {string} template.title - Template title (required, max 200 chars)
 * @param {string} [template.gradeband] - Grade band (e.g. 'MYP-Y4-5')
 * @param {string} [template.framework] - Primary framework ID
 * @param {Array}  template.sections - Array of section definitions
 * @param {string} [template.status] - draft / published / archived
 * @returns {Object} { success: true, templateId }
 */
function saveLabTemplate(template) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!template) throw new Error('Template data is required.');
  if (!template.title || typeof template.title !== 'string' || template.title.trim().length === 0) {
    throw new Error('Template title is required.');
  }
  if (template.title.length > 200) {
    throw new Error('Template title must be 200 characters or less.');
  }

  // Validate sections
  const sections = template.sections || [];
  if (sections.length === 0) {
    throw new Error('Template must have at least one section.');
  }
  if (sections.length > 20) {
    throw new Error('Template can have at most 20 sections.');
  }
  validateTemplateSections_(sections);

  const ts = now_();
  const status = template.status && VALID_TEMPLATE_STATUSES_.indexOf(template.status) !== -1
    ? template.status : 'draft';

  const sectionsStr = JSON.stringify(sections);

  if (template.templateId) {
    // Update existing
    const updated = updateLabRow_('LabTemplates', 'templateId', template.templateId, {
      title: template.title.trim(),
      gradeband: template.gradeband || '',
      framework: template.framework || '',
      sectionsJson: sectionsStr,
      status: status,
      updatedAt: ts
    });
    if (!updated) throw new Error('Template not found for update: ' + template.templateId);
    return { success: true, templateId: template.templateId };
  } else {
    // Create new
    const templateId = generateLabTemplateId_();
    appendLabRow_('LabTemplates', {
      templateId: templateId,
      title: template.title.trim(),
      gradeband: template.gradeband || '',
      framework: template.framework || '',
      sectionsJson: sectionsStr,
      createdBy: user.email,
      status: status,
      createdAt: ts,
      updatedAt: ts
    });
    return { success: true, templateId: templateId };
  }
}


/**
 * Delete a lab template.
 * Teacher/admin only. Cannot delete preloaded templates.
 *
 * @param {string} templateId - Template ID to delete
 * @returns {Object} { success: true }
 */
function deleteLabTemplate(templateId) {
  requireRole(['administrator', 'teacher']);
  if (!templateId) throw new Error('Template ID is required.');

  // Block deleting preloaded templates
  if (String(templateId).indexOf('preload-') === 0) {
    throw new Error('Cannot delete a preloaded template.');
  }

  // Check if any assignments use this template
  const assignments = findLabRows_('LabAssignments', 'templateId', templateId);
  if (assignments.length > 0) {
    throw new Error('Cannot delete template: ' + assignments.length + ' assignment(s) are using it. Archive it instead.');
  }

  const deleted = deleteLabRow_('LabTemplates', 'templateId', templateId);
  if (!deleted) throw new Error('Template not found: ' + templateId);
  return { success: true };
}


/**
 * Duplicate a lab template (creates a copy with new ID).
 * Teacher/admin only. Works for both preloaded and custom templates.
 *
 * @param {string} sourceTemplateId - Template to duplicate
 * @param {string} [newTitle] - Optional new title (defaults to "Copy of [original]")
 * @returns {Object} { success: true, templateId }
 */
function duplicateLabTemplate(sourceTemplateId, newTitle) {
  requireRole(['administrator', 'teacher']);
  const user = getCurrentUser();
  if (!sourceTemplateId) throw new Error('Source template ID is required.');

  const source = getLabTemplate(sourceTemplateId);
  const ts = now_();
  const templateId = generateLabTemplateId_();
  const title = newTitle && newTitle.trim().length > 0
    ? newTitle.trim()
    : 'Copy of ' + source.title;

  if (title.length > 200) {
    throw new Error('Template title must be 200 characters or less.');
  }

  const sections = source.sectionsJson || source.sections || [];

  appendLabRow_('LabTemplates', {
    templateId: templateId,
    title: title,
    gradeband: source.gradeband || '',
    framework: source.framework || '',
    sectionsJson: JSON.stringify(sections),
    createdBy: user.email,
    status: 'draft',
    createdAt: ts,
    updatedAt: ts
  });

  return { success: true, templateId: templateId };
}


// ============================================================================
// PRELOADED TEMPLATES (Hardcoded, read-only)
// ============================================================================

/**
 * Get the 5 built-in preloaded templates.
 * These are hardcoded and cannot be edited or deleted.
 *
 * @returns {Array<Object>} Preloaded template objects
 */
function getPreloadedTemplates() {
  return [
    buildPreloadedMypFull_(),
    buildPreloadedDpIa_(),
    buildPreloadedAp_(),
    buildPreloadedQuickLab_(),
    buildPreloadedGuidedInquiry_()
  ];
}


// ── Template 1: IB MYP Full Investigation (Criteria B+C) ───────────────

function buildPreloadedMypFull_() {
  return {
    templateId: 'preload-myp-full',
    title: 'IB MYP Full Investigation',
    gradeband: 'MYP-Y4-5',
    framework: 'IB-MYP-SCI',
    isPreloaded: true,
    status: 'published',
    createdBy: 'system',
    sectionsJson: [
      buildSection_('sec-myp-01', 'research_question', 'Research Question', 1, true,
        'State the research question your investigation will address.',
        'A good research question is specific, measurable, and investigable. It identifies the independent and dependent variables.',
        { min: 15, max: 80 }, ['QD'], ['MYP-SCI-B'],
        {
          high: {
            sentenceStarters: ['How does [independent variable] affect [dependent variable]?'],
            guideQuestions: ['What are you changing?', 'What are you measuring?', 'Can this be tested with an experiment?']
          },
          medium: { sentenceStarters: ['How does ___ affect ___?'] },
          low: {}, none: {}
        }),
      buildSection_('sec-myp-02', 'hypothesis', 'Hypothesis', 2, true,
        'State your hypothesis. What do you predict will happen and why?',
        'A good hypothesis is testable and includes both the prediction (what) and the reasoning (why, based on science).',
        { min: 30, max: 150 }, ['HP'], ['MYP-SCI-B'],
        {
          high: {
            sentenceStarters: ['If [independent variable] is [changed how], then [dependent variable] will [prediction] because [scientific reasoning].'],
            guideQuestions: ['What is your independent variable?', 'What do you think will happen to the dependent variable?', 'What science concept explains your prediction?']
          },
          medium: { sentenceStarters: ['If ___, then ___ because ___.'] },
          low: {}, none: {}
        }),
      buildSection_('sec-myp-03', 'variables', 'Variables', 3, true,
        'Identify and explain your independent, dependent, and controlled variables.',
        'Clearly explain how you will manipulate the IV, measure the DV, and keep controlled variables constant.',
        null, ['DI'], ['MYP-SCI-B'],
        {
          high: {
            guideQuestions: ['What one thing are you changing (IV)?', 'What are you measuring (DV)?', 'What are you keeping the same (controlled)?', 'How will you control each variable?']
          },
          medium: {}, low: {}, none: {}
        }),
      buildSection_('sec-myp-04', 'materials', 'Materials', 4, true,
        'List all materials and equipment needed for the investigation.',
        'Include quantities, sizes, and specifications. Be precise enough for someone to replicate your experiment.',
        null, ['DI'], ['MYP-SCI-B'], null),
      buildSection_('sec-myp-05', 'procedure', 'Procedure', 5, true,
        'Write step-by-step instructions for carrying out the investigation.',
        'Your method should be detailed enough for another student to follow exactly. Include safety precautions.',
        { min: 50, max: 500 }, ['DI'], ['MYP-SCI-B'],
        {
          high: {
            guideQuestions: ['How will you set up the equipment?', 'What measurements will you take?', 'How many trials will you do?', 'How will you ensure a fair test?']
          },
          medium: {}, low: {}, none: {}
        }),
      buildSection_('sec-myp-06', 'safety', 'Safety Considerations', 6, true,
        'Identify potential hazards and explain how you will manage safety risks.',
        'Consider chemical, physical, and biological hazards. Describe protective measures.',
        { min: 20, max: 200 }, ['DI'], ['MYP-SCI-B'], null),
      buildSection_('sec-myp-07', 'raw_data', 'Raw Data', 7, true,
        'Record your raw, unprocessed data in a clear and organized table.',
        'Include units, uncertainties where appropriate, and enough trials for reliability.',
        null, ['CD'], ['MYP-SCI-C'], null),
      buildSection_('sec-myp-08', 'data_processing', 'Data Processing', 8, true,
        'Process your raw data. Calculate averages, create graphs, or perform other appropriate analysis.',
        'Show your calculations clearly. Choose appropriate graph types. Label axes with units.',
        { min: 30, max: 400 }, ['PA'], ['MYP-SCI-C'], null),
      buildSection_('sec-myp-09', 'analysis', 'Analysis', 9, true,
        'Interpret your processed data. Describe patterns, trends, and relationships.',
        'Use your data as evidence. Refer to specific values from your results to support your claims.',
        { min: 50, max: 400 }, ['PA', 'EC'], ['MYP-SCI-C'],
        {
          high: {
            guideQuestions: ['What patterns do you see in your data?', 'How does the data relate to your hypothesis?', 'Are there any anomalies or unexpected results?']
          },
          medium: {}, low: {}, none: {}
        }),
      buildSection_('sec-myp-10', 'conclusion', 'Conclusion', 10, true,
        'State your conclusion. Was your hypothesis supported? Use evidence from your data.',
        'Directly address your research question and hypothesis. Cite specific data to support your claims.',
        { min: 50, max: 300 }, ['EC'], ['MYP-SCI-C'],
        {
          high: {
            sentenceStarters: ['Based on the data collected, [the hypothesis was / was not] supported because [evidence from results].'],
            guideQuestions: ['Does your data support or refute your hypothesis?', 'What specific evidence supports your conclusion?', 'How confident are you in your results?']
          },
          medium: { sentenceStarters: ['Based on the data, ___ because ___.'] },
          low: {}, none: {}
        }),
      buildSection_('sec-myp-11', 'evaluation', 'Evaluation', 11, true,
        'Evaluate the validity of your method and suggest improvements.',
        'Discuss sources of error, limitations, and how they may have affected your results. Suggest realistic improvements.',
        { min: 80, max: 400 }, ['EC', 'RC'], ['MYP-SCI-C'],
        {
          high: {
            guideQuestions: ['Was your method valid? Why or why not?', 'What were the main sources of error?', 'How could you improve the investigation?', 'What extensions could you suggest?']
          },
          medium: {}, low: {}, none: {}
        })
    ]
  };
}


// ── Template 2: IB DP Internal Assessment ───────────────────────────────

function buildPreloadedDpIa_() {
  return {
    templateId: 'preload-dp-ia',
    title: 'IB DP Internal Assessment',
    gradeband: 'DP',
    framework: 'IB-DP-IA',
    isPreloaded: true,
    status: 'published',
    createdBy: 'system',
    sectionsJson: [
      buildSection_('sec-dp-01', 'title_page', 'Title Page', 1, true,
        'Include your IA title, candidate details, and word count.',
        'The title should clearly describe the focus of your investigation. Max report length: 3000 words.',
        null, [], [], null),
      buildSection_('sec-dp-02', 'research_question', 'Research Question', 2, true,
        'State a focused, relevant, and feasible research question.',
        'Your RQ should be specific enough to investigate within the scope of an IA. It should include measurable variables.',
        { min: 15, max: 100 }, ['QD'], ['DP-IA-RD'], null),
      buildSection_('sec-dp-03', 'background', 'Background & Context', 3, true,
        'Provide the scientific context for your investigation. Explain relevant theory and prior research.',
        'Situate your investigation within the broader scientific context. Explain the theory that underpins your hypothesis.',
        { min: 100, max: 500 }, ['QD', 'RC'], ['DP-IA-RD'], null),
      buildSection_('sec-dp-04', 'hypothesis', 'Hypothesis', 4, true,
        'Formulate a testable hypothesis based on scientific reasoning.',
        'Your hypothesis should be directly testable by your experimental design and grounded in the theory from your background section.',
        { min: 30, max: 200 }, ['HP'], ['DP-IA-RD'], null),
      buildSection_('sec-dp-05', 'variables', 'Variables', 5, true,
        'Clearly identify all variables: independent, dependent, and controlled.',
        'Explain how each variable will be manipulated, measured, or kept constant. Include units and ranges.',
        null, ['DI'], ['DP-IA-RD'], null),
      buildSection_('sec-dp-06', 'procedure', 'Methodology', 6, true,
        'Describe your experimental procedure in sufficient detail for replication.',
        'Your methodology must be clear, complete, and appropriate for addressing the research question. Include diagrams if helpful.',
        { min: 100, max: 600 }, ['DI'], ['DP-IA-RD'], null),
      buildSection_('sec-dp-07', 'safety', 'Safety, Ethical & Environmental Considerations', 7, true,
        'Address all safety, ethical, and environmental considerations.',
        'Identify hazards and precautions. Consider ethical implications and environmental impact of your investigation.',
        { min: 30, max: 200 }, ['DI'], ['DP-IA-RD'], null),
      buildSection_('sec-dp-08', 'raw_data', 'Raw Data', 8, true,
        'Present your raw data in organized tables with appropriate precision and units.',
        'Include uncertainties. Record data accurately. Ensure sufficient data points for reliable analysis.',
        null, ['CD'], ['DP-IA-DA'], null),
      buildSection_('sec-dp-09', 'data_processing', 'Data Processing', 9, true,
        'Process your data using appropriate techniques. Show calculations, graphs, and statistical analysis.',
        'Propagate uncertainties. Use appropriate graph types with labeled axes. Show sample calculations.',
        { min: 50, max: 500 }, ['PA'], ['DP-IA-DA'], null),
      buildSection_('sec-dp-10', 'analysis', 'Analysis & Interpretation', 10, true,
        'Analyze patterns and trends in your processed data. Interpret results using scientific reasoning.',
        'Discuss the significance of trends. Compare with expected values. Address the impact of uncertainties.',
        { min: 80, max: 500 }, ['PA', 'EC'], ['DP-IA-DA', 'DP-IA-CO'], null),
      buildSection_('sec-dp-11', 'conclusion', 'Conclusion', 11, true,
        'State your conclusion with direct reference to the research question and data.',
        'Your conclusion must be fully justified by your data. Place it in scientific context.',
        { min: 80, max: 400 }, ['EC', 'RC'], ['DP-IA-CO'], null),
      buildSection_('sec-dp-12', 'evaluation', 'Evaluation', 12, true,
        'Evaluate the strengths and weaknesses of your methodology. Propose realistic improvements and extensions.',
        'Reference data quality and reliability. Suggest improvements with scientific justification.',
        { min: 80, max: 400 }, ['EC', 'RC'], ['DP-IA-EV'], null),
      buildSection_('sec-dp-13', 'bibliography', 'Bibliography', 13, true,
        'List all sources used in your IA using a consistent citation style.',
        'Use a recognized citation format (APA, MLA, or Chicago). Include in-text citations in your report.',
        null, ['CM'], [], null)
    ]
  };
}


// ── Template 3: AP Lab Report ───────────────────────────────────────────

function buildPreloadedAp_() {
  return {
    templateId: 'preload-ap-lab',
    title: 'AP Lab Report',
    gradeband: 'AP',
    framework: 'AP-SCI',
    isPreloaded: true,
    status: 'published',
    createdBy: 'system',
    sectionsJson: [
      buildSection_('sec-ap-01', 'title_page', 'Title Page', 1, true,
        'Include lab title, your name, date, course, and lab partners.',
        'A clear title describes what was investigated.',
        null, [], [], null),
      buildSection_('sec-ap-02', 'research_question', 'Purpose / Research Question', 2, true,
        'State the purpose of the lab or the research question being investigated.',
        'Clearly identify what you are testing or exploring.',
        { min: 15, max: 100 }, ['QD'], ['AP-SP3'], null),
      buildSection_('sec-ap-03', 'background', 'Introduction & Background', 3, true,
        'Provide relevant scientific background. Cite sources to support your theoretical framework.',
        'Connect the lab to course content and scientific principles.',
        { min: 80, max: 400 }, ['QD', 'RC'], ['AP-SP6'], null),
      buildSection_('sec-ap-04', 'hypothesis', 'Hypothesis / Prediction', 4, true,
        'State your hypothesis or prediction based on scientific reasoning.',
        'Include the scientific reasoning behind your prediction.',
        { min: 20, max: 150 }, ['HP'], ['AP-SP3'], null),
      buildSection_('sec-ap-05', 'procedure', 'Procedure', 5, true,
        'Describe the experimental procedure. Include materials within the procedure.',
        'Provide enough detail for replication. Identify variables and controls.',
        { min: 50, max: 500 }, ['DI'], ['AP-SP4'], null),
      buildSection_('sec-ap-06', 'raw_data', 'Data Collection', 6, true,
        'Present raw data in organized tables with units.',
        'Include qualitative observations alongside quantitative data.',
        null, ['CD'], ['AP-SP4'], null),
      buildSection_('sec-ap-07', 'data_processing', 'Data Analysis', 7, true,
        'Process data with calculations and graphs. Apply mathematical routines.',
        'Show sample calculations. Use appropriate statistical methods. Create clear, labeled graphs.',
        { min: 50, max: 400 }, ['PA'], ['AP-SP2', 'AP-SP5'], null),
      buildSection_('sec-ap-08', 'analysis', 'Results & Interpretation', 8, true,
        'Describe results and interpret patterns. Connect to scientific principles.',
        'Identify patterns and relationships. Explain results using scientific theories.',
        { min: 60, max: 400 }, ['PA', 'EC'], ['AP-SP5'], null),
      buildSection_('sec-ap-09', 'conclusion', 'Conclusion', 9, true,
        'Summarize findings. State whether the hypothesis was supported. Connect to broader scientific concepts.',
        'Use evidence to support your claims. Reference specific data values.',
        { min: 60, max: 300 }, ['EC'], ['AP-SP6'], null),
      buildSection_('sec-ap-10', 'evaluation', 'Error Analysis & Discussion', 10, true,
        'Discuss sources of error, limitations, and suggestions for improvement.',
        'Distinguish between random and systematic errors. Propose specific, realistic improvements.',
        { min: 50, max: 300 }, ['EC', 'RC'], ['AP-SP6'], null)
    ]
  };
}


// ── Template 4: Quick Lab (Universal) ───────────────────────────────────

function buildPreloadedQuickLab_() {
  return {
    templateId: 'preload-quick-lab',
    title: 'Quick Lab',
    gradeband: 'Universal',
    framework: '',
    isPreloaded: true,
    status: 'published',
    createdBy: 'system',
    sectionsJson: [
      buildSection_('sec-ql-01', 'research_question', 'Research Question', 1, true,
        'What question are you investigating?',
        'State a clear, specific question.',
        { min: 10, max: 80 }, ['QD'], [],
        {
          high: {
            sentenceStarters: ['How does [variable] affect [outcome]?', 'What happens when [action]?'],
            guideQuestions: ['What are you trying to find out?']
          },
          medium: { sentenceStarters: ['How does ___ affect ___?'] },
          low: {}, none: {}
        }),
      buildSection_('sec-ql-02', 'hypothesis', 'Prediction', 2, true,
        'What do you think will happen? Why?',
        'Make a prediction and give a reason.',
        { min: 15, max: 100 }, ['HP'], [],
        {
          high: {
            sentenceStarters: ['I think ___ will happen because ___.'],
            guideQuestions: ['What do you predict?', 'Why do you think that?']
          },
          medium: { sentenceStarters: ['I predict that ___ because ___.'] },
          low: {}, none: {}
        }),
      buildSection_('sec-ql-03', 'raw_data', 'Data', 3, true,
        'Record your observations and measurements.',
        'Use a table to organize your data.',
        null, ['CD'], [], null),
      buildSection_('sec-ql-04', 'conclusion', 'Conclusion', 4, true,
        'What did you find out? Was your prediction correct?',
        'Use your data as evidence.',
        { min: 20, max: 150 }, ['EC'], [],
        {
          high: {
            sentenceStarters: ['I found that ___. This [supports / does not support] my prediction because ___.'],
            guideQuestions: ['What happened?', 'Was your prediction right?', 'What evidence supports your answer?']
          },
          medium: { sentenceStarters: ['I found that ___. This means ___.'] },
          low: {}, none: {}
        })
    ]
  };
}


// ── Template 5: Guided Inquiry (Middle School / MYP Year 1-3) ──────────

function buildPreloadedGuidedInquiry_() {
  return {
    templateId: 'preload-guided-inquiry',
    title: 'Guided Inquiry',
    gradeband: 'MYP-Y1-3',
    framework: 'IB-MYP-SCI',
    isPreloaded: true,
    status: 'published',
    createdBy: 'system',
    sectionsJson: [
      buildSection_('sec-gi-01', 'research_question', 'Research Question', 1, true,
        'What question will your investigation answer?',
        'Your question should include the variable you are changing and the variable you are measuring.',
        { min: 10, max: 80 }, ['QD'], ['MYP-SCI-B'],
        {
          high: {
            sentenceStarters: [
              'How does changing [what you change] affect [what you measure]?',
              'What is the effect of [variable] on [outcome]?'
            ],
            guideQuestions: [
              'What is the one thing you are changing in your experiment?',
              'What will you observe or measure to see the effect?',
              'Can you test this in the lab?'
            ]
          },
          medium: { sentenceStarters: ['How does ___ affect ___?'] },
          low: {}, none: {}
        }),
      buildSection_('sec-gi-02', 'hypothesis', 'Hypothesis', 2, true,
        'Write your prediction. What do you think will happen and why?',
        'Use what you know from science class to explain your prediction.',
        { min: 20, max: 120 }, ['HP'], ['MYP-SCI-B'],
        {
          high: {
            sentenceStarters: [
              'If [what I change] is [increased/decreased], then [what I measure] will [go up/go down/stay the same] because [science reason].'
            ],
            guideQuestions: [
              'What are you changing?',
              'What do you think will happen?',
              'What science idea explains your thinking?'
            ]
          },
          medium: { sentenceStarters: ['If ___ then ___ because ___.'] },
          low: {}, none: {}
        }),
      buildSection_('sec-gi-03', 'variables', 'Variables', 3, true,
        'Identify your variables. Fill in the table for Independent, Dependent, and Controlled variables.',
        'Remember: IV = what you change, DV = what you measure, CV = what you keep the same.',
        null, ['DI'], ['MYP-SCI-B'],
        {
          high: {
            guideQuestions: [
              'Independent Variable: What one thing are you changing?',
              'Dependent Variable: What are you measuring or observing?',
              'Controlled Variables: List at least 3 things you will keep the same.',
              'For each controlled variable, explain HOW you will keep it the same.'
            ]
          },
          medium: {
            guideQuestions: ['What is your IV?', 'What is your DV?', 'List your controlled variables.']
          },
          low: {}, none: {}
        }),
      buildSection_('sec-gi-04', 'procedure', 'Method', 4, true,
        'Write step-by-step instructions so someone else could repeat your experiment.',
        'Number each step. Include quantities and equipment names. Say how many trials you will do.',
        { min: 40, max: 400 }, ['DI'], ['MYP-SCI-B'],
        {
          high: {
            guideQuestions: [
              'Step 1: How do you set up the equipment?',
              'What measurements do you take and how?',
              'How many trials will you do? (At least 3 is best)',
              'What safety precautions do you need?'
            ]
          },
          medium: {}, low: {}, none: {}
        }),
      buildSection_('sec-gi-05', 'raw_data', 'Raw Data', 5, true,
        'Record your data in a neat table. Include units and trial numbers.',
        'Your table should have clear column headings with units. Record ALL data, even if it looks wrong.',
        null, ['CD'], ['MYP-SCI-C'], null),
      buildSection_('sec-gi-06', 'analysis', 'Analysis', 6, true,
        'Look at your data and describe what you notice. What patterns or trends do you see?',
        'Use numbers from your data table to support what you say.',
        { min: 40, max: 250 }, ['PA', 'EC'], ['MYP-SCI-C'],
        {
          high: {
            sentenceStarters: [
              'Looking at my data, I can see that as [IV] increased, [DV] [increased/decreased/stayed the same].',
              'The average [measurement] for [condition] was ___, compared to ___ for [other condition].'
            ],
            guideQuestions: [
              'What pattern do you see between the IV and DV?',
              'Were there any unusual or unexpected results?',
              'What do the averages tell you?'
            ]
          },
          medium: { sentenceStarters: ['As ___ increased, ___ [increased/decreased].'] },
          low: {}, none: {}
        }),
      buildSection_('sec-gi-07', 'conclusion', 'Conclusion', 7, true,
        'Was your hypothesis supported? Use your data as evidence.',
        'Directly answer your research question. Say whether your hypothesis was supported and explain using your data.',
        { min: 40, max: 250 }, ['EC'], ['MYP-SCI-C'],
        {
          high: {
            sentenceStarters: [
              'My hypothesis was [supported / not supported]. The data shows that [evidence from results].',
              'This happened because [scientific explanation].',
              'My investigation could be improved by [specific improvement].'
            ],
            guideQuestions: [
              'Was your prediction correct?',
              'What evidence from your data supports your answer?',
              'What science idea explains your results?',
              'What could you do better next time?'
            ]
          },
          medium: {
            sentenceStarters: ['My hypothesis was ___. The data shows that ___.']
          },
          low: {}, none: {}
        })
    ]
  };
}


// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Build a section definition object for preloaded templates.
 *
 * @param {string} sectionId - Unique section ID
 * @param {string} sectionType - Section type (from LAB_SECTION_TYPES)
 * @param {string} title - Display title
 * @param {number} sequence - Order
 * @param {boolean} required - Is section required
 * @param {string} promptText - Student-facing prompt
 * @param {string} helpText - Help/guidance text
 * @param {Object|null} wordGuidance - { min, max } or null
 * @param {Array<string>} internalDimensions - Dimension codes
 * @param {Array<string>} linkedCriteria - Framework criterion IDs
 * @param {Object|null} scaffoldLevels - { high, medium, low, none } or null
 * @returns {Object} Section definition
 * @private
 */
function buildSection_(sectionId, sectionType, title, sequence, required, promptText, helpText, wordGuidance, internalDimensions, linkedCriteria, scaffoldLevels) {
  const sectionTypeDef = lookupSectionType_(sectionType);
  const inputType = sectionTypeDef ? sectionTypeDef.inputType : 'richtext';

  const section = {
    sectionId: sectionId,
    sectionType: sectionType,
    title: title,
    sequence: sequence,
    required: required,
    promptText: promptText || '',
    helpText: helpText || '',
    inputType: inputType,
    internalDimensions: internalDimensions || [],
    linkedCriteria: linkedCriteria || []
  };

  if (wordGuidance) {
    section.wordGuidance = wordGuidance;
  }
  if (scaffoldLevels) {
    section.scaffoldLevels = scaffoldLevels;
  }

  return section;
}


/**
 * Validate template sections array.
 * Checks types, required fields, sequence uniqueness, and section limits.
 *
 * @param {Array<Object>} sections - Array of section objects
 * @throws {Error} If validation fails
 * @private
 */
function validateTemplateSections_(sections) {
  const seenSequences = {};
  const seenIds = {};

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];

    // Required fields
    if (!sec.sectionType) {
      throw new Error('Section ' + (i + 1) + ': sectionType is required.');
    }
    if (VALID_SECTION_TYPES_.indexOf(sec.sectionType) === -1) {
      throw new Error('Section ' + (i + 1) + ': invalid sectionType "' + sec.sectionType + '".');
    }
    if (!sec.title || typeof sec.title !== 'string' || sec.title.trim().length === 0) {
      throw new Error('Section ' + (i + 1) + ': title is required.');
    }
    if (sec.title.length > 100) {
      throw new Error('Section ' + (i + 1) + ': title must be 100 characters or less.');
    }

    // Sequence must be a positive integer
    const seq = parseInt(sec.sequence, 10);
    if (isNaN(seq) || seq < 1) {
      throw new Error('Section ' + (i + 1) + ': sequence must be a positive integer.');
    }
    if (seenSequences[seq]) {
      throw new Error('Section ' + (i + 1) + ': duplicate sequence number ' + seq + '.');
    }
    seenSequences[seq] = true;

    // Section ID uniqueness (if provided)
    if (sec.sectionId) {
      if (seenIds[sec.sectionId]) {
        throw new Error('Section ' + (i + 1) + ': duplicate sectionId "' + sec.sectionId + '".');
      }
      seenIds[sec.sectionId] = true;
    }

    // Word guidance validation
    if (sec.wordGuidance) {
      if (typeof sec.wordGuidance !== 'object') {
        throw new Error('Section ' + (i + 1) + ': wordGuidance must be an object { min, max }.');
      }
      if (sec.wordGuidance.min !== undefined && sec.wordGuidance.max !== undefined) {
        if (sec.wordGuidance.min > sec.wordGuidance.max) {
          throw new Error('Section ' + (i + 1) + ': wordGuidance min cannot exceed max.');
        }
      }
    }

    // Validate internalDimensions are valid codes
    if (sec.internalDimensions && Array.isArray(sec.internalDimensions)) {
      const validCodes = ['QD', 'HP', 'DI', 'CD', 'PA', 'EC', 'CM', 'RC'];
      for (let d = 0; d < sec.internalDimensions.length; d++) {
        if (validCodes.indexOf(sec.internalDimensions[d]) === -1) {
          throw new Error('Section ' + (i + 1) + ': invalid dimension code "' + sec.internalDimensions[d] + '".');
        }
      }
    }
  }
}


/**
 * Safely parse a JSON string, returning an empty array on failure.
 *
 * @param {string} json - JSON string
 * @returns {*} Parsed value or []
 * @private
 */
function parseJsonSafe_(json) {
  if (!json || typeof json !== 'string') return [];
  try {
    return JSON.parse(json);
  } catch (e) {
    return [];
  }
}
