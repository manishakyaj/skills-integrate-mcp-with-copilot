document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLogin = document.getElementById("close-login");

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  function isTeacherLoggedIn() {
    return !!localStorage.getItem("token");
  }

  function updateUIForAuth() {
    const loggedIn = isTeacherLoggedIn();
    if (loggedIn) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      signupForm.classList.add("hidden");
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      signupForm.classList.remove("hidden");
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=''>-- Select an activity --</option>";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Show delete button only for logged in teachers
        const deleteButtons = isTeacherLoggedIn()
          ? details.participants
              .map(
                (email) =>
                  `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
              )
              .join("")
          : details.participants
              .map((email) => `<li><span class="participant-email">${email}</span></li>`)
              .join("");

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${deleteButtons}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (if any)
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      updateUIForAuth();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality (teachers only)
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    const token = localStorage.getItem("token");
    if (!token) {
      showMessage("Teacher login required to perform this action.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission (teachers only)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    const token = localStorage.getItem("token");
    if (!token) {
      showMessage("Teacher login required to perform this action.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Login/logout flow
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  closeLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok && result.token) {
        localStorage.setItem("token", result.token);
        loginModal.classList.add("hidden");
        showMessage("Logged in as teacher", "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "Invalid credentials", "error");
      }
    } catch (error) {
      showMessage("Failed to log in. Please try again.", "error");
      console.error("Login error:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch("/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("token");
    showMessage("Logged out", "info");
    fetchActivities();
  });

  // Initialize app
  updateUIForAuth();
  fetchActivities();
});