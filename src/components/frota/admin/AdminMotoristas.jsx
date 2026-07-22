import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit3, Trash2, X, User, Check } from "lucide-react";
import { PERMISSOES } from "@/lib/frota-constants";

export default function AdminMotoristas() {
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      setMotoristas(await base44.entities.Motorista.list());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function excluir(id) {
    if (!confirm("Excluir este motorista?")) return;
    try { await base44.entities.Motorista.delete(id); carregar(); } catch (e) { alert(e.message); }
  }

  async function convidar(email, role) {
    try {
      await base44.users.inviteUser(email, role === "administrador" ? "admin" : "user");
      alert(`Convite enviado para ${email}!`);
    } catch (e) { alert("Erro ao convidar: " + e.message); }
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setEditando({})} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm">
        <Plus className="w-4 h-4" /> Cadastrar Motorista
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-700">
          💡 Para que um motorista faça login no app, cadastre-o aqui com o e-mail e depois convide-o pelo sistema (botão "Convidar"). O usuário receberá um e-mail para definir a senha.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : motoristas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum motorista cadastrado</p>
      ) : (
        motoristas.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-primary" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{PERMISSOES[m.permissao] || m.permissao} • Código: {m.codigo_bordo || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setEditando(m)} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => excluir(m.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
            </div>
            {!m.user_id && (
              <p className="text-[10px] text-orange-600 mt-1.5">⚠️ Não vinculado a um usuário — convide pelo e-mail para liberar acesso</p>
            )}
          </div>
        ))
      )}

      {editando && <FormMotorista motorista={editando} onClose={() => setEditando(null)} onSalvo={() => { setEditando(null); carregar(); }} onConvidar={convidar} />}
    </div>
  );
}

function FormMotorista({ motorista, onClose, onSalvo, onConvidar }) {
  const [form, setForm] = useState({
    nome: motorista.nome || "",
    codigo_bordo: motorista.codigo_bordo || "",
    permissao: motorista.permissao || "motorista",
    ativo: motorista.ativo !== false,
    telefone: motorista.telefone || "",
    email: "",
    user_id: motorista.user_id || ""
  });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      const dados = { ...form };
      delete dados.email;
      if (motorista.id) {
        await base44.entities.Motorista.update(motorista.id, dados);
      } else {
        await base44.entities.Motorista.create(dados);
      }
      // Se tem email e não tem user_id, convida
      if (form.email && !form.user_id) {
        await onConvidar(form.email, form.permissao);
      }
      onSalvo();
    } catch (e) { alert(e.message); } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{motorista.id ? "Editar Motorista" : "Cadastrar Motorista"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome *</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Código do Computador de Bordo</label>
            <input value={form.codigo_bordo} onChange={(e) => setForm({ ...form, codigo_bordo: e.target.value })} placeholder="Ex: 1, 2, A" className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" />
            <p className="text-[10px] text-muted-foreground mt-1">Tecla que o motorista pressiona no ESP32 para se identificar</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Permissão</label>
            <select value={form.permissao} onChange={(e) => setForm({ ...form, permissao: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none">
              {Object.entries(PERMISSOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
            <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">E-mail (para convidar como usuário)</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" />
            {form.user_id && <p className="text-[10px] text-green-600 mt-1">✓ Já vinculado a um usuário</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm">Ativo</span>
          </label>
        </div>
        <button onClick={salvar} disabled={salvando} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {salvando ? "Salvando..." : <><Check className="w-4 h-4" /> Salvar</>}
        </button>
      </div>
    </div>
  );
}