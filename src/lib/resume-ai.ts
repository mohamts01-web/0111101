import 'server-only';

export const aiOperations = [
  'assistant_message',
  'improve_section',
  'translate_section',
  'translate_resume',
  'resume_review',
  'cover_letter',
  'ats_analysis',
  'tailor_resume',
  'dual_review',
  'guided_resume',
] as const;

export type AiOperation = (typeof aiOperations)[number];

export type AiResume = Record<string, string>;

export type AtsAnalysis = {
  score: number;
  strengths: string[];
  missingKeywords: string[];
  improvements: string[];
  atsIssues: string[];
  breakdown: {
    keywords: number;
    experience: number;
    education: number;
    achievements: number;
    completeness: number;
    formatting: number;
  };
};

export type ReviewDimension = {
  key: 'structure' | 'clarity' | 'roleFit';
  score: number;
  status: 'strong' | 'good' | 'needs_work';
  summary: string;
};

export type ReviewSection = {
  key: keyof typeof resumeProperties;
  score: number;
  status: 'strong' | 'good' | 'needs_work';
  summary: string;
  strengths: string[];
  improvements: string[];
  actions: string[];
};

export type DetailedReview = {
  overallScore: number;
  headline: string;
  dimensions: ReviewDimension[];
  sections: ReviewSection[];
  missingSections: Array<{
    key: keyof typeof resumeProperties;
    reason: string;
  }>;
};

export type ResumeAiResult = {
  message: string;
  resume: AiResume | null;
  analysis: AtsAnalysis | null;
  review: DetailedReview | null;
  coverLetter: string | null;
};

const resumeProperties = {
  name: { type: 'string' },
  headline: { type: 'string' },
  email: { type: 'string' },
  phone: { type: 'string' },
  city: { type: 'string' },
  link: { type: 'string' },
  highlights: { type: 'string' },
  summary: { type: 'string' },
  experience: { type: 'string' },
  education: { type: 'string' },
  skills: { type: 'string' },
  projects: { type: 'string' },
  certificates: { type: 'string' },
  achievements: { type: 'string' },
  volunteer: { type: 'string' },
  languages: { type: 'string' },
} as const;

const resumeKeys = Object.keys(resumeProperties);

const reviewStatus = { type: 'string', enum: ['strong', 'good', 'needs_work'] } as const;

export const resumeAiSchema = {
  name: 'resume_ai_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
      resume: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: resumeProperties,
            required: Object.keys(resumeProperties),
          },
          { type: 'null' },
        ],
      },
      analysis: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 100 },
              strengths: { type: 'array', items: { type: 'string' } },
              missingKeywords: { type: 'array', items: { type: 'string' } },
              improvements: { type: 'array', items: { type: 'string' } },
              atsIssues: { type: 'array', items: { type: 'string' } },
              breakdown: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  keywords: { type: 'integer', minimum: 0, maximum: 35 },
                  experience: { type: 'integer', minimum: 0, maximum: 20 },
                  education: { type: 'integer', minimum: 0, maximum: 15 },
                  achievements: { type: 'integer', minimum: 0, maximum: 15 },
                  completeness: { type: 'integer', minimum: 0, maximum: 10 },
                  formatting: { type: 'integer', minimum: 0, maximum: 5 },
                },
                required: ['keywords', 'experience', 'education', 'achievements', 'completeness', 'formatting'],
              },
            },
            required: ['score', 'strengths', 'missingKeywords', 'improvements', 'atsIssues', 'breakdown'],
          },
          { type: 'null' },
        ],
      },
      review: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              overallScore: { type: 'integer', minimum: 0, maximum: 100 },
              headline: { type: 'string' },
              dimensions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    key: { type: 'string', enum: ['structure', 'clarity', 'roleFit'] },
                    score: { type: 'integer', minimum: 0, maximum: 100 },
                    status: reviewStatus,
                    summary: { type: 'string' },
                  },
                  required: ['key', 'score', 'status', 'summary'],
                },
              },
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    key: { type: 'string', enum: resumeKeys },
                    score: { type: 'integer', minimum: 0, maximum: 100 },
                    status: reviewStatus,
                    summary: { type: 'string' },
                    strengths: { type: 'array', items: { type: 'string' } },
                    improvements: { type: 'array', items: { type: 'string' } },
                    actions: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['key', 'score', 'status', 'summary', 'strengths', 'improvements', 'actions'],
                },
              },
              missingSections: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    key: { type: 'string', enum: resumeKeys },
                    reason: { type: 'string' },
                  },
                  required: ['key', 'reason'],
                },
              },
            },
            required: ['overallScore', 'headline', 'dimensions', 'sections', 'missingSections'],
          },
          { type: 'null' },
        ],
      },
      coverLetter: { type: ['string', 'null'] },
    },
    required: ['message', 'resume', 'analysis', 'review', 'coverLetter'],
  },
} as const;

export function modelForOperation(operation: AiOperation) {
  if (operation === 'translate_resume' || operation === 'translate_section') {
    return process.env.OPENROUTER_TRANSLATION_MODEL || 'google/gemini-2.5-flash';
  }
  return process.env.OPENROUTER_PRIMARY_MODEL || 'openai/gpt-5-mini';
}

export function operationInstruction(operation: AiOperation, language: 'ar' | 'en', jobDescription?: string) {
  const outputLanguage = language === 'ar' ? 'العربية' : 'English';
  const common = `اكتب النتيجة بلغة ${outputLanguage}. لا تختلق أي خبرة أو مهارة أو رقم. إذا كانت معلومة مطلوبة غير موجودة فاذكرها كنقطة ناقصة فقط. حافظ على الحقائق والتواريخ.`;
  const instructions: Record<AiOperation, string> = {
    assistant_message:
      'أجب كمستشار سيرة ذاتية محترف. نفذ طلب المستخدم، وإن اقترحت تعديلاً فأعد نسخة كاملة في resume ليتم عرضها للموافقة.',
    improve_section: 'حسّن القسم المطلوب بصياغة مباشرة ومتوافقة مع ATS، مع الحفاظ على جميع الحقائق.',
    translate_section: `ترجم القسم المطلوب ترجمة مهنية طبيعية إلى ${outputLanguage}، وليست ترجمة حرفية.`,
    translate_resume: `ترجم جميع محتويات السيرة ترجمة مهنية طبيعية إلى ${outputLanguage} مع الحفاظ على البنية والحقائق.`,
    resume_review:
      'قدم تقييماً منظماً وشاملاً في review يتضمن المحاور الثلاثة وكل قسم ذي صلة والأقسام المفقودة. أعد في resume نسخة محسنة قابلة للتطبيق، مع إبقاء الحقول الناقصة فارغة وعدم اختلاق معلومات. اجعل actions أوامر قصيرة قابلة للتطبيق على القسم.',
    cover_letter: 'أنشئ خطاب تغطية موجزاً ومخصصاً، مستنداً فقط إلى بيانات السيرة والوصف الوظيفي.',
    ats_analysis:
      'حلل توافق السيرة مع الوصف الوظيفي وفق الأوزان المحددة في مخطط breakdown، وحدد الكلمات والنقاط المفقودة. املأ review بتحليل منظم لكل قسم، وأعد في resume تحسينات مدعومة فقط بالحقائق المتوفرة.',
    tailor_resume:
      'اقترح نسخة محسنة كاملة من السيرة لتناسب الوصف الوظيفي، واملأ review لشرح التوافق والنواقص والتغييرات حسب القسم. لا تضف متطلبات لا تدعمها بيانات المستخدم.',
    dual_review:
      'نفذ تحليلاً دقيقاً وشاملاً للسيرة والوصف الوظيفي، واملأ review بالمحاور والأقسام والإجراءات العملية، مع مراجعة الاتساق وإبراز مواطن عدم اليقين.',
    guided_resume:
      'أنشئ مسودة سيرة ذاتية كاملة من البيانات المساعدة أو النص المستورد. املأ كل حقل بما تدعمه المعلومات فقط، واترك الحقول غير المعروفة فارغة. اجعل النتيجة عملية ومتوافقة مع ATS، واستخدم resume لإرجاع السيرة الكاملة.',
  };
  const guidedResumeSafety =
    operation === 'guided_resume'
      ? '\nFor fields inside the resume only: omit unsupported details entirely. Never include analysis, caveats, assumptions, missing-information notes, or phrases such as "not provided".'
      : '';
  return `${common}\n${instructions[operation]}${guidedResumeSafety}${jobDescription ? `\nالوصف الوظيفي:\n${jobDescription}` : ''}`;
}
