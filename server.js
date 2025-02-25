const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active games and player mappings
const finderQueue = [];
const breakerQueue = [];
const activeGames = new Map(); // Stores { matchId: { finder, breaker, currentTurn, grid } }

// Helper function to enqueue players
function enqueue(role, playerInfo) {
    if (role === 'finder') {
        finderQueue.push(playerInfo);
    } else if (role === 'breaker') {
        breakerQueue.push(playerInfo);
    }
}

// Helper function to find matches
function processMatches() {
    while (finderQueue.length > 0 && breakerQueue.length > 0) {
        const finder = finderQueue.shift();
        const breaker = breakerQueue.shift();

        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const initialGrid = Array(7).fill().map(() => Array(7).fill(0));

        // Initialize game state with timers
        activeGames.set(matchId, {
            finder,
            breaker,
            currentTurn: finder.id,
            grid: initialGrid,
            finderTime: 180, // Finder starts with 3 minutes
            breakerTime: 15, // Breaker gets 15 seconds per move
            finderTimer: null,
            breakerTimer: null,
        });

       
        

        // Notify players
        io.to(finder.socket).emit('matchFound', { matchId, role: 'finder', opponent: breaker.id });
        io.to(breaker.socket).emit('matchFound', { matchId, role: 'breaker', opponent: finder.id });
    

        // Send game start details
        io.to(finder.socket).emit('gameStart', {
            role: 'finder',
            opponentId: breaker.id,
            currentTurn: finder.id,
            playerId: finder.id,
            grid: initialGrid,
        });

        io.to(breaker.socket).emit('gameStart', {
            role: 'breaker',
            opponentId: finder.id,
            currentTurn: finder.id,
            playerId: breaker.id,
            grid: initialGrid,
        });

        console.log('Game started:', { matchId, finder: finder.id, breaker: breaker.id });
    }
}
function startFinderTimer(matchId) {
    const game = activeGames.get(matchId);
    if (!game) return; 

    
    clearInterval(game.finderTimer);
    clearInterval(game.breakerTimer);
    game.breakerTime = 15;
    io.to(game.finder.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });
    io.to(game.breaker.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });

    
    game.finderTimer = setInterval(() => {
        if (game.finderTime > 0) {
            game.finderTime--;
            io.to(game.finder.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });
            io.to(game.breaker.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });
        } else {
            clearInterval(game.finderTimer);
            io.to(game.finder.socket).emit('gameOver', { resultMessage: "You Failed To Find Route. Breaker Wins." });
            io.to(game.breaker.socket).emit('gameOver', { resultMessage: "You Win! You Broke all Routes." });
            activeGames.delete(matchId);
        }
    }, 1000);
}
function startBreakerTimer(matchId) {
    const game = activeGames.get(matchId);
    if (!game) return;

    clearInterval(game.finderTimer);
    clearInterval(game.breakerTimer);

    game.breakerTime = 15;

    io.to(game.finder.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });
    io.to(game.breaker.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });

    game.breakerTimer = setInterval(() => {
        if (game.breakerTime > 0) {
            game.breakerTime--;
            io.to(game.finder.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });
            io.to(game.breaker.socket).emit('timerUpdate', { finderTime: game.finderTime, breakerTime: game.breakerTime });
        } else {
            clearInterval(game.breakerTimer);
            changeTurn(matchId);
            endTurn(matchId);
            io.to(game.finder.socket).emit('updateTurn', {currentTurn: game.currentTurn});
            io.to(game.breaker.socket).emit('updateTurn', {currentTurn: game.currentTurn});
        }
    }, 1000);
}
function changeTurn(matchId){
    const game = activeGames.get(matchId);
    if (!game) return;
    console.log(game.currentTurn);
    if (game.currentTurn === game.breaker.id){
        console.log(game.finder.id);
        game.currentTurn = game.finder.id;
        console.log(game.currentTurn);
    }
    
}
function endTurn(matchId) {
    const game = activeGames.get(matchId);
    if (!game) return;
    
    if (game.currentTurn === game.finder.id) {
        startFinderTimer(matchId);
    } else {
        startBreakerTimer(matchId);
    }

}
function finalTimer(matchId){
    const game = activeGames.get(matchId);
    clearInterval(game.finderTimer);
    game.finderTime = 15;
    startFinderTimer(matchId);
}
io.on('connection', (socket) => {
    // When a player joins the queue
    socket.on('joinQueue', ({ role, playerId }) => {
        const playerInfo = { id: playerId, socket: socket.id };
        enqueue(role, playerInfo);
        processMatches();
    });

    // When a player reconnects
    socket.on('rejoinGame', ({ matchId, role }) => {
        if (activeGames.has(matchId)) {
            const game = activeGames.get(matchId);

            // Update player's socket ID
            if (role === 'finder') game.finder.socket = socket.id;
            if (role === 'breaker') game.breaker.socket = socket.id;

            // Send updated game state
            io.to(socket.id).emit('gameStart', {
                role,
                opponentId: role === 'finder' ? game.breaker.id : game.finder.id,
                currentTurn: game.currentTurn,
                playerId: role === 'finder' ? game.finder.id : game.breaker.id,
                grid: game.grid,
            });
        } else {
            console.log(`Invalid match ID: ${matchId}`);
            socket.emit('error', 'Match not found.');
        }
    });

    // Handle turn end and grid updates
    socket.on('endTurn', ({matchId, onesArray, twosArray, selectedXArray, routedOneArray, routedTwoArray}) => {
        if (activeGames.has(matchId)) {
            const game = activeGames.get(matchId);
            
            game.currentTurn = (game.currentTurn === game.finder.id) ? game.breaker.id : game.finder.id;
            endTurn(matchId);
            // Send updated state to both players
            io.to(game.finder.socket).emit('updateGrid', { onesArray, twosArray, selectedXArray, routedOneArray, routedTwoArray, currentTurn: game.currentTurn });
            io.to(game.breaker.socket).emit('updateGrid', { onesArray, twosArray, selectedXArray, routedOneArray, routedTwoArray, currentTurn: game.currentTurn });

        }
    });
    socket.on('buildRoute', ({matchId, onesArray, twosArray, selectedXArray, frozenOneArray, frozenTwoArray, frozenXArray, discoverableOneArray, discoverableTwoArray, routedOneArray, routedTwoArray}) => {
        
        if (activeGames.has(matchId)) {
            const game = activeGames.get(matchId);
    
            // Send updated state to both players
            io.to(game.finder.socket).emit('updateRoute', {onesArray, twosArray, selectedXArray, frozenOneArray, frozenTwoArray, frozenXArray, discoverableOneArray, discoverableTwoArray, routedOneArray, routedTwoArray});
            io.to(game.breaker.socket).emit('updateRoute', {onesArray, twosArray, selectedXArray, frozenOneArray, frozenTwoArray, frozenXArray, discoverableOneArray, discoverableTwoArray, routedOneArray, routedTwoArray});
    
           
        }
    });
    socket.on("initialiseRoute", ({matchId}) => {finalTimer(matchId)});
  
socket.on('disconnect', () => {
    console.log("player disconnected");
});

    // Server listens for gameOver event from the finder
    socket.on("gameOver", ({ matchId, resultMessage, role }) => {
        console.log("Received game over:", matchId, resultMessage, role);
    
        // Get the game from activeGames
        const game = activeGames.get(matchId);
        
        if (game) {
            let messageForBreaker;
    
            // If the finder won, the breaker failed to break the route
            if (role === "finder") {
                messageForBreaker = "You Failed to Break Route";
            } else {
                // If the breaker won, the finder failed to find the route
                messageForBreaker = "You Failed to Find the Route";
            }
    
            // Emit the result to the breaker (opposite message from the one emitted by the finder)
            const breakerSocket = game.breaker.socket;
            io.to(breakerSocket).emit("gameOver", { resultMessage: messageForBreaker });
    
            // Emit the result to the finder (they already emitted their own message)
            io.to(game.finder.socket).emit("gameOver", { resultMessage });
        }
    });
});

// Start server
http.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

