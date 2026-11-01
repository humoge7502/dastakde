import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { COLORS } from "@/constants";

/**
 * Local deadline reminders. Offsets (days before the deadline, and the day
 * itself) fire at 09:00 local time. Identifiers are deterministic —
 * `rem-<itemId>-<offsetDays>` — so scheduling twice never duplicates.
 */

const OFFSETS_DAYS = [7, 3, 1, 0] as const;
const MAX_PER_ITEM = 4;
const FIRE_HOUR = 9;

export type ReminderTarget = {
  id: string;
  title: string;
  deadline: string | null;
};

export function reminderIdsFor(itemId: string): string[] {
  return OFFSETS_DAYS.map((d) => `rem-${itemId}-${d}`);
}

/** Requests notification permission if it is still undetermined. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Parses an ISO date (YYYY-MM-DD) into local midnight of that day. */
function parseDay(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function daysLeftLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Deadline is today";
  if (daysLeft === 1) return "Deadline is tomorrow";
  return `Deadline in ${daysLeft} days`;
}

/**
 * Schedules local reminders at 09:00 local time on D-7, D-3, D-1 and D-day.
 * Offsets whose fire time is already in the past are skipped. Returns the
 * number of reminders actually scheduled (0 when there is no deadline or no
 * permission).
 */
export async function scheduleDeadlineReminders(
  item: ReminderTarget
): Promise<number> {
  if (!item.deadline) return 0;
  const deadlineDay = parseDay(item.deadline);
  if (!deadlineDay) return 0;

  const granted = await ensurePermission();
  if (!granted) return 0;

  // Reset any existing reminders for this item first.
  await cancelReminders(item.id);

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("deadlines", {
        name: "Deadline reminders",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: COLORS.accent,
      });
    } catch {
      // Channel creation is best-effort; scheduling still proceeds.
    }
  }
  const channelId = Platform.OS === "android" ? "deadlines" : undefined;

  const now = Date.now();
  let scheduled = 0;
  for (const offset of OFFSETS_DAYS) {
    if (scheduled >= MAX_PER_ITEM) break;
    const fireAt = new Date(deadlineDay);
    fireAt.setDate(fireAt.getDate() - offset);
    fireAt.setHours(FIRE_HOUR, 0, 0, 0);
    if (fireAt.getTime() <= now) continue;

    const daysLeft = offset;
    const body = `${daysLeftLabel(daysLeft)} — ${fireAt.toLocaleDateString(
      undefined,
      { weekday: "short", day: "numeric", month: "short" }
    )}. Open DastakDe for the official link.`;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `rem-${item.id}-${offset}`,
        content: {
          title: `⏰ Deadline soon: ${truncate(item.title, 60)}`,
          body,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId },
      });
      scheduled += 1;
    } catch {
      // One failed offset should not block the rest.
    }
  }
  return scheduled;
}

/** Cancels every reminder previously scheduled for `itemId`. */
export async function cancelReminders(itemId: string): Promise<void> {
  await Promise.all(
    reminderIdsFor(itemId).map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Already delivered/absent — nothing to do.
      }
    })
  );
}

/** Identifiers of all currently scheduled notifications (for settings). */
export async function listScheduled(): Promise<string[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.map((n) => n.identifier).sort();
}
