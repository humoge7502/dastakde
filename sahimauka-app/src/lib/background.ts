import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { processFeedAlerts } from "@/lib/alerts";
import { loadFeed } from "@/lib/feed";

const TASK_NAME = "dastakde-feed-refresh";

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      const result = await loadFeed({ force: true });
      if (result.items.length === 0) {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
      await processFeedAlerts(result.items);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/**
 * Android/iOS best-effort periodic refresh. The OS chooses the exact run
 * time; Android typically honours the 2-hour floor we request. Foreground
 * refresh on app resume remains the reliable path.
 */
export async function registerBackgroundRefresh(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 120,
    });
    return true;
  } catch {
    return false;
  }
}
