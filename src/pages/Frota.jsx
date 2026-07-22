import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Car, ChevronLeft, Gauge, FileText, Wrench, Receipt, Calendar, Settings, Plus, Edit3, X, Check } from "lucide-react";
import { useFrotaData, isGestorOuAdmin } from "@/hooks/useFrotaData";
import { formatarDataBR, formatarDataHoraBR, STATUS_VEICULO, TIPOS_VEICULO, diasAteVencimento, formatarMoeda, STATUS_MULTA, STATUS_MANUTENCAO, TIPOS_MANUTENCAO, UNIDADES_TEMPO_USO, tempoUsoAtual, infoUnidadeUso } from "@/lib/frota-constants";

export default function Frota() {
  const { veiculos, loading } = useFrotaData();
  const [modo, setModo] = useState("lista");

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-full">
      <div className="bg-white border-b border-border px-5 pt-6 pb-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Frota</h1>
            <p className="text-xs text-muted-foreground">{veiculos.length} veículo(s)</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {veiculos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Car className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado</p>
          </div>
        ) : (
          veiculos.map((v) => <VeiculoCard key={v.id} veiculo={v} />)
        )}
      </div>
    </div>
  );
}

function VeiculoCard({ veiculo }) {
  const navigate = useNavigate();
  const diasLic = diasAteVencimento(veiculo.data_licenciamento);
  const diasIpva = diasAteVencimento(veiculo.data_ipva);
  const info = infoUnidadeUso(veiculo);
  const ehIdade = veiculo.unidade_tempo_uso === "idade_dias";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 to-green-100 p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
          <Car className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-base">{veiculo.nome}</h2>
          <p className="text-xs text-muted-foreground">{veiculo.modelo || TIPOS_VEICULO[veiculo.tipo] || veiculo.tipo} • {veiculo.ano || "—"}</p>
          {veiculo.placa && <span className="inline-block text-xs font-mono bg-white px-2 py-0.5 rounded mt-1 border border-border">{veiculo.placa}</span>}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_VEICULO[veiculo.status]?.cor || ""}`}>{STATUS_VEICULO[veiculo.status]?.label || veiculo.status}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Tempo de Uso */}
        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{info.campo}</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">{tempoUsoAtual(veiculo).toLocaleString("pt-BR")} {info.label}</p>
            {!ehIdade && <p className="text-[10px] text-muted-foreground">Próx. revisão: {(veiculo.odometro_proxima_revisao || 10000).toLocaleString("pt-BR")} {info.label}</p>}
            {ehIdade && veiculo.data_aquisicao && <p className="text-[10px] text-muted-foreground">Desde {formatarDataBR(veiculo.data_aquisicao)}</p>}
          </div>
        </div>

        {/* Documentação */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl p-3 border ${diasLic !== null && diasLic >= 0 && diasLic <= 30 ? "bg-orange-50 border-orange-200" : "bg-muted/30 border-transparent"}`}>
            <p className="text-xs text-muted-foreground">Licenciamento</p>
            <p className="text-sm font-semibold">{formatarDataBR(veiculo.data_licenciamento) || "—"}</p>
            {diasLic !== null && diasLic >= 0 && diasLic <= 30 && <p className="text-[10px] text-orange-600 mt-0.5">{diasLic} dias restantes</p>}
          </div>
          <div className={`rounded-xl p-3 border ${diasIpva !== null && diasIpva >= 0 && diasIpva <= 30 ? "bg-orange-50 border-orange-200" : "bg-muted/30 border-transparent"}`}>
            <p className="text-xs text-muted-foreground">IPVA</p>
            <p className="text-sm font-semibold">{formatarDataBR(veiculo.data_ipva) || "—"}</p>
            {diasIpva !== null && diasIpva >= 0 && diasIpva <= 30 && <p className="text-[10px] text-orange-600 mt-0.5">{diasIpva} dias restantes</p>}
          </div>
        </div>

        <button onClick={() => navigate(`/frota/${veiculo.id}`)} className="w-full py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm">Ver Ficha Completa</button>
      </div>
    </div>
  );
}