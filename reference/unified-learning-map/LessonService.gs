/**
 * Learning Map - Lesson Service
 *
 * Handles detailed lesson planning for individual hexes:
 * - Learning objectives aligned to standards
 * - UDL differentiation strategies
 * - Lesson sequences and activities
 * - Resources and materials
 * - Formative assessments
 *
 * @version 1.0.0
 */
// ============================================================================
// LESSON PLAN STRUCTURE
// ============================================================================
/**
 * Get lesson plan template
 *
 * @returns {Object} Empty lesson plan structure
 */
function getLessonTemplate() {
return {
// Basic Info
title: '',
duration: '', // e.g. "45 minutes", "2 class periods"
hexId: '',
// Learning Objectives
objectives: [], // Array of learning objectives
standardsAddressed: [], // Standards codes
// UDL Differentiation
udl: {
representation: [], // Multiple means of representation
actionExpression: [], // Multiple means of action/expression
engagement: [] // Multiple means of engagement
    },
// Lesson Sequence
openingActivity: '', // Hook, warm-up, review
mainActivities: [], // Core lesson activities
closingActivity: '', // Summary, exit ticket, reflection
// Resources
materials: [], // Materials needed
resources: [], // Links, handouts, videos
// Assessment
formativeAssessment: '', // Checks for understanding
successCriteria: [], // How students will demonstrate learning
// Notes
teacherNotes: '',
modifications: '' // Accommodations, extensions
  };
}
/**
 * Get lesson plan for hex
 * Returns stored lesson plan or empty template
 *
 * @param {string} hexId - Hex ID
 * @returns {Object} Lesson plan object
 */
function getLessonPlan(hexId) {
// Find map containing hex
const allMaps = readAll_(SHEETS_.MAPS);
let hex = null;
for (const mapRow of allMaps) {
const map = parseMapFromRow_(mapRow);
const foundHex = map.hexes.find(h => h.id === hexId);
if (foundHex) {
hex = foundHex;
break;
    }
  }
if (!hex) {
throw new Error('Hex not found');
  }
// Return lesson plan from hex or template
if (hex.lessonPlan) {
return hex.lessonPlan;
  }
const template = getLessonTemplate();
template.hexId = hexId;
template.title = hex.label;
// Pre-fill standards from hex curriculum
if (hex.curriculum && hex.curriculum.standards) {
template.standardsAddressed = hex.curriculum.standards;
  }
return template;
}
/**
 * Save lesson plan to hex
 *
 * @param {string} mapId - Map ID
 * @param {string} hexId - Hex ID
 * @param {Object} lessonPlan - Lesson plan object
 * @returns {Object} Updated map
 */
function saveLessonPlan(mapId, hexId, lessonPlan) {
if (!canEditMap(mapId)) {
throw new Error('You do not have permission to edit this map');
  }
const map = getMapById(mapId);
if (!map) {
throw new Error('Map not found');
  }
const hexIndex = map.hexes.findIndex(h => h.id === hexId);
if (hexIndex === -1) {
throw new Error('Hex not found');
  }
// Save lesson plan to hex
map.hexes[hexIndex].lessonPlan = lessonPlan;
return saveMap(map);
}
// ============================================================================
// LEARNING OBJECTIVES
// ============================================================================
/**
 * Generate learning objectives from standards
 * Uses Bloom's taxonomy verbs
 *
 * @param {Array<string>} standards - Standards codes
 * @param {string} bloomLevel - Bloom's level ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')
 * @returns {Array<string>} Generated objectives
 */
function generateObjectivesFromStandards(standards, bloomLevel) {
const bloomVerbs = {
remember: ['define', 'identify', 'list', 'recall', 'recognize', 'state'],
understand: ['describe', 'explain', 'summarize', 'interpret', 'compare', 'classify'],
apply: ['demonstrate', 'solve', 'use', 'apply', 'calculate', 'construct'],
analyze: ['analyze', 'differentiate', 'examine', 'investigate', 'categorize', 'contrast'],
evaluate: ['evaluate', 'critique', 'judge', 'justify', 'assess', 'defend'],
create: ['create', 'design', 'develop', 'synthesize', 'compose', 'formulate']
  };
const verbs = bloomVerbs[bloomLevel] || bloomVerbs.understand;
const objectives = [];
standards.forEach(standard => {
// Random verb from level
const verb = verbs[Math.floor(Math.random() * verbs.length)];
// Format: "Students will [verb] [standard concept]"
objectives.push(`Students will ${verb} concepts related to ${standard}`);
  });
return objectives;
}
/**
 * Add learning objective to lesson
 *
 * @param {string} hexId - Hex ID
 * @param {string} objective - Learning objective
 * @returns {Object} Updated lesson plan
 */
function addLearningObjective(hexId, objective) {
const lessonPlan = getLessonPlan(hexId);
if (!lessonPlan.objectives) {
lessonPlan.objectives = [];
  }
lessonPlan.objectives.push(objective);
// Find map and save
const allMaps = readAll_(SHEETS_.MAPS);
let mapId = null;
for (const mapRow of allMaps) {
const map = parseMapFromRow_(mapRow);
if (map.hexes.some(h => h.id === hexId)) {
mapId = map.mapId;
break;
    }
  }
if (mapId) {
saveLessonPlan(mapId, hexId, lessonPlan);
  }
return lessonPlan;
}
// ============================================================================
// LESSON ACTIVITIES
// ============================================================================
/**
 * Get activity templates by type
 *
 * @param {string} type - Activity type ('opening', 'main', 'closing')
 * @returns {Array<Object>} Activity templates
 */
function getActivityTemplates(type) {
const templates = {
opening: [
      {
name: 'Think-Pair-Share',
description: 'Students think individually, discuss with partner, then share with class',
duration: '10 minutes'
      },
      {
name: 'Quick Write',
description: 'Students write for 3-5 minutes on a prompt',
duration: '5 minutes'
      },
      {
name: 'KWL Chart',
description: 'What do you Know? What do you Want to know? What did you Learn?',
duration: '10 minutes'
      },
      {
name: 'Review Quiz',
description: 'Quick 5-question review of prior knowledge',
duration: '10 minutes'
      },
      // Strategic Teacher opening templates
      {
name: 'Mystery Hook',
description: 'Present a puzzling situation or surprising fact for students to investigate. Arouses curiosity and frames the lesson as an inquiry (Understanding style).',
duration: '5 minutes'
      },
      {
name: 'Window Notes Setup',
description: 'Distribute 4-quadrant note framework: Facts / Questions / Ideas / Feelings. Students prepare to capture learning across all four dimensions (Four-Style strategy).',
duration: '5 minutes'
      },
      {
name: 'KWL + Inductive Grouping',
description: 'KWL chart with inductive twist: students group their prior knowledge items by similarity, label the groups, and predict what patterns might emerge (Self-Expressive style).',
duration: '10 minutes'
      },
      {
name: 'Community Circle Warm-Up',
description: 'Pose a connecting question; each person shares one thought while others practice active listening. Builds mutual respect and emotional openness (Interpersonal style).',
duration: '10 minutes'
      },
      {
name: 'Graduated Difficulty Preview',
description: 'Show three levels of the task (Practice / Proficiency / Expert). Students self-select their starting level and set a personal improvement goal (Mastery style).',
duration: '5 minutes'
      }
    ],
main: [
      {
name: 'Direct Instruction',
description: 'Teacher-led presentation with examples',
duration: '20 minutes'
      },
      {
name: 'Guided Practice',
description: 'Students work with scaffolding and support',
duration: '20 minutes'
      },
      {
name: 'Lab Activity',
description: 'Hands-on exploration and experimentation',
duration: '30 minutes'
      },
      {
name: 'Collaborative Groups',
description: 'Small group work on problem or project',
duration: '25 minutes'
      },
      {
name: 'Jigsaw',
description: 'Expert groups teach other groups',
duration: '30 minutes'
      },
      // Strategic Teacher main activity templates
      {
name: 'New American Lecture',
description: 'Interactive lecturing: present content chunk, students process (note-pair-share, summarize), present next chunk, repeat cycle. Makes lectures brain-compatible (Mastery style).',
duration: '30 minutes'
      },
      {
name: 'Compare and Contrast',
description: 'Students describe items, identify comparison criteria, conduct systematic comparative analysis, and draw evidence-based conclusions (Understanding style).',
duration: '25 minutes'
      },
      {
name: 'Concept Attainment',
description: 'Present examples and non-examples of a concept. Students hypothesize critical attributes, test with new examples, then define the concept precisely (Understanding style).',
duration: '25 minutes'
      },
      {
name: 'Inductive Learning',
description: 'Students list items related to topic, group by similarity, label groups, predict patterns, then verify against content. Builds classification and prediction skills (Self-Expressive style).',
duration: '25 minutes'
      },
      {
name: 'Reciprocal Learning',
description: 'Student coaching partnerships: read/learn content, summarize for partner, partner asks clarifying questions, switch roles, reflect together (Interpersonal style).',
duration: '20 minutes'
      },
      {
name: 'Jigsaw (Strategic)',
description: 'Form expert groups to research subtopics deeply, return to home teams to teach findings, synthesize all subtopics into a whole understanding (Interpersonal style).',
duration: '30 minutes'
      },
      {
name: 'Decision Making',
description: 'Students identify a decision, list alternatives, establish evaluation criteria, rate options against criteria, and justify their final choice (Interpersonal style).',
duration: '25 minutes'
      },
      {
name: 'Task Rotation',
description: 'Differentiated 4-task grid: Mastery task (memorize/practice) + Understanding task (analyze/reason) + Self-Expressive task (create/imagine) + Interpersonal task (collaborate/discuss). All learners challenged in all styles (Four-Style strategy).',
duration: '40 minutes'
      },
      {
name: 'Mystery Investigation',
description: 'Present a puzzling situation, students collect and organize clues, propose explanations, then verify against evidence. Develops reasoning through intrigue (Understanding style).',
duration: '30 minutes'
      },
      {
name: 'Mind\'s Eye Visualization',
description: 'Students read a passage, create vivid mental images, sketch or describe their visualizations, discuss with peers, then connect images to content understanding (Self-Expressive style).',
duration: '20 minutes'
      }
    ],
closing: [
      {
name: 'Exit Ticket',
description: 'Quick check for understanding before leaving',
duration: '5 minutes'
      },
      {
name: '3-2-1',
description: '3 things learned, 2 questions, 1 application',
duration: '5 minutes'
      },
      {
name: 'Thumbs Up/Down',
description: 'Quick self-assessment of understanding',
duration: '2 minutes'
      },
      {
name: 'One-Minute Paper',
description: 'Summarize key concept in one minute',
duration: '5 minutes'
      },
      // Strategic Teacher closing templates
      {
name: 'Metaphor Reflection',
description: 'Students create a creative metaphor comparing the lesson topic to something unexpected, then explain the insight their metaphor reveals (Self-Expressive style).',
duration: '5 minutes'
      },
      {
name: 'Circle of Knowledge Debrief',
description: 'Inner circle discusses key takeaways while outer circle observes and takes notes. Switch roles. Whole class debriefs patterns noticed (Four-Style strategy).',
duration: '10 minutes'
      },
      {
name: 'Window Notes Review',
description: 'Students complete all 4 quadrants of their Window Notes: Facts learned, Questions remaining, Ideas sparked, Feelings about the learning (Four-Style strategy).',
duration: '5 minutes'
      },
      {
name: 'Reciprocal Summary',
description: 'Partner A summarizes the lesson to Partner B in 60 seconds, then switch. Class shares the most insightful summary points (Interpersonal style).',
duration: '5 minutes'
      }
    ]
  };
return templates[type] || [];
}
/**
 * Add activity to lesson
 *
 * @param {string} hexId - Hex ID
 * @param {string} activityType - Type ('opening', 'main', 'closing')
 * @param {Object} activity - Activity object {name, description, duration}
 * @returns {Object} Updated lesson plan
 */
function addActivity(hexId, activityType, activity) {
const lessonPlan = getLessonPlan(hexId);
if (activityType === 'opening') {
lessonPlan.openingActivity = activity;
  } else if (activityType === 'closing') {
lessonPlan.closingActivity = activity;
  } else if (activityType === 'main') {
if (!lessonPlan.mainActivities) {
lessonPlan.mainActivities = [];
    }
lessonPlan.mainActivities.push(activity);
  }
// Find map and save
const allMaps = readAll_(SHEETS_.MAPS);
let mapId = null;
for (const mapRow of allMaps) {
const map = parseMapFromRow_(mapRow);
if (map.hexes.some(h => h.id === hexId)) {
mapId = map.mapId;
break;
    }
  }
if (mapId) {
saveLessonPlan(mapId, hexId, lessonPlan);
  }
return lessonPlan;
}
// ============================================================================
// FORMATIVE ASSESSMENT
// ============================================================================
/**
 * Get formative assessment strategies
 *
 * @returns {Array<Object>} Assessment strategies
 */
function getFormativeAssessmentStrategies() {
return [
    {
name: 'Observation',
description: 'Watch students work and take anecdotal notes',
timing: 'During activity'
    },
    {
name: 'Questioning',
description: 'Ask probing questions to check understanding',
timing: 'Throughout lesson'
    },
    {
name: 'Think-Aloud',
description: 'Students verbalize their thinking process',
timing: 'During problem-solving'
    },
    {
name: 'Whiteboard Responses',
description: 'Students show answers on whiteboards simultaneously',
timing: 'Quick checks'
    },
    {
name: 'Four Corners',
description: 'Students move to corners based on their answer',
timing: 'Mid-lesson'
    },
    {
name: 'Misconception Check',
description: 'Present common errors and ask which is correct',
timing: 'After instruction'
    },
    {
name: 'Self-Assessment',
description: 'Students rate their own understanding (1-5 scale)',
timing: 'End of lesson'
    }
  ];
}

// ============================================================================
// STRATEGIC TEACHER STRATEGIES (Silver, Strong & Perini, 2007)
// ============================================================================

/**
 * 20 research-based strategies across 5 learning styles.
 * Source: The Strategic Teacher (ASCD, 2007).
 */
const STRATEGIC_TEACHER_STRATEGIES = {
  styles: [
    {
      key: 'mastery',
      label: 'Mastery',
      motivator: 'Success',
      color: '#2563eb',
      icon: '\uD83C\uDFAF',
      focus: 'Memory, summarization, and skill acquisition',
      whenToUse: 'When students need to memorize, practice, or master specific content and skills with clear sequences and immediate feedback',
      strategies: [
        {
          key: 'newAmericanLecture',
          name: 'New American Lecture',
          style: 'mastery',
          estimatedMinutes: '30-45',
          phases: [
            'Present content chunk (5-7 minutes)',
            'Students process: note-pair-share or summarize',
            'Present next chunk',
            'Repeat cycle 3-4 times',
            'Final synthesis activity'
          ],
          whenToUse: 'Delivering declarative content interactively; making lectures brain-compatible',
          description: 'Interactive lecturing that alternates between teacher presentation and student processing. Breaks content into manageable chunks with processing pauses to ensure retention.'
        },
        {
          key: 'directInstruction',
          name: 'Direct Instruction',
          style: 'mastery',
          estimatedMinutes: '30-40',
          phases: [
            'Modeling: teacher demonstrates the skill',
            'Directed practice: students replicate with close guidance',
            'Guided practice: students work with decreasing support',
            'Independent practice: students demonstrate mastery alone'
          ],
          whenToUse: 'Teaching procedural skills that require step-by-step mastery',
          description: 'A four-phase approach that gradually releases responsibility from teacher to student, ensuring each student can perform the skill independently.'
        },
        {
          key: 'graduatedDifficulty',
          name: 'Graduated Difficulty',
          style: 'mastery',
          estimatedMinutes: '25-35',
          phases: [
            'Present three difficulty levels: Practice, Proficiency, Expert',
            'Students self-assess and choose starting level',
            'Students set personal improvement goals',
            'Work through chosen level with option to advance',
            'Reflect on growth and set next goals'
          ],
          whenToUse: 'Allowing students to work at their readiness level while building toward mastery',
          description: 'Students choose tasks based on their current readiness, set goals for improvement, and self-monitor their progress through increasing difficulty levels.'
        },
        {
          key: 'teamsGamesTournaments',
          name: 'Teams-Games-Tournaments',
          style: 'mastery',
          estimatedMinutes: '35-45',
          phases: [
            'Teacher presents content to the whole class',
            'Students form cooperative study teams to review',
            'Teams practice and quiz each other',
            'Academic tournament: matched-ability competition across teams',
            'Team recognition and celebration'
          ],
          whenToUse: 'Reviewing and mastering critical content through cooperative study and academic competition',
          description: 'Combines cooperative team study with academic game competition. Students help teammates prepare, then compete individually at ability-matched tournament tables.'
        }
      ]
    },
    {
      key: 'understanding',
      label: 'Understanding',
      motivator: 'Curiosity',
      color: '#7c3aed',
      icon: '\uD83D\uDD0D',
      focus: 'Reasoning, explaining, and using evidence',
      whenToUse: 'When the goal is concept-heavy content, critical investigation, or teaching students to analyze and debate with evidence',
      strategies: [
        {
          key: 'compareAndContrast',
          name: 'Compare and Contrast',
          style: 'understanding',
          estimatedMinutes: '20-30',
          phases: [
            'Describe each item or concept separately',
            'Identify specific comparison criteria',
            'Conduct systematic comparison using criteria',
            'Draw evidence-based conclusions about similarities and differences',
            'Infer causes, effects, or deeper patterns'
          ],
          whenToUse: 'Helping students analyze relationships between concepts, events, or processes',
          description: 'Students conduct comparative analysis using specific criteria to find meaningful similarities and differences, then infer deeper causes and effects.'
        },
        {
          key: 'readingForMeaning',
          name: 'Reading for Meaning',
          style: 'understanding',
          estimatedMinutes: '20-30',
          phases: [
            'Present agree/disagree statements before reading',
            'Students preview statements and make initial predictions',
            'Read text actively, gathering evidence for each statement',
            'Share and discuss evidence found',
            'Refine interpretations based on evidence and discussion'
          ],
          whenToUse: 'Building active reading skills and evidence-based interpretation',
          description: 'Students use teacher-created statements to preview texts, then gather evidence to support or refute each statement, developing critical reading and argumentation skills.'
        },
        {
          key: 'conceptAttainment',
          name: 'Concept Attainment',
          style: 'understanding',
          estimatedMinutes: '20-30',
          phases: [
            'Present labeled examples (yes) and non-examples (no)',
            'Students hypothesize critical attributes of the concept',
            'Test hypotheses with new unlabeled examples',
            'Refine definition of critical attributes',
            'Apply concept to novel situations'
          ],
          whenToUse: 'Exploring concepts deeply through examination of examples and non-examples',
          description: 'Students explore concepts by examining carefully chosen examples and non-examples, developing their own definition of critical attributes through inquiry.'
        },
        {
          key: 'mystery',
          name: 'Mystery',
          style: 'understanding',
          estimatedMinutes: '25-35',
          phases: [
            'Present a puzzling situation or challenging question',
            'Distribute clues (evidence pieces) to students',
            'Students organize and categorize clues',
            'Propose explanations that account for all evidence',
            'Verify explanations and identify remaining questions'
          ],
          whenToUse: 'Engaging students in reasoning through intriguing problems or puzzling situations',
          description: 'Students explain puzzling situations or answer challenging questions by collecting, organizing, and interpreting clues to build evidence-based explanations.'
        }
      ]
    },
    {
      key: 'selfExpressive',
      label: 'Self-Expressive',
      motivator: 'Originality',
      color: '#059669',
      icon: '\uD83C\uDFA8',
      focus: 'Imagination, creativity, and originality',
      whenToUse: 'When the goal is exploring what-if scenarios, using imagery and metaphor, or creating unique products that demonstrate understanding',
      strategies: [
        {
          key: 'inductiveLearning',
          name: 'Inductive Learning',
          style: 'selfExpressive',
          estimatedMinutes: '20-30',
          phases: [
            'Present a list of items related to the topic',
            'Students group items by perceived similarity',
            'Label each group with a descriptive title',
            'Make predictions about patterns',
            'Verify predictions against actual content'
          ],
          whenToUse: 'Building classification skills and discovering patterns in content',
          description: 'Students group and label terms to discover underlying patterns, then make predictions and verify them against actual content. Develops pattern recognition and classification skills.'
        },
        {
          key: 'metaphoricalExpression',
          name: 'Metaphorical Expression',
          style: 'selfExpressive',
          estimatedMinutes: '15-25',
          phases: [
            'Describe the literal concept or topic',
            'Introduce a dissimilar comparison item',
            'Find surprising connections between the two',
            'Create and explain the metaphor',
            'Discuss insights the metaphor reveals'
          ],
          whenToUse: 'Developing creative thinking and new perspectives on familiar content',
          description: 'Students use creative comparisons between dissimilar items to develop new perspectives and deeper understanding through metaphorical thinking.'
        },
        {
          key: 'patternMaker',
          name: 'Pattern Maker',
          style: 'selfExpressive',
          estimatedMinutes: '20-30',
          phases: [
            'Identify a pattern or structure in the content',
            'Examine multiple examples that follow the pattern',
            'Apply the pattern to a new, unfamiliar context',
            'Predict outcomes based on the pattern',
            'Verify and refine understanding of the pattern'
          ],
          whenToUse: 'Helping students see underlying structures and extrapolate to new situations',
          description: 'Students identify the underlying structures behind texts and ideas, then apply those patterns to make predictions in new contexts (extrapolation).'
        },
        {
          key: 'mindsEye',
          name: "Mind's Eye",
          style: 'selfExpressive',
          estimatedMinutes: '15-25',
          phases: [
            'Read or listen to a passage carefully',
            'Create vivid mental images of the content',
            'Sketch or describe visualizations',
            'Share and discuss images with peers',
            'Connect mental images to deeper content understanding'
          ],
          whenToUse: 'Boosting reading comprehension and retention through visualization',
          description: 'Students convert words on a page into memorable mental images, then use those images as anchors for deeper comprehension and discussion.'
        }
      ]
    },
    {
      key: 'interpersonal',
      label: 'Interpersonal',
      motivator: 'Relationships',
      color: '#d97706',
      icon: '\uD83E\uDD1D',
      focus: 'Finding meaning in relationships and partnerships',
      whenToUse: 'When building a collegial learning environment, relating content to personal lives, or fostering team-based coaching and discussion',
      strategies: [
        {
          key: 'reciprocalLearning',
          name: 'Reciprocal Learning',
          style: 'interpersonal',
          estimatedMinutes: '15-25',
          phases: [
            'Read or learn content individually',
            'Partner A summarizes for Partner B',
            'Partner B asks clarifying questions',
            'Switch roles: Partner B summarizes, Partner A questions',
            'Reflect together on shared understanding'
          ],
          whenToUse: 'Building peer coaching skills and deepening understanding through teaching',
          description: 'Student coaching partnerships where students take turns summarizing, questioning, and reflecting. Teaching others deepens the teacher\'s own understanding.'
        },
        {
          key: 'decisionMaking',
          name: 'Decision Making',
          style: 'interpersonal',
          estimatedMinutes: '20-30',
          phases: [
            'Identify the decision to be made',
            'List possible alternatives',
            'Establish evaluation criteria (personal values + evidence)',
            'Rate each alternative against criteria',
            'Justify final choice with reasoning'
          ],
          whenToUse: 'Teaching values-based reasoning and evidence-informed decision making',
          description: 'Students evaluate alternatives based on personal values and objective criteria, practicing the skill of making and defending reasoned decisions.'
        },
        {
          key: 'jigsaw',
          name: 'Jigsaw',
          style: 'interpersonal',
          estimatedMinutes: '30-40',
          phases: [
            'Assign subtopics to expert groups',
            'Expert groups research their subtopic deeply',
            'Return to home teams (one expert per subtopic)',
            'Each expert teaches their subtopic to the home team',
            'Home team synthesizes all subtopics into whole understanding'
          ],
          whenToUse: 'Covering large amounts of content while building interdependence and teaching skills',
          description: 'Students become experts in one subtopic, then teach it to peers, creating positive interdependence where every student\'s contribution matters.'
        },
        {
          key: 'communityCircle',
          name: 'Community Circle',
          style: 'interpersonal',
          estimatedMinutes: '15-25',
          phases: [
            'Pose an open-ended question to the group',
            'Each person shares their thinking (go around the circle)',
            'Active listening: no interrupting, no judging',
            'Respond to emerging themes and connections',
            'Reflect on what was learned from others'
          ],
          whenToUse: 'Building mutual respect, emotional openness, and deep listening skills',
          description: 'Structured group discussions designed to build mutual respect and emotional openness through shared reflection and active listening.'
        }
      ]
    },
    {
      key: 'fourStyle',
      label: 'Four-Style',
      motivator: 'Balance',
      color: '#6366f1',
      icon: '\u2B50',
      focus: 'Integrating all four styles for balanced learning',
      whenToUse: 'When you want to ensure all learners are accommodated and challenged to grow in less-preferred styles through balanced, multi-modal activities',
      strategies: [
        {
          key: 'windowNotes',
          name: 'Window Notes',
          style: 'fourStyle',
          estimatedMinutes: '10-20',
          phases: [
            'Set up 4-quadrant note framework',
            'Facts quadrant: record key information (Mastery)',
            'Questions quadrant: write what puzzles you (Understanding)',
            'Ideas quadrant: brainstorm connections and possibilities (Self-Expressive)',
            'Feelings quadrant: capture personal reactions and values (Interpersonal)'
          ],
          whenToUse: 'Capturing learning across all four cognitive dimensions simultaneously',
          description: 'A note-making framework with four quadrants (Facts, Questions, Ideas, Feelings) that engages all four learning styles during any content delivery.'
        },
        {
          key: 'circleOfKnowledge',
          name: 'Circle of Knowledge',
          style: 'fourStyle',
          estimatedMinutes: '15-25',
          phases: [
            'Inner circle discusses the topic or question',
            'Outer circle observes, takes notes on arguments and evidence',
            'Switch: outer circle discusses, inner circle observes',
            'Whole group debriefs patterns and insights noticed',
            'Individual reflection on what changed their thinking'
          ],
          whenToUse: 'Facilitating high-participation, in-depth discussion with structured observation',
          description: 'A high-participation discussion technique where inner and outer circles alternate between discussing and observing, ensuring deep, focused thinking from all students.'
        },
        {
          key: 'doYouHearWhatIHear',
          name: 'Do You Hear What I Hear?',
          style: 'fourStyle',
          estimatedMinutes: '25-35',
          phases: [
            'Listen: teacher presents content orally or via audio',
            'Speak: students discuss what they heard with partners',
            'Read: students read related text to deepen understanding',
            'Write: students compose a written response synthesizing all modes'
          ],
          whenToUse: 'Building literacy across all four language domains: listening, speaking, reading, writing',
          description: 'A literacy approach that systematically builds skills across all four language domains by moving through listening, speaking, reading, and writing in sequence.'
        },
        {
          key: 'taskRotation',
          name: 'Task Rotation',
          style: 'fourStyle',
          estimatedMinutes: '35-45',
          phases: [
            'Design 4 tasks for the same content, one per style:',
            'Mastery task: memorize, practice, drill (e.g., flashcards, quiz prep)',
            'Understanding task: analyze, compare, argue (e.g., debate, analysis)',
            'Self-Expressive task: create, imagine, design (e.g., project, metaphor)',
            'Interpersonal task: discuss, relate, coach (e.g., teaching, reflection)',
            'Students rotate through all 4 or choose their path'
          ],
          whenToUse: 'Differentiating instruction and assessment to reach all learning styles',
          description: 'A framework for presenting tasks in all four styles, ensuring every student is both accommodated in their preferred style and challenged to grow in less-preferred styles.'
        }
      ]
    }
  ]
};

/**
 * Get Strategic Teacher strategies data
 * Returns the full 20-strategy framework for the guide tab and other consumers.
 *
 * @returns {Object} STRATEGIC_TEACHER_STRATEGIES
 */
function getStrategicTeacherStrategies() {
  return STRATEGIC_TEACHER_STRATEGIES;
}

/**
 * Add success criteria to lesson
 *
 * @param {string} hexId - Hex ID
 * @param {string} criteria - Success criteria
 * @returns {Object} Updated lesson plan
 */
function addSuccessCriteria(hexId, criteria) {
const lessonPlan = getLessonPlan(hexId);
if (!lessonPlan.successCriteria) {
lessonPlan.successCriteria = [];
  }
lessonPlan.successCriteria.push(criteria);
// Find map and save
const allMaps = readAll_(SHEETS_.MAPS);
let mapId = null;
for (const mapRow of allMaps) {
const map = parseMapFromRow_(mapRow);
if (map.hexes.some(h => h.id === hexId)) {
mapId = map.mapId;
break;
    }
  }
if (mapId) {
saveLessonPlan(mapId, hexId, lessonPlan);
  }
return lessonPlan;
}
// ============================================================================
// EXPORT
// ============================================================================
/**
 * Export lesson plan to Google Doc
 *
 * @param {string} hexId - Hex ID
 * @returns {string} Document URL
 */
function exportLessonPlanToDoc(hexId) {
requireRole(['administrator', 'teacher']);
const lessonPlan = getLessonPlan(hexId);
// Create document
const doc = DocumentApp.create(`Lesson Plan - ${lessonPlan.title}`);
const body = doc.getBody();
// Title
body.appendParagraph(lessonPlan.title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
body.appendParagraph(`Duration: ${lessonPlan.duration || 'Not specified'}`);
// Objectives
body.appendParagraph('Learning Objectives').setHeading(DocumentApp.ParagraphHeading.HEADING2);
if (lessonPlan.objectives && lessonPlan.objectives.length > 0) {
lessonPlan.objectives.forEach(obj => {
body.appendListItem(obj);
    });
  }
// Standards
if (lessonPlan.standardsAddressed && lessonPlan.standardsAddressed.length > 0) {
body.appendParagraph('Standards Addressed').setHeading(DocumentApp.ParagraphHeading.HEADING2);
body.appendParagraph(lessonPlan.standardsAddressed.join(', '));
  }
// Lesson Sequence
body.appendParagraph('Lesson Sequence').setHeading(DocumentApp.ParagraphHeading.HEADING2);
body.appendParagraph('Opening').setHeading(DocumentApp.ParagraphHeading.HEADING3);
body.appendParagraph(lessonPlan.openingActivity || 'Not specified');
body.appendParagraph('Main Activities').setHeading(DocumentApp.ParagraphHeading.HEADING3);
if (lessonPlan.mainActivities && lessonPlan.mainActivities.length > 0) {
lessonPlan.mainActivities.forEach((activity, i) => {
body.appendParagraph(`Activity ${i + 1}:`);
if (typeof activity === 'object') {
body.appendParagraph(`  ${activity.name || 'Unnamed'}: ${activity.description || ''}`);
      } else {
body.appendParagraph(`  ${activity}`);
      }
    });
  }
body.appendParagraph('Closing').setHeading(DocumentApp.ParagraphHeading.HEADING3);
body.appendParagraph(lessonPlan.closingActivity || 'Not specified');
// UDL
body.appendParagraph('UDL Differentiation').setHeading(DocumentApp.ParagraphHeading.HEADING2);
if (lessonPlan.udl) {
if (lessonPlan.udl.representation && lessonPlan.udl.representation.length > 0) {
body.appendParagraph('Representation:');
lessonPlan.udl.representation.forEach(s => body.appendListItem(s));
    }
if (lessonPlan.udl.actionExpression && lessonPlan.udl.actionExpression.length > 0) {
body.appendParagraph('Action & Expression:');
lessonPlan.udl.actionExpression.forEach(s => body.appendListItem(s));
    }
if (lessonPlan.udl.engagement && lessonPlan.udl.engagement.length > 0) {
body.appendParagraph('Engagement:');
lessonPlan.udl.engagement.forEach(s => body.appendListItem(s));
    }
  }
// Materials
if (lessonPlan.materials && lessonPlan.materials.length > 0) {
body.appendParagraph('Materials').setHeading(DocumentApp.ParagraphHeading.HEADING2);
lessonPlan.materials.forEach(m => body.appendListItem(m));
  }
// Assessment
body.appendParagraph('Formative Assessment').setHeading(DocumentApp.ParagraphHeading.HEADING2);
body.appendParagraph(lessonPlan.formativeAssessment || 'Not specified');
if (lessonPlan.successCriteria && lessonPlan.successCriteria.length > 0) {
body.appendParagraph('Success Criteria:');
lessonPlan.successCriteria.forEach(c => body.appendListItem(c));
  }
doc.saveAndClose();
return doc.getUrl();
}
// ============================================================================
// TEST FUNCTIONS
// ============================================================================
/**
 * Test lesson template
 */
function test_getLessonTemplate() {
const template = getLessonTemplate();
Logger.log('Lesson Template:');
Logger.log(JSON.stringify(template, null, 2));
}
/**
 * Test activity templates
 */
function test_getActivityTemplates() {
const types = ['opening', 'main', 'closing'];
types.forEach(type => {
const activities = getActivityTemplates(type);
Logger.log(`\n${type} activities:`);
activities.forEach((a, i) => {
Logger.log(`  ${i + 1}. ${a.name} (${a.duration})`);
Logger.log(`     ${a.description}`);
    });
  });
}
/**
 * Test formative assessment strategies
 */
function test_getFormativeStrategies() {
const strategies = getFormativeAssessmentStrategies();
Logger.log('Formative Assessment Strategies:');
strategies.forEach((s, i) => {
Logger.log(`  ${i + 1}. ${s.name}`);
Logger.log(`     ${s.description}`);
Logger.log(`     Timing: ${s.timing}`);
  });
}
/**
 * Test generating objectives
 */
function test_generateObjectives() {
const standards = ['NGSS-HS-PS1-1', 'NGSS-HS-PS1-2'];
const levels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
levels.forEach(level => {
const objectives = generateObjectivesFromStandards(standards, level);
Logger.log(`\n${level} level objectives:`);
objectives.forEach((obj, i) => {
Logger.log(`  ${i + 1}. ${obj}`);
    });
  });
}
