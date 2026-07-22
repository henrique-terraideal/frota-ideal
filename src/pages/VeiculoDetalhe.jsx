import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Car, Gauge, Receipt, Wrench, ClipboardList, Calendar, CheckCircle2, Cpu, Smartphone, ClipboardCheck, Repeat, Copy, X, Loader2, Check } from "lucide-react";
import { formatarDataBR, formatarDataHoraBR, formatarMoeda, STATUS_MULTA, STATUS_MANUTENCAO, TIPOS_MANUTENCAO, TIPOS_VEICULO } from "@/lib/frota-constants";
import VeiculoChecklist from "@/components/frota/VeiculoChecklist";
import VeiculoPlanos from "@/components/frota/VeiculoPlanos";

export default function VeiculoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [veiculo, setVeiculo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [multas, setMultas] = useState([]);
  const [aba, setAba] = useState("historico");
  const [loading, setLoading] = useState(true);
  const [showDuplicar, setShowDuplicar] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const v = await base44.entities.Veiculo.get(id);
      setVeiculo(v);
      const [regs, mans, mult] = await Promise.all([
        base44.entities.RegistroUso.filter({ veiculo_id: id }, "-created_date", 30),
        base44.entities.Manutencao.filter({ veiculo_id: id }, "-created_date", 30),
        base44.entities.Multa.filter({ veiculo_id: id }, "-created_date", 30)
      ]);
      setRegistros(regs);
      setManutencoes(mans);
      setMultas(mult);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!veiculo) return <div className="flex flex-col items-center justify-center py-20"><p className="text-muted-foreground">Veículo não encontrado</p><button onClick={() => navigate("/frota")} className="mt-3 text-primary">Voltar</button></div>;

  const tabs = [
    { id: "historico", label: "Histórico", icon: ClipboardList },
    { id: "manutencoes", label: "Manutenções", icon: Wrench },
    { id: "multas", label: "Multas", icon: Receipt },
    { id: "checklist", label: "Checklist", icon: ClipboardCheck },
    { id: "planos", label: "Planos", icon: Repeat }
  ];

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-br from-primary to-green-700 text-white px-5 pt-6 pb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/frota")} className="flex items-center gap-1 text-white/80 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> Voltar</button>
          <button onClick={() => setShowDuplicar(true)} className="flex items-center gap-1 text-white/90 text-xs bg-white/15 px-2.5 py-1.5 rounded-lg mb-3">
            <Copy className="w-3.5 h-3.5" /> Duplicar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden">
            {veiculo.foto_url ? <img src={veiculo.foto_url} alt="" className="w-full h-full object-cover" /> : <Car className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-xl font-bold">{veiculo.nome}</h1>
            <p className="text-white/70 text-xs">{veiculo.modelo || TIPOS_VEICULO[veiculo.tipo]} • {veiculo.ano || "—"} • {veiculo.placa || "Sem placa"}</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-3">
        {/* Resumo */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <Gauge className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold">{(veiculo.odometro_atual || 0).toLocaleString("pt-BR")}</p>
            <p className="text-[10px] text-muted-foreground">km atual</p>
          </div>
          <div>
            <Receipt className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold">{multas.length}</p>
            <p className="text-[10px] text-muted-foreground">multas</p>
          </div>
          <div>
            <Wrench className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold">{manutencoes.length}</p>
            <p className="text-[10px] text-muted-foreground">manutenções</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 bg-white rounded-xl p-1 border border-border overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setAba(t.id)} className={`flex-1 min-w-[64px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${aba === t.id ? "bg-primary text-white" : "text-muted-foreground"}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 pb-4">
          {aba === "historico" && (
            <div className="space-y-2">
              {registros.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem registros de uso</p> : registros.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{r.motorista_nome}</span>
                    {r.tem_anomalia ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Anomalia</span> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {r.origem === "app" ? <Smartphone className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                    <span>{formatarDataHoraBR(r.data_hora_inicio)}</span>
                    <span>{(r.odometro_registrado || 0).toLocaleString("pt-BR")} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {aba === "manutencoes" && (
            <div className="space-y-2">
              {manutencoes.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem manutenções registradas</p> : manutencoes.map((m) => (
                <div key={m.id} className="bg-white rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{TIPOS_MANUTENCAO[m.tipo] || m.tipo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MANUTENCAO[m.status]?.cor || ""}`}>{STATUS_MANUTENCAO[m.status]?.label || m.status}</span>
                  </div>
                  {m.descricao && <p className="text-xs text-muted-foreground mb-1">{m.descricao}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {m.data_realizada ? <><Calendar className="w-3 h-3" /> {formatarDataBR(m.data_realizada)}</> : m.data_programada ? <><Calendar className="w-3 h-3" /> {formatarDataBR(m.data_programada)}</> : null}
                    {m.custo ? <span className="font-semibold text-foreground">{formatarMoeda(m.custo)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {aba === "multas" && (
            <div className="space-y-2">
              {multas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem multas registradas</p> : multas.map((m) => (
                <div key={m.id} className="bg-white rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{m.descricao_infracao || "Infração"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MULTA[m.status]?.cor || ""}`}>{STATUS_MULTA[m.status]?.label || m.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" /> {formatarDataHoraBR(m.data_infracao)}
                    <span className="font-semibold text-foreground">{formatarMoeda(m.valor)}</span>
                  </div>
                  {m.motorista_identificado_nome && <p className="text-xs text-muted-foreground mt-1">Motorista: {m.motorista_identificado_nome}</p>}
                </div>
              ))}
            </div>
          )}

          {aba === "checklist" && (
            <VeiculoChecklist veiculoId={id} veiculo={veiculo} onVersaoAlterada={(v) => setVeiculo({ ...veiculo, versao_checklist: v })} />
          )}

          {aba === "planos" && (
            <VeiculoPlanos veiculoId={id} veiculo={veiculo} odometroAtual={veiculo.odometro_atual} />
          )}
        </div>
      </div>

      {showDuplicar && <ModalDuplicar veiculoOrigemId={id} veiculoNome={veiculo.nome} onClose={() => setShowDuplicar(false)} onDuplicado={(novoId) => { setShowDuplicar(false); navigate(`/frota/${novoId}`); }} />}
    </div>
  );
}

function ModalDuplicar({ veiculoOrigemId, veiculoNome, onClose, onDuplicado }) {
  const [nome, setNome] = useState("");
  const [placa, setPlaca] = useState("");
  const [duplicando, setDuplicando] = useState(false);

  async function duplicar() {
    if (!nome.trim()) return;
    setDuplicando(true);
    try {
      const res = await base44.functions.invoke("duplicarVeiculo", {
        veiculo_origem_id: veiculoOrigemId,
        novo_nome: nome.trim(),
        nova_placa: placa.trim()
      });
      if (res.data?.success) {
        onDuplicado(res.data.novo_veiculo_id);
      } else {
        alert(res.data?.error || "Erro ao duplicar veículo");
        setDuplicando(false);
      }
    } catch (e) {
      alert(e.message || "Erro ao duplicar veículo");
      setDuplicando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Copy className="w-5 h-5 text-primary" /> Duplicar Veículo</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Será criado um novo veículo copiando os dados básicos, o checklist e os planos de manutenção preventiva de <strong>{veiculoNome}</strong>. O odômetro começará em zero.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome do novo veículo *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Carro Terra Ideal 2" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Placa (opcional)</label>
            <input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC-1234" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-primary outline-none" />
          </div>
        </div>
        <button onClick={duplicar} disabled={duplicando || !nome.trim()} className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {duplicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Duplicar Veículo</>}
        </button>
      </div>
    </div>
  );
}