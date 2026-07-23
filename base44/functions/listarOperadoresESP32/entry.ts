import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os operadores ativos que possuem codigo_bordo preenchido
    const operadores = await base44.asServiceRole.entities.Operador.filter({
      ativo: true,
    });

    // Filtra apenas quem tem codigo_bordo e ordena
    const lista = operadores
      .filter((o) => o.codigo_bordo && String(o.codigo_bordo).trim() !== '')
      .sort((a, b) =>
        String(a.codigo_bordo).localeCompare(String(b.codigo_bordo), 'pt-BR', { numeric: true })
      )
      .map((o) => ({
        codigo: String(o.codigo_bordo).trim(),
        nome: o.nome || 'Operador',
      }));

    // Retorna nas duas chaves para compatibilidade com firmware antigo e novo
    return Response.json({
      operadores: lista,
      motoristas: lista, // retrocompatibilidade firmware < v2.3
      total: lista.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});