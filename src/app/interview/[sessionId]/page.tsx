import { InterviewSessionClient } from "@/components/interview/interview-session-client";

type InterviewSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function InterviewSessionPage({ params }: InterviewSessionPageProps) {
  const { sessionId } = await params;
  return <InterviewSessionClient sessionId={sessionId} />;
}
