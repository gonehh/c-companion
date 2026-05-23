import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, Text, Pressable, ScrollView, Vibration, PanResponder } from "react-native";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Trash2, Bell } from "lucide-react-native";
import Constants from "expo-constants";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  clearPendingSnoozeRequest,
  ensureLocalNotificationPermissions,
  getPendingSnoozeRequest,
  getDisabledStudyEventIds,
  type PendingSnoozeRequest,
  scheduleSnoozedNotificationAt,
  subscribeToPendingSnoozeRequest,
  syncStudyEventNotifications,
  toggleStudyEventNotificationEnabled,
} from "@/lib/notifications";
import { toast } from "@/components/ui/toast";
import { useScreenLayout } from "@/lib/responsive";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  event_date: string;
  event_time: string;
  content: string;
}

const PL_DAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const PL_MONTHS = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
];

export function CalendarTab() {
  const { user } = useAuth();
  const { padding, maxWidth } = useScreenLayout();
  const [events, setEvents] = useState<Event[]>([]);
  const [cursor, setCursor] = useState(new Date());
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAi, setOpenAi] = useState(false);
  const [openClearAll, setOpenClearAll] = useState(false);
  const [openDeleteOne, setOpenDeleteOne] = useState(false);
  const [openSnoozePrompt, setOpenSnoozePrompt] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [deletingOne, setDeletingOne] = useState(false);
  const [snoozing, setSnoozing] = useState(false);
  const [previewDateKey, setPreviewDateKey] = useState<string | null>(null);
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<Event | null>(null);
  const [pendingSnoozeRequest, setPendingSnoozeRequest] = useState<PendingSnoozeRequest | null>(null);
  const [snoozeDate, setSnoozeDate] = useState(() => getDefaultSnoozeSelection().date);
  const [snoozeTime, setSnoozeTime] = useState(() => getDefaultSnoozeSelection().time);
  const [disabledNotificationIds, setDisabledNotificationIds] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(Platform.OS === "web");
  const notifiedRef = useRef<Set<string>>(new Set());
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("study_events")
      .select("*")
      .eq("user_id", user.id)
      .order("event_date")
      .order("event_time");
    setEvents((data ?? []) as Event[]);
  };
  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    if (!user || Platform.OS === "web") {
      setNotificationsEnabled(Platform.OS === "web");
      return;
    }

    ensureLocalNotificationPermissions()
      .then((granted) => {
        if (!cancelled) setNotificationsEnabled(granted);
      })
      .catch(() => {
        if (!cancelled) setNotificationsEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const disabledNotificationSet = useMemo(() => new Set(disabledNotificationIds), [disabledNotificationIds]);

  useEffect(() => {
    const sent = notifiedRef.current;
    const t = setInterval(() => {
      const now = new Date();
      events.forEach((e) => {
        if (disabledNotificationSet.has(e.id)) return;
        const dt = new Date(`${e.event_date}T${e.event_time}`);
        const diff = dt.getTime() - now.getTime();
        if (diff <= 0 && diff > -60_000 && !sent.has(e.id)) {
          sent.add(e.id);
          toast.info(`Czas nauki: ${e.content}`);
        }
      });
    }, 30_000);
    return () => clearInterval(t);
  }, [disabledNotificationSet, events]);

  useEffect(() => {
    if (!user || !notificationsEnabled) return;

    syncStudyEventNotifications(events).catch((error) => {
      console.error("Nie udalo sie zsynchronizowac powiadomien lokalnych", error);
    });
  }, [events, notificationsEnabled, user]);

  useEffect(() => {
    if (!user || Platform.OS === "web") {
      setDisabledNotificationIds([]);
      return;
    }

    getDisabledStudyEventIds(events)
      .then((ids) => setDisabledNotificationIds(ids))
      .catch(() => setDisabledNotificationIds([]));
  }, [events, user]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let active = true;

    const openPrompt = (request: PendingSnoozeRequest | null) => {
      if (!request || !active) return;

      const defaultSnoozeSelection = getDefaultSnoozeSelection();
      setPendingSnoozeRequest(request);
      setSnoozeDate(defaultSnoozeSelection.date);
      setSnoozeTime(defaultSnoozeSelection.time);
      setOpenSnoozePrompt(true);
      clearPendingSnoozeRequest().catch(() => {
        // Ignore cleanup failures; the prompt is already visible to the user.
      });
    };

    getPendingSnoozeRequest()
      .then((request) => openPrompt(request))
      .catch(() => {
        // Ignore read failures; the listener below still handles fresh taps.
      });

    const unsubscribe = subscribeToPendingSnoozeRequest((request) => {
      openPrompt(request);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [startWeekday, daysInMonth]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, Event[]>();
    events.forEach((e) => {
      m.set(e.event_date, [...(m.get(e.event_date) ?? []), e]);
    });
    return m;
  }, [events]);

  const dateKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();

  const deleteEvent = async () => {
    if (!pendingDeleteEvent) return;

    setDeletingOne(true);
    const { error } = await supabase.from("study_events").delete().eq("id", pendingDeleteEvent.id);
    setDeletingOne(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    notifiedRef.current.delete(pendingDeleteEvent.id);
    setOpenDeleteOne(false);
    setPendingDeleteEvent(null);
    toast.success("Usunięto przypomnienie");
    load();
  };

  const deleteAllEvents = async () => {
    if (!user || events.length === 0) return;

    setClearingAll(true);
    const { error } = await supabase.from("study_events").delete().eq("user_id", user.id);
    setClearingAll(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    notifiedRef.current.clear();
    setOpenClearAll(false);
    toast.success("Usunięto wszystkie przypomnienia");
    load();
  };

  useEffect(() => {
    setPreviewDateKey(null);
  }, [cursor]);

  useEffect(() => {
    setExpandedReminderId((current) => (current && !events.some((event) => event.id === current) ? null : current));
  }, [events]);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const shiftMonth = useCallback((delta: number) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setPreviewDateKey(null);
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }, []);

  const calendarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 14 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) < 50 || Math.abs(gestureState.dx) < Math.abs(gestureState.dy)) {
            return;
          }

          shiftMonth(gestureState.dx < 0 ? 1 : -1);
        },
        onPanResponderTerminate: () => {
          if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current);
            previewTimeoutRef.current = null;
          }
          setPreviewDateKey(null);
        },
      }),
    [shiftMonth],
  );

  const handleReminderPress = (event: Event) => {
    setEditingEvent(event);
    setOpenEdit(true);
  };

  const handleNotificationToggle = async (event: Event) => {
    Vibration.vibrate(10);

    const nextEnabled = disabledNotificationSet.has(event.id);
    const enabled = await toggleStudyEventNotificationEnabled(event, nextEnabled);

    setDisabledNotificationIds((current) =>
      enabled ? current.filter((id) => id !== event.id) : [...new Set([...current, event.id])],
    );

    if (enabled) {
      notifiedRef.current.delete(event.id);
      toast.success("Włączono powiadomienie");
    } else {
      notifiedRef.current.delete(event.id);
      toast.info("Wyłączono powiadomienie");
    }
  };

  const handleSnoozeSubmit = async () => {
    if (!pendingSnoozeRequest) return;

    const selectedDate = parseISODate(snoozeDate);
    const selectedTime = parseTimeValue(snoozeTime);

    if (!selectedDate || !selectedTime) {
      toast.error("Wybierz poprawną datę i godzinę");
      return;
    }

    const nextDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0,
    );

    if (nextDate.getTime() <= Date.now()) {
      toast.error("Wybierz termin późniejszy niż teraz");
      return;
    }

    setSnoozing(true);
    const notificationId = await scheduleSnoozedNotificationAt(pendingSnoozeRequest, nextDate);
    setSnoozing(false);

    if (!notificationId) {
      toast.error("Nie udało się przełożyć powiadomienia");
      return;
    }

    setOpenSnoozePrompt(false);
    setPendingSnoozeRequest(null);
    toast.success(`Przełożono powiadomienie na ${formatDate(snoozeDate)} o ${snoozeTime}`);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      contentContainerStyle={{ padding, paddingBottom: padding * 2 }}
    >
      <View className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => shiftMonth(-1)}
            className="rounded-lg p-2 active:bg-secondary"
          >
            <ChevronLeft color="#f0ecf2" size={20} />
          </Pressable>
          <Text className="text-lg font-bold capitalize text-foreground">
            {PL_MONTHS[month]} {year}
          </Text>
          <Pressable
            onPress={() => shiftMonth(1)}
            className="rounded-lg p-2 active:bg-secondary"
          >
            <ChevronRight color="#f0ecf2" size={20} />
          </Pressable>
        </View>

        <View className="mb-1 flex-row">
          {PL_DAYS.map((d) => (
            <View key={d} style={{ flex: 1 }} className="py-1">
              <Text className="text-center text-xs text-muted-foreground">{d}</Text>
            </View>
          ))}
        </View>
        <View className="mb-5 flex-row flex-wrap" {...calendarPanResponder.panHandlers}>
          {grid.map((d, i) => {
            if (!d) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }} />;
            const k = dateKey(d);
            const dayEvents = eventsByDate.get(k) ?? [];
            const has = dayEvents.length > 0;
            const isToday = k === todayKey;
            const isPreviewOpen = previewDateKey === k;
            return (
              <View
                key={i}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2, zIndex: isPreviewOpen ? 30 : 1 }}
              >
                <Pressable
                  onPressIn={() => {
                    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
                    previewTimeoutRef.current = setTimeout(() => {
                      setPreviewDateKey(k);
                    }, 250);
                  }}
                  onPressOut={() => {
                    if (previewTimeoutRef.current) {
                      clearTimeout(previewTimeoutRef.current);
                      previewTimeoutRef.current = null;
                    }
                    setPreviewDateKey((current) => (current === k ? null : current));
                  }}
                  className="flex-1"
                >
                  {isPreviewOpen && (
                    <View
                      className="absolute rounded-xl border border-border bg-card px-3 py-2"
                      style={{
                        bottom: "100%",
                        left: "50%",
                        width: 170,
                        marginBottom: 8,
                        transform: [{ translateX: -85 }],
                        zIndex: 40,
                      }}
                    >
                      <Text className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {has ? "Zaplanowane na" : "Brak zaplanowanej nauki"}
                      </Text>
                      <Text className="mt-1 text-xs font-semibold text-foreground">{formatDate(k)}</Text>
                      {has ? (
                        <View className="mt-2 gap-1">
                          {dayEvents.map((event) => (
                            <View key={event.id} className="rounded-lg bg-secondary px-2 py-1.5">
                              <Text className="text-[11px] font-semibold text-foreground">
                                Godzina: {event.event_time.slice(0, 5)}
                              </Text>
                              <Text numberOfLines={1} ellipsizeMode="tail" className="text-[11px] text-muted-foreground">
                                {event.content}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text className="mt-2 text-[11px] text-muted-foreground">
                          Nie masz zaplanowanej nauki na ten dzień.
                        </Text>
                      )}
                    </View>
                  )}
                  <View
                  className={cn(
                    "flex-1 items-center justify-center rounded-lg border",
                    isToday ? "border-primary bg-primary/10" : "border-border bg-card",
                  )}
                  >
                    <Text className="text-sm font-semibold text-foreground">{d}</Text>
                    {has && <View className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent" />}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View className="mb-4 flex-row gap-2">
          <Button className="flex-1" onPress={() => setOpenAdd(true)}>
            <Plus color="#fafafa" size={16} />
            <Text className="text-sm font-semibold text-primary-foreground">Dodaj</Text>
          </Button>
          <Button variant="secondary" className="flex-1" onPress={() => setOpenAi(true)}>
            <Sparkles color="#f0ecf2" size={16} />
            <Text className="text-sm font-semibold text-secondary-foreground">Pomocnik AI</Text>
          </Button>
        </View>

        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="font-bold text-foreground">Nadchodzące przypomnienia</Text>
          <Button
            variant="outline"
            size="sm"
            onPress={() => setOpenClearAll(true)}
            disabled={events.length === 0}
          >
            <Trash2 color="#a89fb5" size={14} />
            <Text className="text-sm font-semibold text-foreground">Usuń wszystkie</Text>
          </Button>
        </View>
        <View className="gap-2">
          {events.length === 0 && (
            <View className="rounded-xl border border-border bg-card p-4">
              <Text className="text-sm text-muted-foreground">
                Brak zaplanowanej nauki. Dodaj termin lub poproś o plan AI.
              </Text>
            </View>
          )}
          {events.map((e) => (
            <View key={e.id} className="flex-row items-start gap-3 rounded-xl border border-border bg-card p-3">
              <Pressable
                onPress={() => handleNotificationToggle(e)}
                className="relative h-10 w-10 items-center justify-center"
              >
                <Bell color={disabledNotificationSet.has(e.id) ? "#a89fb5" : "#a173e8"} size={18} />
                {disabledNotificationSet.has(e.id) && (
                  <View
                    className="absolute h-0.5 w-6 rounded-full bg-destructive"
                    style={{ transform: [{ rotate: "38deg" }] }}
                  />
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setExpandedReminderId((current) => (current === e.id ? null : e.id));
                }}
                onLongPress={() => handleReminderPress(e)}
                delayLongPress={180}
                className="flex-1 flex-row items-start gap-3"
              >
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {formatDate(e.event_date)} • {e.event_time.slice(0, 5)}
                  </Text>
                  <Text
                    numberOfLines={expandedReminderId === e.id ? undefined : 1}
                    ellipsizeMode="tail"
                    className="text-sm text-muted-foreground"
                  >
                    {e.content}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPendingDeleteEvent(e);
                  setOpenDeleteOne(true);
                }}
                className="h-10 w-10 items-center justify-center rounded-full bg-destructive active:opacity-80"
              >
                <Trash2 color="#fafafa" size={18} />
              </Pressable>
            </View>
          ))}
        </View>

        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <AddEventDialogBody
            onAdded={() => {
              setOpenAdd(false);
              load();
            }}
          />
        </Dialog>

        <Dialog
          open={openSnoozePrompt}
          onOpenChange={(open) => {
            setOpenSnoozePrompt(open);
            if (!open && !snoozing) setPendingSnoozeRequest(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Przełożyć powiadomienie?</DialogTitle>
            </DialogHeader>
            <View className="gap-3">
              <Text className="text-sm text-muted-foreground">
                {pendingSnoozeRequest?.content
                  ? `Powiadomienie dotyczy: ${pendingSnoozeRequest.content}`
                  : "Czy chcesz przełożyć to powiadomienie?"}
              </Text>
              <DatePickerField label="Data" value={snoozeDate} onChange={setSnoozeDate} />
              <TimePickerField label="Godzina" value={snoozeTime} onChange={setSnoozeTime} />
              <View className="flex-row gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onPress={() => {
                    const defaultSnoozeSelection = getDefaultSnoozeSelection();
                    setOpenSnoozePrompt(false);
                    setPendingSnoozeRequest(null);
                    setSnoozeDate(defaultSnoozeSelection.date);
                    setSnoozeTime(defaultSnoozeSelection.time);
                  }}
                  disabled={snoozing}
                >
                  Anuluj
                </Button>
                <Button
                  className="flex-1"
                  onPress={handleSnoozeSubmit}
                  loading={snoozing}
                  disabled={snoozing || !pendingSnoozeRequest}
                >
                  Przełóż
                </Button>
              </View>
            </View>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openEdit}
          onOpenChange={(open) => {
            setOpenEdit(open);
            if (!open) setEditingEvent(null);
          }}
        >
          {editingEvent ? (
            <EditEventDialogBody
              event={editingEvent}
              onCanceled={() => {
                setOpenEdit(false);
                setEditingEvent(null);
              }}
              onSaved={() => {
                setOpenEdit(false);
                setEditingEvent(null);
                load();
              }}
            />
          ) : null}
        </Dialog>

        <Dialog open={openAi} onOpenChange={setOpenAi}>
          <AiPlannerDialogBody
            onPlanned={() => {
              setOpenAi(false);
              load();
            }}
          />
        </Dialog>

        <Dialog
          open={openDeleteOne}
          onOpenChange={(open) => {
            setOpenDeleteOne(open);
            if (!open && !deletingOne) setPendingDeleteEvent(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Usunąć przypomnienie?</DialogTitle>
            </DialogHeader>
            <View className="gap-3">
              <Text className="text-sm text-muted-foreground">
                {pendingDeleteEvent
                  ? `Ta operacja usunie przypomnienie z dnia ${formatDate(pendingDeleteEvent.event_date)} o ${pendingDeleteEvent.event_time.slice(0, 5)}.`
                  : "Ta operacja usunie wybrane przypomnienie z kalendarza."}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onPress={() => {
                    setOpenDeleteOne(false);
                    setPendingDeleteEvent(null);
                  }}
                  disabled={deletingOne}
                >
                  Nie usuwaj
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onPress={deleteEvent}
                  loading={deletingOne}
                  disabled={deletingOne || !pendingDeleteEvent}
                >
                  Usuń
                </Button>
              </View>
            </View>
          </DialogContent>
        </Dialog>

        <Dialog open={openClearAll} onOpenChange={setOpenClearAll}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Usunąć wszystkie przypomnienia?</DialogTitle>
            </DialogHeader>
            <View className="gap-3">
              <Text className="text-sm text-muted-foreground">
                Ta operacja usunie wszystkie zaplanowane przypomnienia z kalendarza.
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onPress={() => setOpenClearAll(false)}
                  disabled={clearingAll}
                >
                  Nie usuwaj
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onPress={deleteAllEvents}
                  loading={clearingAll}
                  disabled={clearingAll}
                >
                  Usuń wszystkie
                </Button>
              </View>
            </View>
          </DialogContent>
        </Dialog>
      </View>
    </ScrollView>
  );
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return `${String(day).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function parseISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeValue(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatISODateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDefaultSnoozeSelection() {
  const date = new Date(Date.now() + 10 * 60_000);
  return {
    date: formatISODateValue(date),
    time: formatTimeValue(date),
  };
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseISODate(value) ?? new Date());
  const selectedDate = parseISODate(value) ?? new Date();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = todayISO();
  const selectedKey = value;

  const grid = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [daysInMonth, startWeekday]);

  useEffect(() => {
    if (!open) setCursor(parseISODate(value) ?? new Date());
  }, [open, value]);

  const selectDate = (day: number) => {
    const nextValue = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <View>
      <Label>{label}</Label>
      <Pressable
        onPress={() => {
          setCursor(selectedDate);
          setOpen(true);
        }}
        className="mt-1 rounded-md border border-input bg-background px-3 py-3 active:opacity-80"
      >
        <Text className="text-sm text-foreground">{formatDate(value)}</Text>
      </Pressable>

      <Dialog open={open} onOpenChange={setOpen} scrollEnabled={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wybierz datę</DialogTitle>
          </DialogHeader>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setCursor(new Date(year, month - 1, 1))}
                className="rounded-lg p-2 active:bg-secondary"
              >
                <ChevronLeft color="#f0ecf2" size={20} />
              </Pressable>

              <Text className="text-base font-bold capitalize text-foreground">
                {PL_MONTHS[month]} {year}
              </Text>

              <Pressable
                onPress={() => setCursor(new Date(year, month + 1, 1))}
                className="rounded-lg p-2 active:bg-secondary"
              >
                <ChevronRight color="#f0ecf2" size={20} />
              </Pressable>
            </View>

            <View className="flex-row">
              {PL_DAYS.map((day) => (
                <View key={day} style={{ flex: 1 }} className="py-1">
                  <Text className="text-center text-xs text-muted-foreground">{day}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {grid.map((day, index) => {
                if (!day) return <View key={index} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }} />;

                const currentKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = currentKey === todayKey;
                const isSelected = currentKey === selectedKey;

                return (
                  <View key={index} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                    <Pressable
                      onPress={() => selectDate(day)}
                      className={cn(
                        "flex-1 items-center justify-center rounded-lg border",
                        isSelected
                          ? "border-primary bg-primary"
                          : isToday
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-semibold",
                          isSelected ? "text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Button variant="secondary" onPress={() => setOpen(false)}>
              Anuluj
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
}

function TimePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tempTime, setTempTime] = useState(() => parseTimeValue(value) ?? parseTimeValue("18:00") ?? new Date());

  useEffect(() => {
    if (!open) setTempTime(parseTimeValue(value) ?? parseTimeValue("18:00") ?? new Date());
  }, [open, value]);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }

    if (selectedDate) setTempTime(selectedDate);
  };

  if (Platform.OS === "web") {
    return (
      <View>
        <Label>{label}</Label>
        <Input value={value} onChangeText={onChange} placeholder="18:00" autoCapitalize="none" />
      </View>
    );
  }

  return (
    <View>
      <Label>{label}</Label>
      <Pressable
        onPress={() => setOpen(true)}
        className="mt-1 rounded-md border border-input bg-background px-3 py-3 active:opacity-80"
      >
        <Text className="text-sm text-foreground">{value}</Text>
      </Pressable>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wybierz godzinę</DialogTitle>
          </DialogHeader>

          <View className="gap-3">
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              onChange={handleChange}
              {...(Platform.OS === "ios" ? { textColor: "#f0ecf2", themeVariant: "dark" as const } : {})}
            />

            <View className="flex-row gap-2">
              <Button variant="secondary" className="flex-1" onPress={() => setOpen(false)}>
                Anuluj
              </Button>
              <Button
                className="flex-1"
                onPress={() => {
                  onChange(formatTimeValue(tempTime));
                  setOpen(false);
                }}
              >
                Wybierz
              </Button>
            </View>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
}

function getLocalApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (Platform.OS === "web") {
    const host =
      typeof window !== "undefined" && typeof window.location?.hostname === "string"
        ? window.location.hostname
        : "localhost";
    return `http://${host}:8787`;
  }

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants as any)?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
  const host = typeof hostUri === "string" ? hostUri.split(":")[0] : null;

  if (host) {
    const effectiveHost = Platform.OS === "android" && host === "localhost" ? "10.0.2.2" : host;
    return `http://${effectiveHost}:8787`;
  }

  if (Platform.OS === "android") return "http://10.0.2.2:8787";
  return "http://localhost:8787";
}

function AddEventDialogBody({ onAdded }: { onAdded: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("18:00");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user || !content.trim()) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Data musi być w formacie RRRR-MM-DD");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      toast.error("Godzina musi być w formacie HH:MM");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("study_events").insert({
      user_id: user.id,
      event_date: date,
      event_time: time,
      content: content.trim(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Dodano przypomnienie");
      onAdded();
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nowy termin nauki</DialogTitle>
      </DialogHeader>
      <View className="gap-3">
        <DatePickerField label="Data" value={date} onChange={setDate} />
        <TimePickerField label="Godzina" value={time} onChange={setTime} />
        <View>
          <Label>Treść</Label>
          <Textarea value={content} onChangeText={setContent} placeholder="Np. powtórka pętli for" />
        </View>
        <Button onPress={save} loading={busy} disabled={busy || !content.trim()}>
          Zapisz
        </Button>
      </View>
    </DialogContent>
  );
}

function EditEventDialogBody({
  event,
  onCanceled,
  onSaved,
}: {
  event: Event;
  onCanceled: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(event.event_date);
  const [time, setTime] = useState(event.event_time.slice(0, 5));
  const [content, setContent] = useState(event.content);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDate(event.event_date);
    setTime(event.event_time.slice(0, 5));
    setContent(event.content);
  }, [event]);

  const save = async () => {
    if (!content.trim()) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Data musi być w formacie RRRR-MM-DD");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      toast.error("Godzina musi być w formacie HH:MM");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("study_events")
      .update({
        event_date: date,
        event_time: time,
        content: content.trim(),
      })
      .eq("id", event.id);
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Zaktualizowano przypomnienie");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edytuj termin nauki</DialogTitle>
      </DialogHeader>
      <View className="gap-3">
        <DatePickerField label="Data" value={date} onChange={setDate} />
        <TimePickerField label="Godzina" value={time} onChange={setTime} />
        <View>
          <Label>Treść</Label>
          <Textarea value={content} onChangeText={setContent} placeholder="Np. powtórka pętli for" />
        </View>
        <View className="flex-row gap-2">
          <Button variant="secondary" className="flex-1" onPress={onCanceled} disabled={busy}>
            Anuluj
          </Button>
          <Button className="flex-1" onPress={save} loading={busy} disabled={busy || !content.trim()}>
            Zakończ edycję
          </Button>
        </View>
      </View>
    </DialogContent>
  );
}

function AiPlannerDialogBody({ onPlanned }: { onPlanned: () => void }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(
    "Chcę uczyć się 30 minut dziennie, wieczorem w dni powszednie przez najbliższy tydzień.",
  );
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [proposals, setProposals] = useState<{ date: string; time: string; content: string }[]>([]);

  const ask = async () => {
    setBusy(true);
    setReply("");
    setProposals([]);
    try {
      const base = getLocalApiBaseUrl();
      const planUrl = base ? `${base}/api/ai/plan` : "/api/ai/plan";

      const resp = await fetch(planUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const raw = await resp.text();
      if (!resp.ok) {
        let errorMessage = "Błąd AI";
        try {
          const parsed = JSON.parse(raw);
          const parts = [parsed?.error, parsed?.details].filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          );
          if (parts.length > 0) errorMessage = parts.join(": ");
        } catch {
          errorMessage =
            resp.status === 429 ? "Za dużo prób, spróbuj za chwilę." : `Błąd AI: ${raw || resp.status}`;
        }

        toast.error(errorMessage);
        return;
      }

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        const hint = raw.trim().toLowerCase().startsWith("<!doctype") || raw.trim().startsWith("<html");
        toast.error("Błąd AI (niepoprawna odpowiedź): " + (hint ? "HTML" : raw));
        return;
      }
      setReply(data?.message ?? "");
      setProposals(data?.events ?? []);
    } catch (e: any) {
      toast.error("Błąd AI: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!user) return;
    const rows = proposals.map((p) => ({
      user_id: user.id,
      event_date: p.date,
      event_time: p.time,
      content: p.content,
    }));
    const { error } = await supabase.from("study_events").insert(rows);
    if (error) toast.error(error.message);
    else {
      toast.success("Dodano plan nauki");
      onPlanned();
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Pomocnik AI</DialogTitle>
      </DialogHeader>
      <View className="gap-3">
        <Label>Powiedz, kiedy chcesz się uczyć</Label>
        <Textarea value={prompt} onChangeText={setPrompt} numberOfLines={4} />
        <Button onPress={ask} loading={busy} disabled={busy}>
          <Sparkles color="#fafafa" size={16} />
          <Text className="text-sm font-semibold text-primary-foreground">
            {busy ? "Myślę..." : "Zaproponuj plan"}
          </Text>
        </Button>
        {!!reply && (
          <View className="rounded-lg bg-secondary p-3">
            <Text className="text-sm text-foreground">{reply}</Text>
          </View>
        )}
        {proposals.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Propozycje ({proposals.length}):
            </Text>
            {proposals.map((p, i) => (
              <View key={i} className="rounded border border-border bg-card p-2">
                <Text className="text-xs text-foreground">
                  <Text className="font-bold">
                    {p.date} {p.time}
                  </Text>{" "}
                  — {p.content}
                </Text>
              </View>
            ))}
            <Button onPress={accept}>Zapisz w kalendarzu</Button>
          </View>
        )}
      </View>
    </DialogContent>
  );
}
