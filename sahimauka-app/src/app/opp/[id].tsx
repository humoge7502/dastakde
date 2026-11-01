import { Feather } from "@expo/vector-icons";
import { openBrowserAsync } from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  countdownInfo,
  daysUntil,
  deadlineLine,
  formatDay,
} from "@/components/OppCard";
import { CATEGORIES, COLORS, DEADLINE_LABELS, reportUrl } from "@/constants";
import type { OppItem } from "@/lib/feed";
import { toggleSaved, useSaved } from "@/lib/persistence";
import {
  cancelReminders,
  reminderIdsFor,
  scheduleDeadlineReminders,
} from "@/lib/reminders";
import { useFeed } from "@/lib/use-feed";

function categoryChip(category: string): { emoji: string; label: string } {
  const found = CATEGORIES.find((c) => c.key === category);
  if (found) return { emoji: found.emoji, label: found.label };
  return { emoji: "📌", label: category };
}

function deadlinePanel(item: OppItem): { value: string; note: string } {
  if (item.deadline_status === "fixed" && item.deadline) {
    const days = daysUntil(item.deadline);
    return {
      value: formatDay(item.deadline),
      note:
        days == null
          ? "Check the official page for the exact deadline."
          : days < 0
            ? "This deadline has passed. The official page may still have details."
            : days === 0
              ? "Closes today. Confirm the exact cut-off time on the official page."
              : `Closes in ${days} day${days === 1 ? "" : "s"}. Confirm the exact cut-off time on the official page.`,
    };
  }
  if (item.deadline_status === "notice") {
    return {
      value: "Official notice",
      note: item.published_at
        ? `Published ${formatDay(item.published_at)}. This notice may announce dates, results or instructions — open it for the authoritative detail.`
        : "This is an official notice, not a single application deadline. Open it for the authoritative detail.",
    };
  }
  if (item.deadline_status === "check_official") {
    return {
      value: "Dates on the official portal",
      note: "This programme page does not publish one fixed deadline in the feed. Check the current dates, eligibility and application window on the official portal.",
    };
  }
  if (item.deadline_status === "seasonal") {
    return {
      value: "Seasonal window",
      note: "Applications run in a seasonal window. Check the official portal for the current opening and closing dates.",
    };
  }
  return {
    value: "No fixed deadline",
    note: "Check the official portal for current availability and any cut-off dates.",
  };
}

export default function OppDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loading } = useFeed();
  const [saved] = useSaved();

  const item: OppItem | undefined = items.find((it) => it.id === id);
  const isSaved = saved.some((s) => s.id === id);

  const [remindersOn, setRemindersOn] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderCount, setReminderCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { listScheduled } = await import("@/lib/reminders");
      const ids = await listScheduled();
      if (cancelled) return;
      const wanted = reminderIdsFor(id ?? "");
      setRemindersOn(ids.some((sid) => wanted.includes(sid)));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
        <View style={styles.skeletonBlock} />
        <View style={[styles.skeletonBlock, { height: 120 }]} />
      </ScrollView>
    );
  }

  if (!item) {
    return (
      <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤷</Text>
          <Text style={styles.emptyTitle}>Not in the feed right now</Text>
          <Text style={styles.emptyBody}>
            This item is not in the live verified feed (it may have been
            removed at the source). Pull-to-refresh on Home to re-sync.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryBtnText}>Go back</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const cd = countdownInfo(item);
  const cat = categoryChip(item.category);
  const panel = deadlinePanel(item);
  const canRemind =
    item.deadline_status === "fixed" &&
    item.deadline != null &&
    (daysUntil(item.deadline) ?? -1) >= 0;

  const fetchedDate = new Date(item.fetched_at);
  const fetchedLabel = Number.isNaN(fetchedDate.getTime())
    ? item.fetched_at
    : fetchedDate.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const openOfficial = async () => {
    try {
      await openBrowserAsync(item.url);
    } catch {
      await Linking.openURL(item.url).catch(() => {
        // No browser available; nothing else to do.
      });
    }
  };

  const openReport = async () => {
    const url = reportUrl(item);
    try {
      await openBrowserAsync(url);
    } catch {
      await Linking.openURL(url).catch(() => {
        // No browser available.
      });
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${item.title}\n${item.org}\n${deadlineLine(item)}\n${item.url}\n\nFound on DastakDe.`,
      });
    } catch {
      // The share sheet was dismissed.
    }
  };

  const onRemind = async () => {
    if (remindersOn) {
      setReminderBusy(true);
      await cancelReminders(item.id);
      setRemindersOn(false);
      setReminderCount(null);
      setReminderBusy(false);
      return;
    }
    setReminderBusy(true);
    const count = await scheduleDeadlineReminders({
      id: item.id,
      title: item.title,
      deadline: item.deadline,
    });
    setReminderBusy(false);
    if (count > 0) {
      setRemindersOn(true);
      setReminderCount(count);
    }
  };

  const onSave = async () => {
    await toggleSaved({
      id: item.id,
      saved_at: new Date().toISOString(),
      deadline: item.deadline,
    });
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: COLORS.accentSoft }]}>
          <Text style={styles.catChipText}>
            {cat.emoji} {cat.label}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: cd.bg }]}>
          <Text style={[styles.countChipText, { color: cd.color }]}>
            {cd.label}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.org}>{item.org}</Text>

      <View style={styles.deadlineCard}>
        <Text style={styles.deadlineLabel}>
          {DEADLINE_LABELS[item.deadline_status].toUpperCase()}
        </Text>
        <Text style={[styles.deadlineValue, { color: cd.color }]}>
          {panel.value}
        </Text>
        <Text style={styles.deadlineNote}>{panel.note}</Text>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.evidenceCard}>
        <View style={styles.evidenceHead}>
          <Feather
            name={item.verification.source_verified ? "check-circle" : "alert-circle"}
            size={16}
            color={item.verification.source_verified ? COLORS.ok : COLORS.accent2}
          />
          <Text style={styles.evidenceTitle}>
            {item.verification.source_verified
              ? "Official source verified"
              : "Source listed, verification pending"}
          </Text>
        </View>
        <Text style={styles.evidenceLine}>
          {item.source_label} · {item.verification.domain}
        </Text>
        <Text style={styles.evidenceLine}>
          Feed fetched {fetchedLabel}
          {item.published_at ? ` · Published ${formatDay(item.published_at)}` : ""}
        </Text>
        <Text style={styles.evidenceUrl} numberOfLines={1}>
          {item.url}
        </Text>
      </View>

      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => {
          void openOfficial();
        }}
      >
        <Feather name="external-link" size={16} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Open official page</Text>
      </Pressable>

      {canRemind ? (
        <Pressable
          accessibilityRole="button"
          disabled={reminderBusy}
          style={({ pressed }) => [
            styles.button,
            remindersOn ? styles.okBtn : styles.secondaryBtn,
            pressed && styles.pressed,
            reminderBusy && styles.disabled,
          ]}
          onPress={() => {
            void onRemind();
          }}
        >
          <Feather
            name={remindersOn ? "bell" : "bell-off"}
            size={16}
            color={remindersOn ? "#FFFFFF" : COLORS.accent}
          />
          <Text
            style={
              remindersOn ? styles.primaryBtnText : styles.secondaryBtnText
            }
          >
            {remindersOn
              ? "Reminders on ✓ (tap to cancel)"
              : "Remind me"}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.noReminder}>
          Reminders are available for fixed deadlines. For this item, confirm
          the dates on the official page.
        </Text>
      )}
      {remindersOn && reminderCount != null ? (
        <Text style={styles.okNote}>
          {reminderCount} reminder{reminderCount === 1 ? "" : "s"} scheduled at
          09:00 on D-7, D-3, D-1 and deadline day.
        </Text>
      ) : null}

      <View style={styles.secondaryRow}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.halfButton,
            isSaved ? styles.savedBtn : styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void onSave();
          }}
        >
          <Feather
            name="bookmark"
            size={15}
            color={isSaved ? COLORS.ink : COLORS.accent}
          />
          <Text style={isSaved ? styles.savedBtnText : styles.secondaryBtnText}>
            {isSaved ? "Saved" : "Save"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.halfButton,
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void onShare();
          }}
        >
          <Feather name="share-2" size={15} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Share</Text>
        </Pressable>
      </View>

      <View style={styles.checkCard}>
        <Text style={styles.checkTitle}>Before you apply</Text>
        <Text style={styles.checkLine}>
          • Confirm the deadline and eligibility on the official page.
        </Text>
        <Text style={styles.checkLine}>
          • Never pay anyone to “confirm” an internship or scholarship.
        </Text>
        <Text style={styles.checkLine}>
          • The official domain is shown above — check it before sharing
          documents.
        </Text>
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => {
          void openReport();
        }}
        style={({ pressed }) => [styles.reportBtn, pressed && styles.pressed]}
      >
        <Feather name="flag" size={13} color={COLORS.muted} />
        <Text style={styles.reportText}>
          Wrong or expired? Report this listing
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent,
  },
  countChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.ink,
    lineHeight: 28,
  },
  org: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: -6,
  },
  deadlineCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  deadlineLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.muted,
    letterSpacing: 0.7,
  },
  deadlineValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  deadlineNote: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.ink,
  },
  evidenceCard: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  evidenceHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  evidenceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
  },
  evidenceLine: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
  evidenceUrl: {
    fontSize: 11,
    color: COLORS.accent,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  secondaryBtn: {
    backgroundColor: COLORS.accentSoft,
  },
  okBtn: {
    backgroundColor: COLORS.ok,
  },
  savedBtn: {
    backgroundColor: COLORS.chipIdle,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  savedBtnText: {
    color: COLORS.ink,
    fontWeight: "700",
    fontSize: 14,
  },
  noReminder: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
    backgroundColor: COLORS.chipIdle,
    borderRadius: 10,
    padding: 10,
  },
  okNote: {
    fontSize: 12,
    color: COLORS.ok,
    fontWeight: "600",
    textAlign: "center",
    marginTop: -6,
  },
  checkCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    gap: 5,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.ink,
    marginBottom: 2,
  },
  checkLine: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  reportText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  skeletonBlock: {
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
