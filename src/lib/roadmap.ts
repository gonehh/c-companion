import { type Track } from "@/lib/cppCourse";

export type RoadmapTrack = Track;

export type RoadmapLesson = {
  id: string;
  title: string;
  body: string;
  example?: string;
  question?: RoadmapQuestion;
};

export type RoadmapQuestion = {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
};

export type RoadmapQuiz = {
  id: string;
  title: string;
  questions: RoadmapQuestion[];
  xpOnPass: number;
};

export type RoadmapExam = {
  id: string;
  title: string;
  questions: RoadmapQuestion[];
  xpPerCorrect: number;
};

export type RoadmapStage = {
  id: string;
  title: string;
  track: RoadmapTrack;
  lessons: RoadmapLesson[];
  quiz: RoadmapQuiz;
  exam?: RoadmapExam;
};

type LessonBlueprint = {
  title: string;
  body: string;
  example?: string;
  question: RoadmapQuestion;
};

type StageBlueprint = {
  title: string;
  lessons: LessonBlueprint[];
  quizXp?: number;
  examXp?: number;
};

const TARGET_LESSONS_PER_STAGE = 5;

const q = (prompt: string, options: string[], answer: number, explain?: string): RoadmapQuestion => ({
  q: prompt,
  options,
  answer,
  explain,
});

function createPracticeLesson(base: LessonBlueprint, round: number): LessonBlueprint {
  return {
    title: `${base.title} - praktyka ${round}`,
    body: `${base.body} W tym poziomie utrwalasz temat na krótkim zadaniu praktycznym i sprawdzasz, czy potrafisz zastosowac go samodzielnie.`,
    example: base.example,
    question: {
      q: `Powtorka: ${base.question.q}`,
      options: base.question.options,
      answer: base.question.answer,
      explain: base.question.explain,
    },
  };
}

function ensureFiveLessons(lessons: LessonBlueprint[]) {
  if (lessons.length >= TARGET_LESSONS_PER_STAGE) {
    return lessons.slice(0, TARGET_LESSONS_PER_STAGE);
  }

  const normalized = [...lessons];
  let extraIndex = 0;
  while (normalized.length < TARGET_LESSONS_PER_STAGE) {
    const base = lessons[extraIndex % lessons.length]!;
    const round = Math.floor(extraIndex / lessons.length) + 1;
    normalized.push(createPracticeLesson(base, round));
    extraIndex += 1;
  }

  return normalized;
}

function buildCourse(track: RoadmapTrack, stages: StageBlueprint[]): RoadmapStage[] {
  return stages.map((stage, stageIndex) => {
    const stageId = `${track}-stage-${stageIndex + 1}`;
    const stageLessons = ensureFiveLessons(stage.lessons);
    const lessons = stageLessons.map((lesson, lessonIndex) => ({
      id: `${track}-s${stageIndex + 1}-l${lessonIndex + 1}`,
      title: `${stageIndex + 1}.${lessonIndex + 1} · ${lesson.title}`,
      body: lesson.body,
      example: lesson.example,
      question: lesson.question,
    }));
    const questions = lessons
      .map((lesson) => lesson.question)
      .filter((question): question is RoadmapQuestion => Boolean(question));

    return {
      id: stageId,
      title: stage.title,
      track,
      lessons,
      quiz: {
        id: `${stageId}-quiz`,
        title: `Mini quiz · ${stage.title}`,
        questions,
        xpOnPass: stage.quizXp ?? 10,
      },
      exam: {
        id: `${stageId}-exam`,
        title: `Egzamin · ${stage.title}`,
        questions,
        xpPerCorrect: stage.examXp ?? 6,
      },
    };
  });
}

export const ROADMAPS: Record<RoadmapTrack, RoadmapStage[]> = {
  beginner: buildCourse("beginner", [
    {
      title: "Start z C++",
      lessons: [
        {
          title: "Środowisko i kompilator",
          body:
            "Na początku potrzebujesz edytora i kompilatora. Kompilator zamienia kod źródłowy na działający program, a terminal pozwala go uruchomić i zobaczyć wynik.",
          question: q("Co robi kompilator?", ["Tłumaczy kod na program", "Projektuje interfejs", "Łączy się z bazą danych"], 0),
        },
        {
          title: "Funkcja main()",
          body:
            "Każdy prosty program w C++ zaczyna działanie od funkcji main(). To punkt wejścia, od którego komputer zaczyna wykonywać instrukcje.",
          example: "int main() {\n  return 0;\n}",
          question: q("Od jakiej funkcji startuje program w C++?", ["start()", "main()", "run()"], 1),
        },
        {
          title: "Wypisywanie i wczytywanie",
          body:
            "`std::cout` wypisuje dane na ekran, a `std::cin` pobiera je od użytkownika. To podstawa pierwszych programów konsolowych.",
          example:
            '#include <iostream>\n\nint main() {\n  int age;\n  std::cin >> age;\n  std::cout << age;\n  return 0;\n}',
          question: q("Który obiekt służy do wypisywania danych?", ["std::cout", "std::cin", "std::getline"], 0),
        },
      ],
    },
    {
      title: "Zmienne i typy",
      lessons: [
        {
          title: "Typy proste",
          body:
            "`int` trzyma liczby całkowite, `double` liczby z częścią dziesiętną, `char` pojedynczy znak, a `bool` wartość prawda lub fałsz. Typ mówi kompilatorowi, jak traktować daną zmienną.",
          example: "int age = 21;\ndouble pi = 3.14;\nbool ok = true;",
          question: q("Który typ najlepiej przechowuje 3.14?", ["int", "double", "bool"], 1),
        },
        {
          title: "Zmienne i przypisanie",
          body:
            "Zmienna to nazwane miejsce w pamięci. Możesz nadać jej wartość przy deklaracji albo później, używając operatora `=`.",
          example: "int points = 10;\npoints = 15;",
          question: q("Co robi operator `=`?", ["Porównuje", "Przypisuje wartość", "Usuwa zmienną"], 1),
        },
        {
          title: "Tekst i getline",
          body:
            "Do tekstu używa się `std::string`. Jeśli chcesz wczytać całą linię z odstępami, zamiast `>>` użyj `std::getline`.",
          example: '#include <string>\n\nstd::string name;\nstd::getline(std::cin, name);',
          question: q("Która funkcja wczytuje całą linię tekstu?", ["std::getline", "std::cin >>", "std::cout <<"], 0),
        },
      ],
    },
    {
      title: "Podejmowanie decyzji",
      lessons: [
        {
          title: "if i else",
          body:
            "Instrukcja `if` wykonuje kod tylko wtedy, gdy warunek jest prawdziwy. `else` uruchamia blok zapasowy, gdy warunek okaże się fałszywy.",
          example: "if (score >= 50) {\n  std::cout << \"OK\";\n} else {\n  std::cout << \"Powtórz\";\n}",
          question: q("Kiedy wykona się blok `else`?", ["Zawsze", "Gdy warunek z `if` jest fałszywy", "Tylko przy liczbach ujemnych"], 1),
        },
        {
          title: "Porównania",
          body:
            "`==` porównuje równość, `!=` nierówność, a `<`, `>`, `<=`, `>=` służą do porównań liczbowych. To częsty punkt pomyłek na początku nauki.",
          question: q("Który operator sprawdza równość?", ["=", "==", ":="], 1),
        },
        {
          title: "Operatory logiczne",
          body:
            "`&&` oznacza AND, `||` oznacza OR, a `!` negację. Pozwalają łączyć kilka warunków w jedną decyzję programu.",
          example: "if (age >= 18 && hasTicket) {\n  // wejście\n}",
          question: q("Co oznacza operator `&&`?", ["OR", "AND", "NOT"], 1),
        },
      ],
    },
    {
      title: "Pętle w praktyce",
      lessons: [
        {
          title: "Pętla while",
          body:
            "`while` wykonuje się tak długo, jak długo warunek pozostaje prawdziwy. Dobrze nadaje się do sytuacji, gdy nie znasz liczby powtórzeń z góry.",
          example: "int i = 0;\nwhile (i < 3) {\n  i++;\n}",
          question: q("Kiedy kończy się pętla `while`?", ["Gdy warunek stanie się fałszywy", "Po jednej iteracji", "Nigdy"], 0),
        },
        {
          title: "Pętla for",
          body:
            "`for` jest wygodne, gdy znasz liczbę iteracji. W nagłówku ma trzy części: start, warunek i krok zmiany licznika.",
          example: "for (int i = 0; i < 5; i++) {\n  std::cout << i;\n}",
          question: q("Ile części ma nagłówek `for`?", ["1", "2", "3"], 2),
        },
        {
          title: "Licznik i akumulacja",
          body:
            "W pętlach często używa się licznika i zmiennej sumującej. To podstawa prostych zadań, jak zliczanie elementów albo suma liczb.",
          example: "int sum = 0;\nfor (int i = 1; i <= 3; i++) {\n  sum += i;\n}",
          question: q("Do czego zwykle służy zapis `sum += i`?", ["Do dodawania kolejnych wartości do sumy", "Do resetowania zmiennej", "Do kończenia pętli"], 0),
        },
      ],
    },
    {
      title: "Pierwsze większe programy",
      lessons: [
        {
          title: "Funkcje",
          body:
            "Funkcja pozwala wydzielić fragment logiki pod własną nazwą. Dzięki temu program jest czytelniejszy i łatwiejszy do rozwijania.",
          example: "int add(int a, int b) {\n  return a + b;\n}",
          question: q("Po co tworzy się funkcje?", ["Aby dzielić kod na mniejsze części", "Aby zawsze przyspieszyć program", "Aby zastąpić `main()`"], 0),
        },
        {
          title: "Tablice",
          body:
            "Tablica przechowuje wiele wartości tego samego typu pod jedną nazwą. Indeksy w C++ zaczynają się od zera.",
          example: "int nums[3] = {10, 20, 30};\nstd::cout << nums[0];",
          question: q("Od jakiego indeksu zaczyna się tablica w C++?", ["0", "1", "-1"], 0),
        },
        {
          title: "Debugowanie podstaw",
          body:
            "Na końcu początkującej ścieżki warto nauczyć się czytać błędy kompilacji i sprawdzać wartości krok po kroku. To skraca czas szukania prostych pomyłek.",
          question: q("Co najbardziej pomaga znaleźć prosty błąd początkującego?", ["Czytanie komunikatu kompilatora", "Usuwanie losowych linii kodu", "Zmiana nazwy pliku"], 0),
        },
      ],
      quizXp: 12,
      examXp: 7,
    },
  ]),
  basic: buildCourse("basic", [
    {
      title: "Powtórka i porządek w kodzie",
      lessons: [
        {
          title: "Stałe i czytelne deklaracje",
          body:
            "Na tym poziomie warto od początku pisać czytelniej. `const` zabezpiecza dane przed przypadkową zmianą, a dobre nazwy zmiennych ułatwiają rozwijanie programu.",
          example: "const int maxLives = 3;",
          question: q("Po co używa się `const`?", ["Żeby zablokować zmianę wartości", "Żeby przyspieszyć kompilację", "Żeby deklarować tylko pętle"], 0),
        },
        {
          title: "Scope i czas życia zmiennych",
          body:
            "Zmienne żyją tylko w swoim zakresie. To oznacza, że zmienna utworzona w bloku `if` albo pętli nie jest dostępna wszędzie w programie.",
          example: "if (true) {\n  int x = 5;\n}\n// x już tu nie istnieje",
          question: q("Co dzieje się ze zmienną po wyjściu z jej bloku?", ["Nadal istnieje", "Przestaje istnieć", "Zamienia się na zero"], 1),
        },
        {
          title: "Czytanie błędów kompilacji",
          body:
            "Programista średnio początkujący powinien umieć czytać komunikaty kompilatora i łączyć je z konkretną linią kodu. To skraca debugowanie bardziej niż zgadywanie.",
          question: q("Jaki jest najlepszy pierwszy krok po błędzie kompilacji?", ["Przeczytać komunikat i numer linii", "Usunąć pół pliku", "Zrestartować komputer"], 0),
        },
      ],
    },
    {
      title: "Praca na kolekcjach danych",
      lessons: [
        {
          title: "Tablice i indeksy",
          body:
            "Tablice nadal są ważne, ale na tym etapie trzeba rozumieć indeksy, długość oraz ryzyko wyjścia poza zakres. To częsta przyczyna trudnych błędów.",
          example: "int arr[3] = {2, 4, 6};\nstd::cout << arr[1];",
          question: q("Który indeks wskazuje drugi element tablicy?", ["0", "1", "2"], 1),
        },
        {
          title: "std::vector",
          body:
            "`std::vector` to wygodniejsza, dynamiczna tablica. Rozszerza się w trakcie działania programu i jest bezpieczniejsza w codziennej pracy niż zwykła tablica C.",
          example: "std::vector<int> nums = {1, 2};\nnums.push_back(3);",
          question: q("Co daje `std::vector` względem zwykłej tablicy?", ["Może zmieniać rozmiar", "Działa tylko w klasach", "Nie przechowuje liczb"], 0),
        },
        {
          title: "Iteracja po danych",
          body:
            "Zbieranie danych ma sens tylko wtedy, gdy umiesz po nich przejść. Do tego używa się klasycznego `for` albo wygodniejszego range-based `for`.",
          example: "for (int value : nums) {\n  std::cout << value;\n}",
          question: q("Do czego służy `for (int value : nums)`?", ["Do iteracji po elementach kolekcji", "Do tworzenia nowego wektora", "Do sortowania danych"], 0),
        },
      ],
    },
    {
      title: "Funkcje na serio",
      lessons: [
        {
          title: "Parametry i zwracanie wartości",
          body:
            "Funkcja przyjmuje parametry wejściowe i może zwracać wynik. Dobrze zaprojektowana funkcja robi jedną rzecz i ma jasny kontrakt wejścia oraz wyjścia.",
          example: "double avg(int a, int b) {\n  return (a + b) / 2.0;\n}",
          question: q("Co oznacza typ przed nazwą funkcji?", ["Typ zwracanej wartości", "Liczbę parametrów", "Nazwę pliku"], 0),
        },
        {
          title: "Przekazywanie przez referencję",
          body:
            "Referencja pozwala pracować na oryginalnej zmiennej bez kopiowania. To ważne, gdy chcesz zmienić argument lub uniknąć kosztownej kopii większych danych.",
          example: "void increment(int& x) {\n  x++;\n}",
          question: q("Co daje parametr `int& x`?", ["Pracę na oryginalnej zmiennej", "Tworzenie kopii", "Nowy typ liczby"], 0),
        },
        {
          title: "Przeciążanie funkcji",
          body:
            "Możesz mieć kilka funkcji o tej samej nazwie, jeśli różnią się listą parametrów. To pozwala zachować spójne API dla podobnych operacji.",
          example: "int add(int a, int b);\ndouble add(double a, double b);",
          question: q("Kiedy przeciążenie funkcji jest poprawne?", ["Gdy funkcje różnią się parametrami", "Gdy zmienia się tylko nazwa pliku", "Nigdy w C++"], 0),
        },
      ],
    },
    {
      title: "Struktury i podział programu",
      lessons: [
        {
          title: "struct jako własny typ",
          body:
            "`struct` pozwala połączyć kilka pól w jedną całość. To dobry krok pomiędzy prostymi zmiennymi a pełnym programowaniem obiektowym.",
          example: "struct Student {\n  std::string name;\n  int points;\n};",
          question: q("Po co używa się `struct`?", ["Do łączenia powiązanych danych", "Do zastąpienia każdej pętli", "Do ukrywania błędów kompilacji"], 0),
        },
        {
          title: "Pliki nagłówkowe",
          body:
            "Większy program dzieli się na pliki `.h` lub `.hpp` oraz `.cpp`. Dzięki temu kod jest uporządkowany i łatwiej rozwijać go etapami.",
          question: q("Po co dzieli się kod na nagłówki i pliki źródłowe?", ["Dla lepszej organizacji projektu", "Żeby uniknąć kompilacji", "Żeby nie pisać funkcji"], 0),
        },
        {
          title: "Guardy i #pragma once",
          body:
            "Nagłówek nie powinien być dołączany wielokrotnie bez ochrony. Do tego służy `#pragma once` albo klasyczne include guards.",
          example: "#pragma once",
          question: q("Co daje `#pragma once`?", ["Chroni nagłówek przed wielokrotnym dołączeniem", "Uruchamia program tylko raz", "Blokuje kompilator"], 0),
        },
      ],
    },
    {
      title: "Wskaźniki i praktyczne zadania",
      lessons: [
        {
          title: "Adres i operator &",
          body:
            "Wskaźniki zaczynają się od zrozumienia adresu w pamięci. Operator `&` pozwala pobrać adres zmiennej, a wskaźnik ten adres przechowuje.",
          example: "int value = 5;\nint* ptr = &value;",
          question: q("Co zwraca operator `&value`?", ["Adres zmiennej", "Jej kopię", "Jej typ"], 0),
        },
        {
          title: "Dereferencja",
          body:
            "Jeśli wskaźnik przechowuje adres, to operator `*` pozwala dostać się do wartości znajdującej się pod tym adresem. To kluczowa różnica między wskaźnikiem a referencją.",
          example: "std::cout << *ptr;",
          question: q("Co oznacza zapis `*ptr`?", ["Wartość pod adresem", "Adres wskaźnika", "Typ wskaźnika"], 0),
        },
        {
          title: "Mini projekt z danymi",
          body:
            "Na końcu ścieżki basic użytkownik powinien umieć złożyć mały program z funkcji, kolekcji i prostych typów własnych. To etap przejścia od ćwiczeń do mini aplikacji.",
          question: q("Które elementy warto połączyć w małym projekcie na tym poziomie?", ["Funkcje, kolekcje i własne typy", "Tylko jedną zmienną globalną", "Wyłącznie komentarze"], 0),
        },
      ],
      quizXp: 12,
      examXp: 7,
    },
  ]),
  intermediate: buildCourse("intermediate", [
    {
      title: "Referencje, wskaźniki i const",
      lessons: [
        {
          title: "Referencje kontra kopie",
          body:
            "Na poziomie intermediate trzeba już rozumieć koszt kopiowania danych. Referencje pozwalają przekazać obiekt bez tworzenia kopii i zachować czytelny zapis.",
          example: "void print(const std::string& name) {\n  std::cout << name;\n}",
          question: q("Po co przekazywać duży obiekt przez referencję?", ["Aby uniknąć kopiowania", "Aby zmienić jego typ", "Aby ukryć nazwę zmiennej"], 0),
        },
        {
          title: "const correctness",
          body:
            "`const` w funkcjach i referencjach dokumentuje intencję: dana wartość nie będzie modyfikowana. To ważny element bezpiecznego API w większym projekcie.",
          example: "void show(const std::vector<int>& values);",
          question: q("Co komunikuje `const std::vector<int>&`?", ["Że funkcja nie zmienia przekazanego obiektu", "Że obiekt jest lokalny", "Że funkcja zwraca wektor"], 0),
        },
        {
          title: "nullptr i bezpieczeństwo wskaźników",
          body:
            "Wskaźnik może nie wskazywać na nic. `nullptr` jest bezpiecznym sposobem reprezentacji pustego wskaźnika i zastąpił stare użycie `NULL` lub `0`.",
          example: "int* ptr = nullptr;",
          question: q("Czym jest `nullptr`?", ["Pustym wskaźnikiem", "Specjalnym typem liczby", "Nazwą biblioteki"], 0),
        },
      ],
    },
    {
      title: "Klasy i obiekty",
      lessons: [
        {
          title: "Projektowanie klasy",
          body:
            "Klasa łączy stan i zachowanie obiektu. Dzięki temu możesz modelować realne pojęcia, a nie tylko pracować na luźnych zmiennych i funkcjach.",
          example: "class User {\npublic:\n  std::string name;\n};",
          question: q("Czym najczęściej jest klasa w C++?", ["Własnym typem danych", "Komentarzem blokowym", "Makrem preprocesora"], 0),
        },
        {
          title: "Konstruktory",
          body:
            "Konstruktor nadaje obiektowi poprawny stan początkowy. Zamiast tworzyć obiekt i dopiero potem ustawiać pola, lepiej zainicjalizować je od razu.",
          example: "class Point {\npublic:\n  Point(int x, int y) : x_(x), y_(y) {}\nprivate:\n  int x_;\n  int y_;\n};",
          question: q("Kiedy uruchamia się konstruktor?", ["Przy tworzeniu obiektu", "Przy usuwaniu obiektu", "Po kompilacji"], 0),
        },
        {
          title: "Prywatne pola i enkapsulacja",
          body:
            "Dane obiektu nie zawsze powinny być publiczne. Prywatne pola pozwalają kontrolować dostęp i chronią klasę przed niepoprawnym użyciem.",
          question: q("Po co ukrywa się pola klasy jako `private`?", ["Aby kontrolować sposób dostępu do danych", "Aby przyspieszyć pętle", "Aby zablokować tworzenie obiektów"], 0),
        },
      ],
    },
    {
      title: "Dziedziczenie i polimorfizm",
      lessons: [
        {
          title: "Dziedziczenie",
          body:
            "Dziedziczenie pozwala zbudować klasę potomną na bazie klasy bazowej. Dzięki temu współdzielisz wspólne zachowania i rozszerzasz je tam, gdzie trzeba.",
          example: "class Dog : public Animal {};",
          question: q("Co oznacza zapis `class Dog : public Animal`?", ["Dog dziedziczy po Animal", "Dog tworzy wskaźnik na Animal", "Dog jest funkcją"], 0),
        },
        {
          title: "virtual i override",
          body:
            "Metody wirtualne pozwalają wywoływać właściwą implementację przez wskaźnik lub referencję do klasy bazowej. `override` zabezpiecza przed błędnym podpisem metody.",
          example: "class Animal {\npublic:\n  virtual void speak() const {}\n};",
          question: q("Po co używa się `override`?", ["Żeby kompilator sprawdził poprawne nadpisanie metody", "Żeby zamienić klasę w szablon", "Żeby ukryć metodę przed dziedziczeniem"], 0),
        },
        {
          title: "Klasy abstrakcyjne",
          body:
            "Jeśli metoda jest czysto wirtualna, klasa staje się abstrakcyjna i nie można tworzyć jej obiektów. To dobre narzędzie do projektowania wspólnych interfejsów.",
          example: "virtual void draw() = 0;",
          question: q("Czym jest klasa abstrakcyjna?", ["Klasą bez możliwości tworzenia instancji", "Klasą bez pól", "Klasą tylko dla STL"], 0),
        },
      ],
    },
    {
      title: "STL i algorytmy",
      lessons: [
        {
          title: "vector i iteratory",
          body:
            "Na tym etapie `std::vector` to nie tylko kontener, ale też obiekt współpracujący z algorytmami. Iteratory pozwalają ujednolicić pracę z różnymi strukturami danych.",
          question: q("Po co STL używa iteratorów?", ["Aby ujednolicić dostęp do elementów kontenerów", "Aby zastąpić klasy", "Aby ukryć rozmiar wektora"], 0),
        },
        {
          title: "std::map i dane skojarzone",
          body:
            "`std::map` przechowuje pary klucz-wartość i pozwala szybko znaleźć dane po kluczu. To bardzo częsty wzorzec w aplikacjach i narzędziach.",
          example: "std::map<std::string, int> scores;\nscores[\"Ala\"] = 10;",
          question: q("Co przechowuje `std::map`?", ["Pary klucz-wartość", "Tylko liczby", "Wyłącznie wskaźniki"], 0),
        },
        {
          title: "sort i find",
          body:
            "Zamiast ręcznie pisać wiele pętli, warto korzystać z gotowych algorytmów standardowych. `std::sort` i `std::find` rozwiązują typowe zadania czytelniej i pewniej.",
          example: "std::sort(nums.begin(), nums.end());",
          question: q("Jaką przewagę daje `std::sort`?", ["Pozwala sortować standardowo i czytelnie", "Działa tylko na tablicach C", "Nie potrzebuje iteratorów"], 0),
        },
      ],
    },
    {
      title: "Nowocześniejszy styl kodu",
      lessons: [
        {
          title: "auto i range-based for",
          body:
            "Nowoczesne C++ upraszcza składnię tam, gdzie typ wynika z kontekstu. `auto` i range-based `for` redukują szum bez utraty bezpieczeństwa typów.",
          example: "for (const auto& item : items) {\n  std::cout << item;\n}",
          question: q("Kiedy `auto` jest szczególnie przydatne?", ["Gdy typ jest oczywisty lub bardzo długi", "Tylko przy liczbach całkowitych", "Wyłącznie w makrach"], 0),
        },
        {
          title: "Lambdy",
          body:
            "Lambda to funkcja anonimowa tworzona w miejscu użycia. Świetnie sprawdza się przy krótkich operacjach przekazywanych do algorytmów STL.",
          example: "std::sort(nums.begin(), nums.end(), [](int a, int b) { return a > b; });",
          question: q("Po co często używa się lambd?", ["Do krótkich funkcji przekazywanych dalej", "Do zastępowania klas abstrakcyjnych", "Do definiowania nowych typów"], 0),
        },
        {
          title: "Mini architektura programu",
          body:
            "Kończąc poziom intermediate, użytkownik powinien umieć podzielić program na moduły, własne typy i funkcje wspierane przez STL. To baza pod bardziej zaawansowane wzorce.",
          question: q("Co najlepiej opisuje cel końca poziomu intermediate?", ["Świadome łączenie OOP, STL i modularnego kodu", "Pisanie tylko jednej funkcji main", "Unikanie własnych typów"], 0),
        },
      ],
      quizXp: 13,
      examXp: 8,
    },
  ]),
  advanced: buildCourse("advanced", [
    {
      title: "Nowoczesne API i semantyka wartości",
      lessons: [
        {
          title: "Rule of zero",
          body:
            "W nowoczesnym C++ często najlepiej projektować klasy tak, aby nie zarządzały ręcznie zasobami. Jeśli opierasz się na typach standardowych, kompilator często sam wygeneruje poprawne operacje specjalne.",
          question: q("Co sugeruje rule of zero?", ["Unikać ręcznego zarządzania zasobami, jeśli to możliwe", "Nigdy nie używać klas", "Tworzyć tylko funkcje globalne"], 0),
        },
        {
          title: "Move semantics",
          body:
            "Przenoszenie pozwala oddać zasób zamiast go kopiować. Dzięki temu operacje na dużych obiektach mogą być znacznie tańsze, szczególnie przy kontenerach i obiektach tymczasowych.",
          example: "std::string a = \"hello\";\nstd::string b = std::move(a);",
          question: q("Po co stosuje się `std::move`?", ["Aby umożliwić przeniesienie zasobu", "Aby zawsze skopiować obiekt", "Aby utworzyć referencję stałą"], 0),
        },
        {
          title: "Perfect forwarding - intuicja",
          body:
            "W bibliotekach i warstwach pośrednich ważne jest zachowanie kategorii wartości argumentu. Perfect forwarding pomaga przekazywać argumenty dalej bez niepotrzebnych kopii i bez zmiany semantyki.",
          question: q("Jaki problem rozwiązuje perfect forwarding?", ["Przekazywanie argumentów dalej bez utraty ich charakteru", "Sortowanie kontenerów", "Dziedziczenie wielokrotne"], 0),
        },
      ],
    },
    {
      title: "RAII i bezpieczne zasoby",
      lessons: [
        {
          title: "RAII w praktyce",
          body:
            "RAII wiąże czas życia zasobu z czasem życia obiektu. Dzięki temu pliki, mutexy czy pamięć są zwalniane automatycznie, gdy obiekt wychodzi z zakresu.",
          question: q("Co jest sednem RAII?", ["Zasób żyje razem z obiektem, który nim zarządza", "Każdy zasób zwalnia się ręcznie w losowym miejscu", "RAII dotyczy tylko klas abstrakcyjnych"], 0),
        },
        {
          title: "unique_ptr i shared_ptr",
          body:
            "Smart pointery pomagają bezpiecznie zarządzać dynamicznie tworzonymi obiektami. `unique_ptr` reprezentuje wyłączną własność, a `shared_ptr` współdzieloną.",
          example: "auto user = std::make_unique<User>();",
          question: q("Który smart pointer reprezentuje wyłączną własność?", ["std::unique_ptr", "std::shared_ptr", "std::weak_ptr"], 0),
        },
        {
          title: "weak_ptr i cykle referencji",
          body:
            "Gdy dwa obiekty trzymają `shared_ptr` do siebie nawzajem, może powstać wyciek przez cykl referencji. `weak_ptr` pozwala przerwać taki cykl bez przejmowania własności.",
          question: q("Po co używa się `std::weak_ptr`?", ["Aby obserwować obiekt bez współdzielenia własności", "Aby zastąpić każdą referencję", "Aby przyspieszyć kompilację"], 0),
        },
      ],
    },
    {
      title: "Szablony i generyczność",
      lessons: [
        {
          title: "Szablony funkcji",
          body:
            "Szablon funkcji pozwala napisać jedną implementację dla wielu typów. To podstawa budowania elastycznych narzędzi i bibliotek wielokrotnego użytku.",
          example: "template <typename T>\nT maxOf(T a, T b) {\n  return a > b ? a : b;\n}",
          question: q("Co daje szablon funkcji?", ["Jedną implementację dla wielu typów", "Automatyczne dziedziczenie", "Wyłącznie lepszy wygląd kodu"], 0),
        },
        {
          title: "Szablony klas",
          body:
            "Nie tylko funkcje mogą być generyczne. Szablony klas umożliwiają tworzenie własnych kontenerów i typów działających z różnymi danymi.",
          example: "template <typename T>\nclass Box {\npublic:\n  T value;\n};",
          question: q("Po co tworzy się szablony klas?", ["Aby budować generyczne typy", "Aby ukryć pola przed kompilatorem", "Aby uniknąć plików nagłówkowych"], 0),
        },
        {
          title: "Constraints i concepts - po co",
          body:
            "W nowszym C++ możesz precyzyjniej określić, jakie typy pasują do szablonu. Dzięki temu błędy są czytelniejsze, a interfejs bardziej jednoznaczny.",
          question: q("Jaka jest główna zaleta concepts?", ["Lepsze ograniczanie i dokumentowanie szablonów", "Zastępowanie wszystkich klas", "Usuwanie potrzeby kompilacji"], 0),
        },
      ],
    },
    {
      title: "STL na poziomie produkcyjnym",
      lessons: [
        {
          title: "Algorytmy i predykaty",
          body:
            "Zaawansowany użytkownik nie powinien pisać każdej pętli ręcznie. Warto umieć dobrać algorytm standardowy oraz własny predykat albo lambdę do konkretnego problemu.",
          example: "auto it = std::find_if(items.begin(), items.end(), [](const Item& item) { return item.id == 7; });",
          question: q("Po co używa się `find_if` z lambdą?", ["Aby wyszukać element według warunku", "Aby tworzyć nowy kontener", "Aby zamknąć plik"], 0),
        },
        {
          title: "Optional, variant i bezpieczne wyniki",
          body:
            "Nie każdy wynik musi istnieć i nie każdy stan pasuje do pojedynczego typu. `std::optional` i `std::variant` pozwalają to modelować jawnie zamiast improwizować wartości specjalne.",
          question: q("Po co używa się `std::optional`?", ["Aby reprezentować wartość, która może nie istnieć", "Aby zastąpić wszystkie wskaźniki", "Aby sortować dane"], 0),
        },
        {
          title: "Custom comparatory i porządkowanie",
          body:
            "W realnych projektach rzadko sortujesz tylko liczby rosnąco. Własne komparatory pozwalają narzucić logikę biznesową bez rozbijania kodu na nieczytelne instrukcje warunkowe.",
          example: "std::sort(users.begin(), users.end(), [](const User& a, const User& b) { return a.score > b.score; });",
          question: q("Do czego służy własny comparator w `std::sort`?", ["Do określenia własnej reguły sortowania", "Do przydzielania pamięci", "Do tworzenia wyjątków"], 0),
        },
      ],
    },
    {
      title: "Architektura i wydajność",
      lessons: [
        {
          title: "Profilowanie zamiast zgadywania",
          body:
            "Zaawansowany poziom to nie tylko więcej składni. Zanim zoptymalizujesz kod, powinieneś umieć zmierzyć problem i potwierdzić, gdzie naprawdę znajduje się wąskie gardło.",
          question: q("Jaki jest sens profilowania?", ["Pomaga mierzyć rzeczywiste źródło spowolnień", "Automatycznie naprawia błędy logiczne", "Zastępuje testy jednostkowe"], 0),
        },
        {
          title: "Wyjątki i granice modułów",
          body:
            "Wyjątki mają sens tam, gdzie oddzielasz logikę domenową od warstw technicznych. Ważne jest ustalenie, które moduły rzucają wyjątki, a które je przechwytują i zamieniają na czytelne komunikaty.",
          question: q("Co jest ważne przy pracy z wyjątkami w większym projekcie?", ["Jasne określenie granic obsługi błędów", "Łapanie każdego wyjątku wszędzie", "Unikanie wszystkich funkcji"], 0),
        },
        {
          title: "Kod gotowy do rozwoju",
          body:
            "Końcówka ścieżki advanced skupia się na pisaniu kodu, który jest nie tylko poprawny, ale też skalowalny. Czytelne API, dobre własności obiektów i mierzalna wydajność są tu ważniejsze niż sztuczki składniowe.",
          question: q("Co najlepiej opisuje cel końcowy poziomu advanced?", ["Projektowanie czytelnego, rozszerzalnego i wydajnego kodu", "Pisanie jak najdłuższych funkcji", "Unikanie STL i typów standardowych"], 0),
        },
      ],
      quizXp: 15,
      examXp: 9,
    },
  ]),
};

export function getStagesForTrack(track: RoadmapTrack) {
  return ROADMAPS[track];
}

export function totalLessons(stages: RoadmapStage[]) {
  return stages.reduce((acc, stage) => acc + stage.lessons.length, 0);
}
