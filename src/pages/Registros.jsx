import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ClipboardList, ChevronLeft, Filter, X, User, Gauge, Clock, CheckCircle2, XCircle, Smartphone, Cpu } from "lucide-react";
import { useFrotaData, isGestorOuAdmin } from "@/hooks/useFrotaData";
import { formatarDataHoraBR } from "@/lib/frota-constants";

export default function Registros() {
  const { motorista, veiculos } = useFrotaData();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroVeiculo, setFiltroVeiculo] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [registroDetalhe, setRegistroDetalhe] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      let data;
      if (isGestorOuAdmin(motorista)) {
        data = await base44.entities.RegistroUso.list("-created_date", 100);
      } else if (motorista?.id) {
        data = await base44.entities.RegistroUso.filter({ motorista_id: motorista.id }, "-created_date", 100);
      } else {
        data = [];
      }
      setRegistros(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [motorista]);

  const registrosFiltrados = filtroVeiculo ? registros.filter((r) => r.veiculo_id === filtroVeiculo) : registros;

  return (
    <div className="min-h-full">
      <div className="bg-white border-b border-border px-5 pt-6 pb-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Registros de Uso</h1>
              <p className="text-xs text-muted-foreground">{registrosFiltrados.length} registros</p>
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
            <button onClick={() => setFiltroVeiculo(null)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!filtroVeiculo ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>Todos</button>
            {veiculos.map((v) => (
              <button key={v.id} onClick={() => setFiltroVeiculo(filtroVeiculo === v.id ? null : v.id)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filtroVeiculo === v.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{v.nome}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum registro de uso ainda</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-2">
          {registrosFiltrados.map((r) => (
            <button key={r.id} onClick={() => setRegistroDetalhe(r)} className="w-full bg-white rounded-2xl shadow-sm border border-border p-4 text-left hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.origem === "app" ? "bg-green-100" : "bg-blue-100"}`}>
                    {r.origem === "app" ? <Smartphone className="w-4 h-4 text-green-600" /> : <Cpu className="w-4 h-4 text-blue-600" />}
                  </div>
                  <span className="font-semibold text-sm">{r.motorista_nome || "—"}</span>
                </div>
                {r.tem_anomalia ? (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Anomalia</span>
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.veiculo_nome || "—"}</span>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatarDataHoraBR(r.data_hora_inicio)}</div>
                <div className="flex items-center gap-1"><Gauge className="w-3 h-3" />{(r.odometro_registrado || 0).toLocaleString("pt-BR")} km</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {registroDetalhe && <RegistroDetalhe registro={registroDetalhe} onClose={() => setRegistroDetalhe(null)} />}
    </div>
  );
}

function RegistroDetalhe({ registro, onClose }) {
  const [respostas, setRespostas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.RespostaChecklist.filter({ registro_uso_id: registro.id });
        setRespostas(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [registro.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Detalhes do Registro</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="font-semibold text-sm">{registro.motorista_nome}</p>
              <p className="text-xs text-muted-foreground">{formatarDataHoraBR(registro.data_hora_inicio)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Veículo</p>
              <p className="text-sm font-semibold">{registro.veiculo_nome}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Odômetro</p>
              <p className="text-sm font-semibold">{(registro.odometro_registrado || 0).toLocaleString("pt-BR")} km</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="text-sm font-semibold">{registro.origem === "app" ? "📱 App" : "🔌 Computador de Bordo"}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-semibold ${registro.tem_anomalia ? "text-orange-600" : "text-green-600"}`}>{registro.tem_anomalia ? "⚠️ Com Anomalia" : "✅ OK"}</p>
            </div>
          </div>
        </div>

        <h3 className="font-bold text-sm mb-2">Checklist Respondido</h3>
        {loading ? (
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        ) : respostas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem respostas de checklist registradas</p>
        ) : (
          <div className="space-y-2">
            {respostas.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-white border border-border rounded-xl p-3">
                <p className="text-sm flex-1 pr-2">{r.pergunta_texto}</p>
                {r.resposta ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
              </div>
            ))}
          </div>
        )}
        {registro.notas && <p className="text-xs text-muted-foreground mt-4 bg-muted/30 p-3 rounded-xl">{registro.notas}</p>}
      </div>
    </div>
  );
}