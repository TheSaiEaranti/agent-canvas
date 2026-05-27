// Small helpers shared by run providers.

/** Resolves after `ms`, or immediately when the signal aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

export function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

/** Splits text into ~2-word chunks so streaming looks like real token output. */
export function chunkText(text: string): string[] {
  const parts = text.match(/\S+\s*/g) ?? [];
  if (parts.length === 0) return text ? [text] : [];
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    out.push(parts.slice(i, i + 2).join(""));
  }
  return out;
}

export function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}
