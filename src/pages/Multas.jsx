import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Receipt, Plus, Camera, X, Calendar, User, DollarSign, FileText, Loader2, CreditCard } from "lucide-react";
import { useFrotaData, isGestorOuAdmin } from "@/hooks/useFrotaData";
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
          {multas.map((m) => <MultaCard key={m.id} multa={m} />)}
        </div>
      )}

      {showForm && <FormMulta veiculos={veiculos} onClose={() => setShowForm(false)} onSalvo={() => { setShowForm(false); carregar(); }} />}
    </div>
  );
}

function MultaCard({ multa }) {
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
        {multa.status === "pendente" && (
          <button
            onClick={() => window.open("https://www.detran.gov.br", "_blank")}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            <CreditCard className="w-3.5 h-3.5" /> Pagar
          </button>
        )}
      </div>
    </div>
  );
}

function FormMulta({ veiculos, onClose, onSalvo }) {
  const [veiculoId, setVeiculoId] = useState(veiculos[0]?.id || "");
  const [fotoUrl, setFotoUrl] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

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
        onSalvo();
      } else {
        setErro(res.data?.error || "Erro ao processar multa");
      }
    } catch (e) {
      setErro(e.message || "Erro ao processar");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Registrar Multa</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

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
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:bg-muted/30">
              {processando ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Camera className="w-8 h-8 text-muted-foreground" />}
              <p className="text-sm text-muted-foreground mt-2">Tirar foto ou escolher imagem</p>
              <p className="text-xs text-muted-foreground/70">IA vai extrair os dados automaticamente</p>
              <input type="file" accept="image/*" capture="environment" onChange={handleUpload} className="sr-only" />
            </label>
          )}
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
      </div>
    </div>
  );
}