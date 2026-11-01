import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { COLORS } from "@/constants";
import type { OppItem } from "@/lib/feed";
import { create } from "@/lib/store-core";

const NEW_ALERTS_KEY = "alerts.new.v1";
const DIGEST_KEY = "alerts.digest.v1";
const KNOWN_IDS_KEY = "feed.known.ids.v1";
const TRACKED_KEY = "tracked.cats.v1";
const DIGEST_ID = "digest-daily";
const KNOWN_LIMIT = 1200;
const DIGEST_HOUR = 9;

const newAlertsStore = create<boolean>(NEW_ALERTS_KEY, true);
const digestStore = create<boolean>(DIGEST_KEY, false);

export const useNewAlerts = () => newAlertsStore.hook();
export const useDigest = () => digestStore.hook();

async function readBool(key: string, fallback: boolean): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : Boolean(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

function short(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

async function ensureChannel(
  id: string,
  name: string,
  importance: Notifications.AndroidImportance
): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(id, {
      name,
      importance,
      lightColor: COLORS.accent,
    });
  } catch {
    // Channel setup is best effort; scheduling still has a default channel.
  }
}

async function hasPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function requestAlertPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function setNewAlertsEnabled(on: boolean): Promise<boolean> {
  if (on && !(await requestAlertPermission())) {
    await newAlertsStore.set(false);
    return false;
  }
  await newAlertsStore.set(on);
  return true;
}

export async function setDigestEnabled(
  on: boolean,
  items: OppItem[]
): Promise<boolean> {
  if (on && !(await requestAlertPermission())) {
    await digestStore.set(false);
    return false;
  }
  await digestStore.set(on);
  if (on) await scheduleDigest(items);
  else await cancelDigest();
  return true;
}

export async function cancelDigest(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DIGEST_ID);
  } catch {
    // Not scheduled: nothing to cancel.
  }
}

export async function scheduleDigest(items: OppItem[]): Promise<void> {
  if (Platform.OS === "web") return;
  if (!(await hasPermission())) return;
  if (!(await readBool(DIGEST_KEY, false))) return;

  const now = Date.now();
  const inSevenDays = now + 7 * 24 * 60 * 60 * 1000;
  const open = items.filter((it) => it.deadline_status !== "notice");
  const closing = items.filter((it) => {
    if (it.deadline_status !== "fixed" || !it.deadline) return false;
    const t = Date.parse(`${it.deadline}T23:59:59`);
    return !Number.isNaN(t) && t >= now && t <= inSevenDays;
  });

  await ensureChannel(
    "digest",
    "Daily opportunity digest",
    Notifications.AndroidImportance.DEFAULT
  );

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: DIGEST_ID,
      content: {
        title: "☀️ Your DastakDe digest",
        body: short(
          `${open.length} verified opportunities live · ${closing.length} closing this week. Open the app to check yours.`,
          180
        ),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: DIGEST_HOUR,
        minute: 0,
        channelId: Platform.OS === "android" ? "digest" : undefined,
      },
    });
  } catch {
    // A missed digest must never block feed loading.
  }
}

let pipeline: Promise<void> | null = null;

/**
 * Compares the freshly loaded feed against the last known item IDs and
 * raises a local alert when genuinely new opportunities appear. The first
 * run only establishes a baseline, so a fresh install never gets spammed.
 */
export async function processFeedAlerts(items: OppItem[]): Promise<void> {
  if (Platform.OS === "web") return;
  if (pipeline) return pipeline;

  pipeline = (async () => {
    try {
      const ids = items.map((it) => it.id);
      const raw = await AsyncStorage.getItem(KNOWN_IDS_KEY);

      if (raw == null) {
        await AsyncStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(ids.slice(0, KNOWN_LIMIT)));
        await scheduleDigest(items);
        return;
      }

      let known: string[] = [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) known = parsed.filter((x): x is string => typeof x === "string");
      } catch {
        known = [];
      }
      if (known.length === 0) {
        await AsyncStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(ids.slice(0, KNOWN_LIMIT)));
        await scheduleDigest(items);
        return;
      }

      const knownSet = new Set(known);
      let fresh = items.filter((it) => !knownSet.has(it.id));

      try {
        const rawTracked = await AsyncStorage.getItem(TRACKED_KEY);
        const tracked: string[] = rawTracked ? JSON.parse(rawTracked) : [];
        if (Array.isArray(tracked) && tracked.length > 0) {
          fresh = fresh.filter((it) => tracked.includes(it.category));
        }
      } catch {
        // Unreadable preferences: alert on everything rather than nothing.
      }

      const merged = Array.from(new Set([...ids, ...known])).slice(0, KNOWN_LIMIT);
      await AsyncStorage.setItem(KNOWN_IDS_KEY, JSON.stringify(merged));

      const wantsAlerts = await readBool(NEW_ALERTS_KEY, true);
      if (fresh.length > 0 && wantsAlerts && (await hasPermission())) {
        await ensureChannel(
          "opportunities",
          "New verified opportunities",
          Notifications.AndroidImportance.HIGH
        );
        const preview = fresh
          .slice(0, 2)
          .map((it) => it.title)
          .join(" · ");
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: `new-${Date.now()}`,
            content: {
              title:
                fresh.length === 1
                  ? "New verified opportunity"
                  : `${fresh.length} new verified opportunities`,
              body: short(
                `${preview}${fresh.length > 2 ? ` +${fresh.length - 2} more` : ""}. Tap to open DastakDe.`,
                180
              ),
              data: { screen: "home" },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: Platform.OS === "android" ? "opportunities" : undefined,
            },
          });
        } catch {
          // Notification delivery is best effort; the feed still updated.
        }
      }

      await scheduleDigest(items);
    } finally {
      pipeline = null;
    }
  })();

  return pipeline;
}
