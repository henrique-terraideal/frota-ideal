import React, { useState } from "react";
import { Car, Users, ClipboardCheck, Cpu, Monitor, Code, ChevronRight } from "lucide-react";
import AdminVeiculos from "@/components/frota/admin/AdminVeiculos";
import AdminUsuarios from "@/components/frota/admin/AdminUsuarios";
import AdminChecklist from "@/components/frota/admin/AdminChecklist";
import AdminComputadoresDeBordo from "@/components/frota/admin/AdminComputadoresDeBordo";
import AdminEsp32 from "@/components/frota/admin/AdminEsp32";

const TABS = [
  { id: "veiculos", label: "Veículos", icon: Car },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "checklist", label: "Checklist", icon: ClipboardCheck },
  { id: "dispositivos", label: "Dispositivos", icon: Monitor },
  { id: "esp32", label: "Firmware IA", icon: Code }
];

export default function Admin() {
  const [aba, setAba] = useState("veiculos");

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-br from-primary to-green-700 text-white px-5 pt-8 pb-6 rounded-b-3xl">
        <h1 className="text-xl font-bold">Painel Administrativo</h1>
        <p className="text-white/70 text-xs">Gerencie veículos, motoristas, checklist e hardware</p>
      </div>

      {/* Tabs */}
      <div className="px-5 -mt-3">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-2 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${aba === t.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4">
        {aba === "veiculos" && <AdminVeiculos />}
        {aba === "usuarios" && <AdminUsuarios />}
        {aba === "checklist" && <AdminChecklist />}
        {aba === "dispositivos" && <AdminComputadoresDeBordo />}
        {aba === "esp32" && <AdminEsp32 />}
      </div>
    </div>
  );
}