// GitHub configuration
const GITHUB_CONFIG = {
  owner: "lechiben", // Your GitHub username
  repo: "word-of-the-day", // Your repository name
  branch: "main", // or 'master' depending on your repo
  file: "gre-words.json",
};

// Construct URLs
const WORDS_JSON_URL = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.file}`;
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.file}?ref=${GITHUB_CONFIG.branch}`;

// Cache for words data
let wordsData = [];
let isDataLoaded = false;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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

// Chrome storage utilities
async function saveToStorage(key, data) {
  try {
    await chrome.storage.local.set({ [key]: data });
  } catch (error) {
    console.warn("Failed to save to storage:", error);
  }
}

async function getFromStorage(key) {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  } catch (error) {
    console.warn("Failed to get from storage:", error);
    return null;
  }
}

// Check if we need to fetch new data
async function shouldFetchNewData() {
  const cachedTime = await getFromStorage("lastFetchTime");
  const cachedData = await getFromStorage("wordsData");

  if (!cachedTime || !cachedData) {
    return true;
  }

  const timeSinceLastFetch = Date.now() - cachedTime;
  return timeSinceLastFetch > CACHE_DURATION;
}

// Load cached data if available
async function loadCachedData() {
  try {
    const cachedData = await getFromStorage("wordsData");
    const cachedTime = await getFromStorage("lastFetchTime");

    if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
      wordsData = cachedData;
      lastFetchTime = cachedTime || 0;
      isDataLoaded = true;
      console.log(`Loaded ${wordsData.length} words from cache`);
      return true;
    }
  } catch (error) {
    console.warn("Failed to load cached data:", error);
  }
  return false;
}

// Fetch words from GitHub using different methods
async function fetchWordsFromGitHub() {
  try {
    showLoadingState();

    // Method 1: Try direct raw GitHub URL first
    let response;
    let data;

    try {
      response = await fetch(WORDS_JSON_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        mode: "cors", // Explicitly set CORS mode
      });

      if (response.ok) {
        data = await response.json();
      }
    } catch (error) {
      console.warn("Raw GitHub URL failed:", error);
    }

    // Method 2: Try GitHub API if raw URL failed
    if (!data) {
      try {
        response = await fetch(GITHUB_API_URL, {
          method: "GET",
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GRE-Word-Extension",
          },
          mode: "cors",
        });

        if (response.ok) {
          const apiResponse = await response.json();
          // Decode base64 content
          const decodedContent = atob(apiResponse.content);
          data = JSON.parse(decodedContent);
        }
      } catch (error) {
        console.warn("GitHub API failed:", error);
      }
    }

    if (data && Array.isArray(data) && data.length > 0) {
      wordsData = data;
      isDataLoaded = true;
      lastFetchTime = Date.now();

      // Cache the data
      await saveToStorage("wordsData", wordsData);
      await saveToStorage("lastFetchTime", lastFetchTime);

      console.log(`Successfully loaded ${wordsData.length} words from GitHub`);
      return true;
    } else {
      throw new Error("Invalid data format received or empty array");
    }
  } catch (error) {
    console.warn("Failed to fetch words from GitHub:", error);

    // Try to load cached data as fallback
    const cachedLoaded = await loadCachedData();
    if (!cachedLoaded) {
      console.log("Using fallback words");
      wordsData = fallbackWords;
      isDataLoaded = true;
    }
    return false;
  }
}

// Check for updates periodically
async function checkForUpdates() {
  if (await shouldFetchNewData()) {
    console.log("Checking for word database updates...");
    const success = await fetchWordsFromGitHub();
    if (success) {
      const randomWord = getRandomWord();
      displayWord(randomWord);
      updateWordCountDisplay();
    }
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

// Update word count display
function updateWordCountDisplay() {
  const wordCountElement = document.getElementById("word-count");
  if (wordCountElement) {
    const cacheAge = lastFetchTime ? Date.now() - lastFetchTime : 0;
    const hoursOld = Math.floor(cacheAge / (1000 * 60 * 60));

    let statusText = `${wordsData.length} words in database`;
    if (hoursOld > 0 && hoursOld < 24) {
      statusText += ` (updated ${hoursOld}h ago)`;
    } else if (hoursOld >= 24) {
      statusText += ` (checking for updates...)`;
    }

    wordCountElement.textContent = statusText;
  }
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
    // Handle different data formats for definition and part of speech
    let definition = wordData.definition;
    let partOfSpeech = wordData.partOfSpeech;

    // Handle arrays for definitions and parts of speech
    if (Array.isArray(definition)) {
      definition = definition.join("; ");
    }
    if (Array.isArray(partOfSpeech)) {
      partOfSpeech = partOfSpeech.join(", ");
    }

    elements.word.textContent = wordData.word || "Unknown";
    elements.pronunciation.textContent = wordData.pronunciation || "";
    elements.pos.textContent = partOfSpeech || "";
    elements.definition.textContent = definition || "No definition available";
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

// Force refresh from GitHub
async function forceRefreshFromGitHub() {
  console.log("Force refreshing word database...");

  // Clear cache
  await saveToStorage("wordsData", null);
  await saveToStorage("lastFetchTime", null);

  const success = await fetchWordsFromGitHub();
  if (success) {
    const randomWord = getRandomWord();
    displayWord(randomWord);
    updateWordCountDisplay();

    // Show success message
    const wordCountElement = document.getElementById("word-count");
    if (wordCountElement) {
      const originalText = wordCountElement.textContent;
      wordCountElement.textContent = "✓ Database updated!";
      wordCountElement.style.color = "#4facfe";

      setTimeout(() => {
        updateWordCountDisplay();
        wordCountElement.style.color = "";
      }, 2000);
    }
  }
}

// Add offline/online detection
function setupNetworkHandling() {
  window.addEventListener("online", () => {
    console.log("Network connection restored");
    checkForUpdates();
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

  // Try to load cached data first for immediate display
  const cachedLoaded = await loadCachedData();

  if (cachedLoaded) {
    // Display a word immediately from cache
    const randomWord = getRandomWord();
    displayWord(randomWord);
    updateWordCountDisplay();

    // Check for updates in background
    setTimeout(checkForUpdates, 1000);
  } else {
    // No cache, fetch from GitHub
    await fetchWordsFromGitHub();
    const randomWord = getRandomWord();
    displayWord(randomWord);
    updateWordCountDisplay();
  }

  // Add event listeners
  document.getElementById("new-word-btn").addEventListener("click", () => {
    const randomWord = getRandomWord();
    displayWord(randomWord);
  });

  document
    .getElementById("pronounce-btn")
    .addEventListener("click", pronounceWord);

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

  // Add keyboard shortcut for force refresh (R key)
  document.addEventListener("keydown", (e) => {
    if (
      e.key.toLowerCase() === "r" &&
      !e.target.matches("button, input, textarea")
    ) {
      e.preventDefault();
      forceRefreshFromGitHub();
    }
  });

  // Periodically check for updates (every 30 minutes)
  setInterval(checkForUpdates, 30 * 60 * 1000);
}

// Handle page visibility changes (when tab becomes active)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkForUpdates();
  }
});

// Start the extension when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
