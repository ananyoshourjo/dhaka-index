/** D1's local/remote SQL import accepts only bounded SQL payloads. */
export function splitSeedSql(statements: string[], maxBytes = 75 * 1024) {
  const encoder = new TextEncoder();
  const batches: string[] = [];
  let current = "";
  for (const statement of statements) {
    if (encoder.encode(statement).length > maxBytes) {
      throw new Error("A job exceeds the database import size limit.");
    }
    const next = current ? `${current}\n${statement}` : statement;
    if (encoder.encode(next).length > maxBytes) {
      batches.push(current);
      current = statement;
    } else current = next;
  }
  if (current) batches.push(current);
  return batches;
}
