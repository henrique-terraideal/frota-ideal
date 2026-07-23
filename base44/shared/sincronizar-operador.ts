// Lógica central de sincronização User -> Operador.
// Compartilhada pela automação (sincronizarOperador) e pelo backfill (backfillOperadores).

export async function sincronizarOperadorUnico(base44, user) {
  if (!user.codigo_bordo) {
    return { skipped: true, motivo: "Usuário sem codigo_bordo — nenhuma ação necessária." };
  }

  const userId = user.id || user.user_id;
  const nome = user.full_name || user.email || "Sem nome";

  // Verifica se já existe um Operador vinculado a este User
  const existentes = await base44.asServiceRole.entities.Operador.filter({ user_id: userId });

  if (existentes.length > 0) {
    // Atualiza o Operador existente com os dados mais recentes do User
    const operador = existentes[0];
    await base44.asServiceRole.entities.Operador.update(operador.id, {
      nome,
      codigo_bordo: user.codigo_bordo,
      ativo: true,
    });
    return { action: "updated", operador_id: operador.id };
  }

  // Cria um novo Operador vinculado ao User
  const novoOperador = await base44.asServiceRole.entities.Operador.create({
    user_id: userId,
    nome,
    codigo_bordo: user.codigo_bordo,
    permissao: user.role === "admin" ? "administrador" : "motorista",
    ativo: true,
  });
  return { action: "created", operador_id: novoOperador.id };
}