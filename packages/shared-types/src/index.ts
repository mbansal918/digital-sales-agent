export type Channel = 'whatsapp' | 'voice' | 'email' | 'web' | 'unknown';

export interface IncomingMessage {
  id: string;
  channel: Channel;
  from: string; // sender, e.g. "whatsapp:+1234567890"
  to: string;   // receiver (our number)
  body: string;
  timestamp?: string;
  raw?: any;
}

export interface OutgoingMessage {
  to: string;
  from?: string;
  body: string;
  channel?: Channel;
  metadata?: any;
}
