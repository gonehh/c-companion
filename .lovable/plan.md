## Cel

Przerobić istniejącą webową aplikację (TanStack Start + React DOM) na natywną aplikację mobilną w **Expo SDK 54 (najnowsza)** z React Native, tak aby można było ją zainstalować na telefonie (Android `.apk` / iOS przez TestFlight lub Expo Go w trakcie developmentu).

## Ważna uwaga

Lovable to środowisko webowe — w podglądzie (preview) zobaczysz wersję uruchomioną przez **Expo Web** (React Native Web), a do prawdziwej instalacji mobilnej użyjesz:
- **Expo Go** (najszybciej — skanujesz QR i aplikacja działa natychmiast na telefonie),
- lub **EAS Build** dla finalnego `.apk` / `.aab` / `.ipa` do publikacji.

Funkcje przeglądarkowe (Web Notification API używane w kalendarzu) muszą zostać zastąpione natywnymi (`expo-notifications`).

## Zakres zmian

### 1. Reset stacku projektu
- Usunięcie webowego stacku: TanStack Start, TanStack Router, Vite, Tailwind v4, shadcn/ui, `src/routes/*`, `wrangler.jsonc`, `src/server.ts`, `src/start.ts`.
- Inicjalizacja Expo SDK 54 (React Native 0.81, React 19) z TypeScript i **expo-router v6** (nawigacja file-based, najbliższa obecnej strukturze).

### 2. Nowa struktura nawigacji (expo-router)
```text
app/
  _layout.tsx              # root + AuthProvider + SafeArea
  (auth)/
    login.tsx              # ekran logowania/rejestracji
  (tabs)/
    _layout.tsx            # 3 dolne zakładki
    courses.tsx            # Kursy (lista poziomów + quizy)
    profile.tsx            # Profil (medale, statystyki)
    calendar.tsx           # Kalendarz nauki + AI
```

### 3. Warstwa UI
- Komponenty `shadcn/ui` (web only) zastąpione natywnymi z **`react-native`** + biblioteki:
  - `react-native-paper` lub `tamagui` dla spójnych komponentów (proponuję **react-native-paper** — prostsze, oficjalnie wspiera Expo),
  - `expo-linear-gradient` (tła i akcenty fioletowe),
  - `@expo/vector-icons` zamiast `lucide-react`.
- Motyw szaro-fioletowo-czarny przeniesiony do jednego `theme.ts` (kolory, typografia, spacing) — zamiast Tailwind/CSS variables.
- Duże dotykowe komponenty, czytelna typografia (≥ 16 px) — UI przyjazne dla każdej grupy wiekowej.

### 4. Logika biznesowa (zachowana 1:1)
- `src/lib/cppCourse.ts` (100 poziomów × 4 ścieżki, quizy co 10 poziomów) — przenosimy bez zmian.
- `src/lib/medals.ts` (Brąz/Srebro/Złoto/Diament/Obsydian) — bez zmian.
- Ankieta poziomu (SkillSurvey) → ekran natywny.

### 5. Backend (Lovable Cloud / Supabase)
- Zachowujemy obecną bazę: `profiles`, `level_progress`, `quiz_attempts`, `study_events` (już istnieją z RLS).
- Klient: `@supabase/supabase-js` + `@react-native-async-storage/async-storage` jako `auth.storage` (zamiast `localStorage`).
- Logowanie/rejestracja przez nick + hasło (jak dziś).
- Usuwamy `createServerFn` i wszystkie pliki `*.functions.ts` / `*.server.ts` — w Expo nie ma serwera; zapytania idą wprost z klienta do Supabase z RLS.

### 6. Funkcja AI w kalendarzu
- Obecne `/api/public/ai-plan` zostaje jako **publiczny endpoint** (Supabase Edge Function lub mały Worker) wywoływany z aplikacji przez `fetch` — bo `LOVABLE_API_KEY` nie może trafić do bundla mobilnego.
- W aplikacji: wpis użytkownika → `fetch(...)` → odpowiedź AI → propozycja sesji nauki → zapis w `study_events`.

### 7. Powiadomienia
- `expo-notifications` zamiast `Notification` API:
  - prośba o uprawnienia przy pierwszym dodaniu wydarzenia,
  - `scheduleNotificationAsync` na wybraną datę + godzinę,
  - na Androidzie automatyczny kanał „nauka".
- Kalendarz: prosty widok miesięczny (`react-native-calendars`) + lista wydarzeń dnia.

### 8. Instalacja na telefonie
Po wygenerowaniu projektu dostaniesz dwie ścieżki:
- **Tryb deweloperski (natychmiast):** zainstaluj aplikację **Expo Go** ze sklepu, w terminalu wystartujesz `npx expo start`, zeskanujesz QR — apka działa na telefonie.
- **Plik instalacyjny (`.apk` na Androida lub `.ipa` na iOS):** komendą `eas build -p android --profile preview` — wymaga darmowego konta na expo.dev. Po buildzie pobierasz `.apk` i instalujesz bezpośrednio na telefonie.

Dokumentacja kroków zostanie umieszczona w `README.md`.

## Co znika z projektu

- `src/routes/`, `src/routeTree.gen.ts`, `src/router.tsx`, `src/server.ts`, `src/start.ts`
- `vite.config.ts`, `wrangler.jsonc`, `bunfig.toml`
- `src/styles.css`, cały `src/components/ui/*` (shadcn web)
- `src/integrations/supabase/client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `client.ts` (zostaje **nowa** wersja klienta dla RN)
- pakiety: TanStack Start/Router/Query (zostaje React Query), Tailwind, Radix UI, Lucide, wszystkie `@tanstack/react-start*`

## Co dochodzi (kluczowe zależności)

- `expo` `~54`, `expo-router` `~6`, `react-native` `0.81`, `expo-notifications`, `expo-linear-gradient`, `expo-status-bar`, `expo-constants`, `expo-secure-store`
- `react-native-paper`, `react-native-safe-area-context`, `react-native-screens`, `react-native-gesture-handler`
- `react-native-calendars`
- `@react-native-async-storage/async-storage`
- `@supabase/supabase-js` (już jest)

## Ryzyka / kompromisy

- **Preview w Lovable** pokaże wersję webową przez React Native Web — niektóre natywne efekty (powiadomienia push, haptyka) zadziałają dopiero na Expo Go / buildzie. To normalne dla każdego projektu Expo.
- Pełne przepisanie UI — wszystkie komponenty z `src/components/*.tsx` (oparte na DOM + Tailwind) trzeba napisać od nowa w React Native. Logika i schemat DB bez zmian.
- Brak własnego serwera (TanStack server fns) — endpoint AI musi pozostać publiczny z walidacją po stronie serwera.

## Pytanie przed implementacją

Czy potwierdzasz pełną wymianę stacku web → Expo (akceptujesz, że istniejący wygląd webowy zostanie zastąpiony natywnym UI w tej samej palecie szaro-fioletowo-czarnej)? Po Twoim "tak" wejdę w tryb build i wygeneruję cały projekt Expo + instrukcję instalacji na telefonie.
