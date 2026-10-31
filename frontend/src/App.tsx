import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Mic, Clock, Settings as SettingsIcon } from "lucide-react";
import { cn } from "./lib/utils";
import { AppProvider, useApp } from "./lib/app-context";
import { LANGUAGES } from "./lib/copy";
import Talk from "./pages/Talk";
import History from "./pages/History";
import Settings from "./pages/Settings";

const NAV = [
  { to: "/", label: "बात करें", en: "Talk", icon: Mic },
  { to: "/history", label: "बातें", en: "History", icon: Clock },
  { to: "/settings", label: "सेटिंग", en: "Settings", icon: SettingsIcon },
];

function LanguageChip() {
  const { language, setLanguage } = useApp();
  return (
    <div className="relative">
      <select
        aria-label="Language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="h-10 appearance-none rounded-full border border-linehot bg-panel pl-3.5 pr-8 text-[14px] font-bold text-ink focus:border-brand focus:outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dim"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function NavUnderline({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-brand transition-transform",
        active ? "scale-x-100" : "scale-x-0"
      )}
    />
  );
}

function Shell() {
  const { merchant, loading, error, retry, language } = useApp();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const isHindi = language.startsWith("hi");
  const label = (n: (typeof NAV)[number]) => (isHindi ? n.label : n.en);

  if (loading) {
    return (
      <div className="grid h-full place-items-center px-6">
        <div className="flex flex-col items-center gap-4">
          <span className="text-[42px] font-extrabold leading-none tracking-[-0.04em] text-ink">DIA</span>
          <span className="flex items-center gap-1.5" aria-label="Starting">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-brand animate-blink"
                style={{ animationDelay: `${i * 180}ms` }}
              />
            ))}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid h-full place-items-center px-6">
        <div className="max-w-[380px] text-center">
          <p className="text-[22px] font-bold text-ink">Server से बात नहीं हो पा रही</p>
          <p className="mt-2 text-[15px] leading-relaxed text-soft">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-5 h-12 rounded-md bg-brand px-5 text-[15px] font-bold text-panel"
          >
            फिर कोशिश करें
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-line bg-panel">
        <div className="mx-auto flex h-[64px] w-full max-w-[1080px] items-center gap-4 px-4 md:px-8">
          <NavLink to="/" className="flex items-baseline gap-2" aria-label="DIA home">
            <span className="text-[27px] font-extrabold leading-none tracking-[-0.035em] text-ink">DIA</span>
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.16em] text-gold sm:inline">
              Do-It Agent
            </span>
          </NavLink>

          <nav className="ml-6 hidden h-full items-center gap-2 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-full items-center px-3 text-[15px] font-bold transition-colors",
                    isActive ? "text-ink" : "text-soft hover:text-ink"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {label(n)}
                    <NavUnderline active={isActive} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {merchant?.name ? (
              <span className="hidden max-w-[180px] truncate text-[14px] font-semibold text-soft sm:block">
                {merchant.name}
              </span>
            ) : null}
            <LanguageChip />
          </div>
        </div>
      </header>

      <main ref={mainRef} className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<Talk />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav
        className="shrink-0 border-t border-line bg-panel md:hidden"
        aria-label="Main"
      >
        <div className="flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex h-[64px] flex-1 flex-col items-center justify-center gap-1",
                  isActive ? "text-brand" : "text-dim"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-1/2 top-0 h-[3px] w-9 -translate-x-1/2 rounded-b-full bg-brand transition-transform",
                      isActive ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                  <n.icon size={21} strokeWidth={1.9} />
                  <span className="text-[12px] font-bold">{label(n)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Shell />
      </AppProvider>
    </BrowserRouter>
  );
}
