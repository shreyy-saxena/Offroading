import { describe, expect, it } from "vitest";
import { parseStateMappingCsv } from "@/lib/csv/state-mapping";

describe("parseStateMappingCsv", () => {
  it("parses a valid CSV with no header", () => {
    const result = parseStateMappingCsv("Andhra Pradesh,ap-authority@example.com\nGoa,goa@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      { state: "Andhra Pradesh", authorityEmails: ["ap-authority@example.com"] },
      { state: "Goa", authorityEmails: ["goa@example.com"] },
    ]);
  });

  it("splits multiple emails in one cell on a semicolon", () => {
    const result = parseStateMappingCsv("Goa,first@example.com;second@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ state: "Goa", authorityEmails: ["first@example.com", "second@example.com"] }]);
  });

  it("trims whitespace around each semicolon-separated email", () => {
    const result = parseStateMappingCsv('"Goa","first@example.com ; second@example.com"');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ state: "Goa", authorityEmails: ["first@example.com", "second@example.com"] }]);
  });

  it("skips a recognized header row", () => {
    const result = parseStateMappingCsv("state,authority_email\nGoa,goa@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ state: "Goa", authorityEmails: ["goa@example.com"] }]);
  });

  it("skips a header row phrased as 'State/UT', not just the literal word 'state'", () => {
    const result = parseStateMappingCsv("State/UT,Email\nGoa,goa@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ state: "Goa", authorityEmails: ["goa@example.com"] }]);
  });

  it("normalizes state casing to the canonical form", () => {
    const result = parseStateMappingCsv("  goa ,goa@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ state: "Goa", authorityEmails: ["goa@example.com"] }]);
  });

  it("rejects the whole file on an unrecognized state, citing the row", () => {
    const result = parseStateMappingCsv("Narnia,someone@example.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 1: "Narnia" is not a recognized state.`]);
  });

  it("rejects the whole file on a malformed email, citing the row", () => {
    const result = parseStateMappingCsv("Goa,not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 1: "not-an-email" is not a valid email address.`]);
  });

  it("rejects the whole file when one email in a multi-email cell is malformed", () => {
    const result = parseStateMappingCsv("Goa,good@example.com;not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 1: "not-an-email" is not a valid email address.`]);
  });

  it("rejects a cell with no emails at all", () => {
    const result = parseStateMappingCsv("Goa, ; ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["Row 1: at least one authority email is required."]);
  });

  it("treats extra comma-separated columns as more emails, not a wrong-shape row", () => {
    // Excel exports an in-cell "a@x.com, b@x.com" to CSV as two columns,
    // since a bare comma can't be distinguished from a column separator.
    const result = parseStateMappingCsv("Goa,first@example.com,second@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ state: "Goa", authorityEmails: ["first@example.com", "second@example.com"] }]);
  });

  it("rejects a row with only one column (no email at all)", () => {
    const result = parseStateMappingCsv("Goa");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["Row 1: expected at least 2 columns (state, authority email), found 1."]);
  });

  it("still rejects an extra column that isn't a valid email", () => {
    const result = parseStateMappingCsv("Goa,goa@example.com,not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 1: "not-an-email" is not a valid email address.`]);
  });

  it("accepts '&' as 'and' and a dropped trailing descriptor word", () => {
    const result = parseStateMappingCsv("Andaman & Nicobar,andaman@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      { state: "Andaman and Nicobar Islands", authorityEmails: ["andaman@example.com"] },
    ]);
  });

  it("expands the 'DNH' abbreviation for Dadra and Nagar Haveli", () => {
    const result = parseStateMappingCsv("DNH & Daman & Diu,dnh@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      { state: "Dadra and Nagar Haveli and Daman and Diu", authorityEmails: ["dnh@example.com"] },
    ]);
  });

  it("rejects a duplicate state within the same file", () => {
    const result = parseStateMappingCsv("Goa,first@example.com\nGoa,second@example.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 2: duplicate mapping for "Goa" (already set on row 1).`]);
  });

  it("surfaces every invalid row at once, not just the first", () => {
    const result = parseStateMappingCsv("Narnia,ok@example.com\nGoa,not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
  });

  it("rejects an empty file", () => {
    const result = parseStateMappingCsv("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["The file has no data rows."]);
  });

  it("ignores blank lines", () => {
    const result = parseStateMappingCsv("\nGoa,goa@example.com\n\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ state: "Goa", authorityEmails: ["goa@example.com"] }]);
  });
});
