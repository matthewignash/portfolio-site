/**
 * ReportGenerator_IB.gs - Generates Google Doc reports for IB Chemistry students
 */

// ============================================================================
// FOLDER MANAGEMENT
// ============================================================================

/**
 * Get or create a parent folder for all IB Chemistry reports
 */
function getOrCreateParentFolder_() {
  const parentName = "IB Chemistry Assessment Reports";
  const existing = DriveApp.getFoldersByName(parentName);

  if (existing.hasNext()) {
    return existing.next();
  }

  return DriveApp.createFolder(parentName);
}

/**
 * Create exam subfolder within parent
 */
function api_createExamReportFolder(examId, examName, parentFolderId) {
  let parent;
  if (parentFolderId) {
    try {
      parent = DriveApp.getFolderById(parentFolderId);
    } catch (e) {
      parent = getOrCreateParentFolder_();
    }
  } else {
    parent = getOrCreateParentFolder_();
  }
  const subfolderName = `${examId} - ${examName || "Assessment"}`;

  // Check if subfolder exists
  const existing = parent.getFoldersByName(subfolderName);
  if (existing.hasNext()) {
    const folder = existing.next();
    return {
      id: folder.getId(),
      name: folder.getName(),
      url: folder.getUrl(),
      parentUrl: parent.getUrl()
    };
  }

  // Create subfolder
  const folder = parent.createFolder(subfolderName);
  return {
    id: folder.getId(),
    name: folder.getName(),
    url: folder.getUrl(),
    parentUrl: parent.getUrl()
  };
}

/**
 * Get or create an "Exam Papers" subfolder within the parent reports folder.
 */
function getOrCreateExamPapersFolder_() {
  var parent = getOrCreateParentFolder_();
  var folderName = "Exam Papers";
  var folders = parent.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(folderName);
}

/**
 * Returns OAuth token for Google Picker API on the client side.
 */
function api_getPickerConfig() {
  return {
    oauthToken: ScriptApp.getOAuthToken()
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate a single student report as a Google Doc, PDF, or both.
 * @param {string} examId
 * @param {string} studentKey
 * @param {string} folderId
 * @param {Object} [options] - { format: "doc"|"pdf"|"both", namingPattern: "custom"|"legacy" }
 */
function api_generateStudentReport(examId, studentKey, folderId, options) {
  options = options || {};
  const format = String(options.format || "doc").toLowerCase();
  const namingPattern = String(options.namingPattern || "legacy");

  // Get report data
  const data = getStudentReportData_(examId, studentKey);

  // Create document name based on naming pattern
  let docName;
  if (namingPattern === "custom") {
    const examNameClean = String(data.exam.exam_name || examId).replace(/[^a-zA-Z0-9_ ]/g, "").replace(/ +/g, "_");
    docName = `${data.student.first_name}_${data.student.last_name}_${examNameClean}`;
  } else {
    docName = `${data.student.class_section}_${data.student.last_name}_${data.student.first_name}_Report`;
  }

  // Create Google Doc
  const doc = DocumentApp.create(docName);
  const body = doc.getBody();

  // Set up styles
  const titleStyle = {};
  titleStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
  titleStyle[DocumentApp.Attribute.BOLD] = true;

  const headingStyle = {};
  headingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
  headingStyle[DocumentApp.Attribute.BOLD] = true;
  headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = "#1a73e8";

  const subheadingStyle = {};
  subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 12;
  subheadingStyle[DocumentApp.Attribute.BOLD] = true;

  const normalStyle = {};
  normalStyle[DocumentApp.Attribute.FONT_SIZE] = 10;
  normalStyle[DocumentApp.Attribute.BOLD] = false;

  const smallStyle = {};
  smallStyle[DocumentApp.Attribute.FONT_SIZE] = 9;
  smallStyle[DocumentApp.Attribute.ITALIC] = true;
  smallStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = "#666666";

  // =========================================================================
  // HEADER
  // =========================================================================
  const level = data.exam.level || "HL";
  const header = body.appendParagraph(`IB Chemistry ${level} Assessment Report`);
  header.setAttributes(titleStyle);
  header.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.appendParagraph("").setAttributes(normalStyle);

  // Student info table
  const infoTable = body.appendTable([
    ["Student:", `${data.student.first_name} ${data.student.last_name}`],
    ["Class:", data.student.class_section],
    ["Level:", level],
    ["Assessment:", data.exam.exam_name],
    ["Generated:", new Date().toLocaleDateString()]
  ]);
  formatInfoTable_(infoTable);

  body.appendParagraph("").setAttributes(normalStyle);

  // =========================================================================
  // OVERALL PERFORMANCE
  // =========================================================================
  const overallHeading = body.appendParagraph("OVERALL PERFORMANCE");
  overallHeading.setAttributes(headingStyle);

  // Overall score table
  const scoreTable = body.appendTable([
    ["Total Score", "IB Grade"],
    [`${data.scores.total_points} / ${data.scores.total_possible} points`, `Grade ${data.scores.ib_grade}`]
  ]);
  formatScoreTable_(scoreTable);

  body.appendParagraph("").setAttributes(normalStyle);

  // Paper breakdown if multiple papers
  if (data.scores.paper_1a_possible > 0 || data.scores.paper_1b_possible > 0 || data.scores.paper_2_possible > 0) {
    const paperBreakdown = body.appendParagraph("By Paper:");
    paperBreakdown.setAttributes(normalStyle);
    paperBreakdown.setBold(true);

    let paperText = [];
    if (data.scores.paper_1a_possible > 0) {
      paperText.push(`Paper 1A: ${data.scores.paper_1a_earned}/${data.scores.paper_1a_possible}`);
    }
    if (data.scores.paper_1b_possible > 0) {
      paperText.push(`Paper 1B: ${data.scores.paper_1b_earned}/${data.scores.paper_1b_possible}`);
    }
    if (data.scores.paper_2_possible > 0) {
      paperText.push(`Paper 2: ${data.scores.paper_2_earned}/${data.scores.paper_2_possible}`);
    }

    const paperLine = body.appendParagraph(paperText.join("  |  "));
    paperLine.setAttributes(normalStyle);
  }

  body.appendParagraph("").setAttributes(normalStyle);

  // =========================================================================
  // STRAND PERFORMANCE
  // =========================================================================
  const strandHeading = body.appendParagraph("STRAND PERFORMANCE");
  strandHeading.setAttributes(headingStyle);

  // Knowledge and Understanding
  if (data.scores.ku_possible > 0) {
    addStrandSection_(body, "Knowledge and Understanding (KU)",
      data.scores.ku_points, data.scores.ku_possible, data.scores.ku_band,
      data.scores.ku_language, subheadingStyle, normalStyle, smallStyle);
  }

  // Thinking and Transfer
  if (data.scores.tt_possible > 0) {
    addStrandSection_(body, "Thinking and Transfer (TT)",
      data.scores.tt_points, data.scores.tt_possible, data.scores.tt_band,
      data.scores.tt_language, subheadingStyle, normalStyle, smallStyle);
  }

  // Communication
  if (data.scores.c_possible > 0) {
    addStrandSection_(body, "Communication (C)",
      data.scores.c_points, data.scores.c_possible, data.scores.c_band,
      data.scores.c_language, subheadingStyle, normalStyle, smallStyle);
  }

  // =========================================================================
  // TOPIC ANALYSIS
  // =========================================================================
  body.appendPageBreak();

  const topicHeading = body.appendParagraph("TOPIC ANALYSIS");
  topicHeading.setAttributes(headingStyle);

  const topicIntro = body.appendParagraph("Topics organized by IB Chemistry syllabus. Review areas with lower scores for targeted study.");
  topicIntro.setAttributes(smallStyle);

  body.appendParagraph("").setAttributes(normalStyle);

  // Add categories with topic groups and subtopics
  if (data.topicAnalysis.byCategory && data.topicAnalysis.byCategory.length > 0) {
    data.topicAnalysis.byCategory.forEach(category => {
      addCategorySection_(body, category, headingStyle, subheadingStyle, normalStyle, smallStyle);
    });
  } else if (data.topicAnalysis.grouped && data.topicAnalysis.grouped.length > 0) {
    // Fallback to grouped format
    data.topicAnalysis.grouped.forEach(group => {
      addTopicGroupSection_(body, group, subheadingStyle, normalStyle, smallStyle);
    });
  }

  // =========================================================================
  // PAPER 1A DETAIL (if present)
  // =========================================================================
  if (data.paper1ADetails && data.paper1ADetails.length > 0) {
    body.appendPageBreak();

    const paper1AHeading = body.appendParagraph(`PAPER 1A DETAIL (${data.paper1ADetails.length} questions)`);
    paper1AHeading.setAttributes(headingStyle);

    const paper1ASummary = body.appendParagraph(
      `Summary: ${data.paper1ASummary.correct}/${data.paper1ASummary.total} correct`
    );
    paper1ASummary.setAttributes(normalStyle);
    paper1ASummary.setBold(true);

    // Strand breakdown
    const byStrand = data.paper1ASummary.byStrand;
    const strandBreakdown = body.appendParagraph(
      `By Strand:  KU: ${byStrand.KU.correct}/${byStrand.KU.total}  |  ` +
      `TT: ${byStrand.TT.correct}/${byStrand.TT.total}  |  ` +
      `C: ${byStrand.C.correct}/${byStrand.C.total}`
    );
    strandBreakdown.setAttributes(normalStyle);

    body.appendParagraph("").setAttributes(normalStyle);

    // Paper 1A table
    const paper1ATableData = [["#", "Your Answer", "Correct", "Result", "Strand", "Topic"]];
    data.paper1ADetails.forEach(q => {
      paper1ATableData.push([
        String(q.number),
        q.studentAnswer,
        q.correctAnswer,
        q.isCorrect ? "Y" : "N",
        q.strand || "KU",
        q.topic
      ]);
    });

    const paper1ATable = body.appendTable(paper1ATableData);
    const correctnessArray = data.paper1ADetails.map(q => q.isCorrect);
    formatMcqTable_(paper1ATable, correctnessArray);
  }

  // =========================================================================
  // PAPER 1B DETAIL (if present)
  // =========================================================================
  if (data.paper1BDetails && data.paper1BDetails.length > 0) {
    body.appendPageBreak();

    const paper1BHeading = body.appendParagraph("PAPER 1B DETAIL");
    paper1BHeading.setAttributes(headingStyle);

    const paper1BSummary = body.appendParagraph(
      `Summary: ${data.paper1BSummary.earned}/${data.paper1BSummary.total} points`
    );
    paper1BSummary.setAttributes(normalStyle);
    paper1BSummary.setBold(true);

    body.appendParagraph("").setAttributes(normalStyle);

    // Paper 1B questions with criteria
    data.paper1BDetails.forEach(q => {
      addQuestionSection_(body, q, subheadingStyle, normalStyle, smallStyle);
    });
  }

  // =========================================================================
  // PAPER 2 DETAIL (if present)
  // =========================================================================
  if (data.paper2Details && data.paper2Details.length > 0) {
    body.appendPageBreak();

    const paper2Heading = body.appendParagraph("PAPER 2 DETAIL");
    paper2Heading.setAttributes(headingStyle);

    const paper2Summary = body.appendParagraph(
      `Summary: ${data.paper2Summary.earned}/${data.paper2Summary.total} points`
    );
    paper2Summary.setAttributes(normalStyle);
    paper2Summary.setBold(true);

    body.appendParagraph("").setAttributes(normalStyle);

    // Paper 2 questions with criteria
    data.paper2Details.forEach(q => {
      addQuestionSection_(body, q, subheadingStyle, normalStyle, smallStyle);
    });
  }

  // =========================================================================
  // TEACHER COMMENTS SECTION
  // =========================================================================
  body.appendPageBreak();

  const commentsHeading = body.appendParagraph("TEACHER COMMENTS");
  commentsHeading.setAttributes(headingStyle);

  const commentsIntro = body.appendParagraph("Space for personalized feedback:");
  commentsIntro.setAttributes(smallStyle);

  body.appendParagraph("").setAttributes(normalStyle);

  // Add empty lines for teacher to write
  for (let i = 0; i < 10; i++) {
    body.appendParagraph("_".repeat(80)).setAttributes(normalStyle);
  }

  // =========================================================================
  // SAVE AND MOVE TO FOLDER
  // =========================================================================
  doc.saveAndClose();

  // Move to specified folder
  const file = DriveApp.getFileById(doc.getId());
  const folder = DriveApp.getFolderById(folderId);

  file.moveTo(folder);

  const result = {
    id: doc.getId(),
    name: docName,
    url: doc.getUrl()
  };

  // PDF generation
  if (format === "pdf" || format === "both") {
    const pdfBlob = file.getAs("application/pdf");
    pdfBlob.setName(docName + ".pdf");
    const pdfFile = folder.createFile(pdfBlob);
    result.pdfId = pdfFile.getId();
    result.pdfUrl = pdfFile.getUrl();
    result.pdfName = docName + ".pdf";
  }

  // If PDF only, trash the temporary Google Doc
  if (format === "pdf") {
    file.setTrashed(true);
    result.id = result.pdfId;
    result.url = result.pdfUrl;
    result.name = result.pdfName;
  }

  return result;
}

/**
 * Generate reports for multiple students
 */
function api_generateBatchReports(examId, studentKeys, folderId) {
  const results = [];

  studentKeys.forEach((sk, index) => {
    try {
      const result = api_generateStudentReport(examId, sk, folderId);
      results.push({
        student_key: sk,
        success: true,
        ...result
      });
    } catch (e) {
      results.push({
        student_key: sk,
        success: false,
        error: e.message
      });
    }
  });

  return results;
}

// ============================================================================
// HELPER FUNCTIONS FOR DOCUMENT FORMATTING
// ============================================================================

function formatInfoTable_(table) {
  table.setBorderWidth(0);
  for (let i = 0; i < table.getNumRows(); i++) {
    const row = table.getRow(i);
    row.getCell(0).setWidth(80).setBold(true);
    row.getCell(1).setWidth(200);
  }
}

function formatScoreTable_(table) {
  table.setBorderWidth(1);
  table.setBorderColor("#dddddd");

  // Header row
  const headerRow = table.getRow(0);
  for (let i = 0; i < headerRow.getNumCells(); i++) {
    headerRow.getCell(i).setBackgroundColor("#f0f0f0").setBold(true);
  }

  // Data row - center align
  const dataRow = table.getRow(1);
  for (let i = 0; i < dataRow.getNumCells(); i++) {
    dataRow.getCell(i).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }
}

function addStrandSection_(body, title, points, possible, band, language, subheadingStyle, normalStyle, smallStyle) {
  const strandTitle = body.appendParagraph(title);
  strandTitle.setAttributes(subheadingStyle);

  const scoreLine = body.appendParagraph(`Score: ${points}/${possible} points | AISC Band: ${band}`);
  scoreLine.setAttributes(normalStyle);
  scoreLine.setBold(true);

  if (language) {
    const langPara = body.appendParagraph(language);
    langPara.setAttributes(smallStyle);
  }

  body.appendParagraph("").setAttributes(normalStyle);
}

function addCategorySection_(body, category, headingStyle, subheadingStyle, normalStyle, smallStyle) {
  // Category status indicator based on ratio
  let categoryStatus = "Y";
  const ratio = category.possible > 0 ? (category.earned / category.possible) : 0;
  if (ratio < 0.5) categoryStatus = "N";
  else if (ratio < 0.75) categoryStatus = "Partial";

  // Category header with background
  const categoryTitle = body.appendParagraph(
    `${category.category.toUpperCase()}  --  ${category.earned}/${category.possible} pts ${categoryStatus}`
  );
  categoryTitle.setAttributes(headingStyle);
  categoryTitle.setBackgroundColor("#e8f5e9");

  body.appendParagraph("").setAttributes(normalStyle);

  // Add each topic group within this category
  category.topicGroups.forEach(group => {
    addTopicGroupSectionNew_(body, group, subheadingStyle, normalStyle, smallStyle);
  });

  body.appendParagraph("").setAttributes(normalStyle);
}

function addTopicGroupSectionNew_(body, group, subheadingStyle, normalStyle, smallStyle) {
  // Status indicator based on ratio
  let status = "Y";
  const ratio = group.possible > 0 ? (group.earned / group.possible) : 0;
  if (ratio < 0.5) status = "N";
  else if (ratio < 0.75) status = "Partial";

  // Topic group header
  const groupTitle = body.appendParagraph(
    `${group.group}  --  ${group.earned}/${group.possible} pts ${status}`
  );
  groupTitle.setAttributes(subheadingStyle);

  // Group description
  if (group.groupDescription) {
    const groupDesc = body.appendParagraph(group.groupDescription);
    groupDesc.setAttributes(smallStyle);
  }

  // Questions for this topic group
  if (group.questions && group.questions.length > 0) {
    const sortedQuestions = sortQuestions_(group.questions);
    const questionsLine = body.appendParagraph(`Questions: ${sortedQuestions.join(", ")}`);
    questionsLine.setAttributes(smallStyle);
    questionsLine.setItalic(true);
  }

  body.appendParagraph("").setAttributes(normalStyle);

  // Individual subtopics
  if (group.subtopics && group.subtopics.length > 0) {
    group.subtopics.forEach(subtopic => {
      const subtopicRatio = subtopic.possible > 0 ? (subtopic.earned / subtopic.possible) : 0;
      let subtopicStatus = "Y";
      if (subtopicRatio < 0.5) subtopicStatus = "N";
      else if (subtopicRatio < 0.75) subtopicStatus = "Partial";

      // Subtopic line with score
      const subtopicLine = body.appendParagraph(
        `    - ${subtopic.topic}: ${subtopic.earned}/${subtopic.possible} ${subtopicStatus}`
      );
      subtopicLine.setAttributes(normalStyle);

      // Color code based on performance ratio
      if (subtopicRatio < 0.5) {
        subtopicLine.setForegroundColor("#c62828");
      } else if (subtopicRatio < 0.75) {
        subtopicLine.setForegroundColor("#ef6c00");
      } else {
        subtopicLine.setForegroundColor("#2e7d32");
      }

      // Show questions for this specific subtopic
      if (subtopic.questions && subtopic.questions.length > 0) {
        const sortedSubtopicQs = sortQuestions_(subtopic.questions);
        const subtopicQsLine = body.appendParagraph(`         Questions: ${sortedSubtopicQs.join(", ")}`);
        subtopicQsLine.setAttributes(smallStyle);
      }

      // Show description for topics needing work (< 75%)
      if (subtopic.description && subtopicRatio < 0.75) {
        const descText = subtopic.description.length > 200
          ? subtopic.description.substring(0, 200) + "..."
          : subtopic.description;
        const subtopicDesc = body.appendParagraph(`         "${descText}"`);
        subtopicDesc.setAttributes(smallStyle);
        subtopicDesc.setForegroundColor("#666666");
      }
    });
  }

  body.appendParagraph("").setAttributes(normalStyle);
}

function addTopicGroupSection_(body, group, subheadingStyle, normalStyle, smallStyle) {
  let status = "Y";
  const ratio = group.possible > 0 ? (group.earned / group.possible) : 0;
  if (ratio < 0.5) status = "N";
  else if (ratio < 0.75) status = "Partial";

  const groupTitle = body.appendParagraph(
    `${group.group} - ${group.earned}/${group.possible} ${status}`
  );
  groupTitle.setAttributes(subheadingStyle);

  if (group.groupDescription) {
    const groupDesc = body.appendParagraph(group.groupDescription);
    groupDesc.setAttributes(smallStyle);
  }

  if (group.subtopics) {
    group.subtopics.forEach(topic => {
      const topicRatio = topic.possible > 0 ? (topic.earned / topic.possible) : 0;
      let topicStatus = "Y";
      if (topicRatio < 0.5) topicStatus = "N";
      else if (topicRatio < 0.75) topicStatus = "Partial";

      const topicLine = body.appendParagraph(
        `    - ${topic.topic}: ${topic.earned}/${topic.possible} ${topicStatus}`
      );
      topicLine.setAttributes(normalStyle);

      if (topic.description && topicRatio < 0.75) {
        const topicDesc = body.appendParagraph(`         "${topic.description.substring(0, 150)}${topic.description.length > 150 ? '...' : ''}"`);
        topicDesc.setAttributes(smallStyle);
      }
    });
  }

  body.appendParagraph("").setAttributes(normalStyle);
}

/**
 * Sort questions: Paper 1A first, then 1B, then 2
 */
function sortQuestions_(questions) {
  return questions.sort((a, b) => {
    // Extract paper and number from question ID
    const aParts = parseQuestionId_(a);
    const bParts = parseQuestionId_(b);

    // Sort by paper first (1A < 1B < 2)
    const paperOrder = {"1A": 1, "1B": 2, "2": 3};
    const aPaperOrder = paperOrder[aParts.paper] || 4;
    const bPaperOrder = paperOrder[bParts.paper] || 4;

    if (aPaperOrder !== bPaperOrder) {
      return aPaperOrder - bPaperOrder;
    }

    // Then by number
    return aParts.number - bParts.number;
  });
}

function parseQuestionId_(qid) {
  // Parse IDs like "1A_01", "1B_05", "2_03a"
  const match = String(qid).match(/^(1[AB]|2)_?(\d+)/i);
  if (match) {
    return {
      paper: match[1].toUpperCase(),
      number: parseInt(match[2]) || 0
    };
  }
  return { paper: "", number: 0 };
}

function formatMcqTable_(table, correctnessArray) {
  table.setBorderWidth(1);
  table.setBorderColor("#dddddd");

  // Header row styling
  const headerRow = table.getRow(0);
  for (let i = 0; i < headerRow.getNumCells(); i++) {
    headerRow.getCell(i).setBackgroundColor("#f0f0f0").setBold(true);
  }

  // Data rows
  for (let i = 1; i < table.getNumRows(); i++) {
    const row = table.getRow(i);
    const isCorrect = correctnessArray[i - 1];

    const resultCell = row.getCell(3);
    const strandCell = row.getCell(4);
    const strandText = strandCell.getText().trim().toUpperCase();

    // Color correct/incorrect
    if (isCorrect) {
      resultCell.setBackgroundColor("#e8f5e9");
    } else {
      row.getCell(1).setBackgroundColor("#ffebee");
      resultCell.setBackgroundColor("#ffebee");
    }

    // Color code strand
    if (strandText === "KU") {
      strandCell.setBackgroundColor("#e3f2fd");
    } else if (strandText === "TT") {
      strandCell.setBackgroundColor("#fff3e0");
    } else if (strandText === "C") {
      strandCell.setBackgroundColor("#f3e5f5");
    }

    // Center align columns except Topic
    for (let j = 0; j < 5; j++) {
      row.getCell(j).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
  }
}

function addQuestionSection_(body, q, subheadingStyle, normalStyle, smallStyle) {
  // Status indicator based on points earned vs max
  let status = "Y";
  let headerColor = "#2e7d32";

  if (q.earnedPoints === 0 && q.maxPoints > 0) {
    status = "N";
    headerColor = "#c62828";
  } else if (q.earnedPoints < q.maxPoints) {
    status = "Partial";
    headerColor = "#ef6c00";
  }

  // Question header with color
  const qTitle = body.appendParagraph(
    `${q.label} (${q.strand}) - Topic ${q.topic}    ${q.earnedPoints}/${q.maxPoints} pts  ${status}`
  );
  qTitle.setAttributes(subheadingStyle);
  qTitle.setForegroundColor(headerColor);

  // Criteria results (if checklist)
  if (q.criteriaResults && q.criteriaResults.length > 0) {
    const criteriaLabel = body.appendParagraph("Rubric Criteria:");
    criteriaLabel.setAttributes(normalStyle);
    criteriaLabel.setBold(true);

    q.criteriaResults.forEach(c => {
      const checkmark = c.earned ? "Y" : "N";
      const criteriaLine = body.appendParagraph(`  ${checkmark} ${c.criteria_text}`);
      criteriaLine.setAttributes(normalStyle);

      if (c.earned) {
        criteriaLine.setForegroundColor("#2e7d32");
      } else {
        criteriaLine.setForegroundColor("#c62828");
      }
    });
  }

  body.appendParagraph("").setAttributes(normalStyle);
}


// ============================================================================
// EXAM PAPER & ANSWER KEY EXPORT (Story 13)
// ============================================================================

/**
 * Helper: append content blocks (text + images) to a Google Doc body.
 * Used by both exam paper and answer key exports.
 */
function appendContentBlocks_(body, blocks, normalStyle) {
  if (!blocks || !blocks.length) return;
  var sorted = blocks.slice().sort(function(a, b) {
    return (a.block_order || 0) - (b.block_order || 0);
  });
  sorted.forEach(function(block) {
    if (block.block_type === "image" && block.content) {
      try {
        var file = DriveApp.getFileById(block.content.trim());
        var blob = file.getBlob();
        var img = body.appendImage(blob);
        // Scale image to fit within page width (max ~468 points for letter size)
        var w = img.getWidth();
        var h = img.getHeight();
        if (w > 468) {
          var ratio = 468 / w;
          img.setWidth(468);
          img.setHeight(Math.round(h * ratio));
        }
      } catch (e) {
        var placeholder = body.appendParagraph("[Image not found: " + block.content + "]");
        placeholder.setAttributes(normalStyle);
        placeholder.setForegroundColor("#ef4444");
      }
    } else {
      // Text block
      var lines = String(block.content || "").split("\n");
      lines.forEach(function(line) {
        var p = body.appendParagraph(line);
        p.setAttributes(normalStyle);
      });
    }
  });
}

/**
 * Export exam as a student-facing Google Doc (questions + images, NO answers).
 * Returns { url, name, folderId }
 */
function api_exportExamPaper(examId) {
  var exam_id = String(examId || "").trim();

  // Read exam metadata
  var exams = readAll_(SHEETS_.EXAMS);
  var exam = exams.find(function(e) { return String(e.exam_id) === exam_id; });
  if (!exam) throw new Error("Exam not found: " + exam_id);

  // Read questions sorted by paper/section/number
  var questions = api_getExamQuestions(exam_id);
  // Read all content blocks grouped by qid
  var contentBulk = api_getExamContentBulk(exam_id);

  var examName = String(exam.exam_name || exam_id);
  var level = String(exam.level || "");
  var date = String(exam.date || "");

  // Create Google Doc
  var doc = DocumentApp.create(examName + " - Exam Paper");
  var body = doc.getBody();

  // Style definitions
  var titleStyle = {};
  titleStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
  titleStyle[DocumentApp.Attribute.BOLD] = true;

  var headingStyle = {};
  headingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
  headingStyle[DocumentApp.Attribute.BOLD] = true;
  headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = "#1a73e8";

  var subheadingStyle = {};
  subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 12;
  subheadingStyle[DocumentApp.Attribute.BOLD] = true;

  var normalStyle = {};
  normalStyle[DocumentApp.Attribute.FONT_SIZE] = 10;
  normalStyle[DocumentApp.Attribute.BOLD] = false;

  var smallStyle = {};
  smallStyle[DocumentApp.Attribute.FONT_SIZE] = 9;
  smallStyle[DocumentApp.Attribute.ITALIC] = true;
  smallStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = "#666666";

  // Title
  var title = body.appendParagraph(examName);
  title.setAttributes(titleStyle);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  if (level || date) {
    var meta = body.appendParagraph((level ? level + " " : "") + (date ? "| " + date : ""));
    meta.setAttributes(smallStyle);
    meta.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }

  var spacer1 = body.appendParagraph("");
  spacer1.setAttributes(normalStyle);

  // Group questions by paper
  var papers = {};
  var paperOrder = ["1A", "1B", "2"];
  questions.forEach(function(q) {
    var p = q.paper || "Other";
    if (!papers[p]) papers[p] = [];
    papers[p].push(q);
  });

  var isFirstPaper = true;
  paperOrder.forEach(function(paperKey) {
    var qs = papers[paperKey];
    if (!qs || !qs.length) return;

    if (!isFirstPaper) {
      body.appendPageBreak();
    }
    isFirstPaper = false;

    // Paper heading
    var paperHeading = body.appendParagraph("Paper " + paperKey);
    paperHeading.setAttributes(headingStyle);

    var spacer2 = body.appendParagraph("");
    spacer2.setAttributes(normalStyle);

    // Number questions within this paper
    var qNum = 0;
    qs.forEach(function(q) {
      qNum++;
      var label = q.label || ("Q" + qNum);
      var pointsStr = q.points_possible > 0 ? " [" + q.points_possible + " marks]" : "";

      // Question label
      var qLabel = body.appendParagraph(label + pointsStr);
      qLabel.setAttributes(subheadingStyle);

      // Content blocks
      var blocks = contentBulk[q.qid];
      if (blocks && blocks.length) {
        appendContentBlocks_(body, blocks, normalStyle);
      }

      // Answer space
      if (paperKey === "1A") {
        var ansLine = body.appendParagraph("Answer: ________");
        ansLine.setAttributes(normalStyle);
      }

      var spacer3 = body.appendParagraph("");
      spacer3.setAttributes(normalStyle);
    });
  });

  // Handle questions with no paper assignment
  var otherQs = papers["Other"];
  if (otherQs && otherQs.length) {
    body.appendPageBreak();
    var otherHeading = body.appendParagraph("Additional Questions");
    otherHeading.setAttributes(headingStyle);

    var spacer4 = body.appendParagraph("");
    spacer4.setAttributes(normalStyle);

    otherQs.forEach(function(q, idx) {
      var label = q.label || ("Q" + (idx + 1));
      var qLabel = body.appendParagraph(label);
      qLabel.setAttributes(subheadingStyle);
      var blocks = contentBulk[q.qid];
      if (blocks && blocks.length) {
        appendContentBlocks_(body, blocks, normalStyle);
      }

      var spacer5 = body.appendParagraph("");
      spacer5.setAttributes(normalStyle);
    });
  }

  doc.saveAndClose();

  // Move to exam papers folder
  var folder = getOrCreateExamPapersFolder_();
  var file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return {
    url: doc.getUrl(),
    name: doc.getName(),
    folderId: folder.getId()
  };
}

/**
 * Export answer key as a Google Doc (questions + answers + rubric criteria).
 * Returns { url, name, folderId }
 */
function api_exportAnswerKey(examId) {
  var exam_id = String(examId || "").trim();

  // Read exam metadata
  var exams = readAll_(SHEETS_.EXAMS);
  var exam = exams.find(function(e) { return String(e.exam_id) === exam_id; });
  if (!exam) throw new Error("Exam not found: " + exam_id);

  // Read questions, content blocks, and rubrics
  var questions = api_getExamQuestions(exam_id);
  var contentBulk = api_getExamContentBulk(exam_id);
  var allRubrics = readAll_(SHEETS_.RUBRICS).filter(function(r) {
    return String(r.exam_id) === exam_id;
  });

  // Group rubrics by qid
  var rubricsByQid = {};
  allRubrics.forEach(function(r) {
    var q = String(r.qid || "");
    if (!q) return;
    if (!rubricsByQid[q]) rubricsByQid[q] = [];
    rubricsByQid[q].push(r);
  });

  var examName = String(exam.exam_name || exam_id);
  var level = String(exam.level || "");
  var date = String(exam.date || "");

  // Create Google Doc
  var doc = DocumentApp.create(examName + " - Answer Key");
  var body = doc.getBody();

  // Style definitions
  var titleStyle = {};
  titleStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
  titleStyle[DocumentApp.Attribute.BOLD] = true;

  var headingStyle = {};
  headingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
  headingStyle[DocumentApp.Attribute.BOLD] = true;
  headingStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = "#1a73e8";

  var subheadingStyle = {};
  subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 12;
  subheadingStyle[DocumentApp.Attribute.BOLD] = true;

  var normalStyle = {};
  normalStyle[DocumentApp.Attribute.FONT_SIZE] = 10;
  normalStyle[DocumentApp.Attribute.BOLD] = false;

  var answerStyle = {};
  answerStyle[DocumentApp.Attribute.FONT_SIZE] = 10;
  answerStyle[DocumentApp.Attribute.BOLD] = true;
  answerStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = "#2e7d32";

  var smallStyle = {};
  smallStyle[DocumentApp.Attribute.FONT_SIZE] = 9;
  smallStyle[DocumentApp.Attribute.ITALIC] = true;
  smallStyle[DocumentApp.Attribute.FOREGROUND_COLOR] = "#666666";

  // Title
  var title = body.appendParagraph(examName + " - ANSWER KEY");
  title.setAttributes(titleStyle);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  if (level || date) {
    var meta = body.appendParagraph((level ? level + " " : "") + (date ? "| " + date : ""));
    meta.setAttributes(smallStyle);
    meta.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }

  var akSpacer1 = body.appendParagraph("");
  akSpacer1.setAttributes(normalStyle);

  // Group questions by paper
  var papers = {};
  var paperOrder = ["1A", "1B", "2"];
  questions.forEach(function(q) {
    var p = q.paper || "Other";
    if (!papers[p]) papers[p] = [];
    papers[p].push(q);
  });

  var isFirstPaper = true;
  paperOrder.forEach(function(paperKey) {
    var qs = papers[paperKey];
    if (!qs || !qs.length) return;

    if (!isFirstPaper) {
      body.appendPageBreak();
    }
    isFirstPaper = false;

    // Paper heading
    var paperHeading = body.appendParagraph("Paper " + paperKey);
    paperHeading.setAttributes(headingStyle);

    var akSpacer2 = body.appendParagraph("");
    akSpacer2.setAttributes(normalStyle);

    var qNum = 0;
    qs.forEach(function(q) {
      qNum++;
      var label = q.label || ("Q" + qNum);
      var pointsStr = q.points_possible > 0 ? " [" + q.points_possible + " marks]" : "";

      // Question label
      var qLabel = body.appendParagraph(label + pointsStr);
      qLabel.setAttributes(subheadingStyle);

      // Content blocks
      var blocks = contentBulk[q.qid];
      if (blocks && blocks.length) {
        appendContentBlocks_(body, blocks, normalStyle);
      }

      // Answer section
      if (q.correct_answer) {
        var answerPara = body.appendParagraph("Correct Answer: " + q.correct_answer);
        answerPara.setAttributes(answerStyle);
      }

      // Model answer (question_text field)
      if (q.question_text) {
        var modelLabel = body.appendParagraph("Model Answer:");
        modelLabel.setAttributes(normalStyle);
        modelLabel.setBold(true);
        var modelText = body.appendParagraph(q.question_text);
        modelText.setAttributes(normalStyle);
      }

      // Rubric criteria
      var rubricItems = rubricsByQid[q.qid];
      if (rubricItems && rubricItems.length) {
        rubricItems.sort(function(a, b) {
          return String(a.item_id || "").localeCompare(String(b.item_id || ""));
        });

        var rubricLabel = body.appendParagraph("Rubric Criteria:");
        rubricLabel.setAttributes(normalStyle);
        rubricLabel.setBold(true);

        // Build rubric table
        var tableData = [["#", "Criteria", "Points"]];
        var totalPts = 0;
        rubricItems.forEach(function(ri) {
          var pts = Number(ri.points || 0);
          totalPts += pts;
          tableData.push([
            String(ri.item_id || ""),
            String(ri.criteria_text || ""),
            String(pts)
          ]);
        });
        tableData.push(["", "Total", String(totalPts)]);

        var table = body.appendTable(tableData);
        // Style the table header row
        var headerRow = table.getRow(0);
        for (var c = 0; c < headerRow.getNumCells(); c++) {
          headerRow.getCell(c).setBackgroundColor("#e8f0fe");
          headerRow.getCell(c).getChild(0).asParagraph().setAttributes(normalStyle);
          headerRow.getCell(c).getChild(0).asParagraph().setBold(true);
        }
        // Style data rows
        for (var r = 1; r < table.getNumRows(); r++) {
          for (var c2 = 0; c2 < table.getRow(r).getNumCells(); c2++) {
            table.getRow(r).getCell(c2).getChild(0).asParagraph().setAttributes(normalStyle);
          }
        }
        // Style total row
        var lastRow = table.getRow(table.getNumRows() - 1);
        for (var c3 = 0; c3 < lastRow.getNumCells(); c3++) {
          lastRow.getCell(c3).setBackgroundColor("#f0fdf4");
          lastRow.getCell(c3).getChild(0).asParagraph().setBold(true);
        }
      }

      var akSpacer3 = body.appendParagraph("");
      akSpacer3.setAttributes(normalStyle);
    });
  });

  // Handle questions with no paper assignment
  var otherQs = papers["Other"];
  if (otherQs && otherQs.length) {
    body.appendPageBreak();
    var otherHeading = body.appendParagraph("Additional Questions");
    otherHeading.setAttributes(headingStyle);

    var akSpacer4 = body.appendParagraph("");
    akSpacer4.setAttributes(normalStyle);

    otherQs.forEach(function(q, idx) {
      var label = q.label || ("Q" + (idx + 1));
      var qLabel = body.appendParagraph(label);
      qLabel.setAttributes(subheadingStyle);
      var blocks = contentBulk[q.qid];
      if (blocks && blocks.length) {
        appendContentBlocks_(body, blocks, normalStyle);
      }
      if (q.correct_answer) {
        var answerPara = body.appendParagraph("Correct Answer: " + q.correct_answer);
        answerPara.setAttributes(answerStyle);
      }
      if (q.question_text) {
        var modelText = body.appendParagraph("Model Answer: " + q.question_text);
        modelText.setAttributes(normalStyle);
      }

      var akSpacer5 = body.appendParagraph("");
      akSpacer5.setAttributes(normalStyle);
    });
  }

  doc.saveAndClose();

  // Move to exam papers folder
  var folder = getOrCreateExamPapersFolder_();
  var file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return {
    url: doc.getUrl(),
    name: doc.getName(),
    folderId: folder.getId()
  };
}
