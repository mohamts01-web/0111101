'use client';

import {
  ArrowUpRight,
  Coins,
  Copy,
  CreditCard,
  FileCheck2,
  FilePlus2,
  FileText,
  Layers3,
  LetterText,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale, type AppLocale } from '@/components/localization/locale-provider';

export interface ResumeDraft {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
  completion: number;
}

type Entitlement = {
  plan: string;
  trial_ends_at: string | null;
  totalCredits: number;
  subscriptionStatus: string | null;
  subscriptionAccessUntil: string | null;
};

const draftsKey = 'cv-platform-resumes';

const copy = {
  ar: {
    eyebrow: 'مساحة العمل',
    title: 'سيرك الذاتية',
    lead: 'أنشئ، حسّن، ونظّم مستنداتك المهنية من مكان واحد.',
    create: 'إنشاء سيرة جديدة',
    savedDrafts: 'المسودات المحفوظة',
    aiCredits: 'رصيد الذكاء الاصطناعي',
    point: 'نقطة',
    currentPlan: 'الباقة الحالية',
    journey: ['بناء السيرة', 'التحسين الذكي', 'خطاب التغطية', 'جاهز للتقديم'],
    focusEyebrow: 'الخطوة المقترحة',
    focusTitle: 'ارفع جودة سيرتك خلال دقائق',
    focusLead: 'أكمل الأقسام الناقصة ثم استخدم المراجعة الذكية لقياس الجاهزية والتوافق مع أنظمة ATS.',
    continueDraft: 'متابعة آخر مسودة',
    startResume: 'ابدأ سيرتك الأولى',
    completion: 'اكتمال السيرة',
    documents: 'المستندات',
    resumesTab: 'السير الذاتية',
    coverLettersTab: 'خطابات التغطية',
    trialActive: 'تجربتك الأساسية فعالة حتى',
    remainingCredits: 'الرصيد المتبقي',
    canceledActive: 'اشتراكك ملغي، ومزاياه مستمرة حتى نهاية المدة',
    previousEnded: 'اشتراكك السابق منتهي',
    useUntil: 'تستطيع استخدام الباقة حتى',
    endedHelp: 'سجل الاشتراك محفوظ، ويمكنك اختيار باقة جديدة واستعادة مزاياك في أي وقت.',
    renew: 'تجديد الاشتراك',
    draftsLead: 'ارجع إلى أي مسودة وتابع العمل من آخر نقطة.',
    firstTitle: 'أنشئ أول سيرة ذاتية',
    firstLead: 'سنمشي معك خطوة بخطوة، وستشاهد النتيجة مباشرة قبل التحميل.',
    lastEdited: 'آخر تعديل',
    edit: 'تعديل',
    duplicate: 'إنشاء نسخة',
    delete: 'حذف',
    copySuffix: 'نسخة',
    template: 'قالب',
    deleteTitle: 'حذف المسودة؟',
    deleteDescription: 'سيتم حذف هذه المسودة ومحتواها. لا يمكن التراجع عن هذا الإجراء.',
    cancel: 'إلغاء',
    confirmDelete: 'حذف المسودة',
  },
  en: {
    eyebrow: 'Workspace',
    title: 'Your resumes',
    lead: 'Create, improve, and organize your career documents in one place.',
    create: 'Create new resume',
    savedDrafts: 'Saved drafts',
    aiCredits: 'AI credit balance',
    point: 'credits',
    currentPlan: 'Current plan',
    journey: ['Build resume', 'Improve with AI', 'Cover letter', 'Ready to apply'],
    focusEyebrow: 'Recommended next step',
    focusTitle: 'Improve your resume in minutes',
    focusLead: 'Complete missing sections, then use AI review to measure readiness and ATS compatibility.',
    continueDraft: 'Continue latest draft',
    startResume: 'Start your first resume',
    completion: 'Resume completion',
    documents: 'Documents',
    resumesTab: 'Resumes',
    coverLettersTab: 'Cover letters',
    trialActive: 'Your Starter trial is active until',
    remainingCredits: 'Remaining balance',
    canceledActive: 'Your subscription is canceled and access continues until the end of the term',
    previousEnded: 'Your previous subscription has ended',
    useUntil: 'You can use the plan until',
    endedHelp: 'Your subscription history is preserved. Choose a new plan anytime to restore paid features.',
    renew: 'Renew subscription',
    draftsLead: 'Return to any draft and continue from where you stopped.',
    firstTitle: 'Create your first resume',
    firstLead: 'We will guide you step by step while you see the result before downloading.',
    lastEdited: 'Last edited',
    edit: 'Edit',
    duplicate: 'Duplicate',
    delete: 'Delete',
    copySuffix: 'Copy',
    template: 'Template',
    deleteTitle: 'Delete this draft?',
    deleteDescription: 'This draft and its content will be removed. This action cannot be undone.',
    cancel: 'Cancel',
    confirmDelete: 'Delete draft',
  },
} as const;

export function DashboardLandingPage() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [drafts, setDrafts] = useState<ResumeDraft[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResumeDraft | null>(null);
  const primaryDraft = drafts[0];
  const journeyIcons = useMemo(() => [FileText, Sparkles, LetterText, Send], []);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/resumes')
      .then(async (response) => {
        if (!response.ok) throw new Error('CLOUD_DRAFTS_UNAVAILABLE');
        const payload = (await response.json()) as {
          resumes?: Array<{
            id: string;
            title: string;
            template: string;
            content: Record<string, string>;
            updated_at: string;
          }>;
        };
        const cloudDrafts = (payload.resumes ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          template: `${text.template} ${item.template}`,
          updatedAt: item.updated_at,
          completion: Math.round(
            (Object.values(item.content ?? {}).filter((value) => value?.trim()).length / 15) * 100,
          ),
        }));
        if (cancelled) return;
        setDrafts(cloudDrafts);
        localStorage.setItem(draftsKey, JSON.stringify(cloudDrafts));
      })
      .catch(() => {
        if (cancelled) return;
        try {
          setDrafts(JSON.parse(localStorage.getItem(draftsKey) ?? '[]'));
        } catch {
          setDrafts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [text.template]);

  useEffect(() => {
    void fetch('/api/credits').then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as { entitlement?: Entitlement };
      setEntitlement(payload.entitlement ?? null);
    });
  }, []);

  function save(next: ResumeDraft[]) {
    setDrafts(next);
    localStorage.setItem(draftsKey, JSON.stringify(next));
  }

  async function remove(draft: ResumeDraft) {
    const response = await fetch(`/api/resumes/${draft.id}`, { method: 'DELETE' });
    if (!response.ok) return;
    save(drafts.filter((item) => item.id !== draft.id));
    localStorage.removeItem(`cv-platform-resume-${draft.id}`);
    setPendingDelete(null);
  }

  async function duplicate(draft: ResumeDraft) {
    const sourceResponse = await fetch(`/api/resumes/${draft.id}`);
    if (!sourceResponse.ok) return;
    const { resume } = (await sourceResponse.json()) as {
      resume: {
        language: string;
        template: string;
        page_mode: string;
        content: Record<string, string>;
        settings: Record<string, unknown>;
      };
    };
    const id = crypto.randomUUID();
    const title = `${draft.title} - ${text.copySuffix}`;
    const response = await fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title,
        language: resume.language,
        template: resume.template,
        pageMode: resume.page_mode,
        content: resume.content,
        settings: resume.settings,
      }),
    });
    if (!response.ok) return;
    save([{ ...draft, id, title, updatedAt: new Date().toISOString() }, ...drafts]);
  }

  return (
    <div className="resume-workspace">
      <header className="resume-workspace-header">
        <div>
          <p className="resume-eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="resume-muted">{text.lead}</p>
        </div>
        <Button asChild className="resume-primary-action">
          <Link href="/dashboard/resumes/new">
            <FilePlus2 />
            {text.create}
          </Link>
        </Button>
      </header>

      <section className="dashboard-journey" aria-label={text.eyebrow}>
        {text.journey.map((item, index) => {
          const Icon = journeyIcons[index];
          return (
            <div key={item} className={index === 0 ? 'active' : ''}>
              <span>
                <Icon />
              </span>
              <strong>{item}</strong>
              {index < text.journey.length - 1 && <i />}
            </div>
          );
        })}
      </section>

      <section className="dashboard-overview-grid">
        <div className="resume-stats">
          <div>
            <span className="stat-icon">
              <Layers3 />
            </span>
            <p>
              <small>{text.savedDrafts}</small>
              <strong>{drafts.length}</strong>
            </p>
          </div>
          <div>
            <span className="stat-icon">
              <Coins />
            </span>
            <p>
              <small>{text.aiCredits}</small>
              <strong>{entitlement ? `${entitlement.totalCredits} ${text.point}` : '...'}</strong>
            </p>
          </div>
          <div>
            <span className="stat-icon">
              <CreditCard />
            </span>
            <p>
              <small>{text.currentPlan}</small>
              <strong>{planLabel(entitlement?.plan, locale)}</strong>
            </p>
          </div>
        </div>

        <article className="dashboard-focus-card">
          <div className="dashboard-focus-copy">
            <span>{text.focusEyebrow}</span>
            <h2>{text.focusTitle}</h2>
            <p>{text.focusLead}</p>
            <Button asChild variant="secondary">
              <Link href={primaryDraft ? `/dashboard/resumes/${primaryDraft.id}` : '/dashboard/resumes/new'}>
                {primaryDraft ? text.continueDraft : text.startResume}
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <div className="dashboard-focus-document" aria-hidden="true">
            <span className="dashboard-focus-score">{primaryDraft?.completion ?? 0}%</span>
            <b />
            <i />
            <i />
            <strong />
            <i />
            <i />
            <i />
          </div>
        </article>
      </section>

      {entitlement?.plan === 'trial_basic' && entitlement.trial_ends_at && (
        <div className="trial-notice">
          {text.trialActive}{' '}
          {new Date(entitlement.trial_ends_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}.{' '}
          {text.remainingCredits} {entitlement.totalCredits} {text.point}.
        </div>
      )}

      {entitlement?.subscriptionStatus === 'canceled' && entitlement.subscriptionAccessUntil && (
        <div className="subscription-ended-notice">
          <div>
            <strong>
              {new Date(entitlement.subscriptionAccessUntil).getTime() > Date.now()
                ? text.canceledActive
                : text.previousEnded}
            </strong>
            <p>
              {new Date(entitlement.subscriptionAccessUntil).getTime() > Date.now()
                ? `${text.useUntil} ${new Date(entitlement.subscriptionAccessUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}.`
                : text.endedHelp}
            </p>
          </div>
          {new Date(entitlement.subscriptionAccessUntil).getTime() <= Date.now() && (
            <Button asChild variant="outline" size="sm">
              <Link href="/#pricing">{text.renew}</Link>
            </Button>
          )}
        </div>
      )}

      <section className="resume-list-section">
        <div className="resume-section-heading">
          <div>
            <p className="resume-eyebrow">{text.documents}</p>
            <h2>{text.savedDrafts}</h2>
            <p>{text.draftsLead}</p>
          </div>
          <div className="document-tabs" role="tablist" aria-label={text.documents}>
            <button className="active" role="tab" aria-selected="true">
              <FileText /> {text.resumesTab}
            </button>
            <Link href="/dashboard/cover-letters" role="tab">
              <LetterText /> {text.coverLettersTab}
            </Link>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="resume-empty-state">
            <div className="resume-empty-copy">
              <span className="empty-icon">
                <FileCheck2 />
              </span>
              <h2>{text.firstTitle}</h2>
              <p>{text.firstLead}</p>
              <Button asChild>
                <Link href="/dashboard/resumes/new">
                  <FilePlus2 /> {text.create}
                </Link>
              </Button>
            </div>
            <div className="resume-empty-document" aria-hidden="true">
              <span />
              <b />
              <i />
              <i />
              <strong />
              <i />
              <i />
            </div>
          </div>
        ) : (
          <div className="resume-draft-grid">
            {drafts.map((draft) => (
              <article className="resume-draft-card" key={draft.id}>
                <div className="resume-draft-preview" aria-hidden="true">
                  <span>{draft.completion}%</span>
                  <div className="resume-thumbnail-lines">
                    <b />
                    <i />
                    <i />
                    <strong />
                    <i />
                  </div>
                </div>
                <div className="resume-draft-body">
                  <div>
                    <h3>{draft.title}</h3>
                    <p>
                      {draft.template} · {text.lastEdited}{' '}
                      {new Date(draft.updatedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <div className="resume-completion-inline">
                    <span>{text.completion}</span>
                    <b>{draft.completion}%</b>
                    <i>
                      <span style={{ width: `${draft.completion}%` }} />
                    </i>
                  </div>
                </div>
                <div className="resume-card-actions">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/dashboard/resumes/${draft.id}`}>
                      <Pencil /> {text.edit}
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicate(draft)}>
                    <Copy /> {text.duplicate}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(draft)}
                    aria-label={`${text.delete} ${draft.title}`}
                    title={text.delete}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="dashboard-confirm-dialog" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{text.deleteTitle}</DialogTitle>
            <DialogDescription>{text.deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              {text.cancel}
            </Button>
            <Button variant="destructive" onClick={() => pendingDelete && remove(pendingDelete)}>
              <Trash2 /> {text.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function planLabel(plan: string | undefined, locale: AppLocale) {
  return (
    (
      {
        free: locale === 'ar' ? 'مجانية' : 'Free',
        trial_basic: locale === 'ar' ? 'التجريبية الأساسية' : 'Trial',
        basic: locale === 'ar' ? 'الأساسية بلس' : 'Basic Plus',
        standard: locale === 'ar' ? 'متوسطة قديمة' : 'Legacy Pro',
        advanced: locale === 'ar' ? 'متقدمة' : 'Advanced',
      } as Record<string, string>
    )[plan ?? 'free'] ?? (locale === 'ar' ? 'مجانية' : 'Free')
  );
}
