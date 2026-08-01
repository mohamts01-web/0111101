'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, GraduationCap, Link2, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ResumeData, ResumeLanguage } from '@/components/resume-builder/resume-builder';

export type GuidedJob = {
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  responsibilities: string;
};
export type GuidedEducation = {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  start: string;
  end: string;
};
export type GuidedResumeDraft = {
  linkedinUrl: string;
  jobs: GuidedJob[];
  desiredTitle: string;
  education: GuidedEducation[];
  skills: string[];
  highlights: string;
  goals: string;
  importedText?: string;
};

type Props = {
  open: boolean;
  language: ResumeLanguage;
  resume: ResumeData;
  onClose: () => void;
  onComplete: (resume: ResumeData) => void;
};

const emptyDraft: GuidedResumeDraft = {
  linkedinUrl: '',
  jobs: [{ title: '', company: '', location: '', start: '', end: '', responsibilities: '' }],
  desiredTitle: '',
  education: [{ institution: '', degree: '', fieldOfStudy: '', start: '', end: '' }],
  skills: [],
  highlights: '',
  goals: '',
};

export function GuidedResumeWizard({ open, language, resume, onClose, onComplete }: Props) {
  const ar = language === 'ar';
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<GuidedResumeDraft>(emptyDraft);
  const [skillInput, setSkillInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [trialAvailable, setTrialAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void fetch('/api/ai/resume/guided/status')
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { trialAvailable?: boolean };
      })
      .then((payload) => {
        if (active && typeof payload?.trialAvailable === 'boolean') setTrialAvailable(payload.trialAvailable);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open]);

  const copy = useMemo(
    () =>
      ar
        ? {
            steps: ['ملف LinkedIn', 'خبرتك العملية', 'المسمى المستهدف', 'التعليم', 'المهارات', 'الإنجازات', 'الأهداف'],
            title: 'سيرة ذاتية بالذكاء الاصطناعي',
            linkedinTitle: 'استخدم ملف LinkedIn لإنشاء سيرة ذاتية',
            linkedinBody: 'ألصق رابط ملفك في LinkedIn أدناه. سنبدأ مباشرة.',
            linkedinPlaceholder: 'https://www.linkedin.com/in/your-profile',
            experienceTitle: 'خبرتك العملية',
            experienceBody: 'أضف حتى 3 وظائف سابقة. نحتاج وظيفة واحدة على الأقل للبدء.',
            jobTitle: 'المسمى الوظيفي',
            company: 'اسم الشركة',
            startEnd: 'تاريخ البداية والنهاية',
            addJob: 'إضافة وظيفة أخرى',
            desiredTitle: 'ما المسمى الوظيفي الذي تستهدفه؟',
            desiredBody: 'سيظهر هذا المسمى أعلى سيرتك. اجعله متوافقًا مع أهدافك أو الوظيفة المستهدفة.',
            educationTitle: 'تعليمك',
            educationBody: 'كلما أضفت معلومات أكثر، أنشأ المساعد مسودة أفضل.',
            institution: 'اسم المؤسسة التعليمية',
            degree: 'الدرجة العلمية',
            addEducation: 'إضافة مؤهل آخر',
            skillsTitle: 'اختر أهم مهاراتك',
            skillsBody: 'اكتب مهاراتك أو اختر من الاقتراحات، وسندمجها في سيرتك.',
            highlightsTitle: 'إنجازاتك المهنية',
            highlightsBody: 'الإنجازات، الجوائز، والنتائج المميزة التي حققتها.',
            goalsTitle: 'أهدافك المهنية',
            goalsBody: 'هل تريد تطوير مهارة أو دخول مجال محدد أو الانضمام إلى فريق مميز؟',
            optional: 'اختياري',
            skip: 'تخطي',
            back: 'رجوع',
            next: 'التالي',
            build: 'إنشاء السيرة',
            completed: 'مكتمل',
            atWork: 'المساعد الذكي يعمل',
            almost: 'سيرتك الذاتية جاهزة تقريبًا!',
            stillEdit: 'ستتمكن من إضافة المزيد من التفاصيل وتعديلها بعد ذلك.',
            addSkill: 'إضافة',
            suggestedSkills: ['إدارة المشاريع', 'تحليل البيانات', 'التواصل', 'العمل الجماعي', 'حل المشكلات'],
            failed: 'تعذر إنشاء السيرة الآن. تحقق من الرصيد وحاول مرة أخرى.',
          }
        : {
            steps: ['LinkedIn profile', 'Experience', 'Target role', 'Education', 'Skills', 'Highlights', 'Goals'],
            title: 'AI-powered Resume',
            linkedinTitle: 'Use your LinkedIn profile to create a resume',
            linkedinBody: "Paste a link to your LinkedIn profile below. We'll get started right away.",
            linkedinPlaceholder: 'https://www.linkedin.com/in/your-profile',
            experienceTitle: 'Your work experience',
            experienceBody: 'Add up to 3 previous jobs. We need at least one to get started.',
            jobTitle: 'Job title',
            company: 'Company name',
            startEnd: 'Start & End Date',
            addJob: 'Add another previous job',
            desiredTitle: 'What is your desired job title?',
            desiredBody:
              'This job title will appear at the top of your resume. Make sure it matches your goals or targeted job opening!',
            educationTitle: 'Your education',
            educationBody: 'The AI Assistant will create a better draft the more info you provide!',
            institution: 'Name of educational institution',
            degree: 'Degree',
            addEducation: 'Add one more education',
            skillsTitle: 'Choose your top skills',
            skillsBody: "Type or choose from suggestions! We'll integrate them into your resume.",
            highlightsTitle: 'Professional highlights',
            highlightsBody: 'Achievements, awards, stand-out results — share your past successes!',
            goalsTitle: 'Career goals',
            goalsBody:
              'Are you looking to grow in a specific skill set or industry? Find challenging projects? Join a great team? Share your thoughts!',
            optional: 'Optional',
            skip: 'Skip',
            back: 'Back',
            next: 'Next',
            build: 'Build my resume',
            completed: 'Completed',
            atWork: 'AI Assistant at work',
            almost: 'Your resume is almost ready!',
            stillEdit: 'You will still be able to add more details and make edits.',
            addSkill: 'Add',
            suggestedSkills: ['Project management', 'Data analysis', 'Communication', 'Teamwork', 'Problem solving'],
            failed: 'The resume could not be created. Check your balance and try again.',
          },
    [ar],
  );

  if (!open) return null;
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const Back = ar ? ArrowRight : ArrowLeft;

  function updateDraft<K extends keyof GuidedResumeDraft>(key: K, value: GuidedResumeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateJob(index: number, key: keyof GuidedJob, value: string) {
    setDraft((current) => ({
      ...current,
      jobs: current.jobs.map((job, item) => (item === index ? { ...job, [key]: value } : job)),
    }));
  }

  function updateEducation(index: number, key: keyof GuidedEducation, value: string) {
    setDraft((current) => ({
      ...current,
      education: current.education.map((item, position) => (position === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addSkill(value: string) {
    const skill = value.trim();
    if (!skill || draft.skills.includes(skill)) return;
    updateDraft('skills', [...draft.skills, skill]);
    setSkillInput('');
  }

  function currentProgress() {
    const values = [
      draft.linkedinUrl,
      draft.jobs.flatMap((job) => Object.values(job)).join(' '),
      draft.desiredTitle,
      draft.education.flatMap((item) => Object.values(item)).join(' '),
      draft.skills.join(' '),
      draft.highlights,
      draft.goals,
    ];
    const completed = values.filter((value) => value.trim()).length;
    return Math.round((completed / values.length) * 100);
  }

  function goNext() {
    if (step === 1 && !draft.jobs.some((job) => job.title.trim() && job.company.trim())) return;
    setProgress(currentProgress());
    setStep((current) => Math.min(7, current + 1));
  }

  async function buildResume() {
    setStatus('loading');
    setError('');
    setProgress(100);
    try {
      const response = await fetch('/api/ai/resume/guided', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'guided_resume', language, resume, guidedData: draft }),
      });
      const payload = (await response.json()) as { result?: { resume?: ResumeData | null }; error?: string };
      if (!response.ok || !payload.result?.resume) throw new Error(payload.error || copy.failed);
      onComplete(payload.result.resume);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.failed);
      setStatus('error');
    }
  }

  function renderStep() {
    if (step === 0)
      return (
        <WizardCard icon={<Link2 />} title={copy.linkedinTitle} body={copy.linkedinBody}>
          <Input
            dir="ltr"
            value={draft.linkedinUrl}
            onChange={(event) => updateDraft('linkedinUrl', event.target.value)}
            placeholder={copy.linkedinPlaceholder}
          />
        </WizardCard>
      );
    if (step === 1)
      return (
        <WizardCard icon={<BriefcaseBusiness />} title={copy.experienceTitle} body={copy.experienceBody}>
          <div className="guided-repeat-list">
            {draft.jobs.map((job, index) => (
              <div className="guided-repeat-item" key={index}>
                <div className="guided-field-grid">
                  <Input
                    placeholder={copy.jobTitle}
                    value={job.title}
                    onChange={(event) => updateJob(index, 'title', event.target.value)}
                  />
                  <Input
                    placeholder={copy.company}
                    value={job.company}
                    onChange={(event) => updateJob(index, 'company', event.target.value)}
                  />
                  <Input
                    placeholder={ar ? 'المدينة أو الدولة (اختياري)' : 'City or country (optional)'}
                    value={job.location}
                    onChange={(event) => updateJob(index, 'location', event.target.value)}
                  />
                </div>
                <div className="guided-field-grid">
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    {ar ? 'تاريخ البداية' : 'Start date'}
                    <Input
                      type="month"
                      value={job.start}
                      onChange={(event) => updateJob(index, 'start', event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    {ar ? 'تاريخ النهاية' : 'End date'}
                    <Input
                      type="month"
                      value={job.end}
                      onChange={(event) => updateJob(index, 'end', event.target.value)}
                    />
                  </label>
                </div>
                <Textarea
                  rows={3}
                  placeholder={
                    ar ? 'أبرز المهام أو النتائج التي حققتها (اختياري)' : 'Key responsibilities or results (optional)'
                  }
                  value={job.responsibilities}
                  onChange={(event) => updateJob(index, 'responsibilities', event.target.value)}
                />
                <Input
                  className="hidden"
                  placeholder={copy.startEnd}
                  value={`${job.start}${job.start || job.end ? ' — ' : ''}${job.end}`}
                  onChange={(event) => {
                    const [start = '', end = ''] = event.target.value.split('—').map((part) => part.trim());
                    updateJob(index, 'start', start);
                    updateJob(index, 'end', end);
                  }}
                />
              </div>
            ))}
          </div>
          {draft.jobs.length < 3 && (
            <button
              className="guided-add-button"
              type="button"
              onClick={() =>
                updateDraft('jobs', [
                  ...draft.jobs,
                  { title: '', company: '', location: '', start: '', end: '', responsibilities: '' },
                ])
              }
            >
              <Plus /> {copy.addJob}
            </button>
          )}
        </WizardCard>
      );
    if (step === 2)
      return (
        <WizardCard title={copy.desiredTitle} body={copy.desiredBody}>
          <Input
            value={draft.desiredTitle}
            onChange={(event) => updateDraft('desiredTitle', event.target.value)}
            placeholder={ar ? 'مثال: مدير منتجات' : 'Example: Product Manager'}
          />
        </WizardCard>
      );
    if (step === 3)
      return (
        <WizardCard icon={<GraduationCap />} title={copy.educationTitle} body={copy.educationBody}>
          <div className="guided-repeat-list">
            {draft.education.map((item, index) => (
              <div className="guided-repeat-item" key={index}>
                <div className="guided-field-grid">
                  <Input
                    placeholder={copy.institution}
                    value={item.institution}
                    onChange={(event) => updateEducation(index, 'institution', event.target.value)}
                  />
                  <Input
                    placeholder={copy.degree}
                    value={item.degree}
                    onChange={(event) => updateEducation(index, 'degree', event.target.value)}
                  />
                  <Input
                    placeholder={ar ? 'التخصص أو المجال الدراسي' : 'Major or field of study'}
                    value={item.fieldOfStudy}
                    onChange={(event) => updateEducation(index, 'fieldOfStudy', event.target.value)}
                  />
                </div>
                <div className="guided-field-grid">
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    {ar ? 'تاريخ البداية' : 'Start date'}
                    <Input
                      type="month"
                      value={item.start}
                      onChange={(event) => updateEducation(index, 'start', event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    {ar ? 'تاريخ التخرج أو النهاية' : 'Graduation or end date'}
                    <Input
                      type="month"
                      value={item.end}
                      onChange={(event) => updateEducation(index, 'end', event.target.value)}
                    />
                  </label>
                </div>
                <Input
                  className="hidden"
                  placeholder={copy.startEnd}
                  value={`${item.start}${item.start || item.end ? ' — ' : ''}${item.end}`}
                  onChange={(event) => {
                    const [start = '', end = ''] = event.target.value.split('—').map((part) => part.trim());
                    updateEducation(index, 'start', start);
                    updateEducation(index, 'end', end);
                  }}
                />
              </div>
            ))}
          </div>
          {draft.education.length < 3 && (
            <button
              className="guided-add-button"
              type="button"
              onClick={() =>
                updateDraft('education', [
                  ...draft.education,
                  { institution: '', degree: '', fieldOfStudy: '', start: '', end: '' },
                ])
              }
            >
              <Plus /> {copy.addEducation}
            </button>
          )}
        </WizardCard>
      );
    if (step === 4)
      return (
        <WizardCard title={copy.skillsTitle} body={copy.skillsBody}>
          <div className="guided-skill-input">
            <Input
              value={skillInput}
              onChange={(event) => setSkillInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSkill(skillInput);
                }
              }}
              placeholder={ar ? 'اكتب مهارة...' : 'Type a skill...'}
            />
            <Button type="button" onClick={() => addSkill(skillInput)}>
              <Plus /> {copy.addSkill}
            </Button>
          </div>
          <div className="guided-skill-list">
            {[...new Set([...copy.suggestedSkills, ...draft.skills])].map((skill) => (
              <button
                type="button"
                className={draft.skills.includes(skill) ? 'active' : ''}
                key={skill}
                onClick={() => addSkill(skill)}
              >
                <Check /> {skill}
              </button>
            ))}
          </div>
        </WizardCard>
      );
    if (step === 5)
      return (
        <WizardCard title={copy.highlightsTitle} body={copy.highlightsBody}>
          <Textarea
            rows={5}
            value={draft.highlights}
            onChange={(event) => updateDraft('highlights', event.target.value)}
            placeholder={ar ? 'اكتب أبرز إنجازاتك...' : 'Share your strongest achievements...'}
          />
        </WizardCard>
      );
    if (step === 6)
      return (
        <WizardCard title={copy.goalsTitle} body={copy.goalsBody}>
          <Textarea
            rows={5}
            value={draft.goals}
            onChange={(event) => updateDraft('goals', event.target.value)}
            placeholder={ar ? 'اكتب أهدافك المهنية...' : 'Share your career goals...'}
          />
        </WizardCard>
      );
    return (
      <div className="guided-generating">
        <span>
          <Sparkles />
        </span>
        <strong>{copy.atWork}</strong>
        <h3>{copy.almost}</h3>
        <p>{copy.stillEdit}</p>
        <div className="guided-progress-bar">
          <i style={{ width: `${progress}%` }} />
        </div>
        <b>
          {progress}% {copy.completed}
        </b>
      </div>
    );
  }

  return (
    <div className="guided-wizard-backdrop" role="presentation">
      <section className="guided-wizard" role="dialog" aria-modal="true" aria-labelledby="guided-wizard-title">
        <header className="guided-wizard-header">
          <div>
            <span>{copy.title}</span>
            <strong id="guided-wizard-title">{step < 7 ? copy.steps[step] : copy.atWork}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}>
            <X />
          </button>
        </header>
        {step < 7 && (
          <div className="guided-wizard-progress">
            <div>
              <span>{copy.steps[step]}</span>
              <b>{Math.round((step / 7) * 100)}%</b>
            </div>
            <div>
              <i style={{ width: `${Math.max(4, (step / 7) * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="guided-wizard-body">
          {trialAvailable !== null && (
            <p className="guided-trial-note">
              {trialAvailable
                ? ar
                  ? 'تجربتك الأولى لإنشاء السيرة بالذكاء الاصطناعي مجانية.'
                  : 'Your first AI resume build is free.'
                : ar
                  ? 'تكلفة إنشاء السيرة بالذكاء الاصطناعي: 10 نقاط.'
                  : 'AI resume build cost: 10 credits.'}
            </p>
          )}
          {renderStep()}
          {error && <p className="guided-error">{error}</p>}
        </div>
        <footer className="guided-wizard-footer">
          <Button
            type="button"
            variant="ghost"
            onClick={step === 0 ? onClose : () => setStep((current) => current - 1)}
          >
            {step === 0 ? (
              ar ? (
                'إلغاء'
              ) : (
                'Cancel'
              )
            ) : (
              <>
                <Back /> {copy.back}
              </>
            )}
          </Button>
          {step < 7 && step !== 1 && (
            <Button type="button" variant="ghost" onClick={goNext}>
              {copy.skip} <Arrow />
            </Button>
          )}
          {step === 1 && (
            <Button
              type="button"
              disabled={!draft.jobs.some((job) => job.title.trim() && job.company.trim())}
              onClick={goNext}
            >
              {copy.next} <Arrow />
            </Button>
          )}
          {(step === 0 || (step >= 2 && step < 7)) && (
            <Button type="button" onClick={goNext}>
              {copy.next} <Arrow />
            </Button>
          )}
          {step === 7 && (
            <Button type="button" disabled={status === 'loading'} onClick={() => void buildResume()}>
              {status === 'loading' ? (ar ? 'جارٍ الإنشاء...' : 'Building...') : copy.build} <Sparkles />
            </Button>
          )}
        </footer>
      </section>
    </div>
  );
}

function WizardCard({
  icon,
  title,
  body,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="guided-card">
      {icon && <span className="guided-card-icon">{icon}</span>}
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="guided-card-content">{children}</div>
    </div>
  );
}
