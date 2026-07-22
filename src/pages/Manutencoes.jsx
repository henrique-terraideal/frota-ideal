import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, Plus, X, Calendar, DollarSign, Check, Filter } from "lucide-react";
import { useFrotaData } from "@/hooks/useFrotaData";
import { formatarDataBR, formatarMoeda, TIPOS_MANUTENCAO, STATUS_MANUTENCAO } from "@/lib/frota-constants";

export default function Manutencoes() {
  const { veiculos } = useFrotaData();
  const [manutencoes, setManutencoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const data = await base44.entities.Manutencao.list("-created_date", 100);
      setManutencoes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = filtroStatus ? manutencoes.filter((m) => m.status === filtroStatus) : manutencoes;

  return (
    <div className="min-h-full">
      <div className="bg-white border-b border-border px-5 pt-6 pb-3 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Manutenções</h1>
            <p className="text-xs text-muted-foreground">{filtradas.length} manutenção(ões)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center"><Filter className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></button>
        </div>
      </div>

      {showFilters && (
        <div className="px-5 py-2 flex gap-2 overflow-x-auto bg-white border-b border-border">
          <button onClick={() => setFiltroStatus(null)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!filtroStatus ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>Todas</button>
          {Object.entries(STATUS_MANUTENCAO).map(([k, v]) => (
            <button key={k} onClick={() => setFiltroStatus(filtroStatus === k ? null : k)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filtroStatus === k ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{v.label}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wrench className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-2">
          {filtradas.map((m) => <ManutencaoCard key={m.id} manutencao={m} onUpdate={carregar} />)}
        </div>
      )}

      {showForm && <FormManutencao veiculos={veiculos} onClose={() => setShowForm(false)} onSalvo={() => { setShowForm(false); carregar(); }} />}
    </div>
  );
}

function ManutencaoCard({ manutencao, onUpdate }) {
  async function marcarRealizada() {
    try {
      await base44.entities.Manutencao.update(manutencao.id, {
        status: "realizada",
        data_realizada: new Date().toISOString().split("T")[0]
      });
      onUpdate();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm">{TIPOS_MANUTENCAO[manutencao.tipo] || manutencao.tipo}</p>
          <p className="text-xs text-muted-foreground">{manutencao.veiculo_nome}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_MANUTENCAO[manutencao.status]?.cor || ""}`}>{STATUS_MANUTENCAO[manutencao.status]?.label || manutencao.status}</span>
      </div>
      {manutencao.descricao && <p className="text-xs text-muted-foreground mb-2">{manutencao.descricao}</p>}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {manutencao.data_realizada ? (
          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatarDataBR(manutencao.data_realizada)}</div>
        ) : manutencao.data_programada ? (
          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatarDataBR(manutencao.data_programada)}</div>
        ) : null}
        {manutencao.custo ? <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatarMoeda(manutencao.custo)}</div> : null}
        {manutencao.odometro_na_manutencao ? <span>{manutencao.odometro_na_manutencao.toLocaleString("pt-BR")} km</span> : null}
      </div>
      {manutencao.status === "programada" && (
        <button onClick={marcarRealizada} className="w-full mt-2 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-semibold flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" /> Marcar como Realizada
        </button>
      )}
    </div>
  );
}

function FormManutencao({ veiculos, onClose, onSalvo }) {
  const [veiculoId, setVeiculoId] = useState(veiculos[0]?.id || "");
  const [tipo, setTipo] = useState("corretiva");
  const [descricao, setDescricao] = useState("");
  const [custo, setCusto] = useState("");
  const [odometro, setOdometro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const veiculo = veiculos.find((v) => v.id === veiculoId);
      await base44.entities.Manutencao.create({
        veiculo_id: veiculoId,
        veiculo_nome: veiculo?.nome || "",
        tipo,
        status: "realizada",
        data_realizada: new Date().toISOString().split("T")[0],
        odometro_na_manutencao: parseInt(odometro) || veiculo?.odometro_atual || 0,
        descricao,
        custo: parseFloat(custo) || 0
      });
      onSalvo();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Nova Manutenção</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Veículo</label>
            <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none">
              {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none">
              {Object.entries(TIPOS_MANUTENCAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="O que foi feito?" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Custo (R$)</label>
              <input type="number" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Odômetro (km)</label>
              <input type="number" value={odometro} onChange={(e) => setOdometro(e.target.value)} placeholder="00000" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none" />
            </div>
          </div>
        </div>

        {erro && <p className="text-sm text-red-500 mt-3">{erro}</p>}
        <button onClick={salvar} disabled={salvando} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50">{salvando ? "Salvando..." : "Registrar Manutenção"}</button>
      </div>
    </div>
  );
}