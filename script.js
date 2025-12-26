const CONFIG = {
    ROWS: 6,
    COLS: 6
};

const STATE = {
    turn: 0,
    scores: { 0: 0, 1: 0 },
    players: {
        0: { name: "Player 1", initial: "P" },
        1: { name: "Player 2", initial: "Q" }
    },
    lines: new Set(),
    boxes: [],
    gameOver: false
};

const UI = {
    board: document.getElementById('game-board'),
    scoreP1: document.getElementById('score-p1'),
    scoreP2: document.getElementById('score-p2'),
    nameP1: document.querySelector('#p1-score-box .player-name'),
    nameP2: document.querySelector('#p2-score-box .player-name'),
    boxP1: document.getElementById('p1-score-box'),
    boxP2: document.getElementById('p2-score-box'),
    // turnIndicator removed from HTML
    winnerModal: document.getElementById('winner-modal'),
    winnerMessage: document.getElementById('winner-message'),

    // Setup Modal
    setupModal: document.getElementById('setup-modal'),
    inputP1: document.getElementById('p1-name'),
    inputP2: document.getElementById('p2-name'),
    startBtn: document.getElementById('start-btn'),

    resetBtn: document.getElementById('reset-btn'),
    playAgainBtn: document.getElementById('play-again-btn')
};

function determineGridSize() {
    const width = window.innerWidth;
    if (width < 600) {
        // Mobile
        CONFIG.ROWS = 6;
        CONFIG.COLS = 6;
    } else if (width < 900) {
        // Tablet
        CONFIG.ROWS = 8;
        CONFIG.COLS = 8;
    } else {
        // Desktop
        CONFIG.ROWS = 10;
        CONFIG.COLS = 10;
    }
}

function startGame() {
    // Get Names
    const n1 = UI.inputP1.value.trim() || "Player 1";
    const n2 = UI.inputP2.value.trim() || "Player 2";

    STATE.players[0].name = n1;
    STATE.players[0].initial = n1.charAt(0).toUpperCase();

    STATE.players[1].name = n2;
    STATE.players[1].initial = n2.charAt(0).toUpperCase();

    // Update UI Names
    UI.nameP1.textContent = STATE.players[0].name;
    UI.nameP2.textContent = STATE.players[1].name;

    // Set Grid Size
    determineGridSize();

    // Init Game Logic
    initGameLogic();

    // Hide Setup
    UI.setupModal.classList.add('hidden');
}

function initGameLogic() {
    STATE.turn = 0;
    STATE.scores = { 0: 0, 1: 0 };
    STATE.gameOver = false;
    STATE.lines = new Set();

    // Reset UI
    UI.scoreP1.textContent = '0';
    UI.scoreP2.textContent = '0';
    UI.board.innerHTML = '';
    UI.winnerModal.classList.add('hidden');

    updateTurnUI();
    renderBoard();
}

function renderBoard() {
    const gridRows = 2 * CONFIG.ROWS - 1;
    const gridCols = 2 * CONFIG.COLS - 1;

    // For CSS Grid: Lines should fill nicely.
    // We use a simple auto/1fr template.
    let tmplCols = "";
    for (let i = 0; i < CONFIG.COLS; i++) {
        tmplCols += "auto ";
        if (i < CONFIG.COLS - 1) tmplCols += "1fr ";
    }

    let tmplRows = "";
    for (let i = 0; i < CONFIG.ROWS; i++) {
        tmplRows += "auto ";
        if (i < CONFIG.ROWS - 1) tmplRows += "1fr ";
    }

    UI.board.style.gridTemplateColumns = tmplCols;
    UI.board.style.gridTemplateRows = tmplRows;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const cell = document.createElement('div');

            if (r % 2 === 0 && c % 2 === 0) {
                // DOT
                cell.classList.add('dot');
            } else if (r % 2 === 0 && c % 2 !== 0) {
                // HORIZONTAL LINE
                const rowIdx = r / 2;
                const colIdx = (c - 1) / 2;
                cell.classList.add('line', 'horizontal');
                cell.dataset.type = 'h';
                cell.dataset.r = rowIdx;
                cell.dataset.c = colIdx;
                cell.addEventListener('click', handleLineClick);
            } else if (r % 2 !== 0 && c % 2 === 0) {
                // VERTICAL LINE
                const rowIdx = (r - 1) / 2;
                const colIdx = c / 2;
                cell.classList.add('line', 'vertical');
                cell.dataset.type = 'v';
                cell.dataset.r = rowIdx;
                cell.dataset.c = colIdx;
                cell.addEventListener('click', handleLineClick);
            } else {
                // BOX
                const rowIdx = (r - 1) / 2;
                const colIdx = (c - 1) / 2;
                cell.classList.add('box');
                cell.id = `box-${rowIdx}-${colIdx}`;
            }

            UI.board.appendChild(cell);
        }
    }
}

function handleLineClick(e) {
    if (STATE.gameOver) return;

    const line = e.target;
    if (line.classList.contains('filled')) return;

    const type = line.dataset.type;
    const r = parseInt(line.dataset.r);
    const c = parseInt(line.dataset.c);

    line.classList.add('filled');
    line.classList.add(STATE.turn === 0 ? 'p1' : 'p2');

    const lineKey = `${type}-${r}-${c}`;
    STATE.lines.add(lineKey);

    const completedBoxes = checkBoxes(type, r, c);

    if (completedBoxes.length > 0) {
        STATE.scores[STATE.turn] += completedBoxes.length;

        completedBoxes.forEach(box => {
            const boxEl = document.getElementById(`box-${box.r}-${box.c}`);
            boxEl.classList.add('captured');
            boxEl.classList.add(STATE.turn === 0 ? 'p1' : 'p2');
            boxEl.textContent = STATE.players[STATE.turn].initial;
        });

        updateScoreUI();
        checkWin();
        // Bonus Turn - Visual only via Active State, no text
        // Keep same turn, so just update UI to reflect "still active" (no change needed actually)

    } else {
        switchTurn();
    }
}

function checkBoxes(type, r, c) {
    const completed = [];
    if (type === 'h') {
        if (r < CONFIG.ROWS - 1 && isBoxComplete(r, c)) completed.push({ r, c });
        if (r > 0 && isBoxComplete(r - 1, c)) completed.push({ r: r - 1, c });
    } else {
        if (c < CONFIG.COLS - 1 && isBoxComplete(r, c)) completed.push({ r, c });
        if (c > 0 && isBoxComplete(r, c - 1)) completed.push({ r, c: c - 1 });
    }
    return completed;
}

function isBoxComplete(r, c) {
    const top = STATE.lines.has(`h-${r}-${c}`);
    const bottom = STATE.lines.has(`h-${r + 1}-${c}`);
    const left = STATE.lines.has(`v-${r}-${c}`);
    const right = STATE.lines.has(`v-${r}-${c + 1}`);
    return top && bottom && left && right;
}

function switchTurn() {
    STATE.turn = STATE.turn === 0 ? 1 : 0;
    updateTurnUI();
}

function updateTurnUI() {
    UI.boxP1.classList.toggle('active', STATE.turn === 0);
    UI.boxP2.classList.toggle('active', STATE.turn === 1);
}

function updateScoreUI() {
    UI.scoreP1.textContent = STATE.scores[0];
    UI.scoreP2.textContent = STATE.scores[1];
}

function checkWin() {
    const totalBoxes = (CONFIG.ROWS - 1) * (CONFIG.COLS - 1);
    const capturedBoxes = STATE.scores[0] + STATE.scores[1];

    if (capturedBoxes === totalBoxes) {
        STATE.gameOver = true;
        let msg = '';
        const n1 = STATE.players[0].name;
        const n2 = STATE.players[1].name;

        if (STATE.scores[0] > STATE.scores[1]) {
            msg = `${n1} Wins! 🏆`;
        } else if (STATE.scores[1] > STATE.scores[0]) {
            msg = `${n2} Wins! 🏆`;
        } else {
            msg = "It's a Draw! 🤝";
        }

        UI.winnerMessage.textContent = msg;
        setTimeout(() => {
            UI.winnerModal.classList.remove('hidden');
        }, 500);
    }
}

// Event Listeners
UI.startBtn.addEventListener('click', startGame);

UI.resetBtn.addEventListener('click', () => {
    // Show setup again to restart
    UI.setupModal.classList.remove('hidden');
});

UI.playAgainBtn.addEventListener('click', () => {
    // For play again, we skip name entry and just reset board
    UI.winnerModal.classList.add('hidden');
    initGameLogic();
});
