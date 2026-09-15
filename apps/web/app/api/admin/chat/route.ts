import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/require-admin-session';
import { createServiceClient } from '@/lib/supabase/service-client';
import { callOpenRouter } from '@/lib/agent/openrouter-client';
import { executeAdminToolCall } from '@/lib/admin-agent/admin-tool-handlers';
import { handleAdminChatMessage } from '@/lib/admin-agent/handle-admin-chat-message';

export async function POST(request: NextRequest) {
  const session = requireAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { text, history } = await request.json();
  const supabase = createServiceClient();

  const result = await handleAdminChatMessage(text, history ?? [], {
    callOpenRouter,
    executeAdminToolCall: (name, args) => executeAdminToolCall(name, args, { supabase }),
  });

  return NextResponse.json(result);
}
