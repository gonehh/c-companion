import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const STORAGE_KEY = "study-event-notification-ids";
const DISABLED_STORAGE_KEY = "study-event-notification-disabled-ids";
const ANDROID_CHANNEL_ID = "study-reminders";

export interface StudyEventNotification {
  id: string;
  event_date: string;
  event_time: string;
  content: string;
}

type NotificationMap = Record<string, string>;

async function readDisabledIds() {
  if (!notificationsSupported()) return [] as string[];

  try {
    const raw = await AsyncStorage.getItem(DISABLED_STORAGE_KEY);
    if (!raw) return [] as string[];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
}

async function writeDisabledIds(ids: string[]) {
  if (!notificationsSupported()) return;

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    await AsyncStorage.removeItem(DISABLED_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(DISABLED_STORAGE_KEY, JSON.stringify(uniqueIds));
}

function notificationsSupported() {
  return Platform.OS !== "web";
}

function getEventDate(event: StudyEventNotification) {
  const date = new Date(`${event.event_date}T${event.event_time}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readNotificationMap() {
  if (!notificationsSupported()) return {} as NotificationMap;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as NotificationMap;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {} as NotificationMap;
    return parsed as NotificationMap;
  } catch {
    return {} as NotificationMap;
  }
}

async function writeNotificationMap(map: NotificationMap) {
  if (!notificationsSupported()) return;

  if (Object.keys(map).length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Przypomnienia o nauce",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

async function scheduleEventNotification(event: StudyEventNotification) {
  const date = getEventDate(event);
  if (!date || date.getTime() <= Date.now()) return null;

  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === "android"
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: ANDROID_CHANNEL_ID,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Przypomnienie o nauce",
      body: event.content,
      sound: true,
      data: {
        eventId: event.id,
        eventDate: event.event_date,
        eventTime: event.event_time,
      },
    },
    trigger,
  });
}

export async function ensureLocalNotificationPermissions() {
  if (!notificationsSupported()) return false;

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function syncStudyEventNotifications(events: StudyEventNotification[]) {
  if (!notificationsSupported()) return;

  const granted = await ensureLocalNotificationPermissions();
  const storedMap = await readNotificationMap();
  const disabledIds = new Set(await readDisabledIds());
  const nextMap: NotificationMap = { ...storedMap };
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const validEventIds = new Set(events.map((event) => event.id));

  await writeDisabledIds([...disabledIds].filter((eventId) => validEventIds.has(eventId)));

  for (const [eventId, notificationId] of Object.entries(storedMap)) {
    const event = eventsById.get(eventId);
    const eventDate = event ? getEventDate(event) : null;

    if (!event || !eventDate || eventDate.getTime() <= Date.now() || disabledIds.has(eventId)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        // Ignore stale notification ids; the local cache will be corrected below.
      }
      delete nextMap[eventId];
    }
  }

  if (!granted) {
    await writeNotificationMap(nextMap);
    return;
  }

  for (const event of events) {
    const eventDate = getEventDate(event);
    if (!eventDate || eventDate.getTime() <= Date.now() || nextMap[event.id] || disabledIds.has(event.id)) continue;

    const notificationId = await scheduleEventNotification(event);
    if (notificationId) nextMap[event.id] = notificationId;
  }

  await writeNotificationMap(nextMap);
}

export async function clearScheduledStudyNotifications() {
  if (!notificationsSupported()) return;

  const storedMap = await readNotificationMap();
  for (const notificationId of Object.values(storedMap)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
      // Ignore invalid ids and continue cleaning up the rest.
    }
  }

  await writeNotificationMap({});
}

export async function getDisabledStudyEventIds(events?: StudyEventNotification[]) {
  const disabledIds = await readDisabledIds();
  if (!events) return disabledIds;

  const validEventIds = new Set(events.map((event) => event.id));
  const filteredIds = disabledIds.filter((eventId) => validEventIds.has(eventId));
  if (filteredIds.length !== disabledIds.length) await writeDisabledIds(filteredIds);
  return filteredIds;
}

export async function toggleStudyEventNotificationEnabled(event: StudyEventNotification, enabled: boolean) {
  if (!notificationsSupported()) return enabled;

  const disabledIds = new Set(await readDisabledIds());
  const notificationMap = await readNotificationMap();

  if (enabled) disabledIds.delete(event.id);
  else disabledIds.add(event.id);

  const existingNotificationId = notificationMap[event.id];
  if (!enabled && existingNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingNotificationId);
    } catch {
      // Ignore invalid ids and just update local state below.
    }
    delete notificationMap[event.id];
    await writeNotificationMap(notificationMap);
  }

  if (enabled) {
    const granted = await ensureLocalNotificationPermissions();
    const eventDate = getEventDate(event);

    if (granted && eventDate && eventDate.getTime() > Date.now() && !notificationMap[event.id]) {
      const notificationId = await scheduleEventNotification(event);
      if (notificationId) {
        notificationMap[event.id] = notificationId;
        await writeNotificationMap(notificationMap);
      }
    }
  }

  await writeDisabledIds([...disabledIds]);
  return enabled;
}
