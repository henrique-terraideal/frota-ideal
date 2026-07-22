import React from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Home, ClipboardCheck, LayoutGrid, Car, Menu as MenuIcon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/", label: "Início", icon: Home },
  { path: "/checklist", label: "Checklist", icon: ClipboardCheck },
  { path: "/kanban", label: "Pendências", icon: LayoutGrid },
  { path: "/frota", label: "Frota", icon: Car },
  { path: "/mais", label: "Mais", icon: MenuIcon }
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <main className="flex-1 pb-20 max-w-md mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] font-medium ${active ? "font-bold" : ""}`}>{item.label}</span>
                {active && <div className="w-6 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}