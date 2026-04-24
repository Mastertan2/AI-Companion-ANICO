export function normalizeInput(text: string): string {
  let output = text.toLowerCase();

  // 🔥 pattern-based rules
  const rules = [
    {
      pattern: /(wai|wa)\s*ai\s*(ke|hi)\s*(.+)/i,
      replace: "i want to go to $3",
    },
    {
      pattern: /ka\s*ho\s*(.+)/i,
      replace: "call $1",
    },
    {
      pattern: /wa\s*ai\s*lim\s*(.+)/i,
      replace: "i want to drink $1",
    },
    {
      pattern: /wa\s*ai\s*jia\s*(.+)/i,
      replace: "i want to eat $1",
    },
  ];

  rules.forEach(rule => {
    if (rule.pattern.test(output)) {
      output = output.replace(rule.pattern, rule.replace);
    }
  });

  // remove fillers
  output = output
    .replace(/\b(lah|leh|lor)\b/g, "")
    .trim();

  return output;
}