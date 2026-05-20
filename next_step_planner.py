from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any, Literal


Decision = Literal[
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
]

DECISIONS: tuple[Decision, ...] = (
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
)

STRICTNESS_MAX_FOLLOW_UP = {
    "low": 1,
    "medium": 2,
    "high": 3,
}

SKILL_TEMPLATES: dict[str, dict[str, Any]] = {
    "project_authenticity": {
        "stage_name": "项目真实性确认",
        "purpose": "确认候选人是否真实参与过项目，而不是只背概念。",
        "knowledge_points": ["项目背景", "个人职责", "技术选型原因", "核心难点", "上线或测试结果"],
        "follow_up_directions": ["追问具体代码实现", "追问为什么这样设计", "追问异常场景如何处理"],
    },
    "memory_management": {
        "stage_name": "Agent Memory 深挖",
        "purpose": "验证候选人是否理解短期记忆、长期记忆、上下文压缩和记忆写入策略。",
        "knowledge_points": [
            "Redis 存储短期上下文",
            "MySQL 存储长期记录",
            "Redis key 设计",
            "TTL 策略",
            "rolling summary 更新方式",
            "memory 写入条件",
            "长期记忆污染控制",
        ],
        "follow_up_directions": ["追问 Redis key 设计", "追问 TTL 策略", "追问长期记忆污染控制"],
    },
    "rag": {
        "stage_name": "RAG 与知识召回",
        "purpose": "验证候选人是否能把 JD、题库、检索和模型上下文结合成可落地方案。",
        "knowledge_points": ["索引构建", "召回策略", "重排策略", "上下文拼接", "召回质量评估"],
        "follow_up_directions": ["追问 chunk 策略", "追问召回评估", "追问低质量召回如何兜底"],
    },
    "llm_integration": {
        "stage_name": "LLM 调用与成本控制",
        "purpose": "评估候选人是否理解模型调用、prompt cache、token 成本和失败兜底。",
        "knowledge_points": ["模型选择", "messages 构造", "prompt cache", "token 成本", "失败重试"],
        "follow_up_directions": ["追问缓存命中边界", "追问多模型降级", "追问 token 预算控制"],
    },
    "backend_engineering": {
        "stage_name": "后端工程实现",
        "purpose": "验证候选人是否能把需求落成稳定的 API、数据模型和异常处理流程。",
        "knowledge_points": ["API 设计", "数据表结构", "事务边界", "异常处理", "可观测性"],
        "follow_up_directions": ["追问表结构", "追问接口幂等", "追问失败恢复"],
    },
    "architecture_tradeoff": {
        "stage_name": "架构权衡与边界场景",
        "purpose": "考察候选人在成本、性能、可靠性和演进性之间做工程取舍的能力。",
        "knowledge_points": ["性能瓶颈", "成本控制", "一致性风险", "失败恢复", "演进方案"],
        "follow_up_directions": ["追问高并发场景", "追问成本上限", "追问灾备和恢复"],
    },
}

KEYWORD_TO_SKILL = {
    "memory": "memory_management",
    "agent memory": "memory_management",
    "redis": "memory_management",
    "ttl": "memory_management",
    "mysql": "backend_engineering",
    "rag": "rag",
    "检索": "rag",
    "向量": "rag",
    "llm": "llm_integration",
    "大模型": "llm_integration",
    "prompt": "llm_integration",
    "cache": "llm_integration",
    "api": "backend_engineering",
    "后端": "backend_engineering",
    "工程": "backend_engineering",
    "架构": "architecture_tradeoff",
    "性能": "architecture_tradeoff",
}

KNOWLEDGE_SYNONYMS: dict[str, tuple[str, ...]] = {
    "Redis 存储短期上下文": ("redis", "短期", "上下文", "recent_turns", "session_state"),
    "MySQL 存储长期记录": ("mysql", "长期", "记录", "落库", "report", "evaluation"),
    "Redis key 设计": ("key", "session_id", "recent_turns", "session_state", "hash", "list"),
    "TTL 策略": ("ttl", "过期", "生命周期", "30 分钟", "24 小时"),
    "rolling summary 更新方式": ("rolling_summary", "summary", "摘要", "压缩", "更新"),
    "memory 写入条件": ("写入", "沉淀", "update", "policy", "条件", "evidence"),
    "长期记忆污染控制": ("污染", "人工确认", "多次 evidence", "可信", "校验"),
    "项目背景": ("项目背景", "目标", "业务", "场景"),
    "个人职责": ("负责", "职责", "我做", "模块"),
    "技术选型原因": ("选型", "原因", "为什么", "取舍"),
    "核心难点": ("难点", "挑战", "问题", "瓶颈"),
    "上线或测试结果": ("上线", "测试", "指标", "结果"),
}

TECHNICAL_ERROR_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"redis.*关系型数据库|关系型数据库.*redis", re.I), "Redis 不是关系型数据库，更适合作为缓存、短期状态或队列式辅助结构。"),
    (re.compile(r"所有.*长期.*只.*redis|redis.*唯一.*长期", re.I), "长期事实、完整记录和报告不应只存 Redis，应有可靠持久化存储。"),
    (re.compile(r"messages.*memory.*完全一样|memory.*messages.*完全一样", re.I), "messages 是会话消息，memory 是沉淀后的长期或阶段性状态，两者不能完全混同。"),
)


@dataclass(frozen=True)
class PlannerSignals:
    answer_quality: dict[str, int]
    covered: list[str]
    missing: list[str]
    detected_issues: list[dict[str, str]]
    risk_flags: list[str]
    technical_correction: str | None


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _clamp_score(value: int) -> int:
    return max(1, min(5, value))


def _unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _strictness_value(strictness: str) -> str:
    return strictness if strictness in STRICTNESS_MAX_FOLLOW_UP else "medium"


def _priority_value(priority: str | None) -> str:
    return priority if priority in {"core", "high", "supporting", "low"} else "core"


def _extract_skills(text: str, historical_weaknesses: list[str]) -> list[str]:
    haystack = _normalize(" ".join([text, *historical_weaknesses]))
    skills = ["project_authenticity"]

    for keyword, skill in KEYWORD_TO_SKILL.items():
        if keyword in haystack:
            skills.append(skill)

    if len(skills) < 4:
        skills.extend(["llm_integration", "backend_engineering", "architecture_tradeoff"])

    return _unique(skills)[:6]


def _stage_from_skill(skill: str, index: int, strictness: str, historical_weaknesses: list[str]) -> dict[str, Any]:
    template = SKILL_TEMPLATES.get(skill, SKILL_TEMPLATES["architecture_tradeoff"])
    is_weakness = any(skill.lower() in weakness.lower() or any(point.lower() in weakness.lower() for point in template["knowledge_points"]) for weakness in historical_weaknesses)
    suggested_count = {"low": 1, "medium": 2, "high": 3}[_strictness_value(strictness)]
    if index == 1 or is_weakness:
        suggested_count += 1

    expected_depth = (
        "候选人需要能给出可验证的项目细节、数据结构、异常处理和技术取舍。"
        if strictness == "high"
        else "候选人需要能说明核心概念、自己的实现思路和至少一个具体例子。"
    )

    return {
        "stage_id": f"stage_{index:02d}",
        "stage_name": template["stage_name"],
        "target_skill": skill,
        "priority": "core" if index <= 3 or is_weakness else "supporting",
        "purpose": template["purpose"],
        "knowledge_points": list(template["knowledge_points"]),
        "suggested_question_count": suggested_count,
        "expected_depth": expected_depth,
        "pass_criteria": [
            "能说明核心概念和适用边界",
            "能结合自己的项目职责说明实现细节",
            "能解释关键技术选择的原因和风险",
        ],
        "stop_criteria": [
            "候选人已覆盖该阶段核心知识点并给出足够具体的项目证据",
            f"连续追问 {STRICTNESS_MAX_FOLLOW_UP[_strictness_value(strictness)]} 次仍无法补充细节，记录风险并进入下一阶段",
            "该能力点不再是当前 JD 的高优先级考察目标",
        ],
        "follow_up_directions": list(template["follow_up_directions"]),
    }


def generate_initial_interview_plan(
    *,
    jd_summary: str,
    identity_memory: str = "",
    target_role: str = "",
    strictness: str = "medium",
    interview_style: str = "normal",
    historical_weaknesses: list[str] | None = None,
    session_goal: str | None = None,
) -> dict[str, Any]:
    weaknesses = list(historical_weaknesses or [])
    if identity_memory:
        weaknesses.extend(re.findall(r"(Redis TTL 策略|项目真实性|memory|RAG|MySQL|Redis|prompt cache)", identity_memory, re.I))

    role = target_role or "目标岗位"
    goal = session_goal or f"评估候选人是否具备{role}所需的项目落地能力"
    skills = _extract_skills(f"{jd_summary} {identity_memory} {role}", weaknesses)
    stages = [_stage_from_skill(skill, index + 1, strictness, weaknesses) for index, skill in enumerate(skills)]

    return {
        "session_goal": goal,
        "target_role": role,
        "strictness": _strictness_value(strictness),
        "interview_style": interview_style,
        "historical_weaknesses": _unique(weaknesses),
        "stages": stages,
    }


def _knowledge_point_matches(answer: str, point: str) -> bool:
    normalized = _normalize(answer)
    point_normalized = _normalize(point)
    if point_normalized and point_normalized in normalized:
        return True

    synonyms = KNOWLEDGE_SYNONYMS.get(point, ())
    if not synonyms:
        tokens = [token for token in re.split(r"[\s/_-]+", point_normalized) if len(token) >= 2]
        return bool(tokens) and all(token in normalized for token in tokens[:2])

    return any(_normalize(term) in normalized for term in synonyms)


def _split_knowledge_coverage(answer: str, knowledge_points: list[str]) -> tuple[list[str], list[str]]:
    covered = [point for point in knowledge_points if _knowledge_point_matches(answer, point)]
    missing = [point for point in knowledge_points if point not in covered]
    return covered, missing


def _detect_technical_error(answer: str) -> str | None:
    normalized = _normalize(answer)
    for pattern, correction in TECHNICAL_ERROR_RULES:
        if pattern.search(normalized):
            return correction
    return None


def _has_inconsistency(answer: str, previous_answers: list[str]) -> bool:
    normalized = _normalize(answer)
    previous = _normalize(" ".join(previous_answers))
    if not previous:
        return False

    claimed_ownership = any(term in previous for term in ("我独立负责", "我负责", "我做过", "上线"))
    denied_ownership = any(term in normalized for term in ("不是我做", "没参与", "只了解一点", "不清楚具体"))
    claimed_persistence = "只存 redis" in previous or "都放 redis" in previous
    later_mysql = "mysql" in normalized and ("必须" in normalized or "落" in normalized)
    return (claimed_ownership and denied_ownership) or (claimed_persistence and later_mysql)


def _score_answer_quality(answer: str, covered: list[str], missing: list[str], technical_correction: str | None) -> dict[str, int]:
    normalized = _normalize(answer)
    length = len(answer.strip())
    concrete_terms = ("key", "ttl", "hash", "list", "session_id", "接口", "表", "字段", "流程", "异常", "上线", "指标", "evidence")
    depth_terms = ("原因", "边界", "取舍", "一致性", "污染", "恢复", "兜底", "生命周期", "策略", "压缩", "沉淀", "ttl", "key", "更新", "避免", "人工确认", "evidence")
    project_terms = ("我负责", "我会", "我们", "项目", "模块", "上线", "测试", "落库", "落", "设置", "存")

    correctness = 2 if technical_correction else 3 + min(2, len(covered) // 2)
    specificity = 1 + min(4, sum(1 for term in concrete_terms if term in normalized))
    if length > 45:
        specificity += 1
    depth = 1 + min(4, sum(1 for term in depth_terms if term in normalized))
    project_relevance = 1 + min(4, sum(1 for term in project_terms if term in normalized))
    clarity = 2
    if length >= 20:
        clarity += 1
    if any(mark in answer for mark in ("；", "，", "。", "：", "1.", "2.", "首先", "然后")):
        clarity += 1
    evidence_strength = 1 + min(4, sum(1 for term in ("负责", "上线", "指标", "代码", "表", "key", "接口", "evidence", "测试") if term in normalized))

    if missing and len(covered) == 0:
        correctness -= 1
    if technical_correction:
        specificity = min(specificity, 2)
        depth = min(depth, 2)

    return {
        "correctness": _clamp_score(correctness),
        "specificity": _clamp_score(specificity),
        "depth": _clamp_score(depth),
        "project_relevance": _clamp_score(project_relevance),
        "clarity": _clamp_score(clarity),
        "evidence_strength": _clamp_score(evidence_strength),
    }


def _build_signals(
    *,
    candidate_answer: str,
    current_stage: dict[str, Any],
    previous_answers: list[str],
    prior_risk_flags: list[str],
) -> PlannerSignals:
    knowledge_points = list(current_stage.get("knowledge_points", []))
    covered, missing = _split_knowledge_coverage(candidate_answer, knowledge_points)
    technical_correction = _detect_technical_error(candidate_answer)
    answer_quality = _score_answer_quality(candidate_answer, covered, missing, technical_correction)
    detected_issues: list[dict[str, str]] = []
    risk_flags: list[str] = []

    if not candidate_answer.strip():
        detected_issues.append({"type": "empty_answer", "description": "候选人没有提供有效回答。"})
        risk_flags.append("no_effective_information")

    if answer_quality["specificity"] <= 2 or answer_quality["evidence_strength"] <= 2:
        detected_issues.append(
            {
                "type": "too_vague",
                "description": "候选人回答缺少可验证的工程细节、数据结构、流程或异常处理说明。",
            }
        )
        risk_flags.append("insufficient_detail")

    if technical_correction:
        detected_issues.append({"type": "technical_error", "description": technical_correction})
        risk_flags.append("technical_error")

    if _has_inconsistency(candidate_answer, previous_answers):
        detected_issues.append(
            {
                "type": "inconsistency",
                "description": "候选人当前回答与前文关于个人职责或实现方式的表述存在矛盾，需要核实。",
            }
        )
        risk_flags.append("inconsistency")

    claims_project = any(term in candidate_answer for term in ("我做过", "我负责", "我独立", "上线"))
    repeated_detail_failure = prior_risk_flags.count("insufficient_detail") >= 2
    buzzword_stack = len(re.findall(r"Redis|MySQL|LLM|RAG|Agent|向量|缓存", candidate_answer, re.I)) >= 3 and answer_quality["specificity"] <= 2
    if (claims_project and repeated_detail_failure) or (buzzword_stack and repeated_detail_failure):
        detected_issues.append(
            {
                "type": "possible_fabrication",
                "description": "候选人多次声称参与项目但仍无法说明职责、数据结构、接口或异常处理，存在项目真实性风险。",
            }
        )
        risk_flags.extend(["possible_fabrication", "project_authenticity_risk"])

    return PlannerSignals(
        answer_quality=answer_quality,
        covered=covered,
        missing=missing,
        detected_issues=detected_issues,
        risk_flags=_unique(risk_flags),
        technical_correction=technical_correction,
    )


def should_stop_follow_up(
    *,
    answer_quality: dict[str, int],
    covered_knowledge_points: list[str],
    missing_knowledge_points: list[str],
    follow_up_count: int,
    strictness: str,
    stage_priority: str,
) -> bool:
    strictness_key = _strictness_value(strictness)
    priority = _priority_value(stage_priority)
    max_follow_up_count = STRICTNESS_MAX_FOLLOW_UP[strictness_key]

    if follow_up_count >= max_follow_up_count:
        return True

    if not missing_knowledge_points and min(answer_quality.values()) >= 3:
        return True

    if priority in {"supporting", "low"} and covered_knowledge_points and answer_quality.get("correctness", 1) >= 3:
        return True

    low_information = answer_quality.get("specificity", 1) <= 1 and answer_quality.get("depth", 1) <= 1
    if low_information and follow_up_count >= max(1, max_follow_up_count - 1):
        return True

    return False


def should_finish_interview(
    *,
    interview_plan: dict[str, Any],
    skill_coverage: dict[str, str],
    turn_count: int,
    max_turns: int,
    evidence_count: int,
    unresolved_core_skills: list[str],
) -> bool:
    if turn_count >= max_turns:
        return True

    if unresolved_core_skills:
        return False

    core_skills = [
        stage.get("target_skill")
        for stage in interview_plan.get("stages", [])
        if stage.get("priority", "core") == "core" and stage.get("target_skill")
    ]
    core_covered = all(skill_coverage.get(skill) in {"effective_answer", "effective_failure"} for skill in core_skills)
    enough_evidence = evidence_count >= max(2, len(core_skills))
    return bool(core_skills) and core_covered and enough_evidence


def _decision_from_signals(
    *,
    signals: PlannerSignals,
    strictness: str,
    follow_up_count: int,
    max_follow_up_count: int,
    should_stop: bool,
    should_finish: bool,
) -> Decision:
    if should_finish:
        return "finish_interview"

    if "inconsistency" in signals.risk_flags:
        return "challenge_inconsistency"

    if "possible_fabrication" in signals.risk_flags:
        return "mark_possible_fabrication"

    if "technical_error" in signals.risk_flags:
        return "correct_and_continue"

    if follow_up_count >= max_follow_up_count and signals.answer_quality["correctness"] <= 2:
        return "downgrade_difficulty"

    high_quality = (
        signals.answer_quality["correctness"] >= 4
        and signals.answer_quality["specificity"] >= 4
        and signals.answer_quality["depth"] >= 4
        and signals.answer_quality["evidence_strength"] >= 3
    )
    if high_quality:
        return "increase_difficulty" if strictness == "high" else "next_stage"

    if should_stop:
        return "finish_stage"

    if signals.answer_quality["specificity"] <= 1 and signals.answer_quality["clarity"] <= 2:
        return "guide_retry"

    return "follow_up"


def _make_decision_reason(decision: Decision, signals: PlannerSignals, strictness: str) -> str:
    if decision == "correct_and_continue":
        return f"候选人回答存在明确技术错误：{signals.technical_correction}需要先纠正概念，再继续验证其真实理解。"
    if decision == "challenge_inconsistency":
        return "候选人回答与前文陈述存在矛盾，需要通过验证性追问核实项目参与程度和实现细节。"
    if decision == "mark_possible_fabrication":
        return "候选人多次无法补充具体职责、数据结构或实现链路，存在项目真实性风险，应改用验证性问题或切换到基础知识验证。"
    if decision == "guide_retry":
        return "候选人回答过于空泛或表达混乱，暂不判定为不会，应引导其按数据结构、流程和异常场景重新组织回答。"
    if decision == "increase_difficulty":
        return "候选人回答具体、正确且有工程细节，可以提高难度，追问边界场景、性能、成本或失败恢复。"
    if decision == "finish_stage":
        return "当前阶段已达到停止追问条件，应结束该阶段并进入后续能力点。"
    if decision == "finish_interview":
        return "核心能力点和证据已经足够，或达到面试轮数上限，应结束面试并生成报告。"
    if decision == "downgrade_difficulty":
        return "候选人连续无法提供有效信息，继续高难度追问收益较低，应降低难度验证基础概念。"

    if signals.covered:
        return f"当前回答方向正确，已覆盖{len(signals.covered)}个知识点，但在{signals.missing[:3]}等方面仍缺少细节。严格度为 {strictness}，需要继续追问。"
    return f"当前回答尚未覆盖该阶段核心知识点。严格度为 {strictness}，需要继续追问或引导重答。"


def _question_for_decision(decision: Decision, signals: PlannerSignals, stage: dict[str, Any]) -> tuple[str, str, list[str], list[str], str]:
    missing = signals.missing[:4]
    target_skill = stage.get("target_skill", "current_skill")
    stage_name = stage.get("stage_name", "当前阶段")

    if decision == "correct_and_continue":
        question = f"这里需要纠正一下：{signals.technical_correction}你可以重新说一下：哪些数据适合放短期状态或缓存，哪些必须可靠落库？"
        return question, "先纠正明确技术错误，再验证候选人是否能重新建立正确的数据分层。", missing, _expected_points(missing), "correct_then_retry"

    if decision == "challenge_inconsistency":
        question = "你前后的说法有些不一致。请你不讲概念，直接按一次真实请求链路说明：你具体负责哪一段、后端查哪些数据、如何构造 messages、最后如何写入记录？"
        return question, "该问题用于核实候选人的实际参与程度，避免把概念背诵误判为项目经验。", missing, _expected_points(missing), "verify_inconsistency"

    if decision == "mark_possible_fabrication":
        question = "我们换一种验证方式：请你给出这个模块的最小实现流程，只说你真正做过的部分，包括接口、表或 key、异常处理和一次完整请求链路。"
        return question, "该问题用于温和验证项目真实性；如果仍无法说明细节，应记录风险并切换到基础知识验证。", missing, _expected_points(missing), "ask_verification_question"

    if decision == "guide_retry":
        question = f"你刚才的回答还比较泛。请按三个部分重新组织：1. 数据结构或表/key 怎么设计；2. 请求流程怎么走；3. 异常或边界场景怎么处理。"
        return question, "该问题用于给候选人一次结构化补充机会，区分表达混乱和真正不了解。", missing, _expected_points(missing), "guide_retry"

    if decision == "increase_difficulty":
        question = f"这个回答比较完整。进一步追问一个边界场景：如果 {stage_name} 在高并发、成本受限或部分服务失败时，你会怎么做取舍和恢复？"
        return question, "该问题用于提高难度，考察边界场景、架构权衡、失败恢复和成本意识。", ["边界场景", "架构权衡", "失败恢复", "成本控制"], _expected_points(["边界场景", "架构权衡", "失败恢复", "成本控制"]), "ask_harder_follow_up"

    if decision in {"finish_stage", "next_stage"}:
        question = f"当前 {stage_name} 阶段信息已经足够。接下来进入下一个能力点。"
        return question, "当前阶段已达到停止追问条件，继续追问信息增益有限。", [], [], "move_to_next_stage"

    if decision == "finish_interview":
        question = "核心能力点已经覆盖，接下来可以结束面试并生成复盘报告。"
        return question, "当前证据已经足够支撑评估，继续提问收益较低。", [], [], "finish_interview"

    if decision == "downgrade_difficulty":
        question = f"我们先降一点难度。你先用自己的话解释一下 {target_skill} 的基本概念、解决什么问题，以及一个最简单的实现方式。"
        return question, "连续追问仍缺少有效信息，降低难度可以验证基础概念而不是继续消耗面试轮次。", missing, _expected_points(missing), "ask_basic_question"

    if missing:
        points_text = "、".join(missing[:3])
        question = f"你刚才的方向是对的，但还缺少工程细节。请具体说一下：{points_text} 分别怎么设计？有哪些生命周期、写入条件或异常处理？"
    else:
        question = f"请继续补充 {stage_name} 的一个具体项目实现细节，包括数据结构、流程和异常场景。"
    return question, "该问题用于考察候选人是否真正理解实现链路，而不是只停留在概念层面。", missing, _expected_points(missing), "ask_follow_up"


def _expected_points(knowledge_points: list[str]) -> list[str]:
    defaults = {
        "Redis key 设计": "recent_turns 可以按 session_id 存 Redis List/Hash",
        "TTL 策略": "不同状态设置不同 TTL，并说明过期后的兜底策略",
        "短期记忆到长期记忆的沉淀条件": "长期 memory 应基于多次 evidence 或复盘结果更新",
        "memory 写入条件": "长期 memory 不应单次面试直接写入，应基于证据和策略控制",
        "rolling summary 更新方式": "rolling_summary 应在窗口超限或阶段结束时更新",
        "长期记忆污染控制": "应通过证据阈值、人工确认或多轮一致性降低记忆污染",
        "边界场景": "能说明高并发、失败、成本限制下的处理策略",
        "架构权衡": "能解释为什么选择该方案以及替代方案的代价",
        "失败恢复": "能说明重试、降级、补偿或人工介入策略",
        "成本控制": "能说明 token、缓存、模型选择或存储成本控制方式",
    }
    return [defaults.get(point, f"能具体说明{point}的实现方式、边界和证据") for point in knowledge_points[:5]]


def _stage_control(
    *,
    decision: Decision,
    should_stop: bool,
    should_finish: bool,
    follow_up_count: int,
    max_follow_up_count: int,
    strictness: str,
) -> dict[str, Any]:
    return {
        "should_continue_current_stage": decision in {"follow_up", "correct_and_continue", "guide_retry", "challenge_inconsistency", "mark_possible_fabrication", "downgrade_difficulty", "increase_difficulty"} and not should_finish,
        "should_move_to_next_stage": decision in {"next_stage", "finish_stage"} or (should_stop and not should_finish),
        "should_end_interview": should_finish or decision == "finish_interview",
        "follow_up_count_in_current_stage": follow_up_count,
        "max_follow_up_count": max_follow_up_count,
        "stop_follow_up_condition": f"候选人能够说清数据结构、生命周期、写入策略和一致性风险，或连续 {max_follow_up_count} 次追问仍无法补充细节；严格度为 {strictness}。",
    }


def plan_next_step(
    *,
    turn_id: str,
    current_stage: dict[str, Any],
    candidate_answer: str,
    strictness: str = "medium",
    follow_up_count: int = 0,
    max_follow_up_count: int | None = None,
    previous_answers: list[str] | None = None,
    prior_risk_flags: list[str] | None = None,
    interview_plan: dict[str, Any] | None = None,
    skill_coverage: dict[str, str] | None = None,
    turn_count: int = 1,
    max_turns: int = 12,
    evidence_count: int = 0,
    unresolved_core_skills: list[str] | None = None,
) -> dict[str, Any]:
    strictness_key = _strictness_value(strictness)
    max_follow_ups = max_follow_up_count or STRICTNESS_MAX_FOLLOW_UP[strictness_key]
    previous = list(previous_answers or [])
    risks = list(prior_risk_flags or [])
    signals = _build_signals(
        candidate_answer=candidate_answer,
        current_stage=current_stage,
        previous_answers=previous,
        prior_risk_flags=risks,
    )

    should_stop = should_stop_follow_up(
        answer_quality=signals.answer_quality,
        covered_knowledge_points=signals.covered,
        missing_knowledge_points=signals.missing,
        follow_up_count=follow_up_count,
        strictness=strictness_key,
        stage_priority=current_stage.get("priority", "core"),
    )
    should_finish = should_finish_interview(
        interview_plan=interview_plan or {"stages": [current_stage]},
        skill_coverage=skill_coverage or {},
        turn_count=turn_count,
        max_turns=max_turns,
        evidence_count=evidence_count,
        unresolved_core_skills=list(unresolved_core_skills or []),
    )
    decision = _decision_from_signals(
        signals=signals,
        strictness=strictness_key,
        follow_up_count=follow_up_count,
        max_follow_up_count=max_follow_ups,
        should_stop=should_stop,
        should_finish=should_finish,
    )
    question, why_ask_this, points_to_cover, expected_points, action_type = _question_for_decision(decision, signals, current_stage)

    return {
        "turn_id": turn_id,
        "current_stage": current_stage.get("stage_name", current_stage.get("stage_id", "")),
        "current_target_skill": current_stage.get("target_skill", ""),
        "answer_quality": signals.answer_quality,
        "covered_knowledge_points": signals.covered,
        "missing_knowledge_points": signals.missing,
        "detected_issues": signals.detected_issues,
        "risk_flags": signals.risk_flags,
        "decision": decision,
        "decision_reason": _make_decision_reason(decision, signals, strictness_key),
        "next_action": {
            "action_type": action_type,
            "question": question,
            "why_ask_this": why_ask_this,
            "knowledge_points_to_cover": points_to_cover,
            "expected_good_answer_points": expected_points,
        },
        "stage_control": _stage_control(
            decision=decision,
            should_stop=should_stop,
            should_finish=should_finish,
            follow_up_count=follow_up_count,
            max_follow_up_count=max_follow_ups,
            strictness=strictness_key,
        ),
    }
