import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sincronizarOperadorUnico } from '../../shared/sincronizar-operador.ts';

// Endpoint temporário para sincronizar usuários já cadastrados (backfill).
// Pode ser deletado após executar uma vez.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    let criados = 0;
    let atualizados = 0;
    let skipados = 0;
    const detalhes = [];

    for (const u of users) {
      if (!u.codigo_bordo) {
        skipados++;
        continue;
      }
      const r = await sincronizarOperadorUnico(base44, u);
      if (r.action === 'created') criados++;
      else if (r.action === 'updated') atualizados++;
      detalhes.push({ user_id: u.id, nome: u.full_name || u.email, ...r });
    }

    return Response.json({ total: users.length, criados, atualizados, skipados, detalhes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});