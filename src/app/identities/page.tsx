import { IdentitySelectionClient } from "@/components/interview/identity-selection-client";
import type { UserRole } from "@/lib/domain/types";

type IdentitiesPageProps = {
  searchParams: Promise<{ role?: string }>;
};

export default async function IdentitiesPage({ searchParams }: IdentitiesPageProps) {
  const params = await searchParams;
  const userRole: UserRole = params.role === "interviewer" ? "interviewer" : "candidate";

  return <IdentitySelectionClient userRole={userRole} />;
}
