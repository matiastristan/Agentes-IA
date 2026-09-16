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
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6 animate-fade-slide-in">
        Catálogo
      </h1>
      <div className="animate-fade-slide-in">
        <ExcelUploader />
      </div>

      {lista.length > 0 ? (
        <div className="overflow-x-auto animate-fade-slide-in">
          <CatalogoTable productos={lista} columnasDinamicas={columnasDinamicas} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-10 text-center mt-4 animate-fade-slide-in">
          <p className="text-sm text-text-muted">
            Todavía no cargaste productos. Subí un Excel para empezar.
          </p>
        </div>
      )}
    </main>
  );
}
