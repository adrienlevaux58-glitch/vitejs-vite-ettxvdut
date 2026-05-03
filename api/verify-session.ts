import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.body;

  if (!session_id) return res.status(400).json({ error: 'Session ID manquant' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const isPremium = session.payment_status === 'paid';
    return res.status(200).json({ isPremium, email: session.customer_details?.email });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}