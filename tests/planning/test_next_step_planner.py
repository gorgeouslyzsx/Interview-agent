import unittest

from next_step_planner import (
    DECISIONS,
    generate_initial_interview_plan,
    plan_next_step,
    should_finish_interview,
    should_stop_follow_up,
)


class InitialInterviewPlanTest(unittest.TestCase):
    def test_generates_global_plan_with_required_stage_fields(self):
        plan = generate_initial_interview_plan(
            jd_summary="AI 应用开发工程师，需要 LLM、RAG、Agent Memory、Redis、MySQL 和工程落地能力。",
            identity_memory="历史薄弱点：项目细节不够，Redis TTL 策略不清楚。",
            target_role="AI 应用开发工程师",
            strictness="high",
            interview_style="technical",
            historical_weaknesses=["Redis TTL 策略", "项目真实性"],
            session_goal="评估候选人是否具备 AI 应用开发工程师的项目落地能力",
        )

        self.assertEqual(plan["session_goal"], "评估候选人是否具备 AI 应用开发工程师的项目落地能力")
        self.assertEqual(plan["target_role"], "AI 应用开发工程师")
        self.assertEqual(plan["strictness"], "high")
        self.assertGreaterEqual(len(plan["stages"]), 3)

        required_fields = {
            "stage_id",
            "stage_name",
            "target_skill",
            "purpose",
            "knowledge_points",
            "suggested_question_count",
            "expected_depth",
            "pass_criteria",
            "stop_criteria",
            "follow_up_directions",
        }
        for stage in plan["stages"]:
            self.assertTrue(required_fields.issubset(stage.keys()), stage)
            self.assertGreaterEqual(stage["suggested_question_count"], 2)
            self.assertGreater(len(stage["knowledge_points"]), 0)
            self.assertGreater(len(stage["pass_criteria"]), 0)
            self.assertGreater(len(stage["stop_criteria"]), 0)

        target_skills = {stage["target_skill"] for stage in plan["stages"]}
        self.assertIn("project_authenticity", target_skills)
        self.assertIn("memory_management", target_skills)


class FollowUpControlTest(unittest.TestCase):
    def test_should_continue_high_priority_follow_up_when_core_details_are_missing(self):
        answer_quality = {
            "correctness": 4,
            "specificity": 2,
            "depth": 2,
            "project_relevance": 3,
            "clarity": 3,
            "evidence_strength": 2,
        }

        self.assertFalse(
            should_stop_follow_up(
                answer_quality=answer_quality,
                covered_knowledge_points=["Redis 存储短期上下文"],
                missing_knowledge_points=["Redis key 设计", "TTL 策略", "memory 写入条件"],
                follow_up_count=1,
                strictness="high",
                stage_priority="core",
            )
        )

    def test_should_stop_follow_up_at_high_strictness_max_depth(self):
        answer_quality = {
            "correctness": 2,
            "specificity": 1,
            "depth": 1,
            "project_relevance": 1,
            "clarity": 2,
            "evidence_strength": 1,
        }

        self.assertTrue(
            should_stop_follow_up(
                answer_quality=answer_quality,
                covered_knowledge_points=[],
                missing_knowledge_points=["Redis key 设计"],
                follow_up_count=3,
                strictness="high",
                stage_priority="core",
            )
        )


class FinishInterviewControlTest(unittest.TestCase):
    def test_finishes_when_core_plan_is_covered_and_evidence_is_enough(self):
        interview_plan = {
            "stages": [
                {"target_skill": "project_authenticity", "priority": "core"},
                {"target_skill": "memory_management", "priority": "core"},
                {"target_skill": "rag", "priority": "supporting"},
            ]
        }

        self.assertTrue(
            should_finish_interview(
                interview_plan=interview_plan,
                skill_coverage={"project_authenticity": "effective_answer", "memory_management": "effective_failure"},
                turn_count=7,
                max_turns=10,
                evidence_count=4,
                unresolved_core_skills=[],
            )
        )

    def test_does_not_finish_when_core_skills_are_unresolved(self):
        interview_plan = {"stages": [{"target_skill": "memory_management", "priority": "core"}]}

        self.assertFalse(
            should_finish_interview(
                interview_plan=interview_plan,
                skill_coverage={},
                turn_count=4,
                max_turns=10,
                evidence_count=3,
                unresolved_core_skills=["memory_management"],
            )
        )


class NextStepPlannerTest(unittest.TestCase):
    def setUp(self):
        self.stage = {
            "stage_id": "stage_02",
            "stage_name": "Agent Memory 深挖",
            "target_skill": "memory_management",
            "priority": "core",
            "knowledge_points": [
                "Redis 存储短期上下文",
                "MySQL 存储长期记录",
                "Redis key 设计",
                "TTL 策略",
                "rolling summary 更新方式",
                "memory 写入条件",
                "长期记忆污染控制",
            ],
            "pass_criteria": ["能说明短期记忆和长期记忆的分工", "能说明写入策略和污染控制"],
            "stop_criteria": ["候选人能够说清数据结构、生命周期、写入策略和一致性风险"],
            "follow_up_directions": ["追问 Redis key 设计", "追问 memory update policy"],
        }

    def test_plans_follow_up_for_directionally_correct_but_vague_answer(self):
        result = plan_next_step(
            turn_id="turn_05",
            current_stage=self.stage,
            candidate_answer="Redis 存短期上下文，MySQL 存长期记录。",
            strictness="high",
            follow_up_count=1,
            max_follow_up_count=3,
            turn_count=5,
            max_turns=12,
            evidence_count=2,
        )

        self.assertIn(result["decision"], DECISIONS)
        self.assertEqual(result["decision"], "follow_up")
        self.assertEqual(result["current_target_skill"], "memory_management")
        self.assertIn("Redis 存储短期上下文", result["covered_knowledge_points"])
        self.assertIn("TTL 策略", result["missing_knowledge_points"])
        self.assertIn("insufficient_detail", result["risk_flags"])
        self.assertEqual(result["next_action"]["action_type"], "ask_follow_up")
        self.assertIn("TTL", result["next_action"]["question"])
        self.assertTrue(result["stage_control"]["should_continue_current_stage"])
        self.assertFalse(result["stage_control"]["should_end_interview"])

    def test_corrects_clear_technical_error_before_continuing(self):
        result = plan_next_step(
            turn_id="turn_06",
            current_stage=self.stage,
            candidate_answer="Redis 是关系型数据库，所以我会把所有长期事实和完整报告都只存在 Redis 里。",
            strictness="high",
            follow_up_count=0,
        )

        self.assertEqual(result["decision"], "correct_and_continue")
        self.assertIn("technical_error", result["risk_flags"])
        self.assertEqual(result["next_action"]["action_type"], "correct_then_retry")
        self.assertIn("需要纠正", result["next_action"]["question"])

    def test_challenges_inconsistent_answer(self):
        result = plan_next_step(
            turn_id="turn_07",
            current_stage=self.stage,
            candidate_answer="这个模块不是我做的，我只了解一点概念。",
            previous_answers=["这个 Agent Memory 模块是我独立负责并上线的。"],
            strictness="medium",
            follow_up_count=1,
        )

        self.assertEqual(result["decision"], "challenge_inconsistency")
        self.assertIn("inconsistency", result["risk_flags"])
        self.assertEqual(result["next_action"]["action_type"], "verify_inconsistency")

    def test_marks_possible_fabrication_after_repeated_detail_failures(self):
        result = plan_next_step(
            turn_id="turn_08",
            current_stage=self.stage,
            candidate_answer="我做过这个模块，反正就是 Redis、MySQL、LLM 都用了，具体就差不多这样。",
            strictness="high",
            follow_up_count=2,
            prior_risk_flags=["insufficient_detail", "insufficient_detail"],
        )

        self.assertEqual(result["decision"], "mark_possible_fabrication")
        self.assertIn("possible_fabrication", result["risk_flags"])
        self.assertIn("project_authenticity_risk", result["risk_flags"])
        self.assertEqual(result["next_action"]["action_type"], "ask_verification_question")

    def test_increases_difficulty_for_strong_answer(self):
        result = plan_next_step(
            turn_id="turn_09",
            current_stage=self.stage,
            candidate_answer=(
                "我会按 session_id 存 recent_turns 的 Redis List，session_state 用 Hash，TTL 30 分钟；"
                "rolling_summary 单独 key 设置 24 小时 TTL。完整 turn、evaluation、report 落 MySQL。"
                "长期 memory 不会单次面试直接写入，而是基于多次 evidence 和人工确认更新，避免污染。"
            ),
            strictness="high",
            follow_up_count=0,
            turn_count=9,
            max_turns=12,
            evidence_count=5,
        )

        self.assertEqual(result["decision"], "increase_difficulty")
        self.assertGreaterEqual(result["answer_quality"]["specificity"], 4)
        self.assertGreaterEqual(result["answer_quality"]["depth"], 4)
        self.assertEqual(result["next_action"]["action_type"], "ask_harder_follow_up")


if __name__ == "__main__":
    unittest.main()
