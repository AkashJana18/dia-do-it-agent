import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Mic, Square, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const chunksRef = useRef<Blob[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const nav = useNavigate();

  useEffect(() => { api("/api/dashboard").then(setData).catch((e) => setErr(e?.message ?? "failed")); }, []);

  function startRec() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("file", blob, "recording.webm");
          const token = localStorage.getItem("dia_token");
          const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8787") + "/api/voice/transcribe", {
            method: "POST", body: form, headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const r = await res.json();
          setText(r.transcript || "");
        } catch {}
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    }).catch(() => {});
  }

  function submit() {
    if (!text.trim()) return;
    nav("/assistant", { state: { seed: text } });
  }

  const today = data?.today;
  const wk = data?.weekend;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Overview</h1>
        <p className="text-sm text-ink-soft mt-1">Sharma Electronics, Mumbai · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
      </header>

      {err && <div className="text-sm text-danger">Failed to load dashboard: {err}</div>}

      {/* Voice-first hero */}
      <div className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-neon/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-xs font-semibold text-neon uppercase tracking-wider mb-2">Voice-first assistant</div>
          <h2 className="text-xl font-semibold text-ink mb-2">What should I do today?</h2>
          <p className="text-sm text-ink-soft mb-4 max-w-xl">Speak or type. DIA investigates your data, proposes an action, and waits for your approval.</p>
          <div className="flex gap-3 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              rows={2}
              placeholder="e.g. Last weekend sales kam ho gayi. Check karo aur inactive customers ko wapas lane ka offer banao."
              className="flex-1 input resize-none"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={recording ? () => mediaRef.current?.stop() : startRec}
                className={`h-10 w-10 rounded-full flex items-center justify-center transition ${recording ? "bg-danger text-base animate-pulse" : "bg-surface-2 text-ink hover:bg-surface-3 border border-line"}`}
                title={recording ? "Stop" : "Record"}
              >
                {recording ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <Button onClick={submit} disabled={!text.trim()}>Send</Button>
            </div>
          </div>
          <div className="mt-3 text-xs text-ink-dim">Try: "Give me today's business report." · "Create a weekend offer that protects my margins."</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Today's revenue" value={`Rs. ${(today?.revenue ?? 0).toLocaleString("en-IN")}`} />
        <Metric label="Orders" value={today?.successfulOrders ?? 0} />
        <Metric label="Avg ticket" value={`Rs. ${(today?.avgTicket ?? 0).toLocaleString("en-IN")}`} />
        <Metric label="Unique customers" value={today?.uniqueCustomers ?? 0} />
      </div>

      {/* Weekend signal + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Weekend signal</CardTitle></CardHeader>
          {wk ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {wk.revenueDeltaPct < 0 ? <TrendingDown className="text-danger" size={18} /> : <TrendingUp className="text-success" size={18} />}
                <span className="font-bold text-ink num">{wk.revenueDeltaPct >= 0 ? "+" : ""}{wk.revenueDeltaPct}%</span>
                <span className="text-ink-soft text-xs">vs previous weekend</span>
              </div>
              <div className="flex justify-between text-xs"><span className="text-ink-soft">Last weekend</span><span className="text-ink num">Rs. {wk.lastWeekend.revenue.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-soft">Previous</span><span className="text-ink num">Rs. {wk.prevWeekend.revenue.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ink-soft">Orders delta</span><span className="text-ink num">{wk.ordersDeltaPct >= 0 ? "+" : ""}{wk.ordersDeltaPct}%</span></div>
            </div>
          ) : <div className="text-sm text-ink-dim">Loading...</div>}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
          <div className="divide-y divide-line">
            {(data?.recentTransactions ?? []).slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium text-ink">{t.product?.name ?? "Walk-in sale"}</div>
                  <div className="text-xs text-ink-dim">{t.customer?.name ?? "Walk-in"} · {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-ink num">Rs. {t.amount.toLocaleString("en-IN")}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${t.status === "SUCCESS" ? "text-success" : "text-danger"}`}>{t.status}</div>
                </div>
              </div>
            ))}
            {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
              <div className="text-sm text-ink-dim py-4 text-center">No transactions yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-soft mb-1">{label}</div>
      <div className="text-xl font-bold text-ink num">{value}</div>
    </div>
  );
}

