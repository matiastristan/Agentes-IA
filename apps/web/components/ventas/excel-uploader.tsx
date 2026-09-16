'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { mapExcelRowToProducto } from '@/lib/ventas/map-excel-row';
import { extractDynamicColumns } from '@/lib/ventas/extract-dynamic-columns';

interface ProductoPreview {
  nombre: string;
  precio?: number;
  stock: number;
  atributos: Record<string, unknown>;
}

export function ExcelUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ProductoPreview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
      const productos = rows.map(mapExcelRowToProducto);
      setPreview(productos);
      setMessage(null);
    };
    reader.readAsArrayBuffer(file);

    // Permite volver a elegir el mismo archivo si se cancela y se reintenta
    e.target.value = '';
  }

  async function confirmarImportacion() {
    if (!preview) return;
    setLoading(true);

    const res = await fetch('/api/ventas/importar-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos: preview }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? 'No se pudo importar el archivo');
      return;
    }

    setPreview(null);
    setMessage(`Se importaron ${data.cantidad} productos.`);
    router.refresh();
  }

  function cancelar() {
    setPreview(null);
  }

  const columnasDinamicas = preview
    ? extractDynamicColumns(preview.map((p) => ({ atributos: p.atributos })))
    : [];

  return (
    <div className="flex flex-col gap-2 mb-6">
      {!preview && (
        <>
          <p className="text-sm text-text-secondary">
            Para que el agente aproveche mejor tu catálogo, te recomendamos incluir en tu Excel
            las columnas <strong>nombre</strong>, <strong>precio</strong> y <strong>stock</strong>.
            Cualquier otra columna (talle, color, peso, marca, lo que necesites) también se guarda.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button onClick={() => inputRef.current?.click()}>Subir Excel</Button>
        </>
      )}

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Revisá antes de importar ({preview.length} productos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="py-2 pr-4">Nombre</th>
                    <th className="py-2 pr-4">Precio</th>
                    <th className="py-2 pr-4">Stock</th>
                    {columnasDinamicas.map((col) => (
                      <th key={col} className="py-2 pr-4 capitalize">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((p, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 pr-4">{p.nombre}</td>
                      <td className="py-2 pr-4">{p.precio ?? '-'}</td>
                      <td className="py-2 pr-4">{p.stock}</td>
                      {columnasDinamicas.map((col) => (
                        <td key={col} className="py-2 pr-4">
                          {String(p.atributos[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <p className="text-xs text-text-muted mt-2">
                  Mostrando los primeros 10 de {preview.length} productos.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmarImportacion} disabled={loading}>
                {loading ? 'Importando...' : `Confirmar importación (${preview.length})`}
              </Button>
              <Button variant="secondary" onClick={cancelar} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {message && <p className="text-sm text-text-secondary">{message}</p>}
    </div>
  );
}
