import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { api, fetchTTS } from "../services/api";
import { streamChat } from "../services/sse";
import { uploadAudio } from "../services/api";

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
    try { const d = await api<{ conversations: any[] }>("/api/conversations"); setConversations(d.conversations); } catch {}
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    (async () => {
      try {
        const p = await api<{ preferences: any }>("/api/preferences");
        if (p.preferences) { setLanguage(p.preferences.languageCode || "hi-IN"); setAutoPlay(p.preferences.autoPlayTts ?? true); }
      } catch {}
    })();
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  async function loadMessages(id: string) {
    const d = await api<{ messages: any[] }>(`/api/conversations/${id}/messages`);
    const mapped: Msg[] = d.messages.map((m: any) => ({
      id: m.id, role: m.role,
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
          if (e.data.messageId) setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, id: e.data.messageId } : mm));
          loadConversations();
          if (autoPlay && acc.text) {
            (async () => { try { const b64 = await fetchTTS(acc.text, language); const audio = new Audio(`data:audio/wav;base64,${b64}`); audio.play().catch(() => {}); } catch {} })();
          }
        }
      });
    } catch (e: any) {
      setMessages((m) => m.map((mm) => mm.id === assistantId ? { ...mm, text: `Error: ${e?.message ?? e}` } : mm));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const seed = (location.state as any)?.seed;
    if (seed) { send(seed); window.history.replaceState({}, document.title); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRecording() {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setBusy(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const r = await uploadAudio(blob, language);
          setTranscript(r.transcript);
          setInput(r.transcript);
          await send(r.transcript);
        } catch (e: any) {
          setTranscript(`Transcription failed: ${e?.message ?? e}`);
        } finally { setBusy(false); }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    }).catch(() => {});
  }

  function stopRecording() { mediaRef.current?.stop(); }

  async function replayTTS(text: string) {
    try { const b64 = await fetchTTS(text, language); const audio = new Audio(`data:audio/wav;base64,${b64}`); audio.play().catch(() => {}); } catch {}
  }

  async function approveAction(approvalId: string, actionId: string, approve: boolean) {
    try {
      const path = approve ? `/api/approvals/${approvalId}/approve` : `/api/approvals/${approvalId}/reject`;
      const res = await api<any>(path, { method: "POST", body: JSON.stringify({}) });
      setMessages((m) => m.map((mm) => ({
        ...mm,
        pendingActions: mm.pendingActions.map((pa) => pa.id === actionId ? { ...pa, status: approve ? "approved" : "rejected", execution: res.execution } : pa),
        cards: [...mm.cards, ...(res.execution?.card ? [res.execution.card] : [])],
      })));
    } catch (e: any) { alert(e?.message ?? "action failed"); }
  }

  return (
    <div className="flex h-full">
      <aside className="hidden md:flex w-60 flex-col bg-surface border-r border-line">
        <div className="p-3">
          <Button className="w-full" size="sm" onClick={newConversation}><Plus size={14} /> New conversation</Button>
        </div>
        <div className="flex-1 overflow-auto px-2 space-y-1">
          {conversations.map((c) => (
            <button key={c.id} onClick={() => selectConversation(c.id)} className={`w-full text-left px-3 py-2 rounded-md text-xs transition ${convId === c.id ? "bg-neon/10 text-neon border border-neon/30" : "text-ink-soft hover:text-ink hover:bg-surface-2"}`}>
              <div className="font-medium truncate">{c.title}</div>
              <div className="text-[10px] text-ink-dim mt-0.5">{new Date(c.updatedAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-line space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-ink-dim">Language</label>
            <select value={language} onChange={(e) => { setLanguage(e.target.value); api("/api/preferences", { method: "PUT", body: JSON.stringify({ languageCode: e.target.value }) }).catch(() => {}); }} className="mt-1 w-full h-9 rounded-md bg-surface-2 text-ink text-sm px-2 border border-line focus:outline-none focus:border-neon/60">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={autoPlay} onChange={(e) => { setAutoPlay(e.target.checked); api("/api/preferences", { method: "PUT", body: JSON.stringify({ autoPlayTts: e.target.checked }) }).catch(() => {}); }} className="accent-neon" />
            Auto-play voice reply
          </label>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-ink-dim mt-20">
              <Mic size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Speak or type a request. DIA will investigate and propose.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} onApprove={approveAction} onReplay={replayTTS} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-ink-soft text-sm">
              <Loader2 size={14} className="animate-spin text-neon" /> DIA is working...
            </div>
          )}
        </div>

        <div className="border-t border-line p-3 md:p-4 bg-surface">
          {transcript && <div className="text-xs text-ink-dim mb-2 truncate">Transcript: {transcript}</div>}
          <div className="flex items-center gap-2">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`h-11 w-11 rounded-full flex items-center justify-center transition ${recording ? "bg-danger text-base animate-pulse" : "bg-surface-2 text-ink hover:bg-surface-3 border border-line"}`}
              title={recording ? "Stop" : "Record"}
            >
              {recording ? <Square size={16} /> : <Mic size={18} />}
            </button>
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder="Ask DIA anything about your business..." className="flex-1" />
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
      <div className={`max-w-[85%] rounded-lg px-4 py-3 ${isUser ? "bg-neon/10 text-ink border border-neon/30" : "bg-surface border border-line"}`}>
        {m.text && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {m.text}
            {!isUser && m.text && (
              <button onClick={() => onReplay(m.text)} className="ml-2 inline-flex items-center text-ink-dim hover:text-neon" title="Play">
                <Volume2 size={12} />
              </button>
            )}
          </div>
        )}
        {m.toolEvents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.toolEvents.map((te, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${te.status === "completed" ? "border-success/40 text-success bg-success/5" : te.status === "failed" ? "border-danger/40 text-danger bg-danger/5" : "border-warning/40 text-warning bg-warning/5"}`}>
                {te.tool.replace(/_/g, " ")} {te.status === "completed" ? "✓" : te.status === "failed" ? "✗" : "…"}
              </span>
            ))}
          </div>
        )}
        {m.cards.map((card, i) => (
          <div key={i} className="mt-3"><RenderCard card={card} /></div>
        ))}
        {m.pendingActions.map((pa, i) => (
          <div key={`pa-${i}`} className="mt-3"><ApprovalCard pa={pa} onApprove={onApprove} /></div>
        ))}
      </div>
    </div>
  );
}

function RenderCard({ card }: { card: any }) {
  if (!card) return null;
  if (card.type === "insight") {
    return (
      <div className="bg-surface-2 border border-line rounded-md p-4">
        <div className="text-xs font-semibold text-neon uppercase tracking-wider mb-2">{card.title}</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {card.metrics?.map((mm: any, i: number) => (
            <div key={i} className="text-xs">
              <div className="text-ink-dim">{mm.label}</div>
              <div className="font-bold text-ink num">{mm.value}</div>
            </div>
          ))}
        </div>
        {card.body && <div className="text-sm text-ink-soft mb-2">{card.body}</div>}
        {card.evidence?.length > 0 && (
          <div className="text-xs text-ink-soft space-y-1">
            <div className="font-semibold text-ink-soft">Evidence</div>
            {card.evidence.map((e: string, i: number) => <div key={i} className="text-ink-dim">· {e}</div>)}
          </div>
        )}
        {card.hypotheses?.length > 0 && (
          <div className="text-xs text-ink-soft space-y-1 mt-2">
            <div className="font-semibold text-ink-soft">Hypotheses (not proven)</div>
            {card.hypotheses.map((h: string, i: number) => <div key={i} className="text-ink-dim">· {h}</div>)}
          </div>
        )}
        {card.confidence && <div className="text-[10px] uppercase tracking-wider text-ink-dim mt-2">Confidence: {card.confidence}</div>}
      </div>
    );
  }
  if (card.type === "segment") {
    const segs = card.segments ?? (card.segment ? [card.segment] : []);
    return (
      <div className="bg-surface-2 border border-line rounded-md p-4">
        <div className="text-xs font-semibold text-neon uppercase tracking-wider mb-2">{card.title}</div>
        <div className="space-y-1.5">
          {segs.map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-line pb-1.5 last:border-0">
              <div>
                <div className="font-medium text-ink">{s.name ?? s.title}</div>
                <div className="text-xs text-ink-dim">{s.description}</div>
              </div>
              <div className="font-bold text-neon num">{s.count ?? s.customerCount}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (card.type === "offer") {
    return (
      <div className="bg-surface-2 border border-line rounded-md p-4">
        <div className="text-xs font-semibold text-neon uppercase tracking-wider mb-2">Offer prepared</div>
        <div className="text-sm font-semibold text-ink mb-2">{card.title}</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-ink-dim">Type</span><div className="font-bold text-ink">{card.offer?.type} {card.offer?.value}</div></div>
          <div><span className="text-ink-dim">Audience</span><div className="font-bold text-ink num">{card.audienceSize}</div></div>
          <div><span className="text-ink-dim">Est. cost</span><div className="font-bold text-ink num">Rs. {card.estimatedCost?.toLocaleString("en-IN")}</div></div>
          <div><span className="text-ink-dim">Est. revenue</span><div className="font-bold text-ink num">Rs. {card.estimatedRevenue?.toLocaleString("en-IN")}</div></div>
          <div><span className="text-ink-dim">Margin</span><div className={`font-bold ${card.marginOk ? "text-success" : "text-danger"}`}>{card.marginOk ? "healthy" : "tight"}</div></div>
          <div><span className="text-ink-dim">Validity</span><div className="font-bold text-ink">{card.offer?.validityDays} days</div></div>
        </div>
        {card.assumptions && <div className="text-xs text-ink-dim mt-2">Assumptions: {card.assumptions}</div>}
      </div>
    );
  }
  if (card.type === "campaign_preview") {
    return (
      <div className="bg-surface-2 border border-neon-2/30 rounded-md p-4">
        <div className="text-xs font-semibold text-neon-2 uppercase tracking-wider mb-2">Campaign preview</div>
        <div className="text-sm font-semibold text-ink mb-1">{card.name}</div>
        <div className="text-xs text-ink-dim mb-2">Audience: {card.audience} · {card.language} · {card.channel}</div>
        <div className="bg-surface border border-line rounded-md p-3 text-sm text-ink-soft italic">"{card.message}"</div>
        {card.offer && <div className="text-xs text-ink-dim mt-2">Offer: {card.offer}</div>}
      </div>
    );
  }
  if (card.type === "campaign_result") {
    return (
      <div className="bg-surface-2 border border-success/30 rounded-md p-4">
        <div className="text-xs font-semibold text-success uppercase tracking-wider mb-2">Campaign executed (mock Paytm)</div>
        {card.receipt && <div className="text-[10px] text-ink-dim mb-1">Receipt {card.receipt}</div>}
        <div className="text-sm font-semibold text-ink mb-2">{card.name}</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-ink-dim">Sent</span><div className="font-bold text-ink num">{card.sent}</div></div>
          <div><span className="text-ink-dim">Delivered</span><div className="font-bold text-ink num">{card.delivered}</div></div>
          <div><span className="text-ink-dim">Opened</span><div className="font-bold text-ink num">{card.opened}</div></div>
          <div><span className="text-ink-dim">Redeemed</span><div className="font-bold text-ink num">{card.redeemed}</div></div>
          <div className="col-span-2"><span className="text-ink-dim">Revenue attributed</span><div className="font-bold text-neon num">Rs. {card.revenueAttributed?.toLocaleString("en-IN")}</div></div>
        </div>
        <div className="text-[10px] text-ink-dim mt-2">Provider: {card.provider}</div>
      </div>
    );
  }
  return (
    <div className="bg-surface-2 border border-line rounded-md p-4">
      <pre className="text-[10px] text-ink-dim overflow-auto">{JSON.stringify(card, null, 2)}</pre>
    </div>
  );
}

function ApprovalCard({ pa, onApprove }: { pa: any; onApprove: any }) {
  const s = pa.summary || {};
  const [busy, setBusy] = useState(false);
  const done = pa.status && pa.status !== "pending" && pa.status !== "pending_approval";
  return (
    <div className="bg-surface-2 border border-neon-2/40 rounded-md p-4">
      <div className="text-xs font-semibold text-neon-2 uppercase tracking-wider mb-2">Approval required</div>
      <div className="text-sm font-semibold text-ink mb-2">{pa.title}</div>
      <div className="space-y-1.5 text-xs text-ink-soft mb-3">
        <div><span className="font-medium text-ink">What:</span> {s.what}</div>
        <div><span className="font-medium text-ink">Why:</span> {s.why}</div>
        <div><span className="font-medium text-ink">Audience:</span> {s.audience} customers</div>
        <div><span className="font-medium text-ink">Offer:</span> {s.offer}</div>
        <div><span className="font-medium text-ink">Est. cost:</span> <span className="num">Rs. {(s.estimatedCost ?? 0).toLocaleString("en-IN")}</span></div>
      </div>
      {s.message && (
        <div className="bg-surface border border-line rounded-md p-3 text-sm text-ink-soft italic mb-3">"{s.message}"</div>
      )}
      {!done ? (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" disabled={busy} onClick={async () => { setBusy(true); await onApprove(s.approvalId, pa.id, true); setBusy(false); }}>
            {busy ? "..." : "Approve & send"}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { setBusy(true); await onApprove(s.approvalId, pa.id, false); setBusy(false); }}>
            Reject
          </Button>
        </div>
      ) : (
        <div className="text-xs font-semibold text-success">Status: {pa.status}</div>
      )}
    </div>
  );
}
