export type RoadmapTrack = "beginner" | "basic" | "intermediate" | "advanced";

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
  lessons: RoadmapLesson[];
  quiz: RoadmapQuiz;
  exam?: RoadmapExam;
};

export const ROADMAP: RoadmapStage[] = [
  {
    id: "foundations",
    title: "Podstawy",
    lessons: [
      {
        id: "l1-what-is-cpp",
        title: "L1 · Co to jest C++?",
        body:
          "C++ to język programowania używany do aplikacji, gier i systemów. Kompilator zamienia kod na program, który uruchamiasz na komputerze.",
        question: {
          q: "Czym jest C++?",
          options: ["Językiem programowania", "Przeglądarką internetową", "Systemem operacyjnym"],
          answer: 0,
        },
      },
      {
        id: "l2-install-compiler",
        title: "L2 · Instalacja kompilatora",
        body:
          "Do C++ potrzebujesz kompilatora (np. clang, gcc, MSVC). W IDE (np. VS Code) konfigurujesz build i uruchamiasz program z terminala.",
        question: {
          q: "Co robi kompilator?",
          options: ["Tłumaczy kod na program", "Wyświetla UI aplikacji", "Wysyła pliki do chmury"],
          answer: 0,
        },
      },
      {
        id: "l3-first-program",
        title: "L3 · Pierwszy program",
        body: "Wejście programu to main(). Zawsze zwracaj 0, jeśli wszystko się udało.",
        example: "int main() {\n  return 0;\n}",
        question: {
          q: "Od jakiej funkcji startuje program w C++?",
          options: ["start()", "main()", "run()"],
          answer: 1,
        },
      },
      {
        id: "l4-comments-whitespace",
        title: "L4 · Komentarze i białe znaki",
        body: "Komentarze nie wpływają na kod, ale pomagają w czytelności. Spacje i nowe linie są zwykle ignorowane.",
        example: "// komentarz\n/* komentarz blokowy */",
        question: {
          q: "Jak zaczyna się komentarz jednoliniowy w C++?",
          options: ["//", "#", "<!--"],
          answer: 0,
        },
      },
      {
        id: "l5-compilation-explained",
        title: "L5 · Jak działa kompilacja",
        body:
          "Kompilacja zwykle dzieli się na preprocessing, kompilację i linkowanie. Błędy kompilacji to nie to samo co błędy uruchomienia.",
        question: {
          q: "Który etap łączy pliki/obiekty w jeden program?",
          options: ["Linkowanie", "Formatowanie kodu", "Debugowanie"],
          answer: 0,
        },
      },
      {
        id: "l6-errors-vs-warnings",
        title: "L6 · Błędy i ostrzeżenia",
        body:
          "Error zatrzymuje kompilację. Warning zwykle pozwala skompilować, ale sygnalizuje potencjalny problem w kodzie.",
        question: {
          q: "Co zazwyczaj oznacza warning?",
          options: ["Kompilacja zawsze się zatrzyma", "Potencjalny problem w kodzie", "Program na pewno się nie uruchomi"],
          answer: 1,
        },
      },
      {
        id: "l7-hello-name",
        title: "L7 · Witaj, imię!",
        body: "Wejście/wyjście w konsoli: std::cout i std::cin.",
        example:
          '#include <iostream>\n#include <string>\n\nint main() {\n  std::string name;\n  std::cin >> name;\n  std::cout << "Hello, " << name << "!";\n  return 0;\n}',
        question: {
          q: "Który obiekt służy do wypisywania na ekran?",
          options: ["std::cout", "std::cin", "std::cerr"],
          answer: 0,
        },
      },
      {
        id: "l8-reading-input",
        title: "L8 · Wczytywanie danych",
        body:
          "Operator >> czyta tokeny rozdzielone białymi znakami. Do wczytywania całej linii użyj std::getline.",
        question: {
          q: "Która funkcja wczytuje całą linię tekstu?",
          options: ["std::getline", "std::cin >>", "std::printf"],
          answer: 0,
        },
      },
      {
        id: "l9-variables-intro",
        title: "L9 · Zmienne – wprowadzenie",
        body: "Zmienna to nazwane miejsce w pamięci. Typ mówi kompilatorowi co w niej trzymasz.",
        example: "int age = 21;\ndouble pi = 3.14;\nbool ok = true;",
        question: {
          q: "Który typ przechowuje liczbę z przecinkiem?",
          options: ["int", "double", "bool"],
          answer: 1,
        },
      },
      {
        id: "l10-constants",
        title: "L10 · Stałe (const)",
        body:
          "const blokuje modyfikację wartości. To pomaga unikać błędów i ułatwia czytanie kodu.",
        example: "const int maxN = 100;",
        question: {
          q: "Co oznacza const?",
          options: ["Wartość, której nie można zmienić", "Zmienna globalna", "Zmienna do pętli"],
          answer: 0,
        },
      },
    ],
    quiz: {
      id: "quiz-foundations",
      title: "Mini quiz · Podstawy",
      xpOnPass: 10,
      questions: [
        {
          q: "Od jakiej funkcji startuje program w C++?",
          options: ["start()", "main()", "begin()"],
          answer: 1,
        },
        {
          q: "Co oznacza warning?",
          options: ["Kompilacja zawsze się zatrzyma", "Możliwy problem w kodzie", "Błąd uruchomienia programu"],
          answer: 1,
        },
        {
          q: "Które narzędzie zamienia kod na program?",
          options: ["Kompilator", "Przeglądarka", "Debugger"],
          answer: 0,
        },
        {
          q: "Co czyta operator >> w std::cin?",
          options: ["Całą linię", "Tokeny rozdzielone spacjami", "Plik z dysku"],
          answer: 1,
        },
        {
          q: "Po co używa się const?",
          options: ["Żeby zmieniać wartość szybciej", "Żeby zablokować zmianę wartości", "Żeby wyświetlić zmienną"],
          answer: 1,
        },
      ],
    },
    exam: {
      id: "exam-1",
      title: "Egzamin 1 · Podstawy",
      xpPerCorrect: 6,
      questions: [
        {
          q: "Który typ przechowuje liczby całkowite?",
          options: ["int", "double", "string"],
          answer: 0,
        },
        {
          q: "Co wypisuje std::cout?",
          options: ["Tekst na ekranie", "Zmienną w pamięci", "Sieć"],
          answer: 0,
        },
        {
          q: "Czym kończysz instrukcję w C++?",
          options: [".", ";", ":"],
          answer: 1,
        },
        {
          q: "Co robi #include?",
          options: ["Dodaje nagłówek/bibliotekę", "Uruchamia program", "Wypisuje tekst"],
          answer: 0,
        },
        {
          q: "Do czego służą komentarze?",
          options: ["Do notatek w kodzie", "Do przyspieszenia programu", "Do kompilacji"],
          answer: 0,
        },
        {
          q: "Czy warning blokuje kompilację?",
          options: ["Tak", "Nie zawsze", "Zawsze"],
          answer: 1,
        },
        {
          q: "Co zwraca main() przy sukcesie (często)?",
          options: ["0", "1", "-1"],
          answer: 0,
        },
        {
          q: "Jak wczytać całą linię tekstu?",
          options: ["std::cin >>", "std::getline", "std::cout <<"],
          answer: 1,
        },
        {
          q: "Która wartość jest logiczna?",
          options: ["true", "3.14", "\"ok\""],
          answer: 0,
        },
        {
          q: "Co robi kompilator?",
          options: ["Tłumaczy kod na program", "Rysuje UI", "Wysyła email"],
          answer: 0,
        },
      ],
    },
  },
  {
    id: "variables",
    title: "Zmienne i typy",
    lessons: [
      {
        id: "s2-l1-types",
        title: "L1 · Typy danych",
        body:
          "Typ określa, jaki rodzaj danych przechowujesz. Najczęściej spotkasz: int (liczby całkowite), double (liczby z przecinkiem), bool (prawda/fałsz) i char (pojedynczy znak).",
        example: "int a = 10;\ndouble b = 2.5;\nbool ok = true;\nchar c = 'X';",
        question: {
          q: "Który typ najlepiej pasuje do wartości true/false?",
          options: ["int", "bool", "double"],
          answer: 1,
        },
      },
      {
        id: "s2-l2-strings",
        title: "L2 · Tekst (std::string)",
        body:
          "Do przechowywania tekstu używa się std::string. Pamiętaj o dołączeniu <string>. Dla całych linii często używa się std::getline.",
        example: '#include <string>\n\nstd::string name = "Ala";',
        question: {
          q: "Jak nazywa się typ tekstowy w standardowej bibliotece C++?",
          options: ["text", "std::string", "String"],
          answer: 1,
        },
      },
      {
        id: "s2-l3-assignment",
        title: "L3 · Przypisanie i modyfikacja",
        body:
          "Operator = przypisuje wartość. Skróty: +=, -=, *=, /= pomagają modyfikować zmienną bez powtarzania jej nazwy.",
        example: "int x = 5;\nx += 3; // x = 8\nx *= 2; // x = 16",
        question: {
          q: "Co zrobi x += 2, jeśli x wynosi 3?",
          options: ["x będzie 5", "x będzie 6", "x będzie 1"],
          answer: 0,
        },
      },
      {
        id: "s2-l4-casting",
        title: "L4 · Rzutowanie (konwersje)",
        body:
          "Czasem musisz jawnie zmienić typ, np. dzielenie liczb całkowitych vs. zmiennoprzecinkowych. Do jawnej konwersji używaj static_cast.",
        example: "int a = 5;\nint b = 2;\ndouble d = static_cast<double>(a) / b; // 2.5",
        question: {
          q: "Które rzutowanie jest zalecane w nowoczesnym C++?",
          options: ["static_cast", "goto_cast", "auto_cast"],
          answer: 0,
        },
      },
      {
        id: "s2-l5-scope",
        title: "L5 · Zakres zmiennych (scope)",
        body:
          "Zmienna żyje w swoim zakresie (np. wewnątrz bloku { } ). Po wyjściu z bloku przestaje istnieć.",
        example: "int main() {\n  int x = 1;\n  {\n    int y = 2;\n  }\n  // y tutaj nie istnieje\n}",
        question: {
          q: "Co dzieje się ze zmienną zadeklarowaną wewnątrz bloku { } po wyjściu z bloku?",
          options: ["Nadal istnieje", "Znika / przestaje istnieć", "Zamienia się na 0"],
          answer: 1,
        },
      },
    ],
    quiz: {
      id: "quiz-variables",
      title: "Mini quiz · Zmienne i typy",
      xpOnPass: 10,
      questions: [
        { q: "Który typ trzyma true/false?", options: ["bool", "int", "double"], answer: 0 },
        { q: "Do tekstu w C++ używa się…", options: ["std::string", "String", "text"], answer: 0 },
        { q: "Co oznacza x *= 3?", options: ["x = x * 3", "x = x + 3", "x = x / 3"], answer: 0 },
        { q: "Które rzutowanie jest zalecane?", options: ["static_cast", "auto_cast", "goto_cast"], answer: 0 },
        { q: "Zmienna w bloku { } żyje…", options: ["Zawsze", "Tylko w tym bloku", "Tylko w main"], answer: 1 },
      ],
    },
    exam: {
      id: "exam-2",
      title: "Egzamin 2 · Zmienne i typy",
      xpPerCorrect: 6,
      questions: [
        { q: "Który typ jest zmiennoprzecinkowy?", options: ["double", "int", "bool"], answer: 0 },
        { q: "Który typ przechowuje pojedynczy znak?", options: ["char", "std::string", "double"], answer: 0 },
        { q: "Co oznacza x -= 1?", options: ["x = x - 1", "x = x + 1", "x = x * 1"], answer: 0 },
        { q: "Do jawnej konwersji typu użyj…", options: ["static_cast", "std::convert", "type_of"], answer: 0 },
        { q: "Jak nazywa się standardowy typ na tekst?", options: ["std::string", "String", "text"], answer: 0 },
        { q: "Co zwróci 5/2 (int/int) w C++?", options: ["2", "2.5", "3"], answer: 0 },
        { q: "Aby uzyskać 2.5 z 5/2, musisz…", options: ["Użyć double i/lub rzutowania", "Użyć bool", "Użyć char"], answer: 0 },
        { q: "Czy zmienna z wewnętrznego bloku jest dostępna poza nim?", options: ["Tak", "Nie", "Zależy od const"], answer: 1 },
        { q: "Który operator przypisuje wartość?", options: ["=", "==", "!="], answer: 0 },
        { q: "Który zapis tworzy stałą liczbę całkowitą?", options: ["const int n = 3;", "int const()", "int n := 3;"], answer: 0 },
      ],
    },
  },
  {
    id: "flow",
    title: "Warunki i pętle",
    lessons: [
      {
        id: "s3-l1-if",
        title: "L1 · if / else",
        body: "if sprawdza warunek. Jeśli jest prawdziwy, wykonuje blok. else uruchamia się, gdy warunek jest fałszywy.",
        example: "int x = 5;\nif (x > 3) {\n  // ...\n} else {\n  // ...\n}",
        question: {
          q: "Kiedy wykona się blok else?",
          options: ["Gdy warunek w if jest fałszywy", "Zawsze", "Tylko przy x==0"],
          answer: 0,
        },
      },
      {
        id: "s3-l2-comparisons",
        title: "L2 · Porównania",
        body: "== porównuje, a = przypisuje. Do nierówności używa się !=, a do relacji <, <=, >, >=.",
        question: {
          q: "Który operator porównuje równość?",
          options: ["=", "==", "=>"],
          answer: 1,
        },
      },
      {
        id: "s3-l3-logical",
        title: "L3 · Operatory logiczne",
        body: "&& to AND, || to OR, a ! neguje wartość logiczną.",
        example: "if (age >= 18 && hasId) {\n  // ...\n}",
        question: {
          q: "Co oznacza operator &&?",
          options: ["OR", "AND", "NOT"],
          answer: 1,
        },
      },
      {
        id: "s3-l4-while",
        title: "L4 · Pętla while",
        body: "while powtarza blok dopóki warunek jest prawdziwy. Uważaj na pętle nieskończone.",
        example: "int i = 0;\nwhile (i < 3) {\n  i++;\n}",
        question: {
          q: "Kiedy while kończy działanie?",
          options: ["Gdy warunek stanie się fałszywy", "Zawsze po 1 iteracji", "Nigdy"],
          answer: 0,
        },
      },
      {
        id: "s3-l5-for",
        title: "L5 · Pętla for",
        body: "for jest wygodne, gdy znasz liczbę iteracji. Składa się z: inicjalizacji; warunku; kroku.",
        example: "for (int i = 0; i < 5; i++) {\n  // ...\n}",
        question: {
          q: "Ile części ma nagłówek pętli for?",
          options: ["1", "2", "3"],
          answer: 2,
        },
      },
    ],
    quiz: {
      id: "quiz-flow",
      title: "Mini quiz · Warunki i pętle",
      xpOnPass: 10,
      questions: [
        { q: "Kiedy wykona się else?", options: ["Gdy if jest fałszywy", "Zawsze", "Nigdy"], answer: 0 },
        { q: "Operator równości to…", options: ["==", "=", "=>"], answer: 0 },
        { q: "&& to…", options: ["AND", "OR", "NOT"], answer: 0 },
        { q: "while działa dopóki…", options: ["Warunek jest prawdziwy", "Warunek jest fałszywy", "Program się nie skompiluje"], answer: 0 },
        { q: "for ma w nagłówku…", options: ["3 części", "2 części", "1 część"], answer: 0 },
      ],
    },
    exam: {
      id: "exam-3",
      title: "Egzamin 3 · Warunki i pętle",
      xpPerCorrect: 6,
      questions: [
        { q: "Który operator oznacza nierówność?", options: ["!=", "==", "<="], answer: 0 },
        { q: "Co robi !true?", options: ["false", "true", "0"], answer: 0 },
        { q: "Kiedy wykona się blok if?", options: ["Gdy warunek jest prawdziwy", "Gdy warunek jest fałszywy", "Zawsze"], answer: 0 },
        { q: "Która pętla jest wygodna, gdy znasz liczbę iteracji?", options: ["for", "while", "if"], answer: 0 },
        { q: "Co robi instrukcja i++?", options: ["Zwiększa i o 1", "Zmniejsza i o 1", "Ustawia i na 0"], answer: 0 },
        { q: "Czy = porównuje równość?", options: ["Nie, to przypisanie", "Tak", "Zależy od kompilatora"], answer: 0 },
        { q: "|| to…", options: ["OR", "AND", "NOT"], answer: 0 },
        { q: "while (x) uruchamia się gdy x jest…", options: ["Różne od 0", "Równe 0", "Ujemne"], answer: 0 },
        { q: "for (int i=0; i<3; i++) wykona ciało…", options: ["3 razy", "2 razy", "4 razy"], answer: 0 },
        { q: "Który operator ma najwyższy priorytet z tej trójki?", options: ["!", "&&", "||"], answer: 0 },
      ],
    },
  },
];

export function totalLessons() {
  return ROADMAP.reduce((acc, s) => acc + s.lessons.length, 0);
}
