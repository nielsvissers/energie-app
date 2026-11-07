// src/app/api/cron/ha-sync/route.ts
import { NextResponse } from 'next/server';
import { syncHomeAssistantDagMetingen } from '@/actions/homeAssistantActions';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
  }

  let targetDatumStr: string | undefined;

  try {
    const body = await request.json();
    targetDatumStr = body?.datum || body?.date || body?.targetDatum || undefined;
  } catch {
    // Geen JSON-body of ongeldige JSON; gebruik standaardgedrag (gisteren)
  }

  const result = await syncHomeAssistantDagMetingen(targetDatumStr);

  if (result.success) {
    return NextResponse.json({ message: 'Sync succesvol', aantal: result.aantal, datum: targetDatumStr ?? 'gisteren' });
  }

  return NextResponse.json({ error: result.error }, { status: 500 });
}