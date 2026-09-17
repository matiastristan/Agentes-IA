'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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

const selectClass =
  'h-10 rounded-md border border-border px-3 bg-background text-sm w-full ' +
  'transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export default function NuevoNegocioPage() {
  const router = useRouter();
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [email, setEmail] = useState('');
  const [tipoCrm, setTipoCrm] = useState<'ventas' | 'turnos'>('turnos');
  const [rubro, setRubro] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<{ email: string; password: string } | null>(null);

  const rubrosDisponibles = tipoCrm === 'turnos' ? RUBROS_TURNOS : RUBROS_VENTAS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const res = await fetch('/api/admin/negocios/crear', {
      method: 'POST',
      body: JSON.stringify({ nombreNegocio, email, tipoCrm, rubro, phoneNumberId, accessToken }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.errors) setErrors(data.errors);
      toast.error(data.error ?? 'No se pudo crear el negocio');
      return;
    }

    setResultado({ email: data.email, password: data.password });
  }

  if (resultado) {
    return (
      <main className="flex-1 bg-background p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Negocio creado ✅</h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Credenciales para pasarle al cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-1">Email</p>
            <p className="text-sm font-mono mb-4">{resultado.email}</p>
            <p className="text-sm text-text-secondary mb-1">Contraseña temporal</p>
            <p className="text-sm font-mono mb-4">{resultado.password}</p>
            <p className="text-xs text-text-muted mb-4">
              Esta contraseña no se vuelve a mostrar — copiala ahora. Recomendale al cliente
              cambiarla apenas entre.
            </p>
            <Button onClick={() => router.push('/admin/negocios')}>Volver a negocios</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Nuevo negocio (alta manual)
      </h1>

      <Card className="max-w-lg animate-fade-slide-in">
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nombre del negocio"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              error={errors.nombreNegocio}
            />
            <Input
              label="Email del cliente"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
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
                <option value="">Seleccioná el rubro</option>
                {rubrosDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-medium text-text-secondary mb-3">
                Datos de Meta (ya configurados por vos manualmente)
              </p>
              <Input
                label="Phone Number ID"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                error={errors.phoneNumberId}
              />
              <div className="mt-4">
                <Input
                  label="Access Token (System User)"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  error={errors.accessToken}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? 'Creando...' : 'Crear negocio'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
