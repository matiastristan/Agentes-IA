import { describe, it, expect, vi } from 'vitest';
import { buildCatalogoParaNegocio } from './build-catalogo-para-negocio';

function makeSupabaseMock(rows: Array<{ id: string; nombre: string; precio: number }>) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: rows }),
        }),
      }),
    }),
  };
}

describe('buildCatalogoParaNegocio', () => {
  it('para tipo_crm turnos, arma el catálogo desde la tabla servicios', async () => {
    const supabase = makeSupabaseMock([
      { id: 's1', nombre: 'Fútbol 5 - 1 hora', precio: 42000 },
      { id: 's2', nombre: 'Fútbol 7 - 1 hora', precio: 55000 },
    ]);

    const result = await buildCatalogoParaNegocio(supabase as never, 'tenant-1', 'turnos');

    expect(supabase.from).toHaveBeenCalledWith('servicios');
    expect(result).toEqual([
      { id: 's1', nombre: 'Fútbol 5 - 1 hora', precio: 42000 },
      { id: 's2', nombre: 'Fútbol 7 - 1 hora', precio: 55000 },
    ]);
  });

  it('para tipo_crm ventas, arma el catálogo desde la tabla productos', async () => {
    const supabase = makeSupabaseMock([{ id: 'p1', nombre: 'Alimento para perro 15kg', precio: 25000 }]);

    const result = await buildCatalogoParaNegocio(supabase as never, 'tenant-2', 'ventas');

    expect(supabase.from).toHaveBeenCalledWith('productos');
    expect(result).toEqual([{ id: 'p1', nombre: 'Alimento para perro 15kg', precio: 25000 }]);
  });

  it('devuelve un array vacío si la tabla no tiene filas todavía', async () => {
    const supabase = makeSupabaseMock([]);
    const result = await buildCatalogoParaNegocio(supabase as never, 'tenant-3', 'turnos');
    expect(result).toEqual([]);
  });
});
