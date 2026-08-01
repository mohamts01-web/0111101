'use client';

import { FileText, Printer, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/localization/locale-provider';

type Letter = { id: string; title: string; language: 'ar' | 'en'; content: string; updated_at: string };

export function CoverLettersPage() {
  const { locale } = useLocale();
  const t =
    locale === 'ar'
      ? {
          deleteConfirm: 'هل تريد حذف خطاب التغطية؟',
          eyebrow: 'الوثائق',
          title: 'خطابات التغطية',
          subtitle: 'راجع الخطابات المولدة وعدّلها وصدّرها بصيغة PDF.',
          empty: 'لا توجد خطابات محفوظة بعد.',
          titleLabel: 'عنوان خطاب التغطية',
          save: 'حفظ',
          saving: 'جارٍ الحفظ...',
          export: 'تنزيل PDF',
          delete: 'حذف الخطاب',
          select: 'اختر خطاباً لعرضه.',
          contentLabel: 'محتوى خطاب التغطية',
        }
      : {
          deleteConfirm: 'Delete this cover letter?',
          eyebrow: 'Documents',
          title: 'Cover letters',
          subtitle: 'Review, edit, and export your generated cover letters as PDF files.',
          empty: 'No saved cover letters yet.',
          titleLabel: 'Cover letter title',
          save: 'Save',
          saving: 'Saving...',
          export: 'Download PDF',
          delete: 'Delete cover letter',
          select: 'Select a cover letter to view it.',
          contentLabel: 'Cover letter content',
        };
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void load();
  }, []);
  async function load() {
    const response = await fetch('/api/cover-letters');
    if (response.ok) {
      const payload = (await response.json()) as { coverLetters: Letter[] };
      setLetters(payload.coverLetters);
      setSelected((current) => current ?? payload.coverLetters[0] ?? null);
    }
  }
  async function save() {
    if (!selected) return;
    setSaving(true);
    const response = await fetch(`/api/cover-letters/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: selected.title, content: selected.content }),
    });
    setSaving(false);
    if (response.ok) void load();
  }
  async function remove() {
    if (!selected || !confirm(t.deleteConfirm)) return;
    const response = await fetch(`/api/cover-letters/${selected.id}`, { method: 'DELETE' });
    if (response.ok) {
      setSelected(null);
      void load();
    }
  }
  return (
    <main className="cover-letters-page">
      <header>
        <div>
          <p className="resume-eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="resume-muted">{t.subtitle}</p>
        </div>
      </header>
      <div className="cover-letters-layout">
        <aside>
          {letters.length === 0 ? (
            <div className="cover-letter-empty">
              <FileText />
              <p>{t.empty}</p>
            </div>
          ) : (
            letters.map((letter) => (
              <button
                className={selected?.id === letter.id ? 'active' : ''}
                key={letter.id}
                onClick={() => setSelected(letter)}
              >
                <strong>{letter.title}</strong>
                <small>{new Date(letter.updated_at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}</small>
              </button>
            ))
          )}
        </aside>
        <section>
          {selected ? (
            <>
              <div className="cover-letter-actions">
                <input
                  value={selected.title}
                  onChange={(event) => setSelected({ ...selected, title: event.target.value })}
                  aria-label={t.titleLabel}
                />
                <Button className="gap-2" onClick={save} disabled={saving}>
                  <Save /> {saving ? t.saving : t.save}
                </Button>
                <Button className="gap-2" variant="outline" onClick={() => window.print()}>
                  <Printer /> {t.export}
                </Button>
                <Button variant="ghost" size="icon" onClick={remove} aria-label={t.delete} title={t.delete}>
                  <Trash2 />
                </Button>
              </div>
              <article className="cover-letter-paper" dir={selected.language === 'ar' ? 'rtl' : 'ltr'}>
                <textarea
                  value={selected.content}
                  onChange={(event) => setSelected({ ...selected, content: event.target.value })}
                  aria-label={t.contentLabel}
                />
              </article>
            </>
          ) : (
            <div className="cover-letter-placeholder">{t.select}</div>
          )}
        </section>
      </div>
    </main>
  );
}
