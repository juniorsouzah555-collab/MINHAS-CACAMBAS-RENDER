import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from './lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, action, data, filter } = req.body;
  if (!table || !action) return res.status(400).json({ error: 'table and action are required' });

  try {
    const colRef = adminDb.collection(table);

    switch (action) {
      case 'insert': {
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const id = item.id || colRef.doc().id;
          await colRef.doc(id).set({ ...item, id, createdAt: item.createdAt || new Date().toISOString() });
        }
        return res.json({ ok: true });
      }
      case 'update': {
        let query: any = colRef;
        if (filter) {
          const [field, op, value] = parseFilter(filter);
          if (op === 'eq') query = query.where(field, '==', value);
          else if (op === 'gte') query = query.where(field, '>=', value);
        }
        const snapshot = await query.get();
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => batch.update(doc.ref, data));
        await batch.commit();
        return res.json({ ok: true });
      }
      case 'select': {
        let query: any = colRef;
        if (filter) {
          const [field, op, value] = parseFilter(filter);
          if (op === 'eq') query = query.where(field, '==', value);
        }
        const snapshot = await query.get();
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ data: docs });
      }
      case 'delete': {
        let query: any = colRef;
        if (filter) {
          const [field, op, value] = parseFilter(filter);
          if (op === 'eq') query = query.where(field, '==', value);
        }
        const snapshot = await query.get();
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return res.json({ ok: true });
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

function parseFilter(filter: string): [string, string, any] {
  // Supports: field=eq.value or field=gte.value
  const match = filter.match(/^(\w+)=\.?(eq|gte|lte|gt|lt|neq)\.(.+)$/);
  if (match) return [match[1], match[2], isNaN(Number(match[3])) ? match[3] : Number(match[3])];
  // Default: field=eq.value
  const parts = filter.split('=');
  return [parts[0], 'eq', parts.slice(1).join('=')];
}
