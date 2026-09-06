const ONBOARDING_KEY = "offroading:onboarded";

// Wrapped in try/catch — private browsing or a full storage quota can throw
// on read or write; falling back to "always show onboarding" is safe (worst
// case, an extra screen) rather than letting the error crash the hero screen.
export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // ignore — see hasSeenOnboarding
  }
}
