import { describe, expect, it } from "vitest";
import { parseDistrictMappingCsv } from "@/lib/csv/district-mapping";

describe("parseDistrictMappingCsv", () => {
  it("parses a valid CSV with no header", () => {
    const result = parseDistrictMappingCsv("Visakhapatnam,vizag-authority@example.com\nGuntur,guntur@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([
      { district: "Visakhapatnam", authorityEmail: "vizag-authority@example.com" },
      { district: "Guntur", authorityEmail: "guntur@example.com" },
    ]);
  });

  it("skips a recognized header row", () => {
    const result = parseDistrictMappingCsv("district,authority_email\nGuntur,guntur@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ district: "Guntur", authorityEmail: "guntur@example.com" }]);
  });

  it("normalizes district casing to the canonical form", () => {
    const result = parseDistrictMappingCsv("  guntur ,guntur@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ district: "Guntur", authorityEmail: "guntur@example.com" }]);
  });

  it("rejects the whole file on an unrecognized district, citing the row", () => {
    const result = parseDistrictMappingCsv("Nowhereville,someone@example.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 1: "Nowhereville" is not a recognized district.`]);
  });

  it("rejects the whole file on a malformed email, citing the row", () => {
    const result = parseDistrictMappingCsv("Guntur,not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 1: "not-an-email" is not a valid email address.`]);
  });

  it("rejects a row with the wrong number of columns", () => {
    const result = parseDistrictMappingCsv("Guntur,guntur@example.com,extra");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["Row 1: expected exactly 2 columns (district, authority email), found 3."]);
  });

  it("rejects a duplicate district within the same file", () => {
    const result = parseDistrictMappingCsv("Guntur,first@example.com\nGuntur,second@example.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([`Row 2: duplicate mapping for "Guntur" (already set on row 1).`]);
  });

  it("surfaces every invalid row at once, not just the first", () => {
    const result = parseDistrictMappingCsv("Nowhereville,ok@example.com\nGuntur,not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
  });

  it("rejects an empty file", () => {
    const result = parseDistrictMappingCsv("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["The file has no data rows."]);
  });

  it("ignores blank lines", () => {
    const result = parseDistrictMappingCsv("\nGuntur,guntur@example.com\n\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toEqual([{ district: "Guntur", authorityEmail: "guntur@example.com" }]);
  });
});
