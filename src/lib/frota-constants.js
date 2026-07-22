// Utilitários de formatação para o frontend da Gestão de Patrimônio

export function formatarDataBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatarDataHoraBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function diasAteVencimento(dataISO) {
  if (!dataISO) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataISO);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
}

export const TIPOS_PENDENCIA = {
  anomalia: { label: "Anomalia", cor: "bg-orange-100 text-orange-700 border-orange-200" },
  multa: { label: "Multa", cor: "bg-red-100 text-red-700 border-red-200" },
  manutencao_programada: { label: "Manutenção Programada", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  manutencao_corretiva: { label: "Manutenção Corretiva", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  licenciamento: { label: "Licenciamento", cor: "bg-purple-100 text-purple-700 border-purple-200" },
  ipva: { label: "IPVA", cor: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  outro: { label: "Outro", cor: "bg-gray-100 text-gray-700 border-gray-200" }
};

export const STATUS_PENDENCIA = {
  aberto: { label: "Aberto", cor: "bg-orange-50 text-orange-600" },
  em_andamento: { label: "Em Andamento", cor: "bg-blue-50 text-blue-600" },
  concluido: { label: "Concluído", cor: "bg-green-50 text-green-600" }
};

export const PRIORIDADE = {
  alta: { label: "Alta", cor: "bg-red-100 text-red-700" },
  media: { label: "Média", cor: "bg-yellow-100 text-yellow-700" },
  baixa: { label: "Baixa", cor: "bg-green-100 text-green-700" }
};

export const TIPOS_ATIVO = {
  carro: "Carro",
  caminhonete: "Caminhonete",
  maquina: "Máquina",
  instalacao: "Instalação",
  impressora: "Impressora",
  outro: "Outro"
};

export const UNIDADES_TEMPO_USO = {
  km: { label: "km", titulo: "Quilometragem", campo: "Odômetro", pergunta: "Qual a quilometragem atual do painel?", passo: "Leitura de Uso Atual" },
  horas: { label: "h", titulo: "Horímetro", campo: "Horímetro", pergunta: "Qual a leitura do horímetro (horas)?", passo: "Leitura de Uso Atual" },
  ciclos: { label: "ciclos", titulo: "Ciclos", campo: "Contador de Ciclos", pergunta: "Qual a contagem de ciclos atual?", passo: "Leitura de Uso Atual" },
  idade_dias: { label: "dias", titulo: "Idade (dias)", campo: "Idade", pergunta: null, passo: null }
};

export function infoUnidadeUso(ativo) {
  return UNIDADES_TEMPO_USO[ativo?.unidade_tempo_uso || "km"] || UNIDADES_TEMPO_USO.km;
}

export function tempoUsoAtual(ativo) {
  const unidade = ativo?.unidade_tempo_uso || "km";
  if (unidade === "idade_dias") {
    if (!ativo?.data_aquisicao) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(ativo.data_aquisicao).getTime()) / 86400000));
  }
  return ativo?.odometro_atual || 0;
}

export function formatarTempoUso(ativo) {
  const info = infoUnidadeUso(ativo);
  return `${tempoUsoAtual(ativo).toLocaleString("pt-BR")} ${info.label}`;
}

export const STATUS_ATIVO = {
  ativo: { label: "Ativo", cor: "bg-green-100 text-green-700" },
  inativo: { label: "Inativo", cor: "bg-gray-100 text-gray-700" },
  em_manutencao: { label: "Em Manutenção", cor: "bg-amber-100 text-amber-700" }
};

export const TIPOS_MANUTENCAO = {
  lavagem: "Limpeza",
  revisao_concessionaria: "Revisão na Concessionária",
  calibragem: "Calibragem",
  troca_oleo: "Troca de Óleo",
  corretiva: "Corretiva",
  outro: "Outro"
};

export const STATUS_MANUTENCAO = {
  programada: { label: "Programada", cor: "bg-blue-100 text-blue-700" },
  realizada: { label: "Realizada", cor: "bg-green-100 text-green-700" },
  cancelada: { label: "Cancelada", cor: "bg-gray-100 text-gray-700" }
};

export const STATUS_MULTA = {
  pendente: { label: "Pendente", cor: "bg-orange-100 text-orange-700" },
  em_recurso: { label: "Em Recurso", cor: "bg-blue-100 text-blue-700" },
  paga: { label: "Paga", cor: "bg-green-100 text-green-700" },
  cancelada: { label: "Cancelada", cor: "bg-gray-100 text-gray-700" }
};

export const PERMISSOES = {
  motorista: "Operador",
  gestor: "Gestor",
  administrativo: "Administrativo",
  administrador: "Administrador"
};

export const UNIDADES_TEMPO = {
  dias: "dias",
  semanas: "semanas",
  meses: "meses",
  anos: "anos"
};

export function formatarMoeda(valor) {
  if (valor == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}