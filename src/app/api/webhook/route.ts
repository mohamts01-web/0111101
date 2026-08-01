import { NextRequest } from 'next/server';
import { ProcessWebhook } from '@/utils/paddle/process-webhook';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
  const signature = request.headers.get('paddle-signature') || '';
  const rawRequestBody = await request.text();
  const privateKey = process.env['PADDLE_NOTIFICATION_WEBHOOK_SECRET'] || '';

  if (!signature || !rawRequestBody) {
    return Response.json({ error: 'Missing webhook body or Paddle-Signature header.' }, { status: 400 });
  }
  if (!privateKey) {
    return Response.json({ error: 'Webhook signing secret is not configured.' }, { status: 500 });
  }

  let eventData;
  try {
    const paddle = getPaddleInstance();
    eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature);
  } catch (error) {
    console.error('Paddle webhook signature verification failed.', error);
    return Response.json({ error: 'Invalid Paddle webhook signature.' }, { status: 401 });
  }

  try {
    await webhookProcessor.processEvent(eventData);

    return Response.json({ received: true, eventType: eventData.eventType });
  } catch (error) {
    console.error('Verified Paddle webhook processing failed.', error);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
