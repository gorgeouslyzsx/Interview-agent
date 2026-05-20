import * as lightweightEvalModule from "../src/lib/evaluation/lightweight-eval";

type LightweightEvalModule = typeof import("../src/lib/evaluation/lightweight-eval");

const lightweightEval = (
  (lightweightEvalModule as LightweightEvalModule).runLightweightEval
    ? lightweightEvalModule
    : (lightweightEvalModule as LightweightEvalModule & { default: LightweightEvalModule }).default
) as LightweightEvalModule;

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

const apiKey = process.env.EVAL_LLM_API_KEY || process.env.DEEPSEEK_API_KEY;
const includeLive = readBooleanEnv(process.env.EVAL_INCLUDE_LIVE, Boolean(apiKey));

async function main() {
  const result = await lightweightEval.runLightweightEval({
    includeLive,
    apiKey,
    baseUrl: process.env.EVAL_LLM_BASE_URL || "https://api.deepseek.com",
    model: process.env.EVAL_LLM_MODEL || "deepseek-v4-flash",
  });

  console.log(lightweightEval.summarizeEvalResult(result));

  if (process.env.EVAL_JSON === "1") {
    console.log(JSON.stringify(result, null, 2));
  }

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
