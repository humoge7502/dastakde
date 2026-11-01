import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { processFeedAlerts } from "@/lib/alerts";
import { loadFeed, type FeedIndex, type OppItem } from "@/lib/feed";

/**
 * Shared feed state for screens: serve-then-refresh via loadFeed(), with a
 * pull-to-refresh hook and a silent refresh when the app returns to the
 * foreground. No demo data — empty means the feed is empty or unreachable.
 */
export type FeedView = {
  items: OppItem[];
  index: FeedIndex | null;
  stale: boolean;
  loading: boolean;
  refreshing: boolean;
};

const FOREGROUND_REFRESH_MS = 5 * 60 * 1000;

export function useFeed(): FeedView & { refresh: () => Promise<void> } {
  const [view, setView] = useState<FeedView>({
    items: [],
    index: null,
    stale: false,
    loading: true,
    refreshing: false,
  });
  const lastLoad = useRef(0);
  const mounted = useRef(true);

  const reload = useCallback(async (silent: boolean) => {
    if (!silent) setView((v) => ({ ...v, refreshing: true }));
    const r = await loadFeed();
    lastLoad.current = Date.now();
    if (!mounted.current) return;
    setView({
      items: r.items,
      index: r.index,
      stale: r.stale,
      loading: false,
      refreshing: false,
    });
    void processFeedAlerts(r.items);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload(true);

    const onChange = (state: AppStateStatus) => {
      if (state !== "active") return;
      if (Date.now() - lastLoad.current < FOREGROUND_REFRESH_MS) return;
      void reload(true);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [reload]);

  const refresh = useCallback(async () => {
    setView((v) => ({ ...v, refreshing: true }));
    const r = await loadFeed({ force: true });
    lastLoad.current = Date.now();
    if (!mounted.current) return;
    setView({
      items: r.items,
      index: r.index,
      stale: r.stale,
      loading: false,
      refreshing: false,
    });
    void processFeedAlerts(r.items);
  }, []);

  return { ...view, refresh };
}
