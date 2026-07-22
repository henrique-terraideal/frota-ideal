import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Camera, Check, Loader2, Mail, Phone } from "lucide-react";

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    async function carregar() {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setNome(me.full_name || "");
        setTelefone(me.telefone || "");
        setFotoUrl(me.foto_url || "");
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    carregar();
  }, []);

  async function uploadFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setEnviandoFoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFotoUrl(file_url);
    } catch (e) { alert(e.message); } finally { setEnviandoFoto(false); }
  }

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    try {
      await base44.auth.updateMe({
        full_name: nome,
        telefone,
        foto_url: fotoUrl
      });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (e) { alert(e.message); } finally { setSalvando(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-br from-primary to-green-700 text-white px-5 pt-8 pb-8 rounded-b-3xl">
        <h1 className="text-xl font-bold">Meu Perfil</h1>
        <p className="text-white/70 text-xs mt-1">Edite suas informações básicas</p>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {/* Foto */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mb-3">
            {fotoUrl ? <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-primary" />}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviandoFoto}
            className="flex items-center gap-2 text-sm text-primary font-medium disabled:opacity-50"
          >
            {enviandoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {enviandoFoto ? "Enviando..." : "Alterar foto"}
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={uploadFoto} className="hidden" />
        </div>

        {/* Dados */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail</label>
            <input value={user?.email || ""} disabled className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 bg-muted/30 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground mt-1">O e-mail é definido no cadastro e não pode ser alterado</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Papel</label>
            <div className="mt-1">
              <span className={`text-xs px-2 py-1 rounded-full ${user?.role === "admin" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {user?.role === "admin" ? "Administrador" : "Operador"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Definido pelo administrador do sistema</p>
          </div>
        </div>

        <button onClick={salvar} disabled={salvando} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : salvo ? <><Check className="w-4 h-4" /> Salvo!</> : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}