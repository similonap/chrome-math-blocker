// Select DOM Elements
const targetDomainEl = document.getElementById('target-domain');
const quizBodyEl = document.getElementById('quiz-body');
const successBodyEl = document.getElementById('success-body');
const currentQuestionNumEl = document.getElementById('current-question-num');
const totalQuestionsNumEl = document.getElementById('total-questions-num');
const progressFillEl = document.getElementById('progress-fill');
const equationDisplayEl = document.getElementById('equation-display');
const answerInputEl = document.getElementById('answer-input');
const feedbackMsgEl = document.getElementById('feedback-msg');
const btnCancelEl = document.getElementById('btn-cancel');
const quizCardEl = document.getElementById('quiz-card');

// Global Quiz State
let targetUrl = '';
let targetDomain = '';
let difficulty = 'medium';
let totalQuestions = 5;
let currentQuestionIndex = 0;
let questions = [];

// Parse domain and URL from Hash
function initUrl() {
  const hash = window.location.hash;
  if (hash) {
    targetUrl = decodeURIComponent(hash.slice(1));
    try {
      const urlObj = new URL(targetUrl);
      targetDomain = urlObj.hostname;
      if (targetDomain.startsWith('www.')) {
        targetDomain = targetDomain.slice(4);
      }
    } catch (e) {
      targetDomain = 'this website';
      targetUrl = 'https://google.com';
    }
  } else {
    targetDomain = 'Blocked Site';
    targetUrl = 'https://google.com';
  }
  targetDomainEl.textContent = targetDomain;
}

// Generate math challenges dynamically based on difficulty
function generateQuestion(diff) {
  let num1, num2, op, answer;
  const basicOps = ['+', '-'];
  
  if (diff === 'easy') {
    // Basic addition/subtraction
    num1 = Math.floor(Math.random() * 15) + 1; // 1-15
    num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    op = basicOps[Math.floor(Math.random() * basicOps.length)];
    
    // Prevent negative numbers
    if (op === '-' && num1 < num2) {
      const temp = num1;
      num1 = num2;
      num2 = temp;
    }
    answer = op === '+' ? num1 + num2 : num1 - num2;
    
  } else if (diff === 'hard') {
    // Triple digits addition/subtraction, double digit multiplication, division
    const hardOps = ['+', '-', '*', '/'];
    op = hardOps[Math.floor(Math.random() * hardOps.length)];
    
    if (op === '*') {
      num1 = Math.floor(Math.random() * 15) + 10; // 10-24
      num2 = Math.floor(Math.random() * 9) + 3;   // 3-11
      answer = num1 * num2;
    } else if (op === '/') {
      num2 = Math.floor(Math.random() * 9) + 2;   // 2-10 divisor
      answer = Math.floor(Math.random() * 12) + 4; // 4-15 quotient
      num1 = num2 * answer; // ensure clean division
    } else {
      num1 = Math.floor(Math.random() * 400) + 100; // 100-499
      num2 = Math.floor(Math.random() * 200) + 50;  // 50-249
      if (op === '-' && num1 < num2) {
        const temp = num1;
        num1 = num2;
        num2 = temp;
      }
      answer = op === '+' ? num1 + num2 : num1 - num2;
    }
  } else {
    // Medium (Default): Two digits addition/subtraction, single digit multiplication
    const medOps = ['+', '-', '*'];
    op = medOps[Math.floor(Math.random() * medOps.length)];
    
    if (op === '*') {
      num1 = Math.floor(Math.random() * 10) + 2; // 2-11
      num2 = Math.floor(Math.random() * 9) + 2;  // 2-10
      answer = num1 * num2;
    } else {
      num1 = Math.floor(Math.random() * 80) + 10; // 10-89
      num2 = Math.floor(Math.random() * 50) + 10; // 10-59
      if (op === '-' && num1 < num2) {
        const temp = num1;
        num1 = num2;
        num2 = temp;
      }
      answer = op === '+' ? num1 + num2 : num1 - num2;
    }
  }

  // Use clean math symbols for UI
  const displaySymbols = {
    '+': '+',
    '-': '-',
    '*': '×',
    '/': '÷'
  };

  return {
    text: `${num1} ${displaySymbols[op]} ${num2}`,
    answer: answer
  };
}

// Prepare the challenges array
function setupQuestions() {
  questions = [];
  for (let i = 0; i < totalQuestions; i++) {
    questions.push(generateQuestion(difficulty));
  }
  totalQuestionsNumEl.textContent = totalQuestions;
  renderActiveQuestion();
}

// Display active question in UI
function renderActiveQuestion() {
  if (currentQuestionIndex < totalQuestions) {
    const q = questions[currentQuestionIndex];
    equationDisplayEl.textContent = q.text;
    currentQuestionNumEl.textContent = currentQuestionIndex + 1;
    
    // Update progress bar
    const progressPercent = (currentQuestionIndex / totalQuestions) * 100;
    progressFillEl.style.width = `${progressPercent}%`;
    
    answerInputEl.value = '';
    answerInputEl.focus();
  }
}

// Trigger error animation (shake card) and update feedback text
function triggerErrorFeedback(msg) {
  feedbackMsgEl.textContent = msg;
  feedbackMsgEl.className = 'feedback-msg error';
  
  quizCardEl.classList.add('shake');
  setTimeout(() => {
    quizCardEl.classList.remove('shake');
  }, 500);
}

// Verify input answer
function checkAnswer() {
  const userAnswer = parseInt(answerInputEl.value.trim(), 10);
  
  if (isNaN(userAnswer)) {
    triggerErrorFeedback('Please enter a valid number.');
    return;
  }

  const currentQ = questions[currentQuestionIndex];
  
  if (userAnswer === currentQ.answer) {
    // Correct! Go to next question
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= totalQuestions) {
      // Completed all questions!
      progressFillEl.style.width = '100%';
      handleQuizSuccess();
    } else {
      feedbackMsgEl.textContent = 'Correct! Next question...';
      feedbackMsgEl.className = 'feedback-msg success-text';
      setTimeout(() => {
        if (currentQuestionIndex < totalQuestions) {
          feedbackMsgEl.textContent = 'Solve to unlock. Press Enter to submit.';
          feedbackMsgEl.className = 'feedback-msg';
        }
        renderActiveQuestion();
      }, 400);
    }
  } else {
    // Incorrect
    triggerErrorFeedback('Incorrect. Try again!');
    answerInputEl.value = '';
    answerInputEl.focus();
  }
}

// Unlock domain and redirect user
function handleQuizSuccess() {
  // Hide quiz elements, show success panel
  quizBodyEl.classList.add('hidden');
  successBodyEl.classList.remove('hidden');
  
  // Inform background script to whitelist domain
  chrome.runtime.sendMessage({ action: 'unlockDomain', domain: targetDomain }, (response) => {
    console.log('Unlock response:', response);
    
    // Redirect back to target URL after short delay
    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 1500);
  });
}

// Handle Cancel - Redirect to search/new tab
function handleCancel() {
  window.location.replace('https://www.google.com');
}

// Initialize the screen
window.addEventListener('DOMContentLoaded', () => {
  initUrl();
  
  // Fetch configurations from storage
  chrome.storage.local.get(['difficulty', 'questionCount'], (data) => {
    difficulty = data.difficulty || 'medium';
    totalQuestions = data.questionCount || 5;
    
    setupQuestions();
  });
  
  // Setup Event Listeners
  answerInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  });

  btnCancelEl.addEventListener('click', handleCancel);
});
