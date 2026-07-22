import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Endpoint PÚBLICO — o ESP32 faz GET para carregar a lista de motoristas
    const base44 = createClientFromRequest(req);

    // Lista usuários que possuem código de bordo (todos os motoristas)
    const usuarios = await base44.asServiceRole.entities.User.list();

    // Ordena por codigo_bordo e retorna no formato esperado pelo dispositivo
    const lista = usuarios
      .filter((u) => u.codigo_bordo)
      .sort((a, b) => String(a.codigo_bordo).localeCompare(String(b.codigo_bordo), "pt-BR", { numeric: true }))
      .map((u) => ({
        codigo: u.codigo_bordo,
        nome: u.full_name || u.email
      }));

    return Response.json({ motoristas: lista });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});