import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Endpoint PÚBLICO — o ESP32 faz GET para carregar a lista de motoristas
    const base44 = createClientFromRequest(req);

    const motoristas = await base44.asServiceRole.entities.Motorista.filter({ ativo: true });

    // Ordena por codigo_bordo e retorna no formato esperado pelo dispositivo
    const lista = motoristas
      .filter((m) => m.codigo_bordo)
      .sort((a, b) => String(a.codigo_bordo).localeCompare(String(b.codigo_bordo), "pt-BR", { numeric: true }))
      .map((m) => ({
        codigo: m.codigo_bordo,
        nome: m.nome
      }));

    return Response.json({ motoristas: lista });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});