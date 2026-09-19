import { createClient } from '@/lib/supabase/server';
import { extractDynamicColumns } from '@/lib/ventas/extract-dynamic-columns';
import { checkStockAlert } from '@/lib/ventas/check-stock-alert';
import { buildProductosMasVendidos } from '@/lib/ventas/build-productos-mas-vendidos';
import { ExcelUploader } from '@/components/ventas/excel-uploader';
import { CatalogoTable } from '@/components/ventas/catalogo-table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function StockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fechaDesde30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: productos }, { data: consumosRango }] = await Promise.all([
    supabase
      .from('productos')
      .select('*')
      .eq('tenant_id', user!.id)
      .eq('activo', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('consumos_turno')
      .select('producto_id, precio')
      .eq('tenant_id', user!.id)
      .gte('fecha', fechaDesde30Dias),
  ]);

  const lista = (productos ?? []).map((p) => ({
    ...p,
    atributos: (p.atributos as Record<string, unknown>) ?? {},
  }));
  const columnasDinamicas = extractDynamicColumns(lista);

  const productosConAlerta = lista.filter(
    (p) => checkStockAlert(p.stock, p.umbral_alerta_stock ?? null).requiereAlerta
  );

  const masVendidos = buildProductosMasVendidos({
    consumos: consumosRango ?? [],
    productos: lista,
  }).slice(0, 5);

  return (
    <main className="flex-1 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1 animate-fade-slide-in">Stock</h1>
      <p className="text-sm text-text-secondary mb-6 animate-fade-slide-in">
        Bebidas, comida, snacks — todo lo que se pueda agregar como consumo cuando cerrás un
        turno.
      </p>
      <div className="animate-fade-slide-in">
        <ExcelUploader />
      </div>

      {productosConAlerta.length > 0 && (
        <div className="rounded-lg border border-warning-bg bg-warning-bg/40 p-4 mb-4 animate-fade-slide-in">
          <p className="text-sm font-medium text-text-primary mb-2">
            ⚠️ {productosConAlerta.length} producto(s) con stock bajo
          </p>
          <div className="flex flex-wrap gap-2">
            {productosConAlerta.map((p) => (
              <span key={p.id} className="text-xs bg-warning-bg text-text-primary rounded-full px-2 py-1">
                {p.nombre}: {p.stock} u.
              </span>
            ))}
          </div>
        </div>
      )}

      {masVendidos.length > 0 && (
        <Card className="mb-6 animate-fade-slide-in">
          <CardHeader>
            <CardTitle>Más vendidos (últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {masVendidos.map((p, i) => (
                <div key={p.productoId} className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    {i + 1}. {p.nombre} {p.rubro && <span className="text-text-muted">({p.rubro})</span>}
                  </span>
                  <span className="font-medium">
                    {p.cantidad} u. — ${p.total}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
