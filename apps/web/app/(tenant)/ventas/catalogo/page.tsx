import { createClient } from '@/lib/supabase/server';
import { extractDynamicColumns } from '@/lib/ventas/extract-dynamic-columns';
import { ExcelUploader } from '@/components/ventas/excel-uploader';
import { CatalogoTable } from '@/components/ventas/catalogo-table';

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

  const lista = (productos ?? []).map((p) => ({
    ...p,
    atributos: (p.atributos as Record<string, unknown>) ?? {},
  }));
  const columnasDinamicas = extractDynamicColumns(lista);

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Catálogo</h1>
      <ExcelUploader />

      {lista.length > 0 ? (
        <div className="overflow-x-auto">
          <CatalogoTable productos={lista} columnasDinamicas={columnasDinamicas} />
        </div>
      ) : (
        <p className="text-sm text-text-muted mt-4">
          Todavía no cargaste productos. Subí un Excel para empezar.
        </p>
      )}
    </main>
  );
}
