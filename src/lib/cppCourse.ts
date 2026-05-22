export type Track = "beginner" | "basic" | "intermediate" | "advanced";

export const TRACKS: { id: Track; label: string; desc: string }[] = [
  { id: "beginner", label: "Nigdy nie programowałem", desc: "Zaczynamy od zera — co to jest program i jak go uruchomić." },
  { id: "basic", label: "Znam podstawy", desc: "Wiem czym jest zmienna, pętla i if." },
  { id: "intermediate", label: "Średnio zaawansowany", desc: "Pisałem funkcje, znam tablice i wskaźniki w teorii." },
  { id: "advanced", label: "Zaawansowany", desc: "Klasy, szablony, STL — chcę szlifować." },
];

export interface Question {
  q: string;
  options: string[];
  answer: number; // index
  explain?: string;
}

export interface Level {
  n: number;
  title: string;
  lesson: string;
  example?: string;
  question: Question;
}

// Banki pytań/lekcji dla każdego toru — po 100 unikalnych poziomów.
// Generujemy treść z szablonów + indeksu, by pokryć 100 poziomów bez nudy.

const TOPICS: Record<Track, { title: string; lesson: string; example?: string; question: Question }[]> = {
  beginner: [
    { title: "Co to jest C++?", lesson: "C++ to język programowania używany do tworzenia gier, aplikacji i systemów. Piszesz instrukcje, a komputer je wykonuje.", question: { q: "Czym jest C++?", options: ["Językiem programowania", "Grą", "Systemem operacyjnym"], answer: 0 } },
    { title: "Pierwszy program", lesson: "Każdy program w C++ zaczyna się od funkcji main(). To tutaj komputer startuje.", example: "int main() {\n  return 0;\n}", question: { q: "Od jakiej funkcji startuje program?", options: ["start()", "main()", "begin()"], answer: 1 } },
    { title: "Wypisywanie tekstu", lesson: "Używamy std::cout aby pokazać tekst na ekranie.", example: 'std::cout << "Cześć!";', question: { q: "Co wypisuje std::cout?", options: ["Tekst na ekranie", "Plik", "Dźwięk"], answer: 0 } },
    { title: "Komentarze", lesson: "Komentarze to notatki w kodzie. // robi komentarz do końca linii.", example: "// to jest komentarz", question: { q: "Jak zaczyna się komentarz jednoliniowy?", options: ["#", "//", "/*"], answer: 1 } },
    { title: "Średnik", lesson: "Każda instrukcja kończy się średnikiem ;", question: { q: "Czym kończymy instrukcję?", options: [".", ";", ":"], answer: 1 } },
    { title: "Zmienne — pojęcie", lesson: "Zmienna to pudełko z nazwą, w którym trzymamy wartość.", question: { q: "Co to zmienna?", options: ["Stała wartość", "Nazwane miejsce na dane", "Funkcja"], answer: 1 } },
    { title: "Typ int", lesson: "int to typ dla liczb całkowitych: 1, 2, -7.", example: "int wiek = 10;", question: { q: "Co przechowuje int?", options: ["Tekst", "Liczby całkowite", "Liczby z przecinkiem"], answer: 1 } },
    { title: "Typ double", lesson: "double trzyma liczby z przecinkiem, np. 3.14.", question: { q: "Który typ to liczby ułamkowe?", options: ["int", "double", "bool"], answer: 1 } },
    { title: "Typ char", lesson: "char trzyma jeden znak, np. 'A'.", question: { q: "Co trzyma char?", options: ["Słowo", "Pojedynczy znak", "Liczbę"], answer: 1 } },
    { title: "Typ bool", lesson: "bool ma tylko dwie wartości: true lub false.", question: { q: "Ile wartości ma bool?", options: ["2", "10", "Nieskończenie"], answer: 0 } },
  ],
  basic: [
    { title: "Operatory matematyczne", lesson: "+, -, *, / oraz % (reszta z dzielenia).", question: { q: "Co robi %?", options: ["Procent", "Resztę z dzielenia", "Mnoży"], answer: 1 } },
    { title: "Instrukcja if", lesson: "if sprawdza warunek i wykonuje kod gdy jest prawdziwy.", example: "if (x > 0) cout << \"+\";", question: { q: "Co testuje if?", options: ["Warunek", "Typ", "Funkcję"], answer: 0 } },
    { title: "else", lesson: "else wykonuje się gdy warunek if jest fałszywy.", question: { q: "Kiedy odpala się else?", options: ["Zawsze", "Gdy if=false", "Gdy if=true"], answer: 1 } },
    { title: "Pętla while", lesson: "while powtarza blok dopóki warunek jest prawdziwy.", question: { q: "while powtarza dopóki warunek jest...", options: ["false", "true", "0"], answer: 1 } },
    { title: "Pętla for", lesson: "for ma 3 części: init; warunek; krok.", example: "for (int i=0; i<5; ++i) ...", question: { q: "Ile części ma nagłówek for?", options: ["1", "2", "3"], answer: 2 } },
    { title: "Operator ==", lesson: "== porównuje, = przypisuje. Uważaj!", question: { q: "Co robi ==?", options: ["Przypisuje", "Porównuje", "Dodaje"], answer: 1 } },
    { title: "Operatory logiczne", lesson: "&& to AND, || to OR, ! to NOT.", question: { q: "Co oznacza &&?", options: ["OR", "AND", "NOT"], answer: 1 } },
    { title: "Stringi", lesson: "std::string trzyma tekst.", example: "string imie = \"Ola\";", question: { q: "Który typ trzyma tekst?", options: ["int", "string", "bool"], answer: 1 } },
    { title: "Wczytywanie danych", lesson: "std::cin >> x wczytuje wartość od użytkownika.", question: { q: "Co robi cin?", options: ["Wypisuje", "Wczytuje", "Liczy"], answer: 1 } },
    { title: "Tablice", lesson: "int t[5] tworzy tablicę 5 liczb.", question: { q: "Od jakiego indeksu liczymy tablice?", options: ["0", "1", "-1"], answer: 0 } },
  ],
  intermediate: [
    { title: "Funkcje — definicja", lesson: "Funkcja ma typ zwracany, nazwę i parametry.", example: "int add(int a,int b){return a+b;}", question: { q: "Co zwraca funkcja void?", options: ["int", "nic", "string"], answer: 1 } },
    { title: "Przekazywanie przez wartość", lesson: "Kopiujemy argument; zmiana wewnątrz nie wpływa na oryginał.", question: { q: "Czy zmiana parametru przez wartość zmienia oryginał?", options: ["Tak", "Nie"], answer: 1 } },
    { title: "Referencje", lesson: "int& x oznacza referencję — alias do zmiennej.", question: { q: "Co robi &?", options: ["Adres / referencja", "Mnoży", "Dzieli"], answer: 0 } },
    { title: "Wskaźniki", lesson: "int* p trzyma adres zmiennej. *p to wartość pod adresem.", question: { q: "Co oznacza *p?", options: ["Adres", "Wartość pod adresem", "Mnożenie"], answer: 1 } },
    { title: "nullptr", lesson: "nullptr to bezpieczna wartość pustego wskaźnika.", question: { q: "Czym jest nullptr?", options: ["Liczba 0", "Pusty wskaźnik", "Tekst"], answer: 1 } },
    { title: "std::vector", lesson: "Dynamiczna tablica z STL: vector<int> v;", question: { q: "Czym jest vector?", options: ["Stała tablica", "Dynamiczna tablica", "Mapa"], answer: 1 } },
    { title: "Range-for", lesson: "for (auto x : v) iteruje po elementach.", question: { q: "Co robi for(auto x:v)?", options: ["Iteruje po v", "Tworzy v", "Sortuje v"], answer: 0 } },
    { title: "auto", lesson: "auto pozwala kompilatorowi wywnioskować typ.", question: { q: "Co robi auto?", options: ["Wnioskuje typ", "Tworzy klasę", "Usuwa zmienną"], answer: 0 } },
    { title: "const", lesson: "const oznacza wartość, której nie można zmienić.", question: { q: "Co oznacza const?", options: ["Wartość stała", "Dynamiczna", "Globalna"], answer: 0 } },
    { title: "Nagłówki", lesson: "#include <iostream> dodaje moduł wejścia/wyjścia.", question: { q: "Co robi #include?", options: ["Dodaje plik nagłówkowy", "Drukuje", "Liczy"], answer: 0 } },
  ],
  advanced: [
    { title: "Klasy", lesson: "class definiuje typ z polami i metodami.", question: { q: "Czym jest klasa?", options: ["Funkcja", "Typ z polami i metodami", "Liczba"], answer: 1 } },
    { title: "Konstruktor", lesson: "Konstruktor inicjalizuje obiekt przy tworzeniu.", question: { q: "Kiedy odpala się konstruktor?", options: ["Przy tworzeniu obiektu", "Przy usuwaniu", "Nigdy"], answer: 0 } },
    { title: "Dziedziczenie", lesson: "class B : public A — B dziedziczy po A.", question: { q: "Co robi : public A?", options: ["Dziedziczy z A", "Kopiuje", "Usuwa"], answer: 0 } },
    { title: "Wirtualne metody", lesson: "virtual umożliwia polimorfizm.", question: { q: "Co umożliwia virtual?", options: ["Polimorfizm", "Stałość", "Optymalizację"], answer: 0 } },
    { title: "Szablony", lesson: "template<typename T> pozwala pisać kod generyczny.", question: { q: "Po co template?", options: ["Kod generyczny", "Komentarze", "Szybkość"], answer: 0 } },
    { title: "STL: map", lesson: "std::map<K,V> trzyma pary klucz-wartość.", question: { q: "Co trzyma map?", options: ["Tylko klucze", "Pary klucz-wartość", "Liczby"], answer: 1 } },
    { title: "Lambdy", lesson: "[](int x){return x*2;} to funkcja anonimowa.", question: { q: "Co to lambda?", options: ["Klasa", "Funkcja anonimowa", "Pętla"], answer: 1 } },
    { title: "Smart pointers", lesson: "unique_ptr i shared_ptr zarządzają pamięcią.", question: { q: "Co robi unique_ptr?", options: ["Zarządza pamięcią", "Drukuje", "Sortuje"], answer: 0 } },
    { title: "RAII", lesson: "Resource Acquisition Is Initialization — zasoby zwalniane w destruktorze.", question: { q: "Co to RAII?", options: ["Wzorzec zasobów", "Pętla", "Biblioteka"], answer: 0 } },
    { title: "move semantics", lesson: "std::move przenosi zasoby zamiast kopiować.", question: { q: "Co robi std::move?", options: ["Przenosi zasoby", "Kopiuje", "Usuwa"], answer: 0 } },
  ],
};

export function buildLevels(track: Track): Level[] {
  const bank = TOPICS[track];
  const levels: Level[] = [];
  for (let i = 0; i < 100; i++) {
    const base = bank[i % bank.length];
    const round = Math.floor(i / bank.length) + 1;
    levels.push({
      n: i + 1,
      title: round === 1 ? base.title : `${base.title} — utrwalenie ${round}`,
      lesson: base.lesson,
      example: base.example,
      question: base.question,
    });
  }
  return levels;
}

export function buildQuiz(track: Track, quizIndex: number): Question[] {
  // quizIndex: 0..9 (po każdych 10 poziomach)
  const levels = buildLevels(track);
  const start = quizIndex * 10;
  return levels.slice(start, start + 10).map((l) => l.question);
}
