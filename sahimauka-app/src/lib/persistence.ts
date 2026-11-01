import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "./store-core";

/**
 * App-local persistence: saved items, tracked categories, tour state.
 * Nothing here ever leaves the device (see privacy.html).
 */

const KEYS = {
  saved: "saved.ids.v1",
  tracked: "tracked.cats.v1",
  tourSeen: "tour.seen.v2",
};

export type SavedItemMeta = { id: string; saved_at: string; deadline: string | null };

const savedStore = create<SavedItemMeta[]>(KEYS.saved, []);
const trackedStore = create<string[]>(KEYS.tracked, [
  "hackathons",
  "internships",
  "scholarships",
  "fellowships",
  "exams",
  "schemes",
]);
const tourStore = create<boolean>(KEYS.tourSeen, false);

export const useSaved = () => savedStore.hook();
export const useTracked = () => trackedStore.hook();
export const useTourSeen = () => tourStore.hook();
export const tourActions = { markSeen: () => tourStore.set(true) };

export async function getTourSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.tourSeen)) === "true";
  } catch {
    return false;
  }
}

export async function toggleSaved(meta: SavedItemMeta): Promise<void> {
  const cur = await AsyncStorage.getItem(KEYS.saved);
  const list: SavedItemMeta[] = cur ? JSON.parse(cur) : [];
  const next = list.some((x) => x.id === meta.id)
    ? list.filter((x) => x.id !== meta.id)
    : [...list, meta];
  await AsyncStorage.setItem(KEYS.saved, JSON.stringify(next));
  savedStore.refresh();
}

export async function isSaved(id: string): Promise<boolean> {
  const cur = await AsyncStorage.getItem(KEYS.saved);
  const list: SavedItemMeta[] = cur ? JSON.parse(cur) : [];
  return list.some((x) => x.id === id);
}

export async function toggleTracked(cat: string): Promise<void> {
  const cur = await AsyncStorage.getItem(KEYS.tracked);
  const list: string[] = cur ? JSON.parse(cur) : [];
  const next = list.includes(cat) ? list.filter((x) => x !== cat) : [...list, cat];
  await AsyncStorage.setItem(KEYS.tracked, JSON.stringify(next));
  trackedStore.refresh();
}
