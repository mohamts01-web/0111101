import { ResumeBuilder } from '@/components/resume-builder/resume-builder';
export default async function EditResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResumeBuilder resumeId={id} />;
}
