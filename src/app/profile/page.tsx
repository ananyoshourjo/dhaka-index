export const dynamic = "force-dynamic";

import { ResumeBuilder } from "@/components/resume-builder";
import { getResumeContent } from "@/lib/resume";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireUser();
  const resume = getResumeContent(user.id);

  return (
    <ResumeBuilder
      initialResume={resume}
      subtitle="Your application-ready resume"
      title="Profile"
    />
  );
}
