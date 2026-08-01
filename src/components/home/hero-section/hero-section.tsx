'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  FileUp,
  ScanSearch,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Spotlight } from '@/components/ui/spotlight';
import { useLocale } from '@/components/localization/locale-provider';

const copy = {
  ar: {
    eyebrow: 'مساعدك المهني الذكي',
    headline: 'أنشئ سيرة ذاتية احترافية مدعومة بالذكاء الاصطناعي خلال دقائق',
    lead: 'اكتب خبرتك كما هي، ودع LOAD يحوّلها إلى سيرة واضحة وجاهزة للتقديم بالعربية أو الإنجليزية.',
    primary: 'أنشئ سيرتك الآن',
    secondary: 'استكشف القوالب',
    proof: ['بدون بطاقة بنكية', 'عربي وإنجليزي', 'تصدير PDF احترافي'],
    name: 'محمد أحمد',
    role: 'مدير منتجات رقمية',
    meta: 'الرياض · mohammed@example.com',
    summary: 'مدير منتجات بخبرة في بناء منتجات رقمية تحقق نموًا قابلًا للقياس وتجربة عميل أفضل.',
    experience: 'مدير منتجات أول · 2021 - الآن',
    skills: 'استراتيجية المنتجات · تحليل البيانات · Agile',
    score: 'قوة السيرة',
    scoreNote: 'جاهزة للتقديم',
    writing: 'يصيغ مهاراتك بلغة نتائج واضحة...',
    bentoEyebrow: 'أدوات تحترم وقتك',
    bentoTitle: 'كل خطوة، من المسودة إلى التقديم، في مكان واحد.',
    features: [
      ['مساعد كتابة بالذكاء الاصطناعي', 'حوّل النقاط العامة إلى إنجازات مهنية قابلة للقياس.'],
      ['قوالب صديقة لـ ATS', 'تصميم واضح يقرأه مسؤولو التوظيف والأنظمة بسهولة.'],
      ['تصدير ومشاركة فورية', 'نزّل PDF أو أرسله إلى بريدك من مساحة العمل نفسها.'],
      ['استيراد ذكي للسيرة', 'ارفع PDF نصيًا ودع LOAD يملأ بياناتك كبداية.'],
    ],
    templateKicker: 'تصميم واضح. مضمون أقوى.',
    templateTitle: 'قوالب مصممة لتُقرأ بسرعة، وتترك أثرًا.',
  },
  en: {
    eyebrow: 'Your AI career co-pilot',
    headline: 'Build a professional AI-powered resume in minutes',
    lead: 'Write your experience as it is. LOAD turns it into a focused resume ready to apply in Arabic or English.',
    primary: 'Create your resume',
    secondary: 'Explore templates',
    proof: ['No card required', 'Arabic and English', 'Professional PDF export'],
    name: 'Mohammed Ahmed',
    role: 'Digital Product Manager',
    meta: 'Riyadh · mohammed@example.com',
    summary:
      'Product manager experienced in building digital products that deliver measurable growth and better customer experiences.',
    experience: 'Senior Product Manager · 2021 - Present',
    skills: 'Product strategy · Data analysis · Agile',
    score: 'Resume strength',
    scoreNote: 'Ready to apply',
    writing: 'Turning your skills into clear outcomes...',
    bentoEyebrow: 'Tools that respect your time',
    bentoTitle: 'Every step from draft to application, in one place.',
    features: [
      ['AI writing assistant', 'Turn general responsibilities into measurable professional outcomes.'],
      ['ATS-friendly templates', 'Clean layouts that hiring teams and systems can scan with ease.'],
      ['Instant export and sharing', 'Download a PDF or send a copy to your inbox from one workspace.'],
      ['Smart resume import', 'Upload a text PDF and let LOAD turn it into your starting point.'],
    ],
    templateKicker: 'Clear design. Stronger story.',
    templateTitle: 'Templates made to scan fast and leave an impression.',
  },
} as const;

const featureIcons = [WandSparkles, ScanSearch, FileText, FileUp];

export function HeroSection() {
  const { locale } = useLocale();
  const text = copy[locale];
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <>
      <section className="load-hero">
        <Spotlight className="load-spotlight load-spotlight-blue" fill="#0066FF" />
        <Spotlight className="load-spotlight load-spotlight-teal" fill="#00C9B7" />
        <div className="load-grid" aria-hidden="true" />
        <div className="container load-hero-inner">
          <motion.div
            className="load-hero-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p className="load-eyebrow">
              <Sparkles /> {text.eyebrow}
            </p>
            <h1>{text.headline}</h1>
            <p className="load-hero-lead">{text.lead}</p>
            <div className="load-hero-actions">
              <Link href="/resume/new" className="load-cta-glow">
                {text.primary} <Arrow />
              </Link>
              <Link href="#templates" className="load-cta-secondary">
                {text.secondary}
              </Link>
            </div>
            <div className="load-proof-row" aria-label={locale === 'ar' ? 'مزايا أساسية' : 'Key benefits'}>
              {text.proof.map((item) => (
                <span key={item}>
                  <CheckCircle2 /> {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="load-resume-stage"
            initial={{ opacity: 0, scale: 0.94, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
            aria-label={locale === 'ar' ? 'معاينة سيرة ذاتية حية' : 'Live resume preview'}
          >
            <div className="load-stage-topbar">
              <span />
              <span />
              <span />
              <p>LOAD AI</p>
            </div>
            <article className="load-paper" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <header>
                <strong>{text.name}</strong>
                <span>{text.role}</span>
                <small>{text.meta}</small>
              </header>
              <section>
                <b>{locale === 'ar' ? 'النبذة المهنية' : 'Professional summary'}</b>
                <p>{text.summary}</p>
              </section>
              <section>
                <b>{locale === 'ar' ? 'الخبرات المهنية' : 'Experience'}</b>
                <strong>{text.experience}</strong>
              </section>
              <section>
                <b>{locale === 'ar' ? 'المهارات' : 'Skills'}</b>
                <p>{text.skills}</p>
              </section>
            </article>
            <aside className="load-ai-panel">
              <div className="load-score-ring">
                <svg viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" />
                  <motion.circle
                    cx="22"
                    cy="22"
                    r="18"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 0.92 }}
                    transition={{ duration: 1.2, delay: 0.5 }}
                  />
                </svg>
                <strong>
                  92<span>%</span>
                </strong>
              </div>
              <div>
                <small>{text.score}</small>
                <b>{text.scoreNote}</b>
              </div>
              <div className="load-typewriter">
                <Bot /> <span>{text.writing}</span>
              </div>
            </aside>
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="load-bento-section scroll-mt-24">
        <div className="container">
          <div className="load-section-heading">
            <p>{text.bentoEyebrow}</p>
            <h2>{text.bentoTitle}</h2>
          </div>
          <div id="capabilities" className="load-bento-grid scroll-mt-24">
            {text.features.map(([title, description], index) => {
              const Icon = featureIcons[index];
              return (
                <motion.article
                  key={title}
                  className={`load-bento-card load-bento-${index + 1}`}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="load-bento-icon">
                    <Icon />
                  </div>
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="templates" className="load-template-section scroll-mt-24">
        <div className="container load-template-banner">
          <div>
            <p>{text.templateKicker}</p>
            <h2>{text.templateTitle}</h2>
          </div>
          <Link href="/resume/new" className="load-cta-secondary">
            {text.primary} <Arrow />
          </Link>
        </div>
      </section>
    </>
  );
}
