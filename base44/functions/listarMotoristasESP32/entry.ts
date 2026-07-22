import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Endpoint PÚBLICO — o ESP32 faz GET para carregar a lista de motoristas
    const base44 = createClientFromRequest(req);

    const motoristas = await base44.asServiceRole.entities.Motorista.filter({ ativo: true });

    // Retorna apenas nome e codigo_bordo para o dispositivo
    const lista = motoristas.map((m) => ({
      nome: m.nome,
      codigo_bordo: m.codigo_bordo || ""
    }));

    return Response.json(lista);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});