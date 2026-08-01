'use client';

import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Transaction } from '@paddle/paddle-node-sdk';
import { useLocale } from '@/components/localization/locale-provider';
import dayjs from 'dayjs';
import { Status } from '@/components/shared/status/status';
import { getPaymentReason } from '@/utils/paddle/data-helpers';
import { parseMoney } from '@/utils/paddle/parse-money';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  hasMore?: boolean;
  totalRecords?: number;
  goToNextPage: (cursor: string) => void;
  goToPrevPage: () => void;
  hasPrev: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  totalRecords,
  hasMore,
  goToNextPage,
  goToPrevPage,
  hasPrev,
}: DataTableProps<TData, TValue>) {
  const { locale } = useLocale();
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalRecords ? Math.ceil(totalRecords / data.length) : 1,
    rowCount: data.length,
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="payment-table-shell">
      <div className="payment-desktop-table">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        minWidth: header.column.columnDef.size,
                        maxWidth: header.column.columnDef.size,
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        minWidth: cell.column.columnDef.size,
                        maxWidth: cell.column.columnDef.size,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {locale === 'ar' ? 'لا توجد مدفوعات.' : 'No payments found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="payment-mobile-list">
        {data.length ? (
          data.map((item) => {
            const transaction = item as Transaction;
            const billedDate = transaction.billedAt ?? transaction.createdAt;
            return (
              <article key={transaction.id}>
                <time>{dayjs(billedDate).format(locale === 'ar' ? 'YYYY/MM/DD h:mma' : 'MMM DD, YYYY · h:mma')}</time>
                <div className="payment-mobile-copy">
                  <strong>{getPaymentReason(transaction.origin, locale)}</strong>
                  <span>{transaction.details?.lineItems[0].product?.name}</span>
                </div>
                <div className="payment-mobile-meta">
                  <b>{parseMoney(transaction.details?.totals?.total, transaction.currencyCode)}</b>
                  <Status status={transaction.status} />
                </div>
              </article>
            );
          })
        ) : (
          <p className="payment-mobile-empty">{locale === 'ar' ? 'لا توجد مدفوعات.' : 'No payments found.'}</p>
        )}
      </div>
      <div className="payment-pagination">
        <Button size="sm" variant="outline" onClick={() => goToPrevPage()} disabled={!hasPrev}>
          {locale === 'ar' ? 'السابق' : 'Previous'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => goToNextPage((data[data.length - 1] as Transaction).id)}
          disabled={!hasMore}
        >
          {locale === 'ar' ? 'التالي' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
