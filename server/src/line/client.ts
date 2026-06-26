export async function sendLinePushMessage(accessToken: string, to: string, text: string): Promise<void> {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  });
  if (!response.ok) throw new Error(`LINE push failed with status ${response.status}.`);
}

export async function replyLineMessage(accessToken: string, replyToken: string, text: string): Promise<void> {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
  if (!response.ok) throw new Error(`LINE reply failed with status ${response.status}.`);
}
