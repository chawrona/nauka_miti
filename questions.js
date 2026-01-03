async function loadAllQuestions() {
  const allQuestions = [];
  
  for (let i = 1; i <= 9; i++) {
    try {
      const response = await fetch(`${i}.json`);
      const data = await response.json();
      
      allQuestions.push(...data.questions);
    } catch (error) {
      console.error(`Błąd wczytywania pliku ${i}.json:`, error);
    }
  }
  
  return allQuestions;
}


export let questions = await loadAllQuestions()