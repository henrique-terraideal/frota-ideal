import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Check, X, Gauge, AlertCircle, CheckCircle2, Car } from "lucide-react";
import { useFrotaData } from "@/hooks/useFrotaData";

export default function Checklist() {
  const { motorista, veiculos, loading } = useFrotaData();
  const navigate = useNavigate();
  const [step, setStep] = useState("veiculo"); // veiculo -> perguntas -> odometro -> enviando -> sucesso
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [perguntas, setPerguntas] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [odometro, setOdometro] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function loadPerguntas() {
      const items = await base44.entities.ChecklistItem.filter({ ativo: true });
      const ordenados = items.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      setPerguntas(ordenados);
      const respInit = {};
      ordenados.forEach((p) => (respInit[p.id] = null));
      setRespostas(respInit);
    }
    loadPerguntas();
  }, []);

  const veiculosAtivos = veiculos.filter((v) => v.status === "ativo");

  const temAnomalia = Object.values(respostas).some((r) => r === false);
  const todasRespondidas = Object.values(respostas).every((r) => r !== null) && perguntas.length > 0;

  async function enviarChecklist() {
    if (!motorista?.id) {
      setErro("Seu usuário não está vinculado a um motorista. Peça ao administrador para cadastrá-lo.");
      return;
    }
    setStep("enviando");
    setErro("");
    try {
      const dataHoraISO = new Date().toISOString();
      const odoNum = parseInt(odometro) || veiculoSelecionado.odometro_atual || 0;

      const registro = await base44.entities.RegistroUso.create({
        veiculo_id: veiculoSelecionado.id,
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        veiculo_nome: veiculoSelecionado.nome,
        data_hora_inicio: dataHoraISO,
        odometro_registrado: odoNum,
        origem: "app",
        checklist_completo: true,
        tem_anomalia: temAnomalia,
        notas: temAnomalia ? "Anomalia reportada via app" : "Registro via app"
      });

      const respostasCriar = perguntas.map((p) => ({
        registro_uso_id: registro.id,
        checklist_item_id: p.id,
        pergunta_texto: p.pergunta,
        resposta: respostas[p.id],
        observacao: ""
      }));
      await base44.entities.RespostaChecklist.bulkCreate(respostasCriar);

      // Atualiza odômetro do veículo
      if (odoNum > (veiculoSelecionado.odometro_atual || 0)) {
        await base44.entities.Veiculo.update(veiculoSelecionado.id, { odometro_atual: odoNum });
      }

      // Cria pendência de anomalia (o workflow também criaria, mas garantimos aqui)
      if (temAnomalia) {
        const existentes = await base44.entities.Pendencia.filter({ referencia_id: registro.id, tipo: "anomalia" });
        if (existentes.length === 0) {
          const naoRespondidas = perguntas.filter((p) => respostas[p.id] === false).map((p) => p.pergunta);
          await base44.entities.Pendencia.create({
            titulo: `Anomalia reportada por ${motorista.nome}`,
            tipo: "anomalia",
            veiculo_id: veiculoSelecionado.id,
            veiculo_nome: veiculoSelecionado.nome,
            status: "aberto",
            descricao: `Itens reprovados no checklist: ${naoRespondidas.join("; ")}`,
            referencia_id: registro.id,
            prioridade: "media"
          });
        }
      }

      setStep("sucesso");
    } catch (e) {
      setErro(e.message || "Erro ao salvar registro");
      setStep("odometro");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (step === "sucesso") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${temAnomalia ? "bg-orange-100" : "bg-green-100"}`}>
          {temAnomalia ? <AlertCircle className="w-10 h-10 text-orange-500" /> : <CheckCircle2 className="w-10 h-10 text-green-600" />}
        </div>
        <h1 className="text-2xl font-bold mb-2">{temAnomalia ? "Registro com Anomalia" : "Tudo Certo!"}</h1>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
          {temAnomalia
            ? "Seu registro foi salvo. Uma pendência de anomalia foi criada no Kanban para o gestor verificar."
            : "Seu uso do veículo foi registrado com sucesso. Tenha uma boa viagem!"}
        </p>
        <button onClick={() => navigate("/")} className="w-full max-w-xs bg-primary text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform">
          Voltar ao Início
        </button>
        <button onClick={() => { setStep("veiculo"); setVeiculoSelecionado(null); setRespostas({}); setOdometro(""); }} className="mt-2 text-sm text-primary font-medium py-2">
          Novo Registro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header verde */}
      <div className="bg-gradient-to-br from-primary to-green-700 text-white px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="w-5 h-5" />
          <h1 className="text-xl font-bold">Checklist de Saída</h1>
        </div>
        <p className="text-white/80 text-xs">Responda rapidamente para registrar seu uso</p>
      </div>

      <div className="px-5 -mt-3">
        {/* Step: Seleção de veículo */}
        {step === "veiculo" && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <h2 className="font-bold text-sm mb-3">Selecione o veículo</h2>
            {veiculosAtivos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum veículo ativo disponível</p>
            ) : (
              <div className="space-y-2">
                {veiculosAtivos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setVeiculoSelecionado(v); setStep("perguntas"); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.modelo || v.tipo} • {(v.odometro_atual || 0).toLocaleString("pt-BR")} km</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Perguntas */}
        {step === "perguntas" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Car className="w-4 h-4" />
              <span className="font-medium">{veiculoSelecionado.nome}</span>
            </div>
            {perguntas.map((p, idx) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-border p-4">
                <p className="font-semibold text-sm mb-3">{idx + 1}. {p.pergunta}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRespostas({ ...respostas, [p.id]: true })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all ${respostas[p.id] === true ? "bg-green-500 text-white border-green-500" : "bg-white text-green-600 border-green-200"}`}
                  >
                    <Check className="w-4 h-4" /> Sim
                  </button>
                  <button
                    onClick={() => setRespostas({ ...respostas, [p.id]: false })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-all ${respostas[p.id] === false ? "bg-red-500 text-white border-red-500" : "bg-white text-red-600 border-red-200"}`}
                  >
                    <X className="w-4 h-4" /> Não
                  </button>
                </div>
              </div>
            ))}

            {temAnomalia && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <p className="text-xs text-orange-700">Há itens reprovados. Uma pendência será criada no Kanban automaticamente.</p>
              </div>
            )}

            <button
              onClick={() => todasRespondidas ? setStep("odometro") : setErro("Responda todas as perguntas")}
              disabled={!todasRespondidas}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${todasRespondidas ? "bg-primary text-white active:scale-[0.98]" : "bg-muted text-muted-foreground"}`}
            >
              Continuar
            </button>
            {erro && <p className="text-xs text-red-500 text-center">{erro}</p>}
          </div>
        )}

        {/* Step: Odômetro */}
        {step === "odometro" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-sm">Odômetro Atual</h2>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={odometro}
                onChange={(e) => setOdometro(e.target.value)}
                placeholder={(veiculoSelecionado.odometro_atual || 0).toString()}
                className="w-full text-center text-3xl font-bold tabular-nums border-2 border-border rounded-xl py-4 focus:border-primary outline-none"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center mt-2">Informe a quilometragem atual do painel</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
              <h3 className="font-bold text-xs text-muted-foreground mb-2">Resumo</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Veículo:</span><span className="font-medium">{veiculoSelecionado.nome}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Motorista:</span><span className="font-medium">{motorista?.nome}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Checklist:</span><span className={`font-medium ${temAnomalia ? "text-orange-600" : "text-green-600"}`}>{temAnomalia ? "Com anomalia" : "Tudo OK"}</span></div>
              </div>
            </div>

            <button
              onClick={enviarChecklist}
              disabled={step === "enviando"}
              className="w-full py-4 rounded-2xl font-bold text-base bg-primary text-white active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {step === "enviando" ? "Salvando..." : "Confirmar e Registrar"}
            </button>
            {erro && <p className="text-xs text-red-500 text-center">{erro}</p>}
            <button onClick={() => setStep("perguntas")} className="w-full text-sm text-muted-foreground py-2">Voltar</button>
          </div>
        )}
      </div>
      <div className="h-4" />
    </div>
  );
}