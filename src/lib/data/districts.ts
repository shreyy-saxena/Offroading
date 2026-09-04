// Canonical district list — hand-maintained, India-only (PRD Section 12.1).
//
// This is the single source of truth used to validate admin CSV mapping
// uploads (ticket 15) and to populate the district dropdown shown during
// manual locality entry (ticket 06, PRD Section 12.2). The app never makes
// a live external call to resolve or refresh this list — any future sync
// is additive only and must fall back to whatever is committed here.
//
// IMPORTANT: this seed only covers a handful of well-known districts per
// state/union territory, enough to develop and test against. Before this
// app is used to validate real authority-email CSV uploads, the operator
// must complete this list against an authoritative source (e.g. the
// Ministry of Panchayati Raj's Local Government Directory codes) and keep
// it in sync when districts are renamed or newly carved out.

export interface District {
  name: string;
  state: string;
}

export const DISTRICTS: District[] = [
  // Andhra Pradesh
  { name: "Visakhapatnam", state: "Andhra Pradesh" },
  { name: "Krishna", state: "Andhra Pradesh" },
  { name: "Guntur", state: "Andhra Pradesh" },
  { name: "Chittoor", state: "Andhra Pradesh" },
  // Arunachal Pradesh
  { name: "Papum Pare", state: "Arunachal Pradesh" },
  { name: "West Kameng", state: "Arunachal Pradesh" },
  { name: "Tawang", state: "Arunachal Pradesh" },
  // Assam
  { name: "Kamrup Metropolitan", state: "Assam" },
  { name: "Dibrugarh", state: "Assam" },
  { name: "Jorhat", state: "Assam" },
  // Bihar
  { name: "Patna", state: "Bihar" },
  { name: "Gaya", state: "Bihar" },
  { name: "Muzaffarpur", state: "Bihar" },
  { name: "Bhagalpur", state: "Bihar" },
  // Chhattisgarh
  { name: "Raipur", state: "Chhattisgarh" },
  { name: "Bilaspur", state: "Chhattisgarh" },
  { name: "Durg", state: "Chhattisgarh" },
  // Goa
  { name: "North Goa", state: "Goa" },
  { name: "South Goa", state: "Goa" },
  // Gujarat
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Surat", state: "Gujarat" },
  { name: "Vadodara", state: "Gujarat" },
  { name: "Rajkot", state: "Gujarat" },
  // Haryana
  { name: "Gurugram", state: "Haryana" },
  { name: "Faridabad", state: "Haryana" },
  { name: "Panipat", state: "Haryana" },
  // Himachal Pradesh
  { name: "Shimla", state: "Himachal Pradesh" },
  { name: "Kangra", state: "Himachal Pradesh" },
  { name: "Kullu", state: "Himachal Pradesh" },
  // Jharkhand
  { name: "Ranchi", state: "Jharkhand" },
  { name: "Dhanbad", state: "Jharkhand" },
  { name: "East Singhbhum", state: "Jharkhand" },
  // Karnataka
  { name: "Bengaluru Urban", state: "Karnataka" },
  { name: "Mysuru", state: "Karnataka" },
  { name: "Belagavi", state: "Karnataka" },
  { name: "Dakshina Kannada", state: "Karnataka" },
  // Kerala
  { name: "Ernakulam", state: "Kerala" },
  { name: "Thiruvananthapuram", state: "Kerala" },
  { name: "Kozhikode", state: "Kerala" },
  { name: "Malappuram", state: "Kerala" },
  // Madhya Pradesh
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Gwalior", state: "Madhya Pradesh" },
  { name: "Jabalpur", state: "Madhya Pradesh" },
  // Maharashtra
  { name: "Mumbai City", state: "Maharashtra" },
  { name: "Mumbai Suburban", state: "Maharashtra" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Nagpur", state: "Maharashtra" },
  { name: "Nashik", state: "Maharashtra" },
  // Manipur
  { name: "Imphal West", state: "Manipur" },
  { name: "Imphal East", state: "Manipur" },
  // Meghalaya
  { name: "East Khasi Hills", state: "Meghalaya" },
  { name: "West Garo Hills", state: "Meghalaya" },
  // Mizoram
  { name: "Aizawl", state: "Mizoram" },
  // Nagaland
  { name: "Kohima", state: "Nagaland" },
  { name: "Dimapur", state: "Nagaland" },
  // Odisha
  { name: "Khordha", state: "Odisha" },
  { name: "Cuttack", state: "Odisha" },
  { name: "Ganjam", state: "Odisha" },
  // Punjab
  { name: "Ludhiana", state: "Punjab" },
  { name: "Amritsar", state: "Punjab" },
  { name: "Jalandhar", state: "Punjab" },
  // Rajasthan
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Jodhpur", state: "Rajasthan" },
  { name: "Udaipur", state: "Rajasthan" },
  { name: "Kota", state: "Rajasthan" },
  // Sikkim
  { name: "East Sikkim", state: "Sikkim" },
  { name: "West Sikkim", state: "Sikkim" },
  // Tamil Nadu
  { name: "Chennai", state: "Tamil Nadu" },
  { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Madurai", state: "Tamil Nadu" },
  { name: "Tiruchirappalli", state: "Tamil Nadu" },
  // Telangana
  { name: "Hyderabad", state: "Telangana" },
  { name: "Rangareddy", state: "Telangana" },
  { name: "Warangal Urban", state: "Telangana" },
  // Tripura
  { name: "West Tripura", state: "Tripura" },
  // Uttar Pradesh
  { name: "Lucknow", state: "Uttar Pradesh" },
  { name: "Kanpur Nagar", state: "Uttar Pradesh" },
  { name: "Varanasi", state: "Uttar Pradesh" },
  { name: "Ghaziabad", state: "Uttar Pradesh" },
  { name: "Agra", state: "Uttar Pradesh" },
  { name: "Gautam Buddh Nagar", state: "Uttar Pradesh" },
  // Uttarakhand
  { name: "Dehradun", state: "Uttarakhand" },
  { name: "Haridwar", state: "Uttarakhand" },
  { name: "Nainital", state: "Uttarakhand" },
  // West Bengal
  { name: "Kolkata", state: "West Bengal" },
  { name: "Howrah", state: "West Bengal" },
  { name: "North 24 Parganas", state: "West Bengal" },
  { name: "South 24 Parganas", state: "West Bengal" },
  { name: "Darjeeling", state: "West Bengal" },
  // Union Territories
  { name: "South Andaman", state: "Andaman and Nicobar Islands" },
  { name: "Chandigarh", state: "Chandigarh" },
  { name: "Dadra and Nagar Haveli", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { name: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { name: "New Delhi", state: "Delhi" },
  { name: "Central Delhi", state: "Delhi" },
  { name: "South Delhi", state: "Delhi" },
  { name: "North Delhi", state: "Delhi" },
  { name: "Srinagar", state: "Jammu and Kashmir" },
  { name: "Jammu", state: "Jammu and Kashmir" },
  { name: "Leh", state: "Ladakh" },
  { name: "Kargil", state: "Ladakh" },
  { name: "Lakshadweep", state: "Lakshadweep" },
  { name: "Puducherry", state: "Puducherry" },
];

export const STATES: string[] = Array.from(
  new Set(DISTRICTS.map((d) => d.state)),
).sort();

export function isKnownDistrict(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return DISTRICTS.some((d) => d.name.toLowerCase() === normalized);
}

// Case-insensitive lookup returning the canonically-cased entry — used to
// normalize a district name reported by an external source (e.g.
// LocationIQ) against this list, rather than trusting that source's own
// casing/formatting.
export function findCanonicalDistrict(name: string): District | null {
  const normalized = name.trim().toLowerCase();
  return DISTRICTS.find((d) => d.name.toLowerCase() === normalized) ?? null;
}

// Real-world state-mapping CSVs (Section 12.5) use a variety of official
// short forms for the same state/UT — abbreviations that can't be
// derived by normalizing punctuation or dropping words, only by a direct
// lookup. Extend this if another genuine abbreviation turns up.
const STATE_ABBREVIATIONS: Record<string, string> = {
  dnh: "dadra and nagar haveli",
};

function normalizeStateText(raw: string): string {
  const withAnd = raw.trim().toLowerCase().replace(/&/g, " and ");
  const expanded = withAnd
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => STATE_ABBREVIATIONS[word] ?? word)
    .join(" ");
  return expanded.replace(/\s+/g, " ").trim();
}

// Case-insensitive, punctuation-tolerant lookup for the state-level
// authority-email mapping (state_mapping table) — validates admin CSV
// uploads and resolves a report's district to its state for email
// routing. Real uploads use a mix of phrasings for the same state/UT
// ("Andaman & Nicobar" for "Andaman and Nicobar Islands"), so beyond an
// exact match this also accepts a whole-word prefix of exactly one
// canonical name — i.e. a canonical name with its trailing descriptor
// word(s) dropped — rather than requiring the full official name.
export function findCanonicalState(name: string): string | null {
  const normalized = normalizeStateText(name);
  if (!normalized) return null;

  const matches = STATES.filter((state) => {
    const canonicalNormalized = normalizeStateText(state);
    return canonicalNormalized === normalized || canonicalNormalized.startsWith(`${normalized} `);
  });

  return matches.length === 1 ? matches[0] : null;
}
