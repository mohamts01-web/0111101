export interface IBillingFrequency {
  value: 'month' | 'year';
  label: string;
  priceSuffix: string;
}

export const BillingFrequency: IBillingFrequency[] = [
  { value: 'month', label: 'شهري', priceSuffix: 'لكل مستخدم / شهرياً' },
  { value: 'year', label: 'سنوي', priceSuffix: 'لكل مستخدم / سنوياً' },
];
