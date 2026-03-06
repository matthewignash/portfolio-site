/**
 * Lab Frameworks — Scientific Thinking Dimensions, Assessment Frameworks & Alignment
 *
 * Contains the unified scientific thinking model (8 internal dimensions),
 * 4 assessment framework definitions (IB MYP, IB DP, AP, NGSS), and
 * the cross-framework alignment matrix.
 *
 * Pattern follows AISC_CORE in AiscCore.gs — hardcoded constants that change
 * only when framework bodies update criteria (~every 5-7 years).
 *
 * @version 1.0.0
 */

// ============================================================================
// 8 SCIENTIFIC THINKING DIMENSIONS (Internal Spine)
// ============================================================================

const LAB_DIMENSIONS = [
  {
    code: 'QD',
    label: 'Questioning & Defining',
    description: 'Formulating investigable questions, defining problems, identifying research scope',
    sequence: 1,
    color: '#3b82f6'
  },
  {
    code: 'HP',
    label: 'Hypothesizing & Predicting',
    description: 'Making evidence-based predictions, formulating testable hypotheses with scientific reasoning',
    sequence: 2,
    color: '#8b5cf6'
  },
  {
    code: 'DI',
    label: 'Designing Investigations',
    description: 'Planning methods, identifying variables, selecting materials, controls, safety, ethics',
    sequence: 3,
    color: '#06b6d4'
  },
  {
    code: 'CD',
    label: 'Collecting Data',
    description: 'Accurate, systematic data gathering, recording, and organization',
    sequence: 4,
    color: '#10b981'
  },
  {
    code: 'PA',
    label: 'Processing & Analyzing',
    description: 'Transforming raw data, calculations, graphing, statistical analysis, pattern identification',
    sequence: 5,
    color: '#f59e0b'
  },
  {
    code: 'EC',
    label: 'Evaluating & Concluding',
    description: 'Drawing evidence-based conclusions, assessing validity, error analysis, limitations',
    sequence: 6,
    color: '#ef4444'
  },
  {
    code: 'CM',
    label: 'Communicating',
    description: 'Scientific language, conventions, formatting, citations, clear presentation of findings',
    sequence: 7,
    color: '#ec4899'
  },
  {
    code: 'RC',
    label: 'Reflecting & Connecting',
    description: 'Connecting to theory, real-world applications, suggesting improvements/extensions, ethical implications',
    sequence: 8,
    color: '#6366f1'
  }
];


// ============================================================================
// FRAMEWORK: IB MYP SCIENCES (Criteria A-D, 8-point each)
// Based on 2025 MYP Sciences Guide, Year 4-5 descriptors
// ============================================================================

const FRAMEWORK_IB_MYP = {
  frameworkId: 'IB-MYP-SCI',
  title: 'IB MYP Sciences',
  version: '2025',
  source: 'IB MYP Sciences Guide',
  scaleMax: 8,
  scaleLevels: [
    { range: '0', label: 'Not Achieved' },
    { range: '1-2', label: 'Limited' },
    { range: '3-4', label: 'Adequate' },
    { range: '5-6', label: 'Substantial' },
    { range: '7-8', label: 'Excellent' }
  ],
  criteria: [
    {
      criterionId: 'MYP-SCI-A',
      code: 'A',
      title: 'Knowing and Understanding',
      maxMark: 8,
      internalDimensions: ['QD', 'PA'],
      strands: [
        { id: 'A.i', text: 'explain scientific knowledge' },
        { id: 'A.ii', text: 'apply scientific knowledge and understanding to solve problems set in familiar and unfamiliar situations' },
        { id: 'A.iii', text: 'analyse and evaluate information to make scientifically supported judgments' }
      ],
      levelDescriptors: {
        year5: {
          '0': 'The student does not reach a standard identified by any of the descriptors below.',
          '1-2': 'The student is able to: i. state scientific knowledge; ii. apply scientific knowledge and understanding to suggest solutions to problems set in familiar situations; iii. interpret information to make judgments.',
          '3-4': 'The student is able to: i. outline scientific knowledge; ii. apply scientific knowledge and understanding to solve problems set in familiar situations; iii. interpret information to make scientifically supported judgments.',
          '5-6': 'The student is able to: i. describe scientific knowledge; ii. apply scientific knowledge and understanding to solve problems set in familiar situations and suggest solutions to problems set in unfamiliar situations; iii. analyse information to make scientifically supported judgments.',
          '7-8': 'The student is able to: i. explain scientific knowledge; ii. apply scientific knowledge and understanding to solve problems set in familiar and unfamiliar situations; iii. analyse and evaluate information to make scientifically supported judgments.'
        }
      },
      notes: 'Criterion A is typically assessed via tests and written tasks rather than lab reports, but can appear in lab context for data interpretation.'
    },
    {
      criterionId: 'MYP-SCI-B',
      code: 'B',
      title: 'Inquiring and Designing',
      maxMark: 8,
      internalDimensions: ['QD', 'HP', 'DI'],
      strands: [
        { id: 'B.i', text: 'explain a problem or question to be tested by a scientific investigation' },
        { id: 'B.ii', text: 'formulate a testable hypothesis and explain it using scientific reasoning' },
        { id: 'B.iii', text: 'explain how to manipulate the variables, and explain how data will be collected' },
        { id: 'B.iv', text: 'design scientific investigations' }
      ],
      levelDescriptors: {
        year5: {
          '0': 'The student does not reach a standard identified by any of the descriptors below.',
          '1-2': 'The student is able to: i. state a problem or question to be tested by a scientific investigation; ii. outline a testable hypothesis; iii. outline the variables; iv. design a method, with limited success.',
          '3-4': 'The student is able to: i. outline a problem or question to be tested by a scientific investigation; ii. formulate a testable hypothesis using scientific reasoning; iii. outline how to manipulate the variables, and outline how relevant data will be collected; iv. design a safe method in which he or she selects materials and equipment.',
          '5-6': 'The student is able to: i. describe a problem or question to be tested by a scientific investigation; ii. formulate and explain a testable hypothesis using scientific reasoning; iii. describe how to manipulate the variables, and describe how sufficient, relevant data will be collected; iv. design a complete and safe method in which he or she selects appropriate materials and equipment.',
          '7-8': 'The student is able to: i. explain a problem or question to be tested by a scientific investigation; ii. formulate and explain a testable hypothesis using correct scientific reasoning; iii. explain how to manipulate the variables, and explain how sufficient, relevant data will be collected; iv. design a logical, complete and safe method in which he or she selects appropriate materials and equipment.'
        }
      }
    },
    {
      criterionId: 'MYP-SCI-C',
      code: 'C',
      title: 'Processing and Evaluating',
      maxMark: 8,
      internalDimensions: ['CD', 'PA', 'EC'],
      strands: [
        { id: 'C.i', text: 'present collected and transformed data' },
        { id: 'C.ii', text: 'interpret data and explain results using scientific reasoning' },
        { id: 'C.iii', text: 'evaluate the validity of a hypothesis based on the outcome of the scientific investigation' },
        { id: 'C.iv', text: 'evaluate the validity of the method' },
        { id: 'C.v', text: 'explain improvements or extensions to the method' }
      ],
      levelDescriptors: {
        year5: {
          '0': 'The student does not reach a standard identified by any of the descriptors below.',
          '1-2': 'The student is able to: i. collect and present data in numerical and/or visual forms; ii. interpret data; iii. state the validity of a hypothesis based on the outcome of a scientific investigation; iv. state the validity of the method based on the outcome of a scientific investigation; v. state improvements or extensions to the method.',
          '3-4': 'The student is able to: i. correctly collect and present data in numerical and/or visual forms; ii. accurately interpret data and explain results; iii. outline the validity of a hypothesis based on the outcome of a scientific investigation; iv. outline the validity of the method based on the outcome of a scientific investigation; v. outline improvements or extensions to the method that would benefit the scientific investigation.',
          '5-6': 'The student is able to: i. correctly collect, organize and present data in numerical and/or visual forms; ii. accurately interpret data and explain results using scientific reasoning; iii. discuss the validity of a hypothesis based on the outcome of a scientific investigation; iv. discuss the validity of the method based on the outcome of a scientific investigation; v. describe improvements or extensions to the method that would benefit the scientific investigation.',
          '7-8': 'The student is able to: i. correctly collect, organize, transform and present data in numerical and/or visual forms; ii. accurately interpret data and explain results using correct scientific reasoning; iii. evaluate the validity of a hypothesis based on the outcome of a scientific investigation; iv. evaluate the validity of the method based on the outcome of a scientific investigation; v. explain improvements or extensions to the method that would benefit the scientific investigation.'
        }
      }
    },
    {
      criterionId: 'MYP-SCI-D',
      code: 'D',
      title: 'Reflecting on the Impacts of Science',
      maxMark: 8,
      internalDimensions: ['CM', 'RC'],
      strands: [
        { id: 'D.i', text: 'explain the ways in which science is applied and used to address a specific problem or issue' },
        { id: 'D.ii', text: 'discuss and evaluate the various implications of using science and its application to solve a specific problem or issue' },
        { id: 'D.iii', text: 'apply scientific language effectively' },
        { id: 'D.iv', text: 'document the work of others and sources of information used' }
      ],
      levelDescriptors: {
        year5: {
          '0': 'The student does not reach a standard identified by any of the descriptors below.',
          '1-2': 'The student is able to: i. outline the ways in which science is used to address a specific problem or issue; ii. outline the implications of using science to solve a specific problem or issue, interacting with a factor; iii. apply scientific language to communicate understanding but does so with limited success; iv. document sources, with limited success.',
          '3-4': 'The student is able to: i. summarize the ways in which science is applied and used to address a specific problem or issue; ii. describe the implications of using science and its application to solve a specific problem or issue, interacting with a factor; iii. sometimes apply scientific language to communicate understanding; iv. sometimes document sources correctly.',
          '5-6': 'The student is able to: i. describe the ways in which science is applied and used to address a specific problem or issue; ii. discuss the implications of using science and its application to solve a specific problem or issue, interacting with a factor; iii. usually apply scientific language to communicate understanding clearly and precisely; iv. usually document sources correctly.',
          '7-8': 'The student is able to: i. explain the ways in which science is applied and used to address a specific problem or issue; ii. discuss and evaluate the implications of using science and its application to solve a specific problem or issue, interacting with a factor; iii. consistently apply scientific language to communicate understanding clearly and precisely; iv. document sources completely.'
        }
      },
      notes: 'Factor options: moral, ethical, social, economic, political, cultural, or environmental.'
    }
  ]
};


// ============================================================================
// FRAMEWORK: IB DP SCIENCES INTERNAL ASSESSMENT (4 criteria, 6 marks each)
// Updated for May 2025 examinations
// ============================================================================

const FRAMEWORK_IB_DP = {
  frameworkId: 'IB-DP-IA',
  title: 'IB DP Sciences Internal Assessment',
  version: '2025',
  source: 'IB DP Chemistry/Biology/Physics Guide (First assessment May 2025)',
  scaleMax: 24,
  notes: 'From May 2025 the IA uses 4 criteria (Research Design, Data Analysis, Conclusion, Evaluation) each worth 6 marks, total 24. Scaled by IB to mark out of 20 for final grade. Max report length: 3000 words.',
  criteria: [
    {
      criterionId: 'DP-IA-RD',
      code: 'RD',
      title: 'Research Design',
      maxMark: 6,
      internalDimensions: ['QD', 'HP', 'DI'],
      descriptors: {
        '0': 'The student\'s report does not reach a standard described by the descriptors below.',
        '1-2': 'The research question is stated but not clearly focused. The methodology is outlined but has significant gaps. Variables are identified but not fully explained. Safety/ethical considerations are superficial or missing.',
        '3-4': 'The research question is relevant and focused. The methodology is described and mostly appropriate. Variables are identified and explained. Safety and ethical considerations are addressed.',
        '5-6': 'The research question is relevant, fully focused and feasible. The methodology is clearly communicated, highly appropriate, and addresses the research question effectively. Variables are clearly identified with full explanation of control strategies. Safety, ethical, and environmental considerations are thoroughly addressed.'
      },
      notes: 'Students must clearly communicate how their experimental design addresses the research question, covering variables, data collection methods, and controls.'
    },
    {
      criterionId: 'DP-IA-DA',
      code: 'DA',
      title: 'Data Analysis',
      maxMark: 6,
      internalDimensions: ['CD', 'PA'],
      descriptors: {
        '0': 'The student\'s report does not reach a standard described by the descriptors below.',
        '1-2': 'Raw data is recorded but may be incomplete or poorly organized. Some processing is attempted. Uncertainties are not adequately addressed.',
        '3-4': 'Raw data is correctly recorded and organized. Data processing is appropriate and mostly correct. Some consideration of uncertainties and errors.',
        '5-6': 'Raw data is recorded accurately with appropriate precision. Data is processed thoroughly with correct techniques. Uncertainties are fully propagated and their impact on results is discussed.'
      }
    },
    {
      criterionId: 'DP-IA-CO',
      code: 'CO',
      title: 'Conclusion',
      maxMark: 6,
      internalDimensions: ['EC', 'RC'],
      descriptors: {
        '0': 'The student\'s report does not reach a standard described by the descriptors below.',
        '1-2': 'A conclusion is stated but weakly justified by the data. Limited scientific context is provided.',
        '3-4': 'The conclusion is supported by the processed data and addresses the research question. Some scientific context and reasoning are provided.',
        '5-6': 'The conclusion is fully supported by the data, directly and comprehensively addresses the research question, and is placed in thorough scientific context with detailed reasoning.'
      }
    },
    {
      criterionId: 'DP-IA-EV',
      code: 'EV',
      title: 'Evaluation',
      maxMark: 6,
      internalDimensions: ['EC', 'RC'],
      descriptors: {
        '0': 'The student\'s report does not reach a standard described by the descriptors below.',
        '1-2': 'Strengths and/or weaknesses of the methodology are stated. Improvements are superficial.',
        '3-4': 'Strengths and weaknesses of the methodology are described with some detail. Realistic improvements or extensions are suggested.',
        '5-6': 'Strengths and weaknesses are thoroughly evaluated with specific reference to data quality and reliability. Realistic and detailed improvements are proposed with clear scientific justification. Extensions are thoughtfully suggested.'
      }
    }
  ]
};


// ============================================================================
// FRAMEWORK: AP SCIENCE PRACTICES (SP1-SP7)
// College Board AP Science Practices (shared across AP Chemistry, Biology, Physics, ES)
// ============================================================================

const FRAMEWORK_AP = {
  frameworkId: 'AP-SCI',
  title: 'AP Science Practices',
  version: '2025',
  source: 'College Board AP Course and Exam Descriptions (Chemistry, Biology, Physics)',
  notes: 'AP courses use 6-7 Science Practices depending on subject. This config uses the unified set. Individual AP course variants can filter by applicableSubjects.',
  practices: [
    {
      practiceId: 'AP-SP1',
      code: 'SP1',
      title: 'Models and Representations',
      description: 'The student can use representations and models to communicate scientific phenomena and solve scientific problems.',
      internalDimensions: ['CM', 'PA'],
      applicableSubjects: ['Chemistry', 'Biology', 'Physics', 'Environmental Science'],
      subSkills: [
        'Describe models and representations, including limitations',
        'Determine features of natural phenomena using models/representations',
        'Create representations or models of natural phenomena',
        'Re-express key elements across multiple representations'
      ]
    },
    {
      practiceId: 'AP-SP2',
      code: 'SP2',
      title: 'Mathematical Routines',
      description: 'The student can use mathematics appropriately.',
      internalDimensions: ['PA'],
      applicableSubjects: ['Chemistry', 'Biology', 'Physics', 'Environmental Science'],
      subSkills: [
        'Justify the selection of a mathematical routine to solve problems',
        'Apply mathematical routines to quantities that describe natural phenomena',
        'Estimate numerically quantities that describe natural phenomena'
      ]
    },
    {
      practiceId: 'AP-SP3',
      code: 'SP3',
      title: 'Questions and Methods',
      description: 'The student can engage in scientific questioning to extend thinking or to guide investigations within the context of the AP course.',
      internalDimensions: ['QD', 'DI'],
      applicableSubjects: ['Chemistry', 'Biology', 'Physics', 'Environmental Science'],
      subSkills: [
        'Identify or pose a testable question based on an observation, data, or a model',
        'State the null and alternative hypotheses, or predict the results of an experiment',
        'Identify experimental procedures that are aligned to the question'
      ]
    },
    {
      practiceId: 'AP-SP4',
      code: 'SP4',
      title: 'Data Collection Strategies',
      description: 'The student can plan and implement data collection strategies in relation to a particular scientific question.',
      internalDimensions: ['DI', 'CD'],
      applicableSubjects: ['Chemistry', 'Biology', 'Physics', 'Environmental Science'],
      subSkills: [
        'Justify the selection of the kind of data needed to answer a particular scientific question',
        'Design a plan for collecting data to answer a particular scientific question',
        'Collect data to answer a particular scientific question',
        'Evaluate sources of data to answer a particular scientific question'
      ]
    },
    {
      practiceId: 'AP-SP5',
      code: 'SP5',
      title: 'Data Analysis',
      description: 'The student can perform data analysis and evaluation of evidence.',
      internalDimensions: ['PA', 'EC'],
      applicableSubjects: ['Chemistry', 'Biology', 'Physics', 'Environmental Science'],
      subSkills: [
        'Analyze data to identify patterns or relationships',
        'Refine observations and measurements based on data analysis',
        'Evaluate the evidence provided by data sets in relation to a particular scientific question'
      ]
    },
    {
      practiceId: 'AP-SP6',
      code: 'SP6',
      title: 'Argumentation',
      description: 'The student can work with scientific explanations and theories.',
      internalDimensions: ['EC', 'RC'],
      applicableSubjects: ['Chemistry', 'Biology', 'Physics', 'Environmental Science'],
      subSkills: [
        'Make a scientific claim',
        'Support a claim with evidence from scientific principles, concepts, processes, and/or data',
        'Provide reasoning to justify a claim by connecting evidence to scientific theories',
        'Construct explanations of phenomena based on evidence produced through scientific practices',
        'Evaluate alternative scientific explanations',
        'Make claims and predictions about natural phenomena based on scientific theories and models'
      ]
    },
    {
      practiceId: 'AP-SP7',
      code: 'SP7',
      title: 'Cross-Domain Connections',
      description: 'The student is able to connect and relate knowledge across various scales, concepts, and representations in and across domains.',
      internalDimensions: ['RC'],
      applicableSubjects: ['Chemistry', 'Physics'],
      subSkills: [
        'Connect phenomena and models across spatial and temporal scales',
        'Connect concepts in and across domains to generalize or extrapolate'
      ]
    }
  ]
};


// ============================================================================
// FRAMEWORK: NGSS SCIENCE AND ENGINEERING PRACTICES (SEP1-SEP8)
// ============================================================================

const FRAMEWORK_NGSS = {
  frameworkId: 'NGSS-SEP',
  title: 'NGSS Science and Engineering Practices',
  version: '2013',
  source: 'NGSS Appendix F: Science and Engineering Practices',
  practices: [
    {
      practiceId: 'NGSS-SEP1',
      code: 'SEP1',
      title: 'Asking Questions and Defining Problems',
      internalDimensions: ['QD'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    },
    {
      practiceId: 'NGSS-SEP2',
      code: 'SEP2',
      title: 'Developing and Using Models',
      internalDimensions: ['HP', 'CM'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    },
    {
      practiceId: 'NGSS-SEP3',
      code: 'SEP3',
      title: 'Planning and Carrying Out Investigations',
      internalDimensions: ['DI', 'CD'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    },
    {
      practiceId: 'NGSS-SEP4',
      code: 'SEP4',
      title: 'Analyzing and Interpreting Data',
      internalDimensions: ['PA'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    },
    {
      practiceId: 'NGSS-SEP5',
      code: 'SEP5',
      title: 'Using Mathematics and Computational Thinking',
      internalDimensions: ['PA'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    },
    {
      practiceId: 'NGSS-SEP6',
      code: 'SEP6',
      title: 'Constructing Explanations and Designing Solutions',
      internalDimensions: ['EC', 'RC'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    },
    {
      practiceId: 'NGSS-SEP7',
      code: 'SEP7',
      title: 'Engaging in Argument from Evidence',
      internalDimensions: ['EC'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    },
    {
      practiceId: 'NGSS-SEP8',
      code: 'SEP8',
      title: 'Obtaining, Evaluating, and Communicating Information',
      internalDimensions: ['CM', 'RC'],
      gradeBands: ['K-2', '3-5', '6-8', '9-12']
    }
  ]
};


// ============================================================================
// CROSS-FRAMEWORK ALIGNMENT MATRIX
// Many-to-many: internal dimension → framework criteria/practices
// ============================================================================

const CROSS_FRAMEWORK_ALIGNMENT = [
  // QD — Questioning & Defining
  { dimension: 'QD', framework: 'IB-MYP-SCI', criterionCode: 'B', strand: 'B.i', strength: 'primary' },
  { dimension: 'QD', framework: 'IB-DP-IA', criterionCode: 'RD', strength: 'primary' },
  { dimension: 'QD', framework: 'AP-SCI', practiceCode: 'SP3', strength: 'primary' },
  { dimension: 'QD', framework: 'NGSS-SEP', practiceCode: 'SEP1', strength: 'primary' },

  // HP — Hypothesizing & Predicting
  { dimension: 'HP', framework: 'IB-MYP-SCI', criterionCode: 'B', strand: 'B.ii', strength: 'primary' },
  { dimension: 'HP', framework: 'IB-DP-IA', criterionCode: 'RD', strength: 'secondary' },
  { dimension: 'HP', framework: 'AP-SCI', practiceCode: 'SP3', strength: 'secondary' },
  { dimension: 'HP', framework: 'AP-SCI', practiceCode: 'SP6', strength: 'secondary' },
  { dimension: 'HP', framework: 'NGSS-SEP', practiceCode: 'SEP2', strength: 'secondary' },

  // DI — Designing Investigations
  { dimension: 'DI', framework: 'IB-MYP-SCI', criterionCode: 'B', strand: 'B.iii-iv', strength: 'primary' },
  { dimension: 'DI', framework: 'IB-DP-IA', criterionCode: 'RD', strength: 'primary' },
  { dimension: 'DI', framework: 'AP-SCI', practiceCode: 'SP3', strength: 'secondary' },
  { dimension: 'DI', framework: 'AP-SCI', practiceCode: 'SP4', strength: 'primary' },
  { dimension: 'DI', framework: 'NGSS-SEP', practiceCode: 'SEP3', strength: 'primary' },

  // CD — Collecting Data
  { dimension: 'CD', framework: 'IB-MYP-SCI', criterionCode: 'C', strand: 'C.i', strength: 'primary' },
  { dimension: 'CD', framework: 'IB-DP-IA', criterionCode: 'DA', strength: 'primary' },
  { dimension: 'CD', framework: 'AP-SCI', practiceCode: 'SP4', strength: 'primary' },
  { dimension: 'CD', framework: 'NGSS-SEP', practiceCode: 'SEP3', strength: 'secondary' },

  // PA — Processing & Analyzing
  { dimension: 'PA', framework: 'IB-MYP-SCI', criterionCode: 'C', strand: 'C.i-ii', strength: 'primary' },
  { dimension: 'PA', framework: 'IB-DP-IA', criterionCode: 'DA', strength: 'primary' },
  { dimension: 'PA', framework: 'AP-SCI', practiceCode: 'SP2', strength: 'primary' },
  { dimension: 'PA', framework: 'AP-SCI', practiceCode: 'SP5', strength: 'primary' },
  { dimension: 'PA', framework: 'NGSS-SEP', practiceCode: 'SEP4', strength: 'primary' },
  { dimension: 'PA', framework: 'NGSS-SEP', practiceCode: 'SEP5', strength: 'primary' },

  // EC — Evaluating & Concluding
  { dimension: 'EC', framework: 'IB-MYP-SCI', criterionCode: 'C', strand: 'C.iii-v', strength: 'primary' },
  { dimension: 'EC', framework: 'IB-DP-IA', criterionCode: 'CO', strength: 'primary' },
  { dimension: 'EC', framework: 'IB-DP-IA', criterionCode: 'EV', strength: 'primary' },
  { dimension: 'EC', framework: 'AP-SCI', practiceCode: 'SP5', strength: 'secondary' },
  { dimension: 'EC', framework: 'AP-SCI', practiceCode: 'SP6', strength: 'primary' },
  { dimension: 'EC', framework: 'NGSS-SEP', practiceCode: 'SEP6', strength: 'primary' },
  { dimension: 'EC', framework: 'NGSS-SEP', practiceCode: 'SEP7', strength: 'primary' },

  // CM — Communicating
  { dimension: 'CM', framework: 'IB-MYP-SCI', criterionCode: 'D', strand: 'D.iii-iv', strength: 'primary' },
  { dimension: 'CM', framework: 'IB-DP-IA', criterionCode: 'DA', strength: 'secondary', notes: 'Communication assessed implicitly through data presentation quality' },
  { dimension: 'CM', framework: 'AP-SCI', practiceCode: 'SP1', strength: 'primary' },
  { dimension: 'CM', framework: 'NGSS-SEP', practiceCode: 'SEP2', strength: 'secondary' },
  { dimension: 'CM', framework: 'NGSS-SEP', practiceCode: 'SEP8', strength: 'primary' },

  // RC — Reflecting & Connecting
  { dimension: 'RC', framework: 'IB-MYP-SCI', criterionCode: 'D', strand: 'D.i-ii', strength: 'primary' },
  { dimension: 'RC', framework: 'IB-DP-IA', criterionCode: 'CO', strength: 'secondary' },
  { dimension: 'RC', framework: 'IB-DP-IA', criterionCode: 'EV', strength: 'secondary' },
  { dimension: 'RC', framework: 'AP-SCI', practiceCode: 'SP6', strength: 'secondary' },
  { dimension: 'RC', framework: 'AP-SCI', practiceCode: 'SP7', strength: 'primary' },
  { dimension: 'RC', framework: 'NGSS-SEP', practiceCode: 'SEP6', strength: 'secondary' },
  { dimension: 'RC', framework: 'NGSS-SEP', practiceCode: 'SEP8', strength: 'secondary' }
];


// ============================================================================
// LAB SECTION TYPES
// ============================================================================

const LAB_SECTION_TYPES = [
  { type: 'title_page', label: 'Title Page', inputType: 'structured', defaultDimensions: [] },
  { type: 'research_question', label: 'Research Question', inputType: 'richtext', defaultDimensions: ['QD'] },
  { type: 'background', label: 'Background', inputType: 'richtext', defaultDimensions: ['QD', 'RC'] },
  { type: 'hypothesis', label: 'Hypothesis', inputType: 'richtext', defaultDimensions: ['HP'] },
  { type: 'variables', label: 'Variables', inputType: 'structured_table', defaultDimensions: ['DI'] },
  { type: 'materials', label: 'Materials', inputType: 'list', defaultDimensions: ['DI'] },
  { type: 'procedure', label: 'Procedure', inputType: 'ordered_list', defaultDimensions: ['DI'] },
  { type: 'safety', label: 'Safety', inputType: 'richtext_checklist', defaultDimensions: ['DI'] },
  { type: 'raw_data', label: 'Raw Data', inputType: 'data_table', defaultDimensions: ['CD'] },
  { type: 'data_processing', label: 'Data Processing', inputType: 'richtext_embed', defaultDimensions: ['PA'] },
  { type: 'analysis', label: 'Analysis', inputType: 'richtext', defaultDimensions: ['PA', 'EC'] },
  { type: 'conclusion', label: 'Conclusion', inputType: 'richtext', defaultDimensions: ['EC'] },
  { type: 'evaluation', label: 'Evaluation', inputType: 'richtext', defaultDimensions: ['EC', 'RC'] },
  { type: 'reflection', label: 'Reflection', inputType: 'richtext', defaultDimensions: ['RC'] },
  { type: 'bibliography', label: 'Bibliography', inputType: 'structured_list', defaultDimensions: ['CM'] },
  { type: 'custom', label: 'Custom Section', inputType: 'richtext', defaultDimensions: [] }
];


// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Return all lab framework data for the frontend.
 * Available to all roles.
 *
 * @returns {Object} { dimensions, frameworks, alignment, sectionTypes }
 */
function getLabFrameworks() {
  getCurrentUser(); // validate logged in
  return {
    dimensions: LAB_DIMENSIONS,
    frameworks: {
      'IB-MYP-SCI': FRAMEWORK_IB_MYP,
      'IB-DP-IA': FRAMEWORK_IB_DP,
      'AP-SCI': FRAMEWORK_AP,
      'NGSS-SEP': FRAMEWORK_NGSS
    },
    alignment: CROSS_FRAMEWORK_ALIGNMENT,
    sectionTypes: LAB_SECTION_TYPES
  };
}


/**
 * Look up a dimension by code.
 *
 * @param {string} code - Dimension code (QD, HP, DI, CD, PA, EC, CM, RC)
 * @returns {Object|null} Dimension object or null
 */
function lookupDimension_(code) {
  for (let i = 0; i < LAB_DIMENSIONS.length; i++) {
    if (LAB_DIMENSIONS[i].code === code) return LAB_DIMENSIONS[i];
  }
  return null;
}


/**
 * Look up a framework by ID.
 *
 * @param {string} frameworkId - Framework ID (IB-MYP-SCI, IB-DP-IA, AP-SCI, NGSS-SEP)
 * @returns {Object|null} Framework object or null
 */
function lookupFramework_(frameworkId) {
  const map = {
    'IB-MYP-SCI': FRAMEWORK_IB_MYP,
    'IB-DP-IA': FRAMEWORK_IB_DP,
    'AP-SCI': FRAMEWORK_AP,
    'NGSS-SEP': FRAMEWORK_NGSS
  };
  return map[frameworkId] || null;
}


/**
 * Get all criteria/practices for a framework that map to a given dimension.
 *
 * @param {string} dimensionCode - e.g. 'PA'
 * @param {string} frameworkId - e.g. 'IB-MYP-SCI'
 * @returns {Array<Object>} Alignment entries with strength
 */
function getAlignmentsForDimension_(dimensionCode, frameworkId) {
  const results = [];
  for (let i = 0; i < CROSS_FRAMEWORK_ALIGNMENT.length; i++) {
    const a = CROSS_FRAMEWORK_ALIGNMENT[i];
    if (a.dimension === dimensionCode && a.framework === frameworkId) {
      results.push(a);
    }
  }
  return results;
}


/**
 * Get all dimensions that a framework criterion maps to.
 *
 * @param {string} frameworkId - e.g. 'IB-MYP-SCI'
 * @param {string} criterionCode - e.g. 'B' or 'SP3'
 * @returns {Array<Object>} Alignment entries
 */
function getDimensionsForCriterion_(frameworkId, criterionCode) {
  const results = [];
  for (let i = 0; i < CROSS_FRAMEWORK_ALIGNMENT.length; i++) {
    const a = CROSS_FRAMEWORK_ALIGNMENT[i];
    if (a.framework === frameworkId) {
      const code = a.criterionCode || a.practiceCode;
      if (code === criterionCode) {
        results.push(a);
      }
    }
  }
  return results;
}


/**
 * Look up a section type definition.
 *
 * @param {string} type - Section type string (e.g. 'hypothesis')
 * @returns {Object|null} Section type definition or null
 */
function lookupSectionType_(type) {
  for (let i = 0; i < LAB_SECTION_TYPES.length; i++) {
    if (LAB_SECTION_TYPES[i].type === type) return LAB_SECTION_TYPES[i];
  }
  return null;
}


/**
 * Translate a set of dimension scores into framework-specific criterion scores.
 * Averages dimension scores weighted by alignment strength (primary=1.0, secondary=0.5).
 *
 * @param {Object} dimensionScores - { QD: 75, HP: 60, ... } percentage scores per dimension
 * @param {string} frameworkId - Target framework
 * @returns {Array<Object>} [{ criterionCode, title, score, maxMark, dimensions }]
 */
function translateToFramework_(dimensionScores, frameworkId) {
  const framework = lookupFramework_(frameworkId);
  if (!framework) return [];

  // Get criteria or practices array
  const items = framework.criteria || framework.practices || [];
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const code = item.code;
    const dims = item.internalDimensions || [];
    const maxMark = item.maxMark || 0;

    if (dims.length === 0) {
      results.push({ criterionCode: code, title: item.title, score: 0, maxMark: maxMark, dimensions: [] });
      continue;
    }

    // Weighted average of dimension scores
    let totalWeight = 0;
    let weightedSum = 0;

    for (let d = 0; d < dims.length; d++) {
      const dimCode = dims[d];
      const dimScore = dimensionScores[dimCode];
      if (dimScore !== undefined && dimScore !== null) {
        // Check alignment strength
        const alignments = getAlignmentsForDimension_(dimCode, frameworkId);
        let strength = 1.0; // default primary
        for (let a = 0; a < alignments.length; a++) {
          const ac = alignments[a].criterionCode || alignments[a].practiceCode;
          if (ac === code) {
            strength = alignments[a].strength === 'secondary' ? 0.5 : 1.0;
            break;
          }
        }
        weightedSum += dimScore * strength;
        totalWeight += strength;
      }
    }

    const avgPct = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const score = maxMark > 0 ? Math.round((avgPct / 100) * maxMark * 10) / 10 : avgPct;

    results.push({
      criterionCode: code,
      title: item.title,
      score: score,
      maxMark: maxMark,
      avgPct: avgPct,
      dimensions: dims
    });
  }

  return results;
}
