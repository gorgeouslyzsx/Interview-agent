import { NewInterviewForm } from "@/components/interview/new-interview-form";
import type { UserRole } from "@/lib/domain/types";

type NewInterviewPageProps = {
  searchParams: Promise<{ role?: string; identityId?: string }>;
};

export default async function NewInterviewPage({ searchParams }: NewInterviewPageProps) {
  const params = await searchParams;
  const initialRole: UserRole = params.role === "interviewer" ? "interviewer" : "candidate";

  return <NewInterviewForm initialRole={initialRole} identityId={params.identityId} />;
}
