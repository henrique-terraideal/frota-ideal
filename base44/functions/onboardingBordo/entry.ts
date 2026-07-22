import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // Lista ativos ativos para o passo 4 do onboarding
    if (action === "listar") {
      const ativos = await base44.asServiceRole.entities.Ativo.filter({ status: "ativo" });
      return Response.json({
        veiculos: ativos.map((a) => ({ id: a.id, nome: a.nome })),
        ativos: ativos.map((a) => ({ id: a.id, nome: a.nome }))
      });
    }

    // Vincula (ou cria) um ComputadorDeBordo ao ativo selecionado
    if (action === "vincular") {
      const { device_id, veiculo_id } = body;
      if (!device_id || !veiculo_id) {
        return Response.json({ error: "device_id e veiculo_id são obrigatórios" }, { status: 400 });
      }

      const ativo = await base44.asServiceRole.entities.Ativo.get(veiculo_id);
      const ativo_nome = ativo?.nome || "";

      // Se já existe um dispositivo com este device_id, atualiza o vínculo
      const existentes = await base44.asServiceRole.entities.ComputadorDeBordo.filter({ device_id });
      if (existentes.length > 0) {
        const atualizado = await base44.asServiceRole.entities.ComputadorDeBordo.update(existentes[0].id, {
          ativo_id: veiculo_id,
          ativo_nome,
          ativo: true
        });
        return Response.json({ success: true, dispositivo: atualizado, criado: false });
      }

      // Senão, cria um novo registro
      const novo = await base44.asServiceRole.entities.ComputadorDeBordo.create({
        device_id,
        ativo_id: veiculo_id,
        ativo_nome,
        nome: `Bordo - ${ativo_nome}`,
        ativo: true,
        versao_checklist: 0
      });
      return Response.json({ success: true, dispositivo: novo, criado: true });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});