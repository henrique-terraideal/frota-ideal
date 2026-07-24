import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";

// Hook que carrega o usuário atual e a lista de ativos
export function useFrotaData() {
  const [user, setUser] = useState(null);
  const [ativos, setAtivos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [me, ativosData] = await Promise.all([
          base44.auth.me(),
          base44.entities.Ativo.list()
        ]);
        setUser(me);
        setAtivos(ativosData);
      } catch (e) {
        console.error("Erro ao carregar dados do patrimônio:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compat: mantém "motorista" e "veiculos" como aliases para não quebrar componentes legados
  // useMemo: garante referência estável enquanto `user` não muda, evitando loops em
  // useEffects de consumidores que dependem de [motorista].
  const operador = useMemo(() => user ? {
    id: user.id,
    nome: user.full_name,
    permissao: user.role === "admin" ? "administrador" : "motorista",
    user_id: user.id
  } : null, [user]);

  return { user, motorista: operador, operador, veiculos: ativos, ativos, loading, setUser, setAtivos, setVeiculos: setAtivos };
}

export function isAdmin(user) {
  return user?.role === "admin" || user?.permissao === "administrador";
}

// Compat: aceita user ou operador (objeto com permissao)
export function isGestorOuAdmin(user) {
  if (!user) return false;
  return user.role === "admin" || user.permissao === "administrador" || user.permissao === "gestor";
}