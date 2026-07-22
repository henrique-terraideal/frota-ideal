import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Home, AlertTriangle, Wrench, FileText, Car, TrendingUp, Clock, ChevronRight, User, ClipboardCheck, LayoutGrid } from "lucide-react";
import { useFrotaData } from "@/hooks/useFrotaData";
import { formatarDataHoraBR, diasAteVencimento, TIPOS_PENDENCIA, STATUS_VEICULO, formatarMoeda } from "@/lib/frota-constants";

export default function Dashboard() {
  const { motorista, veiculos, loading } = useFrotaData();
  const [pendencias, setPendencias] = useState([]);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [pendenciasData, registrosData] = await Promise.all([
          base44.entities.Pendencia.filter({ status: "aberto" }, "-created_date", 50),
          base44.entities.RegistroUso.list("-created_date", 1)
        ]);
        setPendencias(pendenciasData);
        if (registrosData.length > 0) setUltimoRegistro(registrosData[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const pendenciasPorTipo = pendencias.reduce((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] || 0) + 1;
    return acc;
  }, {});

  const alertas = [];
  veiculos.forEach((v) => {
    if (v.data_licenciamento) {
      const d = diasAteVencimento(v.data_licenciamento);
      if (d !== null && d >= 0 && d <= 30) {
        alertas.push({ tipo: "Licenciamento", veiculo: v.nome, dias: d, cor: d <= 7 ? "red" : "amber" });
      }
    }
    if (v.data_ipva) {
      const d = diasAteVencimento(v.data_ipva);
      if (d !== null && d >= 0 && d <= 30) {
        alertas.push({ tipo: "IPVA", veiculo: v.nome, dias: d, cor: d <= 7 ? "red" : "amber" });
      }
    }
    if (v.odometro_atual >= (v.odometro_proxima_revisao || 10000) - 500) {
      alertas.push({ tipo: "Revisão", veiculo: v.nome, dias: null, cor: "blue", km: v.odometro_atual });
    }
  });

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header com gradiente verde */}
      <div className="bg-gradient-to-br from-primary to-green-700 text-white px-5 pt-8 pb-6 rounded-b-3xl">
        <p className="text-white/80 text-sm">Olá,</p>
        <h1 className="text-2xl font-bold">{motorista?.nome?.split(" ")[0] || "Cooperado"}</h1>
        <p className="text-white/70 text-xs mt-1">Cooperativa Educacional Terra Ideal</p>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h2 className="font-bold text-sm">Alertas Ativos ({alertas.length})</h2>
            </div>
            <div className="space-y-2">
              {alertas.slice(0, 4).map((a, i) => (
                <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg ${a.cor === "red" ? "bg-red-50" : a.cor === "amber" ? "bg-amber-50" : "bg-blue-50"}`}>
                  <div>
                    <p className="text-sm font-semibold">{a.tipo}</p>
                    <p className="text-xs text-muted-foreground">{a.veiculo}</p>
                  </div>
                  <span className={`text-xs font-bold ${a.cor === "red" ? "text-red-600" : a.cor === "amber" ? "text-amber-600" : "text-blue-600"}`}>
                    {a.dias !== null ? `${a.dias} dias` : `${a.km} km`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo de Pendências */}
        <Link to="/kanban" className="block bg-white rounded-2xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LayoutGridIcon />
              <h2 className="font-bold text-sm">Pendências Abertas</h2>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          {pendencias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pendência aberta 🎉</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(pendenciasPorTipo).slice(0, 6).map(([tipo, count]) => {
                const info = TIPOS_PENDENCIA[tipo] || TIPOS_PENDENCIA.outro;
                return (
                  <div key={tipo} className="text-center p-2.5 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{count}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{info.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Link>

        {/* Odômetro dos veículos */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm">Veículos</h2>
          </div>
          <div className="space-y-3">
            {veiculos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum veículo cadastrado</p>
            ) : (
              veiculos.map((v) => (
                <Link key={v.id} to={`/frota/${v.id}`} className="flex items-center justify-between hover:bg-muted/30 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.modelo || TIPOS_PENDENCIA[v.tipo]?.label || v.tipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{(v.odometro_atual || 0).toLocaleString("pt-BR")} km</p>
                    <p className={`text-[10px] ${STATUS_VEICULO[v.status]?.cor || ""} px-1.5 py-0.5 rounded-full inline-block`}>{STATUS_VEICULO[v.status]?.label || v.status}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Último registro */}
        {ultimoRegistro && (
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm">Último Registro de Uso</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{ultimoRegistro.motorista_nome || "—"}</p>
                <p className="text-xs text-muted-foreground">{formatarDataHoraBR(ultimoRegistro.data_hora_inicio)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Odômetro</p>
                <p className="text-sm font-bold tabular-nums">{(ultimoRegistro.odometro_registrado || 0).toLocaleString("pt-BR")} km</p>
              </div>
            </div>
            {ultimoRegistro.origem === "computador_de_bordo" && (
              <span className="inline-block mt-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Via Computador de Bordo</span>
            )}
          </div>
        )}

        {/* Acesso rápido */}
        <Link to="/checklist" className="block w-full bg-primary text-white rounded-2xl p-4 shadow-md active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-center gap-2">
            <ClipboardCheckIcon />
            <span className="font-bold text-base">Iniciar Uso do Veículo</span>
          </div>
          <p className="text-center text-white/80 text-xs mt-1">Checklist de saída em menos de 60 segundos</p>
        </Link>
      </div>
      <div className="h-4" />
    </div>
  );
}

function LayoutGridIcon() {
  return <LayoutGrid className="w-4 h-4 text-primary" />;
}
function ClipboardCheckIcon() {
  return <ClipboardCheck className="w-5 h-5" />;
}