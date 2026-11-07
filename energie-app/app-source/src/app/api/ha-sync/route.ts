// src/app/api/cron/ha-sync/route.ts
import { NextResponse } from 'next/server';
import { syncHomeAssistantDagMetingen, testVerbinding } from '@/actions/homeAssistantActions';

export async function POST(request: Request) {
  // Optionele extra beveiliging via een secret header
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
  }

  // Voer de synchronisatie uit voor gisteren
  const result = await syncHomeAssistantDagMetingen();
  if (result.success) {
    return NextResponse.json({ message: 'Sync succesvol', aantal: result.aantal });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}