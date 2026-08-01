import { CheckoutEventsTimePeriod } from '@paddle/paddle-js';

export function parseSDKResponse<T>(response: T): T {
  return JSON.parse(JSON.stringify(response));
}

export const ErrorMessage = 'تعذر تنفيذ العملية، يرجى المحاولة لاحقاً.';

export function getErrorMessage() {
  return { error: ErrorMessage, data: [], hasMore: false, totalRecords: 0 };
}

export function getPaymentReason(origin: string, locale: 'ar' | 'en' = 'ar') {
  if (origin === 'web' || origin === 'subscription_charge') {
    return locale === 'ar' ? 'اشتراك جديد' : 'New subscription';
  } else {
    return locale === 'ar' ? 'تجديد' : 'Renewal';
  }
}

const BillingCycleMap = {
  day: 'يومي',
  week: 'أسبوعي',
  month: 'شهري',
  year: 'سنوي',
};

const CustomBillingCycleMap = {
  day: 'أيام',
  week: 'أسابيع',
  month: 'أشهر',
  year: 'سنوات',
};

export function formatBillingCycle({ frequency, interval }: CheckoutEventsTimePeriod) {
  if (frequency === 1) {
    return BillingCycleMap[interval];
  } else {
    return `كل ${frequency} ${CustomBillingCycleMap[interval]}`;
  }
}
