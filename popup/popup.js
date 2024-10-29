document.addEventListener("DOMContentLoaded", function () {
  const scrapeButton = document.getElementById("scrapeButton");
  const copyButton = document.getElementById("copyButton");
  const downloadButton = document.getElementById("downloadButton");
  const outputText = document.getElementById("outputText");
  const formatSelect = document.getElementById("formatSelect");
  const includeInline = document.getElementById("includeInline");
  const includeExternal = document.getElementById("includeExternal");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const modal = document.getElementById("authModal");
  const closeBtn = document.querySelector(".close");
  const scrapeCounter = document.getElementById("scrapeCounter");
  const loggedOutButtons = document.getElementById("loggedOutButtons");
  const loggedInButtons = document.getElementById("loggedInButtons");
  const userEmail = document.getElementById("userEmail");
  const scrapeWarning = document.getElementById("scrapeWarning");

  let isLoggedIn = false;
  let remainingScrapes = 5;
  let isInitialized = false;
  downloadButton.disabled = true;

  function showNotification(message, type = "success") {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
      notification.className = "notification";
    }, 3000);
  }

  function updateAuthUI(isLoggedIn, email = "") {
    loggedOutButtons.style.display = isLoggedIn ? "none" : "flex";
    loggedInButtons.style.display = isLoggedIn ? "flex" : "none";
    if (email) userEmail.textContent = email;
  }

  function updateScrapeWarning() {
    if (remainingScrapes <= 3) {
      scrapeWarning.style.display = "block";
      scrapeWarning.textContent = isLoggedIn
        ? `Warning: Only ${remainingScrapes} premium scrapes remaining`
        : `Warning: Only ${remainingScrapes} free scrapes remaining. Login for 50 scrapes!`;
    } else {
      scrapeWarning.style.display = "none";
    }
  }

  async function checkAndResetAnonymousScrapes() {
    const lastResetDate = await chrome.storage.sync.get(["lastResetDate"]);
    const now = new Date();
    const today = now.toDateString();

    if (!lastResetDate.lastResetDate || lastResetDate.lastResetDate !== today) {
      await chrome.storage.sync.set({
        remainingScrapes: 5,
        lastResetDate: today,
      });
      remainingScrapes = 5;
      updateCounter();
      updateScrapeWarning();
    }
  }

  async function checkAuth() {
    if (isInitialized) return;

    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");

    if (token) {
      try {
        const response = await fetch("http://localhost:3000/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          isLoggedIn = true;
          remainingScrapes = data.remainingScrapes;
          downloadButton.disabled = false;
          updateAuthUI(true, email);
        } else {
          handleAuthFailure();
        }
      } catch (error) {
        handleAuthFailure();
      }
    } else {
      handleAuthFailure();
    }

    if (!isLoggedIn) {
      await checkAndResetAnonymousScrapes();
    }

    isInitialized = true;
  }

  function handleAuthFailure() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    isLoggedIn = false;
    chrome.storage.sync.get(["remainingScrapes"], function (result) {
      remainingScrapes =
        result.remainingScrapes !== undefined ? result.remainingScrapes : 5;
      updateCounter();
    });
    downloadButton.disabled = true;
    updateAuthUI(false);
  }

  function updateCounter() {
    scrapeCounter.textContent = remainingScrapes;
    if (!isLoggedIn) {
      chrome.storage.sync.set({ remainingScrapes: remainingScrapes });
    }
  }

  loginBtn.onclick = () => {
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("signupForm").style.display = "none";
    modal.style.display = "block";
  };

  signupBtn.onclick = () => {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("signupForm").style.display = "block";
    modal.style.display = "block";
  };

  logoutBtn.onclick = () => {
    localStorage.clear();
    isLoggedIn = false;
    chrome.storage.sync.get(["remainingScrapes"], function (result) {
      remainingScrapes =
        result.remainingScrapes !== undefined ? result.remainingScrapes : 5;
      updateAuthUI(false);
      updateCounter();
      updateScrapeWarning();
      downloadButton.disabled = true;
      showNotification("Successfully logged out", "success");
    });
  };

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("loginSubmit").onclick = async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        isLoggedIn = true;
        remainingScrapes = data.remainingScrapes || 50;
        downloadButton.disabled = false;
        modal.style.display = "none";
        updateAuthUI(true, email);
        updateCounter();
        updateScrapeWarning();
        showNotification("Successfully logged in", "success");
      } else {
        showNotification("Invalid email or password", "error");
      }
    } catch (error) {
      showNotification("Login failed. Please try again.", "error");
    }
  };

  document.getElementById("signupSubmit").onclick = async () => {
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
      const response = await fetch("http://localhost:3000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        isLoggedIn = true;
        remainingScrapes = 50;
        downloadButton.disabled = false;
        modal.style.display = "none";
        updateAuthUI(true, email);
        updateCounter();
        updateScrapeWarning();
        showNotification("Successfully signed up", "success");
      } else {
        showNotification(
          "Signup failed. Email might already be in use.",
          "error"
        );
      }
    } catch (error) {
      showNotification("Signup failed. Please try again.", "error");
    }
  };

  scrapeButton.addEventListener("click", async () => {
    if (remainingScrapes <= 0) {
      showNotification(
        isLoggedIn
          ? "No scrapes remaining. Please wait for tomorrow."
          : "No scrapes remaining. Please login for more scrapes!",
        "warning"
      );
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    try {
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: "scrape",
        options: {
          format: formatSelect.value,
          includeInline: includeInline.checked,
          includeExternal: includeExternal.checked,
        },
      });

      outputText.value = result.data;

      if (remainingScrapes > 0) {
        remainingScrapes--;
        updateCounter();
        updateScrapeWarning();

        if (isLoggedIn) {
          const token = localStorage.getItem("token");
          await fetch("http://localhost:3000/auth/update-scrapes", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ remainingScrapes }),
          });
        }
      }
    } catch (error) {
      showNotification("Failed to scrape page. Please try again.", "error");
    }
  });

  copyButton.addEventListener("click", () => {
    outputText.select();
    document.execCommand("copy");
    showNotification("Copied to clipboard!", "success");
  });

  downloadButton.addEventListener("click", () => {
    const content = outputText.value;
    if (!content) return;

    let filename, type;
    switch (formatSelect.value) {
      case "html":
        filename = "scraped-styles.html";
        type = "text/html";
        break;
      case "css":
        filename = "scraped-styles.css";
        type = "text/css";
        break;
      case "combined":
        filename = "scraped-styles.html";
        type = "text/html";
        break;
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });

  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  checkAuth();
});
