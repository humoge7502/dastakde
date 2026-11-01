import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny AsyncStorage-backed external store.
 *
 * Pattern (mirrors the notes in persistence.ts):
 * - read-once-then-cache: the first subscriber triggers a single AsyncStorage
 *   read; afterwards the in-memory value is the source of truth for render.
 * - subscribe via setImmediate notify: writes replace the in-memory value and
 *   notify listeners on a later tick, so no listener ever runs synchronously
 *   inside a render/effect (React Compiler friendly).
 * - `set(next)` is the write path; `refresh()` re-reads from AsyncStorage
 *   (used when another module writes directly with AsyncStorage, e.g.
 *   toggleSaved in persistence.ts).
 */
export type ExternalStore<T> = {
  /** React hook: current value plus a setter that persists the value. */
  hook(): readonly [T, (v: T) => void];
  /** Persist `next` and update all subscribers. */
  set(next: T): Promise<void>;
  /** Re-read the persisted value from AsyncStorage and notify subscribers. */
  refresh(): void;
};

export function create<T>(key: string, initial: T): ExternalStore<T> {
  let value: T = initial;
  let hydrated = false;
  let hydrating = false;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    // Deferred so subscribers never setState synchronously during render/effects.
    setImmediate(() => {
      for (const listener of listeners) listener();
    });
  };

  const readOnce = (): void => {
    if (hydrated || hydrating) return;
    hydrating = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw != null) {
          const parsed = JSON.parse(raw) as T;
          if (parsed !== undefined && parsed !== null) value = parsed;
        }
      } catch {
        // Unreadable/corrupt entry: keep `initial` — never invent data.
      }
      hydrated = true;
      hydrating = false;
      if (listeners.size > 0) notify();
    })();
  };

  const reread = (): void => {
    void (async () => {
      let next: T | undefined;
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw != null) next = JSON.parse(raw) as T;
      } catch {
        next = undefined;
      }
      if (next !== undefined && next !== value) {
        value = next;
        notify();
      }
    })();
  };

  const subscribe = (onStoreChange: () => void): (() => void) => {
    listeners.add(onStoreChange);
    readOnce();
    return () => {
      listeners.delete(onStoreChange);
    };
  };

  const getSnapshot = (): T => value;
  const getServerSnapshot = (): T => initial;

  async function set(next: T): Promise<void> {
    value = next;
    notify();
    try {
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage unavailable: value still lives in memory for this session.
    }
  }

  const hook = (): readonly [T, (v: T) => void] => {
    const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const setter = useCallback((v: T) => {
      void set(v);
    }, []);
    return [current, setter] as const;
  };

  return { hook, set, refresh: reread };
}
