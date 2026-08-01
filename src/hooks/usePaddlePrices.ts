import { Paddle, PricePreviewParams, PricePreviewResponse } from '@paddle/paddle-js';
import { useEffect, useMemo, useState } from 'react';
import { PricingTier } from '@/constants/pricing-tier';
import { useLocale } from '@/components/localization/locale-provider';

export type PaddlePrices = Record<string, string>;
export type PaddlePriceMaps = { local: PaddlePrices; usd: PaddlePrices };

const subscriptionPriceIds = PricingTier.map((tier) => tier.priceId);

function getPriceAmounts(preview: PricePreviewResponse) {
  return preview.data.details.lineItems.reduce((prices, item) => {
    prices[item.price.id] = item.formattedTotals.total;
    return prices;
  }, {} as PaddlePrices);
}

export function usePaddlePrices(
  paddle: Paddle | undefined | null,
  country?: string,
  requestedPriceIds: string[] = subscriptionPriceIds,
  quantity = 1,
): { prices: PaddlePriceMaps; loading: boolean; error?: string } {
  const { locale } = useLocale();
  const key = requestedPriceIds.filter(Boolean).sort().join(',');
  const items = useMemo<PricePreviewParams['items']>(
    () =>
      key
        .split(',')
        .filter(Boolean)
        .map((priceId) => ({ priceId, quantity })),
    [key, quantity],
  );
  const [prices, setPrices] = useState<PaddlePriceMaps>({ local: {}, usd: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!paddle || items.length === 0) {
      setLoading(Boolean(items.length));
      return;
    }
    setLoading(true);
    setError(undefined);
    const localRequest: PricePreviewParams = { items, ...(country && { address: { countryCode: country } }) };
    Promise.all([
      paddle.PricePreview(localRequest),
      paddle.PricePreview({ items, currencyCode: 'USD', address: { countryCode: 'US' } }),
    ])
      .then(([local, usd]) => setPrices({ local: getPriceAmounts(local), usd: getPriceAmounts(usd) }))
      .catch((cause) => {
        console.error('Paddle PricePreview failed', cause);
        setError(locale === 'ar' ? 'تعذر تحميل الأسعار من Paddle.' : 'Paddle prices could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [country, items, locale, paddle]);
  return { prices, loading, error };
}
