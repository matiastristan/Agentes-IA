'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { validateAuthCredentials } from '@/lib/auth/validate-auth-credentials';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const RUBROS_TURNOS = [
  'cancha_padel',
  'cancha_futbol',
  'cancha_tenis',
  'gimnasio',
  'barberia',
  'unas_pestanas',
  'estetica',
  'salud_belleza',
  'odontologia',
];

const RUBROS_VENTAS = [
  'mayorista',
  'pet_shop',
  'suplementos_gimnasio',
  'alimentos_congelados',
  'panificados',
  'pastas',
  'viajes_turismo',
  'electronica',
  'computacion',
  'logistica',
  'paqueteria',
  'catering',
  'marketing_digital',
  'autos_usados',
];

const selectClass =
  'h-10 rounded-md border border-border px-3 bg-background text-sm ' +
  'transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ' +
  'hover:border-primary/50';

export default function SignupPage() {
  const router = useRouter();
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [tipoCrm, setTipoCrm] = useState<'ventas' | 'turnos'>('turnos');
  const [rubro, setRubro] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { valid, errors } = validateAuthCredentials({ email, password });
    setFieldErrors(errors);
    if (!valid) return;

    setLoading(true);
    const supabase = createClient();
    // raw_user_meta_data es leído por el trigger handle_new_user() en Supabase,
    // que crea automáticamente la fila `negocio` con tenant_id = auth uid,
    // tipo_crm y rubro.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_negocio: nombreNegocio || undefined,
          tipo_crm: tipoCrm,
          rubro: rubro || undefined,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(
        error.message === 'User already registered' ? 'Ese email ya está registrado' : 'No se pudo crear la cuenta'
      );
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  const rubrosDisponibles = tipoCrm === 'turnos' ? RUBROS_TURNOS : RUBROS_VENTAS;

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Panel de presentación — decorativo, oculto en mobile */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative z-10">
          <span className="text-lg font-semibold tracking-tight">FactorIA</span>
          <span className="block text-xs text-primary-foreground/70">Tu Fábrica de Agentes</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight mb-4">
            Armá tu agente en minutos, no en semanas.
          </h1>
          <p className="text-primary-foreground/80">
            Elegí tu rubro y arrancá — el resto (tono, catálogo, disponibilidad)
            lo vas configurando desde tu panel cuando quieras.
          </p>
        </div>
        <div className="relative z-10 text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} FactorIA
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="flex items-center justify-center bg-background p-6 py-12">
        <div className="w-full max-w-sm animate-fade-slide-in">
          <h2 className="text-2xl font-semibold text-text-primary mb-1">Crear tu cuenta</h2>
          <p className="text-sm text-text-secondary mb-8">Empezá gratis, sin tarjeta</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nombre del negocio"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Ej: Barbería Juan"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Tipo de negocio</label>
              <select
                value={tipoCrm}
                onChange={(e) => {
                  setTipoCrm(e.target.value as 'ventas' | 'turnos');
                  setRubro('');
                }}
                className={selectClass}
              >
                <option value="turnos">Turnos y citas</option>
                <option value="ventas">Ventas y productos</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Rubro</label>
              <select value={rubro} onChange={(e) => setRubro(e.target.value)} className={selectClass}>
                <option value="">Seleccioná tu rubro</option>
                {rubrosDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              autoComplete="new-password"
            />
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-sm text-text-secondary mt-6 text-center">
            ¿Ya tenés cuenta?{' '}
            <a href="/login" className="text-primary font-medium hover:underline">
              Iniciá sesión
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
