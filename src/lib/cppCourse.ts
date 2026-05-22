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
  answer: number;
  explain?: string;
}

export interface Level {
  n: number;
  title: string;
  lesson: string;       // krótkie wprowadzenie
  details: string;      // dłuższe wyjaśnienie z bulletami
  example?: string;     // przykład kodu
  tip?: string;         // wskazówka
  question: Question;
}

interface Topic {
  title: string;
  lesson: string;
  details: string;
  example?: string;
  tip?: string;
  question: Question;
}

const TOPICS: Record<Track, Topic[]> = {
  beginner: [
    {
      title: "Co to jest C++?",
      lesson: "C++ to język programowania — sposób, w jaki dajemy komputerowi instrukcje krok po kroku.",
      details: "• Komputer sam z siebie nic nie umie — wykonuje to, co mu napiszesz.\n• C++ jest językiem kompilowanym: twój kod zamienia się na plik wykonywalny.\n• Używany jest w grach, przeglądarkach, programach graficznych i systemach.",
      tip: "Nie musisz znać angielskiego — wystarczy nauczyć się kilkudziesięciu słów kluczowych.",
      question: { q: "Czym jest C++?", options: ["Językiem programowania", "Grą komputerową", "Systemem operacyjnym"], answer: 0 },
    },
    {
      title: "Pierwszy program — funkcja main",
      lesson: "Każdy program w C++ startuje z funkcji o nazwie main(). Bez niej komputer nie wie, od czego zacząć.",
      details: "• int main() to nagłówek funkcji startowej.\n• Wszystko między { a } to ciało funkcji — instrukcje do wykonania.\n• return 0; mówi systemowi 'wszystko się udało'.",
      example: "int main() {\n  // tutaj wpisujesz polecenia\n  return 0;\n}",
      tip: "Każdy program MUSI mieć dokładnie jedną funkcję main.",
      question: { q: "Od jakiej funkcji startuje każdy program C++?", options: ["start()", "main()", "begin()"], answer: 1 },
    },
    {
      title: "Wypisywanie tekstu — std::cout",
      lesson: "std::cout to 'głos' programu — używamy go, by pokazać coś na ekranie.",
      details: "• cout pochodzi od character output (wyjście znakowe).\n• Operator << 'wsuwa' tekst do strumienia wyjścia.\n• Tekst do wypisania zamykamy w cudzysłowy: \"...\".",
      example: '#include <iostream>\nint main() {\n  std::cout << "Cześć świecie!";\n  return 0;\n}',
      tip: "Bez #include <iostream> cout nie zadziała — to dodaje moduł wejścia/wyjścia.",
      question: { q: "Co robi std::cout?", options: ["Wypisuje tekst na ekranie", "Zapisuje plik na dysku", "Odtwarza dźwięk"], answer: 0 },
    },
    {
      title: "Komentarze w kodzie",
      lesson: "Komentarz to notatka dla człowieka — komputer ją ignoruje.",
      details: "• // komentarz do końca linii\n• /* komentarz na wiele linii */\n• Używaj ich, by wyjaśnić DLACZEGO coś robisz, nie CO (bo to widać w kodzie).",
      example: "// to jest komentarz jednoliniowy\n/* a to\n   wieloliniowy */",
      question: { q: "Jak zaczyna się komentarz jednoliniowy?", options: ["#", "//", "/*"], answer: 1 },
    },
    {
      title: "Średnik kończy instrukcję",
      lesson: "W C++ każda pojedyncza instrukcja kończy się średnikiem ;",
      details: "• Średnik to sygnał 'koniec tego polecenia'.\n• Bez średnika kompilator zgłosi błąd.\n• Klamry { } oraz dyrektywy #include nie wymagają średnika.",
      example: "int wiek = 10;\nstd::cout << wiek;",
      tip: "90% pierwszych błędów początkujących to brakujący średnik.",
      question: { q: "Czym kończymy zwykłą instrukcję?", options: ["kropką", "średnikiem ;", "dwukropkiem"], answer: 1 },
    },
    {
      title: "Zmienne — pudełka na dane",
      lesson: "Zmienna to nazwane miejsce w pamięci, w którym przechowujesz wartość.",
      details: "• Tworzysz ją przez: TYP nazwa = wartość;\n• Wartość możesz później zmieniać.\n• Nazwa zmiennej nie może zaczynać się od cyfry i nie może mieć spacji.",
      example: "int wiek = 25;\nwiek = 26; // teraz ma 26",
      question: { q: "Co to jest zmienna?", options: ["Wartość, której nie można zmieniać", "Nazwane miejsce na dane", "Specjalna funkcja"], answer: 1 },
    },
    {
      title: "Typ int — liczby całkowite",
      lesson: "int przechowuje liczby całkowite, np. -3, 0, 7, 1500.",
      details: "• Bez ułamków: int nie zapamięta 3.14.\n• Zakres typowo od ok. -2 mld do +2 mld.\n• Operacje +, -, *, / działają jak w matematyce, z jedną pułapką: 7/2 daje 3 (nie 3.5).",
      example: "int a = 10;\nint b = 3;\nint c = a + b; // 13",
      question: { q: "Co przechowuje int?", options: ["Tekst", "Liczby całkowite", "Liczby z przecinkiem"], answer: 1 },
    },
    {
      title: "Typ double — liczby z przecinkiem",
      lesson: "double trzyma liczby ułamkowe, np. 3.14, -0.5, 100.0.",
      details: "• 'double' to skrót od double precision floating point.\n• Używaj go zawsze gdy potrzebujesz ułamków.\n• W C++ separatorem dziesiętnym jest kropka, nie przecinek!",
      example: "double pi = 3.14159;\ndouble cena = 19.99;",
      tip: "Jeśli zapiszesz 7.0/2 zamiast 7/2, dostaniesz 3.5 zamiast 3.",
      question: { q: "Który typ używamy do liczb ułamkowych?", options: ["int", "double", "bool"], answer: 1 },
    },
    {
      title: "Typ char — pojedynczy znak",
      lesson: "char przechowuje JEDEN znak, np. 'A', 'z', '?', '7'.",
      details: "• Znaki zamykamy w pojedyncze cudzysłowy: 'A'.\n• Tekst (wiele znaków) to coś innego — std::string.\n• Każdy znak ma numer w tabeli ASCII (np. 'A' = 65).",
      example: "char ocena = '5';\nchar pierwsza = 'A';",
      question: { q: "Co przechowuje char?", options: ["Słowo", "Pojedynczy znak", "Liczbę całkowitą"], answer: 1 },
    },
    {
      title: "Typ bool — prawda lub fałsz",
      lesson: "bool ma tylko dwie wartości: true (prawda) lub false (fałsz).",
      details: "• Używamy go do warunków — czy coś jest spełnione, czy nie.\n• true to nie to samo co 1, choć technicznie 1 jest traktowane jak true.\n• Zazwyczaj wynik porównania (np. x > 0) jest typu bool.",
      example: "bool czyDorosly = true;\nbool czyDeszcz = false;",
      question: { q: "Ile różnych wartości może mieć bool?", options: ["2", "10", "nieskończenie wiele"], answer: 0 },
    },
  ],
  basic: [
    {
      title: "Operatory matematyczne",
      lesson: "C++ zna +, -, *, /, oraz % (reszta z dzielenia).",
      details: "• 7 % 2 daje 1 (reszta z dzielenia 7 przez 2).\n• Kolejność działań jak w matematyce — * i / przed + i -.\n• Nawiasy () zmieniają kolejność: (2+3)*4 = 20.",
      example: "int suma = 2 + 3 * 4; // 14, nie 20",
      question: { q: "Co robi operator %?", options: ["Wylicza procent", "Resztę z dzielenia", "Mnoży"], answer: 1 },
    },
    {
      title: "Instrukcja if",
      lesson: "if pozwala wykonać kod TYLKO gdy warunek jest prawdziwy.",
      details: "• Składnia: if (warunek) { ... }\n• Warunek to wyrażenie zwracające bool.\n• Operatory porównania: ==, !=, <, >, <=, >=.",
      example: "if (wiek >= 18) {\n  std::cout << \"Dorosły\";\n}",
      tip: "Pamiętaj: == porównuje, = przypisuje. To różne rzeczy!",
      question: { q: "Co testuje if?", options: ["Warunek logiczny", "Typ zmiennej", "Nazwę funkcji"], answer: 0 },
    },
    {
      title: "else i else if",
      lesson: "else uruchamia się gdy warunek if jest fałszywy. else if dodaje kolejny warunek.",
      details: "• Drabinka if/else if/else pozwala obsłużyć wiele przypadków.\n• Tylko JEDNA z gałęzi się wykona.\n• Kolejność warunków ma znaczenie — sprawdzane od góry.",
      example: "if (x > 0) cout << \"+\";\nelse if (x < 0) cout << \"-\";\nelse cout << \"zero\";",
      question: { q: "Kiedy uruchamia się blok else?", options: ["Zawsze", "Gdy warunek if jest fałszywy", "Gdy warunek if jest prawdziwy"], answer: 1 },
    },
    {
      title: "Pętla while",
      lesson: "while powtarza blok kodu dopóki warunek jest prawdziwy.",
      details: "• Najpierw sprawdza warunek, potem (jeśli prawda) wykonuje blok.\n• Uważaj na nieskończone pętle — coś w środku musi zmienić warunek.\n• while(true) tworzy pętlę nieskończoną (potrzebuje break).",
      example: "int i = 0;\nwhile (i < 5) {\n  cout << i;\n  i = i + 1;\n}",
      question: { q: "while powtarza dopóki warunek jest...", options: ["false", "true", "równy 0"], answer: 1 },
    },
    {
      title: "Pętla for",
      lesson: "for to skondensowana wersja while idealna do liczenia.",
      details: "• Trzy części w nawiasie: inicjalizacja; warunek; krok.\n• Najczęściej: for (int i = 0; i < n; ++i)\n• ++i to to samo co i = i + 1.",
      example: "for (int i = 1; i <= 10; ++i) {\n  cout << i << \" \";\n}",
      tip: "Programiści indeksują od 0, nie od 1 — tak działają tablice.",
      question: { q: "Z ilu części składa się nagłówek for?", options: ["1", "2", "3"], answer: 2 },
    },
    {
      title: "Operator porównania ==",
      lesson: "== sprawdza równość, = przypisuje wartość. To częsta pułapka!",
      details: "• if (x = 5) — przypisze 5 do x i zawsze będzie prawdą.\n• if (x == 5) — sprawdzi czy x jest równe 5.\n• != to 'różne od'.",
      example: "if (kod == 1234) {\n  cout << \"OK\";\n}",
      question: { q: "Co robi operator ==?", options: ["Przypisuje wartość", "Porównuje wartości", "Dodaje"], answer: 1 },
    },
    {
      title: "Operatory logiczne && || !",
      lesson: "&& to AND (i), || to OR (lub), ! to NOT (negacja).",
      details: "• warunek1 && warunek2 — oba muszą być prawdziwe.\n• warunek1 || warunek2 — wystarczy jeden.\n• !warunek — odwraca prawdę i fałsz.",
      example: "if (wiek >= 18 && maPrawko) { cout << \"Może jechać\"; }",
      question: { q: "Co oznacza &&?", options: ["OR", "AND", "NOT"], answer: 1 },
    },
    {
      title: "Typ string — tekst",
      lesson: "std::string przechowuje tekst (więcej niż jeden znak).",
      details: "• Wymaga #include <string>.\n• Możesz łączyć stringi operatorem +: \"Cześć \" + imie.\n• .length() zwraca liczbę znaków.",
      example: "#include <string>\nstd::string imie = \"Ola\";\nstd::cout << \"Hej \" + imie;",
      question: { q: "Który typ trzyma tekst?", options: ["int", "string", "bool"], answer: 1 },
    },
    {
      title: "Wczytywanie z klawiatury — cin",
      lesson: "std::cin >> x wczytuje wartość wpisaną przez użytkownika.",
      details: "• cin to character input (wejście znakowe).\n• >> wpisuje wartość do zmiennej (odwrotnie do cout).\n• Możesz wczytywać wiele wartości: cin >> a >> b;",
      example: "int wiek;\ncout << \"Podaj wiek: \";\ncin >> wiek;",
      question: { q: "Co robi cin?", options: ["Wypisuje na ekran", "Wczytuje od użytkownika", "Liczy"], answer: 1 },
    },
    {
      title: "Tablice — wiele wartości pod jedną nazwą",
      lesson: "Tablica trzyma kilka wartości tego samego typu pod jedną nazwą.",
      details: "• int t[5]; tworzy tablicę 5 liczb.\n• Indeksowanie zaczynamy od 0: t[0] to pierwszy element.\n• Ostatni element w tablicy 5-elementowej to t[4], nie t[5]!",
      example: "int oceny[3] = {5, 4, 3};\ncout << oceny[0]; // 5",
      tip: "Wyjście poza tablicę (np. t[10] w tablicy 5-elementowej) to klasyczny błąd.",
      question: { q: "Od jakiego indeksu liczymy elementy tablicy?", options: ["0", "1", "-1"], answer: 0 },
    },
  ],
  intermediate: [
    {
      title: "Funkcje — własne podprogramy",
      lesson: "Funkcja to kawałek kodu z nazwą, który możesz wywołać wiele razy.",
      details: "• Składnia: TYP_ZWRACANY nazwa(parametry) { ... return wartość; }\n• void oznacza 'nic nie zwracam'.\n• Pozwala podzielić kod na małe, zrozumiałe kawałki.",
      example: "int dodaj(int a, int b) {\n  return a + b;\n}\nint w = dodaj(3, 5); // 8",
      question: { q: "Co zwraca funkcja typu void?", options: ["int", "nic", "string"], answer: 1 },
    },
    {
      title: "Przekazywanie przez wartość",
      lesson: "Domyślnie funkcja dostaje KOPIĘ argumentu — zmiany nie wracają na zewnątrz.",
      details: "• void f(int x) { x = 99; } — zmienia tylko lokalną kopię.\n• Po wywołaniu f(a) zmienna a poza funkcją się nie zmieni.\n• To bezpieczne, ale czasem chcesz inaczej — wtedy używasz referencji.",
      example: "void zwieksz(int x) { x = x + 1; }\nint a = 5;\nzwieksz(a); // a dalej = 5",
      question: { q: "Czy zmiana parametru przez wartość zmienia oryginał?", options: ["Tak", "Nie"], answer: 1 },
    },
    {
      title: "Referencje &",
      lesson: "int& x to alias — inna nazwa dla istniejącej zmiennej.",
      details: "• Zmiana przez referencję ZMIENIA oryginał.\n• Pozwala funkcjom modyfikować argumenty.\n• const int& używamy, gdy chcemy uniknąć kopii ale bez modyfikacji.",
      example: "void zwieksz(int& x) { x++; }\nint a = 5;\nzwieksz(a); // teraz a = 6",
      question: { q: "Co oznacza & przy parametrze?", options: ["Referencję (alias)", "Mnożenie", "Komentarz"], answer: 0 },
    },
    {
      title: "Wskaźniki *",
      lesson: "Wskaźnik to zmienna trzymająca ADRES innej zmiennej.",
      details: "• int* p; — p może wskazywać na inta.\n• &x daje adres zmiennej x.\n• *p daje wartość pod adresem (dereferencja).",
      example: "int x = 10;\nint* p = &x;\ncout << *p; // 10",
      tip: "Dwie role gwiazdki: 'int*' to typ, '*p' to dereferencja.",
      question: { q: "Co oznacza *p (gdy p jest wskaźnikiem)?", options: ["Adres zmiennej", "Wartość pod adresem", "Mnożenie"], answer: 1 },
    },
    {
      title: "nullptr — bezpieczny pusty wskaźnik",
      lesson: "nullptr oznacza 'wskaźnik na nic'.",
      details: "• Bezpieczniej niż stary NULL czy 0.\n• Używaj go zawsze, gdy chcesz powiedzieć 'na razie nic nie wskazuje'.\n• Dereferencja nullptr to crash programu — sprawdzaj zanim użyjesz.",
      example: "int* p = nullptr;\nif (p != nullptr) { cout << *p; }",
      question: { q: "Czym jest nullptr?", options: ["Liczba 0", "Pusty wskaźnik", "Zwykły tekst"], answer: 1 },
    },
    {
      title: "std::vector — dynamiczna tablica",
      lesson: "vector to tablica, która sama się rozszerza w miarę potrzeby.",
      details: "• Wymaga #include <vector>.\n• Dodajesz elementy przez .push_back().\n• .size() zwraca liczbę elementów.",
      example: "#include <vector>\nstd::vector<int> v;\nv.push_back(10);\nv.push_back(20);",
      question: { q: "Czym jest std::vector?", options: ["Stała tablica", "Dynamiczna tablica", "Mapa"], answer: 1 },
    },
    {
      title: "Pętla range-for",
      lesson: "for (auto x : v) iteruje po wszystkich elementach kontenera.",
      details: "• Krótsza i bezpieczniejsza niż for ze wskaźnikiem.\n• auto& x — jeśli chcesz modyfikować elementy.\n• Działa z tablicami, vector, string i innymi kontenerami.",
      example: "std::vector<int> v = {1,2,3};\nfor (auto x : v) cout << x << \" \";",
      question: { q: "Co robi for(auto x : v)?", options: ["Iteruje po elementach v", "Tworzy nowy vector", "Sortuje v"], answer: 0 },
    },
    {
      title: "Słowo kluczowe auto",
      lesson: "auto pozwala kompilatorowi sam ustalić typ zmiennej.",
      details: "• Działa tylko gdy zmienna ma od razu wartość początkową.\n• Czyni kod krótszym, zwłaszcza z długimi typami STL.\n• Nie oznacza 'dynamiczny typ' — typ jest stały, tylko nie wpisujesz go ręcznie.",
      example: "auto x = 5;       // int\nauto pi = 3.14;   // double\nauto s = \"hej\"; // const char*",
      question: { q: "Co robi auto?", options: ["Wnioskuje typ", "Tworzy klasę", "Usuwa zmienną"], answer: 0 },
    },
    {
      title: "const — wartość niezmienna",
      lesson: "const informuje kompilator, że wartości NIE WOLNO zmieniać.",
      details: "• const int MAX = 100; — próba MAX = 200 to błąd kompilacji.\n• Świetne do stałych konfiguracyjnych.\n• const w parametrach funkcji chroni dane przed modyfikacją.",
      example: "const double PI = 3.14159;\n// PI = 3.0; // BŁĄD",
      question: { q: "Co oznacza const?", options: ["Wartość stała", "Zmienna globalna", "Lista"], answer: 0 },
    },
    {
      title: "Pliki nagłówkowe — #include",
      lesson: "#include dodaje do programu zawartość innego pliku z gotowymi narzędziami.",
      details: "• #include <iostream> — strumienie wejścia/wyjścia.\n• #include <string> — typ string.\n• #include <vector> — vector.\n• Pliki w nawiasach <> to standardowa biblioteka.",
      example: "#include <iostream>\n#include <string>\n#include <vector>",
      question: { q: "Co robi #include?", options: ["Dodaje plik nagłówkowy", "Drukuje", "Liczy"], answer: 0 },
    },
  ],
  advanced: [
    {
      title: "Klasy — własne typy",
      lesson: "class pozwala definiować nowe typy łączące dane i funkcje.",
      details: "• Pola (dane) i metody (funkcje) w jednym miejscu.\n• Domyślnie wszystko jest private — niedostępne z zewnątrz.\n• public: udostępnia metody klientom klasy.",
      example: "class Osoba {\npublic:\n  std::string imie;\n  int wiek;\n  void przedstawSie() { cout << imie; }\n};",
      question: { q: "Czym jest klasa?", options: ["Funkcja", "Typ z polami i metodami", "Liczba"], answer: 1 },
    },
    {
      title: "Konstruktor",
      lesson: "Konstruktor to specjalna metoda, która ustawia obiekt przy tworzeniu.",
      details: "• Ma TĘ SAMĄ nazwę co klasa i NIE zwraca nic.\n• Może mieć parametry — wymuszają inicjalizację z danymi.\n• Może być kilka konstruktorów (przeciążenie).",
      example: "class Osoba {\npublic:\n  Osoba(std::string i, int w) : imie(i), wiek(w) {}\n  std::string imie;\n  int wiek;\n};",
      question: { q: "Kiedy odpala się konstruktor?", options: ["Przy tworzeniu obiektu", "Przy usuwaniu", "Nigdy"], answer: 0 },
    },
    {
      title: "Dziedziczenie",
      lesson: "Jedna klasa może odziedziczyć cechy innej.",
      details: "• class Pies : public Zwierze { ... }\n• Pies dostaje wszystkie publiczne metody Zwierzecia.\n• Pozwala unikać duplikacji kodu.",
      example: "class Zwierze { public: void jedz(); };\nclass Pies : public Zwierze {\npublic: void szczekaj();\n};",
      question: { q: "Co robi : public A?", options: ["Dziedziczy z A", "Kopiuje A", "Usuwa A"], answer: 0 },
    },
    {
      title: "Metody wirtualne i polimorfizm",
      lesson: "virtual pozwala klasie pochodnej nadpisać metodę bazową.",
      details: "• Bez virtual: zawsze odpala się wersja z typu wskaźnika.\n• Z virtual: odpala się wersja z faktycznego typu obiektu.\n• Klucz do polimorfizmu i wzorców OOP.",
      example: "class Z { public: virtual void odglos() { cout << \"...\"; } };\nclass Pies : public Z { public: void odglos() override { cout << \"Hau\"; } };",
      question: { q: "Co umożliwia virtual?", options: ["Polimorfizm", "Stałość", "Wyłącznie szybkość"], answer: 0 },
    },
    {
      title: "Szablony (templates)",
      lesson: "template pozwala pisać kod, który działa dla DOWOLNEGO typu.",
      details: "• template<typename T> void f(T x) { ... }\n• Kompilator generuje wersję dla każdego użytego typu.\n• Tak działa cały STL (vector<T>, map<K,V>, ...).",
      example: "template<typename T>\nT max(T a, T b) { return a > b ? a : b; }",
      question: { q: "Po co używamy template?", options: ["Aby pisać kod generyczny", "Aby pisać komentarze", "Aby przyspieszyć kompilację"], answer: 0 },
    },
    {
      title: "std::map — pary klucz-wartość",
      lesson: "map trzyma uporządkowane pary klucz → wartość.",
      details: "• Wymaga #include <map>.\n• Dostęp: m[\"klucz\"] = wartość;\n• Idealne do słowników i indeksów.",
      example: "#include <map>\nstd::map<std::string,int> wiek;\nwiek[\"Ola\"] = 25;",
      question: { q: "Co trzyma std::map?", options: ["Tylko klucze", "Pary klucz-wartość", "Liczby losowe"], answer: 1 },
    },
    {
      title: "Lambdy — funkcje anonimowe",
      lesson: "Lambda to funkcja zapisana w miejscu użycia, bez nazwy.",
      details: "• Składnia: [capture](params){ ciało }\n• [] — nie przechwytuje nic, [&] — przez referencję, [=] — przez wartość.\n• Świetne z algorytmami STL (std::sort, std::for_each).",
      example: "auto kwadrat = [](int x) { return x*x; };\ncout << kwadrat(5); // 25",
      question: { q: "Co to lambda?", options: ["Klasa", "Funkcja anonimowa", "Pętla"], answer: 1 },
    },
    {
      title: "Smart pointers",
      lesson: "unique_ptr i shared_ptr automatycznie zwalniają pamięć.",
      details: "• unique_ptr — jeden właściciel.\n• shared_ptr — wielu właścicieli, liczone referencje.\n• Zastępują surowe new/delete i zapobiegają wyciekom pamięci.",
      example: "#include <memory>\nauto p = std::make_unique<int>(42);\ncout << *p;",
      question: { q: "Co robi unique_ptr?", options: ["Automatycznie zarządza pamięcią", "Drukuje", "Sortuje"], answer: 0 },
    },
    {
      title: "RAII — zasoby w destruktorach",
      lesson: "RAII: zasoby zdobywamy w konstruktorze, zwalniamy w destruktorze.",
      details: "• Resource Acquisition Is Initialization.\n• Działa idealnie z wyjątkami — destruktor zawsze się odpali.\n• Stąd wezmą się smart pointery, locki, file handles.",
      example: "{\n  std::lock_guard<std::mutex> lock(m); // konstruktor: lock\n} // destruktor: unlock — gwarantowane",
      question: { q: "Co opisuje RAII?", options: ["Wzorzec zarządzania zasobami", "Rodzaj pętli", "Bibliotekę graficzną"], answer: 0 },
    },
    {
      title: "Semantyka move",
      lesson: "std::move pozwala 'przenieść' zasoby zamiast je kopiować.",
      details: "• Szybsze niż kopia dla dużych obiektów (vector, string).\n• Po move źródłowy obiekt jest w stanie 'pustym, ale poprawnym'.\n• Klucz do nowoczesnej wydajności w C++.",
      example: "std::vector<int> a = {1,2,3};\nstd::vector<int> b = std::move(a); // bez kopii",
      question: { q: "Co robi std::move?", options: ["Przenosi zasoby", "Zawsze kopiuje", "Usuwa obiekt"], answer: 0 },
    },
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
      details: base.details,
      example: base.example,
      tip: base.tip,
      question: base.question,
    });
  }
  return levels;
}

/** Quiz po każdych 10 poziomach: 5 pytań z tego bloku. */
export function buildQuiz(track: Track, quizIndex: number): Question[] {
  const levels = buildLevels(track);
  const start = quizIndex * 10;
  const block = levels.slice(start, start + 10);
  // bierzemy pytania z poziomów 1,3,5,7,9 w bloku → 5 pytań
  return [0, 2, 4, 6, 8].map((k) => block[k].question);
}

/** Egzamin końcowy: 20 pytań losowo wybranych z całego materiału (deterministycznie). */
export function buildFinalExam(track: Track): Question[] {
  const levels = buildLevels(track);
  // co 5 poziom → 20 pytań pokrywających cały kurs
  return levels.filter((_, i) => i % 5 === 0).map((l) => l.question);
}
