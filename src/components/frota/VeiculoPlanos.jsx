import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, X, Check, Calendar, Gauge, Edit3, Repeat } from "lucide-react";
import { TIPOS_MANUTENCAO, UNIDADES_TEMPO, formatarDataBR } from "@/lib/frota-constants";

export default function VeiculoPlanos({ veiculoId, veiculo, odometroAtual }) {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      const data = await base44.entities.PlanoManutencao.filter({ veiculo_id: veiculoId });
      setPlanos(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, [veiculoId]);

  async function excluir(id) {
    if (!confirm("Excluir este plano de manutenção?")) return;
    try { await base44.entities.PlanoManutencao.delete(id); carregar(); } catch (e) { alert(e.message); }
  }

  function descricaoRecorrencia(plano) {
    const partes = [];
    if (plano.gatilho_km) partes.push(`a cada ${plano.gatilho_km.toLocaleString("pt-BR")} km`);
    if (plano.gatilho_tempo_valor && plano.gatilho_tempo_unidade) {
      partes.push(`a cada ${plano.gatilho_tempo_valor} ${UNIDADES_TEMPO[plano.gatilho_tempo_unidade] || plano.gatilho_tempo_unidade}`);
    }
    return partes.length ? partes.join(" e ") : "Sem recorrência definida";
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setEditando({})} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm">
        <Plus className="w-4 h-4" /> Novo Plano Preventivo
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-700">
          💡 Os planos geram pendências automáticas no Kanban quando o veículo atinge o km ou o prazo definido.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : planos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Repeat className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum plano preventivo cadastrado</p>
        </div>
      ) : (
        planos.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-border p-3">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">{TIPOS_MANUTENCAO[p.tipo_manutencao] || p.tipo_manutencao}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!p.ativo && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inativo</span>}
                <button onClick={() => setEditando(p)} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => excluir(p.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
            </div>
            <p className="text-xs text-primary font-medium mt-1">{descricaoRecorrencia(p)}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
              {p.ultima_execucao_data && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Última: {formatarDataBR(p.ultima_execucao_data)}</span>}
              {p.gatilho_km ? <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Últ. km: {(p.ultima_execucao_odometro || 0).toLocaleString("pt-BR")}</span> : null}
            </div>
          </div>
        ))
      )}

      {editando && (
        <FormPlano plano={editando} veiculoId={veiculoId} veiculoNome={veiculo?.nome || ""} odometroAtual={odometroAtual} onClose={() => setEditando(null)} onSalvo={() => { setEditando(null); carregar(); }} />
      )}
    </div>
  );
}

function FormPlano({ plano, veiculoId, veiculoNome, odometroAtual, onClose, onSalvo }) {
  const [form, setForm] = useState({
    titulo: plano.titulo || "",
    tipo_manutencao: plano.tipo_manutencao || "outro",
    ativo: plano.ativo !== false,
    gatilho_km: plano.gatilho_km || "",
    gatilho_tempo_valor: plano.gatilho_tempo_valor || "",
    gatilho_tempo_unidade: plano.gatilho_tempo_unidade || "meses",
    ultima_execucao_odometro: plano.ultima_execucao_odometro ?? "",
    ultima_execucao_data: plano.ultima_execucao_data || "",
    descricao: plano.descricao || ""
  });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!form.titulo.trim()) { alert("Informe um título"); return; }
    setSalvando(true);
    try {
      const dados = {
        veiculo_id: veiculoId,
        veiculo_nome: veiculoNome,
        titulo: form.titulo.trim(),
        tipo_manutencao: form.tipo_manutencao,
        ativo: form.ativo,
        gatilho_km: form.gatilho_km ? Number(form.gatilho_km) : null,
        gatilho_tempo_valor: form.gatilho_tempo_valor ? Number(form.gatilho_tempo_valor) : null,
        gatilho_tempo_unidade: form.gatilho_tempo_valor ? form.gatilho_tempo_unidade : null,
        ultima_execucao_odometro: form.ultima_execucao_odometro !== "" ? Number(form.ultima_execucao_odometro) : 0,
        ultima_execucao_data: form.ultima_execucao_data || null,
        descricao: form.descricao || null
      };
      if (plano.id) {
        await base44.entities.PlanoManutencao.update(plano.id, dados);
      } else {
        await base44.entities.PlanoManutencao.create(dados);
      }
      onSalvo();
    } catch (e) { alert(e.message); } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{plano.id ? "Editar Plano" : "Novo Plano Preventivo"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Título *</label>
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Troca de óleo do motor" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
            <select value={form.tipo_manutencao} onChange={(e) => setForm({ ...form, tipo_manutencao: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none">
              {Object.entries(TIPOS_MANUTENCAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Recorrência (preencha um ou ambos)</p>
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3" /> A cada (km)</label>
              <input type="number" value={form.gatilho_km} onChange={(e) => setForm({ ...form, gatilho_km: e.target.value })} placeholder="Ex: 10000" className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">A cada</label>
                <input type="number" value={form.gatilho_tempo_valor} onChange={(e) => setForm({ ...form, gatilho_tempo_valor: e.target.value })} placeholder="Ex: 6" className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Unidade</label>
                <select value={form.gatilho_tempo_unidade} onChange={(e) => setForm({ ...form, gatilho_tempo_unidade: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none">
                  {Object.entries(UNIDADES_TEMPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Última execução (referência para o próximo gatilho)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Data</label>
                <input type="date" value={form.ultima_execucao_data} onChange={(e) => setForm({ ...form, ultima_execucao_data: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Odômetro (km)</label>
                <input type="number" value={form.ultima_execucao_odometro} onChange={(e) => setForm({ ...form, ultima_execucao_odometro: e.target.value })} placeholder={String(odometroAtual || 0)} className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm">Plano ativo</span>
          </label>
        </div>
        <button onClick={salvar} disabled={salvando} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {salvando ? "Salvando..." : <><Check className="w-4 h-4" /> Salvar</>}
        </button>
      </div>
    </div>
  );
}