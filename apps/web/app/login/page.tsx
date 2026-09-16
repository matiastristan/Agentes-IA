'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { validateAuthCredentials } from '@/lib/auth/validate-auth-credentials';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error('Email o contraseña incorrectos');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Panel de presentación — decorativo, oculto en mobile */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative z-10">
          <span className="text-lg font-semibold tracking-tight">FactorIA</span>
          <span className="block text-xs text-primary-foreground/70">Tu Fábrica de Agentes</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight mb-4">
            Tu negocio, respondiendo solo, las 24 horas.
          </h1>
          <p className="text-primary-foreground/80">
            Un agente de IA que atiende WhatsApp, agenda turnos y gestiona ventas
            mientras vos hacés crecer tu negocio.
          </p>
        </div>
        <div className="relative z-10 text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} FactorIA
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm animate-fade-slide-in">
          <h2 className="text-2xl font-semibold text-text-primary mb-1">Iniciar sesión</h2>
          <p className="text-sm text-text-secondary mb-8">Entrá al panel de tu negocio</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1">
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                autoComplete="current-password"
              />
              <a
                href="/reset-password"
                className="self-end text-xs text-primary font-medium hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <p className="text-sm text-text-secondary mt-6 text-center">
            ¿No tenés cuenta?{' '}
            <a href="/signup" className="text-primary font-medium hover:underline">
              Registrate
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
