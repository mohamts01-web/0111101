export type BillingPlanId = 'trial' | 'plus' | 'advanced';
export type EntitlementPlanId = 'trial_basic' | 'basic' | 'advanced';

export interface Tier {
  name: 'Trial' | 'Basic Plus' | 'Advanced';
  id: BillingPlanId;
  entitlementPlan: EntitlementPlanId;
  icon: string;
  description: string;
  descriptionEn: string;
  features: string[];
  featuresEn: string[];
  featured: boolean;
  priceId: string;
  priceSar: number;
  credits: number;
  periodAr: string;
  periodEn: string;
}

export const PricingTier: Tier[] = [
  {
    name: 'Trial',
    id: 'trial',
    entitlementPlan: 'trial_basic',
    icon: '/assets/icons/price-tiers/free-icon.svg',
    description: 'تجربة مدفوعة قصيرة لا تتجدد تلقائياً، ويمكن شراؤها مجدداً بعد انتهائها.',
    descriptionEn: 'A short paid pass that never auto-renews and can be purchased again after it expires.',
    features: [
      'وصول كامل لمدة 7 أيام',
      '50 نقطة ذكاء اصطناعي',
      'تصدير PDF بلا علامة مائية',
      'دفعة واحدة بلا تجديد تلقائي',
    ],
    featuresEn: [
      'Full access for 7 days',
      '50 AI credits',
      'Watermark-free PDF export',
      'One payment, no auto-renewal',
    ],
    featured: false,
    priceId: 'pri_01kxxr8232bea1j5y02w46yfjc',
    priceSar: 9.9,
    credits: 50,
    periodAr: 'لمدة 7 أيام',
    periodEn: 'for 7 days',
  },
  {
    name: 'Basic Plus',
    id: 'plus',
    entitlementPlan: 'basic',
    icon: '/assets/icons/price-tiers/basic-icon.svg',
    description: 'الخيار العملي للبحث عن وظيفة وتطوير السيرة بصورة مستمرة.',
    descriptionEn: 'The practical plan for an active job search and ongoing resume improvement.',
    features: ['300 نقطة AI كل شهر', 'سير ذاتية محفوظة بلا حد', 'فحص ATS وترجمة ذكية', 'خطابات تغطية وتصدير PDF'],
    featuresEn: [
      '300 AI credits each month',
      'Unlimited saved resumes',
      'ATS analysis and AI translation',
      'Cover letters and PDF export',
    ],
    featured: true,
    priceId: 'pri_01kxxr833zgn4mh3v06d3tenp7',
    priceSar: 29,
    credits: 300,
    periodAr: 'شهرياً',
    periodEn: 'per month',
  },
  {
    name: 'Advanced',
    id: 'advanced',
    entitlementPlan: 'advanced',
    icon: '/assets/icons/price-tiers/pro-icon.svg',
    description: 'للاستخدام المكثف خلال ثلاثة أشهر مع رصيد أكبر وأدوات متقدمة.',
    descriptionEn: 'Three months of intensive use with a larger balance and advanced tools.',
    features: [
      '2400 نقطة AI كل 3 أشهر',
      'كل مزايا الأساسية بلس',
      'تحليل متقدم بنموذجين',
      'أولوية المعالجة والقوالب التنفيذية',
    ],
    featuresEn: [
      '2,400 AI credits every 3 months',
      'Everything in Basic Plus',
      'Advanced dual-model analysis',
      'Priority processing and executive templates',
    ],
    featured: false,
    priceId: 'pri_01kxxr842g6v2m6jbs28z4jc46',
    priceSar: 189,
    credits: 2400,
    periodAr: 'كل 3 أشهر',
    periodEn: 'every 3 months',
  },
];

export function tierForPriceId(priceId?: string | null) {
  return PricingTier.find((tier) => tier.priceId === priceId);
}
