'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Resumen {
  requestsGratis: { usadas: number; limite: number; porcentaje: number } | null;
  creditos: { usados: number; usadosHoy: number; limite: number | null; restante: number | null };
  estado: 'ok' | 'advertencia' | 'critico' | 'agotado';
  esTierGratuito: boolean;
}

const MENSAJE_ESTADO = {
  ok: 'El agente está respondiendo con normalidad.',
  advertencia: 'Consumo alto. Si se agota, el agente deja de responder por WhatsApp.',
  critico: 'Quedan muy pocas consultas para hoy.',
  agotado: 'Límite diario agotado — el agente NO está respondiendo. Se renueva a las 21:00 (medianoche UTC).',
} as const;

const COLOR_BARRA = {
  ok: 'bg-success',
  advertencia: 'bg-warning',
  critico: 'bg-warning',
  agotado: 'bg-error',
} as const;

export function ConsumoIaPanel({ modelos }: { modelos: string[] }) {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/consumo');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo consultar el consumo');
      } else {
        setResumen(data.resumen);
      }
    } catch {
      setError('No se pudo consultar el consumo');
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const pct = resumen?.requestsGratis?.porcentaje ?? 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <CardTitle>Consumo de IA</CardTitle>
        <button
          onClick={cargar}
          disabled={cargando}
          aria-label="Actualizar consumo"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tint transition-colors duration-150"
        >
          <RefreshCw className={cn('h-4 w-4', cargando && 'animate-spin')} strokeWidth={2} />
        </button>
      </div>

      <CardContent>
        {error && <p className="text-sm text-error">{error}</p>}

        {!error && cargando && !resumen && (
          <p className="text-sm text-text-muted">Consultando OpenRouter...</p>
        )}

        {resumen && (
          <div className="flex flex-col gap-4">
            {resumen.requestsGratis ? (
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm text-text-secondary">Consultas gratuitas de hoy</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {resumen.requestsGratis.usadas} / {resumen.requestsGratis.limite}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-bg-tint overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-500 ease-out',
                      COLOR_BARRA[resumen.estado]
                    )}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1 tabular-nums">{pct}% usado</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Créditos usados (total)</span>
                  <span className="font-semibold tabular-nums">
                    ${resumen.creditos.usados.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Usado hoy</span>
                  <span className="font-semibold tabular-nums">
                    ${resumen.creditos.usadosHoy.toFixed(4)}
                  </span>
                </div>
                {resumen.creditos.restante != null && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Restante</span>
                    <span className="font-semibold tabular-nums">
                      ${resumen.creditos.restante.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div
              className={cn(
                'flex items-start gap-2 rounded-md p-3 text-xs',
                resumen.estado === 'ok' ? 'bg-success-bg' : 'bg-warning-bg',
                resumen.estado === 'agotado' && 'bg-error-bg'
              )}
            >
              {resumen.estado === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-px" strokeWidth={2} />
              ) : (
                <AlertTriangle
                  className={cn(
                    'h-4 w-4 shrink-0 mt-px',
                    resumen.estado === 'agotado' ? 'text-error' : 'text-warning'
                  )}
                  strokeWidth={2}
                />
              )}
              <span className="text-text-primary">{MENSAJE_ESTADO[resumen.estado]}</span>
            </div>

            <div>
              <p className="text-sm text-text-secondary mb-1.5">Modelos configurados</p>
              <ol className="flex flex-col gap-1">
                {modelos.map((m, i) => (
                  <li key={m} className="flex items-center gap-2 text-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-tint font-semibold tabular-nums">
                      {i + 1}
                    </span>
                    <code className="text-text-primary">{m}</code>
                    {i === 0 && <span className="text-text-muted">(principal)</span>}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-text-muted mt-2">
                Se usan en orden: si el primero falla o está saturado, pasa al siguiente.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
