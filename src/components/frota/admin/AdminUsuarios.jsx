import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Check, User, Mail, Loader2, UserCog } from "lucide-react";

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [convidando, setConvidando] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      setUsuarios(await base44.entities.User.list());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div className="space-y-3">
      <button onClick={() => setConvidando(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm">
        <Plus className="w-4 h-4" /> Convidar Usuário
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-700">
          💡 Todo usuário é um operador. Convide pelo e-mail, e depois defina o papel (operador/admin) e o código do computador de bordo.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário cadastrado</p>
      ) : (
        usuarios.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {u.foto_url ? <img src={u.foto_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {u.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[10px] px-2 py-1 rounded-full ${u.role === "admin" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  {u.role === "admin" ? "Admin" : "Operador"}
                </span>
                <button onClick={() => setEditando(u)} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><UserCog className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
            </div>
            {u.codigo_bordo && (
              <p className="text-[10px] text-muted-foreground mt-1.5">Código de bordo: <strong>{u.codigo_bordo}</strong></p>
            )}
          </div>
        ))
      )}

      {editando && <FormUsuario usuario={editando} onClose={() => setEditando(null)} onSalvo={() => { setEditando(null); carregar(); }} />}
      {convidando && <ModalConvite onClose={() => setConvidando(false)} onConvidado={() => { setConvidando(false); carregar(); }} />}
    </div>
  );
}

function FormUsuario({ usuario, onClose, onSalvo }) {
  const [form, setForm] = useState({
    full_name: usuario.full_name || "",
    role: usuario.role || "motorista",
    codigo_bordo: usuario.codigo_bordo || "",
    telefone: usuario.telefone || ""
  });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await base44.entities.User.update(usuario.id, form);
      // Sincroniza imediatamente o Operador correspondente
      try {
        await base44.functions.invoke('sincronizarOperador', {
          record: { id: usuario.id, email: usuario.email, ...form }
        });
      } catch (syncErr) { console.error("Sync Operador falhou:", syncErr); }
      onSalvo();
    } catch (e) { alert(e.message); } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Editar Usuário</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
            <input value={usuario.email || ""} disabled className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 bg-muted/30 text-muted-foreground" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Papel (o que este usuário pode acessar)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => setForm({ ...form, role: "motorista" })} className={`py-2.5 rounded-xl text-sm font-semibold border-2 ${form.role === "motorista" ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border"}`}>Operador</button>
              <button onClick={() => setForm({ ...form, role: "admin" })} className={`py-2.5 rounded-xl text-sm font-semibold border-2 ${form.role === "admin" ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border"}`}>Admin</button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Admin tem acesso a tudo, incluindo as funções de operador</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Código do Computador de Bordo</label>
            <input value={form.codigo_bordo} onChange={(e) => setForm({ ...form, codigo_bordo: e.target.value })} placeholder="Ex: 1, 2, A" className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none" />
            <p className="text-[10px] text-muted-foreground mt-1">Tecla que o operador pressiona no ESP32 para se identificar</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
            <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none" />
          </div>
        </div>
        <button onClick={salvar} disabled={salvando} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Salvar</>}
        </button>
      </div>
    </div>
  );
}

function ModalConvite({ onClose, onConvidado }) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function convidar() {
    if (!email.trim()) return;
    setEnviando(true);
    try {
      await base44.users.inviteUser(email.trim(), "user");
      alert(`Convite enviado para ${email}! O usuário receberá um e-mail para se cadastrar.`);
      onConvidado();
    } catch (e) { alert("Erro ao convidar: " + e.message); setEnviando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Convidar Usuário</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">O convidado receberá um e-mail para definir a senha. Após o cadastro, volte aqui para definir o papel e o código de bordo.</p>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none" />
        </div>
        <button onClick={convidar} disabled={enviando || !email.trim()} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar Convite</>}
        </button>
      </div>
    </div>
  );
}