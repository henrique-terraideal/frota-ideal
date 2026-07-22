// Funções utilitárias compartilhadas entre backend functions da Gestão de Frota

// Converte data/hora brasileira "DD/MM/AAAA HH:MM:SS" para ISO string
export function parseDataHoraBR(dateString) {
  if (!dateString) return new Date().toISOString();
  const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    // Tenta só data "DD/MM/AAAA"
    const dateOnly = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateOnly) {
      const [, dia, mes, ano] = dateOnly;
      return new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`).toISOString();
    }
    // Se já for ISO ou outro formato, tenta Date direto
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const [, dia, mes, ano, hora, min, seg] = match;
  const iso = `${ano}-${mes}-${dia}T${hora}:${min}:${seg || "00"}-03:00`;
  return new Date(iso).toISOString();
}

// Formata ISO para "DD/MM/AAAA"
export function formatarDataBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Formata ISO para "DD/MM/AAAA HH:MM"
export function formatarDataHoraBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Calcula dias até o vencimento (a partir de hoje)
export function diasAteVencimento(dataISO) {
  if (!dataISO) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataISO);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
}

// Mapeia tipo de pendência para label amigável
export const TIPOS_PENDENCIA = {
  anomalia: "Anomalia",
  multa: "Multa",
  manutencao_programada: "Manutenção Programada",
  manutencao_corretiva: "Manutenção Corretiva",
  licenciamento: "Licenciamento",
  ipva: "IPVA",
  outro: "Outro"
};