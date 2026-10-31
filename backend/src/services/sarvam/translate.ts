import { sarvamConfigured, sarvamFetch, sarvamModelDefaults } from "./sarvam-client.js";

export async function translateText(input: string, sourceLang: string, targetLang: string): Promise<string> {
  if (sourceLang === targetLang) return input;
  if (!sarvamConfigured()) {
    // mock: return a labelled placeholder so the flow stays visible in demo mode
    return `[${targetLang}] ${input}`;
  }
  const models = sarvamModelDefaults();
  const res = await sarvamFetch("/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: input.slice(0, 1900),
      source_language_code: sourceLang === "auto" ? "auto" : sourceLang,
      target_language_code: targetLang,
      model: models.translate,
      mode: "modern-colloquial",
      numerals_format: "international",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Sarvam translate ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as { translated_text: string };
  return json.translated_text;
}
