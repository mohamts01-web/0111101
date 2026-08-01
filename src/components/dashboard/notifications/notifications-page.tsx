'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/localization/locale-provider';

type Notification = { id: string; title: string; body: string; read_at: string | null; created_at: string };

export function NotificationsPage() {
  const { locale } = useLocale();
  const t =
    locale === 'ar'
      ? {
          title: 'الإشعارات',
          subtitle: 'تحديثات الحساب والاشتراك ورسائل الإدارة.',
          markAll: 'تحديد الكل كمقروء',
          loading: 'جاري تحميل الإشعارات...',
          empty: 'لا توجد إشعارات بعد.',
        }
      : {
          title: 'Notifications',
          subtitle: 'Account updates, subscription activity, and messages from the team.',
          markAll: 'Mark all as read',
          loading: 'Loading notifications...',
          empty: 'No notifications yet.',
        };
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetch('/api/notifications')
      .then((response) => response.json())
      .then((payload) => setItems(payload.notifications ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id?: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    setItems((current) =>
      current.map((item) => (!id || item.id === id ? { ...item, read_at: new Date().toISOString() } : item)),
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 py-8 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button
          className="gap-2"
          variant="outline"
          onClick={() => markRead()}
          disabled={!items.some((item) => !item.read_at)}
        >
          <CheckCheck className="h-4 w-4" /> {t.markAll}
        </Button>
      </header>
      <section className="divide-y rounded-md border border-border bg-card">
        {loading && <p className="p-6 text-sm text-muted-foreground">{t.loading}</p>}
        {!loading && items.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t.empty}</p>}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => !item.read_at && markRead(item.id)}
            className="flex w-full items-start gap-3 p-4 text-start hover:bg-muted/40"
          >
            <span
              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.read_at ? 'bg-muted' : 'bg-primary/10 text-primary'}`}
            >
              <Bell className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <strong className="text-sm">{item.title}</strong>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </time>
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.body}</span>
            </span>
            {!item.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
          </button>
        ))}
      </section>
    </main>
  );
}
