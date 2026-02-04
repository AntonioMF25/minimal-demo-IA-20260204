document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: obtener iniciales desde email/username
  function getInitials(identifier) {
    if (!identifier) return "";
    const name = String(identifier).split("@")[0];
    const parts = name.split(/[\.\-_]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (show up to 6 avatars, then +N). Add remove "X" for each participant.
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const visible = participants.slice(0, 6);
        const hiddenCount = Math.max(0, participants.length - visible.length);

        let participantsHtml = `<div class="participants"><span class="label">Participantes:</span><div class="participant-list">`;
        visible.forEach((p) => {
          const initials = getInitials(p);
          // Each participant has an avatar and a small remove button ("X")
          participantsHtml += `<div class="participant"><div class="participant-avatar" title="${p}" aria-label="${p}">${initials}</div><button class="participant-remove" data-email="${p}" data-activity="${name}" aria-label="Remove ${p}">×</button></div>`;
        });
        if (hiddenCount > 0) {
          participantsHtml += `<div class="participant-more" title="${hiddenCount} más" aria-label="${hiddenCount} más">+${hiddenCount}</div>`;
        }
        participantsHtml += `</div></div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown (avoid duplicates)
        const exists = Array.from(activitySelect.options).some((o) => o.value === name);
        if (!exists) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          activitySelect.appendChild(option);
        }
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list automatically after successful signup
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle participant remove (delegation)
  activitiesList.addEventListener("click", async (e) => {
    if (e.target.matches(".participant-remove")) {
      const email = e.target.dataset.email;
      const activity = e.target.dataset.activity;
      if (!confirm(`Remove ${email} from ${activity}?`)) return;
      try {
        const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, { method: "DELETE" });
        const result = await resp.json();
        if (resp.ok) {
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
          // Refresh list
          fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "An error occurred";
          messageDiv.className = "error";
        }
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      } catch (error) {
        messageDiv.textContent = "Failed to remove participant. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        console.error("Error removing participant:", error);
      }
    }
  });

  // Initialize app
  fetchActivities();
});
