window.Acting = (() => {
    let coreGameState, elements, showScreen, triggerConfetti, showGameOverScreen_local;
    let localState = {};
    const gameElements = {};
    let listenersAttached = false;

    const localAudioManager = {
        elements: {},
        async init() {
            const audioSources = {
                card_flip: 'sounds/card_flip.mp3',
                reveal: 'sounds/Reveal.mp3',
                correct: ['sounds/correct_answer1.mp3', 'sounds/correct_answer2.mp3'],
                wrong: ['sounds/wrong_answer1.mp3', 'sounds/wrong_answer2.mp3'],
                timer_tick: 'sounds/timer_tick.mp3',
                times_up: 'sounds/timer_end.mp3',
                suspense: 'sounds/suspense.mp3',
                winner: 'sounds/Winner.mp3'
            };
            Object.keys(audioSources).forEach(key => {
                const source = audioSources[key];
                if (Array.isArray(source)) {
                    this.elements[key] = source.map(src => new Audio(src));
                } else {
                    this.elements[key] = new Audio(source);
                }
            });
            if (this.elements.timer_tick) this.elements.timer_tick.loop = true;
        },
        play(soundName, options = { loop: false, volume: 1.0 }) {
            if (!coreGameState.settings.soundEnabled) return;
            const sound = this.elements[soundName];
            if (!sound) return;
            let soundToPlay = Array.isArray(sound) ? sound[Math.floor(Math.random() * sound.length)] : sound;
            if (soundToPlay) {
                soundToPlay.currentTime = 0;
                soundToPlay.loop = options.loop;
                soundToPlay.volume = options.volume;
                soundToPlay.play().catch(e => {});
            }
        },
        setVolume(soundName, volume) {
            if (!coreGameState.settings.soundEnabled) return;
            const sound = this.elements[soundName];
            if (!sound) return;
            const soundsToChange = Array.isArray(sound) ? sound : [sound];
            soundsToChange.forEach(s => s.volume = volume);
        },
        stop(soundName) {
            const sound = this.elements[soundName];
            if (!sound) return;
            const soundsToStop = Array.isArray(sound) ? sound : [sound];
            soundsToStop.forEach(s => {
                s.pause();
                s.currentTime = 0;
            });
        }
    };

    function resetLocalState() {
        localState = {
            players: [], currentTeamIndex: 0, cardsPlayed: 0,
            totalCards: 10, guessesLeft: 3, timerId: null, activePlayerName: null,
            activeCardElement: null
        };
        coreGameState.teams.team1.score = 0;
        coreGameState.teams.team2.score = 0;
    }

    function shufflePlayers() {
        const allPlayers = [...window.gameQuestions.acting];
        for (let i = allPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPlayers[i], allPlayers[j]] = [allPlayers[j], allPlayers[i]];
        }
        localState.players = allPlayers.slice(0, localState.totalCards + 1);
    }

    function createCards() {
        gameElements.cardGrid.innerHTML = '';
        for (let i = 1; i <= localState.totalCards; i++) {
            const card = document.createElement('button');
            card.className = 'acting-card';
            card.textContent = i;
            card.dataset.playerName = localState.players[i - 1];
            card.addEventListener('click', handleCardClick);
            gameElements.cardGrid.appendChild(card);
        }
    }

    function handleCardClick(event) {
        const card = event.currentTarget;
        if (card.disabled) return;
        localState.activeCardElement = card;
        localAudioManager.play('card_flip');
        card.classList.add('flipping');
        setTimeout(() => {
            localState.activePlayerName = card.dataset.playerName;
            gameElements.playerNameReveal.textContent = localState.activePlayerName;
            gameElements.revealOverlay.classList.remove('hidden');
            localAudioManager.play('reveal');
            card.disabled = true;
        }, 600);
    }

    function startMainTurn() {
        gameElements.cardGrid.classList.add('grid-disabled');
        localAudioManager.setVolume('suspense', 0.6);
        gameElements.revealOverlay.classList.add('hidden');
        localState.guessesLeft = 3;
        gameElements.guessCounter.textContent = `التخمينات المتبقية: ${localState.guessesLeft}`;
        gameElements.wrongActingButton.textContent = 'تخمين خاطئ';
        gameElements.guessCounter.classList.remove('hidden');
        gameElements.hostControls.classList.remove('hidden');
        startTimer(45, () => switchToStealTurn());
    }

    function switchToStealTurn() {
        localAudioManager.play('suspense');
        gameElements.hostControls.classList.add('hidden');
        gameElements.guessCounter.textContent = 'انتهى الوقت! فرصة الخطف للفريق الآخر!';
        gameElements.actingScreen.classList.add('steal-turn-flash');
        setTimeout(() => gameElements.actingScreen.classList.remove('steal-turn-flash'), 700);
        gameElements.stealControls.classList.remove('hidden');
        startTimer(10, () => handleTurnResult(null));
    }

    function startTimer(duration, onComplete) {
        clearInterval(localState.timerId);
        let timeLeft = duration;
        gameElements.timerDisplay.textContent = timeLeft;
        gameElements.timerDisplay.classList.remove('hidden', 'time-low');
        localState.timerId = setInterval(() => {
            timeLeft--;
            gameElements.timerDisplay.textContent = timeLeft;
            if (timeLeft === 5) {
                localAudioManager.play('timer_tick');
            }
            if (timeLeft <= 5 && !gameElements.timerDisplay.classList.contains('time-low')) {
                gameElements.timerDisplay.classList.add('time-low');
            }
            if (timeLeft <= 0) {
                localAudioManager.stop('timer_tick');
                localAudioManager.play('times_up');
                clearInterval(localState.timerId);
                onComplete();
            }
        }, 1000);
    }

    function handleTurnResult(winningTeamIndex) {
        clearInterval(localState.timerId);
        localAudioManager.stop('timer_tick');
        localAudioManager.setVolume('suspense', 0.1);
        if (localState.activeCardElement) {
            const cardToVanish = localState.activeCardElement;
            cardToVanish.classList.add('dissolving');
            setTimeout(() => {
                cardToVanish.style.visibility = 'hidden';
            }, 800);
        }
        gameElements.timerDisplay.classList.remove('time-low');
        gameElements.hostControls.classList.add('hidden');
        gameElements.stealControls.classList.add('hidden');
        gameElements.timerDisplay.classList.add('hidden');
        gameElements.guessCounter.classList.add('hidden');
        if (winningTeamIndex !== null) {
            localAudioManager.play('correct');
            const winnerKey = winningTeamIndex === 0 ? 'team1' : 'team2';
            coreGameState.teams[winnerKey].score++;
            if (elements.scorePopup) {
                elements.scorePopup.textContent = `+1`;
                elements.scorePopup.classList.add('show');
                setTimeout(() => {
                    elements.scorePopup.classList.remove('show');
                }, 1500);
            }
            const winnerDisplay = winnerKey === 'team1' ? gameElements.team1Display : gameElements.team2Display;
            winnerDisplay.classList.add('score-flash');
            setTimeout(() => winnerDisplay.classList.remove('score-flash'), 1000);
            updateScores();
        } else {
            localAudioManager.play('wrong');
        }
        localState.cardsPlayed++;
        setTimeout(() => {
            gameElements.cardGrid.classList.remove('grid-disabled');
            if (localState.cardsPlayed >= localState.totalCards) {
                endGame();
            } else {
                localState.currentTeamIndex = (localState.currentTeamIndex + 1) % 2;
                updateTurnDisplay();
            }
        }, 1800);
    }

    function updateTurnDisplay() {
        const currentTeam = coreGameState.teams[localState.currentTeamIndex === 0 ? 'team1' : 'team2'];
        gameElements.currentTurnTeam.textContent = currentTeam.name;
        gameElements.team1Display.classList.toggle('active-team-turn', localState.currentTeamIndex === 0);
        gameElements.team2Display.classList.toggle('active-team-turn', localState.currentTeamIndex === 1);
        gameElements.cardGrid.classList.remove('hidden');
        gameElements.tiebreakerView.classList.add('hidden');
    }

    function endGame() {
        localAudioManager.stop('suspense');
        if (coreGameState.teams.team1.score === coreGameState.teams.team2.score) {
            setupTieBreakerScreen();
            return;
        }

        // === START OF FIX ===
        // تم حذف السطر الذي يشغل الصوت من هنا
        // localAudioManager.play('winner');
        // === END OF FIX ===

        const winner = coreGameState.teams.team1.score > coreGameState.teams.team2.score ? coreGameState.teams.team1 : coreGameState.teams.team2;
        const loser = winner === coreGameState.teams.team1 ? coreGameState.teams.team2 : coreGameState.teams.team1;
        
        if (showGameOverScreen_local) {
            showGameOverScreen_local(winner, loser);
        }
    }

    function setupTieBreakerScreen() {
        const tiebreakerScreen = document.getElementById('tiebreaker-setup-screen');
        tiebreakerScreen.classList.remove('hidden');

        const team1Button = document.getElementById('tiebreaker-select-team1');
        const team2Button = document.getElementById('tiebreaker-select-team2');
        team1Button.textContent = coreGameState.teams.team1.name;
        team1Button.style.backgroundColor = coreGameState.teams.team1.color;
        team2Button.textContent = coreGameState.teams.team2.name;
        team2Button.style.backgroundColor = coreGameState.teams.team2.color;
        
        const revealStep = document.getElementById('tiebreaker-reveal-step');
        const teamSelectionStep = document.getElementById('tiebreaker-team-selection');

        const handleTeamSelect = (teamIndex) => {
            localState.currentTeamIndex = teamIndex;
            updateTurnDisplay();
            
            team1Button.disabled = true;
            team2Button.disabled = true;
            const selectedButton = teamIndex === 0 ? team1Button : team2Button;
            selectedButton.classList.add('selected');

            teamSelectionStep.classList.add('hidden');
            revealStep.classList.remove('hidden');
        };

        team1Button.onclick = () => handleTeamSelect(0);
        team2Button.onclick = () => handleTeamSelect(1);

        document.getElementById('tiebreaker-reveal-player-button').onclick = () => {
            tiebreakerScreen.classList.add('hidden');
            localState.activePlayerName = localState.players[localState.totalCards];
            gameElements.playerNameReveal.textContent = localState.activePlayerName;
            gameElements.revealOverlay.classList.remove('hidden');
        };
    }

    function updateScores() {
        gameElements.team1ScoreDisplay.textContent = coreGameState.teams.team1.score;
        gameElements.team2ScoreDisplay.textContent = coreGameState.teams.team2.score;
    }

    function init(cgs, els, ss, tc, am, sgos) {
        coreGameState = cgs;
        elements = els;
        showScreen = ss;
        triggerConfetti = tc;
        showGameOverScreen_local = sgos;

        localAudioManager.init();
        const ids = {
            actingScreen: 'acting-screen',
            gameArea: 'game-area-acting',
            team1Display: 'team1-display-acting',
            team2Display: 'team2-display-acting',
            currentTurnTeam: 'current-turn-team-acting',
            timerDisplay: 'timer-display-acting',
            guessCounter: 'guess-counter-acting',
            cardGrid: 'card-grid-acting',
            tiebreakerView: 'tiebreaker-acting-view',
            tiebreakerPlayerName: 'tiebreaker-player-name',
            revealOverlay: 'reveal-player-overlay',
            playerNameReveal: 'player-name-reveal',
            startActingButton: 'start-acting-button',
            hostControls: 'host-controls-acting',
            correctActingButton: 'correct-acting-button',
            wrongActingButton: 'wrong-acting-button',
            stealControls: 'steal-controls-acting',
            stealCorrectButton: 'steal-correct-button',
            stealWrongButton: 'steal-wrong-button'
        };
        for (const key in ids) gameElements[key] = document.getElementById(ids[key]);
        gameElements.team1ScoreDisplay = gameElements.team1Display.querySelector('p');
        gameElements.team2ScoreDisplay = gameElements.team2Display.querySelector('p');
        if (!listenersAttached) {
            gameElements.startActingButton.addEventListener('click', startMainTurn);
            gameElements.correctActingButton.addEventListener('click', () => handleTurnResult(localState.currentTeamIndex));
            gameElements.wrongActingButton.addEventListener('click', () => {
                localAudioManager.play('wrong');
                if (gameElements.gameArea) {
                    gameElements.gameArea.classList.add('shake-animation');
                    setTimeout(() => gameElements.gameArea.classList.remove('shake-animation'), 500);
                }
                localState.guessesLeft--;
                if (localState.guessesLeft > 0) {
                    gameElements.guessCounter.textContent = `التخمينات المتبقية: ${localState.guessesLeft}`;
                } else {
                    gameElements.guessCounter.textContent = 'انتهت المحاولات!';
                    switchToStealTurn();
                }
            });
            gameElements.stealCorrectButton.addEventListener('click', () => handleTurnResult((localState.currentTeamIndex + 1) % 2));
            gameElements.stealWrongButton.addEventListener('click', () => handleTurnResult(null));
            listenersAttached = true;
        }
    }

    function start(startingTeamIndex) {
        resetLocalState();
        localState.currentTeamIndex = startingTeamIndex;
        shufflePlayers();
        showScreen(elements.gameModuleContainer);
        document.getElementById('acting-screen').classList.remove('hidden');
        createCards();
        updateTurnDisplay();
        localAudioManager.play('suspense', { loop: true, volume: 0.1 });
    }

    function getRules() {
        return `
            <div class="space-y-4 text-right">
                 <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-film"></i></div>
                    <div class="rule-text">يظهر 10 كروت مقلوبة. يقوم لاعب من الفريق صاحب الدور باختيار كارت ليظهر له اسم لاعب كرة قدم.</div>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-stopwatch"></i></div>
                    <div class="rule-text">مع الفريق 45 ثانية لتمثيل اللاعب ومحاولة تخمينه من قبل زملائه.</div>
                </div>
                 <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-lightbulb"></i></div>
                    <div class="rule-text">للفريق 3 محاولات تخمين فقط خلال الـ 45 ثانية.</div>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-hand-paper"></i></div>
                    <div class="rule-text">أثناء التمثيل، ممنوع الإشارة إلى أي شيء في الغرفة أو استخدام أي أصوات.</div>
                </div>
                 <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-exchange-alt"></i></div>
                    <div class="rule-text">إذا فشل الفريق، يحصل الفريق المنافس على فرصة واحدة للتخمين خلال 10 ثوانٍ لسرقة النقطة.</div>
                </div>
                 <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-trophy"></i></div>
                    <div class="rule-text">بعد انتهاء الـ 10 كروت، الفريق صاحب أعلى نقاط يفوز. في حالة التعادل، يتم لعب جولة فاصلة.</div>
                </div>
            </div>
        `;
    }

    return { init, start, getRules };
})();