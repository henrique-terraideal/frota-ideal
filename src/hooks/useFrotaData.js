import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Hook que carrega o motorista atual (vinculado ao usuário logado) e a lista de veículos
export function useFrotaData() {
  const [motorista, setMotorista] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [user, motoristasData, veiculosData] = await Promise.all([
          base44.auth.me(),
          base44.entities.Motorista.list(),
          base44.entities.Veiculo.list()
        ]);
        const meuMotorista = motoristasData.find((m) => m.user_id === user.id) || null;
        setMotorista(meuMotorista || { nome: user.full_name, permissao: "motorista", user_id: user.id, id: null });
        setVeiculos(veiculosData);
      } catch (e) {
        console.error("Erro ao carregar dados da frota:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return { motorista, veiculos, loading, setMotorista, setVeiculos };
}

export function podeAcessar(motorista, ...permissoes) {
  if (!motorista) return false;
  return permissoes.includes(motorista.permissao);
}

export function isAdmin(motorista) {
  return motorista?.permissao === "administrador";
}

export function isGestorOuAdmin(motorista) {
  return motorista?.permissao === "gestor" || motorista?.permissao === "administrador";
}