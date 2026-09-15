import { createClient } from '@/lib/supabase/server';
import { extractDynamicColumns } from '@/lib/ventas/extract-dynamic-columns';
import { checkStockAlert } from '@/lib/ventas/check-stock-alert';
import { ExcelUploader } from '@/components/ventas/excel-uploader';

export default async function CatalogoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('tenant_id', user!.id)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  const lista = productos ?? [];
  const columnasDinamicas = extractDynamicColumns(
    lista.map((p) => ({ atributos: (p.atributos as Record<string, unknown>) ?? {} }))
  );

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Catálogo</h1>
      <ExcelUploader />

      <div className="overflow-x-auto">
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
            {lista.map((p) => {
              const alerta = checkStockAlert(p.stock, p.umbral_alerta_stock ?? null);
              const atributos = (p.atributos as Record<string, unknown>) ?? {};
              return (
                <tr key={p.id} className="border-b border-border">
                  <td className="py-2 pr-4">{p.nombre}</td>
                  <td className="py-2 pr-4">${p.precio ?? '-'}</td>
                  <td className="py-2 pr-4">
                    {p.stock}
                    {alerta.requiereAlerta && (
                      <span className="ml-2 text-xs text-warning">⚠️ stock bajo</span>
                    )}
                  </td>
                  {columnasDinamicas.map((col) => (
                    <td key={col} className="py-2 pr-4">
                      {String(atributos[col] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lista.length === 0 && (
        <p className="text-sm text-text-muted mt-4">
          Todavía no cargaste productos. Subí un Excel para empezar.
        </p>
      )}
    </main>
  );
}
