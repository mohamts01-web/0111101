'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Headphones, MessageSquarePlus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/components/localization/locale-provider';

type Ticket = {
  id: string;
  category: string;
  subject: string;
  status: string;
  updated_at: string;
  support_messages: Array<{ id: string; author_type: string; body: string; created_at: string }>;
};

export function SupportPage() {
  const { locale } = useLocale();
  const t =
    locale === 'ar'
      ? {
          title: 'الدعم والمقترحات',
          subtitle: 'أرسل شكوى أو اقتراحاً أو اطلب المساعدة وتابع رد الإدارة هنا.',
          sendError: 'تعذر إرسال الرسالة.',
          sent: 'تم إرسال رسالتك إلى الإدارة.',
          newMessage: 'رسالة جديدة',
          type: 'النوع',
          support: 'طلب مساعدة',
          complaint: 'شكوى',
          suggestion: 'اقتراح',
          subject: 'العنوان',
          subjectPlaceholder: 'ملخص قصير لموضوع الرسالة',
          details: 'التفاصيل',
          detailsPlaceholder: 'اشرح كيف يمكننا مساعدتك...',
          send: 'إرسال للإدارة',
          previous: 'رسائلي السابقة',
          empty: 'لا توجد تذاكر حتى الآن.',
          admin: 'الإدارة',
          you: 'أنت',
          reply: 'اكتب ردك...',
          sendReply: 'إرسال الرد',
        }
      : {
          title: 'Support and feedback',
          subtitle: 'Ask for help, share a suggestion, or report an issue and follow the team response here.',
          sendError: 'Your message could not be sent.',
          sent: 'Your message was sent to the support team.',
          newMessage: 'New message',
          type: 'Category',
          support: 'Help request',
          complaint: 'Complaint',
          suggestion: 'Suggestion',
          subject: 'Subject',
          subjectPlaceholder: 'A short summary of your message',
          details: 'Details',
          detailsPlaceholder: 'Tell us how we can help...',
          send: 'Send to support',
          previous: 'Previous conversations',
          empty: 'You have not opened any tickets yet.',
          admin: 'Support team',
          you: 'You',
          reply: 'Write a reply...',
          sendReply: 'Send reply',
        };
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [category, setCategory] = useState('support');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/support');
    const payload = await response.json();
    setTickets(payload.tickets ?? []);
  }, []);
  useEffect(() => void refresh(), [refresh]);

  async function createTicket(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, subject, body }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) return setStatus(payload.error ?? t.sendError);
    setSubject('');
    setBody('');
    setStatus(t.sent);
    await refresh();
  }

  async function sendReply(ticketId: string) {
    const text = reply[ticketId]?.trim();
    if (!text) return;
    const response = await fetch(`/api/support/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    if (response.ok) {
      setReply((current) => ({ ...current, [ticketId]: '' }));
      await refresh();
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-4 py-8 md:p-8">
      <header>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
      </header>
      {status && (
        <p role="status" className="rounded-md border bg-card p-3 text-sm">
          {status}
        </p>
      )}
      <form onSubmit={createTicket} className="grid gap-5 rounded-md border bg-card p-5 md:grid-cols-2">
        <div className="flex items-center gap-2 md:col-span-2">
          <MessageSquarePlus className="h-5 w-5" />
          <h2 className="font-semibold">{t.newMessage}</h2>
        </div>
        <div className="space-y-2">
          <Label>{t.type}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="support">{t.support}</SelectItem>
              <SelectItem value="complaint">{t.complaint}</SelectItem>
              <SelectItem value="suggestion">{t.suggestion}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticket-subject">{t.subject}</Label>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={160}
            placeholder={t.subjectPlaceholder}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ticket-body">{t.details}</Label>
          <Textarea
            id="ticket-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={5000}
            placeholder={t.detailsPlaceholder}
            required
          />
        </div>
        <Button className="gap-2" type="submit" disabled={loading}>
          <Send className="h-4 w-4" /> {t.send}
        </Button>
      </form>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          <h2 className="font-semibold">{t.previous}</h2>
        </div>
        {tickets.length === 0 && (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{t.empty}</p>
        )}
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-md border bg-card p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{ticket.subject}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {categoryLabel(ticket.category, locale)} ·{' '}
                  {new Date(ticket.updated_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-xs">{ticketStatus(ticket.status, locale)}</span>
            </header>
            <div className="mt-4 space-y-3 border-y py-4">
              {ticket.support_messages?.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-md p-3 text-sm leading-6 ${message.author_type === 'admin' ? 'me-auto bg-primary/10' : 'ms-auto bg-muted'}`}
                >
                  <strong className="mb-1 block text-xs">{message.author_type === 'admin' ? t.admin : t.you}</strong>
                  {message.body}
                </div>
              ))}
            </div>
            {ticket.status !== 'resolved' && (
              <div className="mt-4 flex gap-2">
                <Input
                  value={reply[ticket.id] ?? ''}
                  onChange={(event) => setReply((current) => ({ ...current, [ticket.id]: event.target.value }))}
                  placeholder={t.reply}
                />
                <Button
                  size="icon"
                  type="button"
                  title={t.sendReply}
                  aria-label={t.sendReply}
                  onClick={() => sendReply(ticket.id)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

function categoryLabel(value: string, locale: 'ar' | 'en') {
  const labels =
    locale === 'ar'
      ? { complaint: 'شكوى', suggestion: 'اقتراح', support: 'طلب مساعدة' }
      : { complaint: 'Complaint', suggestion: 'Suggestion', support: 'Help request' };
  return (labels as Record<string, string>)[value] ?? value;
}

function ticketStatus(value: string, locale: 'ar' | 'en') {
  const labels =
    locale === 'ar'
      ? { open: 'مفتوحة', in_progress: 'قيد المعالجة', resolved: 'محلولة' }
      : { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
  return (labels as Record<string, string>)[value] ?? value;
}
