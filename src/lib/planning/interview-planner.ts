export type Strictness = "low" | "medium" | "high";

export type NextStepDecision =
  | "follow_up"
  | "next_stage"
  | "correct_and_continue"
  | "guide_retry"
  | "challenge_inconsistency"
  | "mark_possible_fabrication"
  | "downgrade_difficulty"
  | "increase_difficulty"
  | "finish_stage"
  | "finish_interview";

export const NEXT_STEP_DECISIONS: NextStepDecision[] = [
  "follow_up",
  "next_stage",
  "correct_and_continue",
  "guide_retry",
  "challenge_inconsistency",
  "mark_possible_fabrication",
  "downgrade_difficulty",
  "increase_difficulty",
  "finish_stage",
  "finish_interview",
];

export type AnswerQuality = {
  correctness: number;
  specificity: number;
  depth: number;
  project_relevance: number;
  clarity: number;
  evidence_strength: number;
};

export type InterviewStagePlan = {
  stage_id: string;
  stage_name: string;
  target_skill: string;
  priority: "core" | "supporting";
  purpose: string;
  knowledge_points: string[];
  suggested_question_count: number;
  expected_depth: string;
  pass_criteria: string[];
  stop_criteria: string[];
  follow_up_directions: string[];
};

export type InitialInterviewPlan = {
  session_goal: string;
  target_role: string;
  strictness: Strictness;
  interview_style: string;
  historical_weaknesses: string[];
  stages: InterviewStagePlan[];
};

export type NextStepPlan = {
  turn_id: string;
  current_stage: string;
  current_target_skill: string;
  answer_quality: AnswerQuality;
  covered_knowledge_points: string[];
  missing_knowledge_points: string[];
  detected_issues: Array<{ type: string; description: string }>;
  risk_flags: string[];
  decision: NextStepDecision;
  decision_reason: string;
  next_action: {
    action_type: string;
    question: string;
    why_ask_this: string;
    knowledge_points_to_cover: string[];
    expected_good_answer_points: string[];
  };
  stage_control: {
    should_continue_current_stage: boolean;
    should_move_to_next_stage: boolean;
    should_end_interview: boolean;
    follow_up_count_in_current_stage: number;
    max_follow_up_count: number;
    stop_follow_up_condition: string;
  };
};

export type PlanningState = {
  currentStageId: string;
  followUpCount: number;
  turnCount: number;
  evidenceCount: number;
  riskFlags: string[];
  skillCoverage: Record<string, "effective_answer" | "effective_failure">;
};

const STRICTNESS_MAX_FOLLOW_UP: Record<Strictness, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const SKILL_TEMPLATES: Record<
  string,
  Pick<InterviewStagePlan, "stage_name" | "purpose" | "knowledge_points" | "follow_up_directions">
> = {
  project_authenticity: {
    stage_name: "项目真实性确认",
    purpose: "确认候选人是否真实参与过项目，而不是只背概念。",
    knowledge_points: ["项目背景", "个人职责", "技术选型原因", "核心难点", "上线或测试结果"],
    follow_up_directions: ["追问具体代码实现", "追问为什么这样设计", "追问异常场景如何处理"],
  },
  memory_management: {
    stage_name: "Agent Memory 深挖",
    purpose: "验证候选人是否理解短期记忆、长期记忆、上下文压缩和记忆写入策略。",
    knowledge_points: [
      "Redis 存储短期上下文",
      "MySQL 存储长期记录",
      "Redis key 设计",
      "TTL 策略",
      "rolling summary 更新方式",
      "memory 写入条件",
      "长期记忆污染控制",
    ],
    follow_up_directions: ["追问 Redis key 设计", "追问 TTL 策略", "追问长期记忆污染控制"],
  },
  rag: {
    stage_name: "RAG 与知识召回",
    purpose: "验证候选人是否能把 JD、题库、检索和模型上下文结合成可落地方案。",
    knowledge_points: ["索引构建", "召回策略", "重排策略", "上下文拼接", "召回质量评估"],
    follow_up_directions: ["追问 chunk 策略", "追问召回评估", "追问低质量召回如何兜底"],
  },
  llm_integration: {
    stage_name: "LLM 调用与成本控制",
    purpose: "评估候选人是否理解模型调用、prompt cache、token 成本和失败兜底。",
    knowledge_points: ["模型选择", "messages 构造", "prompt cache", "token 成本", "失败重试"],
    follow_up_directions: ["追问缓存命中边界", "追问多模型降级", "追问 token 预算控制"],
  },
  backend_engineering: {
    stage_name: "后端工程实现",
    purpose: "验证候选人是否能把需求落成稳定的 API、数据模型和异常处理流程。",
    knowledge_points: ["API 设计", "数据表结构", "事务边界", "异常处理", "可观测性"],
    follow_up_directions: ["追问表结构", "追问接口幂等", "追问失败恢复"],
  },
  frontend_engineering: {
    stage_name: "前端工程实现",
    purpose: "验证候选人是否能把页面、组件、状态、性能和工程质量落到真实项目里。",
    knowledge_points: ["组件设计", "状态管理", "TypeScript 类型建模", "前端性能优化", "异常和加载状态"],
    follow_up_directions: ["追问组件边界", "追问性能指标", "追问异常状态和可维护性"],
  },
  algorithm_foundation: {
    stage_name: "算法与问题拆解",
    purpose: "验证候选人是否能清晰拆解问题、说明复杂度并处理边界输入。",
    knowledge_points: ["问题建模", "复杂度分析", "边界条件", "数据结构选择", "测试用例"],
    follow_up_directions: ["追问复杂度", "追问边界条件", "追问替代解法"],
  },
  architecture_tradeoff: {
    stage_name: "架构权衡与边界场景",
    purpose: "考察候选人在成本、性能、可靠性和演进性之间做工程取舍的能力。",
    knowledge_points: ["性能瓶颈", "成本控制", "一致性风险", "失败恢复", "演进方案"],
    follow_up_directions: ["追问高并发场景", "追问成本上限", "追问灾备和恢复"],
  },
};

const KEYWORD_TO_SKILL: Array<[string, string]> = [
  ["agent memory", "memory_management"],
  ["memory", "memory_management"],
  ["redis", "memory_management"],
  ["ttl", "memory_management"],
  ["rag", "rag"],
  ["检索", "rag"],
  ["向量", "rag"],
  ["llm", "llm_integration"],
  ["大模型", "llm_integration"],
  ["prompt", "llm_integration"],
  ["cache", "llm_integration"],
  ["mysql", "backend_engineering"],
  ["spring boot", "backend_engineering"],
  ["spring", "backend_engineering"],
  ["java", "backend_engineering"],
  ["api", "backend_engineering"],
  ["后端", "backend_engineering"],
  ["react", "frontend_engineering"],
  ["vue", "frontend_engineering"],
  ["typescript", "frontend_engineering"],
  ["css", "frontend_engineering"],
  ["前端", "frontend_engineering"],
  ["组件", "frontend_engineering"],
  ["首屏", "frontend_engineering"],
  ["算法", "algorithm_foundation"],
  ["复杂度", "algorithm_foundation"],
  ["架构", "architecture_tradeoff"],
  ["性能", "architecture_tradeoff"],
];

const KNOWLEDGE_SYNONYMS: Record<string, string[]> = {
  "Redis 存储短期上下文": ["redis", "短期", "上下文", "recent_turns", "session_state"],
  "MySQL 存储长期记录": ["mysql", "长期", "记录", "落库", "report", "evaluation"],
  "Redis key 设计": ["key", "session_id", "recent_turns", "session_state", "hash", "list"],
  "TTL 策略": ["ttl", "过期", "生命周期", "30 分钟", "24 小时"],
  "rolling summary 更新方式": ["rolling_summary", "summary", "摘要", "压缩", "更新"],
  "memory 写入条件": ["写入", "沉淀", "update", "policy", "条件", "evidence"],
  "长期记忆污染控制": ["污染", "人工确认", "多次 evidence", "可信", "校验"],
  项目背景: ["项目背景", "目标", "业务", "场景"],
  个人职责: ["负责", "职责", "我做", "模块"],
  技术选型原因: ["选型", "原因", "为什么", "取舍"],
  核心难点: ["难点", "挑战", "问题", "瓶颈"],
  上线或测试结果: ["上线", "测试", "指标", "结果"],
};

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function clampScore(value: number) {
  return Math.max(1, Math.min(5, value));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function normalizeStrictness(strictness: string | null | undefined): Strictness {
  return strictness === "low" || strictness === "high" ? strictness : "medium";
}

export function strictnessFromDifficulty(difficulty: string | null | undefined): Strictness {
  if (difficulty === "hard") return "high";
  if (difficulty === "easy") return "low";
  return "medium";
}

function extractSkills(text: string, historicalWeaknesses: string[]) {
  const haystack = normalize([text, ...historicalWeaknesses].join(" "));
  const skills = ["project_authenticity"];
  const isAgentEngineeringInterview = /agent memory|memory|rag|llm|prompt|大模型|向量|检索/.test(haystack);

  for (const [keyword, skill] of KEYWORD_TO_SKILL) {
    if (!isAgentEngineeringInterview && ["memory_management", "rag", "llm_integration"].includes(skill)) {
      continue;
    }
    if (haystack.includes(keyword)) skills.push(skill);
  }

  if (skills.length < 4) {
    if (skills.includes("frontend_engineering")) {
      skills.push("architecture_tradeoff", "algorithm_foundation");
    } else if (skills.includes("backend_engineering")) {
      skills.push("architecture_tradeoff", "algorithm_foundation");
    } else if (isAgentEngineeringInterview) {
      skills.push("llm_integration", "backend_engineering", "architecture_tradeoff");
    } else {
      skills.push("architecture_tradeoff", "algorithm_foundation");
    }
  }

  return unique(skills).slice(0, 6);
}

function createStage(skill: string, index: number, strictness: Strictness, historicalWeaknesses: string[]): InterviewStagePlan {
  const template = SKILL_TEMPLATES[skill] ?? SKILL_TEMPLATES.architecture_tradeoff;
  const weaknessText = historicalWeaknesses.join(" ").toLowerCase();
  const isWeakness = template.knowledge_points.some((point) => weaknessText.includes(point.toLowerCase())) || weaknessText.includes(skill.toLowerCase());
  const suggestedBase = STRICTNESS_MAX_FOLLOW_UP[strictness];

  return {
    stage_id: `stage_${String(index).padStart(2, "0")}`,
    stage_name: template.stage_name,
    target_skill: skill,
    priority: index <= 3 || isWeakness ? "core" : "supporting",
    purpose: template.purpose,
    knowledge_points: template.knowledge_points,
    suggested_question_count: suggestedBase + (index === 1 || isWeakness ? 1 : 0),
    expected_depth:
      strictness === "high"
        ? "候选人需要能给出可验证的项目细节、数据结构、异常处理和技术取舍。"
        : "候选人需要能说明核心概念、自己的实现思路和至少一个具体例子。",
    pass_criteria: ["能说明核心概念和适用边界", "能结合自己的项目职责说明实现细节", "能解释关键技术选择的原因和风险"],
    stop_criteria: [
      "候选人已覆盖该阶段核心知识点并给出足够具体的项目证据",
      `连续追问 ${STRICTNESS_MAX_FOLLOW_UP[strictness]} 次仍无法补充细节，记录风险并进入下一阶段`,
      "该能力点不再是当前 JD 的高优先级考察目标",
    ],
    follow_up_directions: template.follow_up_directions,
  };
}

export function generateInitialInterviewPlan(input: {
  jdSummary: string;
  identityMemory?: string;
  targetRole?: string;
  strictness?: string;
  interviewStyle?: string;
  historicalWeaknesses?: string[];
  sessionGoal?: string;
}): InitialInterviewPlan {
  const strictness = normalizeStrictness(input.strictness);
  const historicalWeaknesses = [...(input.historicalWeaknesses ?? [])];
  const memory = input.identityMemory ?? "";

  for (const match of memory.matchAll(/Redis TTL 策略|项目真实性|memory|RAG|MySQL|Redis|prompt cache/gi)) {
    historicalWeaknesses.push(match[0]);
  }

  const targetRole = input.targetRole || "目标岗位";
  const skills = extractSkills(`${input.jdSummary} ${memory} ${targetRole}`, historicalWeaknesses);

  return {
    session_goal: input.sessionGoal || `评估候选人是否具备${targetRole}所需的项目落地能力`,
    target_role: targetRole,
    strictness,
    interview_style: input.interviewStyle || "normal",
    historical_weaknesses: unique(historicalWeaknesses),
    stages: skills.map((skill, index) => createStage(skill, index + 1, strictness, historicalWeaknesses)),
  };
}

export function getCurrentStage(plan: InitialInterviewPlan, currentStageId?: string | null): InterviewStagePlan {
  return plan.stages.find((stage) => stage.stage_id === currentStageId) ?? plan.stages[0];
}

export function createOpeningQuestion(plan: InitialInterviewPlan) {
  const firstStage = getCurrentStage(plan);
  const firstPoint = firstStage.knowledge_points[0] ?? "项目背景";

  return `我们先从「${firstStage.stage_name}」开始。请你结合目标岗位 ${plan.target_role}，介绍一个最能体现 ${firstPoint} 的项目或经历，我会根据你的回答继续追问。`;
}

function knowledgeMatches(answer: string, point: string) {
  const normalized = normalize(answer);
  if (normalized.includes(normalize(point))) return true;
  return (KNOWLEDGE_SYNONYMS[point] ?? []).some((term) => normalized.includes(normalize(term)));
}

function splitCoverage(answer: string, knowledgePoints: string[]) {
  const covered = knowledgePoints.filter((point) => knowledgeMatches(answer, point));
  return {
    covered,
    missing: knowledgePoints.filter((point) => !covered.includes(point)),
  };
}

function detectTechnicalError(answer: string) {
  const normalized = normalize(answer);
  if (/redis.*关系型数据库|关系型数据库.*redis/i.test(normalized)) {
    return "Redis 不是关系型数据库，更适合作为缓存、短期状态或队列式辅助结构。";
  }
  if (/所有.*长期.*只.*redis|redis.*唯一.*长期/i.test(normalized)) {
    return "长期事实、完整记录和报告不应只存 Redis，应有可靠持久化存储。";
  }
  if (/messages.*memory.*完全一样|memory.*messages.*完全一样/i.test(normalized)) {
    return "messages 是会话消息，memory 是沉淀后的长期或阶段性状态，两者不能完全混同。";
  }
  return undefined;
}

function hasInconsistency(answer: string, previousAnswers: string[]) {
  const normalized = normalize(answer);
  const previous = normalize(previousAnswers.join(" "));
  const claimedOwnership = ["我独立负责", "我负责", "我做过", "上线"].some((term) => previous.includes(term));
  const deniedOwnership = ["不是我做", "没参与", "只了解一点", "不清楚具体"].some((term) => normalized.includes(term));
  return claimedOwnership && deniedOwnership;
}

function scoreAnswer(answer: string, covered: string[], technicalCorrection?: string): AnswerQuality {
  const normalized = normalize(answer);
  const countTerms = (terms: string[]) => terms.filter((term) => normalized.includes(normalize(term))).length;
  const correctness = technicalCorrection ? 2 : 3 + Math.min(2, Math.floor(covered.length / 2));
  const specificity =
    1 + Math.min(4, countTerms(["key", "ttl", "hash", "list", "session_id", "接口", "表", "字段", "流程", "异常", "上线", "指标", "evidence"])) + (answer.length > 45 ? 1 : 0);
  const depth = 1 + Math.min(4, countTerms(["原因", "边界", "取舍", "一致性", "污染", "恢复", "兜底", "生命周期", "策略", "压缩", "沉淀", "ttl", "key", "更新", "避免", "人工确认", "evidence"]));
  const projectRelevance = 1 + Math.min(4, countTerms(["我负责", "我会", "我们", "项目", "模块", "上线", "测试", "落库", "落", "设置", "存"]));
  const clarity = 2 + (answer.length >= 20 ? 1 : 0) + (/[；，。：]|首先|然后|1\.|2\./.test(answer) ? 1 : 0);
  const evidenceStrength = 1 + Math.min(4, countTerms(["负责", "上线", "指标", "代码", "表", "key", "接口", "evidence", "测试"]));

  return {
    correctness: clampScore(correctness),
    specificity: clampScore(technicalCorrection ? Math.min(specificity, 2) : specificity),
    depth: clampScore(technicalCorrection ? Math.min(depth, 2) : depth),
    project_relevance: clampScore(projectRelevance),
    clarity: clampScore(clarity),
    evidence_strength: clampScore(evidenceStrength),
  };
}

export function shouldStopFollowUp(input: {
  answerQuality: AnswerQuality;
  coveredKnowledgePoints: string[];
  missingKnowledgePoints: string[];
  followUpCount: number;
  strictness: string;
  stagePriority: string;
}) {
  const strictness = normalizeStrictness(input.strictness);
  const maxFollowUp = STRICTNESS_MAX_FOLLOW_UP[strictness];
  if (input.followUpCount >= maxFollowUp) return true;
  if (input.missingKnowledgePoints.length === 0 && Math.min(...Object.values(input.answerQuality)) >= 3) return true;
  if (["supporting", "low"].includes(input.stagePriority) && input.coveredKnowledgePoints.length > 0 && input.answerQuality.correctness >= 3) return true;
  return input.answerQuality.specificity <= 1 && input.answerQuality.depth <= 1 && input.followUpCount >= Math.max(1, maxFollowUp - 1);
}

export function shouldFinishInterview(input: {
  interviewPlan: InitialInterviewPlan;
  skillCoverage: Record<string, string>;
  turnCount: number;
  maxTurns: number;
  evidenceCount: number;
  unresolvedCoreSkills: string[];
}) {
  if (input.turnCount >= input.maxTurns) return true;
  if (input.unresolvedCoreSkills.length > 0) return false;
  const coreSkills = input.interviewPlan.stages.filter((stage) => stage.priority === "core").map((stage) => stage.target_skill);
  return coreSkills.length > 0 && coreSkills.every((skill) => ["effective_answer", "effective_failure"].includes(input.skillCoverage[skill])) && input.evidenceCount >= Math.max(2, coreSkills.length);
}

function expectedPoints(points: string[]) {
  const defaults: Record<string, string> = {
    "Redis key 设计": "recent_turns 可以按 session_id 存 Redis List/Hash",
    "TTL 策略": "不同状态设置不同 TTL，并说明过期后的兜底策略",
    "memory 写入条件": "长期 memory 不应单次面试直接写入，应基于证据和策略控制",
    "rolling summary 更新方式": "rolling_summary 应在窗口超限或阶段结束时更新",
    "长期记忆污染控制": "应通过证据阈值、人工确认或多轮一致性降低记忆污染",
    边界场景: "能说明高并发、失败、成本限制下的处理策略",
    架构权衡: "能解释为什么选择该方案以及替代方案的代价",
    失败恢复: "能说明重试、降级、补偿或人工介入策略",
    成本控制: "能说明 token、缓存、模型选择或存储成本控制方式",
  };
  return points.slice(0, 5).map((point) => defaults[point] ?? `能具体说明${point}的实现方式、边界和证据`);
}

function decide(input: {
  riskFlags: string[];
  answerQuality: AnswerQuality;
  strictness: Strictness;
  followUpCount: number;
  maxFollowUpCount: number;
  shouldStop: boolean;
  shouldFinish: boolean;
}): NextStepDecision {
  if (input.shouldFinish) return "finish_interview";
  if (input.riskFlags.includes("inconsistency")) return "challenge_inconsistency";
  if (input.riskFlags.includes("possible_fabrication")) return "mark_possible_fabrication";
  if (input.riskFlags.includes("technical_error")) return "correct_and_continue";
  if (input.followUpCount >= input.maxFollowUpCount && input.answerQuality.correctness <= 2) return "downgrade_difficulty";
  const highQuality =
    input.answerQuality.correctness >= 4 &&
    input.answerQuality.specificity >= 4 &&
    input.answerQuality.depth >= 4 &&
    input.answerQuality.evidence_strength >= 3;
  if (highQuality) return input.strictness === "high" ? "increase_difficulty" : "next_stage";
  if (input.shouldStop) return "finish_stage";
  if (input.answerQuality.specificity <= 1 && input.answerQuality.clarity <= 2) return "guide_retry";
  return "follow_up";
}

function actionForDecision(decision: NextStepDecision, stage: InterviewStagePlan, missing: string[], correction?: string) {
  const points = missing.slice(0, 4);
  if (decision === "correct_and_continue") {
    return {
      action_type: "correct_then_retry",
      question: `这里需要纠正一下：${correction}你可以重新说一下：哪些数据适合放短期状态或缓存，哪些必须可靠落库？`,
      why_ask_this: "先纠正明确技术错误，再验证候选人是否能重新建立正确的数据分层。",
      knowledge_points_to_cover: points,
      expected_good_answer_points: expectedPoints(points),
    };
  }
  if (decision === "challenge_inconsistency") {
    return {
      action_type: "verify_inconsistency",
      question: "你前后的说法有些不一致。请你不讲概念，直接按一次真实请求链路说明：你具体负责哪一段、后端查哪些数据、如何构造 messages、最后如何写入记录？",
      why_ask_this: "该问题用于核实候选人的实际参与程度，避免把概念背诵误判为项目经验。",
      knowledge_points_to_cover: points,
      expected_good_answer_points: expectedPoints(points),
    };
  }
  if (decision === "mark_possible_fabrication") {
    return {
      action_type: "ask_verification_question",
      question: "我们换一种验证方式：请你给出这个模块的最小实现流程，只说你真正做过的部分，包括接口、表或 key、异常处理和一次完整请求链路。",
      why_ask_this: "该问题用于温和验证项目真实性；如果仍无法说明细节，应记录风险并切换到基础知识验证。",
      knowledge_points_to_cover: points,
      expected_good_answer_points: expectedPoints(points),
    };
  }
  if (decision === "guide_retry") {
    return {
      action_type: "guide_retry",
      question: "你刚才的回答还比较泛。请按三个部分重新组织：1. 数据结构或表/key 怎么设计；2. 请求流程怎么走；3. 异常或边界场景怎么处理。",
      why_ask_this: "该问题用于给候选人一次结构化补充机会，区分表达混乱和真正不了解。",
      knowledge_points_to_cover: points,
      expected_good_answer_points: expectedPoints(points),
    };
  }
  if (decision === "increase_difficulty") {
    const hardPoints = ["边界场景", "架构权衡", "失败恢复", "成本控制"];
    return {
      action_type: "ask_harder_follow_up",
      question: `这个回答比较完整。进一步追问一个边界场景：如果 ${stage.stage_name} 在高并发、成本受限或部分服务失败时，你会怎么做取舍和恢复？`,
      why_ask_this: "该问题用于提高难度，考察边界场景、架构权衡、失败恢复和成本意识。",
      knowledge_points_to_cover: hardPoints,
      expected_good_answer_points: expectedPoints(hardPoints),
    };
  }
  if (decision === "finish_stage" || decision === "next_stage") {
    return {
      action_type: "move_to_next_stage",
      question: `当前 ${stage.stage_name} 阶段信息已经足够。接下来进入下一个能力点。`,
      why_ask_this: "当前阶段已达到停止追问条件，继续追问信息增益有限。",
      knowledge_points_to_cover: [],
      expected_good_answer_points: [],
    };
  }
  if (decision === "finish_interview") {
    return {
      action_type: "finish_interview",
      question: "核心能力点已经覆盖，接下来可以结束面试并生成复盘报告。",
      why_ask_this: "当前证据已经足够支撑评估，继续提问收益较低。",
      knowledge_points_to_cover: [],
      expected_good_answer_points: [],
    };
  }
  if (decision === "downgrade_difficulty") {
    return {
      action_type: "ask_basic_question",
      question: `我们先降一点难度。你先用自己的话解释一下 ${stage.target_skill} 的基本概念、解决什么问题，以及一个最简单的实现方式。`,
      why_ask_this: "连续追问仍缺少有效信息，降低难度可以验证基础概念而不是继续消耗面试轮次。",
      knowledge_points_to_cover: points,
      expected_good_answer_points: expectedPoints(points),
    };
  }
  return {
    action_type: "ask_follow_up",
    question: points.length
      ? `你刚才的方向是对的，但还缺少工程细节。请具体说一下：${points.slice(0, 3).join("、")} 分别怎么设计？有哪些生命周期、写入条件或异常处理？`
      : `请继续补充 ${stage.stage_name} 的一个具体项目实现细节，包括数据结构、流程和异常场景。`,
    why_ask_this: "该问题用于考察候选人是否真正理解实现链路，而不是只停留在概念层面。",
    knowledge_points_to_cover: points,
    expected_good_answer_points: expectedPoints(points),
  };
}

export function planNextStep(input: {
  turnId: string;
  currentStage: InterviewStagePlan;
  candidateAnswer: string;
  strictness?: string;
  followUpCount?: number;
  maxFollowUpCount?: number;
  previousAnswers?: string[];
  priorRiskFlags?: string[];
  interviewPlan?: InitialInterviewPlan;
  skillCoverage?: Record<string, string>;
  turnCount?: number;
  maxTurns?: number;
  evidenceCount?: number;
  unresolvedCoreSkills?: string[];
}): NextStepPlan {
  const strictness = normalizeStrictness(input.strictness);
  const maxFollowUpCount = input.maxFollowUpCount ?? STRICTNESS_MAX_FOLLOW_UP[strictness];
  const { covered, missing } = splitCoverage(input.candidateAnswer, input.currentStage.knowledge_points);
  const correction = detectTechnicalError(input.candidateAnswer);
  const answerQuality = scoreAnswer(input.candidateAnswer, covered, correction);
  const detectedIssues: NextStepPlan["detected_issues"] = [];
  const riskFlags: string[] = [];

  if (answerQuality.specificity <= 2 || answerQuality.evidence_strength <= 2) {
    detectedIssues.push({ type: "too_vague", description: "候选人回答缺少可验证的工程细节、数据结构、流程或异常处理说明。" });
    riskFlags.push("insufficient_detail");
  }
  if (correction) {
    detectedIssues.push({ type: "technical_error", description: correction });
    riskFlags.push("technical_error");
  }
  if (hasInconsistency(input.candidateAnswer, input.previousAnswers ?? [])) {
    detectedIssues.push({ type: "inconsistency", description: "候选人当前回答与前文关于个人职责或实现方式的表述存在矛盾，需要核实。" });
    riskFlags.push("inconsistency");
  }
  const repeatedDetailFailure = (input.priorRiskFlags ?? []).filter((flag) => flag === "insufficient_detail").length >= 2;
  const buzzwordStack = (input.candidateAnswer.match(/Redis|MySQL|LLM|RAG|Agent|向量|缓存/gi) ?? []).length >= 3 && answerQuality.specificity <= 2;
  const claimsProject = /我做过|我负责|我独立|上线/.test(input.candidateAnswer);
  if ((claimsProject || buzzwordStack) && repeatedDetailFailure) {
    detectedIssues.push({ type: "possible_fabrication", description: "候选人多次声称参与项目但仍无法说明职责、数据结构、接口或异常处理，存在项目真实性风险。" });
    riskFlags.push("possible_fabrication", "project_authenticity_risk");
  }

  const shouldStop = shouldStopFollowUp({
    answerQuality,
    coveredKnowledgePoints: covered,
    missingKnowledgePoints: missing,
    followUpCount: input.followUpCount ?? 0,
    strictness,
    stagePriority: input.currentStage.priority,
  });
  const shouldFinish = shouldFinishInterview({
    interviewPlan: input.interviewPlan ?? { session_goal: "", target_role: "", strictness, interview_style: "", historical_weaknesses: [], stages: [input.currentStage] },
    skillCoverage: input.skillCoverage ?? {},
    turnCount: input.turnCount ?? 1,
    maxTurns: input.maxTurns ?? 12,
    evidenceCount: input.evidenceCount ?? 0,
    unresolvedCoreSkills: input.unresolvedCoreSkills ?? [],
  });
  const decision = decide({
    riskFlags,
    answerQuality,
    strictness,
    followUpCount: input.followUpCount ?? 0,
    maxFollowUpCount,
    shouldStop,
    shouldFinish,
  });

  const action = actionForDecision(decision, input.currentStage, missing, correction);

  return {
    turn_id: input.turnId,
    current_stage: input.currentStage.stage_name,
    current_target_skill: input.currentStage.target_skill,
    answer_quality: answerQuality,
    covered_knowledge_points: covered,
    missing_knowledge_points: missing,
    detected_issues: detectedIssues,
    risk_flags: unique(riskFlags),
    decision,
    decision_reason: decisionReason(decision, covered, missing, strictness, correction),
    next_action: action,
    stage_control: {
      should_continue_current_stage: ["follow_up", "correct_and_continue", "guide_retry", "challenge_inconsistency", "mark_possible_fabrication", "downgrade_difficulty", "increase_difficulty"].includes(decision) && !shouldFinish,
      should_move_to_next_stage: ["next_stage", "finish_stage"].includes(decision) || (shouldStop && !shouldFinish),
      should_end_interview: shouldFinish || decision === "finish_interview",
      follow_up_count_in_current_stage: input.followUpCount ?? 0,
      max_follow_up_count: maxFollowUpCount,
      stop_follow_up_condition: `候选人能够说清数据结构、生命周期、写入策略和一致性风险，或连续 ${maxFollowUpCount} 次追问仍无法补充细节；严格度为 ${strictness}。`,
    },
  };
}

function decisionReason(decision: NextStepDecision, covered: string[], missing: string[], strictness: Strictness, correction?: string) {
  if (decision === "correct_and_continue") return `候选人回答存在明确技术错误：${correction}需要先纠正概念，再继续验证其真实理解。`;
  if (decision === "challenge_inconsistency") return "候选人回答与前文陈述存在矛盾，需要通过验证性追问核实项目参与程度和实现细节。";
  if (decision === "mark_possible_fabrication") return "候选人多次无法补充具体职责、数据结构或实现链路，存在项目真实性风险，应改用验证性问题或切换到基础知识验证。";
  if (decision === "increase_difficulty") return "候选人回答具体、正确且有工程细节，可以提高难度，追问边界场景、性能、成本或失败恢复。";
  if (decision === "finish_stage") return "当前阶段已达到停止追问条件，应结束该阶段并进入后续能力点。";
  if (decision === "finish_interview") return "核心能力点和证据已经足够，或达到面试轮数上限，应结束面试并生成报告。";
  if (decision === "guide_retry") return "候选人回答过于空泛或表达混乱，暂不判定为不会，应引导其按数据结构、流程和异常场景重新组织回答。";
  if (decision === "downgrade_difficulty") return "候选人连续无法提供有效信息，继续高难度追问收益较低，应降低难度验证基础概念。";
  return covered.length
    ? `当前回答方向正确，已覆盖${covered.length}个知识点，但在${missing.slice(0, 3).join("、") || "边界细节"}等方面仍缺少细节。严格度为 ${strictness}，需要继续追问。`
    : `当前回答尚未覆盖该阶段核心知识点。严格度为 ${strictness}，需要继续追问或引导重答。`;
}

export function summarizeInitialPlanForContext(plan: InitialInterviewPlan, currentStageId?: string | null) {
  const currentStage = getCurrentStage(plan, currentStageId);
  const stageLines = plan.stages
    .slice(0, 6)
    .map((stage) => `${stage.stage_id}:${stage.stage_name}/${stage.target_skill}/${stage.priority}/points=${stage.knowledge_points.slice(0, 4).join(",")}`)
    .join("\n");

  return [
    "Initial Interview Plan：",
    `goal=${plan.session_goal}`,
    `target_role=${plan.target_role}; strictness=${plan.strictness}; style=${plan.interview_style}`,
    `stages:\n${stageLines}`,
    `当前阶段=${currentStage.stage_id} ${currentStage.stage_name}; purpose=${currentStage.purpose}`,
    `当前阶段通过标准=${currentStage.pass_criteria.slice(0, 2).join("；")}`,
    `当前阶段停止标准=${currentStage.stop_criteria.slice(0, 2).join("；")}`,
  ].join("\n");
}

export function summarizeNextStepPlanForContext(plan: NextStepPlan) {
  return [
    "NextStep Plan：",
    `turn=${plan.turn_id}; stage=${plan.current_stage}; skill=${plan.current_target_skill}; decision=${plan.decision}`,
    `quality=${Object.entries(plan.answer_quality)
      .map(([key, value]) => `${key}:${value}`)
      .join(",")}`,
    `covered=${plan.covered_knowledge_points.slice(0, 5).join("；") || "暂无"}`,
    `missing=${plan.missing_knowledge_points.slice(0, 5).join("；") || "暂无"}`,
    `risks=${plan.risk_flags.join(",") || "none"}`,
    `reason=${plan.decision_reason}`,
    `next_action=${plan.next_action.action_type}; question=${plan.next_action.question}`,
    `why=${plan.next_action.why_ask_this}`,
    `cover_next=${plan.next_action.knowledge_points_to_cover.slice(0, 5).join("；") || "暂无"}`,
    `stage_control=continue:${plan.stage_control.should_continue_current_stage},move_next:${plan.stage_control.should_move_to_next_stage},end:${plan.stage_control.should_end_interview},follow_up:${plan.stage_control.follow_up_count_in_current_stage}/${plan.stage_control.max_follow_up_count}`,
  ].join("\n");
}

export function updatePlanningStateAfterTurn(input: {
  plan: InitialInterviewPlan;
  previousState: PlanningState;
  nextStepPlan: NextStepPlan;
}): PlanningState {
  const currentIndex = input.plan.stages.findIndex((stage) => stage.stage_id === input.previousState.currentStageId);
  const shouldMoveNext = input.nextStepPlan.stage_control.should_move_to_next_stage || input.nextStepPlan.decision === "next_stage" || input.nextStepPlan.decision === "finish_stage";
  const nextStage = shouldMoveNext ? input.plan.stages[Math.min(currentIndex + 1, input.plan.stages.length - 1)] : undefined;
  const targetSkill = input.nextStepPlan.current_target_skill;
  const hasEvidence = input.nextStepPlan.covered_knowledge_points.length > 0 || input.nextStepPlan.risk_flags.includes("project_authenticity_risk");
  const skillCoverage = { ...input.previousState.skillCoverage };

  if (hasEvidence) {
    skillCoverage[targetSkill] =
      input.nextStepPlan.risk_flags.includes("project_authenticity_risk") || input.nextStepPlan.decision === "downgrade_difficulty"
        ? "effective_failure"
        : "effective_answer";
  }

  return {
    currentStageId: nextStage?.stage_id ?? input.previousState.currentStageId,
    followUpCount: shouldMoveNext ? 0 : input.previousState.followUpCount + (input.nextStepPlan.stage_control.should_continue_current_stage ? 1 : 0),
    turnCount: input.previousState.turnCount + 1,
    evidenceCount: input.previousState.evidenceCount + (hasEvidence ? 1 : 0),
    riskFlags: unique([...input.previousState.riskFlags, ...input.nextStepPlan.risk_flags]),
    skillCoverage,
  };
}
