import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: negocio } = await supabase
    .from('negocio')
    .select('nombre, tipo_crm, color_palette')
    .eq('tenant_id', user!.id)
    .single();

  const tipoCrm = (negocio?.tipo_crm as 'ventas' | 'turnos') ?? 'turnos';

  return (
    <div data-palette={negocio?.color_palette ?? 'cool'} className="flex min-h-screen">
      <Sidebar tipoCrm={tipoCrm} nombreNegocio={negocio?.nombre ?? 'Tu negocio'} />
      <div className="flex-1 flex flex-col">
        <MobileNav tipoCrm={tipoCrm} />
        {children}
      </div>
    </div>
  );
}
