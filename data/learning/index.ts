export { gradingAppContent } from "./grading-app";
export { kanbanContent } from "./kanban";
export { learningHubContent } from "./learning-hub";

import type { CaseStudyLearningContent } from "@/lib/learning-mode-types";
import { gradingAppContent } from "./grading-app";
import { kanbanContent } from "./kanban";
import { learningHubContent } from "./learning-hub";

export const allLearningContent: Record<string, CaseStudyLearningContent> = {
  "grading-app": gradingAppContent,
  kanban: kanbanContent,
  "learning-hub": learningHubContent,
};
