import { FEED_BASE, type DeadlineStatus } from "@/constants";

export type OppItem = {
  id: string;
  title: string;
  org: string;
  category: string;
  url: string;
  deadline: string | null;
  deadline_status: DeadlineStatus;
  description: string;
  source: string;
  source_label: string;
  fetched_at: string;
  published_at?: string;
  tags: string[];
  verification: {
    domain: string;
    source_verified: boolean;
    deadline_future: boolean | null;
    deadline_status?: DeadlineStatus;
    flags: string[];
    [k: string]: unknown;
  };
};

export type FeedIndex = {
  generated_at: string;
  schema_version?: number;
  total: number;
  counts: Record<string, number>;
  sources: Record<
    string,
    { status: string; items: number; label?: string; error?: string }
  >;
  honesty_note: string;
};

const INDEX_URL = `${FEED_BASE}/index.json`;
const ALL_URL = `${FEED_BASE}/all.json`;
const CACHE_KEY = "feed.cache.v2";
const CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;

type CacheShape = { fetched_at: number; index: FeedIndex; items: OppItem[] };

let memoryCache: CacheShape | null = null;

function normalizeDeadlineStatus(
  raw: string | undefined,
  deadline: string | null
): DeadlineStatus {
  const allowed: DeadlineStatus[] = [
    "fixed",
    "rolling",
    "check_official",
    "notice",
    "seasonal",
  ];
  if (raw && allowed.includes(raw as DeadlineStatus)) {
    return raw as DeadlineStatus;
  }
  return deadline ? "fixed" : "rolling";
}

function normalizeItem(raw: OppItem): OppItem {
  const deadline = raw.deadline ?? null;
  return {
    ...raw,
    deadline,
    deadline_status: normalizeDeadlineStatus(raw.deadline_status, deadline),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    verification: {
      ...raw.verification,
      domain: raw.verification?.domain ?? "",
      source_verified: Boolean(raw.verification?.source_verified),
      deadline_future: raw.verification?.deadline_future ?? null,
      flags: Array.isArray(raw.verification?.flags)
        ? raw.verification.flags
        : [],
    },
  };
}

async function readCache(): Promise<CacheShape | null> {
  if (memoryCache) return memoryCache;
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
      .default;
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    memoryCache = JSON.parse(raw) as CacheShape;
    return memoryCache;
  } catch {
    return null;
  }
}

async function writeCache(c: CacheShape): Promise<void> {
  memoryCache = c;
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
      .default;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // Storage unavailable: the in-memory cache still serves this session.
  }
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  return res.json();
}

export type FeedResult = {
  items: OppItem[];
  index: FeedIndex | null;
  stale: boolean;
};

/**
 * Loads the live verified feed. Serve-then-refresh: cached data renders
 * instantly (marked stale); a network refresh updates it. If the network
 * fails, the last real data still shows — never fabricated items.
 */
export async function loadFeed(options?: { force?: boolean }): Promise<FeedResult> {
  const cached = await readCache();
  const now = Date.now();
  if (!options?.force && cached && now - cached.fetched_at < CACHE_TTL_MS) {
    return { items: cached.items, index: cached.index, stale: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let result: FeedResult | null = null;
  try {
    const [rawIndex, rawAll] = await Promise.all([
      fetchJson(INDEX_URL, controller.signal),
      fetchJson(ALL_URL, controller.signal),
    ]);
    const index = rawIndex as FeedIndex;
    const items = (rawAll as { items?: OppItem[] }).items;
    if (!Array.isArray(items)) throw new Error("feed shape invalid");
    const normalized = items.map(normalizeItem);
    const fresh: CacheShape = { fetched_at: now, index, items: normalized };
    await writeCache(fresh);
    result = { items: normalized, index, stale: false };
  } catch {
    result = null;
  } finally {
    clearTimeout(timer);
  }

  if (result) return result;
  if (cached) return { items: cached.items, index: cached.index, stale: true };
  return { items: [], index: null, stale: false };
}
