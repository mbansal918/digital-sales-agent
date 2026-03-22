const http = require('http');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');

// Load .env.local if present
const envPath = process.cwd() + '/.env.local';
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    process.env[k] = v;
  }
}

const PORT = process.env.GATEWAY_PORT ? parseInt(process.env.GATEWAY_PORT) : 3000;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER || '';

function sendTwilioMessage(to, body, callback) {
  const postData = querystring.stringify({
    To: to,
    From: TWILIO_WHATSAPP,
    Body: body,
  });

  const options = {
    hostname: 'api.twilio.com',
    port: 443,
    path: `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        callback(null, data);
      } else {
        callback(new Error(`Twilio API error ${res.statusCode}: ${data}`));
      }
    });
  });
  req.on('error', callback);
  req.write(postData);
  req.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhooks/whatsapp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const parsed = querystring.parse(body);
      const incoming = {
        id: parsed.MessageSid || parsed.SmsSid || `${Date.now()}`,
        channel: 'whatsapp',
        from: parsed.From,
        to: parsed.To,
        body: parsed.Body || '',
        timestamp: new Date().toISOString(),
        raw: parsed,
      };
      console.log('Incoming WhatsApp message:', incoming.from, incoming.body);

      const replyText = 'Thanks for contacting Digital Sales Agent. A human will follow up shortly.';
      sendTwilioMessage(incoming.from, replyText, (err, data) => {
        if (err) {
          console.error('Error sending Twilio message:', err);
          res.statusCode = 500;
          res.end('error');
        } else {
          res.statusCode = 200;
          res.end('ok');
        }
      });
    });
  } else {
    res.statusCode = 404;
    res.end('not found');
  }
});

server.listen(PORT, () => console.log(`Simple gateway listening on port ${PORT}`));
