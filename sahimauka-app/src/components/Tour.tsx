import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants";
import { getTourSeen, tourActions } from "@/lib/persistence";

type IconName = ComponentProps<typeof Feather>["name"];

type Step = {
  icon: IconName;
  title: string;
  body: string;
  tip?: string;
  route: string | null;
};

const STEPS: Step[] = [
  {
    icon: "shield",
    title: "Verified, not forwarded",
    body: "DastakDe reads official sources — Devpost, Devfolio, NTA, CBSE, PIB and government portals. Only real listings make it in.",
    tip: "Every card names its source and opens the official page.",
    route: "/(tabs)",
  },
  {
    icon: "sliders",
    title: "Find your kind of opportunity",
    body: "Tap a category or search by title and organisation. Hackathons, internships, scholarships, fellowships, exams and schemes live in one feed.",
    tip: "The chips at the top of Home filter instantly.",
    route: "/(tabs)",
  },
  {
    icon: "clock",
    title: "Catch every deadline",
    body: "This tab groups what is closing this week and this month. Items marked “Dates on portal” need a quick check on the official site.",
    tip: "Open an item and tap Remind me for D-7, D-3, D-1 and day-of alerts.",
    route: "/(tabs)/deadlines",
  },
  {
    icon: "bookmark",
    title: "Build your shortlist",
    body: "Save anything worth a second look. Your saved list, reminders and preferences stay on this device — no account needed.",
    tip: "Bookmark from any card, then find it here.",
    route: "/(tabs)/saved",
  },
  {
    icon: "bell",
    title: "Stay ahead automatically",
    body: "Turn on new-opportunity alerts and a daily digest. DastakDe checks the feed in the background and refreshes when you return.",
    tip: "You can also replay this tour, watch the demo and inspect every source here.",
    route: "/(tabs)/more",
  },
  {
    icon: "check-circle",
    title: "You're ready to knock",
    body: "Start with one category you care about. Save it, set a reminder, and open the official page when you are ready to apply.",
    tip: "No accounts, no fake listings, no pay-to-apply traps.",
    route: null,
  },
];

type TourContextValue = {
  active: boolean;
  step: number;
  total: number;
  start: () => void;
  finish: () => void;
  next: () => void;
  back: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const autoStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void getTourSeen().then((seen) => {
        if (cancelled || seen || autoStarted.current) return;
        autoStarted.current = true;
        setStep(0);
        setActive(true);
      });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const route = STEPS[step]?.route;
    if (route) router.navigate(route as Href);
  }, [active, step, router]);

  const finish = useCallback(() => {
    setActive(false);
    void tourActions.markSeen();
  }, []);

  const finishHome = useCallback(() => {
    finish();
    router.navigate("/(tabs)" as Href);
  }, [finish, router]);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      setActive(false);
      void tourActions.markSeen();
      router.navigate("/(tabs)" as Href);
      return;
    }
    setStep(step + 1);
  }, [step, router]);

  const back = useCallback(() => {
    setStep((current) => Math.max(0, current - 1));
  }, []);

  const value: TourContextValue = {
    active,
    step,
    total: STEPS.length,
    start,
    finish,
    next,
    back,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourOverlay />
    </TourContext.Provider>
  );
}

function TourOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { active, step, total, finish, next, back } = useTour();
  const spec = STEPS[step];
  const isLast = step === total - 1;

  const skip = () => {
    finish();
    router.navigate("/(tabs)" as Href);
  };

  const watchDemo = () => {
    finish();
    router.navigate("/(tabs)/more?play=1" as Href);
  };

  return (
    <Modal
      visible={active}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={skip}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              Guided tour · {step + 1} of {total}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={skip} hitSlop={12}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.spacer} />

        <View
          style={[
            styles.card,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={styles.iconWrap}>
            <Feather name={spec.icon} size={24} color={COLORS.accent} />
          </View>
          <Text style={styles.title}>{spec.title}</Text>
          <Text style={styles.body}>{spec.body}</Text>

          {spec.tip ? (
            <View style={styles.tipRow}>
              <Feather name="map-pin" size={14} color={COLORS.accent2} />
              <Text style={styles.tipText}>{spec.tip}</Text>
            </View>
          ) : null}

          <View style={styles.dotsRow}>
            {STEPS.map((s, i) => (
              <View
                key={s.title}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            {step > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={back}
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={next}
              style={({ pressed }) => [
                styles.nextBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.nextText}>
                {isLast ? "Start exploring" : "Next"}
              </Text>
              <Feather
                name={isLast ? "arrow-right" : "chevron-right"}
                size={17}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {isLast ? (
            <Pressable
              accessibilityRole="button"
              onPress={watchDemo}
              style={({ pressed }) => [styles.demoBtn, pressed && styles.pressed]}
            >
              <Feather name="play-circle" size={16} color={COLORS.accent} />
              <Text style={styles.demoText}>Watch the 30-second demo</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(25, 16, 51, 0.58)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  progressPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  skip: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    padding: 8,
  },
  spacer: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.ink,
    lineHeight: 28,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.inkSoft,
  },
  tipRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: COLORS.accent2Soft,
    borderRadius: 12,
    padding: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.inkSoft,
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.line,
  },
  dotActive: {
    width: 22,
    backgroundColor: COLORS.accent,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.chipIdle,
  },
  backText: {
    color: COLORS.ink,
    fontWeight: "700",
    fontSize: 15,
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  nextText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
  },
  demoText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
});
