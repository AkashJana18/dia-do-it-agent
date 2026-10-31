import { Check, Volume2 } from "lucide-react";
import { useApp } from "../lib/app-context";
import { LANGUAGES } from "../lib/copy";
import { PageHead } from "../components/ui/page";
import { cn } from "../lib/utils";

export default function Settings() {
  const { copy, language, setLanguage, autoPlay, setAutoPlay, merchant } = useApp();

  return (
    <div className="h-full overflow-y-auto">
      <PageHead title={copy.settingsTitle} meta={copy.settingsSub} />

      <div className="mx-auto w-full max-w-[720px] space-y-6 px-5 pb-16 md:px-8">
        <section>
          <h2 className="text-[18px] font-bold text-ink">{copy.language}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-soft">{copy.languageHint}</p>
          <ul className="mt-3 overflow-hidden rounded-lg border border-line bg-panel shadow-paper">
            {LANGUAGES.map((l) => {
              const active = language === l.code;
              return (
                <li key={l.code} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors",
                      active ? "bg-panel2" : "hover:bg-panel2/70"
                    )}
                  >
                    <span className="flex-1">
                      <span className="block text-[18px] font-bold leading-tight text-ink">{l.label}</span>
                      <span className="mt-0.5 block text-[13px] font-semibold text-dim">{l.en}</span>
                    </span>
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border",
                        active ? "border-brand bg-brand text-panel" : "border-linehot text-transparent"
                      )}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-[18px] font-bold text-ink">{copy.voiceOn}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-soft">{copy.voiceOnHint}</p>
          <button
            type="button"
            role="switch"
            aria-checked={autoPlay}
            onClick={() => setAutoPlay(!autoPlay)}
            className="mt-3 flex w-full items-center gap-3 rounded-lg border border-line bg-panel px-4 py-4 text-left shadow-paper"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-panel2 text-brand">
              <Volume2 size={17} strokeWidth={2} />
            </span>
            <span className="flex-1 text-[16px] font-semibold text-ink">{autoPlay ? copy.isOn : copy.isOff}</span>
            <span
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                autoPlay ? "bg-brand" : "bg-linehot"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-panel shadow-sm transition-transform",
                  autoPlay ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </span>
          </button>
        </section>

        <section className="border-t border-line pt-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-dim">{copy.shop}</p>
          <p className="mt-1 text-[16px] font-semibold text-ink">{merchant?.name ?? copy.shopFallback}</p>
          {merchant?.city ? <p className="text-[14px] font-semibold text-dim">{merchant.city}</p> : null}
        </section>
      </div>
    </div>
  );
}
