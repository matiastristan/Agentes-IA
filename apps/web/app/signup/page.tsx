'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { validateAuthCredentials } from '@/lib/auth/validate-auth-credentials';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

export default function SignupPage() {
  const router = useRouter();
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [tipoCrm, setTipoCrm] = useState<'ventas' | 'turnos'>('turnos');
  const [rubro, setRubro] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

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
      setFormError(error.message === 'User already registered' ? 'Ese email ya está registrado' : 'No se pudo crear la cuenta');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  const rubrosDisponibles = tipoCrm === 'turnos' ? RUBROS_TURNOS : RUBROS_VENTAS;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crear tu cuenta</CardTitle>
        </CardHeader>
        <CardContent>
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
                className="h-10 rounded-sm border border-border px-3 bg-white"
              >
                <option value="turnos">Turnos y citas</option>
                <option value="ventas">Ventas y productos</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Rubro</label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="h-10 rounded-sm border border-border px-3 bg-white"
              >
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
            {formError && (
              <p role="alert" className="text-sm text-error">
                {formError}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
          <p className="text-sm text-text-secondary mt-4 text-center">
            ¿Ya tenés cuenta?{' '}
            <a href="/login" className="text-primary font-medium">
              Iniciá sesión
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
