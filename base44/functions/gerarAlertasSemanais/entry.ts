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

    const ativos = await base44.asServiceRole.entities.Ativo.filter({ status: "ativo" });
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda
    const criadas = [];

    for (const ativo of ativos) {
      // 1. Pendência de limpeza toda segunda-feira (se não houver aberta)
      if (diaSemana === 1) {
        const limpezasAbertas = await base44.asServiceRole.entities.Pendencia.filter({
          ativo_id: ativo.id,
          tipo: "manutencao_programada",
          status: "aberto"
        });
        const jaTemLimpeza = limpezasAbertas.some((p) =>
          p.titulo.toLowerCase().includes("lavagem") || p.titulo.toLowerCase().includes("limpeza") || p.descricao?.toLowerCase().includes("lavagem") || p.descricao?.toLowerCase().includes("limpeza")
        );
        if (!jaTemLimpeza) {
          const pend = await base44.asServiceRole.entities.Pendencia.create({
            titulo: `Limpeza do ativo — ${ativo.nome}`,
            tipo: "manutencao_programada",
            ativo_id: ativo.id,
            ativo_nome: ativo.nome,
            status: "aberto",
            descricao: "Limpeza semanal programada para toda segunda-feira.",
            prioridade: "baixa"
          });
          criadas.push(pend.titulo);
        }
      }

      // 2. Planos de manutenção preventiva (por uso e/ou tempo)
      const planos = await base44.asServiceRole.entities.PlanoManutencao.filter({ ativo_id: ativo.id, ativo: true });
      // "Tempo de uso" atual: km/horas/ciclos (leitura) ou idade em dias (data_aquisicao)
      let usoAtual = ativo.odometro_atual || 0;
      if ((ativo.unidade_tempo_uso || "km") === "idade_dias" && ativo.data_aquisicao) {
        const diffMs = hoje.getTime() - new Date(ativo.data_aquisicao).getTime();
        usoAtual = Math.max(0, Math.floor(diffMs / 86400000));
      }

      for (const plano of planos) {
        let deveGerar = false;
        let motivo = "";

        // Gatilho por uso
        if (plano.gatilho_uso) {
          const ultimaLeitura = plano.ultima_execucao_leitura || 0;
          if (usoAtual >= ultimaLeitura + plano.gatilho_uso) {
            deveGerar = true;
            motivo = `Tempo de uso atual ${usoAtual} atingiu o gatilho de ${plano.gatilho_uso} (última execução em ${ultimaLeitura}).`;
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
              deveGerar = true;
              motivo = `Plano sem registro de execução anterior. Realize a primeira execução e registre.`;
            }
          }
        }

        if (deveGerar) {
          // Idempotência: não cria se já existe pendência aberta para este plano
          const existentes = await base44.asServiceRole.entities.Pendencia.filter({
            ativo_id: ativo.id,
            tipo: "manutencao_programada",
            status: "aberto"
          });
          const jaExiste = existentes.some((p) => p.referencia_id === plano.id);
          if (!jaExiste) {
            const pend = await base44.asServiceRole.entities.Pendencia.create({
              titulo: `${plano.titulo} — ${ativo.nome}`,
              tipo: "manutencao_programada",
              ativo_id: ativo.id,
              ativo_nome: ativo.nome,
              status: "aberto",
              descricao: `${motivo}${plano.descricao ? ` ${plano.descricao}` : ""}`,
              referencia_id: plano.id,
              prioridade: plano.gatilho_uso && usoAtual >= (plano.ultima_execucao_leitura || 0) + plano.gatilho_uso ? "alta" : "media"
            });
            criadas.push(pend.titulo);
          }
        }
      }

      // 3. Licenciamento a vencer em 30 dias
      if (ativo.data_licenciamento) {
        const dias = diasAteVencimento(ativo.data_licenciamento);
        if (dias !== null && dias >= 0 && dias <= 30) {
          const licExistentes = await base44.asServiceRole.entities.Pendencia.filter({
            ativo_id: ativo.id,
            tipo: "licenciamento",
            status: "aberto"
          });
          if (licExistentes.length === 0) {
            const pend = await base44.asServiceRole.entities.Pendencia.create({
              titulo: `Licenciamento a vencer — ${ativo.nome}`,
              tipo: "licenciamento",
              ativo_id: ativo.id,
              ativo_nome: ativo.nome,
              status: "aberto",
              descricao: `Vencimento do licenciamento em ${formatarDataBR(ativo.data_licenciamento)} (${dias} dias). Renove o licenciamento.`,
              data_limite: ativo.data_licenciamento,
              prioridade: dias <= 7 ? "alta" : "media"
            });
            criadas.push(pend.titulo);
          }
        }
      }

      // 4. IPVA a vencer em 30 dias
      if (ativo.data_ipva) {
        const dias = diasAteVencimento(ativo.data_ipva);
        if (dias !== null && dias >= 0 && dias <= 30) {
          const ipvaExistentes = await base44.asServiceRole.entities.Pendencia.filter({
            ativo_id: ativo.id,
            tipo: "ipva",
            status: "aberto"
          });
          if (ipvaExistentes.length === 0) {
            const pend = await base44.asServiceRole.entities.Pendencia.create({
              titulo: `IPVA a vencer — ${ativo.nome}`,
              tipo: "ipva",
              ativo_id: ativo.id,
              ativo_nome: ativo.nome,
              status: "aberto",
              descricao: `Vencimento do IPVA em ${formatarDataBR(ativo.data_ipva)} (${dias} dias). Realize o pagamento.`,
              data_limite: ativo.data_ipva,
              prioridade: dias <= 7 ? "alta" : "media"
            });
            criadas.push(pend.titulo);
          }
        }
      }
    }

    return Response.json({
      success: true,
      veiculos_verificados: ativos.length,
      ativos_verificados: ativos.length,
      pendencias_criadas: criadas,
      total_criadas: criadas.length
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});