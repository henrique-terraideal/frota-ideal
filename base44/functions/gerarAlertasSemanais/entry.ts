import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { formatarDataBR, diasAteVencimento } from "../../shared/frota-utils.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Pode ser chamado por workflow (service role) ou por admin autenticado
    let isAuthorized = true;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== "admin") isAuthorized = false;
    } catch {
      // Sem auth = provavelmente chamada do workflow (service role)
    }

    const veiculos = await base44.asServiceRole.entities.Veiculo.filter({ status: "ativo" });
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda
    const criadas = [];

    for (const veiculo of veiculos) {
      // 1. Pendência de lavagem toda segunda-feira (se não houver aberta)
      if (diaSemana === 1) {
        const lavagensAbertas = await base44.asServiceRole.entities.Pendencia.filter({
          veiculo_id: veiculo.id,
          tipo: "manutencao_programada",
          status: "aberto"
        });
        const jaTemLavagem = lavagensAbertas.some((p) =>
          p.titulo.toLowerCase().includes("lavagem") || p.descricao?.toLowerCase().includes("lavagem")
        );
        if (!jaTemLavagem) {
          const pend = await base44.asServiceRole.entities.Pendencia.create({
            titulo: `Lavagem do veículo — ${veiculo.nome}`,
            tipo: "manutencao_programada",
            veiculo_id: veiculo.id,
            veiculo_nome: veiculo.nome,
            status: "aberto",
            descricao: "Lavagem semanal programada para toda segunda-feira.",
            prioridade: "baixa"
          });
          criadas.push(pend.titulo);
        }
      }

      // 2. Revisão a cada 10.000 km
      const odometroAtual = veiculo.odometro_atual || 0;
      const proximaRevisao = veiculo.odometro_proxima_revisao || 10000;
      if (odometroAtual >= proximaRevisao) {
        const revisoesAbertas = await base44.asServiceRole.entities.Pendencia.filter({
          veiculo_id: veiculo.id,
          tipo: "manutencao_programada",
          status: "aberto"
        });
        const jaTemRevisao = revisoesAbertas.some((p) =>
          p.titulo.toLowerCase().includes("revis") || p.descricao?.toLowerCase().includes("revis")
        );
        if (!jaTemRevisao) {
          const pend = await base44.asServiceRole.entities.Pendencia.create({
            titulo: `Revisão na concessionária — ${veiculo.nome}`,
            tipo: "manutencao_programada",
            veiculo_id: veiculo.id,
            veiculo_nome: veiculo.nome,
            status: "aberto",
            descricao: `Odômetro atual: ${odometroAtual} km. Revisão programada aos ${proximaRevisao} km. Agendar revisão na concessionária.`,
            prioridade: "alta"
          });
          criadas.push(pend.titulo);
          // Atualiza próxima revisão
          const novaProxima = Math.ceil(odometroAtual / 10000) * 10000 + 10000;
          await base44.asServiceRole.entities.Veiculo.update(veiculo.id, {
            odometro_proxima_revisao: novaProxima
          });
        }
      }

      // 3. Licenciamento a vencer em 30 dias
      if (veiculo.data_licenciamento) {
        const dias = diasAteVencimento(veiculo.data_licenciamento);
        if (dias !== null && dias >= 0 && dias <= 30) {
          const licExistentes = await base44.asServiceRole.entities.Pendencia.filter({
            veiculo_id: veiculo.id,
            tipo: "licenciamento",
            status: "aberto"
          });
          if (licExistentes.length === 0) {
            const pend = await base44.asServiceRole.entities.Pendencia.create({
              titulo: `Licenciamento a vencer — ${veiculo.nome}`,
              tipo: "licenciamento",
              veiculo_id: veiculo.id,
              veiculo_nome: veiculo.nome,
              status: "aberto",
              descricao: `Vencimento do licenciamento em ${formatarDataBR(veiculo.data_licenciamento)} (${dias} dias). Renove o licenciamento.`,
              data_limite: veiculo.data_licenciamento,
              prioridade: dias <= 7 ? "alta" : "media"
            });
            criadas.push(pend.titulo);
          }
        }
      }

      // 4. IPVA a vencer em 30 dias
      if (veiculo.data_ipva) {
        const dias = diasAteVencimento(veiculo.data_ipva);
        if (dias !== null && dias >= 0 && dias <= 30) {
          const ipvaExistentes = await base44.asServiceRole.entities.Pendencia.filter({
            veiculo_id: veiculo.id,
            tipo: "ipva",
            status: "aberto"
          });
          if (ipvaExistentes.length === 0) {
            const pend = await base44.asServiceRole.entities.Pendencia.create({
              titulo: `IPVA a vencer — ${veiculo.nome}`,
              tipo: "ipva",
              veiculo_id: veiculo.id,
              veiculo_nome: veiculo.nome,
              status: "aberto",
              descricao: `Vencimento do IPVA em ${formatarDataBR(veiculo.data_ipva)} (${dias} dias). Realize o pagamento.`,
              data_limite: veiculo.data_ipva,
              prioridade: dias <= 7 ? "alta" : "media"
            });
            criadas.push(pend.titulo);
          }
        }
      }
    }

    return Response.json({
      success: true,
      veiculos_verificados: veiculos.length,
      pendencias_criadas: criadas,
      total_criadas: criadas.length
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});