import { ResumeBuilder } from '@/components/resume-builder/resume-builder';
export default async function NewResumePage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  return <ResumeBuilder resumeId={draft || 'new'} />;
}
