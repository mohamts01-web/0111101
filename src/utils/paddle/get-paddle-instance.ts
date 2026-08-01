import { Environment, LogLevel, Paddle, PaddleOptions } from '@paddle/paddle-node-sdk';

export function getPaddleInstance() {
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
  const apiKey = process.env.PADDLE_API_KEY;

  if (!environment || !Object.values(Environment).includes(environment as Environment)) {
    throw new Error('NEXT_PUBLIC_PADDLE_ENV must be explicitly set to sandbox or production.');
  }
  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is required.');
  }

  const paddleOptions: PaddleOptions = {
    environment: environment as Environment,
    logLevel: LogLevel.error,
  };

  return new Paddle(apiKey, paddleOptions);
}
