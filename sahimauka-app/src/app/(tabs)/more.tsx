import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import { openBrowserAsync } from "expo-web-browser";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { useTour } from "@/components/Tour";
import {
  BRAND,
  BUSINESS_MODEL_URL,
  CATEGORIES,
  COLLEGES_URL,
  COLORS,
  GITHUB_REPO,
  ORGANIZERS_URL,
  PRIVACY_URL,
  SITE_BASE,
} from "@/constants";
import {
  setDigestEnabled,
  setNewAlertsEnabled,
  useDigest,
  useNewAlerts,
} from "@/lib/alerts";
import { toggleTracked, useTracked } from "@/lib/persistence";
import { ensurePermission, listScheduled } from "@/lib/reminders";
import { useFeed } from "@/lib/use-feed";

const DEMO_VIDEO_URI = `${SITE_BASE}/media/demo.mp4`;
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

type PermissionState = "checking" | "off" | "granted" | "blocked";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

async function openUrl(url: string): Promise<void> {
  try {
    await openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => {
      // Nothing more we can do without a browser.
    });
  }
}

function relativeAge(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function MoreScreen() {
  const { start } = useTour();
  const params = useLocalSearchParams<{ play?: string }>();
  const [tracked] = useTracked();
  const [newAlerts, setNewAlerts] = useNewAlerts();
  const [digest, setDigest] = useDigest();
  const { items, index, refreshing, refresh } = useFeed();

  const [permission, setPermission] = useState<PermissionState>("checking");
  const [scheduledReminders, setScheduledReminders] = useState(0);
  const [testSent, setTestSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [showVideo, setShowVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const player = useVideoPlayer(showVideo ? DEMO_VIDEO_URI : null, (p) => {
    p.addListener("statusChange", (s) => {
      if (s.error) setVideoFailed(true);
    });
  });

  useEffect(() => {
    if (params.play === "1") setShowVideo(true);
  }, [params.play]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await Notifications.getPermissionsAsync();
      if (!cancelled) {
        setPermission(
          status.granted ? "granted" : status.canAskAgain ? "off" : "blocked"
        );
      }
      const ids = await listScheduled();
      if (!cancelled) {
        setScheduledReminders(ids.filter((id) => id.startsWith("rem-")).length);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sourceSummary = useMemo(() => {
    if (!index) return null;
    const entries = Object.entries(index.sources);
    return {
      ok: entries.filter(([, s]) => s.status === "ok").length,
      total: entries.length,
      entries,
    };
  }, [index]);

  const refreshNotifications = async () => {
    const ids = await listScheduled();
    setScheduledReminders(ids.filter((id) => id.startsWith("rem-")).length);
  };

  const refreshPermission = async () => {
    const status = await Notifications.getPermissionsAsync();
    setPermission(
      status.granted ? "granted" : status.canAskAgain ? "off" : "blocked"
    );
    return status.granted;
  };

  const onToggleNewAlerts = async (next: boolean) => {
    setNotice(null);
    const ok = await setNewAlertsEnabled(next);
    setNewAlerts(ok);
    await refreshPermission();
    if (next && !ok) {
      setNotice(
        "Android is blocking notifications. Open system settings to allow DastakDe alerts."
      );
    }
  };

  const onToggleDigest = async (next: boolean) => {
    setNotice(null);
    const ok = await setDigestEnabled(next, items);
    setDigest(ok);
    await refreshPermission();
    if (next && !ok) {
      setNotice(
        "Android is blocking notifications. Open system settings to allow the digest."
      );
    }
  };

  const sendTest = async () => {
    const ok = await ensurePermission();
    await refreshPermission();
    if (!ok) {
      setNotice(
        "Notifications are blocked. Allow them in system settings, then try again."
      );
      return;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: "test-notification",
      content: {
        title: `${BRAND.name} test notification`,
        body: "This is what a deadline reminder or new-opportunity alert looks like.",
      },
      trigger: null,
    });
    setTestSent(true);
    await refreshNotifications();
  };

  const permissionLabel =
    permission === "granted"
      ? "Allowed"
      : permission === "blocked"
        ? "Blocked in system settings"
        : permission === "off"
          ? "Not enabled yet"
          : "Checking…";

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <View style={styles.brandCard}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>D</Text>
          <View style={styles.brandDot} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brand}>{BRAND.name}</Text>
          <Text style={styles.tagline}>{BRAND.tagline}</Text>
          <Text style={styles.taglineEn}>{BRAND.taglineEn}</Text>
        </View>
      </View>

      <Section title="Never miss a knock">
        <Text style={styles.body}>
          New-opportunity alerts fire when a fresh verified listing appears.
          The daily digest arrives at 9:00 with what is closing this week.
          Delivery depends on Android battery settings.
        </Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>New opportunity alerts</Text>
            <Text style={styles.toggleNote}>
              Checked on refresh and in the background
            </Text>
          </View>
          <Switch
            value={newAlerts}
            onValueChange={(v) => {
              void onToggleNewAlerts(v);
            }}
            trackColor={{ false: COLORS.line, true: COLORS.accent }}
            thumbColor="#FFFFFF"
            accessibilityLabel="New opportunity alerts"
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Daily 9:00 digest</Text>
            <Text style={styles.toggleNote}>One calm summary, not a stream</Text>
          </View>
          <Switch
            value={digest}
            onValueChange={(v) => {
              void onToggleDigest(v);
            }}
            trackColor={{ false: COLORS.line, true: COLORS.accent }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Daily digest"
          />
        </View>

        <View style={styles.permissionRow}>
          <Feather
            name={
              permission === "granted"
                ? "check-circle"
                : permission === "blocked"
                  ? "x-circle"
                  : "info"
            }
            size={13}
            color={permission === "granted" ? COLORS.ok : COLORS.accent2}
          />
          <Text style={styles.permissionText}>
            Notification permission: {permissionLabel}
          </Text>
        </View>

        {notice ? <Text style={styles.warning}>{notice}</Text> : null}

        <View style={styles.inlineActions}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.smallBtn,
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void sendTest();
            }}
          >
            <Feather name="bell" size={14} color={COLORS.accent} />
            <Text style={styles.secondaryBtnText}>Send a test</Text>
          </Pressable>
          {permission !== "granted" ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.smallBtn,
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                void Linking.openSettings();
              }}
            >
              <Feather name="settings" size={14} color={COLORS.accent} />
              <Text style={styles.secondaryBtnText}>System settings</Text>
            </Pressable>
          ) : null}
        </View>
        {testSent ? (
          <Text style={styles.okNote}>Sent — check your notification shade.</Text>
        ) : null}

        <Text style={styles.subtle}>
          {scheduledReminders === 0
            ? "No deadline reminders scheduled yet. Open an opportunity and tap Remind me."
            : `${scheduledReminders} deadline reminder${scheduledReminders === 1 ? "" : "s"} scheduled on this device.`}
        </Text>
      </Section>

      <Section title="See it in action">
        <Text style={styles.body}>
          A short, real walkthrough of the feed, deadlines, saved list and
          alerts. No mock-ups of fake listings.
        </Text>
        {showVideo && !videoFailed ? (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
          />
        ) : null}
        {videoFailed ? (
          <Text style={styles.warning}>
            The video could not load. It is also available on the website.
          </Text>
        ) : null}
        <View style={styles.inlineActions}>
          {!showVideo ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.smallBtn,
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => setShowVideo(true)}
            >
              <Feather name="play" size={14} color={COLORS.accent} />
              <Text style={styles.secondaryBtnText}>Play the demo</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.smallBtn,
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                player.play();
              }}
            >
              <Feather name="play" size={14} color={COLORS.accent} />
              <Text style={styles.secondaryBtnText}>Play again</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.smallBtn,
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={start}
          >
            <Feather name="map" size={14} color={COLORS.accent} />
            <Text style={styles.secondaryBtnText}>Replay guided tour</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Alert categories">
        <Text style={styles.body}>
          Choose which categories can trigger a new-opportunity alert. With none
          selected, every category alerts.
        </Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.filter((c) => c.key !== "all").map((c) => {
            const active = tracked.includes(c.key);
            return (
              <Pressable
                key={c.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  void toggleTracked(c.key);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.emoji} {c.label} {active ? "✓" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Live feed status">
        <Text style={styles.body}>
          {index
            ? `${index.total} verified items · generated ${relativeAge(index.generated_at)}`
            : "Waiting for the first sync."}
        </Text>
        {sourceSummary ? (
          <>
            <Text style={styles.subtle}>
              {sourceSummary.ok}/{sourceSummary.total} sources healthy
            </Text>
            <View style={styles.sourceList}>
              {sourceSummary.entries.map(([key, s]) => (
                <View key={key} style={styles.sourceRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          s.status === "ok" ? COLORS.ok : COLORS.accent2,
                      },
                    ]}
                  />
                  <Text style={styles.sourceName} numberOfLines={1}>
                    {s.label ?? key}
                  </Text>
                  <Text style={styles.sourceCount}>
                    {s.status === "ok" ? `${s.items} items` : s.status}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          style={({ pressed }) => [
            styles.smallBtn,
            styles.secondaryBtn,
            pressed && styles.pressed,
            refreshing && styles.disabled,
          ]}
          onPress={() => {
            void refresh();
          }}
        >
          <Feather name="refresh-cw" size={14} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>
            {refreshing ? "Refreshing…" : "Refresh now"}
          </Text>
        </Pressable>
        <Text style={styles.subtle}>
          The public feed is rebuilt every 2 hours from official sources. A
          failing source contributes nothing — never filler.
        </Text>
      </Section>

      <Section title="About">
        <Text style={styles.body}>
          Free for students. Every listing links to its official source and
          shows the evidence. Saves, reminders and preferences stay on this
          device — no account, no student data sold.
        </Text>
        <Text style={styles.body}>
          DastakDe is built for verified discovery, not pay-to-apply listings.
          Organisations can read the transparent posting model in the business
          plan.
        </Text>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.button,
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void openUrl(BUSINESS_MODEL_URL);
          }}
        >
          <Feather name="file-text" size={15} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Business model</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.button,
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void openUrl(ORGANIZERS_URL);
          }}
        >
          <Feather name="briefcase" size={15} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>List an opportunity</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.button,
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void openUrl(COLLEGES_URL);
          }}
        >
          <Feather name="users" size={15} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>College plan</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.button,
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void openUrl(PRIVACY_URL);
          }}
        >
          <Feather name="shield" size={15} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Privacy policy</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.button,
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void openUrl(GITHUB_REPO);
          }}
        >
          <Feather name="github" size={15} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Open-source repository</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void openUrl(SITE_BASE);
          }}
        >
          <Feather name="globe" size={15} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Open the DastakDe website</Text>
        </Pressable>
        <Text style={styles.version}>Version {APP_VERSION}</Text>
      </Section>
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
    gap: 10,
  },
  brandCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.ink,
    borderRadius: 18,
    padding: 16,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  brandDot: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent2,
  },
  brandText: {
    flex: 1,
    gap: 2,
  },
  brand: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: 13,
    color: COLORS.accent2,
    fontWeight: "700",
  },
  taglineEn: {
    fontSize: 11,
    color: "#CFC6E6",
  },
  section: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.ink,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
  },
  subtle: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  toggleNote: {
    fontSize: 11,
    color: COLORS.muted,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.chipIdle,
    borderRadius: 8,
    padding: 8,
  },
  permissionText: {
    fontSize: 11,
    color: COLORS.inkSoft,
    fontWeight: "600",
    flex: 1,
  },
  warning: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.accent2,
    fontWeight: "600",
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  secondaryBtn: {
    backgroundColor: COLORS.accentSoft,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  okNote: {
    fontSize: 12,
    color: COLORS.ok,
    fontWeight: "600",
  },
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: "#000000",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.chipIdle,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  sourceList: {
    gap: 4,
    backgroundColor: COLORS.chipIdle,
    borderRadius: 10,
    padding: 10,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceName: {
    flex: 1,
    fontSize: 11,
    color: COLORS.inkSoft,
  },
  sourceCount: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
  },
  version: {
    fontSize: 11,
    color: COLORS.muted,
  },
});
