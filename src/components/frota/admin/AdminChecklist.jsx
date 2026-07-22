import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, X, Check, ArrowUp, ArrowDown, ClipboardCheck, Copy, Car } from "lucide-react";

export default function AdminChecklist() {
  const [itens, setItens] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState("");
  const [showDuplicar, setShowDuplicar] = useState(false);

  async function carregarVeiculos() {
    try {
      const vets = await base44.entities.Ativo.list();
      setVeiculos(vets);
      if (vets.length > 0 && !veiculoSelecionado) {
        setVeiculoSelecionado(vets[0].id);
      }
    } catch (e) { console.error(e); }
  }

  async function carregarItens() {
    if (!veiculoSelecionado) { setItens([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await base44.entities.ChecklistItem.filter({ ativo_id: veiculoSelecionado });
      setItens(data.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { carregarVeiculos(); }, []);
  useEffect(() => { carregarItens(); }, [veiculoSelecionado]);

  // Incrementa a versão do checklist do ativo
  async function incrementarVersao() {
    const veiculo = veiculos.find((v) => v.id === veiculoSelecionado);
    if (!veiculo) return;
    const novaVersao = (veiculo.versao_checklist || 1) + 1;
    await base44.entities.Ativo.update(veiculoSelecionado, { versao_checklist: novaVersao });
    setVeiculos(veiculos.map((v) => v.id === veiculoSelecionado ? { ...v, versao_checklist: novaVersao } : v));
  }

  async function adicionar() {
    if (!novo.trim() || !veiculoSelecionado) return;
    try {
      const ordem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem || 0)) + 1 : 1;
      await base44.entities.ChecklistItem.create({
        ativo_id: veiculoSelecionado,
        pergunta: novo.trim(),
        ativo: true,
        ordem,
        tipo_resposta: "sim_nao"
      });
      setNovo("");
      await incrementarVersao();
      carregarItens();
    } catch (e) { alert(e.message); }
  }

  async function toggleAtivo(item) {
    try {
      await base44.entities.ChecklistItem.update(item.id, { ativo: !item.ativo });
      await incrementarVersao();
      carregarItens();
    } catch (e) { alert(e.message); }
  }

  async function excluir(id) {
    if (!confirm("Excluir esta pergunta?")) return;
    try {
      await base44.entities.ChecklistItem.delete(id);
      await incrementarVersao();
      carregarItens();
    } catch (e) { alert(e.message); }
  }

  async function mover(item, direcao) {
    const index = itens.findIndex((i) => i.id === item.id);
    const troca = itens[index + direcao];
    if (!troca) return;
    try {
      await base44.entities.ChecklistItem.update(item.id, { ordem: troca.ordem });
      await base44.entities.ChecklistItem.update(troca.id, { ordem: item.ordem });
      await incrementarVersao();
      carregarItens();
    } catch (e) { alert(e.message); }
  }

  async function duplicarDe(origemId) {
    if (!origemId || origemId === veiculoSelecionado) {
      alert("Selecione um ativo de origem diferente do atual");
      return;
    }
    if (!confirm("Duplicar substitui o checklist atual deste ativo. Continuar?")) return;
    try {
      const atuais = await base44.entities.ChecklistItem.filter({ ativo_id: veiculoSelecionado });
      if (atuais.length > 0) {
        await base44.entities.ChecklistItem.deleteMany({ ativo_id: veiculoSelecionado });
      }
      const origem = await base44.entities.ChecklistItem.filter({ ativo_id: origemId });
      if (origem.length > 0) {
        await base44.entities.ChecklistItem.bulkCreate(
          origem.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map((item) => ({
            ativo_id: veiculoSelecionado,
            pergunta: item.pergunta,
            ativo: item.ativo,
            ordem: item.ordem || 1,
            tipo_resposta: item.tipo_resposta || "sim_nao"
          }))
        );
      }
      await incrementarVersao();
      setShowDuplicar(false);
      carregarItens();
    } catch (e) { alert(e.message); }
  }

  const veiculoAtual = veiculos.find((v) => v.id === veiculoSelecionado);

  return (
    <div className="space-y-3">
      {/* Seleção de ativo */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3" /> Ativo</label>
        <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none">
          <option value="">Selecione um ativo...</option>
          {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
        </select>
      </div>

      {veiculoAtual && (
        <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
          <span className="text-xs text-muted-foreground">Versão do checklist: <strong>v{veiculoAtual.versao_checklist || 1}</strong></span>
          <button onClick={() => setShowDuplicar(true)} className="flex items-center gap-1 text-xs text-primary font-medium">
            <Copy className="w-3 h-3" /> Duplicar de outro ativo
          </button>
        </div>
      )}

      {veiculoSelecionado && (
        <>
          <div className="flex gap-2">
            <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nova pergunta..." className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none" onKeyDown={(e) => e.key === "Enter" && adicionar()} />
            <button onClick={adicionar} className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0"><Plus className="w-5 h-5 text-white" /></button>
          </div>

          <p className="text-xs text-muted-foreground px-1">As perguntas ativas aparecem no Computador de Bordo deste ativo.</p>

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma pergunta para este ativo</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Adicione acima ou duplique de outro ativo</p>
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
        </>
      )}

      {showDuplicar && <ModalDuplicar veiculos={veiculos} veiculoAtualId={veiculoSelecionado} onClose={() => setShowDuplicar(false)} onConfirm={duplicarDe} />}
    </div>
  );
}

function ModalDuplicar({ veiculos, veiculoAtualId, onClose, onConfirm }) {
  const [origem, setOrigem] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Copy className="w-5 h-5 text-primary" /> Duplicar Checklist</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Selecione de qual ativo copiar o checklist. As perguntas atuais serão substituídas.</p>
        <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mb-4 focus:border-primary outline-none">
          <option value="">Selecione o ativo de origem...</option>
          {veiculos.filter((v) => v.id !== veiculoAtualId).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
        </select>
        <button onClick={() => onConfirm(origem)} disabled={!origem} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> Duplicar
        </button>
      </div>
    </div>
  );
}