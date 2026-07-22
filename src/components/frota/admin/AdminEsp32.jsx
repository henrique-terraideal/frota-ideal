import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, Send, Loader2, Copy, Check, MessageSquare, Sparkles } from "lucide-react";

const AGENT_NAME = "esp32_gerador";

export default function AdminEsp32() {
  const [conversa, setConversa] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [dispositivos, setDispositivos] = useState([]);
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const disps = await base44.entities.ComputadorDeBordo.list();
        setDispositivos(disps);
        if (disps.length > 0) setDispositivoSelecionado(disps[0].id);
        const conversas = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        if (conversas.length > 0) {
          setConversa(conversas[0]);
          setMensagens(conversas[0].messages || []);
        } else {
          const nova = await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: "Gerador ESP32", description: "Geração de código para o Computador de Bordo" } });
          setConversa(nova);
        }
      } catch (e) {
        console.error("Erro ao inicializar conversa:", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!conversa?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversa.id, (data) => {
      setMensagens(data.messages || []);
      setEnviando(false);
    });
    return () => unsubscribe();
  }, [conversa?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar() {
    if (!input.trim() || !conversa) return;
    setEnviando(true);
    try {
      const disp = dispositivos.find((d) => d.id === dispositivoSelecionado);
      const contexto = disp
        ? `[CONFIGURAÇÃO AUTOMÁTICA]\nDEVICE_ID: ${disp.device_id}\nBASE_URL: ${window.location.origin}\nVEICULO_NOME: ${disp.veiculo_nome || disp.nome || ""}\nGere o firmware para o dispositivo ${disp.device_id} vinculado ao veículo ${disp.veiculo_nome || ""}. Use BASE_URL = ${window.location.origin}. Essas constantes já devem vir preenchidas no código gerado no topo do arquivo. Adicione o comentário: // Configurado automaticamente pelo painel admin em ${new Date().toLocaleDateString("pt-BR")}.\n\n---\n\n`
        : "";
      const conv = await base44.agents.getConversation(conversa.id);
      await base44.agents.addMessage(conv, { role: "user", content: contexto + input.trim() });
      setInput("");
    } catch (e) {
      console.error(e);
      setEnviando(false);
    }
  }

  function copiar(texto) {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-sm">Agente Gerador de Código ESP32</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Descreva em linguagem natural a mudança desejada no firmware do Computador de Bordo (ESP32-S3). O agente gera o código C++ completo, pronto para copiar e gravar via Arduino IDE.
        </p>
      </div>

      {/* Seletor de dispositivo */}
      <div className="bg-white rounded-2xl border border-border p-3">
        <label className="text-xs font-semibold text-muted-foreground">Para qual dispositivo gerar o firmware?</label>
        <select value={dispositivoSelecionado} onChange={(e) => setDispositivoSelecionado(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm mt-1 focus:border-primary outline-none">
          <option value="">Selecione um dispositivo...</option>
          {dispositivos.map((d) => <option key={d.id} value={d.id}>{d.device_id} — {d.veiculo_nome || d.nome || "Sem veículo"}</option>)}
        </select>
        {dispositivoSelecionado && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            As constantes DEVICE_ID e BASE_URL serão injetadas automaticamente no código gerado.
          </p>
        )}
      </div>

      {/* Chat */}
      <div className="bg-white rounded-2xl border border-border p-3 min-h-[400px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-[500px]">
          {mensagens.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="w-8 h-8 text-primary/40 mb-2" />
              <p className="text-sm text-muted-foreground">Descreva o que precisa no Computador de Bordo</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Ex: "Adicionar pergunta sobre nível de combustível no checklist"</p>
            </div>
          )}
          {mensagens.filter((m) => m.role === "user" || m.role === "assistant").map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${isUser ? "bg-primary text-white" : "bg-muted/50 text-foreground"}`}>
                  {msg.content && (
                    isUser ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-sm">
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs bg-white/50 rounded-lg p-2 overflow-x-auto">{msg.content}</pre>
                        {msg.content.includes("#include") || msg.content.includes("void setup") ? (
                          <button onClick={() => copiar(msg.content)} className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                            {copiado ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar código</>}
                          </button>
                        ) : null}
                      </div>
                    )
                  )}
                  {msg.tool_calls?.map((tc, i) => (
                    <div key={i} className="mt-1 text-[10px] opacity-70 bg-black/10 rounded px-2 py-1">
                      ⚙️ {tc.name || "ferramenta"}: {tc.status}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {enviando && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-2xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Gerando código...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t border-border pt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Descreva a mudança..."
            className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none"
            disabled={enviando}
          />
          <button onClick={enviar} disabled={enviando || !input.trim()} className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50">
            {enviando ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Documentação técnica */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <h3 className="font-bold text-xs text-muted-foreground mb-2">DOCUMENTAÇÃO TÉCNICA DO HARDWARE</h3>
        <div className="text-xs space-y-1 text-muted-foreground font-mono">
          <p><strong>MCU:</strong> ESP32-S3 (Wi-Fi + BLE)</p>
          <p><strong>Display:</strong> OLED SSD1306 128x64px (I2C)</p>
          <p><strong>Teclado:</strong> Matricial 4x4</p>
          <p><strong>LED:</strong> RGB WS2812B NeoPixel</p>
          <p><strong>Pinagem:</strong></p>
          <p className="pl-2">Rows: 15,16,17,18 | Cols: 3,46,9,10</p>
          <p className="pl-2">OLED: SDA=11, SCL=12 (3.3V) | LED: 48</p>
          <p><strong>Endpoint:</strong> /api/functions/receberRegistroESP32</p>
        </div>
      </div>
    </div>
  );
}