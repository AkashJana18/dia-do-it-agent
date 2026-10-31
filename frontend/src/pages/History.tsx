import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock } from "lucide-react";
import { api } from "../services/api";
import { useApp } from "../lib/app-context";
import { relativeDay } from "../lib/agent-copy";
import { PageHead } from "../components/ui/page";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
}

export default function History() {
  const { copy, language } = useApp();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const lang = language.startsWith("hi") ? "hi" : "en";

  useEffect(() => {
    api<{ conversations: Conversation[] }>("/api/conversations")
      .then((d) => setConversations(d.conversations ?? []))
      .catch(() => setConversations([]));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <PageHead title={copy.historyTitle} meta={copy.historySub} />

      <div className="mx-auto w-full max-w-[720px] px-5 pb-16 md:px-8">
        {conversations === null ? (
          <div className="space-y-3 pt-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-lg border border-line bg-panel/60" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-panel2 text-dim">
              <Clock size={22} strokeWidth={1.8} />
            </span>
            <p className="text-[16px] font-semibold text-soft">{copy.emptyHistory}</p>
            <Link
              to="/"
              className="text-[15px] font-bold text-brand underline decoration-linehot decoration-2 underline-offset-4"
            >
              {copy.firstQuestion}
            </Link>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-line bg-panel shadow-paper">
            {conversations.map((c) => (
              <li key={c.id} className="border-b border-line last:border-b-0">
                <Link
                  to={`/?c=${c.id}`}
                  className="group flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-panel2"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-base text-dim">
                    <Clock size={17} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold leading-snug text-ink">
                      {c.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] font-semibold text-dim">
                      {relativeDay(c.updatedAt, lang)}
                    </span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 text-dim transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
