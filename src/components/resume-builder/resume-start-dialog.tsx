'use client';

import { useRef } from 'react';
import { ArrowLeft, ArrowRight, FileUp, Plus, Sparkles, X } from 'lucide-react';
import { useLocale } from '@/components/localization/locale-provider';

type Props = {
  open: boolean;
  isGuest: boolean;
  onManual: () => void;
  onGuided: () => void;
  onUpload: (file: File) => void;
  onRequireAuth: () => void;
};

export function ResumeStartDialog({ open, isGuest, onManual, onGuided, onUpload, onRequireAuth }: Props) {
  const { locale } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const ar = locale === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;

  function chooseGuided() {
    if (isGuest) onRequireAuth();
    else onGuided();
  }

  function chooseUpload() {
    if (isGuest) {
      onRequireAuth();
      return;
    }
    fileRef.current?.click();
  }

  return (
    <div className="resume-start-backdrop" role="presentation">
      <section className="resume-start-dialog" role="dialog" aria-modal="true" aria-labelledby="resume-start-title">
        <button className="resume-start-close" type="button" onClick={onManual} aria-label={ar ? 'إغلاق' : 'Close'}>
          <X />
        </button>
        <div className="resume-start-heading">
          <span className="resume-start-spark">
            <Sparkles />
          </span>
          <h2 id="resume-start-title">{ar ? 'كيف تريد أن تبدأ؟' : 'How do you want to start?'}</h2>
          <p>{ar ? 'اختر الطريقة الأنسب لبناء سيرتك الذاتية.' : 'Choose the best way to build your resume.'}</p>
        </div>

        <div className="resume-start-options">
          <button type="button" onClick={onManual}>
            <span className="resume-start-option-icon">
              <Plus />
            </span>
            <span>
              <strong>{ar ? 'إنشاء سيرة ذاتية جديدة' : 'Create new resume'}</strong>
              <small>{ar ? 'ابدأ من محرر فارغ' : 'Start with a blank editor'}</small>
            </span>
            <Arrow />
          </button>
          <button type="button" className="resume-start-option-ai" onClick={chooseGuided}>
            <span className="resume-start-option-icon">
              <Sparkles />
            </span>
            <span>
              <strong>{ar ? 'تحتاج مساعدة في إنشاء سيرتك الذاتية؟' : 'Create with AI assistance'}</strong>
              <small>
                {isGuest
                  ? ar
                    ? 'يتطلب تسجيل الدخول'
                    : 'Sign in required'
                  : ar
                    ? 'أجب عن أسئلة قصيرة ودع LOAD يبني المسودة'
                    : 'Answer a few questions and let LOAD build the draft'}
              </small>
            </span>
            <Arrow />
          </button>
          <button type="button" onClick={chooseUpload}>
            <span className="resume-start-option-icon">
              <FileUp />
            </span>
            <span>
              <strong>{ar ? 'إرفاق سيرة ذاتية موجودة' : 'Upload existing resume'}</strong>
              <small>
                {isGuest
                  ? ar
                    ? 'يتطلب تسجيل الدخول'
                    : 'Sign in required'
                  : ar
                    ? 'استيراد ملف PDF إلى المحرر'
                    : 'Import a PDF into the editor'}
              </small>
            </span>
            <Arrow />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = '';
          }}
        />
      </section>
    </div>
  );
}
