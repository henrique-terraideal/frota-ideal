import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { reconciliarTodos } from '../../shared/sincronizar-operador.ts';

// Reconcilia Users -> Operadores. Disparada pelo workflow agendado (sem usuário)
// e pode ser chamada manualmente por admin (retorna detalhes por usuário).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch (e) {
      // Sem usuário (execução via workflow agendado) — reconciliação prossegue
    }

    return Response.json(await reconciliarTodos(base44, isAdmin));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});