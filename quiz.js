import { questions } from './questions.js';
import kategorie from './categories.js';

let currentQuestionIndex = Number(localStorage.getItem('currentQuestion')) || 0;
let correctAnswersCount = JSON.parse(localStorage.getItem('correctAnswersCount')) || 0;
let correctByCategory = JSON.parse(localStorage.getItem('correctByCategory')) || {};
let correctBySuperCategory = JSON.parse(localStorage.getItem('correctBySuperCategory')) || {};
let userAnswers = JSON.parse(localStorage.getItem('userAnswers')) || {};

const questionNumberEl = document.getElementById('question-number');
const questionTextEl = document.getElementById('question-text');
const questionImageEl = document.getElementById('question-image');
const answersButtons = [
  document.getElementById('answer0'),
  document.getElementById('answer1'),
  document.getElementById('answer2'),
  document.getElementById('answer3')
];
const resultsEl = document.getElementById('results');
const radarCanvas = document.getElementById('radarChart');

// Funkcja do pobrania nadkategorii
function getSuperCategory(category) {
  for (const [superCat, subCats] of Object.entries(kategorie)) {
    if (subCats.includes(category)) return superCat;
  }
  return null;
}

function capitalizeFirstLetter(str) {
  if (!str) return ""; // sprawdzenie, czy string nie jest pusty
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// Wyświetlanie pytania
function showQuestion(index) {
  if (index >= questions.length) {
    showResults();
    return;
  }

  let q = questions[index];

  
  questionNumberEl.textContent = `Pytanie ${q.question_number} z ${questions.length}`;
  questionTextEl.textContent = q.question_text;

  // Obsługa obrazka
  questionImageEl.innerHTML = '';
  if (q.assets.length) {
    const img = document.createElement('img');
    img.src = q.assets[0];
    questionImageEl.appendChild(img);
  }

  // Wyświetlanie odpowiedzi
  answersButtons.forEach((btn, i) => {
    let ansewrString = `${q.answers[i]}`
    btn.textContent = ansewrString.charAt(0).toUpperCase() + ansewrString.slice(1);
    btn.onclick = () => handleAnswer(i);
  });
}

// Obsługa kliknięcia odpowiedzi
function handleAnswer(selected) {
  const q = questions[currentQuestionIndex];

  // Zapis użytkownika
  userAnswers[currentQuestionIndex] = selected;
  localStorage.setItem('userAnswers', JSON.stringify(userAnswers));

  // Liczenie poprawnych odpowiedzi
  if (selected === q.correct_answer) {
    correctAnswersCount++;
    correctByCategory[q.category] = (correctByCategory[q.category] || 0) + 1;
    const superCat = getSuperCategory(q.category);
    if (superCat) {
      correctBySuperCategory[superCat] = (correctBySuperCategory[superCat] || 0) + 1;
    }
  }

  // Zapis stanu
  currentQuestionIndex++;
  localStorage.setItem('currentQuestion', currentQuestionIndex);
  localStorage.setItem('correctAnswersCount', JSON.stringify(correctAnswersCount));
  localStorage.setItem('correctByCategory', JSON.stringify(correctByCategory));
  localStorage.setItem('correctBySuperCategory', JSON.stringify(correctBySuperCategory));

  showQuestion(currentQuestionIndex);
}

// Obliczenie procentów kategorii i nadkategorii
function computePercentages() {
  const totalByCategory = {};
  const percentByCategory = {};
  const totalBySuperCategory = {};
  const percentBySuperCategory = {};

  questions.forEach((q, i) => {
    const selected = userAnswers[i];

    // zwykła kategoria
    totalByCategory[q.category] = (totalByCategory[q.category] || 0) + 1;
    if (selected === q.correct_answer) {
      percentByCategory[q.category] = (percentByCategory[q.category] || 0) + 1;
    }

    // nadkategoria
    const superCat = getSuperCategory(q.category);
    if (superCat) {
      totalBySuperCategory[superCat] = (totalBySuperCategory[superCat] || 0) + 1;
      if (selected === q.correct_answer) {
        percentBySuperCategory[superCat] = (percentBySuperCategory[superCat] || 0) + 1;
      }
    }
  });

  // zamiana liczby na procenty
  for (let cat in percentByCategory) {
    percentByCategory[cat] = Math.round((percentByCategory[cat] / totalByCategory[cat]) * 100);
  }
  for (let cat in percentBySuperCategory) {
    percentBySuperCategory[cat] = Math.round((percentBySuperCategory[cat] / totalBySuperCategory[cat]) * 100);
  }

  return { percentByCategory, percentBySuperCategory, totalByCategory, totalBySuperCategory };
}

// Wyświetlanie wyników + wykres radarowy
function showResults() {
  document.getElementById('quiz').style.display = 'none';
  resultsEl.style.display = 'block';

  const { percentByCategory, percentBySuperCategory, totalByCategory, totalBySuperCategory } = computePercentages();

  // --- Oblicz potencjalny zysk punktowy ---
  const potentialByCategory = {};
  Object.entries(percentByCategory).forEach(([cat, pct]) => {
    potentialByCategory[cat] = totalByCategory[cat] - Math.round((pct/100) * totalByCategory[cat]);
  });

  const potentialBySuper = {};
  Object.entries(percentBySuperCategory).forEach(([cat, pct]) => {
    potentialBySuper[cat] = totalBySuperCategory[cat] - Math.round((pct/100) * totalBySuperCategory[cat]);
  });

  // --- Kategorie priorytetowe (top) ---
  const topSuper = Object.entries(potentialBySuper)
    .filter(([cat, potential]) => potential > 5 && percentBySuperCategory[cat] >= 20)
    .sort((a,b) => b[1] - a[1])
    .map(([cat]) => cat);

  const topCat = Object.entries(potentialByCategory)
    .filter(([cat, potential]) => potential > 5 && percentByCategory[cat] >= 20)
    .sort((a,b) => b[1] - a[1])
    .map(([cat]) => cat);

  // --- Kategorie neutralne ---
  const neutralSuper = Object.entries(potentialBySuper)
    .filter(([cat, potential]) => potential > 0 && potential <= 5 && percentBySuperCategory[cat] >= 20)
    .map(([cat]) => cat);

  const neutralCat = Object.entries(potentialByCategory)
    .filter(([cat, potential]) => potential > 0 && potential <= 5 && percentByCategory[cat] >= 20)
    .map(([cat]) => cat);

  // --- Kategorie do odpuszczenia ---
  const skipSuper = Object.entries(potentialBySuper)
    .filter(([cat, potential]) => potential === 0 || percentBySuperCategory[cat] < 20)
    .map(([cat]) => cat);

  const skipCat = Object.entries(potentialByCategory)
    .filter(([cat, potential]) => potential === 0 || percentByCategory[cat] < 20)
    .map(([cat]) => cat);

  // --- Sortowanie malejąco wg procentu ---
  const sortedSuper = Object.entries(percentBySuperCategory)
    .sort((a,b) => b[1] - a[1]);
  const sortedCat = Object.entries(percentByCategory)
    .sort((a,b) => b[1] - a[1]);

  // --- Generowanie HTML ---
  const zdales = correctAnswersCount >= 270
  let html = zdales ? `<h1 class='zdales tak'>GRATULACJĘ! ZDAŁEŚ EGZAMIN - Masz ${correctAnswersCount} punktów!</h1> <h2>Zdajesz od 270 punktów z 437 wszystkich</h2>` : `<h1 class='zdales nie'>NIE ZDAŁEŚ EGZAMINU - Brakło Ci ${270 - correctAnswersCount} punktów.</h1> <h2>Zdajesz od 270 punktów z 437 wszystkich</h2>`

  // --- Porada naukowa ---
  html += `<p class="advice">`;

  if (topSuper.length || topCat.length) {
    html += `<span class="idk">Skup się na tym:</span>
      <span class="kategoria">Kategorie:</span> ${topSuper.join(', ') || 'brak'}<br>
      <span class="przedmiot">Przedmioty:</span> ${topCat.join(', ') || 'brak'}<br>`;
  }

  if (neutralSuper.length || neutralCat.length) {
    html += `<span class="idk">Neutralne (można uczyć w drugiej kolejności):</span>
      <span class="kategoria">Kategorie:</span> ${neutralSuper.join(', ') || 'brak'}<br>
      <span class="przedmiot">Przedmioty:</span> ${neutralCat.join(', ') || 'brak'}<br>`;
  }

  if (skipSuper.length || skipCat.length) {
    html += `<span class="idk">Możesz odpuścić (jesteś beznadziejny/a):</span>
      <span class="kategoria">Kategorie:</span> ${skipSuper.join(', ') || 'brak'}<br>
      <span class="przedmiot">Przedmioty:</span> ${skipCat.join(', ') || 'brak'}`;
  }

  html += `</p>`;

  // --- Wyniki ogólne ---
  html += `<p class="wynik">Poprawne odpowiedzi: ${correctAnswersCount} / ${questions.length}</p>`;

  html += `<h3 class="tytul">Poprawne odpowiedzi według kategorii:</h3><ul class="lista">`;
  sortedSuper.forEach(([cat, pct]) => {
    const correct = Math.round((pct/100) * totalBySuperCategory[cat]);
    html += `<li>${cat}: ${correct} / ${totalBySuperCategory[cat]} (${pct}%)</li>`;
  });
  html += `</ul>`;

  html += `<h3 class="tytul">Poprawne odpowiedzi według przedmiotów:</h3><ul class="lista">`;
  sortedCat.forEach(([cat, pct]) => {
    const correct = Math.round((pct/100) * totalByCategory[cat]);
    html += `<li>${cat}: ${correct} / ${totalByCategory[cat]} (${pct}%)</li>`;
  });
  html += `</ul>`;

  resultsEl.innerHTML = html;

  // --- Radar kategorii ---
  new Chart(radarCanvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: sortedSuper.map(([cat]) => cat),
      datasets: [{
        label: 'Procent poprawnych odpowiedzi w kategoriach',
        data: sortedSuper.map(([cat, pct]) => pct),
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: { r: {
        
        beginAtZero: true,
         max: 100 ,
         ticks: {
          font: { size: 14 }  // rozmiar czcionki liczby na skali
        },
        pointLabels: {
          font: { size: 14 }  // rozmiar nazw kategorii wokół radaru
        }

      } },
      layout: { padding: 10 },
      plugins: { legend: { position: 'top' } }
    },
    plugins: [{
      id: 'canvasBackgroundColor',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff'; // tło dopiero przy wyświetlaniu
        ctx.fillRect(0,0,chart.width, chart.height);
        ctx.restore();
      }
    }]
  });
}






// Start quizu
showQuestion(currentQuestionIndex);
