import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { formatarDataBR, diasAteVencimento } from "../../shared/frota-utils.ts";

// Converte unidade de tempo em dias
function unidadeParaDias(unidade) {
  switch (unidade) {
    case "dias": return 1;
    case "semanas": return 7;
    case "meses": return 30;
    case "anos": return 365;
    default: return 0;
  }
}

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
    hoje.setHours(0, 0, 0, 0);
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

      // 2. Planos de manutenção preventiva (por km e/ou tempo)
      const planos = await base44.asServiceRole.entities.PlanoManutencao.filter({ veiculo_id: veiculo.id, ativo: true });
      const odometroAtual = veiculo.odometro_atual || 0;

      for (const plano of planos) {
        let deveGerar = false;
        let motivo = "";

        // Gatilho por km
        if (plano.gatilho_km) {
          const ultimaKm = plano.ultima_execucao_odometro || 0;
          if (odometroAtual >= ultimaKm + plano.gatilho_km) {
            deveGerar = true;
            motivo = `Odômetro atual ${odometroAtual} km atingiu o gatilho de ${plano.gatilho_km} km (última execução em ${ultimaKm} km).`;
          }
        }

        // Gatilho por tempo
        if (!deveGerar && plano.gatilho_tempo_valor && plano.gatilho_tempo_unidade) {
          const diasUnidade = unidadeParaDias(plano.gatilho_tempo_unidade);
          const intervaloDias = plano.gatilho_tempo_valor * diasUnidade;
          if (intervaloDias > 0) {
            if (plano.ultima_execucao_data) {
              const ultima = new Date(plano.ultima_execucao_data);
              ultima.setHours(0, 0, 0, 0);
              const proxima = new Date(ultima);
              proxima.setDate(proxima.getDate() + intervaloDias);
              if (hoje >= proxima) {
                deveGerar = true;
                motivo = `Prazo de ${plano.gatilho_tempo_valor} ${plano.gatilho_tempo_unidade} atingido (última execução em ${formatarDataBR(plano.ultima_execucao_data)}).`;
              }
            } else {
              // Sem data de última execução — considera vencido
              deveGerar = true;
              motivo = `Plano sem registro de execução anterior. Realize a primeira execução e registre.`;
            }
          }
        }

        if (deveGerar) {
          // Idempotência: não cria se já existe pendência aberta para este plano
          const existentes = await base44.asServiceRole.entities.Pendencia.filter({
            veiculo_id: veiculo.id,
            tipo: "manutencao_programada",
            status: "aberto"
          });
          const jaExiste = existentes.some((p) => p.referencia_id === plano.id);
          if (!jaExiste) {
            const pend = await base44.asServiceRole.entities.Pendencia.create({
              titulo: `${plano.titulo} — ${veiculo.nome}`,
              tipo: "manutencao_programada",
              veiculo_id: veiculo.id,
              veiculo_nome: veiculo.nome,
              status: "aberto",
              descricao: `${motivo}${plano.descricao ? ` ${plano.descricao}` : ""}`,
              referencia_id: plano.id,
              prioridade: plano.gatilho_km && odometroAtual >= (plano.ultima_execucao_odometro || 0) + plano.gatilho_km ? "alta" : "media"
            });
            criadas.push(pend.titulo);
          }
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