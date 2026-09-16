'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function EmailAlertasForm({ emailActual }: { emailActual: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState(emailActual ?? '');
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setGuardado(false);

    const res = await fetch('/api/negocio/email-alertas', {
      method: 'POST',
      body: JSON.stringify({ email_alertas: email }),
    });

    setLoading(false);
    if (res.ok) {
      setGuardado(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <Input
        type="email"
        label="Email para recibir alertas"
        placeholder="tu-email@negocio.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" disabled={loading || !email}>
        {loading ? 'Guardando...' : 'Guardar'}
      </Button>
      {guardado && <p className="text-sm text-primary">Guardado ✅</p>}
    </form>
  );
}
