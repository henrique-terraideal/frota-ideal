import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit3, Trash2, X, Car, Check } from "lucide-react";
import { TIPOS_ATIVO, STATUS_ATIVO, UNIDADES_TEMPO_USO, formatarTempoUso, infoUnidadeUso } from "@/lib/frota-constants";

export default function AdminVeiculos() {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      setVeiculos(await base44.entities.Ativo.list());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function excluir(id) {
    if (!confirm("Excluir este ativo permanentemente?")) return;
    try { await base44.entities.Ativo.delete(id); carregar(); } catch (e) { alert(e.message); }
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setEditando({})} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm">
        <Plus className="w-4 h-4" /> Cadastrar Ativo / Equipamento
      </button>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : veiculos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum ativo cadastrado</p>
      ) : (
        veiculos.map((v) => (
          <div key={v.id} className="bg-white rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Car className="w-4 h-4 text-primary" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{v.nome}</p>
                  <p className="text-xs text-muted-foreground">{v.modelo || TIPOS_ATIVO[v.tipo]} • {formatarTempoUso(v)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setEditando(v)} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => excluir(v.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
            </div>
          </div>
        ))
      )}

      {editando && <FormVeiculo veiculo={editando} onClose={() => setEditando(null)} onSalvo={() => { setEditando(null); carregar(); }} />}
    </div>
  );
}

export function FormVeiculo({ veiculo, onClose, onSalvo }) {
  const [form, setForm] = useState({
    nome: veiculo.nome || "",
    tipo: veiculo.tipo || "carro",
    placa: veiculo.placa || "",
    renavam: veiculo.renavam || "",
    ano: veiculo.ano || "",
    modelo: veiculo.modelo || "",
    unidade_tempo_uso: veiculo.unidade_tempo_uso || "km",
    data_aquisicao: veiculo.data_aquisicao || "",
    odometro_atual: veiculo.odometro_atual || 0,
    odometro_proxima_revisao: veiculo.odometro_proxima_revisao || 10000,
    status: veiculo.status || "ativo",
    data_licenciamento: veiculo.data_licenciamento || "",
    data_ipva: veiculo.data_ipva || "",
    notas: veiculo.notas || ""
  });
  const [salvando, setSalvando] = useState(false);

  const ehIdade = form.unidade_tempo_uso === "idade_dias";
  const info = UNIDADES_TEMPO_USO[form.unidade_tempo_uso];

  async function salvar() {
    setSalvando(true);
    try {
      const dados = {
        ...form,
        ano: form.ano ? parseInt(form.ano) : null,
        odometro_atual: ehIdade ? 0 : (parseInt(form.odometro_atual) || 0),
        odometro_proxima_revisao: ehIdade ? null : (parseInt(form.odometro_proxima_revisao) || 10000)
      };
      if (veiculo.id) {
        await base44.entities.Ativo.update(veiculo.id, dados);
      } else {
        await base44.entities.Ativo.create(dados);
      }
      onSalvo();
    } catch (e) { alert(e.message); } finally { setSalvando(false); }
  }

  const field = (key, label, type = "text") => (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" />
    </div>
  );

  const selectField = (key, label, options) => (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none">
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{typeof v === "string" ? v : v.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{veiculo.id ? "Editar Ativo" : "Cadastrar Ativo / Equipamento"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          {field("nome", "Nome *")}
          <div className="grid grid-cols-2 gap-3">
            {selectField("tipo", "Tipo", TIPOS_ATIVO)}
            {field("modelo", "Modelo")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("placa", "Placa")}
            {field("renavam", "Renavam")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("ano", "Ano", "number")}
            {selectField("status", "Status", STATUS_ATIVO)}
          </div>

          {/* Tempo de Uso */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-3">
            <div>
              <label className="text-xs font-semibold text-primary">Unidade de Tempo de Uso *</label>
              <p className="text-[11px] text-muted-foreground mb-1">Como o uso deste ativo é medido para programar manutenções.</p>
              <select value={form.unidade_tempo_uso} onChange={(e) => setForm({ ...form, unidade_tempo_uso: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none">
                {Object.entries(UNIDADES_TEMPO_USO).map(([k, v]) => <option key={k} value={k}>{v.titulo}</option>)}
              </select>
            </div>
            {field("data_aquisicao", "Data de Aquisição / Comissionamento", "date")}
            {ehIdade ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="text-xs text-amber-700">A idade em dias é calculada automaticamente a partir da data de aquisição. Não é necessário informar um medidor.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {field("odometro_atual", `${info.campo} Atual (${info.label})`, "number")}
                {field("odometro_proxima_revisao", `Próx. Revisão (${info.label})`, "number")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("data_licenciamento", "Venc. Licenciamento", "date")}
            {field("data_ipva", "Venc. IPVA", "date")}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Observações</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <button onClick={salvar} disabled={salvando} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {salvando ? "Salvando..." : <><Check className="w-4 h-4" /> Salvar</>}
        </button>
      </div>
    </div>
  );
}