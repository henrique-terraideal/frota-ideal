import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Cpu, Wifi, Globe, Car, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function OnboardingBordo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const deviceId = searchParams.get("device_id");
  const [step, setStep] = useState(1);
  const [ativos, setAtivos] = useState([]);
  const [ativoId, setAtivoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [vinculado, setVinculado] = useState(null);

  useEffect(() => {
    async function carregarAtivos() {
      try {
        const res = await base44.functions.invoke("onboardingBordo", { action: "listar" });
        setAtivos(res.data?.ativos || res.data?.veiculos || []);
      } catch (e) { console.error(e); }
    }
    carregarAtivos();
  }, []);

  async function vincular() {
    if (!ativoId) { setErro("Selecione um ativo"); return; }
    setLoading(true);
    setErro("");
    try {
      const res = await base44.functions.invoke("onboardingBordo", { action: "vincular", device_id: deviceId, veiculo_id: ativoId });
      if (res.data?.success) {
        setVinculado(res.data);
        setStep(5);
      } else {
        setErro(res.data?.error || "Erro ao vincular");
      }
    } catch (e) { setErro(e.message); } finally { setLoading(false); }
  }

  if (!deviceId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Cpu className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <h1 className="text-xl font-bold mb-2">Device ID não encontrado</h1>
        <p className="text-sm text-muted-foreground">Escaneie o QR code do dispositivo para iniciar a configuração.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white flex flex-col">
      <div className="bg-gradient-to-br from-primary to-green-700 text-white px-5 pt-10 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-6 h-6" />
          <h1 className="text-lg font-bold">Computador de Bordo</h1>
        </div>
        <p className="text-white/80 text-xs">Dispositivo: <strong>{deviceId}</strong></p>
      </div>

      {step < 5 && (
        <div className="px-5 -mt-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-border p-2 flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{s}</div>
                {s < 4 && <div className={`w-6 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-5">
        {step === 1 && (
          <div className="flex flex-col items-center text-center pt-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Cpu className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Configuração do Computador de Bordo</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              Você está configurando o dispositivo <strong className="text-foreground">{deviceId}</strong> da Terra Ideal. Siga os passos abaixo.
            </p>
            <button onClick={() => setStep(2)} className="w-full max-w-xs py-3.5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
              Começar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Conecte ao Wi-Fi do dispositivo</h2>
              <p className="text-sm text-muted-foreground">No seu celular, acesse as configurações de Wi-Fi e conecte-se à rede:</p>
            </div>
            <div className="bg-white rounded-2xl border-2 border-primary/30 p-4 text-center">
              <Wifi className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold">TerraIdeal-Config</p>
              <p className="text-sm text-muted-foreground mt-1">Senha: <strong className="text-foreground">terraideal123</strong></p>
            </div>
            <p className="text-xs text-muted-foreground">Após conectar, volte aqui e toque em Continuar.</p>
            <button onClick={() => setStep(3)} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
              Já estou conectado — Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Acesse o portal de configuração</h2>
              <p className="text-sm text-muted-foreground">Com o celular conectado à rede TerraIdeal-Config, toque no botão abaixo para abrir o portal do dispositivo:</p>
            </div>
            <a href="http://192.168.4.1" target="_blank" rel="noopener noreferrer" className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 text-base">
              <Globe className="w-5 h-5" /> Abrir portal do dispositivo
            </a>
            <p className="text-xs text-muted-foreground">No portal, informe o nome e a senha da rede Wi-Fi da empresa e toque em Salvar.</p>
            <button onClick={() => setStep(4)} className="w-full py-3.5 rounded-xl bg-white border-2 border-primary text-primary font-bold flex items-center justify-center gap-2">
              Já configurei o Wi-Fi — Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="pt-4 space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Vincule o dispositivo a um ativo</h2>
              <p className="text-sm text-muted-foreground">Selecione o ativo onde este Computador de Bordo está instalado:</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-2">
              {ativos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando ativos...</p>
              ) : (
                <select value={ativoId} onChange={(e) => setAtivoId(e.target.value)} className="w-full border border-border rounded-xl px-3 py-3 text-sm focus:border-primary outline-none">
                  <option value="">Selecione um ativo...</option>
                  {ativos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              )}
            </div>
            {erro && <p className="text-sm text-red-500 text-center">{erro}</p>}
            <button onClick={vincular} disabled={loading || !ativoId} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />} Vincular e Finalizar
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center text-center pt-10">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Dispositivo configurado com sucesso!</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs">
              O Computador de Bordo <strong className="text-foreground">{deviceId}</strong> está vinculado ao ativo <strong className="text-foreground">{vinculado?.dispositivo?.ativo_nome || ""}</strong> e pronto para uso.
            </p>
            <button onClick={() => navigate("/admin")} className="w-full max-w-xs py-3.5 rounded-xl bg-primary text-white font-bold">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}