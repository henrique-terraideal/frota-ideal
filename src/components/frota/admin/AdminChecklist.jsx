import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, GripVertical, X, Check, ArrowUp, ArrowDown, ClipboardCheck } from "lucide-react";

export default function AdminChecklist() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const data = await base44.entities.ChecklistItem.list();
      setItens(data.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function adicionar() {
    if (!novo.trim()) return;
    try {
      const ordem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem || 0)) + 1 : 1;
      await base44.entities.ChecklistItem.create({ pergunta: novo.trim(), ativo: true, ordem, tipo_resposta: "sim_nao" });
      setNovo("");
      carregar();
    } catch (e) { alert(e.message); }
  }

  async function toggleAtivo(item) {
    try { await base44.entities.ChecklistItem.update(item.id, { ativo: !item.ativo }); carregar(); } catch (e) { alert(e.message); }
  }

  async function excluir(id) {
    if (!confirm("Excluir esta pergunta?")) return;
    try { await base44.entities.ChecklistItem.delete(id); carregar(); } catch (e) { alert(e.message); }
  }

  async function mover(item, direcao) {
    const index = itens.findIndex((i) => i.id === item.id);
    const troca = itens[index + direcao];
    if (!troca) return;
    try {
      await base44.entities.ChecklistItem.update(item.id, { ordem: troca.ordem });
      await base44.entities.ChecklistItem.update(troca.id, { ordem: item.ordem });
      carregar();
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nova pergunta..." className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none" onKeyDown={(e) => e.key === "Enter" && adicionar()} />
        <button onClick={adicionar} className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0"><Plus className="w-5 h-5 text-white" /></button>
      </div>

      <p className="text-xs text-muted-foreground px-1">As perguntas ativas aparecem para os motoristas no checklist de saída.</p>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {itens.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-xl border border-border p-3 flex items-center gap-2">
              <div className="flex flex-col">
                <button onClick={() => mover(item, -1)} disabled={idx === 0} className="text-muted-foreground disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => mover(item, 1)} disabled={idx === itens.length - 1} className="text-muted-foreground disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.ativo ? "" : "text-muted-foreground line-through"}`}>{item.pergunta}</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={item.ativo} onChange={() => toggleAtivo(item)} className="w-4 h-4" />
              </label>
              <button onClick={() => excluir(item.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}