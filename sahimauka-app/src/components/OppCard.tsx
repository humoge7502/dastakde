import { Feather } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSaved } from "@/lib/persistence";
import type { OppItem } from "@/lib/feed";
import { CATEGORIES, COLORS } from "@/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CountdownInfo = {
  label: string;
  color: string;
  bg: string;
};

export type DeadlineItem = Pick<OppItem, "deadline" | "deadline_status">;

function parseDay(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDay(iso: string): string {
  const d = parseDay(iso);
  if (!d) return iso;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const deadlineDay = parseDay(iso);
  if (!deadlineDay) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((deadlineDay.getTime() - startOfToday.getTime()) / DAY_MS);
}

export function isExpired(item: DeadlineItem): boolean {
  if (item.deadline_status !== "fixed") return false;
  const days = daysUntil(item.deadline);
  return days != null && days < 0;
}

export function countdownInfo(item: DeadlineItem): CountdownInfo {
  if (item.deadline_status === "check_official") {
    return {
      label: "Dates on portal",
      color: COLORS.accent,
      bg: COLORS.accentSoft,
    };
  }
  if (item.deadline_status === "notice") {
    return {
      label: "Official notice",
      color: COLORS.accent2,
      bg: COLORS.accent2Soft,
    };
  }
  if (item.deadline_status === "seasonal") {
    return {
      label: "Seasonal",
      color: COLORS.accent2,
      bg: COLORS.accent2Soft,
    };
  }
  if (item.deadline_status === "rolling" || !item.deadline) {
    return { label: "Always open", color: COLORS.ok, bg: COLORS.okSoft };
  }

  const daysLeft = daysUntil(item.deadline);
  if (daysLeft == null) {
    return { label: "Check date", color: COLORS.accent2, bg: COLORS.accent2Soft };
  }
  if (daysLeft < 0) {
    return { label: "Closed", color: COLORS.muted, bg: COLORS.chipIdle };
  }
  const label = daysLeft === 0 ? "Due today" : `${daysLeft}d left`;
  if (daysLeft <= 2) return { label, color: COLORS.danger, bg: COLORS.dangerSoft };
  if (daysLeft <= 7) return { label, color: COLORS.accent2, bg: COLORS.accent2Soft };
  return { label, color: COLORS.ok, bg: COLORS.okSoft };
}

export function deadlineLine(item: OppItem): string {
  if (item.deadline_status === "fixed" && item.deadline) {
    const days = daysUntil(item.deadline);
    if (days != null && days < 0) return `Closed ${formatDay(item.deadline)}`;
    return `Closes ${formatDay(item.deadline)}`;
  }
  if (item.deadline_status === "notice") {
    return item.published_at
      ? `Official notice · ${formatDay(item.published_at)}`
      : "Official notice — open for dates";
  }
  if (item.deadline_status === "check_official") {
    return "Dates and eligibility are on the official portal";
  }
  if (item.deadline_status === "seasonal") {
    return "Seasonal window — check the official portal";
  }
  return "No fixed deadline — check the official portal";
}

function categoryChip(category: string): { emoji: string; label: string } {
  const found = CATEGORIES.find((c) => c.key === category);
  if (found) return { emoji: found.emoji, label: found.label };
  return { emoji: "📌", label: category };
}

function OppCardImpl({
  item,
  onPress,
  compact = false,
}: {
  item: OppItem;
  onPress?: (item: OppItem) => void;
  compact?: boolean;
}) {
  const [saved] = useSaved();
  const isSaved = useMemo(
    () => saved.some((s) => s.id === item.id),
    [saved, item.id]
  );
  const countdown = countdownInfo(item);
  const cat = categoryChip(item.category);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} — ${cat.label}, ${deadlineLine(item)}`}
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.chip, { backgroundColor: COLORS.accentSoft }]}>
          <Text style={styles.chipText}>
            {cat.emoji} {cat.label}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: countdown.bg }]}>
          <Text style={[styles.chipText, { color: countdown.color, fontWeight: "700" }]}>
            {countdown.label}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.title, compact && styles.titleCompact]}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      <Text style={styles.org} numberOfLines={1}>
        {item.org}
      </Text>

      <View style={styles.dateRow}>
        <Feather
          name={item.deadline_status === "fixed" ? "calendar" : "info"}
          size={12}
          color={COLORS.inkSoft}
        />
        <Text style={styles.dateText} numberOfLines={1}>
          {deadlineLine(item)}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        {item.verification.source_verified ? (
          <View style={styles.verifiedRow}>
            <Feather name="check-circle" size={13} color={COLORS.ok} />
            <Text style={styles.verifiedText}>
              Verified · {item.verification.domain}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.sourceRow}>
          <Text style={styles.sourceText} numberOfLines={1}>
            {item.source_label}
          </Text>
          <Feather
            name="bookmark"
            size={16}
            color={isSaved ? COLORS.accent : COLORS.line}
          />
        </View>
      </View>
    </Pressable>
  );
}

export const OppCard = memo(OppCardImpl);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    gap: 6,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardCompact: {
    padding: 12,
    gap: 5,
  },
  pressed: {
    opacity: 0.86,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: "600",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.ink,
    lineHeight: 21,
  },
  titleCompact: {
    fontSize: 15,
  },
  org: {
    fontSize: 12,
    color: COLORS.muted,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.chipIdle,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dateText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.inkSoft,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  verifiedText: {
    fontSize: 11,
    color: COLORS.ok,
    fontWeight: "600",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  sourceText: {
    fontSize: 10,
    color: COLORS.muted,
    maxWidth: 130,
  },
});
