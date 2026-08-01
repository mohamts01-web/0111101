'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type TextUIPart, type UIMessage } from 'ai';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  ClipboardCheck,
  Coins,
  FileCheck2,
  Languages,
  LetterText,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  PanelTopClose,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/localization/locale-provider';
import { resumeBuilderCopy } from '@/components/resume-builder/resume-builder-copy';
import type { ResumeData, ResumeLanguage } from '@/components/resume-builder/resume-builder';

export type AiWorkspaceTool = 'writer' | 'review' | 'ats' | 'tailor' | 'translate' | 'cover' | 'dual';

type Operation =
  | 'assistant_message'
  | 'improve_section'
  | 'translate_section'
  | 'translate_resume'
  | 'resume_review'
  | 'cover_letter'
  | 'ats_analysis'
  | 'tailor_resume'
  | 'dual_review';

type TargetSection = 'auto' | 'all' | keyof ResumeData;

type ReviewStatus = 'strong' | 'good' | 'needs_work';
type DetailedReview = {
  overallScore: number;
  headline: string;
  dimensions: Array<{ key: 'structure' | 'clarity' | 'roleFit'; score: number; status: ReviewStatus; summary: string }>;
  sections: Array<{
    key: keyof ResumeData;
    score: number;
    status: ReviewStatus;
    summary: string;
    strengths: string[];
    improvements: string[];
    actions: string[];
  }>;
  missingSections: Array<{ key: keyof ResumeData; reason: string }>;
};
type Analysis = {
  score: number;
  strengths: string[];
  missingKeywords: string[];
  improvements: string[];
  atsIssues: string[];
};
type AiResult = {
  message: string;
  resume: ResumeData | null;
  analysis: Analysis | null;
  review: DetailedReview | null;
  coverLetter: string | null;
};
type CreditService = { operation_key: Operation; name_ar: string; name_en?: string; credit_cost: number };
type CreditWallet = {
  totalCredits: number;
  monthlyAllocation: number;
  monthlyUsed: number;
  usagePercent: number;
};
type ReviewSnapshot = { operation: Operation; result: AiResult; createdAt: number };

const fallbackServices: CreditService[] = [
  { operation_key: 'assistant_message', name_ar: 'رسالة للمساعد', name_en: 'Assistant message', credit_cost: 1 },
  { operation_key: 'improve_section', name_ar: 'تحسين قسم', name_en: 'Improve section', credit_cost: 3 },
  { operation_key: 'translate_section', name_ar: 'ترجمة قسم', name_en: 'Translate section', credit_cost: 4 },
  { operation_key: 'resume_review', name_ar: 'تقييم شامل للسيرة', name_en: 'Full resume review', credit_cost: 10 },
  { operation_key: 'cover_letter', name_ar: 'إنشاء خطاب تغطية', name_en: 'Create cover letter', credit_cost: 10 },
  { operation_key: 'ats_analysis', name_ar: 'تحليل توافق ATS', name_en: 'ATS analysis', credit_cost: 12 },
  { operation_key: 'translate_resume', name_ar: 'ترجمة السيرة كاملة', name_en: 'Translate resume', credit_cost: 12 },
  { operation_key: 'tailor_resume', name_ar: 'تحسين السيرة للوظيفة', name_en: 'Tailor to a role', credit_cost: 20 },
  { operation_key: 'dual_review', name_ar: 'تحليل متقدم بنموذجين', name_en: 'Dual-model review', credit_cost: 25 },
];

const actionIcons: Record<Operation, typeof Sparkles> = {
  assistant_message: MessageSquareText,
  improve_section: WandSparkles,
  translate_section: Languages,
  translate_resume: Languages,
  resume_review: ClipboardCheck,
  cover_letter: LetterText,
  ats_analysis: Target,
  tailor_resume: BriefcaseBusiness,
  dual_review: Sparkles,
};

const toolOperation: Record<Exclude<AiWorkspaceTool, 'writer'>, Operation> = {
  review: 'resume_review',
  ats: 'ats_analysis',
  tailor: 'tailor_resume',
  translate: 'translate_resume',
  cover: 'cover_letter',
  dual: 'dual_review',
};

const jobOperations = new Set<Operation>(['ats_analysis', 'tailor_resume', 'cover_letter']);

const copy = {
  ar: {
    title: 'اسأل المساعد LOAD',
    subtitle: 'مساعدك لكتابة سيرة أقوى، خطوة بخطوة',
    welcomeTitle: 'مرحبًا، كيف يمكنني تحسين سيرتك اليوم؟',
    welcomeBody: 'اسأل عن أي جزء من سيرتك، أو اختر إجراءً جاهزًا للحصول على نتيجة يمكنك مراجعتها قبل الحفظ.',
    placeholder: 'اكتب رسالتك هنا...',
    send: 'إرسال الرسالة',
    stop: 'إيقاف التوليد',
    retry: 'إعادة المحاولة',
    clear: 'مسح المحادثة',
    services: 'إجراءات ذكية',
    servicesHint: 'اختر الإجراء المناسب؛ سترى التكلفة والنتيجة قبل تطبيق أي تغيير.',
    point: 'نقطة',
    points: 'نقاط',
    remaining: 'الرصيد المتاح',
    usage: 'استهلاك الباقة',
    buyCredits: 'إضافة رصيد',
    section: 'القسم المستهدف',
    jobTitle: 'أضف الوصف الوظيفي',
    jobHint: 'الصق وصف الوظيفة ليتم التحليل أو المواءمة بدقة.',
    jobPlaceholder: 'الصق الوصف الوظيفي هنا...',
    run: 'تنفيذ',
    cancel: 'إلغاء',
    reviewTitle: 'مراجعة AI',
    reviewSubtitle: 'راجع ما تم إنجازه قبل حفظ أي تغيير في السيرة.',
    backToChat: 'العودة للمساعد',
    completed: 'اكتملت العملية',
    changes: 'التغييرات المقترحة',
    before: 'قبل',
    after: 'بعد',
    empty: 'لا يوجد محتوى سابق',
    apply: 'تطبيق التعديلات',
    saveReport: 'حفظ النتيجة',
    savedReport: 'تم حفظ النتيجة في سجل هذه السيرة.',
    undo: 'تراجع',
    discard: 'تجاهل النتيجة',
    confirmTitle: 'تطبيق التعديلات على السيرة؟',
    confirmBody: 'سيتم تحديث المسودة ويمكنك التراجع خطوة واحدة بعد التطبيق.',
    confirm: 'تأكيد التطبيق',
    applied: 'طُبقت التعديلات على المسودة. يمكنك التراجع الآن.',
    discarded: 'تم تجاهل النتيجة.',
    score: 'النتيجة',
    strengths: 'نقاط القوة',
    improvements: 'فرص التحسين',
    missingKeywords: 'الكلمات المفقودة',
    atsIssues: 'ملاحظات ATS',
    affectedSections: 'الأقسام المتأثرة',
    noChanges: 'تحتوي النتيجة على إرشادات فقط ولا توجد تغييرات نصية لتطبيقها.',
    requestFailed: 'تعذر إكمال الطلب الآن. تحقق من الرصيد وحاول مرة أخرى.',
    close: 'إغلاق المساعد',
    coverSave: 'حفظ خطاب التغطية',
    coverSaved: 'تم حفظ خطاب التغطية.',
    quickPrompts: ['قيّم قوة النبذة المهنية', 'ما المعلومات الناقصة؟', 'كيف أجعل خبرتي أكثر إقناعًا؟'],
    browseServices: 'استعراض الخدمات',
    servicesIntro:
      'أستطيع تحسين الصياغة والترجمة، مراجعة السيرة، قياس توافق ATS، مواءمتها مع وظيفة، وإنشاء خطاب تغطية. اختر الإجراء المناسب من الأدوات أدناه.',
    automatic: 'تلقائي',
    allSections: 'الكل',
    planUsed: 'المستخدم من الباقة',
  },
  en: {
    title: 'ASK AI LOAD',
    subtitle: 'Your copilot for building a stronger resume',
    welcomeTitle: 'Hi, how can I improve your resume today?',
    welcomeBody: 'Ask about any part of your resume, or choose an action to get a result you can review before saving.',
    placeholder: 'Message ASK AI LOAD...',
    send: 'Send message',
    stop: 'Stop generating',
    retry: 'Try again',
    clear: 'Clear conversation',
    services: 'Smart actions',
    servicesHint: 'Choose an action; you will see its cost and review the result before anything changes.',
    point: 'point',
    points: 'points',
    remaining: 'Available balance',
    usage: 'Plan usage',
    buyCredits: 'Add credits',
    section: 'Target section',
    jobTitle: 'Add the job description',
    jobHint: 'Paste the role description for an accurate analysis or tailored result.',
    jobPlaceholder: 'Paste the job description here...',
    run: 'Run action',
    cancel: 'Cancel',
    reviewTitle: 'AI Review',
    reviewSubtitle: 'Review what was done before saving any change to your resume.',
    backToChat: 'Back to assistant',
    completed: 'Action complete',
    changes: 'Proposed changes',
    before: 'Before',
    after: 'After',
    empty: 'No previous content',
    apply: 'Apply changes',
    saveReport: 'Save result',
    savedReport: 'The result was saved in this resume history.',
    undo: 'Undo',
    discard: 'Discard result',
    confirmTitle: 'Apply these changes to your resume?',
    confirmBody: 'Your draft will be updated and you can undo one step after applying.',
    confirm: 'Confirm apply',
    applied: 'Changes applied to your draft. You can undo them now.',
    discarded: 'Result discarded.',
    score: 'Score',
    strengths: 'Strengths',
    improvements: 'Opportunities to improve',
    missingKeywords: 'Missing keywords',
    atsIssues: 'ATS notes',
    affectedSections: 'Affected sections',
    noChanges: 'This result contains guidance only and has no text changes to apply.',
    requestFailed: 'The request could not be completed. Check your balance and try again.',
    close: 'Close assistant',
    coverSave: 'Save cover letter',
    coverSaved: 'Cover letter saved.',
    quickPrompts: [
      'Review my professional summary',
      'What information is missing?',
      'How can I strengthen my experience?',
    ],
    browseServices: 'Browse services',
    servicesIntro:
      'I can improve and translate content, review the resume, measure ATS fit, tailor it to a role, and create a cover letter. Choose a smart action below.',
    automatic: 'Auto',
    allSections: 'All sections',
    planUsed: 'Plan used',
  },
};

export function ResumeAiWorkspace({
  data,
  language,
  resumeId,
  initialTool = 'writer',
  initialSection = 'summary',
  onApplyResume,
  onUndo,
  canUndo,
  onClose,
  onNavigateSection,
  onReviewAvailabilityChange,
}: {
  data: ResumeData;
  language: ResumeLanguage;
  resumeId?: string;
  initialTool?: AiWorkspaceTool;
  initialSection?: keyof ResumeData;
  onApplyResume: (resume: ResumeData) => void;
  onUndo: () => void;
  canUndo: boolean;
  onClose?: () => void;
  onNavigateSection?: (section: keyof ResumeData) => void;
  onReviewAvailabilityChange?: (available: boolean) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const builderText = resumeBuilderCopy[locale];
  const [sectionField, setSectionField] = useState<TargetSection>('auto');
  const resolvedSection = sectionField === 'auto' ? initialSection : sectionField === 'all' ? undefined : sectionField;
  const contextRef = useRef<{
    resume: ResumeData;
    language: ResumeLanguage;
    resumeId?: string;
    sectionField?: keyof ResumeData;
  }>({ resume: data, language, resumeId, sectionField: resolvedSection });
  contextRef.current = { resume: data, language, resumeId, sectionField: resolvedSection };
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/resume/chat',
        body: () => contextRef.current,
      }),
    [],
  );
  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    regenerate,
    error: chatError,
    clearError,
  } = useChat({
    id: `load-resume-${resumeId ?? 'draft'}`,
    transport,
    throttle: 40,
    onFinish: () => void loadCredits(),
  });
  const [view, setView] = useState<'chat' | 'review'>(initialTool === 'review' ? 'review' : 'chat');
  const [prompt, setPrompt] = useState('');
  const [selectedAction, setSelectedAction] = useState<Operation | null>(
    initialTool === 'writer' || initialTool === 'review' ? null : toolOperation[initialTool],
  );
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<AiResult | null>(null);
  const [lastOperation, setLastOperation] = useState<Operation>('assistant_message');
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmApply, setConfirmApply] = useState(false);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [services, setServices] = useState<CreditService[]>(fallbackServices);
  const [servicesExplained, setServicesExplained] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedChatRef = useRef(false);

  const chatStorageKey = `load-ai-chat-${resumeId ?? 'draft'}-${language}`;
  const reviewStorageKey = `load-ai-result-${resumeId ?? 'draft'}-${language}`;
  const isStreaming = status === 'submitted' || status === 'streaming';
  const sectionOptions = useMemo(
    () =>
      (Object.keys(data) as Array<keyof ResumeData>).filter(
        (key) => !['name', 'email', 'phone', 'city', 'link'].includes(key),
      ),
    [data],
  );
  const changedFields = useMemo(
    () =>
      result?.resume
        ? (Object.keys(data) as Array<keyof ResumeData>).filter((key) => result.resume?.[key] !== data[key])
        : [],
    [data, result],
  );

  useEffect(() => {
    if (initialTool === 'review') {
      setView('review');
      return;
    }
    setView('chat');
    if (initialTool !== 'writer') setSelectedAction(toolOperation[initialTool]);
  }, [initialTool]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(chatStorageKey) ?? '[]') as UIMessage[];
      if (stored.length) setMessages(stored);
    } catch {
      /* Ignore malformed local chat history. */
    }
    try {
      const stored = JSON.parse(localStorage.getItem(reviewStorageKey) ?? 'null') as ReviewSnapshot | null;
      if (stored?.result) {
        setResult(stored.result);
        setLastOperation(stored.operation);
        onReviewAvailabilityChange?.(true);
      }
    } catch {
      /* Ignore malformed local result history. */
    }
    hydratedChatRef.current = true;
  }, [chatStorageKey, onReviewAvailabilityChange, reviewStorageKey, setMessages]);

  useEffect(() => {
    if (!hydratedChatRef.current) return;
    localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-30)));
    if (messages.length === 0) return;
    window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }, [chatStorageKey, messages]);

  useEffect(() => {
    void loadCredits();
  }, []);

  async function loadCredits() {
    try {
      const response = await fetch('/api/credits');
      if (!response.ok) return;
      const payload = (await response.json()) as { entitlement?: CreditWallet; services?: CreditService[] };
      setWallet(payload.entitlement ?? null);
      if (payload.services?.length) setServices(payload.services);
    } catch {
      /* Keep the assistant usable when the balance endpoint is temporarily unavailable. */
    }
  }

  function fieldLabel(key: keyof ResumeData) {
    return builderText.fields[key]?.[0] ?? key;
  }

  function serviceName(service: CreditService) {
    return locale === 'ar' ? service.name_ar : service.name_en || service.name_ar;
  }

  function operationPrompt(operation: Operation) {
    const sectionName = sectionField === 'all' ? text.allSections : fieldLabel(resolvedSection ?? initialSection);
    const wholeResume = sectionField === 'all';
    const prompts: Record<Operation, string> = {
      assistant_message: '',
      improve_section:
        locale === 'ar'
          ? wholeResume
            ? 'حسّن جميع أقسام السيرة وأعدها كاملة دون تغيير الحقائق.'
            : `حسّن قسم ${sectionName} فقط، وأعد السيرة كاملة دون تغيير الحقائق.`
          : wholeResume
            ? 'Improve all resume sections and return the full resume without changing facts.'
            : `Improve only the ${sectionName} section and return the full resume without changing facts.`,
      translate_section:
        locale === 'ar'
          ? wholeResume
            ? 'ترجم جميع أقسام السيرة ترجمة مهنية وأعد السيرة كاملة.'
            : `ترجم قسم ${sectionName} ترجمة مهنية مع إعادة السيرة كاملة.`
          : wholeResume
            ? 'Professionally translate all resume sections and return the full resume.'
            : `Professionally translate the ${sectionName} section and return the full resume.`,
      translate_resume:
        language === 'ar' ? 'ترجم السيرة كاملة إلى الإنجليزية.' : 'Translate the full resume into Arabic.',
      resume_review:
        locale === 'ar'
          ? 'راجع السيرة كاملة وقدّم نسخة محسنة.'
          : 'Review the full resume and propose an improved version.',
      cover_letter: locale === 'ar' ? 'أنشئ خطاب تغطية لهذه الوظيفة.' : 'Create a cover letter for this role.',
      ats_analysis: locale === 'ar' ? 'حلل توافق السيرة مع الوصف الوظيفي.' : 'Analyze ATS alignment with the role.',
      tailor_resume:
        locale === 'ar' ? 'واءم السيرة مع الوظيفة دون اختلاق معلومات.' : 'Tailor the resume without inventing facts.',
      dual_review: locale === 'ar' ? 'نفذ مراجعة متقدمة بنموذجين.' : 'Run an advanced review with two models.',
    };
    return prompts[operation];
  }

  async function runAction(operation: Operation) {
    if (operation === 'assistant_message') return;
    if (jobOperations.has(operation) && !jobDescription.trim()) {
      setSelectedAction(operation);
      return;
    }
    setLoadingAction(true);
    setActionError('');
    setNotice('');
    setConfirmApply(false);
    try {
      const response = await fetch('/api/ai/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          language,
          resume: data,
          prompt: operationPrompt(operation),
          jobDescription: jobDescription || undefined,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json()) as { result?: AiResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || text.requestFailed);
      const snapshot = { operation, result: payload.result, createdAt: Date.now() } satisfies ReviewSnapshot;
      setResult(payload.result);
      setLastOperation(operation);
      setView('review');
      setSelectedAction(null);
      localStorage.setItem(reviewStorageKey, JSON.stringify(snapshot));
      onReviewAvailabilityChange?.(true);
      void loadCredits();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : text.requestFailed);
    } finally {
      setLoadingAction(false);
    }
  }

  function chooseAction(operation: Operation) {
    setActionError('');
    setNotice('');
    if (jobOperations.has(operation)) {
      setSelectedAction(operation);
      return;
    }
    void runAction(operation);
  }

  async function submitMessage(event?: FormEvent) {
    event?.preventDefault();
    const value = prompt.trim();
    if (!value || isStreaming) return;
    clearError();
    setPrompt('');
    await sendMessage({ text: value });
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  function applyResult() {
    if (!result?.resume || !changedFields.length) return;
    onApplyResume(result.resume);
    setConfirmApply(false);
    setNotice(text.applied);
  }

  function saveResult() {
    if (!result) return;
    localStorage.setItem(reviewStorageKey, JSON.stringify({ operation: lastOperation, result, createdAt: Date.now() }));
    setNotice(text.savedReport);
  }

  function discardResult() {
    localStorage.removeItem(reviewStorageKey);
    setResult(null);
    setNotice('');
    setView('chat');
    onReviewAvailabilityChange?.(false);
  }

  async function saveCoverLetter() {
    if (!result?.coverLetter) return;
    setLoadingAction(true);
    setActionError('');
    try {
      const response = await fetch('/api/cover-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId, language, jobDescription, content: result.coverLetter }),
      });
      if (!response.ok) throw new Error(text.requestFailed);
      setNotice(text.coverSaved);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : text.requestFailed);
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <section className="load-chat-shell" aria-label={text.title}>
      <header className="load-chat-header">
        <div className="load-chat-brand">
          <span>
            <Sparkles />
          </span>
          <div>
            <strong>{view === 'review' ? text.reviewTitle : text.title}</strong>
            <small>{view === 'review' ? text.reviewSubtitle : text.subtitle}</small>
          </div>
        </div>
        <div className="load-chat-header-actions">
          {view === 'review' && (
            <button type="button" onClick={() => setView('chat')} title={text.backToChat} aria-label={text.backToChat}>
              {locale === 'ar' ? <ChevronRight /> : <ChevronLeft />}
            </button>
          )}
          {messages.length > 0 && view === 'chat' && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                localStorage.removeItem(chatStorageKey);
              }}
              title={text.clear}
              aria-label={text.clear}
            >
              <Trash2 />
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} title={text.close} aria-label={text.close}>
              <PanelTopClose />
            </button>
          )}
        </div>
      </header>

      <div className="load-chat-balance">
        <div className="load-chat-credit-total">
          <span>
            <Coins />
          </span>
          <div>
            <small>{text.remaining}</small>
            <strong>
              {wallet?.totalCredits ?? '—'} <em>{text.points}</em>
            </strong>
          </div>
        </div>
        <div className="load-chat-plan-meter">
          <div>
            <span>{text.planUsed}</span>
            <b>{wallet?.usagePercent ?? 0}%</b>
          </div>
          <div
            className="load-chat-usage"
            role="progressbar"
            aria-valuenow={wallet?.usagePercent ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${wallet?.usagePercent ?? 0}%` }} />
          </div>
          <small>
            {wallet?.monthlyAllocation
              ? `${wallet.monthlyUsed} / ${wallet.monthlyAllocation} ${text.points}`
              : text.usage}
          </small>
        </div>
        <Link href="/dashboard/credits">{text.buyCredits}</Link>
      </div>

      {view === 'chat' ? (
        <>
          <div className="load-chat-scroll" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="load-chat-welcome">
                <div className="load-chat-welcome-icon">
                  <Sparkles />
                </div>
                <div className="load-chat-welcome-message">
                  <span>
                    <Bot />
                  </span>
                  <div>
                    <h2>
                      {locale === 'ar'
                        ? 'كيف تحب أساعدك في سيرتك الذاتية؟'
                        : 'How would you like me to help with your resume?'}
                    </h2>
                    <p>{text.welcomeBody}</p>
                    <button type="button" onClick={() => setServicesExplained(true)}>
                      <ListChecks /> {text.browseServices}
                    </button>
                  </div>
                </div>
                {servicesExplained && (
                  <div className="load-chat-local-reply" aria-live="polite">
                    <span>
                      <Sparkles />
                    </span>
                    <p>{text.servicesIntro}</p>
                  </div>
                )}
                <div className="load-chat-prompt-suggestions">
                  {text.quickPrompts.map((item) => (
                    <button type="button" key={item} onClick={() => setPrompt(item)}>
                      <Sparkles />
                      <span>{item}</span>
                      {locale === 'ar' ? <ChevronLeft /> : <ChevronRight />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="load-chat-messages" aria-live="polite">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} locale={locale} />
                ))}
                {status === 'submitted' && (
                  <div className="load-chat-thinking">
                    <LoaderCircle /> {locale === 'ar' ? 'يفكر المساعد...' : 'Thinking...'}
                  </div>
                )}
              </div>
            )}

            {(chatError || actionError) && (
              <div className="load-chat-error" role="alert">
                <span>{actionError || text.requestFailed}</span>
                {chatError && (
                  <button type="button" onClick={() => void regenerate()}>
                    <RefreshCw /> {text.retry}
                  </button>
                )}
              </div>
            )}

            {selectedAction && (
              <ActionSetup
                operation={selectedAction}
                name={serviceName(
                  services.find((service) => service.operation_key === selectedAction) ?? fallbackServices[0],
                )}
                cost={services.find((service) => service.operation_key === selectedAction)?.credit_cost ?? 0}
                needsJob={jobOperations.has(selectedAction)}
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
                onRun={() => void runAction(selectedAction)}
                onCancel={() => setSelectedAction(null)}
                loading={loadingAction}
                text={text}
              />
            )}
          </div>

          <div className="load-chat-services">
            <div>
              <strong>{text.services}</strong>
              <span>{text.servicesHint}</span>
            </div>
            <div className="load-chat-service-grid">
              {services
                .filter((service) => service.operation_key !== 'assistant_message')
                .map((service, index) => {
                  const Icon = actionIcons[service.operation_key];
                  return (
                    <button
                      type="button"
                      key={service.operation_key}
                      className={selectedAction === service.operation_key ? 'active' : ''}
                      onClick={() => chooseAction(service.operation_key)}
                      disabled={loadingAction}
                      style={{ animationDelay: `${index * 70}ms` }}
                      title={`${serviceName(service)} · ${service.credit_cost} ${text.points}`}
                    >
                      <span className="load-chat-service-icon">
                        <Icon />
                      </span>
                      <span>{serviceName(service)}</span>
                      <b>
                        {service.credit_cost} {service.credit_cost === 1 ? text.point : text.points}
                      </b>
                    </button>
                  );
                })}
            </div>
          </div>

          <form className="load-chat-composer" onSubmit={submitMessage}>
            <label>
              <span>{text.section}</span>
              <select value={sectionField} onChange={(event) => setSectionField(event.target.value as TargetSection)}>
                <option value="auto">{text.automatic}</option>
                <option value="all">{text.allSections}</option>
                {sectionOptions.map((key) => (
                  <option value={key} key={key}>
                    {fieldLabel(key)}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={text.placeholder}
                rows={2}
              />
              {isStreaming ? (
                <button type="button" onClick={() => void stop()} aria-label={text.stop} title={text.stop}>
                  <CircleStop />
                </button>
              ) : (
                <button type="submit" disabled={!prompt.trim()} aria-label={text.send} title={text.send}>
                  <ArrowUp />
                </button>
              )}
            </div>
            <small>
              {locale === 'ar'
                ? 'Enter للإرسال · Shift+Enter لسطر جديد · الرسالة 1 نقطة'
                : 'Enter to send · Shift+Enter for a new line · 1 point per message'}
            </small>
          </form>
        </>
      ) : result ? (
        <ReviewView
          result={result}
          operation={lastOperation}
          changedFields={changedFields}
          data={data}
          locale={locale}
          fieldLabel={fieldLabel}
          notice={notice}
          error={actionError}
          confirmApply={confirmApply}
          canUndo={canUndo}
          loading={loadingAction}
          text={text}
          onBack={() => setView('chat')}
          onConfirmRequest={() => setConfirmApply(true)}
          onCancelConfirm={() => setConfirmApply(false)}
          onApply={applyResult}
          onSave={saveResult}
          onUndo={() => {
            onUndo();
            setNotice(locale === 'ar' ? 'تمت استعادة النسخة السابقة.' : 'The previous version was restored.');
          }}
          onDiscard={discardResult}
          onSaveCover={() => void saveCoverLetter()}
          onNavigateSection={onNavigateSection}
        />
      ) : (
        <div className="load-chat-empty-review">
          <FileCheck2 />
          <h2>{locale === 'ar' ? 'لا توجد نتيجة بعد' : 'No result yet'}</h2>
          <p>
            {locale === 'ar'
              ? 'نفذ إحدى الأدوات من المساعد لتظهر المراجعة هنا.'
              : 'Run an assistant action to see its review here.'}
          </p>
          <Button onClick={() => setView('chat')}>{text.backToChat}</Button>
        </div>
      )}
    </section>
  );
}

function ChatMessage({ message, locale }: { message: UIMessage; locale: 'ar' | 'en' }) {
  const text = message.parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('');
  if (!text) return null;
  return (
    <article className={`load-chat-message message-${message.role}`}>
      <div>{message.role === 'assistant' ? <Sparkles /> : <span>{locale === 'ar' ? 'أنت' : 'You'}</span>}</div>
      <p>{text}</p>
    </article>
  );
}

function ActionSetup({
  operation,
  name,
  cost,
  needsJob,
  jobDescription,
  onJobDescriptionChange,
  onRun,
  onCancel,
  loading,
  text,
}: {
  operation: Operation;
  name: string;
  cost: number;
  needsJob: boolean;
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onRun: () => void;
  onCancel: () => void;
  loading: boolean;
  text: (typeof copy)['ar'];
}) {
  const Icon = actionIcons[operation];
  return (
    <section className="load-chat-action-setup">
      <header>
        <span>
          <Icon />
        </span>
        <div>
          <strong>{name}</strong>
          <small>
            {cost} {cost === 1 ? text.point : text.points}
          </small>
        </div>
        <button type="button" onClick={onCancel} aria-label={text.cancel}>
          <X />
        </button>
      </header>
      {needsJob && (
        <label>
          <strong>{text.jobTitle}</strong>
          <span>{text.jobHint}</span>
          <textarea
            value={jobDescription}
            onChange={(event) => onJobDescriptionChange(event.target.value)}
            placeholder={text.jobPlaceholder}
          />
        </label>
      )}
      <Button onClick={onRun} disabled={loading || (needsJob && !jobDescription.trim())}>
        {loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {text.run}
      </Button>
    </section>
  );
}

function ReviewView({
  result,
  operation,
  changedFields,
  data,
  locale,
  fieldLabel,
  notice,
  error,
  confirmApply,
  canUndo,
  loading,
  text,
  onBack,
  onConfirmRequest,
  onCancelConfirm,
  onApply,
  onSave,
  onUndo,
  onDiscard,
  onSaveCover,
  onNavigateSection,
}: {
  result: AiResult;
  operation: Operation;
  changedFields: Array<keyof ResumeData>;
  data: ResumeData;
  locale: 'ar' | 'en';
  fieldLabel: (key: keyof ResumeData) => string;
  notice: string;
  error: string;
  confirmApply: boolean;
  canUndo: boolean;
  loading: boolean;
  text: (typeof copy)['ar'];
  onBack: () => void;
  onConfirmRequest: () => void;
  onCancelConfirm: () => void;
  onApply: () => void;
  onSave: () => void;
  onUndo: () => void;
  onDiscard: () => void;
  onSaveCover: () => void;
  onNavigateSection?: (section: keyof ResumeData) => void;
}) {
  const service = fallbackServices.find((item) => item.operation_key === operation);
  return (
    <div className="load-review-shell">
      <div className="load-review-heading">
        <button type="button" onClick={onBack}>
          {locale === 'ar' ? <ChevronRight /> : <ChevronLeft />} {text.backToChat}
        </button>
        <span>
          <Check /> {text.completed}
        </span>
        <h2>{result.review?.headline || service?.[locale === 'ar' ? 'name_ar' : 'name_en'] || result.message}</h2>
        <p>{result.message}</p>
      </div>

      {result.review && (
        <section className="load-review-scoreboard">
          <div className="load-review-score">
            <b>{result.review.overallScore}</b>
            <span>{text.score}</span>
          </div>
          {result.review.dimensions.map((dimension) => (
            <div key={dimension.key} className={`status-${dimension.status}`}>
              <strong>
                {dimension.key === 'structure'
                  ? locale === 'ar'
                    ? 'الهيكل والتنظيم'
                    : 'Structure'
                  : dimension.key === 'clarity'
                    ? locale === 'ar'
                      ? 'المحتوى والوضوح'
                      : 'Clarity'
                    : locale === 'ar'
                      ? 'التموضع المهني'
                      : 'Role fit'}
              </strong>
              <b>{dimension.score}%</b>
              <p>{dimension.summary}</p>
            </div>
          ))}
        </section>
      )}

      {result.analysis && (
        <div className="load-review-analysis">
          <div className="load-review-score">
            <b>{result.analysis.score}</b>
            <span>{text.score}</span>
          </div>
          <ResultList title={text.strengths} items={result.analysis.strengths} />
          <ResultList title={text.improvements} items={result.analysis.improvements} />
          <ResultList title={text.missingKeywords} items={result.analysis.missingKeywords} />
          <ResultList title={text.atsIssues} items={result.analysis.atsIssues} />
        </div>
      )}

      {result.review?.sections?.length ? (
        <section className="load-review-sections">
          <h3>{text.affectedSections}</h3>
          {result.review.sections.map((section) => (
            <details key={section.key} open={section.score < 75}>
              <summary>
                <span>{fieldLabel(section.key)}</span>
                <b>{section.score}%</b>
                <ChevronLeft />
              </summary>
              <div>
                <p>{section.summary}</p>
                <ResultList title={text.strengths} items={section.strengths} />
                <ResultList title={text.improvements} items={section.improvements} />
                {onNavigateSection && (
                  <button type="button" onClick={() => onNavigateSection(section.key)}>
                    {locale === 'ar' ? 'فتح القسم في المحرر' : 'Open section in editor'}
                  </button>
                )}
              </div>
            </details>
          ))}
        </section>
      ) : null}

      <section className="load-review-diff">
        <h3>{text.changes}</h3>
        {changedFields.length ? (
          changedFields.map((key) => (
            <article key={key}>
              <header>
                <strong>{fieldLabel(key)}</strong>
                <span>{locale === 'ar' ? 'سيتم تحديثه' : 'Will be updated'}</span>
              </header>
              <div>
                <section>
                  <b>
                    <ArrowDown /> {text.before}
                  </b>
                  <p>{data[key] || text.empty}</p>
                </section>
                <section>
                  <b>
                    <ArrowUp /> {text.after}
                  </b>
                  <p>{result.resume?.[key]}</p>
                </section>
              </div>
            </article>
          ))
        ) : (
          <div className="load-review-no-changes">
            <ListChecks />
            <span>{text.noChanges}</span>
          </div>
        )}
      </section>

      {result.coverLetter && (
        <section className="load-review-cover">
          <header>
            <LetterText />
            <strong>{locale === 'ar' ? 'خطاب التغطية' : 'Cover letter'}</strong>
          </header>
          <div>{result.coverLetter}</div>
          <Button variant="outline" onClick={onSaveCover} disabled={loading}>
            <Save /> {text.coverSave}
          </Button>
        </section>
      )}

      {confirmApply && (
        <div className="load-review-confirm" role="alertdialog" aria-modal="true">
          <div>
            <Sparkles />
          </div>
          <section>
            <strong>{text.confirmTitle}</strong>
            <p>{text.confirmBody}</p>
          </section>
          <Button onClick={onApply}>
            <Check /> {text.confirm}
          </Button>
          <Button variant="ghost" onClick={onCancelConfirm}>
            {text.cancel}
          </Button>
        </div>
      )}
      {notice && (
        <div className="load-review-notice" role="status">
          <Check /> {notice}
        </div>
      )}
      {error && (
        <div className="load-chat-error" role="alert">
          {error}
        </div>
      )}

      <footer className="load-review-actions">
        <Button onClick={onConfirmRequest} disabled={!changedFields.length}>
          <WandSparkles /> {text.apply}
        </Button>
        <Button variant="outline" onClick={onSave}>
          <Save /> {text.saveReport}
        </Button>
        <Button variant="outline" onClick={onUndo} disabled={!canUndo}>
          <RotateCcw /> {text.undo}
        </Button>
        <Button variant="ghost" onClick={onDiscard}>
          <Trash2 /> {text.discard}
        </Button>
      </footer>
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="load-review-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
