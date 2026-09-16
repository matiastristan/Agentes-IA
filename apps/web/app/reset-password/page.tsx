'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });

    setLoading(false);

    if (error) {
      toast.error('No pudimos procesar la solicitud. Probá de nuevo en unos minutos.');
      return;
    }

    setEnviado(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm animate-fade-slide-in">
        <h2 className="text-2xl font-semibold text-text-primary mb-1">Recuperar contraseña</h2>

        {enviado ? (
          <div className="mt-6">
            <p className="text-sm text-text-secondary">
              Si <strong>{email}</strong> tiene una cuenta con nosotros, te mandamos un link para
              elegir una contraseña nueva. Revisá tu bandeja de entrada (y spam).
            </p>
            <a href="/login" className="text-sm text-primary font-medium hover:underline mt-4 inline-block">
              Volver a iniciar sesión
            </a>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary mb-8">
              Ingresá tu email y te mandamos un link para elegir una contraseña nueva.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Mandar link de recuperación'}
              </Button>
            </form>
            <a href="/login" className="text-sm text-text-secondary hover:underline mt-6 inline-block">
              ← Volver a iniciar sesión
            </a>
          </>
        )}
      </div>
    </main>
  );
}
