import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Receipt, Plus, Camera, X, Calendar, User, FileText, Loader2, CheckCircle2, Check } from "lucide-react";
import { useFrotaData } from "@/hooks/useFrotaData";
import { formatarDataBR, formatarDataHoraBR, formatarMoeda, STATUS_MULTA } from "@/lib/frota-constants";

export default function Multas() {
  const { veiculos } = useFrotaData();
  const [multas, setMultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const data = await base44.entities.Multa.list("-created_date", 100);
      setMultas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div className="min-h-full">
      <div className="bg-white border-b border-border px-5 pt-6 pb-3 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Multas</h1>
            <p className="text-xs text-muted-foreground">{multas.length} multa(s)</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : multas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma multa registrada</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-primary text-sm font-medium">Registrar primeira multa</button>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-2">
          {multas.map((m) => <MultaCard key={m.id} multa={m} onAtualizado={carregar} />)}
        </div>
      )}

      {showForm && <FormMulta veiculos={veiculos} onClose={() => setShowForm(false)} onSalvo={() => { setShowForm(false); carregar(); }} />}
    </div>
  );
}

function MultaCard({ multa, onAtualizado }) {
  const [showPagamento, setShowPagamento] = useState(false);
  const [obs, setObs] = useState(multa.observacao_pagamento || "");
  const [salvando, setSalvando] = useState(false);

  async function marcarComoPaga() {
    setSalvando(true);
    try {
      await base44.entities.Multa.update(multa.id, {
        status: "paga",
        data_pagamento: new Date().toISOString().split("T")[0],
        observacao_pagamento: obs
      });
      onAtualizado();
    } catch (e) { alert(e.message); } finally { setSalvando(false); }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm">{multa.descricao_infracao || "Infração"}</p>
          <p className="text-xs text-muted-foreground">{multa.veiculo_nome}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_MULTA[multa.status]?.cor || ""}`}>{STATUS_MULTA[multa.status]?.label || multa.status}</span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> {formatarDataHoraBR(multa.data_infracao)}</div>
        {multa.local_infracao && <div className="flex items-center gap-2"><FileText className="w-3 h-3" /> {multa.local_infracao}</div>}
        {multa.motorista_identificado_nome && (
          <div className="flex items-center gap-2"><User className="w-3 h-3" /> {multa.motorista_identificado_nome}</div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <span className="text-lg font-bold text-red-600">{formatarMoeda(multa.valor)}</span>
        {multa.status === "paga" ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paga{multa.data_pagamento ? ` em ${formatarDataBR(multa.data_pagamento)}` : ""}
          </span>
        ) : (
          <button onClick={() => setShowPagamento(!showPagamento)} className="text-xs text-primary font-medium">
            {showPagamento ? "Cancelar" : "Marcar como paga"}
          </button>
        )}
      </div>
      {showPagamento && multa.status === "pendente" && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Observação de pagamento (opcional)</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Pago via PIX em 22/07/2026" rows={2} className="w-full border border-border rounded-lg px-2 py-1.5 text-xs resize-none focus:border-primary outline-none" />
          <button onClick={marcarComoPaga} disabled={salvando} className="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Confirmar pagamento
          </button>
        </div>
      )}
      {multa.status === "paga" && multa.observacao_pagamento && (
        <p className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">📝 {multa.observacao_pagamento}</p>
      )}
    </div>
  );
}

function FormMulta({ veiculos, onClose, onSalvo }) {
  const [step, setStep] = useState("upload"); // upload -> resultado
  const [veiculoId, setVeiculoId] = useState(veiculos[0]?.id || "");
  const [fotoUrl, setFotoUrl] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);
  const [motoristas, setMotoristas] = useState([]);
  const [motoristaManual, setMotoristaManual] = useState("");
  const [salvandoMotorista, setSalvandoMotorista] = useState(false);
  const fileInputRef = useRef(null);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setErro("");
    setProcessando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFotoUrl(file_url);
    } catch (e) {
      setErro("Erro ao enviar foto: " + e.message);
    } finally {
      setProcessando(false);
    }
  }

  async function processarFoto() {
    if (!fotoUrl || !veiculoId) return;
    setProcessando(true);
    setErro("");
    try {
      const res = await base44.functions.invoke("processarFotoMulta", { foto_url: fotoUrl, veiculo_id: veiculoId });
      if (res.data?.success) {
        setResultado(res.data);
        const motoristasAtivos = await base44.entities.Motorista.filter({ ativo: true });
        setMotoristas(motoristasAtivos);
        setStep("resultado");
      } else {
        setErro(res.data?.error || "Erro ao processar multa");
      }
    } catch (e) {
      setErro(e.message || "Erro ao processar");
    } finally {
      setProcessando(false);
    }
  }

  async function identificarMotoristaManual() {
    if (!motoristaManual || !resultado?.multa_id) return;
    setSalvandoMotorista(true);
    try {
      const motorista = motoristas.find((m) => m.id === motoristaManual);
      await base44.entities.Multa.update(resultado.multa_id, {
        motorista_identificado_id: motorista.id,
        motorista_identificado_nome: motorista.nome
      });
      const pendencias = await base44.entities.Pendencia.filter({ referencia_id: resultado.multa_id, tipo: "multa" });
      if (pendencias.length > 0) {
        await base44.entities.Pendencia.update(pendencias[0].id, {
          responsavel_id: motorista.id,
          responsavel_nome: motorista.nome,
          descricao: pendencias[0].descricao.replace("Motorista não identificado", `Motorista identificado: ${motorista.nome}`)
        });
      }
      setResultado({ ...resultado, motorista_identificado: motorista.nome, motorista_id: motorista.id });
      setMotoristaManual("");
    } catch (e) { alert(e.message); } finally { setSalvandoMotorista(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{step === "resultado" ? "Multa Registrada" : "Registrar Multa"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        {step === "upload" && (
          <>
            <label className="text-xs font-semibold text-muted-foreground">Veículo</label>
            <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mb-4 focus:border-primary outline-none">
              {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>

            <label className="text-xs font-semibold text-muted-foreground">Foto da Notificação</label>
            <div className="mt-1">
              {fotoUrl ? (
                <div className="relative">
                  <img src={fotoUrl} alt="Multa" className="w-full rounded-xl max-h-48 object-cover" />
                  <button onClick={() => setFotoUrl(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"><X className="w-4 h-4 text-white" /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:bg-muted/30 w-full"
                >
                  {processando ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Camera className="w-8 h-8 text-muted-foreground" />}
                  <p className="text-sm text-muted-foreground mt-2">Tirar foto ou escolher imagem</p>
                  <p className="text-xs text-muted-foreground/70">IA vai extrair os dados automaticamente</p>
                </button>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} className="hidden" />
            </div>

            {fotoUrl && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">A IA vai analisar a foto, extrair data/hora/valor/local e identificar o motorista que estava dirigindo no momento da infração.</p>
              </div>
            )}

            {erro && <p className="text-sm text-red-500 mt-3">{erro}</p>}

            <button
              onClick={processarFoto}
              disabled={!fotoUrl || processando}
              className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processando ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando com IA...</> : "Processar e Salvar Multa"}
            </button>
          </>
        )}

        {step === "resultado" && resultado && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-700">Multa registrada com sucesso!</p>
            </div>

            {fotoUrl && <img src={fotoUrl} alt="Multa" className="w-full rounded-xl max-h-40 object-cover" />}

            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Dados extraídos pela IA</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Infração:</span><span className="font-medium text-right">{resultado.dados_extraidos?.descricao_infracao || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data/Hora:</span><span className="font-medium">{resultado.dados_extraidos?.data_infracao || "—"} {resultado.dados_extraidos?.hora_infracao || ""}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Local:</span><span className="font-medium text-right">{resultado.dados_extraidos?.local_infracao || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Auto nº:</span><span className="font-medium">{resultado.dados_extraidos?.numero_auto || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pontos:</span><span className="font-medium">{resultado.dados_extraidos?.pontos || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vencimento:</span><span className="font-medium">{resultado.dados_extraidos?.data_vencimento || "—"}</span></div>
                <div className="flex justify-between border-t border-border/50 pt-1.5"><span className="text-muted-foreground">Valor:</span><span className="font-bold text-red-600">{formatarMoeda(resultado.dados_extraidos?.valor || 0)}</span></div>
              </div>
            </div>

            {resultado.motorista_identificado ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <User className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">Motorista identificado: <strong>{resultado.motorista_identificado}</strong></p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-xs text-orange-700">
                    <strong>Motorista não identificado automaticamente.</strong> O sistema cruzou os registros de uso mas não encontrou um condutor para este horário. Isso pode ocorrer se o registro de uso ainda não foi cadastrado. Você pode identificar o motorista manualmente.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Identificar motorista manualmente</label>
                  <div className="flex gap-2 mt-1">
                    <select value={motoristaManual} onChange={(e) => setMotoristaManual(e.target.value)} className="flex-1 border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none">
                      <option value="">Selecione...</option>
                      {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                    <button onClick={identificarMotoristaManual} disabled={!motoristaManual || salvandoMotorista} className="px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1">
                      {salvandoMotorista ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button onClick={onSalvo} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold">
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}