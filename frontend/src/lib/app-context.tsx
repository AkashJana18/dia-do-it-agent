import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, apiBase, setToken } from "../services/api";
import { copyFor } from "./copy";

interface Merchant {
  id: string;
  name: string;
  city?: string | null;
}

interface Prefs {
  languageCode?: string;
  autoPlayTts?: boolean;
  ttsVoice?: string;
}

interface AppValue {
  merchant: Merchant | null;
  prefs: Prefs | null;
  language: string;
  autoPlay: boolean;
  copy: ReturnType<typeof copyFor>;
  loading: boolean;
  error: string | null;
  setLanguage: (code: string) => void;
  setAutoPlay: (on: boolean) => void;
  retry: () => void;
}

const Ctx = createContext<AppValue | null>(null);

async function demoSession() {
  const res = await fetch(apiBase + "/api/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Could not start a session. Is the server running?");
  const data = await res.json();
  if (data.token) setToken(data.token);
  return data;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: any = null;
      if (localStorage.getItem("dia_token")) {
        try {
          data = await api("/api/auth/me");
        } catch {
          setToken(null);
        }
      }
      if (!data) data = await demoSession();
      setMerchant(data.merchant ?? null);
      setPrefs(data.preferences ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Could not start.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const language = prefs?.languageCode ?? "hi-IN";
  const autoPlay = prefs?.autoPlayTts ?? true;
  const copy = useMemo(() => copyFor(language), [language]);

  const setLanguage = useCallback((code: string) => {
    setPrefs((p) => ({ ...(p ?? {}), languageCode: code }));
    api("/api/preferences", { method: "PUT", body: JSON.stringify({ languageCode: code }) })
      .then((d) => setPrefs((p) => ({ ...(p ?? {}), ...(d.preferences ?? {}) })))
      .catch(() => {});
  }, []);

  const setAutoPlay = useCallback((on: boolean) => {
    setPrefs((p) => ({ ...(p ?? {}), autoPlayTts: on }));
    api("/api/preferences", { method: "PUT", body: JSON.stringify({ autoPlayTts: on }) })
      .then((d) => setPrefs((p) => ({ ...(p ?? {}), ...(d.preferences ?? {}) })))
      .catch(() => {});
  }, []);

  const value: AppValue = {
    merchant,
    prefs,
    language,
    autoPlay,
    copy,
    loading,
    error,
    setLanguage,
    setAutoPlay,
    retry: boot,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}
