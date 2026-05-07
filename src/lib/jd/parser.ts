const KNOWN_SKILLS = [
  "Java",
  "Spring Boot",
  "MySQL",
  "Redis",
  "消息队列",
  "Kafka",
  "RabbitMQ",
  "React",
  "Vue",
  "TypeScript",
  "Node.js",
  "Docker",
  "Kubernetes",
  "系统设计",
  "算法",
];

export type ParsedJD = {
  title?: string;
  skills: string[];
  responsibilities: string[];
  seniority?: string;
  focusAreas: string[];
};

export function parseJD(rawText: string): ParsedJD {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const titleLine = lines.find((line) => /岗位|职位|招聘/.test(line));
  const title = titleLine?.replace(/^(岗位|职位|招聘)[:：]\s*/, "").trim();

  const skills = KNOWN_SKILLS.filter((skill) =>
    rawText.toLowerCase().includes(skill.toLowerCase()),
  );

  const responsibilities = lines.filter((line) => /负责|参与|职责|开发|设计|优化/.test(line));
  const seniority = lines.find((line) => /年|经验|应届|实习/.test(line));
  const focusAreas = Array.from(new Set([...skills.slice(0, 5), ...responsibilities.slice(0, 2)]));

  return {
    title,
    skills,
    responsibilities,
    seniority,
    focusAreas,
  };
}
