async function loadAllQuestions() {
  const allQuestionsMap = new Map(); // mapujemy po question_number

  // 1️⃣ Wczytanie plików 1–9
  for (let i = 1; i <= 9; i++) {
    try {
      const response = await fetch(`${i}.json`);
      const data = await response.json();

      data.questions.forEach(q => {
        allQuestionsMap.set(q.question_number, q); // dodajemy lub nadpisujemy
      });
    } catch (error) {
      console.error(`Błąd wczytywania pliku ${i}.json:`, error);
    }
  }

  // 2️⃣ Wczytanie pliku 10.json i nadpisanie istniejących pytań
  try {
    const response10 = await fetch(`10.json`);
    const data10 = await response10.json();

    data10.questions.forEach(q => {
      allQuestionsMap.set(q.question_number, q); // nadpisuje wcześniejsze pytania o tym samym numerze
    });
  } catch (error) {
    console.error(`Błąd wczytywania pliku 10.json:`, error);
  }

  // 3️⃣ Zamiana mapy na tablicę, posortowana po numerze pytania
  const allQuestions = Array.from(allQuestionsMap.values())
                            .sort((a, b) => a.question_number - b.question_number);

  return allQuestions;
}

export let questions = await loadAllQuestions();
