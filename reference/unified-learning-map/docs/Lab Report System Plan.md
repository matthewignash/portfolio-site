# Lab Report System — Feature Specification & Implementation Plan

## 1. Feature Overview

A comprehensive lab report authoring, assessment, and analytics system integrated into the Learning Map platform. Students complete structured lab reports within the application, teachers score against customizable rubrics mapped to scientific thinking dimensions, and analytics surface patterns across frameworks (IB MYP, IB DP, AP, NGSS).

### Core Capabilities
- **Template Engine**: Library of section-based lab report templates, customizable per assignment
- **Student Editor**: Structured form-based lab report writing with formatting tools, chemical notation, equation support, and Google Sheets embedding
- **Rubric System**: Level C rubric builder with full custom dimensions, scales, weightings, and per-criterion descriptors
- **Dual Views**: Student-facing (template completion + results) and Teacher-facing (assignment builder + scoring + analytics)
- **Scoring Engine**: In-app rubric-based marking with optional multi-scorer toggle for moderation
- **Exports**: Google Doc and PDF generation for student folders
- **Analytics**: Scientific thinking dimension tracking with cross-framework vertical alignment
- **Integration**: New hex type `lab` that opens the lab editor; accessible from Unit Overview

---

## 2. Unified Scientific Thinking Model (Internal Spine)

All framework criteria map onto 8 internal dimensions. Analytics are computed against these dimensions, then reported through any framework's lens.

### `sci_thinking_dimensions.json`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-02-18",
  "dimensions": [
    {
      "code": "QD",
      "label": "Questioning & Defining",
      "description": "Formulating investigable questions, defining problems, identifying research scope",
      "sequence": 1,
      "color": "#3b82f6"
    },
    {
      "code": "HP",
      "label": "Hypothesizing & Predicting",
      "description": "Making evidence-based predictions, formulating testable hypotheses with scientific reasoning",
      "sequence": 2,
      "color": "#8b5cf6"
    },
    {
      "code": "DI",
      "label": "Designing Investigations",
      "description": "Planning methods, identifying variables, selecting materials, controls, safety, ethics",
      "sequence": 3,
      "color": "#06b6d4"
    },
    {
      "code": "CD",
      "label": "Collecting Data",
      "description": "Accurate, systematic data gathering, recording, and organization",
      "sequence": 4,
      "color": "#10b981"
    },
    {
      "code": "PA",
      "label": "Processing & Analyzing",
      "description": "Transforming raw data, calculations, graphing, statistical analysis, pattern identification",
      "sequence": 5,
      "color": "#f59e0b"
    },
    {
      "code": "EC",
      "label": "Evaluating & Concluding",
      "description": "Drawing evidence-based conclusions, assessing validity, error analysis, limitations",
      "sequence": 6,
      "color": "#ef4444"
    },
    {
      "code": "CM",
      "label": "Communicating",
      "description": "Scientific language, conventions, formatting, citations, clear presentation of findings",
      "sequence": 7,
      "color": "#ec4899"
    },
    {
      "code": "RC",
      "label": "Reflecting & Connecting",
      "description": "Connecting to theory, real-world applications, suggesting improvements/extensions, ethical implications",
      "sequence": 8,
      "color": "#6366f1"
    }
  ]
}
```

---

## 3. Framework Definitions (Editable JSON Configs)

### 3a. `framework_ib_myp_sciences.json`
IB MYP Sciences Assessment Criteria — Based on 2025 Sciences Guide (for use from September 2014/January 2015, still current as of 2025). Year 1-3 and Year 4-5 variants exist; year band stored per criterion level.

```json
{
  "frameworkId": "IB-MYP-SCI",
  "title": "IB MYP Sciences",
  "version": "2025",
  "source": "IB MYP Sciences Guide",
  "lastUpdated": "2025-02-18",
  "scaleMax": 8,
  "scaleLevels": [
    { "range": "0", "label": "Not Achieved" },
    { "range": "1-2", "label": "Limited" },
    { "range": "3-4", "label": "Adequate" },
    { "range": "5-6", "label": "Substantial" },
    { "range": "7-8", "label": "Excellent" }
  ],
  "criteria": [
    {
      "criterionId": "MYP-SCI-A",
      "code": "A",
      "title": "Knowing and Understanding",
      "maxMark": 8,
      "internalDimensions": ["QD", "PA"],
      "strands": [
        { "id": "A.i", "text": "explain scientific knowledge" },
        { "id": "A.ii", "text": "apply scientific knowledge and understanding to solve problems set in familiar and unfamiliar situations" },
        { "id": "A.iii", "text": "analyse and evaluate information to make scientifically supported judgments" }
      ],
      "levelDescriptors": {
        "year5": {
          "0": "The student does not reach a standard identified by any of the descriptors below.",
          "1-2": "The student is able to: i. state scientific knowledge; ii. apply scientific knowledge and understanding to suggest solutions to problems set in familiar situations; iii. interpret information to make judgments.",
          "3-4": "The student is able to: i. outline scientific knowledge; ii. apply scientific knowledge and understanding to solve problems set in familiar situations; iii. interpret information to make scientifically supported judgments.",
          "5-6": "The student is able to: i. describe scientific knowledge; ii. apply scientific knowledge and understanding to solve problems set in familiar situations and suggest solutions to problems set in unfamiliar situations; iii. analyse information to make scientifically supported judgments.",
          "7-8": "The student is able to: i. explain scientific knowledge; ii. apply scientific knowledge and understanding to solve problems set in familiar and unfamiliar situations; iii. analyse and evaluate information to make scientifically supported judgments."
        }
      },
      "notes": "Criterion A is typically assessed via tests and written tasks rather than lab reports, but can appear in lab context for data interpretation."
    },
    {
      "criterionId": "MYP-SCI-B",
      "code": "B",
      "title": "Inquiring and Designing",
      "maxMark": 8,
      "internalDimensions": ["QD", "HP", "DI"],
      "strands": [
        { "id": "B.i", "text": "explain a problem or question to be tested by a scientific investigation" },
        { "id": "B.ii", "text": "formulate a testable hypothesis and explain it using scientific reasoning" },
        { "id": "B.iii", "text": "explain how to manipulate the variables, and explain how data will be collected" },
        { "id": "B.iv", "text": "design scientific investigations" }
      ],
      "levelDescriptors": {
        "year5": {
          "0": "The student does not reach a standard identified by any of the descriptors below.",
          "1-2": "The student is able to: i. state a problem or question to be tested by a scientific investigation; ii. outline a testable hypothesis; iii. outline the variables; iv. design a method, with limited success.",
          "3-4": "The student is able to: i. outline a problem or question to be tested by a scientific investigation; ii. formulate a testable hypothesis using scientific reasoning; iii. outline how to manipulate the variables, and outline how relevant data will be collected; iv. design a safe method in which he or she selects materials and equipment.",
          "5-6": "The student is able to: i. describe a problem or question to be tested by a scientific investigation; ii. formulate and explain a testable hypothesis using scientific reasoning; iii. describe how to manipulate the variables, and describe how sufficient, relevant data will be collected; iv. design a complete and safe method in which he or she selects appropriate materials and equipment.",
          "7-8": "The student is able to: i. explain a problem or question to be tested by a scientific investigation; ii. formulate and explain a testable hypothesis using correct scientific reasoning; iii. explain how to manipulate the variables, and explain how sufficient, relevant data will be collected; iv. design a logical, complete and safe method in which he or she selects appropriate materials and equipment."
        }
      }
    },
    {
      "criterionId": "MYP-SCI-C",
      "code": "C",
      "title": "Processing and Evaluating",
      "maxMark": 8,
      "internalDimensions": ["CD", "PA", "EC"],
      "strands": [
        { "id": "C.i", "text": "present collected and transformed data" },
        { "id": "C.ii", "text": "interpret data and explain results using scientific reasoning" },
        { "id": "C.iii", "text": "evaluate the validity of a hypothesis based on the outcome of the scientific investigation" },
        { "id": "C.iv", "text": "evaluate the validity of the method" },
        { "id": "C.v", "text": "explain improvements or extensions to the method" }
      ],
      "levelDescriptors": {
        "year5": {
          "0": "The student does not reach a standard identified by any of the descriptors below.",
          "1-2": "The student is able to: i. collect and present data in numerical and/or visual forms; ii. interpret data; iii. state the validity of a hypothesis based on the outcome of a scientific investigation; iv. state the validity of the method based on the outcome of a scientific investigation; v. state improvements or extensions to the method.",
          "3-4": "The student is able to: i. correctly collect and present data in numerical and/or visual forms; ii. accurately interpret data and explain results; iii. outline the validity of a hypothesis based on the outcome of a scientific investigation; iv. outline the validity of the method based on the outcome of a scientific investigation; v. outline improvements or extensions to the method that would benefit the scientific investigation.",
          "5-6": "The student is able to: i. correctly collect, organize and present data in numerical and/or visual forms; ii. accurately interpret data and explain results using scientific reasoning; iii. discuss the validity of a hypothesis based on the outcome of a scientific investigation; iv. discuss the validity of the method based on the outcome of a scientific investigation; v. describe improvements or extensions to the method that would benefit the scientific investigation.",
          "7-8": "The student is able to: i. correctly collect, organize, transform and present data in numerical and/or visual forms; ii. accurately interpret data and explain results using correct scientific reasoning; iii. evaluate the validity of a hypothesis based on the outcome of a scientific investigation; iv. evaluate the validity of the method based on the outcome of a scientific investigation; v. explain improvements or extensions to the method that would benefit the scientific investigation."
        }
      }
    },
    {
      "criterionId": "MYP-SCI-D",
      "code": "D",
      "title": "Reflecting on the Impacts of Science",
      "maxMark": 8,
      "internalDimensions": ["CM", "RC"],
      "strands": [
        { "id": "D.i", "text": "explain the ways in which science is applied and used to address a specific problem or issue" },
        { "id": "D.ii", "text": "discuss and evaluate the various implications of using science and its application to solve a specific problem or issue" },
        { "id": "D.iii", "text": "apply scientific language effectively" },
        { "id": "D.iv", "text": "document the work of others and sources of information used" }
      ],
      "levelDescriptors": {
        "year5": {
          "0": "The student does not reach a standard identified by any of the descriptors below.",
          "1-2": "The student is able to: i. outline the ways in which science is used to address a specific problem or issue; ii. outline the implications of using science to solve a specific problem or issue, interacting with a factor; iii. apply scientific language to communicate understanding but does so with limited success; iv. document sources, with limited success.",
          "3-4": "The student is able to: i. summarize the ways in which science is applied and used to address a specific problem or issue; ii. describe the implications of using science and its application to solve a specific problem or issue, interacting with a factor; iii. sometimes apply scientific language to communicate understanding; iv. sometimes document sources correctly.",
          "5-6": "The student is able to: i. describe the ways in which science is applied and used to address a specific problem or issue; ii. discuss the implications of using science and its application to solve a specific problem or issue, interacting with a factor; iii. usually apply scientific language to communicate understanding clearly and precisely; iv. usually document sources correctly.",
          "7-8": "The student is able to: i. explain the ways in which science is applied and used to address a specific problem or issue; ii. discuss and evaluate the implications of using science and its application to solve a specific problem or issue, interacting with a factor; iii. consistently apply scientific language to communicate understanding clearly and precisely; iv. document sources completely."
        }
      },
      "notes": "Factor options: moral, ethical, social, economic, political, cultural, or environmental."
    }
  ]
}
```

### 3b. `framework_ib_dp_ia.json`
IB DP Sciences Internal Assessment — **Updated for May 2025 examinations** (4 criteria replacing the previous 5).

```json
{
  "frameworkId": "IB-DP-IA",
  "title": "IB DP Sciences Internal Assessment",
  "version": "2025",
  "source": "IB DP Chemistry/Biology/Physics Guide (First assessment May 2025)",
  "lastUpdated": "2025-02-18",
  "scaleMax": 24,
  "notes": "From May 2025 the IA uses 4 criteria (Research Design, Data Analysis, Conclusion, Evaluation) each worth 6 marks, total 24. Scaled by IB to mark out of 20 for final grade. Max report length: 3000 words.",
  "criteria": [
    {
      "criterionId": "DP-IA-RD",
      "code": "RD",
      "title": "Research Design",
      "maxMark": 6,
      "internalDimensions": ["QD", "HP", "DI"],
      "descriptors": {
        "0": "The student's report does not reach a standard described by the descriptors below.",
        "1-2": "The research question is stated but not clearly focused. The methodology is outlined but has significant gaps. Variables are identified but not fully explained. Safety/ethical considerations are superficial or missing.",
        "3-4": "The research question is relevant and focused. The methodology is described and mostly appropriate. Variables are identified and explained. Safety and ethical considerations are addressed.",
        "5-6": "The research question is relevant, fully focused and feasible. The methodology is clearly communicated, highly appropriate, and addresses the research question effectively. Variables are clearly identified with full explanation of control strategies. Safety, ethical, and environmental considerations are thoroughly addressed."
      },
      "notes": "Students must clearly communicate how their experimental design addresses the research question, covering variables, data collection methods, and controls."
    },
    {
      "criterionId": "DP-IA-DA",
      "code": "DA",
      "title": "Data Analysis",
      "maxMark": 6,
      "internalDimensions": ["CD", "PA"],
      "descriptors": {
        "0": "The student's report does not reach a standard described by the descriptors below.",
        "1-2": "Raw data is recorded but may be incomplete or poorly organized. Some processing is attempted. Uncertainties are not adequately addressed.",
        "3-4": "Raw data is correctly recorded and organized. Data processing is appropriate and mostly correct. Some consideration of uncertainties and errors.",
        "5-6": "Raw data is recorded accurately with appropriate precision. Data is processed thoroughly with correct techniques. Uncertainties are fully propagated and their impact on results is discussed."
      }
    },
    {
      "criterionId": "DP-IA-CO",
      "code": "CO",
      "title": "Conclusion",
      "maxMark": 6,
      "internalDimensions": ["EC", "RC"],
      "descriptors": {
        "0": "The student's report does not reach a standard described by the descriptors below.",
        "1-2": "A conclusion is stated but weakly justified by the data. Limited scientific context is provided.",
        "3-4": "The conclusion is supported by the processed data and addresses the research question. Some scientific context and reasoning are provided.",
        "5-6": "The conclusion is fully supported by the data, directly and comprehensively addresses the research question, and is placed in thorough scientific context with detailed reasoning."
      }
    },
    {
      "criterionId": "DP-IA-EV",
      "code": "EV",
      "title": "Evaluation",
      "maxMark": 6,
      "internalDimensions": ["EC", "RC"],
      "descriptors": {
        "0": "The student's report does not reach a standard described by the descriptors below.",
        "1-2": "Strengths and/or weaknesses of the methodology are stated. Improvements are superficial.",
        "3-4": "Strengths and weaknesses of the methodology are described with some detail. Realistic improvements or extensions are suggested.",
        "5-6": "Strengths and weaknesses are thoroughly evaluated with specific reference to data quality and reliability. Realistic and detailed improvements are proposed with clear scientific justification. Extensions are thoughtfully suggested."
      }
    }
  ]
}
```

### 3c. `framework_ap_science_practices.json`
College Board AP Science Practices (shared across AP Chemistry, Biology, Physics, Environmental Science). Updated to reflect current 2025 course frameworks.

```json
{
  "frameworkId": "AP-SCI",
  "title": "AP Science Practices",
  "version": "2025",
  "source": "College Board AP Course and Exam Descriptions (Chemistry, Biology, Physics)",
  "lastUpdated": "2025-02-18",
  "notes": "AP courses use 6-7 Science Practices depending on subject. This config uses the unified set. Individual AP course variants can filter by applicableSubjects.",
  "practices": [
    {
      "practiceId": "AP-SP1",
      "code": "SP1",
      "title": "Models and Representations",
      "description": "The student can use representations and models to communicate scientific phenomena and solve scientific problems.",
      "internalDimensions": ["CM", "PA"],
      "applicableSubjects": ["Chemistry", "Biology", "Physics", "Environmental Science"],
      "subSkills": [
        "Describe models and representations, including limitations",
        "Determine features of natural phenomena using models/representations",
        "Create representations or models of natural phenomena",
        "Re-express key elements across multiple representations"
      ]
    },
    {
      "practiceId": "AP-SP2",
      "code": "SP2",
      "title": "Mathematical Routines",
      "description": "The student can use mathematics appropriately.",
      "internalDimensions": ["PA"],
      "applicableSubjects": ["Chemistry", "Biology", "Physics", "Environmental Science"],
      "subSkills": [
        "Justify the selection of a mathematical routine to solve problems",
        "Apply mathematical routines to quantities that describe natural phenomena",
        "Estimate numerically quantities that describe natural phenomena"
      ]
    },
    {
      "practiceId": "AP-SP3",
      "code": "SP3",
      "title": "Questions and Methods",
      "description": "The student can engage in scientific questioning to extend thinking or to guide investigations within the context of the AP course.",
      "internalDimensions": ["QD", "DI"],
      "applicableSubjects": ["Chemistry", "Biology", "Physics", "Environmental Science"],
      "subSkills": [
        "Identify or pose a testable question based on an observation, data, or a model",
        "State the null and alternative hypotheses, or predict the results of an experiment",
        "Identify experimental procedures that are aligned to the question"
      ]
    },
    {
      "practiceId": "AP-SP4",
      "code": "SP4",
      "title": "Data Collection Strategies",
      "description": "The student can plan and implement data collection strategies in relation to a particular scientific question.",
      "internalDimensions": ["DI", "CD"],
      "applicableSubjects": ["Chemistry", "Biology", "Physics", "Environmental Science"],
      "subSkills": [
        "Justify the selection of the kind of data needed to answer a particular scientific question",
        "Design a plan for collecting data to answer a particular scientific question",
        "Collect data to answer a particular scientific question",
        "Evaluate sources of data to answer a particular scientific question"
      ]
    },
    {
      "practiceId": "AP-SP5",
      "code": "SP5",
      "title": "Data Analysis",
      "description": "The student can perform data analysis and evaluation of evidence.",
      "internalDimensions": ["PA", "EC"],
      "applicableSubjects": ["Chemistry", "Biology", "Physics", "Environmental Science"],
      "subSkills": [
        "Analyze data to identify patterns or relationships",
        "Refine observations and measurements based on data analysis",
        "Evaluate the evidence provided by data sets in relation to a particular scientific question"
      ]
    },
    {
      "practiceId": "AP-SP6",
      "code": "SP6",
      "title": "Argumentation",
      "description": "The student can work with scientific explanations and theories.",
      "internalDimensions": ["EC", "RC"],
      "applicableSubjects": ["Chemistry", "Biology", "Physics", "Environmental Science"],
      "subSkills": [
        "Make a scientific claim",
        "Support a claim with evidence from scientific principles, concepts, processes, and/or data",
        "Provide reasoning to justify a claim by connecting evidence to scientific theories",
        "Construct explanations of phenomena based on evidence produced through scientific practices",
        "Evaluate alternative scientific explanations",
        "Make claims and predictions about natural phenomena based on scientific theories and models"
      ]
    },
    {
      "practiceId": "AP-SP7",
      "code": "SP7",
      "title": "Cross-Domain Connections",
      "description": "The student is able to connect and relate knowledge across various scales, concepts, and representations in and across domains.",
      "internalDimensions": ["RC"],
      "applicableSubjects": ["Chemistry", "Physics"],
      "subSkills": [
        "Connect phenomena and models across spatial and temporal scales",
        "Connect concepts in and across domains to generalize or extrapolate"
      ]
    }
  ]
}
```

### 3d. `framework_ngss_sep.json`
NGSS Science and Engineering Practices — from the Next Generation Science Standards.

```json
{
  "frameworkId": "NGSS-SEP",
  "title": "NGSS Science and Engineering Practices",
  "version": "2013",
  "source": "NGSS Appendix F: Science and Engineering Practices",
  "lastUpdated": "2025-02-18",
  "practices": [
    {
      "practiceId": "NGSS-SEP1",
      "code": "SEP1",
      "title": "Asking Questions and Defining Problems",
      "internalDimensions": ["QD"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    },
    {
      "practiceId": "NGSS-SEP2",
      "code": "SEP2",
      "title": "Developing and Using Models",
      "internalDimensions": ["HP", "CM"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    },
    {
      "practiceId": "NGSS-SEP3",
      "code": "SEP3",
      "title": "Planning and Carrying Out Investigations",
      "internalDimensions": ["DI", "CD"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    },
    {
      "practiceId": "NGSS-SEP4",
      "code": "SEP4",
      "title": "Analyzing and Interpreting Data",
      "internalDimensions": ["PA"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    },
    {
      "practiceId": "NGSS-SEP5",
      "code": "SEP5",
      "title": "Using Mathematics and Computational Thinking",
      "internalDimensions": ["PA"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    },
    {
      "practiceId": "NGSS-SEP6",
      "code": "SEP6",
      "title": "Constructing Explanations and Designing Solutions",
      "internalDimensions": ["EC", "RC"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    },
    {
      "practiceId": "NGSS-SEP7",
      "code": "SEP7",
      "title": "Engaging in Argument from Evidence",
      "internalDimensions": ["EC"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    },
    {
      "practiceId": "NGSS-SEP8",
      "code": "SEP8",
      "title": "Obtaining, Evaluating, and Communicating Information",
      "internalDimensions": ["CM", "RC"],
      "gradeBands": ["K-2", "3-5", "6-8", "9-12"]
    }
  ]
}
```

### 3e. Cross-Framework Alignment Matrix

```json
{
  "alignmentId": "cross-framework-v1",
  "version": "1.0.0",
  "lastUpdated": "2025-02-18",
  "notes": "Many-to-many mappings. One internal dimension can map to multiple framework elements and vice versa. This enables vertical alignment views across grade levels and program tracks.",
  "mappings": [
    { "dimension": "QD", "framework": "IB-MYP-SCI", "criterionCode": "B", "strand": "B.i", "strength": "primary" },
    { "dimension": "QD", "framework": "IB-DP-IA", "criterionCode": "RD", "strength": "primary" },
    { "dimension": "QD", "framework": "AP-SCI", "practiceCode": "SP3", "strength": "primary" },
    { "dimension": "QD", "framework": "NGSS-SEP", "practiceCode": "SEP1", "strength": "primary" },
    
    { "dimension": "HP", "framework": "IB-MYP-SCI", "criterionCode": "B", "strand": "B.ii", "strength": "primary" },
    { "dimension": "HP", "framework": "IB-DP-IA", "criterionCode": "RD", "strength": "secondary" },
    { "dimension": "HP", "framework": "AP-SCI", "practiceCode": "SP3", "strength": "secondary" },
    { "dimension": "HP", "framework": "AP-SCI", "practiceCode": "SP6", "strength": "secondary" },
    { "dimension": "HP", "framework": "NGSS-SEP", "practiceCode": "SEP2", "strength": "secondary" },
    
    { "dimension": "DI", "framework": "IB-MYP-SCI", "criterionCode": "B", "strand": "B.iii-iv", "strength": "primary" },
    { "dimension": "DI", "framework": "IB-DP-IA", "criterionCode": "RD", "strength": "primary" },
    { "dimension": "DI", "framework": "AP-SCI", "practiceCode": "SP3", "strength": "secondary" },
    { "dimension": "DI", "framework": "AP-SCI", "practiceCode": "SP4", "strength": "primary" },
    { "dimension": "DI", "framework": "NGSS-SEP", "practiceCode": "SEP3", "strength": "primary" },
    
    { "dimension": "CD", "framework": "IB-MYP-SCI", "criterionCode": "C", "strand": "C.i", "strength": "primary" },
    { "dimension": "CD", "framework": "IB-DP-IA", "criterionCode": "DA", "strength": "primary" },
    { "dimension": "CD", "framework": "AP-SCI", "practiceCode": "SP4", "strength": "primary" },
    { "dimension": "CD", "framework": "NGSS-SEP", "practiceCode": "SEP3", "strength": "secondary" },
    
    { "dimension": "PA", "framework": "IB-MYP-SCI", "criterionCode": "C", "strand": "C.i-ii", "strength": "primary" },
    { "dimension": "PA", "framework": "IB-DP-IA", "criterionCode": "DA", "strength": "primary" },
    { "dimension": "PA", "framework": "AP-SCI", "practiceCode": "SP2", "strength": "primary" },
    { "dimension": "PA", "framework": "AP-SCI", "practiceCode": "SP5", "strength": "primary" },
    { "dimension": "PA", "framework": "NGSS-SEP", "practiceCode": "SEP4", "strength": "primary" },
    { "dimension": "PA", "framework": "NGSS-SEP", "practiceCode": "SEP5", "strength": "primary" },
    
    { "dimension": "EC", "framework": "IB-MYP-SCI", "criterionCode": "C", "strand": "C.iii-v", "strength": "primary" },
    { "dimension": "EC", "framework": "IB-DP-IA", "criterionCode": "CO", "strength": "primary" },
    { "dimension": "EC", "framework": "IB-DP-IA", "criterionCode": "EV", "strength": "primary" },
    { "dimension": "EC", "framework": "AP-SCI", "practiceCode": "SP5", "strength": "secondary" },
    { "dimension": "EC", "framework": "AP-SCI", "practiceCode": "SP6", "strength": "primary" },
    { "dimension": "EC", "framework": "NGSS-SEP", "practiceCode": "SEP6", "strength": "primary" },
    { "dimension": "EC", "framework": "NGSS-SEP", "practiceCode": "SEP7", "strength": "primary" },
    
    { "dimension": "CM", "framework": "IB-MYP-SCI", "criterionCode": "D", "strand": "D.iii-iv", "strength": "primary" },
    { "dimension": "CM", "framework": "IB-DP-IA", "criterionCode": "DA", "strength": "secondary", "notes": "Communication assessed implicitly through data presentation quality" },
    { "dimension": "CM", "framework": "AP-SCI", "practiceCode": "SP1", "strength": "primary" },
    { "dimension": "CM", "framework": "NGSS-SEP", "practiceCode": "SEP2", "strength": "secondary" },
    { "dimension": "CM", "framework": "NGSS-SEP", "practiceCode": "SEP8", "strength": "primary" },
    
    { "dimension": "RC", "framework": "IB-MYP-SCI", "criterionCode": "D", "strand": "D.i-ii", "strength": "primary" },
    { "dimension": "RC", "framework": "IB-DP-IA", "criterionCode": "CO", "strength": "secondary" },
    { "dimension": "RC", "framework": "IB-DP-IA", "criterionCode": "EV", "strength": "secondary" },
    { "dimension": "RC", "framework": "AP-SCI", "practiceCode": "SP6", "strength": "secondary" },
    { "dimension": "RC", "framework": "AP-SCI", "practiceCode": "SP7", "strength": "primary" },
    { "dimension": "RC", "framework": "NGSS-SEP", "practiceCode": "SEP6", "strength": "secondary" },
    { "dimension": "RC", "framework": "NGSS-SEP", "practiceCode": "SEP8", "strength": "secondary" }
  ]
}
```

---

## 4. Database Schema

### Dedicated Spreadsheet: `LabReports`

All lab report data lives in a separate spreadsheet linked from the main Learning Map spreadsheet via Config sheet reference.

#### Sheet: `LabTemplates`
| Column | Type | Description |
|--------|------|-------------|
| templateId | string | PK, auto-generated |
| title | string | Template name |
| gradeband | string | e.g. "MYP-Y4-5", "DP", "AP", "MS" |
| framework | string | Primary framework ID |
| sectionsJson | JSON | Array of section definitions (see Section Schema) |
| createdBy | string | Teacher email |
| status | string | draft / published / archived |
| createdAt | ISO datetime | |
| updatedAt | ISO datetime | |

#### Sheet: `LabRubrics`
| Column | Type | Description |
|--------|------|-------------|
| rubricId | string | PK |
| title | string | Rubric name |
| createdBy | string | Teacher email |
| scaleType | string | "numeric" or "level" |
| scaleMax | number | Max score per criterion |
| scaleLabelJson | JSON | Label definitions for each level |
| frameworkId | string | Which framework this rubric follows |
| multiScorer | boolean | Whether multiple scorers enabled |
| status | string | draft / published |
| createdAt | ISO datetime | |
| updatedAt | ISO datetime | |

#### Sheet: `LabRubricCriteria`
| Column | Type | Description |
|--------|------|-------------|
| criterionId | string | PK |
| rubricId | string | FK to LabRubrics |
| title | string | Criterion name |
| internalDimensions | string | Comma-separated dimension codes (e.g. "QD,HP,DI") |
| frameworkCriterionId | string | Optional link to framework criterion |
| sequence | number | Display order |
| weight | number | Scoring weight (default 1.0) |
| level0Desc | string | Descriptor for level 0 |
| level1Desc | string | Descriptor for level 1-2 |
| level2Desc | string | Descriptor for level 3-4 |
| level3Desc | string | Descriptor for level 5-6 |
| level4Desc | string | Descriptor for level 7-8 |

*Note: Level columns are flexible — number of levels matches rubric scaleMax configuration.*

#### Sheet: `LabAssignments`
| Column | Type | Description |
|--------|------|-------------|
| assignmentId | string | PK |
| templateId | string | FK to LabTemplates |
| rubricId | string | FK to LabRubrics |
| mapId | string | FK to Maps (Learning Map) |
| hexId | string | FK to specific hex (lab type) |
| courseId | string | FK to Courses |
| unitId | string | FK to Units |
| classId | string | FK to Classes |
| title | string | Assignment title |
| instructions | string | Teacher instructions |
| dueDate | ISO datetime | |
| sectionOverridesJson | JSON | Per-section customizations for this assignment |
| scaffoldLevel | string | "high" / "medium" / "low" / "none" |
| status | string | draft / active / closed |
| createdBy | string | |
| createdAt | ISO datetime | |
| updatedAt | ISO datetime | |

#### Sheet: `LabSubmissions`
| Column | Type | Description |
|--------|------|-------------|
| submissionId | string | PK |
| assignmentId | string | FK |
| studentEmail | string | |
| status | string | draft / submitted / returned / scored / final |
| sectionsDataJson | JSON | Student's response data per section |
| embeddedSheetsJson | JSON | Array of linked Google Sheet references |
| revisionNumber | number | Tracks revision cycles |
| submittedAt | ISO datetime | |
| returnedAt | ISO datetime | Null if not returned |
| exportDocId | string | Google Doc ID after export |
| exportDocUrl | string | Google Doc URL |

#### Sheet: `LabScores`
| Column | Type | Description |
|--------|------|-------------|
| scoreId | string | PK |
| submissionId | string | FK |
| criterionId | string | FK to LabRubricCriteria |
| scorerEmail | string | Who scored this criterion |
| scorerRole | string | "primary" or "moderator" |
| score | number | Score value |
| feedback | string | Per-criterion text feedback |
| scoredAt | ISO datetime | |

---

## 5. Section Schema (Template Sections)

Each template's `sectionsJson` contains an array of these objects:

```json
{
  "sectionId": "sec-001",
  "sectionType": "hypothesis",
  "title": "Hypothesis",
  "sequence": 3,
  "required": true,
  "promptText": "State your hypothesis. What do you predict will happen and why?",
  "helpText": "A good hypothesis is testable and includes both the prediction (what) and the reasoning (why, based on science).",
  "scaffoldLevels": {
    "high": {
      "sentenceStarters": [
        "If [independent variable] is [changed how], then [dependent variable] will [prediction] because [scientific reasoning]."
      ],
      "guideQuestions": [
        "What is your independent variable?",
        "What do you think will happen to the dependent variable?",
        "What science concept explains your prediction?"
      ]
    },
    "medium": {
      "sentenceStarters": [
        "If ___, then ___ because ___."
      ]
    },
    "low": {},
    "none": {}
  },
  "inputType": "richtext",
  "wordGuidance": { "min": 30, "max": 150 },
  "internalDimensions": ["HP"],
  "linkedCriteria": ["MYP-SCI-B.ii"]
}
```

### Section Types Enum

| Type | Description | Input Type |
|------|-------------|------------|
| `title_page` | Lab title, date, partners, course info | structured fields |
| `research_question` | The driving question | richtext |
| `background` | Context, theory, prior research | richtext |
| `hypothesis` | Prediction with reasoning | richtext |
| `variables` | IV, DV, controlled variables | structured table (3 columns) |
| `materials` | Equipment and materials list | list |
| `procedure` | Step-by-step method | ordered list with richtext |
| `safety` | Risk assessment, precautions | richtext + checklist |
| `raw_data` | Raw data tables | structured table builder |
| `data_processing` | Calculations, processed data, graphs | richtext + embedded sheets |
| `analysis` | Pattern identification, interpretation | richtext |
| `conclusion` | Claims from evidence | richtext |
| `evaluation` | Error analysis, limitations, validity | richtext |
| `reflection` | Extensions, real-world connections, implications | richtext |
| `bibliography` | Sources and citations | structured list |
| `custom` | Teacher-defined free-form section | richtext |

---

## 6. Student Editor Features

### Rich Text Formatting
- Bold, italic, underline, strikethrough
- Subscript / superscript (critical for chemistry: H₂O, CO₂, x²)
- Ordered and unordered lists
- Simple table insertion within text fields

### Chemical Notation
- Chemical formula input mode: auto-subscript for numbers after element symbols
- Common ion notation (charges as superscript)
- Reaction arrow characters (→, ⇌, ↔)
- Greek letters for common symbols (Δ, λ, α, β, etc.)

### Equation Support
- LaTeX-style equation input rendering (MathJax or KaTeX)
- Common chemistry/physics equation templates
- Inline and display equation modes

### Google Sheets Integration
- Student pastes a Google Sheets URL → app validates and embeds an iframe preview
- Linked sheets appear inline within the data_processing section
- Sheets must be shared with the teacher email (validated on link)
- Charts from the linked sheet render as embedded images in the export
- Multiple sheets can be linked per submission
- `embeddedSheetsJson` stores: `[{ url, sheetId, range, linkedAt, label }]`

### Data Table Builder
- For `raw_data` sections: structured table with configurable columns
- Students define column headers, units, and uncertainty columns
- Auto-numbering for trial rows
- Column types: text, number, number-with-uncertainty
- Template can pre-define table structure; students fill in values

---

## 7. Hex Integration

### New Hex Type: `lab`

Add to `HexType`: `'core' | 'ext' | 'scaf' | 'student' | 'class' | 'lab'`

Lab hex behavior:
- **Visual**: Distinct color theme (teal/cyan family) with beaker icon default
- **Click (Student)**: Opens the lab report editor for their submission
- **Click (Teacher, Builder)**: Opens assignment configuration (template + rubric selection)
- **Click (Teacher, View)**: Opens submission list / scoring interface
- **Unit Overview**: Lab assignments appear as cards in the Stage 2 (Evidence) section of UbD planner

### Types Update
```typescript
// Add to types.ts
export type HexType = 'core' | 'ext' | 'scaf' | 'student' | 'class' | 'lab';

export interface LabAssignment {
  assignmentId: string;
  templateId: string;
  rubricId: string;
  hexId: string;
  mapId: string;
  courseId?: string;
  unitId?: string;
  classId?: string;
  title: string;
  instructions?: string;
  dueDate?: string;
  scaffoldLevel: 'high' | 'medium' | 'low' | 'none';
  status: 'draft' | 'active' | 'closed';
  sectionOverrides?: Record<string, Partial<TemplateSection>>;
}

export interface LabSubmission {
  submissionId: string;
  assignmentId: string;
  studentEmail: string;
  status: 'draft' | 'submitted' | 'returned' | 'scored' | 'final';
  sections: Record<string, SectionData>;
  embeddedSheets?: EmbeddedSheet[];
  revisionNumber: number;
  submittedAt?: string;
  scores?: LabScore[];
}

export interface LabScore {
  criterionId: string;
  scorerEmail: string;
  scorerRole: 'primary' | 'moderator';
  score: number;
  feedback?: string;
  scoredAt: string;
}

export interface EmbeddedSheet {
  url: string;
  sheetId: string;
  range?: string;
  label?: string;
  linkedAt: string;
}
```

---

## 8. Preloaded Templates

### Template 1: IB MYP Full Investigation (Criteria B+C)
- Grade band: MYP Year 4-5
- Sections: research_question, hypothesis, variables, materials, procedure, safety, raw_data, data_processing, analysis, conclusion, evaluation
- Rubric: MYP Criteria B (8) + C (8)
- Scaffold: medium
- Dimensions: QD, HP, DI, CD, PA, EC

### Template 2: IB DP Internal Assessment
- Grade band: DP Year 1-2
- Sections: title_page, research_question, background, hypothesis, variables, procedure, safety, raw_data, data_processing, analysis, conclusion, evaluation, bibliography
- Rubric: DP IA 2025 (RD/DA/CO/EV, 6 marks each)
- Scaffold: low
- Dimensions: All 8

### Template 3: AP Lab Report
- Grade band: AP (Grades 10-12)
- Sections: title_page, research_question, background, hypothesis, procedure, raw_data, data_processing, analysis, conclusion, evaluation
- Rubric: Mapped to AP Science Practices (SP1-SP6)
- Scaffold: low
- Dimensions: QD, HP, DI, CD, PA, EC, CM

### Template 4: Quick Lab (Any Grade)
- Grade band: Universal
- Sections: research_question, hypothesis, raw_data, conclusion
- Rubric: Simplified 4-point per section
- Scaffold: configurable
- Dimensions: QD, HP, CD, EC

### Template 5: Guided Inquiry (Middle School / MYP Year 1-3)
- Grade band: MYP Year 1-3
- Sections: research_question (with heavy scaffolding), hypothesis (sentence starters), variables (structured table pre-filled with labels), procedure (numbered template), raw_data (pre-built table), analysis (guided questions), conclusion (scaffolded paragraph frame)
- Rubric: MYP Criteria B+C (Year 1-3 descriptors)
- Scaffold: high
- Dimensions: QD, HP, DI, CD, PA, EC

---

## 9. Analytics Design

### Per-Student View
- Radar/spider chart of 8 internal dimensions based on rubric scores
- Trend over time (lab 1, lab 2, lab 3...)
- Strongest/weakest dimensions highlighted
- Framework-specific report card (e.g., MYP Criteria B: 6/8, C: 5/8)

### Per-Class View
- Heatmap: students × dimensions, colored by score level
- Class average per dimension with distribution
- Identification of systematic gaps (e.g., "72% of class below adequate in Evaluating & Concluding")
- Comparison between class sections

### Vertical Alignment View
- Same dimension compared across grade levels
- Example: "Processing & Analyzing" in Grade 7 MYP → Grade 10 MYP → Grade 12 DP
- Shows whether expectations and performance progress appropriately
- Useful for department meetings, curriculum review

### Moderation View (Multi-Scorer)
- When multi-scorer is enabled on a rubric:
  - Two teachers independently score the same submission
  - Dashboard shows score comparison per criterion
  - Highlights discrepancies > 1 level apart
  - Inter-rater reliability statistics
- Useful for IB moderation prep and department calibration

---

## 10. Export Specifications

### Student Google Doc Export
- Generated from submission data using Google Docs API
- Formatted with school header, student info, date
- Each section as a heading with student content below
- Data tables preserved as Google Docs tables
- Embedded sheet charts inserted as images
- Rubric scores appended as a table at the end (teacher export only)
- Saved to student's Google Drive folder (configurable)

### Scored Rubric PDF
- Rubric grid with highlighted scores per criterion
- Per-criterion feedback inline
- Overall score and framework mapping
- Dimension summary visualization

---

## 11. Phased Story Breakdown

### Phase 1: Foundation & Config (6 stories, ~6 sessions)

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 1.1 | Create LabReports spreadsheet + schema | All sheets created with headers, Config sheet reference added |
| 1.2 | Framework JSON loader service | Load/parse all 4 framework configs + alignment matrix from JSON stored in Config sheet |
| 1.3 | Scientific Thinking Dimensions service | CRUD for dimensions, mapping lookups, cross-framework queries |
| 1.4 | Lab Template service (backend) | CRUD templates, section management, validation |
| 1.5 | Lab Rubric service (backend) | CRUD rubrics + criteria, framework linking, scale configuration |
| 1.6 | Add `lab` hex type to MapService | HexType update, visual config, click behavior routing |

### Phase 2: Assignment & Student Editor (6 stories, ~8 sessions)

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 2.1 | Assignment service (backend) | Create from template+rubric, assign to class, section overrides |
| 2.2 | Submission service (backend) | Draft save, submit, return, revision tracking |
| 2.3 | Lab Assignment Builder UI (teacher) | Template picker, section customizer, rubric selector, scaffold level |
| 2.4 | Student Lab Editor UI — core | Section-by-section form, save draft, submit, rich text |
| 2.5 | Student Lab Editor — chemical notation + equations | Subscript/superscript toolbar, LaTeX equations, special characters |
| 2.6 | Student Lab Editor — data tables + Google Sheets embed | Structured table builder, Sheets URL linking, iframe preview |

### Phase 3: Scoring & Export (5 stories, ~6 sessions)

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 3.1 | Scoring service (backend) | Save scores per criterion, multi-scorer support, aggregation |
| 3.2 | Teacher Scoring UI | Side-by-side student work + rubric, click-to-score, feedback fields |
| 3.3 | Student Results View | See scores, feedback, dimension summary after scoring |
| 3.4 | Google Doc export service | Generate formatted doc from submission, save to student folder |
| 3.5 | Scored Rubric PDF export | Rubric grid with scores, feedback, dimension visualization |

### Phase 4: Analytics & Alignment (5 stories, ~6 sessions)

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 4.1 | Per-student dimension analytics | Radar chart, trend lines, framework report |
| 4.2 | Per-class analytics dashboard | Heatmap, averages, gap identification |
| 4.3 | Vertical alignment view | Cross-grade dimension comparison, department-level reporting |
| 4.4 | Moderation/calibration tools | Multi-scorer comparison, discrepancy highlighting, IRR stats |
| 4.5 | Integration with Learning Map progress | Lab scores feed into hex progress, map dashboard updates |

**Total: ~22 stories across ~26 sessions**

---

## 12. Technical Decisions & Open Items

### Confirmed Decisions
- ✅ Structured table builder for student data entry
- ✅ Google Sheets linking (not in-app graphing)
- ✅ `lab` hex type with dedicated editor
- ✅ Level C rubric builder (full customization)
- ✅ Multi-scorer as toggle per rubric
- ✅ Dedicated LabReports spreadsheet
- ✅ Framework configs as editable JSON
- ✅ All 4 frameworks included (MYP, DP, AP, NGSS)
- ✅ Unified internal dimension model for cross-framework analytics
- ✅ Revision workflow (teacher returns → student revises)

### Open Items for Future Decision
- **In-app graphing**: Currently out of scope (students use Google Sheets). Could add basic charting later.
- **Peer review**: Students reviewing each other's work. Possible Phase 5 feature.
- **AI-assisted feedback**: Claude-generated formative feedback on draft submissions. Requires careful design around academic integrity.
- **Template marketplace**: Teachers sharing templates across the school/network. Phase 5+.
- **WIDA integration**: EAL scaffolding for lab report language. Ties into existing UDL-EAL-LS feature plans.

---

## 13. Session Handoff Notes

When starting a Claude Code session for this feature:
1. Share this document as context
2. Specify which story number you're working on
3. Share relevant existing files (Code.gs, Config.gs, etc.) as needed
4. The JSON configs in Section 3 should be stored in a `LabFrameworks` sheet as a single JSON column per framework, loaded by the framework loader service (Story 1.2)
