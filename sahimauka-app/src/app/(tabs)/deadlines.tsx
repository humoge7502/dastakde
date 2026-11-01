import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  countdownInfo,
  daysUntil,
  deadlineLine,
  isExpired,
} from "@/components/OppCard";
import { COLORS } from "@/constants";
import type { OppItem } from "@/lib/feed";
import { useFeed } from "@/lib/use-feed";

type Section = {
  key: string;
  title: string;
  note?: string;
  data: OppItem[];
};

function buildSections(items: OppItem[]): Section[] {
  const live = items.filter((it) => !isExpired(it));

  const dated = live
    .filter((it) => it.deadline_status === "fixed" && it.deadline)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));

  const thisWeek: OppItem[] = [];
  const thisMonth: OppItem[] = [];
  const later: OppItem[] = [];

  for (const it of dated) {
    const d = daysUntil(it.deadline);
    if (d == null) continue;
    if (d <= 7) thisWeek.push(it);
    else if (d <= 31) thisMonth.push(it);
    else later.push(it);
  }

  const portal = live.filter((it) => it.deadline_status === "check_official");
  const seasonal = live.filter(
    (it) => it.deadline_status === "rolling" || it.deadline_status === "seasonal"
  );
  const notices = live
    .filter((it) => it.deadline_status === "notice")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));

  const sections: Section[] = [
    {
      key: "week",
      title: "Closing this week",
      note: "Fixed deadlines — act now.",
      data: thisWeek,
    },
    {
      key: "month",
      title: "Closing this month",
      note: "Fixed deadlines in the next 31 days.",
      data: thisMonth,
    },
    { key: "later", title: "Later", data: later },
    {
      key: "portal",
      title: "Check dates on the portal",
      note: "Official programme pages that do not publish one fixed date.",
      data: portal,
    },
    {
      key: "seasonal",
      title: "Open or seasonal",
      data: seasonal,
    },
    {
      key: "notices",
      title: "New official notices",
      note: "Exam and scholarship notices. Open the notice for exact dates.",
      data: notices,
    },
  ];
  return sections.filter((s) => s.data.length > 0);
}

export default function DeadlinesScreen() {
  const router = useRouter();
  const { items, loading, refreshing, refresh } = useFeed();

  const sections = useMemo(() => buildSections(items), [items]);

  const summary = useMemo(() => {
    const live = items.filter((it) => !isExpired(it));
    const week = live.filter((it) => {
      if (it.deadline_status !== "fixed") return false;
      const d = daysUntil(it.deadline);
      return d != null && d <= 7;
    }).length;
    const portal = live.filter(
      (it) => it.deadline_status === "check_official"
    ).length;
    const notices = live.filter((it) => it.deadline_status === "notice").length;
    return { week, portal, notices };
  }, [items]);

  const openDetail = (item: OppItem) => {
    router.push(`/opp/${item.id}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <SectionList
        sections={loading ? [] : sections}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          loading ? undefined : (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Never miss a date.</Text>
              <Text style={styles.headerBody}>
                Fixed deadlines get countdowns and reminders. “Dates on portal”
                and notice items link to the official source, where exact dates
                are confirmed.
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryNumber}>{summary.week}</Text>
                  <Text style={styles.summaryLabel}>closing this week</Text>
                </View>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryNumber}>{summary.portal}</Text>
                  <Text style={styles.summaryLabel}>check on portal</Text>
                </View>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryNumber}>{summary.notices}</Text>
                  <Text style={styles.summaryLabel}>notices</Text>
                </View>
              </View>
            </View>
          )
        }
        renderItem={({ item }) => {
          const cd = countdownInfo(item);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => openDetail(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.org}
                </Text>
                <View style={styles.rowDate}>
                  <Feather
                    name={
                      item.deadline_status === "fixed" ? "calendar" : "info"
                    }
                    size={11}
                    color={COLORS.muted}
                  />
                  <Text style={styles.rowDateText} numberOfLines={1}>
                    {deadlineLine(item)}
                  </Text>
                </View>
              </View>
              <View style={[styles.countChip, { backgroundColor: cd.bg }]}>
                <Text style={[styles.countText, { color: cd.color }]}>
                  {cd.label}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.line} />
            </Pressable>
          );
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.note ? (
              <Text style={styles.sectionNote}>{section.note}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonWrap}>
              <View style={[styles.skeletonLine, { width: "40%" }]} />
              <View style={styles.skeletonRow} />
              <View style={styles.skeletonRow} />
              <View style={styles.skeletonRow} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🗓️</Text>
              <Text style={styles.emptyTitle}>No deadlines in the feed yet</Text>
              <Text style={styles.emptyBody}>
                The live feed has no dated opportunities right now. It refreshes
                every 2 hours from official sources — pull down to check again.
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    gap: 8,
    paddingTop: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.ink,
  },
  headerBody: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 1,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.accent,
  },
  summaryLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textAlign: "center",
    fontWeight: "600",
  },
  sectionHead: {
    marginTop: 18,
    marginBottom: 8,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
  },
  sectionNote: {
    fontSize: 11,
    color: COLORS.muted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
    lineHeight: 20,
  },
  rowMeta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  rowDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowDateText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.inkSoft,
  },
  countChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 100,
  },
  countText: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  skeletonWrap: {
    paddingTop: 24,
    gap: 10,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.chipIdle,
  },
  skeletonRow: {
    height: 78,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
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
  },
});
