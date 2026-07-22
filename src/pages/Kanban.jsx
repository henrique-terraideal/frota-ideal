import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { LayoutGrid, User, Calendar, Filter, X } from "lucide-react";
import { useFrotaData } from "@/hooks/useFrotaData";
import { TIPOS_PENDENCIA, STATUS_PENDENCIA, PRIORIDADE, formatarDataBR, formatarDataHoraBR } from "@/lib/frota-constants";

const COLUNAS = [
  { id: "aberto", titulo: "Aberto", cor: "bg-orange-50 border-orange-200" },
  { id: "em_andamento", titulo: "Em Andamento", cor: "bg-blue-50 border-blue-200" },
  { id: "concluido", titulo: "Concluído", cor: "bg-green-50 border-green-200" }
];

export default function Kanban() {
  const { motorista, veiculos } = useFrotaData();
  const [pendencias, setPendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [filtroVeiculo, setFiltroVeiculo] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [cardSelecionado, setCardSelecionado] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      const data = await base44.entities.Pendencia.list("-created_date", 200);
      setPendencias(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function filtrar(p) {
    if (filtroTipo && p.tipo !== filtroTipo) return false;
    if (filtroVeiculo && p.ativo_id !== filtroVeiculo) return false;
    return true;
  }

  const pendenciasFiltradas = pendencias.filter(filtrar);

  async function onDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const novoStatus = destination.droppableId;
    const pendencia = pendencias.find((p) => p.id === draggableId);
    if (!pendencia || pendencia.status === novoStatus) return;

    const update = { status: novoStatus };
    if (novoStatus === "concluido") {
      update.data_conclusao = new Date().toISOString().split("T")[0];
      if (motorista?.nome) update.responsavel_nome = motorista.nome;
    }

    setPendencias(pendencias.map((p) => p.id === draggableId ? { ...p, ...update } : p));

    try {
      await base44.entities.Pendencia.update(draggableId, update);
    } catch (e) {
      console.error(e);
      carregar();
    }
  }

  async function salvarCard(pendencia, dados) {
    try {
      await base44.entities.Pendencia.update(pendencia.id, dados);
      setPendencias(pendencias.map((p) => p.id === pendencia.id ? { ...p, ...dados } : p));
      setCardSelecionado(null);
    } catch (e) {
      console.error(e);
    }
  }

  const tiposAtivos = [...new Set(pendencias.map((p) => p.tipo))];

  return (
    <div className="min-h-full">
      <div className="bg-white border-b border-border px-5 pt-6 pb-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pendências</h1>
              <p className="text-xs text-muted-foreground">{pendenciasFiltradas.filter(p => p.status !== "concluido").length} abertas</p>
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="w-10 h-10 rounded-xl border border-border flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setFiltroTipo(null)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!filtroTipo ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>Todos os tipos</button>
              {tiposAtivos.map((t) => (
                <button key={t} onClick={() => setFiltroTipo(filtroTipo === t ? null : t)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filtroTipo === t ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{TIPOS_PENDENCIA[t]?.label || t}</button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setFiltroVeiculo(null)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!filtroVeiculo ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>Todos os ativos</button>
              {veiculos.map((v) => (
                <button key={v.id} onClick={() => setFiltroVeiculo(filtroVeiculo === v.id ? null : v.id)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filtroVeiculo === v.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{v.nome}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 px-4 py-4 overflow-x-auto" style={{ minHeight: "calc(100vh - 180px)" }}>
            {COLUNAS.map((col) => {
              const items = pendenciasFiltradas.filter((p) => p.status === col.id);
              return (
                <Droppable droppableId={col.id} key={col.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex-shrink-0 w-72">
                      <div className={`rounded-2xl border-2 p-2 ${col.cor} ${snapshot.isDraggingOver ? "ring-2 ring-primary" : ""}`}>
                        <div className="flex items-center justify-between px-2 py-1.5">
                          <h2 className="font-bold text-sm">{col.titulo}</h2>
                          <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full">{items.length}</span>
                        </div>
                        <div className="space-y-2 mt-1">
                          {items.map((p, index) => (
                            <Draggable draggableId={p.id} key={p.id} index={index}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => setCardSelecionado(p)}
                                  className={`bg-white rounded-xl p-3 shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow ${snap.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}
                                >
                                  <div className="flex items-start justify-between mb-1.5">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TIPOS_PENDENCIA[p.tipo]?.cor || TIPOS_PENDENCIA.outro.cor}`}>{TIPOS_PENDENCIA[p.tipo]?.label || p.tipo}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PRIORIDADE[p.prioridade]?.cor || ""}`}>{PRIORIDADE[p.prioridade]?.label || ""}</span>
                                  </div>
                                  <p className="text-sm font-semibold leading-tight">{p.titulo}</p>
                                  {p.ativo_nome && <p className="text-xs text-muted-foreground mt-1">{p.ativo_nome}</p>}
                                  {p.responsavel_nome && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                      <User className="w-3 h-3" /> {p.responsavel_nome}
                                    </div>
                                  )}
                                  {p.data_limite && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                      <Calendar className="w-3 h-3" /> {formatarDataBR(p.data_limite)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {items.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-6">Vazio</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {cardSelecionado && (
        <CardDetail card={cardSelecionado} motorista={motorista} onClose={() => setCardSelecionado(null)} onSave={salvarCard} />
      )}
    </div>
  );
}

function CardDetail({ card, motorista, onClose, onSave }) {
  const [responsavel, setResponsavel] = useState(card.responsavel_nome || "");
  const [observacao, setObservacao] = useState(card.descricao || "");
  const [prioridade, setPrioridade] = useState(card.prioridade || "media");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    await onSave(card, { responsavel_nome: responsavel, descricao: observacao, prioridade });
    setSalvando(false);
  }

  async function moverStatus(novoStatus) {
    const update = { status: novoStatus };
    if (novoStatus === "concluido") {
      update.data_conclusao = new Date().toISOString().split("T")[0];
    }
    await onSave(card, update);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Editar Pendência</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <span className={`inline-block text-xs px-2 py-1 rounded-full border mb-3 ${TIPOS_PENDENCIA[card.tipo]?.cor || ""}`}>{TIPOS_PENDENCIA[card.tipo]?.label || card.tipo}</span>
        <h3 className="font-bold text-base mb-1">{card.titulo}</h3>
        {card.ativo_nome && <p className="text-sm text-muted-foreground mb-4">{card.ativo_nome}</p>}

        <label className="text-xs font-semibold text-muted-foreground">Responsável</label>
        <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Defina um responsável" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mb-3 focus:border-primary outline-none" />

        <label className="text-xs font-semibold text-muted-foreground">Observação / Descrição</label>
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mb-3 focus:border-primary outline-none resize-none" />

        <label className="text-xs font-semibold text-muted-foreground">Prioridade</label>
        <div className="flex gap-2 mb-4">
          {Object.entries(PRIORIDADE).map(([k, v]) => (
            <button key={k} onClick={() => setPrioridade(k)} className={`flex-1 py-2 rounded-lg text-xs font-medium ${prioridade === k ? v.cor + " ring-2 ring-offset-1 ring-primary/30" : "bg-muted text-muted-foreground"}`}>{v.label}</button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {card.status !== "concluido" && (
            <button onClick={() => moverStatus(card.status === "aberto" ? "em_andamento" : "concluido")} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold">
              {card.status === "aberto" ? "Mover para Em Andamento" : "Marcar Concluído"}
            </button>
          )}
        </div>

        <button onClick={salvar} disabled={salvando} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-50">{salvando ? "Salvando..." : "Salvar"}</button>
      </div>
    </div>
  );
}