import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const STORAGE_KEY = "study-event-notification-ids";
const ANDROID_CHANNEL_ID = "study-reminders";

export interface StudyEventNotification {
  id: string;
  event_date: string;
  event_time: string;
  content: string;
}

type NotificationMap = Record<string, string>;

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
  const nextMap: NotificationMap = { ...storedMap };
  const eventsById = new Map(events.map((event) => [event.id, event]));

  for (const [eventId, notificationId] of Object.entries(storedMap)) {
    const event = eventsById.get(eventId);
    const eventDate = event ? getEventDate(event) : null;

    if (!event || !eventDate || eventDate.getTime() <= Date.now()) {
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
    if (!eventDate || eventDate.getTime() <= Date.now() || nextMap[event.id]) continue;

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
