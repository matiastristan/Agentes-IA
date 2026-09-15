'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ExcelUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/ventas/importar-excel', { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? 'No se pudo importar el archivo');
      return;
    }

    setMessage(`Se importaron ${data.cantidad} productos.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 mb-6">
      <p className="text-sm text-text-secondary">
        Para que el agente aproveche mejor tu catálogo, te recomendamos incluir en tu Excel las
        columnas <strong>nombre</strong>, <strong>precio</strong> y <strong>stock</strong>.
        Cualquier otra columna (talle, color, peso, marca, lo que necesites) también se guarda.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? 'Importando...' : 'Subir Excel'}
      </Button>
      {message && <p className="text-sm text-text-secondary">{message}</p>}
    </div>
  );
}
