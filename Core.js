const gameState = {
    teams: {
        team1: { name: 'الفريق الأول', score: 0, color: '#22c55e' },
        team2: { name: 'الفريق الثاني', score: 0, color: '#facc15' }
    },
    rps: {
        team1: null,
        team2: null
    },
    startingTeamIndex: 0,
    activeGameId: null,
    audioInitialized: false,
    settings: {
        soundEnabled: true,
        nightModeEnabled: false,
    }
};

let elements = {};
let activeGame = null;

let loadedGamesConfig = [];

const loadedGameScripts = {};
const loadedGameHtml = {};
const loadedGameCss = {}; 

// ===================================================================
// ======================  GLOBAL FUNCTIONS ==========================
// ===================================================================

function showGameOverScreen(winner, loser) {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (!gameOverScreen) return;
    
    // === START OF FIX ===
    // تشغيل صوت الفائز وإطلاق قصاصات الورق الملونة
    audioManager.play('winner');
    triggerConfetti();
    // === END OF FIX ===

    elements.gameModuleContainer.classList.add('hidden');

    const winnerNameEl = document.getElementById('winner-name');
    const finalScoreTextEl = document.getElementById('final-score-text');
    const mainMenuButton = document.getElementById('main-menu-button');
    const playAgainButton = document.getElementById('play-again-button');

    if (winner) {
        winnerNameEl.textContent = winner.name;
        winnerNameEl.style.color = winner.color;
        finalScoreTextEl.textContent = `${winner.score} - ${loser.score}`;
    } else {
        winnerNameEl.textContent = "تعادل!";
        winnerNameEl.style.color = '#ffffff';
        finalScoreTextEl.textContent = `${loser.score} - ${loser.score}`;
    }
    
    if (playAgainButton) {
        playAgainButton.onclick = () => location.reload();
    }
    
    if (mainMenuButton) {
        mainMenuButton.onclick = () => {
            audioManager.play('Wala3');
            audioManager.play('Sport_Percussion');
            audioManager.stop('winner');
            showScreen(elements.gameSelectionScreen);
        };
    }
    
    if (gameOverScreen) {
        gameOverScreen.classList.remove('hidden');
    }
}


async function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = () => resolve(script);
        script.onerror = (e) => {
            console.error(`Error loading script ${src}:`, e);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

async function loadCss(href) {
    if (loadedGameCss[href]) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => {
            loadedGameCss[href] = true;
            resolve();
        };
        link.onerror = (e) => {
            console.error(`Error loading CSS ${href}:`, e);
            reject(new Error(`Failed to load CSS: ${href}`));
        };
        document.head.appendChild(link);
    });
}

async function loadHtmlContent(filePath, targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    if (loadedGameHtml[filePath]) {
        targetElement.innerHTML = loadedGameHtml[filePath];
        return;
    }
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        loadedGameHtml[filePath] = html;
        targetElement.innerHTML = html;
    } catch (error) {
        console.error(`Error loading HTML content ${filePath}:`, error);
        throw new Error(`Failed to load HTML content: ${filePath}`);
    }
}


async function loadGamesConfig() {
    try {
        const response = await fetch('gamesConfig.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        loadedGamesConfig = (await response.json()).games;
        console.log('Games config loaded:', loadedGamesConfig);
    } catch (error) {
        console.error('Failed to load games config:', error);
        alert('حدث خطأ في تحميل إعدادات الألعاب. يرجى إعادة تحميل الصفحة.');
    }
}

const audioManager = {
    elements: {},
    async init() {
        const audioSources = {
            click: 'sounds/click.mp3',
            Wala3: 'sounds/Wala3.mp3',
            Sport_Percussion: 'sounds/Sport_Percussion.mp3',
            run_amok: 'sounds/run_amok.mp3',
            '5second': 'sounds/5second.mp3',
            drum_roll: 'sounds/drum_roll.mp3',
            show_choices: 'sounds/show_choices.mp3',
            risk_select: 'sounds/risk_select.mp3',
            winner: 'sounds/Winner.mp3',
            special_round_music4: 'sounds/special_round_music4.mp3'
        };
        Object.keys(audioSources).forEach(key => {
            this.elements[key] = new Audio(audioSources[key]);
        });
        if (this.elements.Wala3) { this.elements.Wala3.volume = 0.5; }
        if (this.elements.Sport_Percussion) { this.elements.Sport_Percussion.volume = 0.5; }
        if (this.elements['5second']) { this.elements['5second'].volume = 0.7; }
        if (this.elements.drum_roll) { this.elements.drum_roll.volume = 0.6; }
    },
    play(soundName, loop = false) {
        if (!gameState.settings.soundEnabled) return;
        const sound = this.elements[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.loop = loop;
            sound.play().catch(e => {});
        }
    },
    stop(soundName) {
        const sound = this.elements[soundName];
        if (sound) { sound.pause(); sound.currentTime = 0; }
    },
    setVolume(soundName, volume) {
        const sound = this.elements[soundName];
        if (sound) {
            sound.volume = volume;
        }
    }
};

function showScreen(screenElement) {
    elements.splashScreen.classList.add('hidden');
    elements.teamSetupScreen.classList.add('hidden');
    elements.gameSelectionScreen.classList.add('hidden');
    elements.settingsScreen.classList.add('hidden');
    elements.rulesDisplayScreen.classList.add('hidden');
    elements.rpsScreen.classList.add('hidden');
    elements.interRoundScreen.classList.add('hidden');
    elements.countdownScreen.classList.add('hidden');
    elements.gameContainer.classList.remove('hidden');

    const gameOverScreens = document.querySelectorAll('[id$="-game-over-screen"], #game-over-screen');
    gameOverScreens.forEach(s => s.classList.add('hidden'));
    elements.gameModuleContainer.classList.add('hidden');

    if (screenElement) {
        if (screenElement.id === 'countdown-screen') {
            elements.gameContainer.classList.add('hidden');
        }
        screenElement.classList.remove('hidden');
        if (screenElement.id === 'game-module-container') {
             elements.gameModuleContainer.classList.remove('hidden');
        }
    }
}

function startCountdown(duration, onComplete) {
    showScreen(elements.countdownScreen);
    let count = duration || 5;

    audioManager.stop('Wala3');
    audioManager.stop('Sport_Percussion');

    const tick = () => {
        if (count >= 1) {
            elements.countdownNumber.textContent = count;
            elements.countdownNumber.style.animation = 'none';
            void elements.countdownNumber.offsetWidth;
            elements.countdownNumber.style.animation = 'giant-number-pop 1s ease-in-out forwards';
            audioManager.play('5second');
            count--;
            setTimeout(tick, 1000);
        } else {
            if (onComplete) onComplete();
        }
    };
    tick();
}

function triggerConfetti() {
    const container = elements.confettiContainer;
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#facc15', '#34d399', '#f87171', '#818cf8', '#e5e7eb'];
    for (let i = 0; i < 150; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.animationDuration = `${Math.random() * 4 + 3}s`;
        piece.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(piece);
        setTimeout(() => piece.remove(), 7000);
    }
}

// ===================================================================
// =================  START OF THE FIX IN THIS FUNCTION  =============
// ===================================================================
async function loadGameModule(gameId) {
    elements.confettiContainer.innerHTML = '';
    gameState.activeGameId = gameId;

    const gameConfig = loadedGamesConfig.find(game => game.id === gameId);
    if (!gameConfig) {
        console.warn(`Game ID "${gameId}" not found in loadedGamesConfig.`);
        alert('اللعبة المختارة غير مدعومة أو غير مهيأة للتحميل.');
        return;
    }

    try {
        const basePath = `./games/${gameConfig.folder}/`;
        const cssPath = `${basePath}${gameId}.css`;

        await loadCss(cssPath);
        await loadHtmlContent(`${basePath}${gameId}.html`, 'game-module-container');

        if (!loadedGameScripts[gameId]) {
            const questionsResponse = await fetch(`${basePath}${gameId}_questions.js`);
            if (questionsResponse.ok) {
                await loadScript(`${basePath}${gameId}_questions.js`);
            }
            await loadScript(`${basePath}${gameId}.js`);
            loadedGameScripts[gameId] = true;
        }

        // FIX: Use setTimeout to ensure the DOM is ready before initializing the game script.
        // This prevents the "Cannot read properties of null" error.
        setTimeout(() => {
            if (window[gameConfig.moduleName]) {
                activeGame = window[gameConfig.moduleName];
                activeGame.init(gameState, elements, showScreen, triggerConfetti, audioManager, showGameOverScreen);
                
                const rulesHTML = activeGame.getRules();
                elements.rulesContentContainer.innerHTML = rulesHTML;
                showScreen(elements.rulesDisplayScreen);
            } else {
                console.error(`Game module object ${gameConfig.moduleName} not found on window after loading script.`);
                alert('فشل تهيئة اللعبة. لم يتم العثور على الوحدة البرمجية.');
            }
        }, 0); // A delay of 0 milliseconds is sufficient to push this to the next event cycle.

    } catch (error) {
        console.error(error);
        alert(`خطأ في تحميل ملفات اللعبة: ${gameId}. يرجى التحقق من وجود الملفات في المسار الصحيح.`);
    }
}
// ===================================================================
// ===================  END OF THE FIX IN THIS FUNCTION  =============
// ===================================================================


function setupRpsScreen() {
    if(elements.rpsSelectTeam1Name) elements.rpsSelectTeam1Name.textContent = gameState.teams.team1.name;
    if(elements.rpsSelectTeam1Name && elements.rpsSelectTeam1Name.parentElement) elements.rpsSelectTeam1Name.parentElement.style.backgroundColor = gameState.teams.team1.color;

    if(elements.rpsSelectTeam2Name) elements.rpsSelectTeam2Name.textContent = gameState.teams.team2.name;
    if(elements.rpsSelectTeam2Name && elements.rpsSelectTeam2Name.parentElement) elements.rpsSelectTeam2Name.parentElement.style.backgroundColor = gameState.teams.team2.color;

    if(elements.rpsResultText) elements.rpsResultText.textContent = "من سيبدأ الجولة الأولى؟";
    if(elements.rpsStartGameButton) elements.rpsStartGameButton.classList.add('hidden');

    showScreen(elements.rpsScreen);
}

function setupCoreEventListeners() {
    document.body.addEventListener('click', () => {
        if (!gameState.audioInitialized) {
            audioManager.play('Wala3');
            audioManager.play('Sport_Percussion');
            gameState.audioInitialized = true;
        }
    }, { once: true });

    elements.startLobbyButton.addEventListener('click', () => {
        audioManager.play('click');
        showScreen(elements.teamSetupScreen);
    });

    elements.goToGameSelectionButton.addEventListener('click', () => {
        audioManager.play('click');
        gameState.teams.team1.name = elements.team1NameInput.value || 'الفريق الأول';
        gameState.teams.team2.name = elements.team2NameInput.value || 'الفريق الثاني';
        renderGameSelectionCards();
        showScreen(elements.gameSelectionScreen);
    });

    elements.startGameFromRulesButton.addEventListener('click', () => {
        audioManager.play('click');
        const gameConfig = loadedGamesConfig.find(g => g.id === gameState.activeGameId);

        const startGameAction = () => {
            showScreen(elements.gameModuleContainer);
            if (activeGame && typeof activeGame.start === 'function') {
                activeGame.start(gameState.startingTeamIndex);
            }
        };

        if (gameConfig && gameConfig.requiresRps) {
            setupRpsScreen();
        } else {
            gameState.startingTeamIndex = Math.floor(Math.random() * 2);
            startCountdown(5, startGameAction);
        }
    });

    elements.selectTeam1Starter.addEventListener('click', () => {
        audioManager.play('click');
        gameState.startingTeamIndex = 0;
        if(elements.rpsResultText) elements.rpsResultText.innerHTML = `الفريق البادئ هو <span class="font-bold" style="color: ${gameState.teams.team1.color};">${gameState.teams.team1.name}</span>!`;
        if(elements.rpsStartGameButton) elements.rpsStartGameButton.classList.remove('hidden');
    });

    elements.selectTeam2Starter.addEventListener('click', () => {
        audioManager.play('click');
        gameState.startingTeamIndex = 1;
        if(elements.rpsResultText) elements.rpsResultText.innerHTML = `الفريق البادئ هو <span class="font-bold" style="color: ${gameState.teams.team2.color};">${gameState.teams.team2.name}</span>!`;
        if(elements.rpsStartGameButton) elements.rpsStartGameButton.classList.remove('hidden');
    });

    elements.rpsStartGameButton.addEventListener('click', () => {
        audioManager.play('click');
        const startGameAction = () => {
            showScreen(elements.gameModuleContainer);
            if (activeGame && typeof activeGame.start === 'function') {
                activeGame.start(gameState.startingTeamIndex);
            }
        };
        startCountdown(5, startGameAction);
    });

    elements.startNextRoundButton.addEventListener('click', () => {
        audioManager.play('click');
        if (activeGame && typeof activeGame.startTurn === 'function') {
            activeGame.startTurn();
        } else {
            startCountdown(3, () => {
                if(activeGame && typeof activeGame.start === 'function') activeGame.start();
            });
        }
    });

    elements.settingsButtonFromSetup.addEventListener('click', () => {
        audioManager.play('click');
        alert('شاشة الإعدادات - سيتم تفعيلها لاحقًا!');
    });

    elements.team1ColorSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-box')) {
            const selectedColor = e.target.dataset.color;
            gameState.teams.team1.color = selectedColor;
            elements.team1Label.style.color = selectedColor;
            elements.team1ColorSelector.querySelector('.selected').classList.remove('selected');
            e.target.classList.add('selected');
            elements.team1ColorPreview.style.backgroundColor = selectedColor;
        }
    });

    elements.team2ColorSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-box')) {
            const selectedColor = e.target.dataset.color;
            gameState.teams.team2.color = selectedColor;
            elements.team2Label.style.color = selectedColor;
            elements.team2ColorSelector.querySelector('.selected').classList.remove('selected');
            e.target.classList.add('selected');
            elements.team2ColorPreview.style.backgroundColor = selectedColor;
        }
    });
}

function renderGameSelectionCards() {
    const gameSelectionContainer = elements.gameSelectionScreen.querySelector('.grid');
    if (!gameSelectionContainer) return;

    gameSelectionContainer.innerHTML = '';

    loadedGamesConfig.forEach(game => {
        const button = document.createElement('button');
        const isDisabled = !game.enabled;

        button.className = `game-card ${isDisabled ? 'game-card-disabled' : ''}`;
        button.dataset.gameId = game.id;
        button.disabled = isDisabled;

        const iconClass = game.iconClass || 'fas fa-question';
        button.innerHTML = `<i class="${iconClass} text-3xl mb-2"></i><span class="font-bold">${game.name}</span>`;

        if (!isDisabled) {
            button.addEventListener('click', (e) => {
                audioManager.play('click');
                loadGameModule(game.id);
            });
        }
        gameSelectionContainer.appendChild(button);
    });
}

async function main() {
    elements = {
        gameContainer: document.getElementById('game-container'),
        splashScreen: document.getElementById('splash-screen'),
        teamSetupScreen: document.getElementById('team-setup-screen'),
        gameSelectionScreen: document.getElementById('game-selection-screen'),
        gameModuleContainer: document.getElementById('game-module-container'),
        settingsScreen: document.getElementById('settings-screen'),
        rulesDisplayScreen: document.getElementById('rules-display-screen'),
        rpsScreen: document.getElementById('rps-screen'),
        countdownScreen: document.getElementById('countdown-screen'),
        interRoundScreen: document.getElementById('inter-round-screen'),
        confettiContainer: document.getElementById('confetti-container'),
        startLobbyButton: document.getElementById('startLobbyButton'),
        goToGameSelectionButton: document.getElementById('goToGameSelectionButton'),
        settingsButtonFromSetup: document.getElementById('settingsButtonFromSetup'),
        startGameFromRulesButton: document.getElementById('startGameFromRulesButton'),
        rpsStartGameButton: document.getElementById('rps-start-game-button'),
        startNextRoundButton: document.getElementById('startNextRoundButton'),
        team1NameInput: document.getElementById('team1NameInput'),
        team2NameInput: document.getElementById('team2NameInput'),
        team1ColorSelector: document.getElementById('team1ColorSelector'),
        team2ColorSelector: document.getElementById('team2ColorSelector'),
        team1Label: document.getElementById('team1Label'),
        team2Label: document.getElementById('team2Label'),
        rulesContentContainer: document.getElementById('rules-content-container'),
        countdownNumber: document.getElementById('countdown-number'),
        rpsResultText: document.getElementById('rps-result-text'),
        selectTeam1Starter: document.getElementById('select-team1-starter'),
        selectTeam2Starter: document.getElementById('select-team2-starter'),
        rpsSelectTeam1Name: document.getElementById('rps-select-team1-name'),
        rpsSelectTeam2Name: document.getElementById('rps-select-team2-name'),
        nextTeamName: document.getElementById('next-team-name'),
        interRoundTitle: document.getElementById('inter-round-title'),
        scorePopup: document.getElementById('score-popup'),
        interRoundScoreDisplay: document.getElementById('inter-round-score-display'),
        interRoundTeam1Name: document.getElementById('inter-round-team1-name'),
        interRoundTeam1Score: document.getElementById('inter-round-team1-score'),
        interRoundTeam2Name: document.getElementById('inter-round-team2-name'),
        interRoundTeam2Score: document.getElementById('inter-round-team2-score'),
        team1ColorPreview: document.getElementById('team1-color-preview'),
        team2ColorPreview: document.getElementById('team2-color-preview'),
    };

    await audioManager.init();
    await loadGamesConfig();
    setupCoreEventListeners();

    showScreen(elements.splashScreen);
}

main();