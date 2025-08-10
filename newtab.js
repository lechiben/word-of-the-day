// URL to your JSON file on GitHub (raw content)
const WORDS_JSON_URL =
  "https://raw.githubusercontent.com/lechiben/word-of-the-day/refs/heads/main/gre-words.json";

// Cache for words data
let wordsData = [];
let isDataLoaded = false;

// Fallback words in case GitHub fetch fails
const fallbackWords = [
  {
    word: "Abate",
    pronunciation: "/əˈbeɪt/",
    partOfSpeech: "verb",
    definition: "To reduce in intensity or amount",
    example: "The storm began to abate after midnight.",
  },
  {
    word: "Aberrant",
    pronunciation: "/æˈberənt/",
    partOfSpeech: "adjective",
    definition: "Departing from an accepted standard",
    example: "His aberrant behavior concerned his friends.",
  },
  {
    word: "Compelling",
    pronunciation: "/kəmˈpɛlɪŋ/",
    partOfSpeech: "adjective",
    definition: "Evoking interest or attention",
    example: "The documentary presented compelling evidence.",
  },
  {
    word: "Dogmatic",
    pronunciation: "/dɔɡˈmætɪk/",
    partOfSpeech: "adjective",
    definition: "Inclined to lay down principles",
    example: "His dogmatic approach alienated his colleagues.",
  },
];

// Fetch words from GitHub
async function fetchWordsFromGitHub() {
  try {
    showLoadingState();

    const response = await fetch(WORDS_JSON_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      wordsData = data;
      isDataLoaded = true;
      console.log(`Loaded ${wordsData.length} words from GitHub`);
      return true;
    } else {
      throw new Error("Invalid data format received");
    }
  } catch (error) {
    console.warn("Failed to fetch words from GitHub:", error);
    console.log("Using fallback words");
    wordsData = fallbackWords;
    isDataLoaded = true;
    return false;
  }
}

// Show loading state
function showLoadingState() {
  const elements = {
    word: document.getElementById("word-text"),
    pronunciation: document.getElementById("word-pronunciation"),
    pos: document.getElementById("word-pos"),
    definition: document.getElementById("word-definition"),
    example: document.getElementById("word-example"),
    etymology: document.getElementById("word-etymology"),
  };

  elements.word.textContent = "Loading...";
  elements.pronunciation.textContent = "";
  elements.pos.textContent = "";
  elements.definition.textContent = "Fetching words from database...";
  elements.example.textContent = "";
  elements.etymology.textContent = "";
}

// Get formatted date for display
function getFormattedDate() {
  const today = new Date();
  return today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Get random word
function getRandomWord() {
  if (!isDataLoaded || wordsData.length === 0) {
    return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
  }

  const randomIndex = Math.floor(Math.random() * wordsData.length);
  return wordsData[randomIndex];
}

// Display word with animation
function displayWord(wordData) {
  const elements = {
    word: document.getElementById("word-text"),
    pronunciation: document.getElementById("word-pronunciation"),
    pos: document.getElementById("word-pos"),
    definition: document.getElementById("word-definition"),
    example: document.getElementById("word-example"),
    etymology: document.getElementById("word-etymology"),
    etymologySection: document.getElementById("etymology-section"),
  };

  // Fade out all elements
  Object.values(elements).forEach((el) => {
    if (el) el.style.opacity = "0";
  });

  setTimeout(() => {
    elements.word.textContent = wordData.word || "Unknown";
    elements.pronunciation.textContent = wordData.pronunciation || "";
    elements.pos.textContent = wordData.partOfSpeech || "";
    elements.definition.textContent =
      wordData.definition || "No definition available";
    elements.example.textContent = wordData.example || "No example available";

    // Handle etymology (optional field)
    if (wordData.etymology) {
      elements.etymology.textContent = wordData.etymology;
      elements.etymologySection.classList.add("visible");
    } else {
      elements.etymologySection.classList.remove("visible");
    }

    // Fade in all elements
    Object.values(elements).forEach((el) => {
      if (el) el.style.opacity = "1";
    });
  }, 200);
}

// Text-to-speech pronunciation
function pronounceWord() {
  const word = document.getElementById("word-text").textContent;
  if (
    "speechSynthesis" in window &&
    word &&
    word !== "Loading..." &&
    word !== "Unknown"
  ) {
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Try to use a more natural voice if available
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) =>
        voice.lang.startsWith("en") &&
        (voice.name.includes("Google") ||
          voice.name.includes("Microsoft") ||
          voice.name.includes("Natural"))
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechSynthesis.speak(utterance);
  } else if (!("speechSynthesis" in window)) {
    alert("Sorry, your browser doesn't support text-to-speech.");
  }
}

// Retry loading words
async function retryLoadWords() {
  const success = await fetchWordsFromGitHub();
  if (success) {
    // Display a new random word after successful load
    const randomWord = getRandomWord();
    displayWord(randomWord);
  }
}

// Add offline/online detection
function setupNetworkHandling() {
  window.addEventListener("online", () => {
    console.log("Network connection restored");
    if (!isDataLoaded || wordsData.length <= fallbackWords.length) {
      retryLoadWords();
    }
  });

  window.addEventListener("offline", () => {
    console.log("Network connection lost - using cached data");
  });
}

// Initialize the extension
async function init() {
  // Display current date
  document.getElementById("current-date").textContent = getFormattedDate();

  // Set up network handling
  setupNetworkHandling();

  // Fetch words from GitHub
  await fetchWordsFromGitHub();

  // Display a random word on initial load
  const randomWord = getRandomWord();
  displayWord(randomWord);

  // Update word count display
  const wordCountElement = document.getElementById("word-count");
  if (wordCountElement) {
    wordCountElement.textContent = `${wordsData.length} words in database`;
  }

  // Add event listeners
  document.getElementById("new-word-btn").addEventListener("click", () => {
    const randomWord = getRandomWord();
    displayWord(randomWord);
  });

  document
    .getElementById("pronounce-btn")
    .addEventListener("click", pronounceWord);

  // Add retry button functionality (if you add one to HTML)
  const retryBtn = document.getElementById("retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", retryLoadWords);
  }

  // Add keyboard shortcut for pronunciation (spacebar)
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.target.matches("button, input, textarea")) {
      e.preventDefault();
      pronounceWord();
    }
  });

  // Add keyboard shortcut for new word (N key)
  document.addEventListener("keydown", (e) => {
    if (
      e.key.toLowerCase() === "n" &&
      !e.target.matches("button, input, textarea")
    ) {
      e.preventDefault();
      const randomWord = getRandomWord();
      displayWord(randomWord);
    }
  });
}

// Add CSS transition for smooth word changes
const style = document.createElement("style");
style.textContent = `
    #word-text, #word-pronunciation, #word-pos, #word-definition, #word-example, #word-etymology {
        transition: opacity 0.3s ease-in-out;
    }
    
    .etymology-section {
        transition: opacity 0.3s ease-in-out;
    }
    
    .retry-btn {
        background: linear-gradient(45deg, #ff9500, #ff6b35);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-left: 10px;
        box-shadow: 0 4px 8px rgba(255, 149, 0, 0.3);
    }
    
    .retry-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 12px rgba(255, 149, 0, 0.4);
    }
    
    .loading-indicator {
        display: inline-block;
        animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Start the extension when DOM is loaded
document.addEventListener("DOMContentLoaded", init);

// Handle page visibility changes (when tab becomes active)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !isDataLoaded) {
    retryLoadWords();
  }
});
