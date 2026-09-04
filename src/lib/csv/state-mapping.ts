import { findCanonicalState } from "@/lib/data/districts";

export type StateMappingRow = { state: string; authorityEmails: string[] };

export type ParseStateMappingResult = { ok: true; rows: StateMappingRow[] } | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Multiple recipients in one cell are separated by a semicolon, not a
// comma — a comma is already the CSV column separator, so reusing it
// inside a cell would require quoting every multi-email cell.
const EMAIL_CELL_SEPARATOR = ";";

function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
}

// Per-state fallback mapping (a logistics constraint means authority
// email addresses can't reliably be collected per district, so a state's
// designated address(es) cover every district within it). CSV format:
// state name, authority email(s) — a two-column CSV like the old
// district mapping, except the second column may hold several addresses
// separated by ";". Any invalid row rejects the whole file with a clear
// explanation naming the offending row(s), same as before — never a
// partially-applied mapping. Every row is checked (not just the first
// failure) so one upload attempt can surface every problem at once.
export function parseStateMappingCsv(text: string): ParseStateMappingResult {
  const rawLines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const errors: string[] = [];
  const rows: StateMappingRow[] = [];
  const seenStates = new Map<string, number>();

  const firstNonBlankIndex = rawLines.findIndex((line) => line.trim().length > 0);

  rawLines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line) return;

    const cells = splitCsvLine(line);

    // An optional header row ("state,authority_email" or similar) — only
    // recognized as the very first non-blank line, since no real state
    // in the canonical list is literally named "state".
    if (index === firstNonBlankIndex && cells[0]?.toLowerCase() === "state") {
      return;
    }

    if (cells.length !== 2) {
      errors.push(`Row ${lineNumber}: expected exactly 2 columns (state, authority email), found ${cells.length}.`);
      return;
    }

    const [stateRaw, emailsRaw] = cells;

    const canonical = findCanonicalState(stateRaw);
    if (!canonical) {
      errors.push(`Row ${lineNumber}: "${stateRaw}" is not a recognized state.`);
      return;
    }

    const emails = emailsRaw
      .split(EMAIL_CELL_SEPARATOR)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      errors.push(`Row ${lineNumber}: at least one authority email is required.`);
      return;
    }

    const invalidEmail = emails.find((email) => !EMAIL_RE.test(email));
    if (invalidEmail) {
      errors.push(`Row ${lineNumber}: "${invalidEmail}" is not a valid email address.`);
      return;
    }

    const previousRow = seenStates.get(canonical);
    if (previousRow !== undefined) {
      errors.push(`Row ${lineNumber}: duplicate mapping for "${canonical}" (already set on row ${previousRow}).`);
      return;
    }
    seenStates.set(canonical, lineNumber);

    rows.push({ state: canonical, authorityEmails: emails });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("The file has no data rows.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, rows };
}
