import { ReceiptText } from 'lucide-react';

interface Props {
  pageTitle: string;
  eyebrow?: string;
  description?: string;
}

export function DashboardPageHeader({ pageTitle, eyebrow, description }: Props) {
  return (
    <header className="dashboard-page-heading">
      <span aria-hidden="true">
        <ReceiptText />
      </span>
      <div>
        {eyebrow && <p className="resume-eyebrow">{eyebrow}</p>}
        <h1>{pageTitle}</h1>
        {description && <p>{description}</p>}
      </div>
    </header>
  );
}
