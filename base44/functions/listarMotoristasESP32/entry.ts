import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    // Endpoint PÚBLICO — o ESP32 faz GET para carregar a lista de operadores
    const base44 = createClientFromRequest(req);

    // Lista operadores ativos que possuem código de bordo
    const operadores = await base44.asServiceRole.entities.Operador.filter({ ativo: true });

    // Ordena por codigo_bordo e retorna no formato esperado pelo dispositivo
    const lista = operadores
      .filter((o) => o.codigo_bordo)
      .sort((a, b) => String(a.codigo_bordo).localeCompare(String(b.codigo_bordo), "pt-BR", { numeric: true }))
      .map((o) => ({
        codigo: o.codigo_bordo,
        nome: o.nome
      }));

    // Retrocompatibilidade: mantém a chave "motoristas" para firmware antigo e adiciona "operadores"
    return Response.json({ motoristas: lista, operadores: lista });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});