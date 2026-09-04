import { findCanonicalDistrict } from "@/lib/data/districts";

export type DistrictMappingRow = { district: string; authorityEmail: string };

export type ParseDistrictMappingResult = { ok: true; rows: DistrictMappingRow[] } | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
}

// PRD Section 6 Step 2 / FR6 / spec stories 20-22: a two-column CSV
// (district, authority email); any invalid row rejects the whole file
// with a clear explanation naming the offending row(s) — never a
// partially-applied mapping. Every row is checked (not just the first
// failure) so one upload attempt can surface every problem at once.
export function parseDistrictMappingCsv(text: string): ParseDistrictMappingResult {
  const rawLines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const errors: string[] = [];
  const rows: DistrictMappingRow[] = [];
  const seenDistricts = new Map<string, number>();

  const firstNonBlankIndex = rawLines.findIndex((line) => line.trim().length > 0);

  rawLines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line) return;

    const cells = splitCsvLine(line);

    // An optional header row ("district,authority_email" or similar) —
    // only recognized as the very first non-blank line, since no real
    // district in the canonical list is literally named "district".
    if (index === firstNonBlankIndex && cells[0]?.toLowerCase() === "district") {
      return;
    }

    if (cells.length !== 2) {
      errors.push(`Row ${lineNumber}: expected exactly 2 columns (district, authority email), found ${cells.length}.`);
      return;
    }

    const [districtRaw, emailRaw] = cells;

    const canonical = findCanonicalDistrict(districtRaw);
    if (!canonical) {
      errors.push(`Row ${lineNumber}: "${districtRaw}" is not a recognized district.`);
      return;
    }

    if (!EMAIL_RE.test(emailRaw)) {
      errors.push(`Row ${lineNumber}: "${emailRaw}" is not a valid email address.`);
      return;
    }

    const previousRow = seenDistricts.get(canonical.name);
    if (previousRow !== undefined) {
      errors.push(`Row ${lineNumber}: duplicate mapping for "${canonical.name}" (already set on row ${previousRow}).`);
      return;
    }
    seenDistricts.set(canonical.name, lineNumber);

    rows.push({ district: canonical.name, authorityEmail: emailRaw });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("The file has no data rows.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, rows };
}
