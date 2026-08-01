'use client';

import { getTransactions } from '@/utils/paddle/get-transactions';
import { ErrorContent } from '@/components/dashboard/layout/error-content';
import { DataTable } from '@/components/dashboard/payments/components/data-table';
import { getColumns } from '@/components/dashboard/payments/components/columns';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { usePagination } from '@/hooks/usePagination';
import { TransactionResponse } from '@/lib/api.types';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  subscriptionId: string;
}

export function PaymentsContent({ subscriptionId }: Props) {
  const { locale } = useLocale();
  const { after, goToNextPage, goToPrevPage, hasPrev } = usePagination();

  const [transactionResponse, setTransactionResponse] = useState<TransactionResponse>({
    data: [],
    hasMore: false,
    totalRecords: 0,
    error: undefined,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const response = await getTransactions(subscriptionId, after);
      if (response) {
        setTransactionResponse(response);
      }
      setLoading(false);
    })();
  }, [subscriptionId, after]);

  if (!transactionResponse || transactionResponse.error) {
    return <ErrorContent />;
  } else if (loading) {
    return <LoadingScreen />;
  }

  const { data: transactionData, hasMore, totalRecords } = transactionResponse;
  return (
    <div>
      <DataTable
        columns={getColumns(locale)}
        hasMore={hasMore}
        totalRecords={totalRecords}
        goToNextPage={goToNextPage}
        goToPrevPage={goToPrevPage}
        hasPrev={hasPrev}
        data={transactionData ?? []}
      />
    </div>
  );
}
