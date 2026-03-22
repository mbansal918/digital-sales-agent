import { IncomingMessage, OutgoingMessage } from '../../shared-types/src/index';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '';

export function normalizeTwilioWebhook(body: any): IncomingMessage {
  // Twilio posts application/x-www-form-urlencoded with fields like: From, To, Body, MessageSid
  return {
    id: body.MessageSid || body.SmsSid || `${Date.now()}`,
    channel: 'whatsapp',
    from: body.From,
    to: body.To,
    body: body.Body || '',
    timestamp: new Date().toISOString(),
    raw: body,
  };
}

export async function sendMessage(msg: OutgoingMessage): Promise<any> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !WHATSAPP_NUMBER) {
    throw new Error('Twilio credentials/Twilio number not set in env variables');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams();
  form.append('To', msg.to);
  form.append('From', WHATSAPP_NUMBER);
  form.append('Body', msg.body || '');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio send failed: ${res.status} ${text}`);
  }

  return res.json();
}
