const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("matchId");
let playerRole = urlParams.get("role");
let currentTurnClient = null;
let playerIdClient = null;
let hasMadeMove = false; 
let firstRoute = false;


// Ensure connection and log socket ID
socket.on("connect", () => {
    if (matchId && playerRole) {
        socket.emit("rejoinGame", { matchId, role: playerRole });
    }
});

// Handle game start
socket.on("gameStart", ({ role, opponentId, currentTurn, playerId }) => {
        console.log("Game started with:", { role, opponentId, currentTurn, playerId});
        endTurnButton.disabled = true;
        playerRole = role; 
        playerIdClient = playerId;
        currentTurnClient = currentTurn; // This line should correctly assign the currentTurn.
        console.log(currentTurn);
    
    if (role === "breaker") {
        console.log('Deactivating buttons');
        document.getElementById("findRouteButton").style.display = "none";
        document.getElementById("verifyRouteButton").style.display = "none";
    }
   
});
// update grid
socket.on('updateGrid', ({ onesArray, twosArray, selectedXArray, routedOneArray, routedTwoArray, currentTurn }) => {
    console.log("Received updated grid state:", { onesArray, twosArray, selectedXArray});
    currentTurnClient = currentTurn; // This line should correctly assign the currentTurn.
    console.log(currentTurn);
    // Clear the current grid
    gridContainer.innerHTML = '';
    grid = [];

    for (let i = 0; i < 49; i++) {
        const cellInstance = new Cell('empty');

        // Check if this index should be modified
        if (onesArray.includes(i)) {
            cellInstance.setValue('frozenOne');
        } else if (twosArray.includes(i)) {
            cellInstance.setValue('frozenTwo');
        } else if (selectedXArray.includes(i)) {
            cellInstance.setValue('frozenX');
        } else if (routedOneArray.includes(i)){
            cellInstance.setValue('routedOne');
        } else if (routedTwoArray.includes(i)){
            cellInstance.setValue('routedTwo');
        }

        grid.push(cellInstance);

        const cellElement = document.createElement('div');
        cellElement.className = `cell ${cellInstance.value}`;
        cellElement.dataset.index = i;

        if (i === 0) {
            cellElement.classList.add('special');
            cellElement.style.backgroundColor = 'purple';
            cellInstance.makeImmutable();
        } else {
            cellElement.addEventListener('click', handleClick);
        }

        gridContainer.appendChild(cellElement);
    }
    updateGridUI();
    handleButtons();
    
});
// update grid when routing
socket.on('updateRoute',  ({onesArray, twosArray, selectedXArray, frozenOneArray, frozenTwoArray, frozenXArray, discoverableOneArray, discoverableTwoArray, routedOneArray, routedTwoArray}) => {
    console.log("Received updated grid state:", {discoverableOneArray, discoverableTwoArray});
 //regenerate the grid
    gridContainer.innerHTML = '';
    grid = [];

    for (let i = 0; i < 49; i++) {
        const cellInstance = new Cell('empty');

        // Check if this index should be modified
        if (onesArray.includes(i)) {
            cellInstance.setValue('frozenOne');
        } else if (twosArray.includes(i)) {
            cellInstance.setValue('frozenTwo');
        } else if (selectedXArray.includes(i)) {
            cellInstance.setValue('frozenX');
        } else if (routedOneArray.includes(i)){
            cellInstance.setValue('routedOne');
        } else if (routedTwoArray.includes(i)){
            cellInstance.setValue('routedTwo');
        } else if (frozenOneArray.includes(i)){
            cellInstance.setValue('frozenOne');
        } else if (frozenTwoArray.includes(i)){
            cellInstance.setValue('frozenTwo');
        } else if (frozenXArray.includes(i)){
            cellInstance.setValue('frozenX');
        } else if (discoverableOneArray.includes(i)){
            cellInstance.setValue('discoverableOne')
        } else if (discoverableTwoArray.includes(i)){
            cellInstance.setValue('discoverableTwo');
        } 

        grid.push(cellInstance);

        const cellElement = document.createElement('div');
        cellElement.className = `cell ${cellInstance.value}`;
        cellElement.dataset.index = i;

        if (i === 0) {
            cellElement.classList.add('special');
            cellElement.style.backgroundColor = 'purple';
            cellInstance.makeImmutable();
        } else {
            // Only add click event listener if the cell is not 'empty'
            if (cellInstance.value !== 'empty') {
                cellElement.addEventListener('click', handleClick);
            } else {
                cellElement.removeEventListener('click', handleClick);
            }
        }

        gridContainer.appendChild(cellElement);
    }
    updateGridUI();


});
socket.on("gameOver", ({ resultMessage }) => {
    console.log("Received message for breaker:", resultMessage);

    // Show the pop-up for the breaker with the received message
    showPopup(resultMessage);
    document.getElementById("endTurnButton").style.display = "none";
});
socket.on("updateTurn",({currentTurn}) =>{
    currentTurnClient = currentTurn;
});
// Cell class definition
class Cell {
    constructor(value) {
        if (['1', '2', 'tempX', 'selectedX', 'empty', 'frozenOne', 'frozenTwo', 'frozenX', 'discoverableOne', 'discoverableTwo', 'routedOne', 'routedTwo'].includes(value)) {
            this.value = value;
            this.immutable = false;
        } else {
            throw new Error("Invalid value");
        }
    }

    getValue() {
        return this.value;
    }

    setValue(newValue) {
        if (!this.isImmutable() && ['1', '2', 'tempX', 'selectedX', 'empty', 'frozenOne', 'frozenTwo', 'frozenX', 'discoverableOne', 'discoverableTwo', 'routedOne', 'routedTwo'].includes(newValue)) {
            this.value = newValue;
        } 
    }
    
    makeImmutable() {
        this.immutable = true; // Mark the cell as immutable
    }

    isImmutable() {
        return this.immutable;
    }
   
    
}

// Create the grid and map each cell to an instance of the Cell class
let grid = [];
const gridContainer = document.getElementById('grid');
let routeCounter = 0;

// Generate Grid
for (let i = 0; i < 49; i++) {
    const cellInstance = new Cell('empty');
    grid.push(cellInstance);

    const cellElement = document.createElement('div');
    cellElement.className = 'cell empty';
    cellElement.dataset.index = i;
    cellElement.textContent = '';

    if (i === 0) {
        cellElement.classList.add('special');
        cellElement.style.backgroundColor = 'purple';
        cellInstance.makeImmutable();
    } else {
        cellElement.addEventListener('click', handleClick);
    }

    gridContainer.appendChild(cellElement);
    findRouteButton.disabled = true;
    verifyRouteButton.disabled = true;
}

// Handle clicks on cells
function handleClick(event) {
    
    if (playerIdClient !== currentTurnClient) {
        console.log('not current turn');
        return;
    }

    const clickedCellElement = event.target;
    const cellIndex = parseInt(clickedCellElement.dataset.index);
    const clickedCell = grid[cellIndex];

    if (clickedCell.isImmutable()) {
        return;
    }

    const value = clickedCell.getValue();

    if (value === 'empty') {

        grid.forEach(cell => {
            if (!cell.isImmutable() && ['1', '2', 'tempX', 'selectedX'].includes(cell.getValue())) {
                cell.setValue('empty');
            }
        });
        clickedCell.setValue('1');
        endTurnButton.disabled = false;
        findRouteButton.disabled = true;
    } 
    
        else if (value === '1') {
        const adjacentIndices = getAdjacentIndices(cellIndex);
        adjacentIndices.forEach(index => {
            if (!grid[index].isImmutable() && ['empty', 'tempX', 'selectedX'].includes(grid[index].getValue())) {
                grid[index].setValue('tempX');
            }
        });
        clickedCell.setValue('2');
        endTurnButton.disabled = true;

    } 
    

    else if (value === '2') {
        grid.forEach(cell => {
            if (!cell.isImmutable() && ['1', '2', 'tempX', 'selectedX'].includes(cell.getValue())) {
                cell.setValue('empty');
            }
        });
        endTurnButton.disabled = false;
    } 
    
    
    else if (value === 'tempX') {
        clickedCell.setValue('selectedX');
        grid.forEach(cell => {
            if (!cell.isImmutable() && cell.getValue() === 'tempX') {
                cell.setValue('empty');
            }
        });
        endTurnButton.disabled = false;
        

    } 
    
    else if (value === 'selectedX') {
        grid.forEach(cell => {
            if (!cell.isImmutable() && ['1', '2', 'tempX', 'selectedX'].includes(cell.getValue())) {
                cell.setValue('empty');
            }
        });
        endTurnButton.disabled = false;
    }
    
    else if (value === 'frozenOne' || value === 'frozenTwo' || value === 'frozenX'){
        return;
    }
  
    else  if (value === 'discoverableOne') {
        routeCounter++;
        // Change clicked cell to 'routed'
        clickedCell.setValue('routedOne');
        // Revert all other discoverable cells back to 'frozen'
        grid.forEach(cell => {
            if (cell.getValue() === 'discoverableOne') {
                cell.setValue('frozenOne');
        
            }
            else if (cell.getValue() === 'discoverableTwo'){
                cell.setValue('frozenTwo')
            }
          
        });
        const adjacentIndices = getAdjacentIndices(cellIndex);
        adjacentIndices.forEach(index => {
            const adjacentCell = grid[index];
            // Only set adjacent cells to 'discoverable' if they are not 'X' or 'frozen'
            if (adjacentCell.getValue() === 'frozenOne' && adjacentCell.getValue() !== 'routedOne' && adjacentCell.getValue() !== 'routedTwo' && adjacentCell.getValue() !== 'empty') {
                adjacentCell.setValue('discoverableOne');
                console.log('adjacent cell is now a discoverableOne');
                
            }
            else if (adjacentCell.getValue() === 'frozenTwo' && adjacentCell.getValue() !== 'routedOne' && adjacentCell.getValue() !== 'routedTwo' && adjacentCell.getValue() !== 'empty'){
                adjacentCell.setValue('discoverableTwo');
                console.log('adjacent cell is now a discoverableTwo');
               
            }
        });
        buildRoute();
    }
    
    else if (value === 'discoverableTwo') {
        routeCounter = routeCounter + 2;
        // Change clicked cell to 'routed'
        clickedCell.setValue('routedTwo');
        // Revert all other discoverable cells back to 'frozen'
        grid.forEach(cell => {
            if (cell.getValue() === 'discoverableOne') {
                cell.setValue('frozenOne');
        
            }
            else if (cell.getValue() === 'discoverableTwo'){
                cell.setValue('frozenTwo')
            }
          
        });
        const diagonalIndices = getDiagonalIndices(cellIndex);
        diagonalIndices.forEach(index => {
            const diagonalCell = grid[index];
            // Only set diagonal cells to 'discoverable' if they are not 'X' or 'frozen'
            if (diagonalCell.getValue()=== 'frozenOne' && diagonalCell.getValue() !== 'routedOne' && diagonalCell.getValue() !== 'routedTwo'&& diagonalCell.getValue() !== 'empty') {
                diagonalCell.setValue('discoverableOne');
                console.log('diagonal cell is now a discoverableOne');
                
            }
            else if (diagonalCell.getValue() === 'frozenTwo' && diagonalCell.getValue() !== 'routedOne' && diagonalCell.getValue() !== 'routedTwo' && diagonalCell.getValue() !== 'empty' ){
                diagonalCell.setValue('discoverableTwo');
                console.log('diagonal cell is now a discoverableTwo');
               
            }
        });
        buildRoute();
    }
    
    updateGridUI();
    
}


// Helper function to get adjacent indices in the grid
function getAdjacentIndices(index) {
    const adjacent = [];
    const row = Math.floor(index / 7);
    const col = index % 7;

    if (row > 0) adjacent.push(index - 7);
    if (row < 6) adjacent.push(index + 7);
    if (col > 0) adjacent.push(index - 1);
    if (col < 6) adjacent.push(index + 1);

    return adjacent;
}

// Helper function to get diagonal indices
function getDiagonalIndices(index) {
    const diagonals = [];
    const row = Math.floor(index / 7);
    const col = index % 7;

    if (row > 0 && col > 0) diagonals.push(index - 8);
    if (row > 0 && col < 6) diagonals.push(index - 6);
    if (row < 6 && col > 0) diagonals.push(index + 6);
    if (row < 6 && col < 6) diagonals.push(index + 8);

    return diagonals;
}

// Function to update the UI
function updateGridUI() {
    const cellElements = document.querySelectorAll('.cell');
    cellElements.forEach((cellElement, index) => {
        const cell = grid[index];
        const cellValue = cell.getValue();
        

        // Reset class
        cellElement.className = 'cell';

        let displayText = '';
        if (cellValue === 'routedOne') {
            displayText = '1';
        } 
        else if (cellValue === 'routedTwo'){
            displayText = '2';
        }
        else if (cellValue === 'discoverableOne'){
            displayText = '1';
        } 
        else if (cellValue === 'discoverableTwo'){
            displayText = '2';
        }

        else if (cellValue === 'frozenOne'){
            displayText = '1';
        }
        else if (cellValue === 'frozenTwo'){
            displayText = '2';
        }
        else if (cellValue === 'frozenX'){
            displayText = 'X';
        }
        else if (cellValue === '1') {
            displayText = '1';
        } else if (cellValue === '2') {
            displayText = '2';
        } else if (cellValue === 'tempX' || cellValue === 'selectedX') {
            displayText = 'X';
        }
        
        // Apply the display text to the cell element
        cellElement.textContent = displayText;
        

        // Apply data-content for CSS
        cellElement.setAttribute('data-content', displayText);

        // Specifically add class for routed cells
        if (cellValue === 'routedOne' || cellValue === 'routedTwo') {
            cellElement.classList.add('routed');
        }
    });
}
// Function to handle the end of a turn
function endTurn() {
    const onesArray = [];
    const twosArray = [];
    const selectedXArray = [];
    const routedOneArray = [];
    const routedTwoArray = [];

    grid.forEach((cell, index) => {
        if (!cell.isImmutable()) {
            if (cell.getValue() === '1') {
                onesArray.push(index);
            } else if (cell.getValue() === '2') {
                twosArray.push(index);
            } else if (cell.getValue() === 'selectedX') {
                selectedXArray.push(index);
            } else if (cell.getValue() === 'frozenOne'){
                onesArray.push(index);
            } else if (cell.getValue() === 'frozenTwo'){
                twosArray.push(index);
            } else if (cell.getValue() === 'frozenX'){
                selectedXArray.push(index);
            } else if (cell.getValue() === 'routedOne'){
                routedOneArray.push(index);
            } else if (cell.getValue() === 'routedTwo'){
                routedTwoArray.push(index);
            }

        }
    });

    updateGridUI(); 

    findRouteButton.disabled = false;

    // Emit the collected arrays to the server
    socket.emit('endTurn', {matchId, onesArray, twosArray, selectedXArray, routedOneArray, routedTwoArray});

    console.log("Sent grid update:", { onesArray, twosArray, selectedXArray, routedOneArray, routedTwoArray});
    hasMadeMove = true;
}
function buildRoute() {
    const onesArray = [];
    const twosArray = [];
    const selectedXArray = [];
    const frozenOneArray = [];
    const frozenTwoArray= [];
    const frozenXArray= [];
    const discoverableOneArray = [];
    const discoverableTwoArray = [];
    const routedOneArray = [];
    const routedTwoArray = [];


    grid.forEach((cell, index) => {
        if (!cell.isImmutable()) {
            if (cell.getValue() === '1') {
                onesArray.push(index);
            } else if (cell.getValue() === '2') {
                twosArray.push(index);
            } else if (cell.getValue() === 'selectedX') {
                selectedXArray.push(index);
            } else if (cell.getValue() === 'frozenOne'){
                onesArray.push(index);
            } else if (cell.getValue() === 'frozenTwo'){
                twosArray.push(index);
            } else if (cell.getValue() === 'frozenX'){
                selectedXArray.push(index);
            } else if (cell.getValue() === 'routedOne'){
                routedOneArray.push(index);
            } else if (cell.getValue() === 'routedTwo'){
                routedTwoArray.push(index);
            } else if (cell.getValue() === 'frozenOne'){
                frozenOneArray.push(index);
            } else if (cell.getValue() === 'frozenTwo'){
                frozenTwoArray.push(index);
            } else if (cell.getValue() === 'frozenX'){
                frozenXArray.push(index);
            } else if (cell.getValue() === 'discoverableOne'){
                discoverableOneArray.push(index);
            } else if (cell.getValue() === 'discoverableTwo'){
                discoverableTwoArray.push(index);
            }

        }
    });

    updateGridUI(); // Refresh UI after freezing

    findRouteButton.disabled = false;

    // Emit the collected arrays to the server
    socket.emit('buildRoute', {matchId, onesArray, twosArray, selectedXArray, frozenOneArray, 
        frozenTwoArray, frozenXArray, discoverableOneArray, discoverableTwoArray, routedOneArray, routedTwoArray});

    console.log("Sent grid update:", {onesArray, twosArray, selectedXArray, frozenOneArray,
         frozenTwoArray, frozenXArray, discoverableOneArray, discoverableTwoArray, routedOneArray, routedTwoArray});
}


function initialiseRoute() {
    if (firstRoute === false) {
        socket.emit("initialiseRoute", ({matchId}));
    }
   
    verifyRouteButton.disabled = false;
    grid.forEach((cell, index) => {
        const cellElement = document.querySelector(`[data-index='${index}']`); // Get the cell element

        // Check if the cell is frozen and if it contains '1' or '2', then make it discoverable
        if (cell.getValue() === 'frozenOne' && index >= 42 && index <= 48) {
            
            cell.setValue('discoverableOne');
            
        }
        else if(cell.getValue() === 'frozenTwo'&& index >= 42 && index <= 48){
            cell.setValue('discoverableTwo');
            
        }
        else if (cell.getValue() === 'empty') {
            cellElement.removeEventListener('click', handleClick); // Remove the event listener
        }
    });

    // Update the UI after changes
    updateGridUI();
    endTurnButton.disabled = true;
}

function clearRoute(){
    grid.forEach((cell, index) => {
        if (cell.getValue() === 'routedOne'){
            cell.setValue('frozenOne');
        }
        else if (cell.getValue() === 'routedTwo'){
            cell.setValue('frozenTwo');
        }
    })
    firstRoute = true;
    initialiseRoute();
    routeCounter = 0;
    buildRoute();
}



function verifyRoute(index) {
    console.log(routeCounter);

    const index8 = grid[8]; 
    const index7 = grid[7];
    const index1 = grid[1];

    const content8 = index8.getValue();
    const content7 = index7.getValue();
    const content1 = index1.getValue();

    // Finder triggers pop-up for themselves and emits message to server
    if (routeCounter === 15 && content8 === 'routedTwo') {
        console.log('ROUTE FOUND!');
        const resultMessage = playerRole === "finder" ? "You Win! Route Found" : "You Failed to Break Route";

        // Show pop-up for the finder
        showPopup(resultMessage);

        // Emit to server to notify the breaker
        socket.emit("gameOver", { matchId, resultMessage, role: playerRole });
        console.log("Emitted:", { matchId, resultMessage });
        document.getElementById("findRouteButton").style.display = "none";
        document.getElementById("verifyRouteButton").style.display = "none";
        document.getElementById("endTurnButton").style.display = "none";
        
    
    } else if (routeCounter === 15 && (content1 === 'routedOne' || content7 === 'routedOne')) {
        console.log('ROUTE FOUND!');
        const resultMessage = playerRole === "finder" ? "You Win! Route Found" : "You Failed to Break Route";

        // Show pop-up for the finder
        showPopup(resultMessage);

        // Emit to server to notify the breaker
        socket.emit("gameOver", { matchId, resultMessage, role: playerRole });
        console.log("Emitted:", { matchId, resultMessage });
         document.getElementById("findRouteButton").style.display = "none";
        document.getElementById("verifyRouteButton").style.display = "none";
        document.getElementById("endTurnButton").style.display = "none";
    
    } else {
        clearRoute();
    }
    
}

function showPopup(resultMessage) {
    document.getElementById("popupMessage").textContent = resultMessage;
    document.getElementById("gameOverPopup").style.display = "flex";
}

function closePopup() {
    document.getElementById("gameOverPopup").style.display = "none";
}


function handleButtons(){
    if (playerIdClient !== currentTurnClient) {
        endTurnButton.disabled = true;
        findRouteButton.disabled = true;
    }
    else if (playerIdClient === currentTurnClient){
        endTurnButton.disabled = true;
        findRouteButton.disabled = false;
    }
}
// Function to format time as MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Listen for timer updates from the server
socket.on('timerUpdate', ({ finderTime, breakerTime }) => {
    document.getElementById('finder-time').textContent = formatTime(finderTime);
    document.getElementById('breaker-time').textContent = formatTime(breakerTime); // Breaker time is always in seconds
});

// Listen for game start event (optional, resets UI)
socket.on('gameStart', ({ role }) => {
    if (role === 'finder') {
        document.getElementById('finder-time').textContent = "3:00";
        document.getElementById('breaker-time').textContent = "0:15";
    }
});