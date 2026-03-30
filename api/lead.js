module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    res.status(500).json({ ok: false, error: 'telegram_not_configured' });
    return;
  }

  const body = typeof req.body === 'string'
    ? safeParse(req.body)
    : (req.body || {});

  const name = normalize(body.name, 60);
  const phone = normalize(body.phone, 30);
  const issue = normalize(body.issue, 500);
  const website = normalize(body.website, 120);

  if (website) {
    res.status(200).json({ ok: true });
    return;
  }

  if (phone.length < 6) {
    res.status(400).json({ ok: false, error: 'invalid_phone' });
    return;
  }

  const textLines = [
    'New lead from BrakeBro landing',
    '',
    `Name: ${name || '-'}`,
    `Phone: ${phone}`,
    `Issue: ${issue || '-'}`,
    '',
    `Time: ${new Date().toISOString()}`,
  ];

  const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: textLines.join('\n'),
      disable_web_page_preview: true,
    }),
  });

  if (!tgResponse.ok) {
    res.status(502).json({ ok: false, error: 'telegram_request_failed' });
    return;
  }

  res.status(200).json({ ok: true });
};

function normalize(value, maxLen) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}
