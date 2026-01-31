/**
 * Webhook handlers (e.g. Buy Me a Coffee).
 * Mounted with raw body so signature verification can use the exact payload.
 */

import type { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db/connection.js';

const BMC_SECRET = process.env.BMC_WEBHOOK_SECRET;

/** Support event names that carry supporter_email (BMC may use different casing) */
const SUPPORT_EVENTS = new Set([
  'coffee_purchase',
  'coffee_purchase_refunded',
  'coffee_link_purchase',
  'support_created',
  'support_refunded',
  'membership_started',
  'membership_updated',
]);

/** Amount in USD above which we set patron instead of supporter (configurable via env) */
const PATRON_AMOUNT_MIN = parseFloat(process.env.BMC_PATRON_AMOUNT_MIN ?? '20') || 20;

function getSupporterEmail(payload: Record<string, unknown>): string | null {
  const response = (payload.response ?? payload) as Record<string, unknown> | undefined;
  if (!response || typeof response !== 'object') return null;
  const email =
    (response.supporter_email as string) ??
    (response.supporter_email_address as string) ??
    (response.email as string) ??
    (response.payer_email as string);
  return typeof email === 'string' && email.trim() ? email.trim() : null;
}

function getTotalAmount(payload: Record<string, unknown>): number {
  const response = (payload.response ?? payload) as Record<string, unknown> | undefined;
  if (!response || typeof response !== 'object') return 0;
  const raw =
    response.total_amount ?? response.amount ?? response.support_amount ?? response.number_of_coffees;
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function tierFromAmount(amount: number): 'supporter' | 'patron' {
  return amount >= PATRON_AMOUNT_MIN ? 'patron' : 'supporter';
}

/**
 * POST /api/webhooks/buymeacoffee
 * Expects raw JSON body (mounted with express.raw). Verifies x-signature-sha256 or x-bmc-signature,
 * then finds user by donor email and sets supporter_tier.
 */
export async function buymeacoffeeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!BMC_SECRET) {
    res.status(501).json({ error: 'Buy Me a Coffee webhook is not configured (BMC_WEBHOOK_SECRET)' });
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  const signature =
    (req.headers['x-signature-sha256'] as string) ?? (req.headers['x-bmc-signature'] as string);
  if (!signature || typeof signature !== 'string') {
    res.status(401).json({ error: 'Missing webhook signature' });
    return;
  }

  const expected = crypto.createHmac('sha256', BMC_SECRET).update(bodyBuffer).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyBuffer.toString('utf8')) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const event = (
    (req.headers['x-bmc-event'] as string) ??
    (payload.event_type as string) ??
    (payload.type as string) ??
    ''
  )
    .toLowerCase()
    .replace(/-/g, '_');
  if (!SUPPORT_EVENTS.has(event)) {
    res.status(200).json({ received: true, skipped: 'unsupported event' });
    return;
  }

  const email = getSupporterEmail(payload);
  if (!email) {
    res.status(200).json({ received: true, skipped: 'no supporter email' });
    return;
  }

  const isRefund = event.includes('refund');
  const amount = getTotalAmount(payload);
  const tier = isRefund ? null : tierFromAmount(amount);

  try {
    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (userResult.rows.length === 0) {
      res.status(200).json({ received: true, skipped: 'no matching user' });
      return;
    }
    const userId = userResult.rows[0].id;
    await query('UPDATE users SET supporter_tier = $1 WHERE id = $2', [
      tier === null ? null : tier,
      userId,
    ]);
    res.status(200).json({ received: true, tier: tier ?? 'cleared', userId });
  } catch (err) {
    console.error('BMC webhook: DB error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
