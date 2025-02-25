const socket = io();
let playerId = null;

// Generate a unique player ID when the page loads
function generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize when the page loads
window.onload = () => {
    playerId = generatePlayerId();

    document.getElementById('finderButton').addEventListener('click', () => joinGame('finder'));
    document.getElementById('breakerButton').addEventListener('click', () => joinGame('breaker'));
};

function joinGame(role) {
    // Store the role and playerId in sessionStorage to use on waiting.html
    sessionStorage.setItem("playerRole", role);
    sessionStorage.setItem("playerId", playerId);

    // Redirect to waiting page
    window.location.href = "waiting.html";
}

//creates grid for display on play page
document.addEventListener("DOMContentLoaded", () => {
  const landingGridContainer = document.getElementById("landing-grid");

  for (let i = 0; i < 49; i++) {
      const cellElement = document.createElement("div");
      cellElement.className = "cell empty"; // Same styles as game grid
      cellElement.dataset.index = i;
      
      if (i === 0) {
          cellElement.classList.add("special");
          cellElement.style.backgroundColor = "purple";
      }

      landingGridContainer.appendChild(cellElement);
  }
});

