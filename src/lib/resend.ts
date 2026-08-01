export async function sendTransactionalEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return { sent: false, error: 'not_configured' };
  const usingTestSender = process.env.RESEND_FROM_EMAIL.includes('onboarding@resend.dev');
  const recipient = usingTestSender ? process.env.RESEND_TEST_RECIPIENT?.trim() : to.trim();
  if (!recipient) return { sent: false, error: 'missing_recipient' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [recipient], subject, html }),
  });
  if (!response.ok) {
    console.error('Resend transactional email failed', response.status, await response.text());
    return { sent: false, error: 'provider_error' };
  }
  return { sent: true };
}
