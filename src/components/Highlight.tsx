export function Highlight({ text, query }: { text: string; query: string }) {
  const base = query.trim();
  if (!base) return <>{text}</>;

  const tokens = new Set<string>();
  for (const token of base.split(/[\s，。！？、；：,.!?;:()（）]+/u)) {
    if (token.length >= 2) tokens.add(token.toLowerCase());
  }
  const compact = base.replace(/\s+/g, "");
  if (compact.length >= 2) {
    tokens.add(compact.toLowerCase());
    for (let i = 0; i + 2 <= compact.length; i += 1) {
      tokens.add(compact.slice(i, i + 2).toLowerCase());
    }
  }

  const list = [...tokens].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return <>{text}</>;

  const pattern = new RegExp(`(${list.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        list.includes(part.toLowerCase()) ? <mark key={index}>{part}</mark> : part,
      )}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
