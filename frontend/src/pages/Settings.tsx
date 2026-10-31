import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/card";
import { Select } from "../components/ui/card";

const LANGS = [
  { code: "hi-IN", label: "Hindi" },
  { code: "en-IN", label: "English" },
  { code: "mr-IN", label: "Marathi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "bn-IN", label: "Bengali" },
];

export default function Settings() {
  const [prefs, setPrefs] = useState<any>(null);
  const [voice, setVoice] = useState("shubh");
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    api("/api/preferences").then((d) => {
      setPrefs(d.preferences);
      if (d.preferences) { setVoice(d.preferences.ttsVoice); setTheme(d.preferences.theme); }
    }).catch(() => {});
  }, []);

  async function save(patch: any) {
    const d = await api("/api/preferences", { method: "PUT", body: JSON.stringify(patch) });
    setPrefs(d.preferences);
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-soft mt-1">Preferences and demo mode.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Voice and language</CardTitle></CardHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-ink-soft">Preferred language</label>
            <Select value={prefs?.languageCode ?? "hi-IN"} onChange={(e) => save({ languageCode: e.target.value })} className="w-full mt-1">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs text-ink-soft">TTS voice (Sarvam Bulbul speaker)</label>
            <Input value={voice} onChange={(e) => setVoice(e.target.value)} className="mt-1" />
            <Button size="sm" className="mt-2" onClick={() => save({ ttsVoice: voice })}>Save voice</Button>
          </div>
          <div>
            <label className="text-xs text-ink-soft">Theme</label>
            <Select value={theme} onChange={(e) => { setTheme(e.target.value); save({ theme: e.target.value }); }} className="w-full mt-1">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={prefs?.autoPlayTts ?? true} onChange={(e) => save({ autoPlayTts: e.target.checked })} className="accent-neon" />
            Auto-play voice replies
          </label>
        </div>
      </Card>
      <Card>
        <CardHeader><CardTitle>Demo mode</CardTitle></CardHeader>
        <div className="text-sm text-ink-soft space-y-2">
          <p>DIA runs fully without external credentials using mock providers for the LLM, STT, TTS and translation.</p>
          <p>Add <code className="bg-surface-2 px-1.5 py-0.5 rounded text-neon text-xs">SARVAM_API_KEY</code> and an LLM key in <code className="bg-surface-2 px-1.5 py-0.5 rounded text-neon text-xs">.env</code> to switch to live providers. Model IDs are env-configurable.</p>
        </div>
      </Card>
    </div>
  );
}
