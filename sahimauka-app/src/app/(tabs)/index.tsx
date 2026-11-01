import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDeferredValue, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isExpired, OppCard } from "@/components/OppCard";
import { CATEGORIES, COLORS, type CategoryKey } from "@/constants";
import type { OppItem } from "@/lib/feed";
import { useFeed } from "@/lib/use-feed";

function relativeAge(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown time";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeletonLine, { width: "34%" }]} />
      <View style={[styles.skeletonLine, { width: "88%", height: 18 }]} />
      <View style={[styles.skeletonLine, { width: "55%" }]} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { items, index, stale, loading, refreshing, refresh } = useFeed();
  const [category, setCategory] = useState<CategoryKey>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter((it: OppItem) => {
      if (isExpired(it)) return false;
      if (category !== "all" && it.category !== category) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.org.toLowerCase().includes(q) ||
        it.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, category, deferredQuery]);

  const health = useMemo(() => {
    if (!index) return null;
    const entries = Object.values(index.sources);
    return {
      ok: entries.filter((s) => s.status === "ok").length,
      total: entries.length,
    };
  }, [index]);

  const openDetail = (item: OppItem) => {
    router.push(`/opp/${item.id}`);
  };

  const clearSearch = () => setQuery("");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search opportunities or organisations"
            placeholderTextColor={COLORS.muted}
            style={styles.search}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={clearSearch}
              hitSlop={10}
            >
              <Feather name="x" size={16} color={COLORS.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsInner}
        >
          {CATEGORIES.map((c) => {
            const active = c.key === category;
            return (
              <Pressable
                key={c.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.emoji} {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={loading ? ([] as OppItem[]) : filtered}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <OppCard item={item} onPress={openDetail} />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          loading ? undefined : (
            <View style={styles.header}>
              {category === "all" && !deferredQuery ? (
                <View style={styles.hero}>
                  <Text style={styles.heroKicker}>
                    {index
                      ? `${index.total} VERIFIED · UPDATED ${relativeAge(index.generated_at).toUpperCase()}`
                      : "VERIFIED OPPORTUNITIES"}
                  </Text>
                  <Text style={styles.heroTitle}>
                    Your next opportunity is knocking.
                  </Text>
                  <Text style={styles.heroBody}>
                    Hackathons, internships, scholarships, fellowships, exams
                    and schemes — straight from official sources.
                  </Text>
                </View>
              ) : null}

              <View style={styles.statusRow}>
                <View style={styles.pill}>
                  <Feather
                    name={stale ? "wifi-off" : "check-circle"}
                    size={12}
                    color={stale ? COLORS.accent2 : COLORS.ok}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      { color: stale ? COLORS.accent2 : COLORS.ok },
                    ]}
                  >
                    {stale
                      ? "Offline — last synced feed"
                      : index
                        ? `Live feed · ${index.total} items`
                        : "Waiting for the first sync"}
                  </Text>
                </View>
                {health ? (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      Sources {health.ok}/{health.total} healthy
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.resultCount}>
                {filtered.length}{" "}
                {filtered.length === 1 ? "opportunity" : "opportunities"}
                {category !== "all" ? ` in ${activeCategory?.label}` : ""}
                {deferredQuery ? ` matching “${deferredQuery.trim()}”` : ""}
              </Text>
            </View>
          )
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonWrap}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                {index ? "🔍" : "📡"}
              </Text>
              <Text style={styles.emptyTitle}>
                {index ? "Nothing in this view" : "Feed not synced yet"}
              </Text>
              <Text style={styles.emptyBody}>
                {index
                  ? "No verified opportunities match this filter right now. The feed refreshes every 2 hours — pull down to check again."
                  : "DastakDe could not reach the feed. Check your internet connection and pull down to retry."}
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 13,
  },
  search: {
    flex: 1,
    paddingVertical: 11,
    color: COLORS.ink,
    fontSize: 15,
  },
  chipsRow: {
    paddingTop: 10,
  },
  chipsInner: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.chipIdle,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.ink,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    gap: 10,
    paddingTop: 12,
  },
  hero: {
    backgroundColor: COLORS.ink,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.accent2,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "#CFC6E6",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: "700",
  },
  resultCount: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    paddingTop: 2,
  },
  skeletonWrap: {
    gap: 10,
    paddingTop: 4,
  },
  skeletonCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    gap: 10,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.chipIdle,
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
