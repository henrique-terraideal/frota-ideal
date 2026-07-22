import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit3, Trash2, X, Cpu, Check, Radio, Activity, QrCode, Printer } from "lucide-react";
import { formatarDataHoraBR } from "@/lib/frota-constants";

export default function AdminComputadoresDeBordo() {
  const [dispositivos, setDispositivos] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [qrDispositivo, setQrDispositivo] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      const [disps, vets] = await Promise.all([
        base44.entities.ComputadorDeBordo.list(),
        base44.entities.Ativo.list()
      ]);
      setDispositivos(disps);
      setVeiculos(vets);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function excluir(id) {
    if (!confirm("Excluir este dispositivo?")) return;
    try { await base44.entities.ComputadorDeBordo.delete(id); carregar(); } catch (e) { alert(e.message); }
  }

  function veiculoNome(id) {
    const v = veiculos.find((x) => x.id === id);
    return v ? v.nome : "Ativo removido";
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setEditando({})} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm">
        <Plus className="w-4 h-4" /> Cadastrar Dispositivo
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-700">
          💡 Cada Computador de Bordo é vinculado a um ativo. O <strong>device_id</strong> deve ser o mesmo gravado no firmware do ESP32.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : dispositivos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum dispositivo cadastrado</p>
      ) : (
        dispositivos.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${d.ativo ? "bg-primary/10" : "bg-muted"}`}>
                  <Cpu className={`w-4 h-4 ${d.ativo ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{d.device_id}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.nome || veiculoNome(d.ativo_id)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setQrDispositivo(d)} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" title="Ver QR Code"><QrCode className="w-3.5 h-3.5 text-primary" /></button>
                <button onClick={() => setEditando(d)} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => excluir(d.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50 text-xs">
              <span className={`flex items-center gap-1 ${d.ativo ? "text-green-600" : "text-muted-foreground"}`}>
                <Radio className="w-3 h-3" /> {d.ativo ? "Ativo" : "Inativo"}
              </span>
              {d.ultimo_contato && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Activity className="w-3 h-3" /> {formatarDataHoraBR(d.ultimo_contato)}
                </span>
              )}
              <span className="text-muted-foreground">v{(d.versao_checklist || 0)}</span>
            </div>
          </div>
        ))
      )}

      {editando && <FormDispositivo dispositivo={editando} veiculos={veiculos} onClose={() => setEditando(null)} onSalvo={() => { setEditando(null); carregar(); }} />}
      {qrDispositivo && <ModalQRCode dispositivo={qrDispositivo} onClose={() => setQrDispositivo(null)} />}
    </div>
  );
}

function ModalQRCode({ dispositivo, onClose }) {
  const onboardingUrl = `${window.location.origin}/onboarding-bordo?device_id=${encodeURIComponent(dispositivo.device_id)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(onboardingUrl)}`;

  function imprimir() {
    const win = window.open("", "_blank", "width=400,height=500");
    win.document.write(`
      <html><head><title>QR Code - ${dispositivo.device_id}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Arial,sans-serif;">
        <img src="${qrUrl}" width="300" height="300" />
        <h2 style="margin-top:16px;">${dispositivo.device_id}</h2>
        <p style="color:#666;font-size:12px;">Computador de Bordo — Terra Ideal</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">QR Code de Configuração</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col items-center">
          <div className="bg-white p-3 rounded-2xl border border-border">
            <img src={qrUrl} alt="QR Code" width="240" height="240" className="rounded-lg" />
          </div>
          <p className="text-sm font-bold mt-3">{dispositivo.device_id}</p>
          <p className="text-xs text-muted-foreground mt-1 text-center px-4">
            Cole este QR code na parte traseira do dispositivo. O técnico escaneia com o celular para configurar o Wi-Fi.
          </p>
          <div className="w-full mt-3 bg-muted/30 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground font-mono break-all">{onboardingUrl}</p>
          </div>
        </div>
        <button onClick={imprimir} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir QR Code
        </button>
      </div>
    </div>
  );
}

function FormDispositivo({ dispositivo, veiculos, onClose, onSalvo }) {
  const [form, setForm] = useState({
    device_id: dispositivo.device_id || "",
    ativo_id: dispositivo.ativo_id || "",
    nome: dispositivo.nome || "",
    ativo: dispositivo.ativo !== false,
    notas: dispositivo.notas || ""
  });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!form.device_id.trim() || !form.ativo_id) {
      alert("Device ID e Ativo são obrigatórios");
      return;
    }
    setSalvando(true);
    try {
      const veiculo = veiculos.find((v) => v.id === form.ativo_id);
      const dados = {
        ...form,
        ativo_nome: veiculo?.nome || ""
      };
      if (dispositivo.id) {
        await base44.entities.ComputadorDeBordo.update(dispositivo.id, dados);
      } else {
        const existentes = await base44.entities.ComputadorDeBordo.filter({ device_id: form.device_id });
        if (existentes.length > 0) {
          alert(`Já existe um dispositivo com device_id "${form.device_id}"`);
          setSalvando(false);
          return;
        }
        await base44.entities.ComputadorDeBordo.create({ ...dados, versao_checklist: 0 });
      }
      onSalvo();
    } catch (e) { alert(e.message); } finally { setSalvando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{dispositivo.id ? "Editar Dispositivo" : "Cadastrar Dispositivo"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Device ID *</label>
            <input value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })} placeholder="Ex: BORDO-001" className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" />
            <p className="text-[10px] text-muted-foreground mt-1">Identificador único gravado no firmware do ESP32</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Ativo Vinculado *</label>
            <select value={form.ativo_id} onChange={(e) => setForm({ ...form, ativo_id: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none">
              <option value="">Selecione...</option>
              {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome Descritivo</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Computador do Carro Terra Ideal" className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Observações</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary outline-none resize-none" />
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