import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types_db';

/**
 * Cliente con SUPABASE_SERVICE_ROLE_KEY — bypasea RLS por completo.
 * Solo se usa en el webhook de WhatsApp (Route Handler, corre en el servidor,
 * nunca en el navegador). El webhook no tiene un usuario logueado — necesita
 * buscar el negocio por phone_number_id ANTES de saber quién es el tenant.
 *
 * CRÍTICO: como este cliente bypasea RLS, cada query que lo use en
 * lib/agent/tool-handlers.ts debe filtrar por tenant_id explícitamente en el
 * código (ya lo hace). Nunca asumas que RLS te protege acá.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
