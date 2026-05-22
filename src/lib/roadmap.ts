export type RoadmapTrack = "beginner" | "basic" | "intermediate" | "advanced";

export type RoadmapLesson = {
  id: string;
  title: string;
  body: string;
  example?: string;
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
    title: "Foundations",
    lessons: [
      {
        id: "l1-what-is-cpp",
        title: "L1 · What is C++?",
        body:
          "C++ to język programowania używany do aplikacji, gier i systemów. Kompilator zamienia kod na program, który uruchamiasz na komputerze.",
      },
      {
        id: "l2-install-compiler",
        title: "L2 · Installing a compiler",
        body:
          "Do C++ potrzebujesz kompilatora (np. clang, gcc, MSVC). W IDE (np. VS Code) konfigurujesz build i uruchamiasz program z terminala.",
      },
      {
        id: "l3-first-program",
        title: "L3 · Your first program",
        body: "Wejście programu to main(). Zawsze zwracaj 0, jeśli wszystko się udało.",
        example: "int main() {\n  return 0;\n}",
      },
      {
        id: "l4-comments-whitespace",
        title: "L4 · Comments & whitespace",
        body: "Komentarze nie wpływają na kod, ale pomagają w czytelności. Spacje i nowe linie są zwykle ignorowane.",
        example: "// komentarz\n/* komentarz blokowy */",
      },
      {
        id: "l5-compilation-explained",
        title: "L5 · Compilation explained",
        body:
          "Kompilacja zwykle dzieli się na preprocessing, kompilację i linkowanie. Błędy kompilacji to nie to samo co błędy uruchomienia.",
      },
      {
        id: "l6-errors-vs-warnings",
        title: "L6 · Errors vs warnings",
        body:
          "Error zatrzymuje kompilację. Warning zwykle pozwala skompilować, ale sygnalizuje potencjalny problem w kodzie.",
      },
      {
        id: "l7-hello-name",
        title: "L7 · Hello, name!",
        body: "Wejście/wyjście w konsoli: std::cout i std::cin.",
        example:
          '#include <iostream>\n#include <string>\n\nint main() {\n  std::string name;\n  std::cin >> name;\n  std::cout << "Hello, " << name << "!";\n  return 0;\n}',
      },
      {
        id: "l8-reading-input",
        title: "L8 · Reading input",
        body:
          "Operator >> czyta tokeny rozdzielone białymi znakami. Do wczytywania całej linii użyj std::getline.",
      },
      {
        id: "l9-variables-intro",
        title: "L9 · Variables intro",
        body: "Zmienna to nazwane miejsce w pamięci. Typ mówi kompilatorowi co w niej trzymasz.",
        example: "int age = 21;\ndouble pi = 3.14;\nbool ok = true;",
      },
      {
        id: "l10-constants",
        title: "L10 · Constants",
        body:
          "const blokuje modyfikację wartości. To pomaga unikać błędów i ułatwia czytanie kodu.",
        example: "const int maxN = 100;",
      },
    ],
    quiz: {
      id: "quiz-foundations",
      title: "Mini quiz · Foundations",
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
      title: "Exam 1 · Foundations",
      xpPerCorrect: 10,
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
];

export function totalLessons() {
  return ROADMAP.reduce((acc, s) => acc + s.lessons.length, 0);
}

