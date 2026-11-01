export const BRAND = {
  name: "DastakDe",
  tagline: "Mauka dastak de raha hai.",
  taglineEn: "Verified opportunities. Right on time.",
};

const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const SITE_BASE = "https://humoge7502.github.io/dastakde";

export const FEED_BASE = IS_LOCALHOST
  ? "/feed"
  : `${SITE_BASE}/feed`;

export const GITHUB_REPO = "https://github.com/humoge7502/dastakde";

export const BUSINESS_MODEL_URL = `${GITHUB_REPO}/blob/main/BUSINESS_MODEL.md`;

export const ORGANIZERS_URL = `${SITE_BASE}/organizers.html`;

export const COLLEGES_URL = `${SITE_BASE}/colleges.html`;

export const PRIVACY_URL = `${SITE_BASE}/privacy.html`;

export function reportUrl(item: {
  id: string;
  title: string;
  url: string;
}): string {
  const title = encodeURIComponent(`Feed issue: ${item.title.slice(0, 80)}`);
  const body = encodeURIComponent(
    `Item ID: ${item.id}\nOfficial URL: ${item.url}\n\nWhat is wrong?\n`
  );
  return `${GITHUB_REPO}/issues/new?title=${title}&body=${body}`;
}

export const CATEGORIES = [
  { key: "all", label: "All", emoji: "✦" },
  { key: "hackathons", label: "Hackathons", emoji: "⚡" },
  { key: "internships", label: "Internships", emoji: "💼" },
  { key: "scholarships", label: "Scholarships", emoji: "🎓" },
  { key: "fellowships", label: "Fellowships", emoji: "🔬" },
  { key: "exams", label: "Exams", emoji: "📝" },
  { key: "schemes", label: "Schemes", emoji: "🏛️" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export type DeadlineStatus =
  | "fixed"
  | "rolling"
  | "check_official"
  | "notice"
  | "seasonal";

export const DEADLINE_LABELS: Record<DeadlineStatus, string> = {
  fixed: "Fixed deadline",
  rolling: "Always open",
  check_official: "Dates on portal",
  notice: "Official notice",
  seasonal: "Seasonal",
};

export const COLORS = {
  bg: "#FBF9FF",
  ink: "#191033",
  inkSoft: "#332A4D",
  muted: "#6A6279",
  accent: "#6D28D9",
  accentSoft: "#F1EBFF",
  accent2: "#D97706",
  accent2Soft: "#FEF3DD",
  danger: "#DC2626",
  dangerSoft: "#FDEAEA",
  ok: "#047857",
  okSoft: "#E7F5EF",
  card: "#FFFFFF",
  line: "#E8E1F5",
  chipIdle: "#F5F1FB",
  shadow: "#191033",
};
