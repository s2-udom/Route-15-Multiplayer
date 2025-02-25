const socket = io();
const role = sessionStorage.getItem("playerRole");
const playerId = sessionStorage.getItem("playerId");

// Display correct status message
document.getElementById("queue-status").textContent = `Searching for a ${role === 'finder' ? 'Breaker' : 'Finder'}...`;

// Emit joinQueue event when waiting page loads
socket.emit('joinQueue', { role, playerId });

// Listen for matchFound and redirect to game page
socket.on('matchFound', (matchData) => {
    window.location.href = `/game.html?matchId=${matchData.matchId}&role=${matchData.role}`;
});
