import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { api, fetchTTS } from "../services/api";
import { streamChat } from "../services/sse";
import { uploadAudio } from "../services/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/card";
import { Mic, Send, Volume2, Square, Loader2, Plus } from "lucide-react";

const LANGS = [
  { code: "hi-IN", label: "Hindi" },
  { code: "en-IN", label: "English" },
  { code: "mr-IN", label: "Marathi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "bn-IN", label: "Bengali" },
];

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards: any[];
  pendingActions: any[];
  toolEvents: { tool: string; status: string; summary: string }[];
}

export default function Assistant() {
  const location = useLocation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [convId, setConvId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("hi-IN");
  const [autoPlay, setAutoPlay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const d = await api<{ conversations: any[] }>("/api/conversations");
      setConversations(d.conversations);
    } catch {}
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    const seed = (location.state as any)?.seed;
    if (seed) {
      send(seed);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = await api<{ preferences: any }>("/api/preferences");
        if (p.preferences) {
          setLanguage(p.preferences.languageCode || "hi-IN");
          setAutoPlay(p.preferences.autoPlayTts ?? true);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  async function loadMessages(id: string) {
    const d = await api<{ messages: any[] }>(`/api/conversations/${id}/messages`);
    const mapped: Msg[] = d.messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      text: m.content?.text ?? (typeof m.content === "string" ? m.content : ""),
      cards: m.content?.cards ?? [],
      pendingActions: m.content?.pendingActions ?? [],
      toolEvents: m.content?.toolEvents ?? [],
    }));
    setMessages(mapped);
  }

  async function newConversation() {
    const d = await api<{ conversation: any }>("/api/conversations", { method: "POST", body: JSON.stringify({ title: "New conversation" }) });
    setConvId(d.conversation.id);
    setMessages([]);
    loadConversations();
  }

  async function selectConversation(id: string) {
    setConvId(id);
    await loadMessages(id);
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text, cards: [], pendingActions: [], toolEvents: [] };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    const acc = { text: "", cards: [] as any[], pending: [] as any[], tools: [] as any[] };
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: assistantId, role: "assistant", text: "", cards: [], pendingActions: [], toolEvents: [] }]);

    try {
      await streamChat(text, convId, language, (e) => {
        if (e.event === "meta") {
          if (e.data.conversationId && !convId) setConvId(e.data.conversationId);
        } else if (e.event === "tool_start") {
          acc.tools.push({ tool: e.data.tool, status: "running", summary: "" });
          setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, toolEvents: [...acc.tools] } : mm));
        } else if (e.event === "tool_result") {
          const t = acc.tools.find((x) => x.tool === e.data.tool && x.status === "running");
          if (t) { t.status = e.data.ok ? "completed" : "failed"; t.summary = e.data.summary; }
          setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, toolEvents: [...acc.tools] } : mm));
        } else if (e.event === "card") {
          acc.cards.push(e.data);
          setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, cards: [...acc.cards] } : mm));
        } else if (e.event === "pending_action") {
          acc.pending.push(e.data);
          setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, pendingActions: [...acc.pending] } : mm));
        } else if (e.event === "text") {
          acc.text = e.data.text;
          setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, text: acc.text } : mm));
        } else if (e.event === "done") {
          if (e.data.messageId) {
            setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, id: e.data.messageId } : mm));
          }
          loadConversations();
          // TTS
          if (autoPlay && acc.text) {
            (async () => {
              try {
                const b64 = await fetchTTS(acc.text, language);
                const audio = new Audio(`data:audio/wav;base64,${b64}`);
                audio.play().catch(() => {});
              } catch {}
            })();
          }
        }
      });
    } catch (e: any) {
      setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, text: `Error: ${e?.message ?? e}` } : mm));
    } finally {
      setBusy(false);
    }
  }

  function startRecording() {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecording(false);
        setBusy(true);
        try {
          const r = await uploadAudio(blob, language);
          setTranscript(r.transcript);
          setInput(r.transcript);
          await send(r.transcript);
        } catch (e: any) {
          setTranscript(`Transcription failed: ${e?.message ?? e}`);
        } finally {
          setBusy(false);
        }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    }).catch(() => alert("Microphone access denied"));
  }

  function stopRecording() {
    mediaRef.current?.stop();
  }

  async function replayTTS(text: string) {
    try {
      const b64 = await fetchTTS(text, language);
      const audio = new Audio(`data:audio/wav;base64,${b64}`);
      audio.play().catch(() => {});
    } catch {}
  }

  async function approveAction(approvalId: string, actionId: string, approve: boolean) {
    try {
      const path = approve ? `/api/approvals/${approvalId}/approve` : `/api/approvals/${approvalId}/reject`;
      const res = await api<any>(path, { method: "POST", body: JSON.stringify({}) });
      // update messages: mark pending action executed
      setMessages((m) => m.map((mm) => ({
        ...mm,
        pendingActions: mm.pendingActions.map((pa) => pa.id === actionId ? { ...pa, status: approve ? "approved" : "rejected", execution: res.execution } : pa),
        cards: [...mm.cards, ...(res.execution?.card ? [res.execution.card] : [])],
      })));
      if (res.execution?.card) {}
    } catch (e: any) {
      alert(e?.message ?? "action failed");
    }
  }

  return (
    <div className="flex h-full">
      {/* conversation list */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-desk/60">
        <div className="p-3">
          <Button className="w-full" size="sm" onClick={newConversation}><Plus size={14} /> New conversation</Button>
        </div>
        <div className="flex-1 overflow-auto px-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full text-left px-3 py-2 rounded-sm text-xs ${convId === c.id ? "bg-margin text-paper" : "text-paper/70 hover:bg-white/5"}`}
            >
              <div className="font-semibold truncate">{c.title}</div>
              <div className="text-[10px] opacity-60">{new Date(c.updatedAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/5">
          <label className="text-[10px] uppercase tracking-widest text-paper/70">Language</label>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              api("/api/preferences", { method: "PUT", body: JSON.stringify({ languageCode: e.target.value }) }).catch(() => {});
            }}
            className="mt-1 w-full h-9 rounded-sm bg-paper/10 text-paper text-sm px-2 border border-white/10"
          >
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <label className="flex items-center gap-2 mt-3 text-xs text-paper/70">
            <input type="checkbox" checked={autoPlay} onChange={(e) => { setAutoPlay(e.target.checked); api("/api/preferences", { method: "PUT", body: JSON.stringify({ autoPlayTts: e.target.checked }) }).catch(() => {}); }} />
            Auto-play voice reply
          </label>
        </div>
      </aside>

      {/* chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-paper/70 mt-20">
              <Mic size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Speak or type a request. DIA will investigate and propose.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} onApprove={approveAction} onReplay={replayTTS} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-paper/70 text-sm">
              <Loader2 size={14} className="animate-spin" /> DIA is working...
            </div>
          )}
        </div>

        {/* input bar */}
        <div className="border-t border-white/5 p-3 md:p-4 bg-desk">
          {transcript && <div className="text-xs text-paper/70 mb-2 truncate">Transcript: {transcript}</div>}
          <div className="flex items-center gap-2">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`h-11 w-11 rounded-full flex items-center justify-center transition ${recording ? "bg-margin text-paper animate-pulse" : "bg-paper/10 text-paper hover:bg-paper/20"}`}
              title={recording ? "Stop" : "Record"}
            >
              {recording ? <Square size={16} /> : <Mic size={18} />}
            </button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask DIA anything about your business..."
              className="flex-1 bg-paper/10 text-paper placeholder:text-paper/70 border-white/10"
            />
            <Button onClick={() => send(input)} disabled={busy || !input.trim()} size="md">
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m, onApprove, onReplay }: { m: Msg; onApprove: any; onReplay: (t: string) => void }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "bg-margin text-paper" : "paper-panel text-ink"} rounded-sm px-4 py-3`}>
        {m.text && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {m.text}
            {!isUser && m.text && (
              <button onClick={() => onReplay(m.text)} className="ml-2 inline-flex items-center text-ink/70 hover:text-margin" title="Play">
                <Volume2 size={12} />
              </button>
            )}
          </div>
        )}
        {m.toolEvents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.toolEvents.map((te, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-sm border ${te.status === "completed" ? "border-green-700/40 text-green-700 bg-green-50" : te.status === "failed" ? "border-red-700/40 text-red-700 bg-red-50" : "border-amber-700/40 text-amber-700 bg-amber-50"}`}>
                {te.tool.replace(/_/g, " ")} {te.status === "completed" ? "✓" : te.status === "failed" ? "✗" : "…"}
              </span>
            ))}
          </div>
        )}
        {m.cards.map((card, i) => (
          <div key={i} className="mt-3">
            <RenderCard card={card} />
          </div>
        ))}
        {m.pendingActions.map((pa, i) => (
          <div key={`pa-${i}`} className="mt-3">
            <ApprovalCard pa={pa} onApprove={onApprove} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderCard({ card }: { card: any }) {
  if (!card) return null;
  if (card.type === "insight") {
    return (
      <Card className="bg-paper-2">
        <div className="text-xs uppercase tracking-widest text-ink/70 mb-2">{card.title}</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {card.metrics?.map((mm: any, i: number) => (
            <div key={i} className="text-xs">
              <div className="text-ink/70">{mm.label}</div>
              <div className="font-bold text-ink">{mm.value}</div>
            </div>
          ))}
        </div>
        {card.body && <div className="text-sm text-ink/80 mb-2">{card.body}</div>}
        {card.evidence?.length > 0 && (
          <div className="text-xs text-ink/70 space-y-1">
            <div className="font-semibold text-ink/70">Evidence</div>
            {card.evidence.map((e: string, i: number) => <div key={i}>· {e}</div>)}
          </div>
        )}
        {card.hypotheses?.length > 0 && (
          <div className="text-xs text-ink/70 space-y-1 mt-2">
            <div className="font-semibold text-ink/70">Hypotheses (not proven)</div>
            {card.hypotheses.map((h: string, i: number) => <div key={i}>· {h}</div>)}
          </div>
        )}
        {card.confidence && <div className="text-[10px] uppercase tracking-widest text-ink/70 mt-2">Confidence: {card.confidence}</div>}
      </Card>
    );
  }
  if (card.type === "segment") {
    const segs = card.segments ?? (card.segment ? [card.segment] : []);
    return (
      <Card className="bg-paper-2">
        <div className="text-xs uppercase tracking-widest text-ink/70 mb-2">{card.title}</div>
        <div className="space-y-1.5">
          {segs.map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-ink/10 pb-1 last:border-0">
              <div>
                <div className="font-medium text-ink">{s.name ?? s.title}</div>
                <div className="text-[11px] text-ink/70">{s.description}</div>
              </div>
              <div className="font-bold text-margin">{s.count ?? s.customerCount}</div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (card.type === "offer") {
    return (
      <Card className="bg-paper-2">
        <div className="text-xs uppercase tracking-widest text-ink/70 mb-2">Offer prepared</div>
        <div className="text-sm font-bold text-ink mb-2">{card.title}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-ink/70">Type</span><div className="font-bold">{card.offer?.type} {card.offer?.value}</div></div>
          <div><span className="text-ink/70">Audience</span><div className="font-bold">{card.audienceSize}</div></div>
          <div><span className="text-ink/70">Est. cost</span><div className="font-bold">Rs. {card.estimatedCost?.toLocaleString("en-IN")}</div></div>
          <div><span className="text-ink/70">Est. revenue</span><div className="font-bold">Rs. {card.estimatedRevenue?.toLocaleString("en-IN")}</div></div>
          <div><span className="text-ink/70">Margin</span><div className={`font-bold ${card.marginOk ? "text-green-700" : "text-margin"}`}>{card.marginOk ? "healthy" : "tight"}</div></div>
          <div><span className="text-ink/70">Validity</span><div className="font-bold">{card.offer?.validityDays} days</div></div>
        </div>
        {card.assumptions && <div className="text-[11px] text-ink/70 mt-2">Assumptions: {card.assumptions}</div>}
      </Card>
    );
  }
  if (card.type === "campaign_preview") {
    return (
      <Card className="bg-paper-2">
        <div className="text-xs uppercase tracking-widest text-ink/70 mb-2">Campaign preview</div>
        <div className="text-sm font-bold text-ink mb-1">{card.name}</div>
        <div className="text-xs text-ink/70 mb-2">Audience: {card.audience} · {card.language} · {card.channel}</div>
        <div className="paper-panel bg-paper/80 p-3 text-sm text-ink italic">"{card.message}"</div>
        {card.offer && <div className="text-xs text-ink/70 mt-2">Offer: {card.offer}</div>}
      </Card>
    );
  }
  if (card.type === "campaign_result") {
    return (
      <Card className="bg-paper-2">
        <div className="text-xs uppercase tracking-widest text-ink/70 mb-2">Campaign executed (mock Paytm)</div>
        <div className="text-sm font-bold text-ink mb-2">{card.name}</div>
        {card.receipt && <div className="text-[10px] uppercase tracking-widest text-ink/60 mb-2">Receipt {card.receipt}</div>}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-ink/70">Sent</span><div className="font-bold">{card.sent}</div></div>
          <div><span className="text-ink/70">Delivered</span><div className="font-bold">{card.delivered}</div></div>
          <div><span className="text-ink/70">Opened</span><div className="font-bold">{card.opened}</div></div>
          <div><span className="text-ink/70">Redeemed</span><div className="font-bold">{card.redeemed}</div></div>
          <div className="col-span-2"><span className="text-ink/70">Revenue attributed</span><div className="font-bold">Rs. {card.revenueAttributed?.toLocaleString("en-IN")}</div></div>
        </div>
        <div className="text-[10px] text-ink/70 mt-2">Provider: {card.provider}</div>
      </Card>
    );
  }
  return (
    <Card className="bg-paper-2">
      <pre className="text-[10px] text-ink/70 overflow-auto">{JSON.stringify(card, null, 2)}</pre>
    </Card>
  );
}

function ApprovalCard({ pa, onApprove }: { pa: any; onApprove: any }) {
  const s = pa.summary || {};
  const [busy, setBusy] = useState(false);
  const done = pa.status && pa.status !== "pending" && pa.status !== "pending_approval";
  return (
    <Card className="bg-paper border-2 border-margin">
      <div className="text-xs uppercase tracking-widest text-margin mb-2">Approval required</div>
      <div className="text-sm font-bold text-ink mb-1">{pa.title}</div>
      <div className="space-y-1.5 text-xs text-ink/70 mb-3">
        <div><span className="font-semibold text-ink">What:</span> {s.what}</div>
        <div><span className="font-semibold text-ink">Why:</span> {s.why}</div>
        <div><span className="font-semibold text-ink">Audience:</span> {s.audience} customers</div>
        <div><span className="font-semibold text-ink">Offer:</span> {s.offer}</div>
        <div><span className="font-semibold text-ink">Est. cost:</span> Rs. {(s.estimatedCost ?? 0).toLocaleString("en-IN")}</div>
      </div>
      {s.message && (
        <div className="paper-panel bg-paper/80 p-2.5 text-sm text-ink italic mb-3">"{s.message}"</div>
      )}
      {!done ? (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" disabled={busy} onClick={async () => { setBusy(true); await onApprove(s.approvalId, pa.id, true); setBusy(false); }}>
            {busy ? "..." : "Approve & send"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={async () => { setBusy(true); await onApprove(s.approvalId, pa.id, false); setBusy(false); }}>
            Reject
          </Button>
        </div>
      ) : (
        <div className="text-xs font-semibold text-green-700">Status: {pa.status}</div>
      )}
    </Card>
  );
}
