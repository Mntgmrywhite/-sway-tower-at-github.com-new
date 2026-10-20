// What a screen reader hears while stacking: the score at each landing, in a few words that don't
// spam ("Twelve", "Perfect, thirteen", "Miss, two lives left", "Game over, twenty-four, new
// best"). The canvas shows all of this; this is the same, spoken. Landings come faster than
// speech, so they are throttled: at most one every GAP seconds, the newest kept and said when the
// gap has passed, while a miss and the game over go through at once. The words and the throttle
// are pure; createAnnouncer puts them in an invisible live region.

/** Seconds between two routine announcements (a bar lands about twice a second at speed). */
export const GAP = 1.5;

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** A whole number in words ("twenty-four", "one hundred twelve"); past 999,999 the digits. */
export function numberWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n >= 1_000_000) return String(n);
  if (n < 20) return ONES[n]!;
  if (n < 100) return n % 10 === 0 ? TENS[n / 10]! : `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}`;
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ""}`;
  return `${numberWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberWords(n % 1000)}` : ""}`;
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * A landing: the score after a plain landing or a slice, "Perfect, N" for a perfect, and for a
 * miss the lives left (just "Miss" for the one that ends the run: the card follows).
 */
export function landingWords(kind: "perfect" | "sliced" | "miss", score: number, lives: number): string {
  if (kind === "perfect") return `Perfect, ${numberWords(score)}`;
  if (kind === "sliced") return capital(numberWords(score));
  if (lives <= 0) return "Miss";
  return `Miss, ${numberWords(lives)} ${lives === 1 ? "life" : "lives"} left`;
}

/** The game-over card. */
export function gameOverWords(score: number, newBest: boolean): string {
  return `Game over, ${numberWords(score)}${newBest ? ", new best" : ""}`;
}

/** The throttle: what to say now, and what to hold for when the gap has passed. */
export class Throttle {
  private last = -Infinity;
  private held: string | null = null;

  constructor(private readonly gap = GAP) {}

  /** Offer `text` at `now` (seconds): the text to say now, or null when it is held (see due, flush). */
  offer(text: string, now: number, urgent = false): string | null {
    if (urgent || now - this.last >= this.gap) {
      this.last = now;
      this.held = null;
      return text;
    }
    this.held = text;
    return null;
  }

  /** When the held text may be said, or null when nothing is held. */
  due(): number | null {
    return this.held === null ? null : this.last + this.gap;
  }

  /** The held text, if its time has come at `now`. */
  flush(now: number): string | null {
    const at = this.due();
    if (at === null || now < at) return null;
    const text = this.held!;
    this.held = null;
    this.last = now;
    return text;
  }
}

export interface Announcer {
  /** Say this when the throttle allows (a routine landing). */
  say(text: string): void;
  /** Say this now (a miss, the game over). */
  sayNow(text: string): void;
}

/** A polite live region at the end of the body; `clock` is seconds (performance.now() / 1000). */
export function createAnnouncer(clock: () => number = () => performance.now() / 1000): Announcer {
  const live = document.createElement("div");
  live.className = "announce-live";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  document.body.append(live);
  const throttle = new Throttle();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const speak = (text: string) => {
    // Cleared first, so the same words ("Twelve" again after a restart) read out again.
    live.textContent = "";
    setTimeout(() => (live.textContent = text), 30);
  };
  const schedule = () => {
    const at = throttle.due();
    if (at === null || timer) return;
    timer = setTimeout(() => {
      timer = null;
      const text = throttle.flush(clock());
      if (text) speak(text);
      else schedule();
    }, Math.max(0, (at - clock()) * 1000) + 1);
  };
  const offer = (text: string, urgent: boolean) => {
    const now = throttle.offer(text, clock(), urgent);
    if (now) {
      if (timer) clearTimeout(timer);
      timer = null;
      speak(now);
    } else schedule();
  };
  return {
    say: (text) => offer(text, false),
    sayNow: (text) => offer(text, true),
  };
}
