import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OppCard } from "@/components/OppCard";
import { COLORS } from "@/constants";
import type { OppItem } from "@/lib/feed";
import { useSaved } from "@/lib/persistence";
import { useFeed } from "@/lib/use-feed";

export default function SavedScreen() {
  const router = useRouter();
  const [saved] = useSaved();
  const { items, loading, refreshing, refresh } = useFeed();

  const { joined, missing } = useMemo(() => {
    const byId = new Map(items.map((it: OppItem) => [it.id, it] as const));
    const found: OppItem[] = [];
    let notFound = 0;
    // Most recently saved first.
    const ordered = [...saved].sort((a, b) => b.saved_at.localeCompare(a.saved_at));
    for (const meta of ordered) {
      const item = byId.get(meta.id);
      if (item) found.push(item);
      else notFound += 1;
    }
    return { joined: found, missing: notFound };
  }, [saved, items]);

  const openDetail = (item: OppItem) => {
    router.push(`/opp/${item.id}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <FlatList
        data={loading ? ([] as OppItem[]) : joined}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <OppCard item={item} onPress={openDetail} compact />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          !loading ? (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Your shortlist.</Text>
              <Text style={styles.headerBody}>
                Saved on this device only. Open an item to set deadline
                reminders or visit the official page.
              </Text>
              {missing > 0 ? (
                <Text style={styles.pruneNote}>
                  {missing} saved {missing === 1 ? "item is" : "items are"} no
                  longer in the live feed and are hidden.
                </Text>
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonWrap}>
              <View style={styles.skeletonRow} />
              <View style={styles.skeletonRow} />
              <View style={styles.skeletonRow} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔖</Text>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyBody}>
                Tap the bookmark on any opportunity to keep it here — saved
                items stay on your device only.
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
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    gap: 6,
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
  pruneNote: {
    fontSize: 12,
    color: COLORS.muted,
    paddingTop: 4,
  },
  skeletonWrap: {
    paddingTop: 8,
    gap: 10,
  },
  skeletonRow: {
    height: 72,
    borderRadius: 16,
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
