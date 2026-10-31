import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUp,
  Check,
  ChevronRight,
  Loader2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { api, fetchTTS, uploadAudio } from "../services/api";
import { streamChat } from "../services/sse";
import { useApp } from "../lib/app-context";
import {
  inr,
  insightTitle,
  metricLabel,
  offerValue,
  segmentTitle,
  sendTitle,
  secondsLabel,
  toolLabel,
} from "../lib/agent-copy";
import type { UiLang } from "../lib/copy";
import { cn } from "../lib/utils";
import MicButton from "../components/MicButton";
import VoiceMeter from "../components/VoiceMeter";
import { Button } from "../components/ui/button";

type StepStatus = "running" | "done" | "failed";

interface Step {
  tool: string;
  status: StepStatus;
}

interface Turn {
  id: string;
  question: string;
  answer: string;
  steps: Step[];
  cards: any[];
  pending: any[];
  state: "thinking" | "done" | "error";
  error?: string;
}

const MAX_SECONDS = 30;

export default function Talk() {
  const { copy, language, autoPlay } = useApp();
  const lang: UiLang = language.startsWith("hi") ? "hi" : "en";

  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [input, setInput] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | undefined>();
  const [today, setToday] = useState<{ revenue: number; orders: number } | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const [params] = useSearchParams();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoStopRef = useRef<number | null>(null);

  useEffect(() => {
    api<any>("/api/dashboard")
      .then((d) =>
        setToday({
          revenue: d?.today?.revenue ?? 0,
          orders: d?.today?.successfulOrders ?? d?.today?.orders ?? 0,
        })
      )
      .catch(() => {});
  }, []);

  // Resume a past conversation from ?c=<id>
  useEffect(() => {
    const id = params.get("c");
    if (!id) return;
    api<any>(`/api/conversations/${id}/messages`)
      .then((d) => {
        const next: Turn[] = [];
        let current: Turn | null = null;
        for (const m of d.messages ?? []) {
          const content = m.content ?? {};
          if (m.role === "user") {
            current = {
              id: m.id,
              question: content.text ?? (typeof m.content === "string" ? m.content : ""),
              answer: "",
              steps: [],
              cards: [],
              pending: [],
              state: "done",
            };
            next.push(current);
          } else if (m.role === "assistant" && current) {
            current.answer = content.text ?? "";
            current.cards = Array.isArray(content.cards) ? content.cards : [];
            current.steps = (Array.isArray(content.toolEvents) ? content.toolEvents : []).map((e: any) => ({
              tool: e.tool,
              status: e.status === "completed" ? "done" : e.status === "failed" ? "failed" : "running",
            }));
          }
        }
        setTurns(next);
        setConvId(id);
      })
      .catch(() => {});
  }, [params]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      stopAudio();
      try {
        const b64 = await fetchTTS(text, language);
        if (!b64) return;
        const audio = new Audio(`data:audio/wav;base64,${b64}`);
        audioRef.current = audio;
        setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play().catch(() => setSpeaking(false));
      } catch {
        setSpeaking(false);
      }
    },
    [language, stopAudio]
  );

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setNotice(null);
      setInput("");
      setTypeOpen(false);
      setSeconds(0);

      const turnId = `t-${Date.now()}`;
      const acc: Turn = {
        id: turnId,
        question: q,
        answer: "",
        steps: [],
        cards: [],
        pending: [],
        state: "thinking",
      };
      setTurns((list) => [...list, { ...acc }]);
      setBusy(true);

      const patch = (fn: (t: Turn) => Turn) =>
        setTurns((list) => list.map((t) => (t.id === turnId ? fn(t) : t)));

      try {
        await streamChat(q, convId, language, (e) => {
          if (e.event === "meta") {
            if (e.data?.conversationId) setConvId((cur) => cur ?? e.data.conversationId);
          } else if (e.event === "tool_start") {
            acc.steps.push({ tool: e.data.tool, status: "running" });
            patch((t) => ({ ...t, steps: [...acc.steps] }));
          } else if (e.event === "tool_result") {
            for (let i = acc.steps.length - 1; i >= 0; i--) {
              if (acc.steps[i].tool === e.data.tool && acc.steps[i].status === "running") {
                acc.steps[i] = { ...acc.steps[i], status: e.data.ok ? "done" : "failed" };
                break;
              }
            }
            patch((t) => ({ ...t, steps: [...acc.steps] }));
          } else if (e.event === "card") {
            acc.cards.push(e.data);
            patch((t) => ({ ...t, cards: [...acc.cards] }));
          } else if (e.event === "pending_action") {
            acc.pending.push({ ...e.data, status: "pending" });
            patch((t) => ({ ...t, pending: [...acc.pending] }));
          } else if (e.event === "text") {
            acc.answer = e.data.text ?? "";
            patch((t) => ({ ...t, answer: acc.answer }));
          } else if (e.event === "done") {
            patch((t) => ({ ...t, state: t.state === "error" ? "error" : "done" }));
          } else if (e.event === "error") {
            acc.state = "error";
            acc.error = e.data?.message;
            patch((t) => ({ ...t, state: "error", error: e.data?.message }));
          }
        });
        patch((t) => (t.state === "thinking" ? { ...t, state: "done" } : t));
      } catch (err: any) {
        patch((t) => ({ ...t, state: "error", error: err?.message ?? "" }));
      } finally {
        setBusy(false);
      }

      if (autoPlay && acc.state !== "error" && acc.answer) speak(acc.answer);
    },
    [autoPlay, busy, convId, language, speak]
  );

  const startRecording = useCallback(async () => {
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice(copy.micDenied);
      setTypeOpen(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1200) {
          setNotice(copy.noAudio);
          setTypeOpen(true);
          return;
        }
        setTranscribing(true);
        try {
          const r = await uploadAudio(blob, language);
          const text = (r.transcript ?? "").trim();
          if (!text) {
            setNotice(copy.noAudio);
            setTypeOpen(true);
            return;
          }
          setTranscribing(false);
          await ask(text);
        } catch {
          setNotice(copy.transcriptFailed);
          setTypeOpen(true);
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      autoStopRef.current = window.setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, MAX_SECONDS * 1000);
    } catch {
      setNotice(copy.micDenied);
      setTypeOpen(true);
    }
  }, [ask, copy.micDenied, copy.noAudio, copy.transcriptFailed, language]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") rec.stop();
  }, []);

  const decide = useCallback(
    async (turnId: string, pa: any, approve: boolean) => {
      const approvalId = pa.summary?.approvalId;
      if (!approvalId) return;
      setTurns((list) =>
        list.map((t) =>
          t.id === turnId
            ? { ...t, pending: t.pending.map((p) => (p.id === pa.id ? { ...p, busy: true } : p)) }
            : t
        )
      );
      try {
        const res = await api<any>(`/api/approvals/${approvalId}/${approve ? "approve" : "reject"}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        setTurns((list) =>
          list.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  pending: t.pending.map((p) =>
                    p.id === pa.id
                      ? { ...p, busy: false, status: approve ? "approved" : "rejected", execution: res.execution }
                      : p
                  ),
                  cards: res.execution?.card ? [...t.cards, res.execution.card] : t.cards,
                }
              : t
          )
        );
        if (autoPlay) speak(approve ? "भेज दिया।" : "ठीक है, नहीं भेजा।");
      } catch (e: any) {
        setTurns((list) =>
          list.map((t) =>
            t.id === turnId
              ? { ...t, pending: t.pending.map((p) => (p.id === pa.id ? { ...p, busy: false } : p)) }
              : t
          )
        );
        setNotice(e?.message ?? copy.errorTitle);
      }
    },
    [autoPlay, copy.errorTitle, speak]
  );

  function startNew() {
    stopAudio();
    setTurns([]);
    setConvId(undefined);
    setNotice(null);
    setTypeOpen(false);
    window.history.replaceState({}, document.title, "/");
  }

  const isHome = turns.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isHome ? (
          <Home
            today={today}
            recording={recording}
            seconds={seconds}
            busy={busy}
            transcribing={transcribing}
            notice={notice}
            typeOpen={typeOpen}
            input={input}
            setInput={setInput}
            inputRef={inputRef}
            onStart={startRecording}
            onStop={stopRecording}
            onAsk={ask}
            onTypeOpen={() => {
              setTypeOpen(true);
              setTimeout(() => inputRef.current?.focus(), 30);
            }}
          />
        ) : (
          <div className="mx-auto w-full max-w-[720px] px-5 pb-10 pt-7 md:px-8 md:pt-10">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-dim">{copy.conversationTitle}</span>
              <button
                type="button"
                onClick={startNew}
                className="text-[14px] font-bold text-brand hover:underline"
              >
                {copy.newQuestion}
              </button>
            </div>

            <div className="space-y-9">
              {turns.map((t) => (
                <div key={t.id} className="space-y-4">
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[17px] font-medium leading-snug text-panel">
                      {t.question}
                    </p>
                  </div>
                  <Answer
                    turn={t}
                    lang={lang}
                    speaking={speaking}
                    onReplay={() => speak(t.answer)}
                    onRetry={() => ask(t.question)}
                    onDecide={(pa, approve) => decide(t.id, pa, approve)}
                  />
                </div>
              ))}
            </div>

            {notice ? (
              <p className="mt-6 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-[14px] font-semibold text-danger">
                {notice}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {!isHome ? (
        <Composer
          recording={recording}
          seconds={seconds}
          busy={busy}
          input={input}
          setInput={setInput}
          onStart={startRecording}
          onStop={stopRecording}
          onAsk={ask}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------------- Home --------------------------------- */

function Home({
  today,
  recording,
  seconds,
  busy,
  transcribing,
  notice,
  typeOpen,
  input,
  setInput,
  inputRef,
  onStart,
  onStop,
  onAsk,
  onTypeOpen,
}: {
  today: { revenue: number; orders: number } | null;
  recording: boolean;
  seconds: number;
  busy: boolean;
  transcribing: boolean;
  notice: string | null;
  typeOpen: boolean;
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onStart: () => void;
  onStop: () => void;
  onAsk: (t: string) => void;
  onTypeOpen: () => void;
}) {
  const { copy } = useApp();
  const icons = [TrendingUp, UserPlus, TrendingDown];

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center px-5 pb-10 pt-6 md:pt-14">
      <h1 className="max-w-[18ch] text-center text-[34px] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink md:text-[46px]">
        {copy.homeTitle}
      </h1>
      <p className="mt-3 max-w-[32ch] text-center text-[17px] leading-relaxed text-soft md:text-[19px]">
        {copy.homeSub}
      </p>

      <div className="mt-6 md:mt-9">
        <MicButton
          recording={recording}
          onClick={recording ? onStop : onStart}
          disabled={busy}
          label={recording ? copy.tapToStop : copy.tapToSpeak}
        />
      </div>

      <div className="mt-3 flex min-h-[52px] flex-col items-center">
        {recording ? (
          <>
            <div className="w-[240px]" aria-hidden="true">
              <VoiceMeter active height={34} bars={32} />
            </div>
            <p className="mt-1 text-[15px] font-bold text-brand">
              {copy.listening} <span className="num">{secondsLabel(seconds)}</span>
            </p>
          </>
        ) : (
          <p className="text-[16px] font-semibold text-dim">
            {transcribing ? copy.understanding : busy ? copy.thinking : copy.tapToSpeak}
          </p>
        )}
      </div>

      {notice ? (
        <p className="mt-5 max-w-[40ch] rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-center text-[14px] font-semibold text-danger">
          {notice}
        </p>
      ) : null}

      <ul className="mt-7 w-full overflow-hidden rounded-lg border border-line bg-panel shadow-paper">
        {copy.suggestions.map((label, i) => {
          const Icon = icons[i] ?? ChevronRight;
          return (
            <li key={label} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onAsk(copy.prompts[i] ?? label)}
                className="group flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-panel2"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-base text-brand">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="flex-1 text-[17px] font-semibold leading-snug text-ink">{label}</span>
                <ChevronRight size={17} className="shrink-0 text-dim transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          );
        })}
      </ul>

      {typeOpen ? (
        <form
          className="mt-5 flex w-full items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onAsk(input);
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={copy.typeInstead}
            placeholder={copy.placeholder}
            className="input"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label={copy.send}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-brand text-panel disabled:opacity-40"
          >
            <ArrowUp size={20} strokeWidth={2.4} />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onTypeOpen}
          className="mt-5 text-[15px] font-bold text-soft underline decoration-linehot decoration-2 underline-offset-4 hover:text-ink"
        >
          {copy.typeInstead}
        </button>
      )}

      {today ? (
        <p className="mt-7 flex items-center gap-2 text-[14px] font-semibold text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
          {copy.today}:
          <span className="num text-[15px] font-bold text-ink">{inr(today.revenue)}</span>
          <span aria-hidden="true">·</span>
          <span className="num text-[15px] font-bold text-ink">{today.orders}</span>
          {copy.orders}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------- Answer -------------------------------- */

function Answer({
  turn,
  lang,
  speaking,
  onReplay,
  onRetry,
  onDecide,
}: {
  turn: Turn;
  lang: UiLang;
  speaking: boolean;
  onReplay: () => void;
  onRetry: () => void;
  onDecide: (pa: any, approve: boolean) => void;
}) {
  const { copy } = useApp();

  return (
    <article className="animate-rise">
      <div className="flex items-center gap-3">
        <span className="text-[16px] font-extrabold tracking-[-0.01em] text-gold-bright">DIA</span>
        {turn.state === "done" && turn.answer ? (
          <button
            type="button"
            onClick={onReplay}
            className={cn(
              "inline-flex items-center gap-1.5 text-[13px] font-bold transition-colors",
              speaking ? "text-brand" : "text-dim hover:text-ink"
            )}
          >
            <Volume2 size={14} strokeWidth={2.2} />
            {speaking ? copy.speaking : copy.playAgain}
          </button>
        ) : null}
      </div>

      {turn.state === "thinking" ? <Steps steps={turn.steps} lang={lang} /> : null}

      {turn.state === "error" ? (
        <div className="mt-2 rounded-lg border border-danger/30 bg-panel px-4 py-3">
          <p className="text-[17px] font-bold text-danger">{copy.errorTitle}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-soft">{copy.errorHint}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
            {copy.retry}
          </Button>
        </div>
      ) : null}

      {turn.answer ? (
        <p aria-live="polite" className="mt-2 whitespace-pre-wrap text-[19px] leading-[1.7] text-ink">
          {turn.answer}
        </p>
      ) : null}

      {turn.cards.length > 0 ? (
        <div className="mt-4 space-y-3">
          {turn.cards
            .filter((card) => {
              // The exact audience replaces the long segment list.
              if (card.type === "segment" && card.segments && turn.cards.some((c) => c.type === "segment" && c.segment))
                return false;
              // The approval sheet already shows the message in full.
              if (card.type === "campaign_preview" && turn.pending.length > 0) return false;
              return true;
            })
            .map((card, i) => (
              <CardView key={`${card.type}-${i}`} card={card} lang={lang} />
            ))}
        </div>
      ) : null}

      {turn.pending.map((pa) => (
        <Approval
          key={pa.id}
          pa={pa}
          lang={lang}
          onApprove={() => onDecide(pa, true)}
          onReject={() => onDecide(pa, false)}
        />
      ))}

      {turn.state === "done" && turn.steps.length > 0 ? (
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-semibold text-dim hover:text-ink">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
            {copy.whatIChecked} <span className="num">({turn.steps.length})</span>
          </summary>
          <Steps steps={turn.steps} lang={lang} plain />
        </details>
      ) : null}
    </article>
  );
}

function Steps({ steps, lang, plain = false }: { steps: Step[]; lang: UiLang; plain?: boolean }) {
  const { copy } = useApp();
  return (
    <div className={cn("space-y-2", plain ? "mt-2 pl-1" : "mt-3")}>
      {steps.length === 0 ? (
        <StepRow status="running" label={copy.thinking} />
      ) : (
        steps.map((s, i) => (
          <StepRow key={`${s.tool}-${i}`} status={s.status} label={toolLabel(s.tool, lang)} />
        ))
      )}
    </div>
  );
}

function StepRow({ status, label }: { status: StepStatus; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[15px] leading-snug">
      <span className="grid h-4 w-4 shrink-0 place-items-center">
        {status === "running" ? (
          <Loader2 size={14} className="animate-turn text-brand" strokeWidth={2.4} />
        ) : status === "done" ? (
          <Check size={15} className="text-ok" strokeWidth={3} />
        ) : (
          <X size={15} className="text-danger" strokeWidth={3} />
        )}
      </span>
      <span className={cn(status === "running" ? "font-semibold text-ink" : "text-soft")}>{label}</span>
    </div>
  );
}

/* ---------------------------------- Cards -------------------------------- */

function Sheet({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-panel px-4 py-3.5">{children}</div>;
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "danger" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-[14px] font-semibold text-dim">{label}</span>
      <span
        className={cn(
          "num text-right text-[15px] font-bold",
          tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CardView({ card, lang }: { card: any; lang: UiLang }) {
  const { copy } = useApp();
  if (!card) return null;

  if (card.type === "insight") {
    return (
      <Sheet>
        <p className="text-[16px] font-bold text-ink">{insightTitle(card.title, lang)}</p>
        {card.metrics?.length ? (
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {card.metrics.slice(0, 4).map((m: any, i: number) => (
              <div key={i}>
                <p className="text-[13px] font-semibold text-dim">{metricLabel(m.label, lang)}</p>
                <p className="num text-[16px] font-bold text-ink">{m.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Sheet>
    );
  }

  if (card.type === "segment") {
    const segs = card.segments ?? (card.segment ? [card.segment] : []);
    return (
      <Sheet>
        <p className="text-[16px] font-bold text-ink">{copy.customersTitle}</p>
        <div className="mt-1">
          {segs.map((s: any, i: number) => (
            <Row
              key={i}
              label={segmentTitle(s.name ?? s.title ?? "", lang)}
              value={s.count ?? s.customerCount ?? 0}
            />
          ))}
        </div>
      </Sheet>
    );
  }

  if (card.type === "offer") {
    return (
      <Sheet>
        <p className="text-[20px] font-extrabold leading-tight text-ink">
          {offerValue(card.offer?.type, card.offer?.value, lang)}
        </p>
        <div className="mt-1">
          <Row label={copy.audience} value={card.audienceSize ?? "…"} />
          <Row label={copy.cost} value={inr(card.estimatedCost)} />
          <Row
            label={copy.profit}
            value={card.marginOk ? copy.marginOk : copy.marginTight}
            tone={card.marginOk ? "ok" : "danger"}
          />
        </div>
      </Sheet>
    );
  }

  if (card.type === "campaign_preview") {
    return (
      <Sheet>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[16px] font-bold text-ink">{copy.messageTitle}</p>
          <span className="num text-[14px] font-semibold text-dim">
            {card.audience} {copy.audience}
          </span>
        </div>
        {card.message ? (
          <blockquote className="mt-2 rounded-md bg-panel2 px-3 py-3 text-[15px] leading-relaxed text-ink">
            {card.message}
          </blockquote>
        ) : null}
      </Sheet>
    );
  }

  if (card.type === "campaign_result") {
    return (
      <Sheet>
        <p className="text-[16px] font-bold text-ink">{copy.messageTitle}</p>
        <div className="mt-1">
          <Row label={copy.sentLabel} value={card.sent ?? 0} />
          <Row label={copy.openedLabel} value={card.opened ?? 0} />
          <Row label={copy.usedLabel} value={card.redeemed ?? 0} />
          <Row label={copy.revenue} value={inr(card.revenueAttributed)} tone="ok" />
        </div>
      </Sheet>
    );
  }

  return null;
}

/* -------------------------------- Approval ------------------------------- */

function Approval({
  pa,
  lang,
  onApprove,
  onReject,
}: {
  pa: any;
  lang: UiLang;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { copy } = useApp();
  const s = pa.summary ?? {};
  const done = pa.status && pa.status !== "pending" && pa.status !== "pending_approval";
  const ok = pa.status === "approved";
  const failed = pa.status === "failed";

  if (done) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={cn("stamp bg-panel", failed ? "border-danger text-danger" : ok ? "border-ok text-ok" : "border-linehot text-dim")}>
          {failed ? <X size={12} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
          {failed ? copy.errorTitle : ok ? copy.approved : copy.rejected}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border-2 border-brand/60 bg-panel shadow-paper">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-brand">
          {copy.needsApproval}
        </span>
        <span className="num text-[13px] font-bold text-dim">
          {s.audience ?? "…"} {copy.audience}
        </span>
      </div>
      <div className="px-4 py-3.5">
        <p className="text-[18px] font-bold leading-snug text-ink">{sendTitle(s.audience, lang)}</p>
        {s.why ? <p className="mt-1 text-[14px] leading-relaxed text-soft">{s.why}</p> : null}
        {s.message ? (
          <blockquote className="mt-3 rounded-md bg-panel2 px-3 py-3 text-[15px] leading-relaxed text-ink">
            {s.message}
          </blockquote>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
          {s.offer && s.offer !== "none" ? (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-dim">{copy.offerLabel}</p>
              <p className="text-[15px] font-bold text-ink">
                {offerValue(String(s.offer ?? "").split(" ")[0], Number(String(s.offer ?? "").split(" ")[1]), lang)}
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-dim">{copy.cost}</p>
            <p className="num text-[15px] font-bold text-ink">{inr(s.estimatedCost)}</p>
          </div>
          {s.marginOk != null ? (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-dim">{copy.profit}</p>
              <p className={cn("text-[15px] font-bold", s.marginOk ? "text-ok" : "text-danger")}>
                {s.marginOk ? copy.marginOk : copy.marginTight}
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="flex-1" disabled={pa.busy} onClick={onApprove}>
            {pa.busy ? <Loader2 size={18} className="animate-turn" /> : null}
            {copy.approve}
          </Button>
          <Button size="lg" variant="secondary" disabled={pa.busy} onClick={onReject}>
            {copy.reject}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Composer ------------------------------- */

function Composer({
  recording,
  seconds,
  busy,
  input,
  setInput,
  onStart,
  onStop,
  onAsk,
}: {
  recording: boolean;
  seconds: number;
  busy: boolean;
  input: string;
  setInput: (v: string) => void;
  onStart: () => void;
  onStop: () => void;
  onAsk: (t: string) => void;
}) {
  const { copy } = useApp();
  return (
    <div className="shrink-0 border-t border-line bg-panel">
      <div className="mx-auto w-full max-w-[720px] px-4 py-3 md:px-8">
        <div className="flex items-center gap-2">
          <MicButton
            size="md"
            recording={recording}
            onClick={recording ? onStop : onStart}
            disabled={busy}
            label={recording ? copy.tapToStop : copy.tapToSpeak}
          />
          {recording ? (
            <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
              <VoiceMeter active height={28} bars={26} className="max-w-[220px]" />
              <span className="shrink-0 text-[15px] font-bold text-brand">
                {copy.listening} <span className="num">{secondsLabel(seconds)}</span>
              </span>
            </div>
          ) : (
            <form
              className="flex min-w-0 flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onAsk(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label={copy.placeholder}
                placeholder={copy.placeholder}
                disabled={busy}
                className="h-12 min-w-0 flex-1 rounded-full border border-linehot bg-base px-4 text-[16px] text-ink placeholder:text-dim focus:border-brand focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={copy.send}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-panel disabled:opacity-40"
              >
                {busy ? <Loader2 size={18} className="animate-turn" /> : <ArrowUp size={19} strokeWidth={2.4} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
