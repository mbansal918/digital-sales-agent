import express from 'express';
import bodyParser from 'body-parser';
import { whatsapp } from '../../packages/channel-adapters/src/index';

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const incoming = whatsapp.normalizeTwilioWebhook(req.body);
    console.log('Incoming WhatsApp message:', incoming.from, incoming.body);

    // Reply with a static message immediately
    const reply = {
      to: incoming.from,
      body: 'Thanks for contacting Digital Sales Agent. A human will follow up shortly.',
    };

    await whatsapp.sendMessage(reply);

    // Twilio expects a 200 OK. We already replied via API; return empty 200.
    res.sendStatus(200);
  } catch (err: any) {
    console.error('Error handling WhatsApp webhook:', err);
    res.sendStatus(500);
  }
});

const port = process.env.GATEWAY_PORT ? parseInt(process.env.GATEWAY_PORT) : 3000;
app.listen(port, () => console.log(`Gateway webhook listening on port ${port}`));
