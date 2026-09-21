import { NextResponse } from 'next/server';
import { buildResumenConsumo, type OpenRouterKeyInfo } from '@/lib/admin/build-resumen-consumo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY no configurada' }, { status: 500 });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter respondió ${res.status}` },
        { status: 502 }
      );
    }

    const json = (await res.json()) as { data: OpenRouterKeyInfo };
    return NextResponse.json({ ok: true, resumen: buildResumenConsumo(json.data) });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar el consumo' }, { status: 502 });
  }
}
