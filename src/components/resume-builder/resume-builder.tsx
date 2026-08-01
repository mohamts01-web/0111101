'use client';

import {
  Award,
  ArrowLeft,
  ArrowRight,
  Bold,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  GripVertical,
  HeartHandshake,
  Italic,
  LayoutGrid,
  Languages as LanguagesIcon,
  Link2,
  List,
  ListOrdered,
  ListRestart,
  Mail,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  UserRound,
  WandSparkles,
  Wrench,
  X,
} from 'lucide-react';
import { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResumeDocument } from '@/components/resume-builder/resume-document';
import { ResumeAiWorkspace, type AiWorkspaceTool } from '@/components/resume-builder/resume-ai-workspace';
import { GuidedResumeWizard, type GuidedResumeDraft } from '@/components/resume-builder/guided-resume-wizard';
import { ResumeStartDialog } from '@/components/resume-builder/resume-start-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';
import { resumeBuilderCopy } from '@/components/resume-builder/resume-builder-copy';
import { BrandMark } from '@/components/brand/brand-mark';
import { CV_PRODUCT_NAME } from '@/lib/brand';
import { ResumeDownloadPaywall } from '@/components/billing/resume-download-paywall';
import './resume-builder.css';

export type ResumeData = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  link: string;
  highlights: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  projects: string;
  certificates: string;
  achievements: string;
  volunteer: string;
  languages: string;
};

export type ResumeTemplate = 'compact' | 'centered' | 'minimal' | 'graduate' | 'executive';
export type ResumeLanguage = 'ar' | 'en';
export type ResumePageMode = 'one' | 'two';
export type ResumeStyle = { accentColor: string; fontFamily: string; fontSize: number };
export type ResumeSectionKey =
  | 'personal'
  | 'summary'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'experience'
  | 'education'
  | 'certificates'
  | 'achievements'
  | 'volunteer';

const defaultStyle: ResumeStyle = { accentColor: '#173b68', fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 9.2 };
const resumeColors = ['#173b68', '#087a4d', '#7a2538', '#4b5563', '#7c4f16', '#111827'];
const resumeFonts = [
  ['Tahoma', 'Tahoma, Arial, sans-serif'],
  ['Arial', 'Arial, sans-serif'],
  ['Georgia', 'Georgia, serif'],
  ['Times', '"Times New Roman", serif'],
] as const;

const editorUi = {
  ar: {
    edit: 'تحرير',
    customize: 'تخصيص',
    preview: 'معاينة',
    score: 'درجة سيرتك الذاتية',
    improveScore: 'أكمل هذا القسم لرفع الدرجة',
    sectionProgress: 'تقدم بناء السيرة',
    helpWriting: 'مساعدة في الكتابة',
    addAnother: 'إضافة عنصر آخر',
    characterTip: 'نصيحة: استخدم نتائج واضحة وأرقامًا لزيادة فرص المقابلة',
    formatBold: 'خط عريض',
    formatItalic: 'خط مائل',
    formatUnderline: 'تسطير',
    formatStrike: 'يتوسطه خط',
    formatBullets: 'قائمة نقطية',
    formatNumbers: 'قائمة رقمية',
    formatLink: 'إضافة رابط',
    templatesTitle: 'اختر قالب السيرة',
    templatesHint: 'غيّر القالب دون فقدان أي محتوى.',
    appearanceTitle: 'المظهر والخط',
    colorTitle: 'اللون الرئيسي',
    fontTitle: 'نوع الخط',
    fontSizeTitle: 'حجم الخط',
    pagesTitle: 'عدد الصفحات',
    languageTitle: 'لغة السيرة الذاتية',
    page: 'صفحة',
    saved: 'تم الحفظ',
    saving: 'جارٍ الحفظ',
    unsaved: 'تغييرات غير محفوظة',
  },
  en: {
    edit: 'Edit',
    customize: 'Customize',
    preview: 'Preview',
    score: 'Your resume score',
    improveScore: 'Complete this section to improve your score',
    sectionProgress: 'Resume progress',
    helpWriting: 'Get help with writing',
    addAnother: 'Add another entry',
    characterTip: 'Tip: use clear outcomes and numbers to improve interview chances',
    formatBold: 'Bold',
    formatItalic: 'Italic',
    formatUnderline: 'Underline',
    formatStrike: 'Strikethrough',
    formatBullets: 'Bulleted list',
    formatNumbers: 'Numbered list',
    formatLink: 'Add link',
    templatesTitle: 'Choose a resume template',
    templatesHint: 'Switch templates without losing any content.',
    appearanceTitle: 'Appearance and typography',
    colorTitle: 'Accent color',
    fontTitle: 'Font family',
    fontSizeTitle: 'Font size',
    pagesTitle: 'Page count',
    languageTitle: 'Resume language',
    page: 'Page',
    saved: 'Saved',
    saving: 'Saving',
    unsaved: 'Unsaved changes',
  },
} as const;

const empty: ResumeData = {
  name: '',
  headline: '',
  email: '',
  phone: '',
  city: '',
  link: '',
  highlights: '',
  summary: '',
  experience: '',
  education: '',
  skills: '',
  projects: '',
  certificates: '',
  achievements: '',
  volunteer: '',
  languages: '',
};

function normalizeResumeData(data?: Partial<ResumeData> | null): ResumeData {
  return Object.fromEntries(
    (Object.keys(empty) as Array<keyof ResumeData>).map((key) => [
      key,
      typeof data?.[key] === 'string' ? data[key] : empty[key],
    ]),
  ) as ResumeData;
}

function resumeText(data: Partial<ResumeData>, key: keyof ResumeData) {
  return typeof data[key] === 'string' ? data[key] : '';
}

const demoAr: ResumeData = {
  name: 'محمد أحمد',
  headline: 'مدير منتجات رقمية',
  email: 'mohammed@example.com',
  phone: '0500000000',
  city: 'الرياض، السعودية',
  link: 'linkedin.com/in/mohammed',
  highlights: 'خبرة 7 سنوات · منتجات تقنية · قيادة فرق',
  summary:
    'مدير منتجات يركز على تحويل احتياجات العملاء إلى تجارب رقمية قابلة للقياس، مع خبرة في قيادة فرق متعددة التخصصات.',
  experience:
    'مدير منتجات — شركة تقنية — 2021 إلى الآن\nأطلقت منتجين رقميين وساهمت في رفع معدل الاحتفاظ بالعملاء بنسبة 24%.',
  education: 'بكالوريوس نظم المعلومات — جامعة الملك سعود — 2018',
  skills: 'استراتيجية المنتجات، تحليل البيانات، Agile، أبحاث المستخدم، قيادة الفرق',
  projects: 'منصة خدمة العملاء — قيادة الاكتشاف والتسليم — خفض زمن الاستجابة 35%',
  certificates: 'Product Management Professional — 2023',
  achievements: 'جائزة أفضل منتج رقمي داخلي — 2024',
  volunteer: 'مرشد مهني في مبادرة تطوير الخريجين',
  languages: 'العربية — اللغة الأم\nالإنجليزية — متقدم',
};

const demoEn: ResumeData = {
  name: 'Mohammed Ahmed',
  headline: 'Digital Product Manager',
  email: 'mohammed@example.com',
  phone: '+966 50 000 0000',
  city: 'Riyadh, Saudi Arabia',
  link: 'linkedin.com/in/mohammed',
  highlights: '7 years of experience · Technology products · Team leadership',
  summary:
    'Product manager focused on turning customer needs into measurable digital experiences, with experience leading cross-functional teams.',
  experience:
    'Product Manager — Technology Company — 2021 to Present\nLaunched two digital products and increased customer retention by 24%.',
  education: 'BSc Information Systems — King Saud University — 2018',
  skills: 'Product strategy, data analysis, Agile, user research, team leadership',
  projects: 'Customer Service Platform — Discovery and delivery lead — Reduced response time by 35%',
  certificates: 'Product Management Professional — 2023',
  achievements: 'Best Internal Digital Product Award — 2024',
  volunteer: 'Career mentor in a graduate development initiative',
  languages: 'Arabic — Native\nEnglish — Advanced',
};

const sectionDefinitions: Array<{ key: ResumeSectionKey; icon: ReactNode }> = [
  { key: 'personal', icon: <UserRound /> },
  { key: 'summary', icon: <FileText /> },
  { key: 'skills', icon: <Wrench /> },
  { key: 'projects', icon: <LayoutGrid /> },
  { key: 'experience', icon: <BriefcaseBusiness /> },
  { key: 'education', icon: <GraduationCap /> },
  { key: 'certificates', icon: <Award /> },
  { key: 'achievements', icon: <Sparkles /> },
  { key: 'volunteer', icon: <HeartHandshake /> },
  { key: 'languages', icon: <LanguagesIcon /> },
];

export const defaultSectionOrder = sectionDefinitions.map((section) => section.key);

const completionWeights: Record<keyof ResumeData, { weight: number; target: number }> = {
  name: { weight: 8, target: 3 },
  headline: { weight: 7, target: 5 },
  email: { weight: 5, target: 6 },
  phone: { weight: 3, target: 7 },
  city: { weight: 3, target: 3 },
  link: { weight: 2, target: 8 },
  highlights: { weight: 2, target: 18 },
  summary: { weight: 12, target: 90 },
  experience: { weight: 18, target: 140 },
  education: { weight: 8, target: 35 },
  skills: { weight: 12, target: 35 },
  projects: { weight: 5, target: 50 },
  certificates: { weight: 3, target: 20 },
  achievements: { weight: 4, target: 30 },
  volunteer: { weight: 4, target: 30 },
  languages: { weight: 4, target: 16 },
};

function calculateResumeScore(data: ResumeData) {
  return Math.round(
    (Object.keys(completionWeights) as Array<keyof ResumeData>).reduce((score, key) => {
      const { weight, target } = completionWeights[key];
      const value = typeof data[key] === 'string' ? data[key] : '';
      return score + weight * Math.min(1, value.trim().length / target);
    }, 0),
  );
}

function scoreColor(score: number) {
  const hue = score <= 50 ? 4 + (score / 50) * 42 : 46 + ((score - 50) / 50) * 92;
  return `hsl(${Math.round(hue)} 72% 42%)`;
}

const storageKey = (id: string) => `cv-platform-resume-${id}`;

export function ResumeBuilder({ resumeId = 'new', isGuest = false }: { resumeId?: string; isGuest?: boolean }) {
  const { locale, direction, setLocale } = useLocale();
  const text = resumeBuilderCopy[locale];
  const ui = editorUi[locale];
  const sectionCatalog = useMemo(
    () => new Map(sectionDefinitions.map((item, index) => [item.key, { ...item, title: text.sections[index] }])),
    [text.sections],
  );
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft;
  const PreviousIcon = locale === 'ar' ? ChevronRight : ChevronLeft;
  const NextIcon = locale === 'ar' ? ChevronLeft : ChevronRight;
  const id = useMemo(() => (resumeId === 'new' ? crypto.randomUUID() : resumeId), [resumeId]);
  const [entryMode, setEntryMode] = useState<'guided' | 'editor'>('editor');
  const [showStartDialog, setShowStartDialog] = useState(resumeId === 'new');
  const [showGuidedWizard, setShowGuidedWizard] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [data, setData] = useState<ResumeData>(empty);
  const [sectionOrder, setSectionOrder] = useState<ResumeSectionKey[]>(defaultSectionOrder);
  const [section, setSection] = useState(0);
  const [guidedFinished, setGuidedFinished] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showDownloadPaywall, setShowDownloadPaywall] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string>();
  const [watermarkRequired, setWatermarkRequired] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [template, setTemplate] = useState<ResumeTemplate>('compact');
  const [language, setLanguage] = useState<ResumeLanguage>(locale);
  const [pageMode, setPageMode] = useState<ResumePageMode>('one');
  const [resumeStyle, setResumeStyle] = useState<ResumeStyle>(defaultStyle);
  const [pageOverflow, setPageOverflow] = useState(false);
  const [zoom, setZoom] = useState(72);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'editor' | 'assistant'>('editor');
  const [assistantTool, setAssistantTool] = useState<AiWorkspaceTool>('writer');
  const [assistantSection, setAssistantSection] = useState<keyof ResumeData>('summary');
  const [editorView, setEditorView] = useState<'edit' | 'customize'>('edit');
  const [responsivePane, setResponsivePane] = useState<'work' | 'preview'>('work');
  const [previewPage, setPreviewPage] = useState(1);
  const [collapsedSections, setCollapsedSections] = useState<Set<keyof ResumeData>>(new Set());
  const [history, setHistory] = useState<ResumeData[]>([]);
  const [aiReviewAvailable, setAiReviewAvailable] = useState(false);
  const printRootRef = useRef<HTMLDivElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const fieldRefs = useRef<Partial<Record<keyof ResumeData, HTMLTextAreaElement | null>>>({});
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const changeVersionRef = useRef(0);
  const saveCallbackRef = useRef<() => Promise<void>>(async () => {});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (isGuest) return;
    try {
      setAiReviewAvailable(Boolean(localStorage.getItem(`load-ai-result-${id}-${language}`)));
    } catch {
      setAiReviewAvailable(false);
    }
  }, [id, isGuest, language]);

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    void fetch('/api/credits')
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          entitlement?: { plan?: string };
          userEmail?: string;
        };
        if (cancelled) return;
        setAccountEmail(payload.userEmail);
        setWatermarkRequired(payload.entitlement?.plan === 'free');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isGuest]);
  const sections = useMemo(
    () =>
      sectionOrder.map((key) => sectionCatalog.get(key)).filter(Boolean) as Array<{
        key: ResumeSectionKey;
        icon: ReactNode;
        title: string;
      }>,
    [sectionCatalog, sectionOrder],
  );

  useEffect(() => {
    let canceled = false;
    let readyTimer = 0;
    async function hydrate() {
      let parsed: {
        data?: Partial<ResumeData>;
        template?: ResumeTemplate;
        language?: ResumeLanguage;
        pageMode?: ResumePageMode;
        style?: ResumeStyle;
        sectionOrder?: ResumeSectionKey[];
      } = {};
      const raw = localStorage.getItem(storageKey(id));
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          /* Ignore malformed local drafts. */
        }
      }
      if (!isGuest && resumeId !== 'new') {
        try {
          const response = await fetch(`/api/resumes/${resumeId}`);
          if (response.ok) {
            const payload = (await response.json()) as {
              resume?: {
                content?: Partial<ResumeData>;
                language?: ResumeLanguage;
                template?: ResumeTemplate;
                page_mode?: ResumePageMode;
                settings?: ResumeStyle;
              };
            };
            if (payload.resume)
              parsed = {
                data: payload.resume.content,
                language: payload.resume.language,
                template: payload.resume.template,
                pageMode: payload.resume.page_mode,
                style: payload.resume.settings,
                sectionOrder: (payload.resume.settings as ResumeStyle & { sectionOrder?: ResumeSectionKey[] })
                  ?.sectionOrder,
              };
          }
        } catch {
          /* Keep the local copy while offline. */
        }
      }
      if (canceled) return;
      if (parsed.data) setData(normalizeResumeData(parsed.data));
      if (parsed.template) setTemplate(parsed.template);
      if (parsed.language) setLanguage(parsed.language);
      if (parsed.pageMode) setPageMode(parsed.pageMode);
      if (parsed.style) setResumeStyle(parsed.style);
      if (
        parsed.sectionOrder?.length === defaultSectionOrder.length &&
        parsed.sectionOrder.every((key) => defaultSectionOrder.includes(key))
      )
        setSectionOrder(parsed.sectionOrder);
      readyTimer = window.setTimeout(() => {
        hydratedRef.current = true;
        dirtyRef.current = false;
        setSaved(Boolean(parsed.data));
        setSaveStatus(parsed.data ? 'saved' : 'idle');
      }, 0);
    }
    void hydrate();
    return () => {
      canceled = true;
      window.clearTimeout(readyTimer);
    };
  }, [id, isGuest, resumeId]);

  useEffect(() => {
    const root = printRootRef.current;
    if (!root) return;
    const check = () =>
      setPageOverflow(
        Array.from(root.querySelectorAll<HTMLElement>('.cv-paper')).some((page) => page.offsetHeight > 1124),
      );
    const observer = new ResizeObserver(check);
    root.querySelectorAll('.cv-paper').forEach((page) => observer.observe(page));
    check();
    return () => observer.disconnect();
  }, [data, pageMode, resumeStyle, template]);

  const completion = calculateResumeScore(data);
  const completionColor = scoreColor(completion);
  const sectionFieldGroups = useMemo<Array<Array<keyof ResumeData>>>(
    () =>
      sections.map((item) =>
        item.key === 'personal' ? ['name', 'headline', 'email', 'phone', 'city', 'link', 'highlights'] : [item.key],
      ),
    [sections],
  );
  const incompleteSection = sectionFieldGroups.findIndex((fields) =>
    fields.some((key) => !resumeText(data, key).trim()),
  );
  const suggestedSection = incompleteSection === -1 ? section : incompleteSection;
  const suggestedBoost =
    incompleteSection === -1
      ? 0
      : Math.max(
          3,
          Math.round(
            (sectionFieldGroups[suggestedSection].filter((key) => !resumeText(data, key).trim()).length /
              Object.keys(data).length) *
              100,
          ),
        );
  const appliedZoom =
    viewportWidth !== null && viewportWidth < 1100
      ? Math.min(zoom, Math.max(30, ((viewportWidth - 32) / 793.7) * 100))
      : zoom;

  useEffect(() => {
    if (!hydratedRef.current) return;
    changeVersionRef.current += 1;
    dirtyRef.current = true;
    setSaved(false);
    setSaveStatus('dirty');
  }, [data, language, pageMode, resumeStyle, sectionOrder, template]);

  function reorderSections(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const contentOrder = sectionOrder.filter((key) => key !== 'personal') as ResumeSectionKey[];
    const from = contentOrder.indexOf(active.id as ResumeSectionKey);
    const to = contentOrder.indexOf(over.id as ResumeSectionKey);
    if (from < 0 || to < 0) return;
    const activeSectionKey = sections[section]?.key ?? 'personal';
    const next = ['personal', ...arrayMove(contentOrder, from, to)] as ResumeSectionKey[];
    setSectionOrder(next);
    setSection(Math.max(0, next.indexOf(activeSectionKey)));
  }

  function resetSectionOrder() {
    const activeSectionKey = sections[section]?.key ?? 'personal';
    setSectionOrder(defaultSectionOrder);
    setSection(Math.max(0, defaultSectionOrder.indexOf(activeSectionKey)));
  }

  function update(field: keyof ResumeData, value: string) {
    setData((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function applyGeneratedResume(next: ResumeData) {
    setData(normalizeResumeData(next));
    setEntryMode('editor');
    setShowStartDialog(false);
    setShowGuidedWizard(false);
    setImportStatus('');
    setSaved(false);
  }

  async function importPdf(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setImportStatus(locale === 'ar' ? 'يرجى اختيار ملف PDF فقط.' : 'Please choose a PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportStatus(locale === 'ar' ? 'حجم الملف يتجاوز 10MB.' : 'The file is larger than 10MB.');
      return;
    }

    setShowStartDialog(false);
    setImportStatus(locale === 'ar' ? 'جارٍ استخراج محتوى السيرة...' : 'Extracting resume content...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const extractResponse = await fetch('/api/resumes/import-pdf', { method: 'POST', body: formData });
      const extracted = (await extractResponse.json()) as { text?: string; error?: string };
      if (!extractResponse.ok || !extracted.text?.trim())
        throw new Error(
          extracted.error ||
            (locale === 'ar' ? 'لم يتم العثور على نص قابل للاستخراج.' : 'No extractable text was found.'),
        );

      setImportStatus(locale === 'ar' ? 'جارٍ تنظيم البيانات بالذكاء الاصطناعي...' : 'Organizing your data with AI...');
      const guidedData: GuidedResumeDraft = {
        linkedinUrl: '',
        jobs: [],
        desiredTitle: '',
        education: [],
        skills: [],
        highlights: '',
        goals: '',
        importedText: extracted.text,
      };
      const aiResponse = await fetch('/api/ai/resume/guided', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'guided_resume', source: 'pdf_import', language, resume: data, guidedData }),
      });
      const result = (await aiResponse.json()) as { result?: { resume?: ResumeData | null }; error?: string };
      if (!aiResponse.ok || !result.result?.resume)
        throw new Error(result.error || (locale === 'ar' ? 'تعذر تنظيم السيرة.' : 'Could not organize the resume.'));
      applyGeneratedResume(result.result.resume);
    } catch (error) {
      setImportStatus(
        error instanceof Error
          ? error.message
          : locale === 'ar'
            ? 'تعذر استيراد السيرة.'
            : 'Could not import the resume.',
      );
      window.setTimeout(() => setImportStatus(''), 5000);
    }
  }

  function formatText(
    field: keyof ResumeData,
    format: 'bold' | 'italic' | 'underline' | 'strike' | 'bullets' | 'numbers' | 'link',
  ) {
    const textarea = fieldRefs.current[field];
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = resumeText(data, field);
    let rangeStart = start;
    let rangeEnd = end;
    let selected = value.slice(start, end);
    if (!selected && value.trim()) {
      rangeStart = 0;
      rangeEnd = value.length;
      selected = value;
    }
    const fallback = locale === 'ar' ? 'نص' : 'text';
    let replacement = selected || fallback;

    if (format === 'bold') replacement = `**${replacement}**`;
    if (format === 'italic') replacement = `*${replacement}*`;
    if (format === 'underline') replacement = `__${replacement}__`;
    if (format === 'strike') replacement = `~~${replacement}~~`;
    if (format === 'link') replacement = `[${replacement}](https://)`;
    if (format === 'bullets')
      replacement = replacement
        .split('\n')
        .map((line) => `• ${line.replace(/^[-•]\s*/, '')}`)
        .join('\n');
    if (format === 'numbers')
      replacement = replacement
        .split('\n')
        .map((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s*/, '')}`)
        .join('\n');

    const nextValue = `${value.slice(0, rangeStart)}${replacement}${value.slice(rangeEnd)}`;
    update(field, nextValue);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(rangeStart, rangeStart + replacement.length);
    });
  }

  function toggleSection(field: keyof ResumeData) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  function addResumeEntry(field: keyof ResumeData) {
    const currentValue = resumeText(data, field);
    const separator = currentValue.trim() ? '\n\n' : '';
    update(field, `${currentValue}${separator}`);
    window.requestAnimationFrame(() => fieldRefs.current[field]?.focus());
  }

  function openWritingAssistant(field: keyof ResumeData = 'summary', tool: AiWorkspaceTool = 'writer') {
    setAssistantSection(field);
    setAssistantTool(tool);
    setWorkspaceMode('assistant');
    setResponsivePane('work');
  }

  function navigateFromAssistant(field: keyof ResumeData) {
    const target = sectionFieldGroups.findIndex((fields) => fields.includes(field));
    if (target >= 0) setSection(target);
    setWorkspaceMode('editor');
    setEditorView('edit');
    setResponsivePane('work');
  }

  function goToPreviewPage(page: number) {
    const totalPages = pageMode === 'two' ? 2 : 1;
    const nextPage = Math.min(totalPages, Math.max(1, page));
    setPreviewPage(nextPage);
    const stage = previewStageRef.current;
    const target = stage?.querySelectorAll<HTMLElement>('.cv-paper')[nextPage - 1];
    if (stage && target) {
      stage.scrollTo({ top: Math.max(0, target.offsetTop - 24), behavior: 'smooth' });
    }
  }

  useEffect(() => {
    setPreviewPage(1);
  }, [pageMode]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    formRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [editorView, section, workspaceMode]);

  const persistLocal = useCallback(() => {
    const drafts = JSON.parse(localStorage.getItem('cv-platform-resumes') ?? '[]') as Array<Record<string, unknown>>;
    const savedAt = new Date().toISOString();
    const draft = {
      id,
      title: data.name || text.untitledResume,
      template: `${text.templatePrefix} ${template}`,
      updatedAt: savedAt,
      completion,
    };
    localStorage.setItem(
      storageKey(id),
      JSON.stringify({ data, template, language, pageMode, style: resumeStyle, sectionOrder }),
    );
    localStorage.setItem('cv-platform-resumes', JSON.stringify([draft, ...drafts.filter((item) => item.id !== id)]));
    return savedAt;
  }, [
    completion,
    data,
    id,
    language,
    pageMode,
    resumeStyle,
    sectionOrder,
    template,
    text.templatePrefix,
    text.untitledResume,
  ]);

  const save = useCallback(async () => {
    if (saveInFlightRef.current || !dirtyRef.current) return;
    saveInFlightRef.current = true;
    const savingVersion = changeVersionRef.current;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const savedAt = persistLocal();
      if (!isGuest) {
        const response = await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            title: data.name || text.untitledResume,
            language,
            template,
            pageMode,
            content: data,
            settings: { ...resumeStyle, sectionOrder },
          }),
        });
        if (!response.ok) throw new Error('CLOUD_SAVE_FAILED');
      }
      if (savingVersion === changeVersionRef.current) {
        dirtyRef.current = false;
        setSaved(true);
        setSaveStatus('saved');
      }
      setLastSavedAt(new Date(savedAt));
    } catch {
      dirtyRef.current = true;
      setSaved(false);
      setSaveStatus('error');
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [data, id, isGuest, language, pageMode, persistLocal, resumeStyle, sectionOrder, template, text.untitledResume]);

  saveCallbackRef.current = save;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirtyRef.current && !saveInFlightRef.current) void saveCallbackRef.current();
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const flushLocal = () => {
      if (dirtyRef.current) persistLocal();
    };
    window.addEventListener('pagehide', flushLocal);
    return () => {
      window.removeEventListener('pagehide', flushLocal);
      flushLocal();
    };
  }, [persistLocal]);

  function applyAiResume(resume: ResumeData) {
    setHistory((current) => [...current.slice(-19), data]);
    setData(normalizeResumeData(resume));
    setSaved(false);
  }

  function undoAiChange() {
    const previous = history.at(-1);
    if (!previous) return;
    setData(previous);
    setHistory((current) => current.slice(0, -1));
    setSaved(false);
  }

  function printPdf() {
    const previousTitle = document.title;
    document.title = `${data.name || (language === 'ar' ? 'السيرة الذاتية' : 'Resume')}`;
    window.setTimeout(() => {
      window.print();
      document.title = previousTitle;
    }, 100);
  }

  async function authorizeExport(operation: 'download' | 'email') {
    const response = await fetch('/api/resume-exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId: id, operation, idempotencyKey: crypto.randomUUID() }),
    });
    const payload = (await response.json()) as {
      authorizationId?: string;
      watermarkRequired?: boolean;
      error?: string;
    };
    if (!response.ok || !payload.authorizationId) throw new Error(payload.error || text.emailSendFailed);
    setWatermarkRequired(Boolean(payload.watermarkRequired));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    return payload.authorizationId;
  }

  async function downloadPdf() {
    persistLocal();
    if (isGuest) {
      setShowDownloadPaywall(true);
      return;
    }
    try {
      setExporting(true);
      await authorizeExport('download');
      printPdf();
    } catch (error) {
      setEmailStatus(error instanceof Error ? error.message : text.emailSendFailed);
    } finally {
      setExporting(false);
    }
  }

  async function emailPdf() {
    const root = printRootRef.current;
    if (!root) return;
    setEmailing(true);
    setEmailStatus('');
    const previousTransform = root.style.transform;
    let authorizationId: string | undefined;
    root.style.transform = 'none';
    try {
      authorizationId = isGuest ? undefined : await authorizeExport('email');
      const { default: html2pdf } = await import('html2pdf.js');
      const blob = await html2pdf()
        .set({
          margin: 0,
          filename: `${data.name || 'resume'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.cv-section'] },
        })
        .from(root)
        .outputPdf('blob');
      const pdfBase64 = await blobToDataUrl(blob);
      const response = await fetch('/api/email/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: data.name || 'resume',
          pdfBase64,
          language,
          recipientEmail: deliveryEmail.trim() || undefined,
          authorizationId,
        }),
      });
      const payload = (await response.json()) as { error?: string; recipient?: string };
      if (!response.ok) throw new Error(payload.error || text.emailSendFailed);
      setEmailStatus(`${text.emailSentTo} ${payload.recipient}`);
      setShowEmailPanel(false);
    } catch (error) {
      if (authorizationId) {
        void fetch('/api/resume-exports', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorizationId }),
        });
      }
      setEmailStatus(error instanceof Error ? error.message : text.emailSendFailed);
    } finally {
      root.style.transform = previousTransform;
      setEmailing(false);
    }
  }

  const field = (label: string, key: keyof ResumeData, placeholder: string, wide = false) => (
    <label className={`resume-field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <Input
        value={resumeText(data, key)}
        placeholder={placeholder}
        onChange={(event) => update(key, event.target.value)}
      />
    </label>
  );
  const area = (label: string, key: keyof ResumeData, placeholder: string) => {
    const collapsed = collapsedSections.has(key);
    const fieldId = `resume-field-${key}`;
    const formatButtons = [
      ['bold', Bold, ui.formatBold],
      ['italic', Italic, ui.formatItalic],
      ['underline', Underline, ui.formatUnderline],
      ['strike', Strikethrough, ui.formatStrike],
      ['bullets', List, ui.formatBullets],
      ['numbers', ListOrdered, ui.formatNumbers],
      ['link', Link2, ui.formatLink],
    ] as const;

    return (
      <div className="rich-resume-field wide">
        <div className="rich-field-card">
          <div className="rich-field-heading">
            <GripVertical aria-hidden="true" />
            <div>
              <strong>{label}</strong>
              <span>{resumeText(data, key).trim() ? resumeText(data, key).split('\n')[0] : text.fields[key][1]}</span>
            </div>
            <button type="button" onClick={() => toggleSection(key)} aria-label={collapsed ? text.next : text.previous}>
              {collapsed ? <ChevronDown /> : <ChevronUp />}
            </button>
          </div>
          {!collapsed && (
            <div className="rich-field-editor">
              <div className="rich-text-toolbar" role="toolbar" aria-label={label}>
                <div>
                  {formatButtons.map(([format, Icon, title]) => (
                    <button
                      key={format}
                      type="button"
                      title={title}
                      aria-label={title}
                      onClick={() => formatText(key, format)}
                    >
                      <Icon />
                    </button>
                  ))}
                </div>
                {!isGuest && (
                  <button type="button" className="writing-help-button" onClick={() => openWritingAssistant(key)}>
                    <WandSparkles />
                    <span>{locale === 'ar' ? 'اسأل المساعد LOAD' : 'ASK AI LOAD'}</span>
                  </button>
                )}
              </div>
              <label className="sr-only" htmlFor={fieldId}>
                {label}
              </label>
              <textarea
                id={fieldId}
                ref={(element) => {
                  fieldRefs.current[key] = element;
                }}
                value={data[key]}
                placeholder={placeholder}
                onChange={(event) => update(key, event.target.value)}
              />
              <div className="rich-field-meta">
                <span>{ui.characterTip}</span>
                <b>{data[key].length}</b>
              </div>
            </div>
          )}
        </div>
        {key !== 'summary' && (
          <button type="button" className="add-resume-entry" onClick={() => addResumeEntry(key)}>
            <Plus /> {ui.addAnother}
          </button>
        )}
      </div>
    );
  };

  const renderSectionFields = (key: ResumeSectionKey) => (
    <div className="builder-fields">
      {key === 'personal' && (
        <>
          {field(text.fields.headline[0], 'headline', text.fields.headline[1], true)}
          {field(text.fields.name[0], 'name', text.fields.name[1], true)}
          {field(text.fields.email[0], 'email', text.fields.email[1])}
          {field(text.fields.phone[0], 'phone', text.fields.phone[1])}
          {field(text.fields.link[0], 'link', text.fields.link[1])}
          {field(text.fields.city[0], 'city', text.fields.city[1])}
          {field(text.fields.highlights[0], 'highlights', text.fields.highlights[1], true)}
        </>
      )}
      {key === 'summary' && area(text.fields.summary[0], 'summary', text.fields.summary[1])}
      {key === 'skills' && area(text.fields.skills[0], 'skills', text.fields.skills[1])}
      {key === 'projects' && area(text.fields.projects[0], 'projects', text.fields.projects[1])}
      {key === 'experience' && area(text.fields.experience[0], 'experience', text.fields.experience[1])}
      {key === 'education' && area(text.fields.education[0], 'education', text.fields.education[1])}
      {key === 'certificates' && area(text.fields.certificates[0], 'certificates', text.fields.certificates[1])}
      {key === 'achievements' && area(text.fields.achievements[0], 'achievements', text.fields.achievements[1])}
      {key === 'volunteer' && area(text.fields.volunteer[0], 'volunteer', text.fields.volunteer[1])}
      {key === 'languages' && (
        <LanguagesEditor
          value={data.languages}
          onChange={(value) => update('languages', value)}
          locale={locale}
          label={text.fields.languages[0]}
        />
      )}
    </div>
  );

  if (!entryMode)
    return (
      <main className="builder-entry" dir={direction}>
        <div className="builder-entry-toolbar">
          <Link href="/dashboard" className="builder-entry-back">
            <BackArrow />
            <span>{text.dashboard}</span>
          </Link>
          <div className="builder-entry-theme">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="builder-ui-language"
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            >
              <LanguagesIcon /> {locale === 'ar' ? 'English' : 'العربية'}
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <div className="builder-entry-heading">
          <Link href="/" className="builder-entry-brand" aria-label={CV_PRODUCT_NAME}>
            <BrandMark />
            <strong className="brand-wordmark">{CV_PRODUCT_NAME}</strong>
          </Link>
          <span>{text.entryEyebrow}</span>
          <h1>{text.entryTitle}</h1>
          <p>{text.entryLead}</p>
        </div>
        <div className="builder-entry-options">
          <button className="recommended" onClick={() => setEntryMode('guided')}>
            <span className="entry-badge">{text.recommended}</span>
            <div className="entry-icon">
              <UserRound />
            </div>
            <strong>{text.guidedTitle}</strong>
            <p>{text.guidedDescription}</p>
            <small>{text.guidedTime}</small>
          </button>
          <button onClick={() => setEntryMode('editor')}>
            <div className="entry-icon">
              <Wrench />
            </div>
            <strong>{text.editorTitle}</strong>
            <p>{text.editorDescription}</p>
            <small>{text.editorTime}</small>
          </button>
        </div>
        <p className="builder-entry-note">{isGuest ? text.guestEntryNote : text.memberEntryNote}</p>
      </main>
    );

  return (
    <div
      className={`builder-shell builder-light flow-${entryMode} ${entryMode === 'guided' && guidedFinished ? 'guided-complete' : ''}`}
      dir={direction}
    >
      <ResumeStartDialog
        open={showStartDialog}
        isGuest={isGuest}
        onManual={() => {
          setShowStartDialog(false);
          setEntryMode('editor');
        }}
        onGuided={() => {
          setShowStartDialog(false);
          setShowGuidedWizard(true);
        }}
        onUpload={(file) => void importPdf(file)}
        onRequireAuth={() => window.location.assign(`/login?next=${encodeURIComponent('/dashboard/resumes/new')}`)}
      />
      <GuidedResumeWizard
        open={showGuidedWizard}
        language={language}
        resume={data}
        onClose={() => setShowGuidedWizard(false)}
        onComplete={applyGeneratedResume}
      />
      {importStatus && (
        <div className="resume-import-status" role="status">
          <span>
            <Sparkles />
          </span>
          {importStatus}
        </div>
      )}
      <header className="builder-topbar">
        <div className="builder-brand">
          <Link href="/dashboard" className="builder-back" aria-label={text.dashboard}>
            <BackArrow />
            <span>{text.dashboard}</span>
          </Link>
          <BrandMark className="builder-brand-mark" />
          <div>
            <strong className="brand-wordmark">{text.platform}</strong>
            <small>{text.builder}</small>
          </div>
        </div>
        <div className="builder-pane-switch" role="tablist" aria-label={text.workspaceView}>
          <button
            role="tab"
            aria-label={ui.edit}
            aria-selected={workspaceMode === 'editor' && editorView === 'edit' && responsivePane === 'work'}
            className={workspaceMode === 'editor' && editorView === 'edit' && responsivePane === 'work' ? 'active' : ''}
            onClick={() => {
              setWorkspaceMode('editor');
              setEditorView('edit');
              setResponsivePane('work');
            }}
          >
            <FileText />
            <span>{ui.edit}</span>
          </button>
          <button
            role="tab"
            aria-label={ui.customize}
            aria-selected={workspaceMode === 'editor' && editorView === 'customize' && responsivePane === 'work'}
            className={
              workspaceMode === 'editor' && editorView === 'customize' && responsivePane === 'work' ? 'active' : ''
            }
            onClick={() => {
              setWorkspaceMode('editor');
              setEditorView('customize');
              setResponsivePane('work');
            }}
          >
            <Palette />
            <span>{ui.customize}</span>
          </button>
          <button
            role="tab"
            aria-label={ui.preview}
            aria-selected={responsivePane === 'preview'}
            className={`builder-preview-tab ${responsivePane === 'preview' ? 'active' : ''}`}
            onClick={() => setResponsivePane('preview')}
          >
            <Eye />
            <span>{ui.preview}</span>
          </button>
          {!isGuest && (
            <button
              role="tab"
              aria-label={locale === 'ar' ? 'اسأل المساعد LOAD' : 'ASK AI LOAD'}
              aria-selected={workspaceMode === 'assistant' && assistantTool === 'writer'}
              className={workspaceMode === 'assistant' && assistantTool === 'writer' ? 'active' : ''}
              onClick={() => {
                setAssistantTool('writer');
                setWorkspaceMode('assistant');
                setResponsivePane('work');
              }}
            >
              <WandSparkles />
              <span>{locale === 'ar' ? 'اسأل المساعد LOAD' : 'ASK AI LOAD'}</span>
            </button>
          )}
          {!isGuest && aiReviewAvailable && (
            <button
              role="tab"
              aria-label={locale === 'ar' ? 'مراجعة AI' : 'AI Review'}
              aria-selected={workspaceMode === 'assistant' && assistantTool === 'review'}
              className={workspaceMode === 'assistant' && assistantTool === 'review' ? 'active' : ''}
              onClick={() => openWritingAssistant(assistantSection, 'review')}
            >
              <FileCheck2 />
              <span>{locale === 'ar' ? 'مراجعة AI' : 'AI Review'}</span>
            </button>
          )}
        </div>
        <div className="builder-top-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="builder-ui-language"
            data-testid="builder-ui-language"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            title={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <LanguagesIcon /> <span>{locale === 'ar' ? 'English' : 'العربية'}</span>
          </Button>
          <ThemeToggle />
          {isGuest && (
            <a className="guest-signup" href="/signup">
              {text.signup}
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={save}
            disabled={saving}
            aria-label={text.saveResume}
            title={saveStatus === 'error' ? text.cloudSaveFailed : text.saveResume}
          >
            <Save />
            <span>
              {saving
                ? text.saving
                : saveStatus === 'error'
                  ? text.saveFailed
                  : saveStatus === 'dirty'
                    ? text.unsavedChanges
                    : saved && lastSavedAt
                      ? `${text.savedAt} ${lastSavedAt.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`
                      : isGuest
                        ? text.localSave
                        : text.save}
            </span>
          </Button>
          <div className="language-switch" aria-label={text.resumeLanguage}>
            <button className={language === 'ar' ? 'active' : ''} onClick={() => setLanguage('ar')}>
              {text.arabic}
            </button>
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
              English
            </button>
          </div>
          <Button
            size="sm"
            className="builder-download"
            onClick={downloadPdf}
            disabled={exporting}
            aria-label={text.downloadPdf}
            title={text.downloadPdf}
          >
            <Download />
            <span>{text.downloadPdf}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="builder-email"
            onClick={() => setShowEmailPanel((value) => !value)}
            aria-label={text.emailResume}
            title={text.emailResume}
          >
            <Mail />
            <span>{text.sendEmail}</span>
          </Button>
        </div>
        {emailStatus && (
          <div
            className="fixed left-4 top-[72px] z-20 max-w-[340px] rounded-md border border-primary/30 bg-card px-3 py-2 text-xs text-card-foreground shadow-lg"
            role="status"
          >
            {emailStatus}
          </div>
        )}
        {showEmailPanel && (
          <div className="builder-email-panel">
            <div>
              <strong>{text.receiveByEmail}</strong>
              <small>{isGuest ? text.guestEmailHint : text.memberEmailHint}</small>
            </div>
            <div className="builder-email-row">
              <Input
                type="email"
                dir="ltr"
                value={deliveryEmail}
                onChange={(event) => setDeliveryEmail(event.target.value)}
                placeholder={isGuest ? 'you@example.com' : text.alternateEmail}
              />
              <Button onClick={emailPdf} disabled={emailing || (isGuest && !deliveryEmail.trim())}>
                {emailing ? text.sending : text.sendCopy}
              </Button>
            </div>
          </div>
        )}
      </header>

      {showSectionManager && (
        <div className="section-order-backdrop" role="presentation" onMouseDown={() => setShowSectionManager(false)}>
          <section
            className="section-order-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="section-order-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <strong id="section-order-title">
                  {locale === 'ar' ? 'ترتيب أقسام السيرة' : 'Reorder resume sections'}
                </strong>
                <span>
                  {locale === 'ar'
                    ? 'اسحب الأقسام لترتيبها. تبقى البيانات الشخصية مثبتة في البداية.'
                    : 'Drag sections into place. Personal details stay pinned first.'}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
                onClick={() => setShowSectionManager(false)}
              >
                <X />
              </Button>
            </header>
            <DndContext
              id="resume-section-order-dialog"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={reorderSections}
            >
              <nav>
                {sections[0] && (
                  <div className="builder-step pinned">
                    <button type="button" onClick={() => setSection(0)}>
                      {sections[0].icon}
                      <b>{sections[0].title}</b>
                    </button>
                    <span>{text.pinned}</span>
                  </div>
                )}
                <SortableContext
                  items={sectionOrder.filter((key) => key !== 'personal')}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.slice(1).map((item, contentIndex) => (
                    <SortableSectionButton
                      key={item.key}
                      item={item}
                      active={contentIndex + 1 === section}
                      onSelect={() => setSection(contentIndex + 1)}
                      dragLabel={locale === 'ar' ? `نقل قسم ${item.title}` : `Move ${item.title}`}
                    />
                  ))}
                </SortableContext>
              </nav>
            </DndContext>
            <footer>
              <Button type="button" variant="outline" onClick={resetSectionOrder}>
                <ListRestart /> {text.resetOrder}
              </Button>
              <Button type="button" onClick={() => setShowSectionManager(false)}>
                <Check /> {locale === 'ar' ? 'تم' : 'Done'}
              </Button>
            </footer>
          </section>
        </div>
      )}

      <div className={`builder-layout responsive-pane-${responsivePane} workspace-mode-${workspaceMode}`}>
        <aside className="builder-sidebar">
          <div className="builder-sidebar-title">
            <div>
              <strong>{text.sectionsLabel}</strong>
              <small>{text.sectionsHint}</small>
            </div>
            <Button
              variant="ghost"
              size="icon"
              title={text.resetOrder}
              aria-label={text.resetOrder}
              onClick={resetSectionOrder}
            >
              <ListRestart />
            </Button>
          </div>
          <DndContext
            id="resume-section-order-sidebar"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={reorderSections}
          >
            <nav>
              {sections[0] && (
                <div className={`builder-step ${section === 0 ? 'active' : ''}`}>
                  <button type="button" onClick={() => setSection(0)}>
                    {sections[0].icon}
                    <b>{sections[0].title}</b>
                  </button>
                  <span>{text.pinned}</span>
                </div>
              )}
              <SortableContext
                items={sectionOrder.filter((key) => key !== 'personal')}
                strategy={verticalListSortingStrategy}
              >
                {sections.slice(1).map((item, contentIndex) => {
                  const index = contentIndex + 1;
                  return (
                    <SortableSectionButton
                      key={item.key}
                      item={item}
                      active={index === section}
                      onSelect={() => setSection(index)}
                      dragLabel={locale === 'ar' ? `نقل قسم ${item.title}` : `Move ${item.title}`}
                    />
                  );
                })}
              </SortableContext>
            </nav>
          </DndContext>
          <div className="builder-sidebar-status">
            <div>
              <strong>{text.atsReady}</strong>
              <span>{text.atsReadyHint}</span>
            </div>
            <div className="completion-row">
              <span>{text.completion}</span>
              <b style={{ color: completionColor }}>{completion}%</b>
            </div>
            <div className="completion-track">
              <span style={{ width: `${completion}%`, backgroundColor: completionColor }} />
            </div>
          </div>
        </aside>

        <main ref={formRef} className={`builder-form builder-form-mode-${workspaceMode}`}>
          {workspaceMode === 'editor' ? (
            editorView === 'edit' ? (
              <div className="workspace-editor workspace-edit-view">
                <div className="resume-score-strip" style={{ '--score-color': completionColor } as CSSProperties}>
                  <div className="resume-score-summary">
                    <b>{completion}%</b>
                    <span>{ui.score}</span>
                  </div>
                  <button type="button" onClick={() => setSection(suggestedSection)}>
                    {suggestedBoost > 0 && <b>+{suggestedBoost}%</b>}
                    <span>{suggestedBoost > 0 ? sections[suggestedSection].title : ui.sectionProgress}</span>
                  </button>
                  <div className="resume-score-track" aria-hidden="true">
                    <span style={{ width: `${completion}%` }} />
                  </div>
                </div>

                <div className="builder-quick-tools" role="toolbar" aria-label={text.moreTools}>
                  <button
                    type="button"
                    onClick={() => {
                      setData(language === 'ar' ? demoAr : demoEn);
                      setSaved(false);
                    }}
                    title={text.demoData}
                    aria-label={text.demoData}
                  >
                    <Sparkles />
                    <span>{text.demoData}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setData(empty);
                      setSaved(false);
                    }}
                    title={text.clearFields}
                    aria-label={text.clearFields}
                  >
                    <Trash2 />
                    <span>{text.clearFields}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!history.length}
                    onClick={undoAiChange}
                    title={text.undoAi}
                    aria-label={text.undoAi}
                  >
                    <RotateCcw />
                    <span>{text.undoAi}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSectionManager(true)}
                    title={locale === 'ar' ? 'ترتيب الأقسام' : 'Reorder sections'}
                    aria-label={locale === 'ar' ? 'ترتيب الأقسام' : 'Reorder sections'}
                  >
                    <ListOrdered />
                    <span>{locale === 'ar' ? 'ترتيب الأقسام' : 'Reorder sections'}</span>
                  </button>
                </div>

                {guidedFinished ? (
                  <div className="builder-all-sections">
                    <header>
                      <span>
                        <Check />
                      </span>
                      <div>
                        <h1>{locale === 'ar' ? 'راجع سيرتك كاملة' : 'Review your full resume'}</h1>
                        <p>
                          {locale === 'ar'
                            ? 'يمكنك الآن التعديل السريع على جميع الأقسام أو تغيير ترتيبها بالسحب من القائمة.'
                            : 'Quickly edit every section or drag items in the section list to reorder them.'}
                        </p>
                      </div>
                    </header>
                    {sections.map((item, index) => (
                      <section className="builder-all-section" key={item.key} id={`builder-section-${item.key}`}>
                        <div className="builder-all-section-heading">
                          <span>{item.icon}</span>
                          <div>
                            <small>{String(index + 1).padStart(2, '0')}</small>
                            <h2>{item.title}</h2>
                          </div>
                          {!isGuest && item.key !== 'personal' && (
                            <button type="button" onClick={() => openWritingAssistant(item.key as keyof ResumeData)}>
                              <WandSparkles /> {locale === 'ar' ? 'اسأل LOAD' : 'ASK LOAD'}
                            </button>
                          )}
                        </div>
                        {renderSectionFields(item.key)}
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="builder-editor-body">
                    <div className="builder-form-heading">
                      <span>
                        {String(section + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
                      </span>
                      <h1>{sections[section].title}</h1>
                      <p>{section === 0 ? text.personalSectionHint : text.sectionHint}</p>
                    </div>
                    {!isGuest && (
                      <button
                        type="button"
                        className="builder-notice"
                        onClick={() => openWritingAssistant(sectionFieldGroups[section][0])}
                      >
                        <Sparkles /> {text.aiNotice}
                      </button>
                    )}
                    {renderSectionFields(sections[section].key)}
                  </div>
                )}

                {!guidedFinished && (
                  <div className="builder-navigation">
                    <Button variant="outline" disabled={section === 0} onClick={() => setSection((value) => value - 1)}>
                      <PreviousIcon /> {text.previous}
                    </Button>
                    <div className="builder-step-dots" aria-label={ui.sectionProgress}>
                      {sections.map((item, index) => (
                        <button
                          key={item.title}
                          type="button"
                          className={index === section ? 'active' : ''}
                          onClick={() => setSection(index)}
                          aria-label={item.title}
                          aria-current={index === section ? 'step' : undefined}
                        />
                      ))}
                    </div>
                    <span className={`builder-save-state save-state-${saveStatus}`}>
                      {saving ? ui.saving : saveStatus === 'saved' ? ui.saved : ui.unsaved}
                    </span>
                    {section < sections.length - 1 ? (
                      <Button onClick={() => setSection((value) => value + 1)}>
                        {text.next}: {sections[section + 1].title} <NextIcon />
                      </Button>
                    ) : (
                      <Button
                        onClick={async () => {
                          await save();
                          setGuidedFinished(true);
                        }}
                      >
                        <Check /> {text.finishAndSave}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="workspace-editor workspace-customize-view">
                <div className="builder-editor-body">
                  <div className="builder-form-heading">
                    <span>{ui.customize}</span>
                    <h1>{ui.templatesTitle}</h1>
                    <p>{ui.templatesHint}</p>
                  </div>

                  <div className="customize-template-grid">
                    {(['compact', 'centered', 'minimal', 'graduate', 'executive'] as ResumeTemplate[]).map(
                      (item, index) => (
                        <button
                          type="button"
                          key={item}
                          className={template === item ? 'active' : ''}
                          onClick={() => setTemplate(item)}
                        >
                          <span className={`template-thumbnail template-thumbnail-${item}`}>
                            <i />
                            <i />
                            <i />
                          </span>
                          <strong>{text.templates[index]}</strong>
                          {template === item && <Check />}
                        </button>
                      ),
                    )}
                  </div>

                  <section className="customize-control-section">
                    <div className="customize-section-heading">
                      <Type />
                      <div>
                        <h2>{ui.appearanceTitle}</h2>
                        <p>{ui.fontSizeTitle}</p>
                      </div>
                    </div>
                    <div className="customize-controls-grid">
                      <label className="customize-control wide">
                        <span>{ui.colorTitle}</span>
                        <div className="customize-color-swatches">
                          {resumeColors.map((color) => (
                            <button
                              type="button"
                              key={color}
                              aria-label={`${text.chooseColor} ${color}`}
                              className={resumeStyle.accentColor === color ? 'active' : ''}
                              style={{ backgroundColor: color }}
                              onClick={() => setResumeStyle((current) => ({ ...current, accentColor: color }))}
                            />
                          ))}
                        </div>
                      </label>
                      <label className="customize-control">
                        <span>{ui.fontTitle}</span>
                        <select
                          value={resumeStyle.fontFamily}
                          onChange={(event) =>
                            setResumeStyle((current) => ({ ...current, fontFamily: event.target.value }))
                          }
                        >
                          {resumeFonts.map(([label, value]) => (
                            <option key={label} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="customize-control">
                        <span>
                          {ui.fontSizeTitle} <b>{resumeStyle.fontSize}</b>
                        </span>
                        <input
                          type="range"
                          min="8"
                          max="12"
                          step="0.2"
                          value={resumeStyle.fontSize}
                          onChange={(event) =>
                            setResumeStyle((current) => ({ ...current, fontSize: Number(event.target.value) }))
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <section className="customize-control-section customize-document-options">
                    <div>
                      <strong>{ui.pagesTitle}</strong>
                      <div className="customize-segmented-control">
                        <button
                          type="button"
                          className={pageMode === 'one' ? 'active' : ''}
                          onClick={() => setPageMode('one')}
                        >
                          {text.onePage}
                        </button>
                        <button
                          type="button"
                          className={pageMode === 'two' ? 'active' : ''}
                          onClick={() => setPageMode('two')}
                        >
                          {text.twoPages}
                        </button>
                      </div>
                    </div>
                    <div>
                      <strong>{ui.languageTitle}</strong>
                      <div className="customize-segmented-control">
                        <button
                          type="button"
                          className={language === 'ar' ? 'active' : ''}
                          onClick={() => setLanguage('ar')}
                        >
                          {text.arabic}
                        </button>
                        <button
                          type="button"
                          className={language === 'en' ? 'active' : ''}
                          onClick={() => setLanguage('en')}
                        >
                          English
                        </button>
                      </div>
                    </div>
                  </section>

                  {language === 'ar' && (
                    <div className="customize-english-tip">
                      <LanguagesIcon />
                      <div>
                        <strong>{text.englishRecommendationTitle}</strong>
                        <span>{text.englishRecommendationBody}</span>
                      </div>
                      {!isGuest && (
                        <button onClick={() => openWritingAssistant('summary', 'translate')}>
                          {text.aiTranslation}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <ResumeAiWorkspace
              data={data}
              language={language}
              resumeId={id}
              initialTool={assistantTool}
              initialSection={assistantSection}
              onApplyResume={applyAiResume}
              onUndo={undoAiChange}
              canUndo={history.length > 0}
              onReviewAvailabilityChange={setAiReviewAvailable}
              onClose={() => {
                setWorkspaceMode('editor');
                setEditorView('edit');
              }}
              onNavigateSection={navigateFromAssistant}
            />
          )}
        </main>

        <section className={`builder-preview preview-language-${language}`}>
          <div className="preview-toolbar">
            <span>
              <i /> {text.livePreview}
            </span>
            <div className="template-tabs">
              {(['compact', 'centered', 'minimal', 'graduate', 'executive'] as ResumeTemplate[]).map((item, index) => (
                <button key={item} className={template === item ? 'active' : ''} onClick={() => setTemplate(item)}>
                  <b>{text.templates[index]}</b>
                </button>
              ))}
            </div>
            <div className="zoom-control">
              <Button
                variant="ghost"
                size="icon"
                aria-label={text.zoomOut}
                title={text.zoomOut}
                onClick={() => setZoom((value) => Math.max(50, value - 10))}
              >
                <Minus />
              </Button>
              <strong>{zoom}%</strong>
              <Button
                variant="ghost"
                size="icon"
                aria-label={text.zoomIn}
                title={text.zoomIn}
                onClick={() => setZoom((value) => Math.min(100, value + 10))}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <div className="design-toolbar">
            <div className="color-swatches" aria-label={text.resumeColor}>
              {resumeColors.map((color) => (
                <button
                  key={color}
                  aria-label={`${text.chooseColor} ${color}`}
                  className={resumeStyle.accentColor === color ? 'active' : ''}
                  style={{ backgroundColor: color }}
                  onClick={() => setResumeStyle((current) => ({ ...current, accentColor: color }))}
                />
              ))}
            </div>
            <label>
              {text.font}
              <select
                value={resumeStyle.fontFamily}
                onChange={(event) => setResumeStyle((current) => ({ ...current, fontFamily: event.target.value }))}
              >
                {resumeFonts.map(([label, value]) => (
                  <option key={label} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-size-control">
              {text.size}
              <input
                type="range"
                min="8"
                max="12"
                step="0.2"
                value={resumeStyle.fontSize}
                onChange={(event) =>
                  setResumeStyle((current) => ({ ...current, fontSize: Number(event.target.value) }))
                }
              />
              <b>{resumeStyle.fontSize}</b>
            </label>
            <div className="page-mode-control" aria-label={text.pageCount}>
              <button className={pageMode === 'one' ? 'active' : ''} onClick={() => setPageMode('one')}>
                {text.onePage}
              </button>
              <button className={pageMode === 'two' ? 'active' : ''} onClick={() => setPageMode('two')}>
                {text.twoPages}
              </button>
            </div>
          </div>
          {language === 'ar' && (
            <div className="english-recommendation">
              <LanguagesIcon />
              <span>
                <strong>{text.englishRecommendationTitle}</strong> {text.englishRecommendationBody}
              </span>
              {isGuest ? (
                <a href="/signup">{text.signupForTranslation}</a>
              ) : (
                <button onClick={() => setWorkspaceMode('assistant')}>{text.aiTranslation}</button>
              )}
            </div>
          )}
          {pageOverflow && (
            <div className="page-overflow-warning">
              <span>
                {text.overflowPrefix} {pageMode === 'one' ? text.onePageArea : text.twoPageArea}.
              </span>
              {pageMode === 'one' && <button onClick={() => setPageMode('two')}>{text.splitPages}</button>}
            </div>
          )}
          <div className="preview-stage" ref={previewStageRef}>
            <div
              className={`resume-scale-frame resume-language-${language} page-mode-${pageMode}`}
              style={{
                width: `${210 * (appliedZoom / 100)}mm`,
                height: `${(pageMode === 'one' ? 297 : 604) * (appliedZoom / 100)}mm`,
              }}
            >
              <div
                ref={printRootRef}
                className={`resume-print-root page-mode-${pageMode}`}
                style={{ transform: `scale(${appliedZoom / 100})` }}
              >
                <ResumeDocument
                  data={data}
                  template={template}
                  language={language}
                  pageMode={pageMode}
                  style={resumeStyle}
                  sectionOrder={sectionOrder}
                  showWatermark={watermarkRequired}
                />
              </div>
            </div>
          </div>
          <div className="preview-pager" aria-label={text.pageCount}>
            <button
              type="button"
              aria-label={text.previous}
              disabled={previewPage === 1}
              onClick={() => goToPreviewPage(previewPage - 1)}
            >
              <PreviousIcon />
            </button>
            <strong>
              {previewPage} / {pageMode === 'two' ? 2 : 1}
            </strong>
            <button
              type="button"
              aria-label={text.next}
              disabled={previewPage === (pageMode === 'two' ? 2 : 1)}
              onClick={() => goToPreviewPage(previewPage + 1)}
            >
              <NextIcon />
            </button>
          </div>
        </section>
      </div>
      <ResumeDownloadPaywall
        open={showDownloadPaywall}
        onOpenChange={setShowDownloadPaywall}
        isGuest={isGuest}
        draftId={id}
        userEmail={accountEmail}
      />
    </div>
  );
}

function SortableSectionButton({
  item,
  active,
  onSelect,
  dragLabel,
}: {
  item: { key: ResumeSectionKey; icon: ReactNode; title: string };
  active: boolean;
  onSelect: () => void;
  dragLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  return (
    <div
      ref={setNodeRef}
      className={`builder-step sortable ${active ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button type="button" onClick={onSelect}>
        {item.icon}
        <b>{item.title}</b>
      </button>
      <button type="button" className="builder-step-drag" aria-label={dragLabel} {...attributes} {...listeners}>
        <GripVertical />
      </button>
    </div>
  );
}

function LanguagesEditor({
  value,
  onChange,
  locale,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: 'ar' | 'en';
  label: string;
}) {
  const parse = () => {
    const parsed = value
      .split('\n')
      .map((line) => {
        const [name = '', ...level] = line.split(/\s+[—-]\s+/);
        return { name: name.trim(), level: level.join(' — ').trim() };
      })
      .filter((row) => row.name || row.level);
    return parsed.length ? parsed : [{ name: '', level: '' }];
  };
  const [rows, setRows] = useState(parse);
  const levels =
    locale === 'ar'
      ? ['اللغة الأم', 'متقن', 'متقدم', 'متوسط', 'مبتدئ']
      : ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Beginner'];
  const commit = (next: Array<{ name: string; level: string }>) => {
    setRows(next);
    onChange(
      next
        .filter((row) => row.name.trim() || row.level.trim())
        .map((row) => `${row.name.trim()} — ${row.level.trim()}`)
        .join('\n'),
    );
  };
  return (
    <section className="languages-editor" aria-label={label}>
      <div className="languages-editor-heading">
        <LanguagesIcon />
        <div>
          <strong>{label}</strong>
          <span>{locale === 'ar' ? 'أضف اللغة وحدد مستوى إتقانك' : 'Add each language and your proficiency'}</span>
        </div>
      </div>
      <datalist id="resume-language-levels">
        {levels.map((level) => (
          <option value={level} key={level} />
        ))}
      </datalist>
      <div className="language-rows">
        {rows.map((row, index) => (
          <div className="language-row" key={index}>
            <label>
              <span>{locale === 'ar' ? 'اللغة' : 'Language'}</span>
              <Input
                value={row.name}
                placeholder={locale === 'ar' ? 'مثال: العربية' : 'Example: English'}
                onChange={(event) =>
                  commit(
                    rows.map((item, rowIndex) => (rowIndex === index ? { ...item, name: event.target.value } : item)),
                  )
                }
              />
            </label>
            <label>
              <span>{locale === 'ar' ? 'مستوى الإتقان' : 'Proficiency'}</span>
              <Input
                list="resume-language-levels"
                value={row.level}
                placeholder={locale === 'ar' ? 'اختر أو اكتب مستوى مخصصًا' : 'Choose or enter a custom level'}
                onChange={(event) =>
                  commit(
                    rows.map((item, rowIndex) => (rowIndex === index ? { ...item, level: event.target.value } : item)),
                  )
                }
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={rows.length === 1 && !row.name && !row.level}
              aria-label={locale === 'ar' ? 'حذف اللغة' : 'Remove language'}
              onClick={() => commit(rows.filter((_, rowIndex) => rowIndex !== index))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setRows((current) => [...current, { name: '', level: '' }])}
      >
        <Plus /> {locale === 'ar' ? 'إضافة لغة' : 'Add language'}
      </Button>
    </section>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
