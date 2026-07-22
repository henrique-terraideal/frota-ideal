import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Hook que carrega o usuário atual e a lista de veículos
export function useFrotaData() {
  const [user, setUser] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [me, veiculosData] = await Promise.all([
          base44.auth.me(),
          base44.entities.Veiculo.list()
        ]);
        setUser(me);
        setVeiculos(veiculosData);
      } catch (e) {
        console.error("Erro ao carregar dados da frota:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compat: mantém "motorista" como alias do user para não quebrar componentes que usam motorista.nome / motorista.id
  const motorista = user ? {
    id: user.id,
    nome: user.full_name,
    permissao: user.role === "admin" ? "administrador" : "motorista",
    user_id: user.id
  } : null;

  return { user, motorista, veiculos, loading, setUser, setVeiculos };
}

export function isAdmin(user) {
  return user?.role === "admin" || user?.permissao === "administrador";
}

// Compat: aceita user ou motorista (objeto com permissao)
export function isGestorOuAdmin(user) {
  if (!user) return false;
  return user.role === "admin" || user.permissao === "administrador" || user.permissao === "gestor";
}