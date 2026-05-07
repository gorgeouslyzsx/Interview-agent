import { ReportClient } from "@/components/interview/report-client";

type InterviewReportPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function InterviewReportPage({ params }: InterviewReportPageProps) {
  const { sessionId } = await params;
  return <ReportClient sessionId={sessionId} />;
}
