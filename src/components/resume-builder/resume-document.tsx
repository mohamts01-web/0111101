import type { CSSProperties, ReactNode } from 'react';
import type {
  ResumeData,
  ResumeLanguage,
  ResumePageMode,
  ResumeStyle,
  ResumeSectionKey,
  ResumeTemplate,
} from '@/components/resume-builder/resume-builder';

interface Props {
  data: ResumeData;
  template: ResumeTemplate;
  language: ResumeLanguage;
  pageMode: ResumePageMode;
  style: ResumeStyle;
  sectionOrder: ResumeSectionKey[];
  showWatermark?: boolean;
}

const labels = {
  ar: {
    name: 'الاسم الكامل',
    headline: 'المسمى المهني',
    contact: 'البريد الإلكتروني · رقم الجوال · المدينة',
    summary: 'النبذة المهنية',
    experience: 'الخبرات المهنية',
    education: 'المؤهلات التعليمية',
    skills: 'المهارات',
    languages: 'اللغات',
    projects: 'المشاريع',
    certificates: 'الشهادات المهنية',
    achievements: 'الجوائز والإنجازات',
    volunteer: 'الأعمال التطوعية',
  },
  en: {
    name: 'Your Name',
    headline: 'Professional Title',
    contact: 'Email · Phone · Location',
    summary: 'Professional Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    projects: 'Projects',
    certificates: 'Certifications',
    achievements: 'Awards & Honors',
    volunteer: 'Volunteering',
  },
};

function renderInlineFormatting(value: string): ReactNode[] {
  const tokenPattern = /(\*\*.*?\*\*|~~.*?~~|__.*?__|\*[^*]+?\*|\[[^\]]+\]\([^)]+\))/g;
  return value.split(tokenPattern).map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('~~') && token.endsWith('~~')) return <s key={index}>{token.slice(2, -2)}</s>;
    if (token.startsWith('__') && token.endsWith('__')) return <u key={index}>{token.slice(2, -2)}</u>;
    if (token.startsWith('*') && token.endsWith('*')) return <em key={index}>{token.slice(1, -1)}</em>;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link)
      return (
        <a key={index} href={link[2]}>
          {link[1]}
        </a>
      );
    return token;
  });
}

function renderFormattedText(value: string) {
  return value.split('\n').map((line, index) => {
    const bullet = line.match(/^\s*[•-]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (bullet)
      return (
        <div className="cv-rich-line cv-bullet-line" key={index}>
          <span>•</span>
          <div>{renderInlineFormatting(bullet[1])}</div>
        </div>
      );
    if (numbered)
      return (
        <div className="cv-rich-line cv-numbered-line" key={index}>
          <span>{numbered[1]}.</span>
          <div>{renderInlineFormatting(numbered[2])}</div>
        </div>
      );
    return (
      <div className={`cv-rich-line ${line ? '' : 'cv-empty-line'}`} key={index}>
        {line ? renderInlineFormatting(line) : '\u00a0'}
      </div>
    );
  });
}

export function ResumeDocument({
  data,
  template,
  language,
  pageMode,
  style,
  sectionOrder,
  showWatermark = false,
}: Props) {
  const text = labels[language];
  const sectionValues: Record<Exclude<ResumeSectionKey, 'personal'>, readonly [string, string]> = {
    summary: [text.summary, data.summary],
    skills: [text.skills, data.skills],
    languages: [text.languages, data.languages],
    projects: [text.projects, data.projects],
    experience: [text.experience, data.experience],
    education: [text.education, data.education],
    certificates: [text.certificates, data.certificates],
    achievements: [text.achievements, data.achievements],
    volunteer: [text.volunteer, data.volunteer],
  };
  const sections = sectionOrder
    .filter((key): key is Exclude<ResumeSectionKey, 'personal'> => key !== 'personal')
    .map((key) => sectionValues[key]);
  const contact = [data.phone, data.email, data.link, data.city].filter(Boolean).join('   ·   ') || text.contact;

  const css = {
    '--resume-accent': style.accentColor,
    '--resume-font-size': `${style.fontSize}pt`,
    fontFamily: style.fontFamily,
  } as CSSProperties;
  const renderSections = (items: Array<readonly [string, string]>) => (
    <div className="cv-sections">
      {items.map(
        ([title, value]) =>
          value && (
            <section className="cv-section" key={title}>
              <h3>{title}</h3>
              <div className="cv-section-body" dir="auto">
                {renderFormattedText(value)}
              </div>
            </section>
          ),
      )}
    </div>
  );

  if (pageMode === 'two') {
    return (
      <div className="resume-pages page-mode-two" style={css}>
        <article className={`cv-paper template-${template}`} dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
          <ResumeHeader data={data} text={text} contact={contact} />
          {renderSections(sections.slice(0, Math.ceil(sections.length / 2)))}
          {showWatermark && <PlatformWatermark />}
        </article>
        <article
          className={`cv-paper template-${template} cv-paper-continuation`}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          lang={language}
        >
          <header className="cv-continuation-header">
            <strong>{data.name || text.name}</strong>
            <span>{language === 'ar' ? 'السيرة الذاتية — تابع' : 'Resume — continued'}</span>
          </header>
          {renderSections(sections.slice(Math.ceil(sections.length / 2)))}
          {showWatermark && <PlatformWatermark />}
        </article>
      </div>
    );
  }

  return (
    <div className="resume-pages page-mode-one" style={css}>
      <article className={`cv-paper template-${template}`} dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
        <ResumeHeader data={data} text={text} contact={contact} />
        {renderSections(sections)}
        {showWatermark && <PlatformWatermark />}
      </article>
    </div>
  );
}

function PlatformWatermark() {
  return (
    <div className="cv-platform-watermark" aria-hidden="true">
      <img src="/brand/platform-mark.png" alt="" />
      <strong>LOAD CV</strong>
    </div>
  );
}

function ResumeHeader({
  data,
  text,
  contact,
}: {
  data: ResumeData;
  text: { name: string; headline: string };
  contact: string;
}) {
  return (
    <header className="cv-header">
      <h2>{data.name || text.name}</h2>
      <p>{data.headline || text.headline}</p>
      {data.highlights && <div className="cv-highlights">{data.highlights}</div>}
      <div className="cv-contact" dir="auto">
        {contact}
      </div>
    </header>
  );
}
