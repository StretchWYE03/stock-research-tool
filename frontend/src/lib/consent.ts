// Disclaimer consent: stored only in this browser, never sent anywhere.

const CONSENT_KEY = "ticker.consent.v1";

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function acceptConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "accepted");
  } catch {
    /* ignore: the app still works; the gate just reappears next visit */
  }
}
