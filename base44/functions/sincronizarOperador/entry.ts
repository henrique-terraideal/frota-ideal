import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sincronizarOperadorUnico } from '../../shared/sincronizar-operador.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Aceita payload do workflow (campos individuais) ou chamada manual (record)
    const user = body.record || {
      id: body.user_id || body.id,
      full_name: body.full_name,
      email: body.email,
      role: body.role,
      codigo_bordo: body.codigo_bordo,
    };

    return Response.json(await sincronizarOperadorUnico(base44, user));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});