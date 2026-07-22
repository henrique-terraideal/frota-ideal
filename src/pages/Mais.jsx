import React from "react";
import { Link } from "react-router-dom";
import { useFrotaData } from "@/hooks/useFrotaData";
import { isGestorOuAdmin } from "@/hooks/useFrotaData";
import { ClipboardList, Car, Wrench, Settings, Receipt, ChevronRight, User, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Mais() {
  const { user, motorista } = useFrotaData();
  const { logout } = useAuth();
  const ehAdmin = user?.role === "admin" || motorista?.permissao === "administrador";

  const menuItems = [
    { path: "/perfil", label: "Meu Perfil", icon: UserCircle, desc: "Editar foto, nome e telefone", show: true },
    { path: "/registros", label: "Registros de Uso", icon: ClipboardList, desc: "Histórico de quem usou cada ativo", show: true },
    { path: "/multas", label: "Multas", icon: Receipt, desc: "Registrar e gerenciar multas", show: ehAdmin },
    { path: "/manutencoes", label: "Manutenções", icon: Wrench, desc: "Manutenções programadas e realizadas", show: ehAdmin },
    { path: "/frota", label: "Patrimônio", icon: Car, desc: "Ficha completa dos ativos", show: ehAdmin },
    { path: "/admin", label: "Painel Administrativo", icon: Settings, desc: "Ativos, usuários, checklist, ESP32", show: ehAdmin }
  ].filter((i) => i.show);

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-br from-primary to-green-700 text-white px-5 pt-8 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{user?.full_name || "Usuário"}</h1>
            <p className="text-white/70 text-xs capitalize">{user?.role === "admin" ? "Administrador" : "Operador"} • Terra Ideal</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow active:scale-[0.98]">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          );
        })}

        <button onClick={() => logout()} className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-border p-4 mt-4 hover:shadow-md transition-shadow active:scale-[0.98]">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm text-red-600">Sair</p>
            <p className="text-xs text-muted-foreground">Encerrar sessão</p>
          </div>
        </button>

        <p className="text-center text-xs text-muted-foreground mt-6 pb-4">Gestão de Patrimônio • Terra Ideal v1.0</p>
      </div>
    </div>
  );
}