window.BankGame = (() => {
    let coreGameState, elements, showScreen, triggerConfetti;
    let localState = {};
    const gameElements = {};
    const scoreChain = [1, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
    let listenersAttached = false;
    let lastChanceIntervalId = null;

    const localAudioManager = {
        elements: {},
        async init() {
            const audioSources = {
                Bank: 'sounds/Bank.mp3',
                correct_answer: ['sounds/correct_answer1.mp3', 'sounds/correct_answer2.mp3', 'sounds/correct_answer3.mp3'],
                wrong_answer: ['sounds/wrong_answer1.mp3', 'sounds/wrong_answer2.mp3', 'sounds/wrong_answer3.mp3'],
                Sport_Rhythmic: 'sounds/Sport_Rhythmic.mp3',
                special_round_music1: 'sounds/special_round_music1.mp3',
                Reveal: 'sounds/Reveal.mp3',
                timer_end: 'sounds/timer_end.mp3',
                Winner: 'sounds/Winner.mp3',
            };
            Object.keys(audioSources).forEach(key => {
                const source = audioSources[key];
                if (Array.isArray(source)) {
                    this.elements[key] = source.map(src => new Audio(src));
                } else {
                    this.elements[key] = new Audio(source);
                }
            });
            if (this.elements.Sport_Rhythmic) { 
                this.elements.Sport_Rhythmic.loop = true; 
                this.elements.Sport_Rhythmic.volume = 0.3; 
            }
            if (this.elements.special_round_music1) { 
                this.elements.special_round_music1.loop = true; 
                this.elements.special_round_music1.volume = 0.4; 
            }
        },
        play(soundName) {
            if (!coreGameState.settings.soundEnabled) return;
            const sound = this.elements[soundName];
            if (!sound) return;
            let soundToPlay = Array.isArray(sound) ? sound[Math.floor(Math.random() * sound.length)] : sound;
            if (soundToPlay) { soundToPlay.currentTime = 0; soundToPlay.play().catch(e => {}); }
        },
        stop(soundName) {
            const sound = this.elements[soundName];
            if (!sound) return;
            const soundsToStop = Array.isArray(sound) ? sound : [sound];
            soundsToStop.forEach(s => { s.pause(); s.currentTime = 0; });
        },
        stopAll() {
            Object.keys(this.elements).forEach(soundName => this.stop(soundName));
        }
    };

    function resetLocalState() {
        localState = {
            currentTeamIndex: 0, pot: 0, chainCounter: 0, questionsAnsweredInTurn: 0,
            totalTurns: 6, currentTurnNumber: 1, questions: [], activeQuestionIndex: -1,
            timer: 120, timerId: null, isTurnOver: false
        };
        coreGameState.teams.team1.score = 0;
        coreGameState.teams.team2.score = 0;
        clearInterval(lastChanceIntervalId);
        lastChanceIntervalId = null;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function loadQuestions() {
        if (window.gameQuestions && window.gameQuestions.bank_game) {
            localState.questions = [...window.gameQuestions.bank_game];
            shuffleArray(localState.questions);
        } else {
            console.error("Bank game questions not found!");
            localState.questions = [{ q: "لا توجد أسئلة للعبة بنك", a: "خطأ" }];
        }
    }

    function updateTeamDisplays() {
        gameElements.team1NameDisplay.textContent = coreGameState.teams.team1.name;
        gameElements.team2NameDisplay.textContent = coreGameState.teams.team2.name;
        gameElements.team1Display.style.backgroundColor = coreGameState.teams.team1.color;
        gameElements.team2Display.style.backgroundColor = coreGameState.teams.team2.color;

        gameElements.team1Display.classList.remove('active-team-turn');
        gameElements.team2Display.classList.remove('active-team-turn');
        if (localState.currentTeamIndex === 0) {
            gameElements.team1Display.classList.add('active-team-turn');
        } else {
            gameElements.team2Display.classList.add('active-team-turn');
        }
        
        gameElements.team1ScoreDisplay.textContent = coreGameState.teams.team1.score;
        gameElements.team2ScoreDisplay.textContent = coreGameState.teams.team2.score;
    }

    function startTurn() {
        localState.isTurnOver = false;
        localState.pot = 0;
        localState.chainCounter = 0;
        localState.questionsAnsweredInTurn = 0;
        localState.timer = 120;

        if (gameElements.bankButton) gameElements.bankButton.disabled = false;
        
        const currentTeamKey = localState.currentTeamIndex === 0 ? 'team1' : 'team2';
        const currentTeam = coreGameState.teams[currentTeamKey];
        gameElements.currentTurnTeamName.textContent = currentTeam.name;
        gameElements.currentTurnTeamName.style.color = currentTeam.color;
        
        updateTeamDisplays();

        gameElements.potDisplay.textContent = 0;
        gameElements.timerDisplay.textContent = localState.timer;
        
        showScreen(elements.gameModuleContainer);
        gameElements.gameScreen.classList.remove('hidden');
        gameElements.gameOverScreen.classList.add('hidden');

        nextQuestion();
        
        localAudioManager.stop('special_round_music1');
        localAudioManager.play('Sport_Rhythmic');

        clearInterval(localState.timerId);
        localState.timerId = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        localState.timer--;
        gameElements.timerDisplay.textContent = localState.timer;
        const timePercent = (localState.timer / 120) * 100;
        gameElements.progressBar.style.width = `${timePercent}%`;
        
        gameElements.progressBar.classList.remove('warning', 'danger');
        if (timePercent < 50 && timePercent >= 20) {
            gameElements.progressBar.classList.add('warning');
        } else if (timePercent < 20) {
            gameElements.progressBar.classList.add('danger');
        }

        if (localState.timer <= 0) {
            endTurn(true);
        }
    }

    function nextQuestion() {
        gameElements.decisionButtons.classList.remove('hidden');
        gameElements.nextQuestionButton.classList.add('hidden');
        gameElements.answerText.classList.add('hidden');
        gameElements.showAnswerButton.disabled = false;
        gameElements.lastChanceText.classList.add('hidden');
        gameElements.questionCounterDisplay.textContent = `${localState.questionsAnsweredInTurn + 1}/12`;
        
        if (localState.questionsAnsweredInTurn >= 12) {
            processAnswer(true);
            return;
        }
        
        localState.activeQuestionIndex++;
        if (localState.activeQuestionIndex >= localState.questions.length) {
            console.warn("Ran out of questions, recycling...");
            localState.activeQuestionIndex = 0;
            shuffleArray(localState.questions);
        }

        const question = localState.questions[localState.activeQuestionIndex];
        if (!question) {
            endGame();
            return;
        }
        gameElements.questionText.textContent = question.q;
        gameElements.answerText.textContent = question.a;
    }
    
    function startLastChanceTimer() {
        gameElements.lastChanceText.classList.remove('hidden');
        gameElements.bankButton.disabled = false;

        let countdown = 3;
        gameElements.bankButton.innerHTML = `<i class="fas fa-piggy-bank mr-2"></i> بنك (${countdown})`;
        
        clearInterval(lastChanceIntervalId);

        lastChanceIntervalId = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                gameElements.bankButton.innerHTML = `<i class="fas fa-piggy-bank mr-2"></i> بنك (${countdown})`;
            } else {
                clearInterval(lastChanceIntervalId);
                lastChanceIntervalId = null;
                gameElements.bankButton.innerHTML = `<i class="fas fa-piggy-bank mr-2"></i> بنك`;
                gameElements.bankButton.disabled = true;
                
                localAudioManager.play('wrong_answer');
                localState.pot = 0;
                localState.chainCounter = 0;
                gameElements.potDisplay.textContent = localState.pot;

                setTimeout(() => endTurn(), 1000);
            }
        }, 1000);
    }
    
    function endTurn(isTimeUp = false) {
        if (localState.isTurnOver) return;
        localState.isTurnOver = true;
        
        clearInterval(localState.timerId);
        localState.timerId = null;
        clearInterval(lastChanceIntervalId);
        lastChanceIntervalId = null;

        localAudioManager.stop('Sport_Rhythmic');
        if (isTimeUp) {
            localAudioManager.play('timer_end');
            localState.pot = 0;
        }
        
        const finishedTurnNumber = localState.currentTurnNumber;

        if (finishedTurnNumber >= localState.totalTurns) {
            endGame();
            return;
        } 
        
        elements.interRoundScoreDisplay.classList.remove('hidden');
        elements.interRoundTeam1Score.textContent = coreGameState.teams.team1.score;
        elements.interRoundTeam2Score.textContent = coreGameState.teams.team2.score;
       
        elements.interRoundTitle.textContent = `نهاية الجولة ${Math.ceil(finishedTurnNumber / 2)}`;
        elements.startNextRoundButton.textContent = `ابدأ الجولة التالية`;
        
        localState.currentTurnNumber++;
        localState.currentTeamIndex = (localState.currentTeamIndex + 1) % 2;
        const nextTeamKey = localState.currentTeamIndex === 0 ? 'team1' : 'team2';
        const nextTeam = coreGameState.teams[nextTeamKey];

        elements.interRoundTeam1Name.textContent = coreGameState.teams.team1.name;
        elements.interRoundTeam2Name.textContent = coreGameState.teams.team2.name;
        elements.nextTeamName.textContent = nextTeam.name;
        elements.nextTeamName.style.color = nextTeam.color;

        showScreen(elements.interRoundScreen);
        localAudioManager.play('special_round_music1');
    }

    function bankPoints() {
        if(localState.isTurnOver || localState.pot === 0) return;

        clearInterval(lastChanceIntervalId);
        lastChanceIntervalId = null;
        gameElements.bankButton.innerHTML = `<i class="fas fa-piggy-bank mr-2"></i> بنك`;

        const currentTeamKey = localState.currentTeamIndex === 0 ? 'team1' : 'team2';
        coreGameState.teams[currentTeamKey].score += localState.pot;
        updateTeamDisplays();
        localAudioManager.play('Bank');
        
        elements.scorePopup.textContent = `+${localState.pot}`;
        elements.scorePopup.classList.add('show');
        setTimeout(() => {
            elements.scorePopup.classList.remove('show');
        }, 1500);
        
        localState.pot = 0;
        localState.chainCounter = 0;
        gameElements.potDisplay.textContent = localState.pot;

        if (localState.questionsAnsweredInTurn >= 12) {
            setTimeout(() => endTurn(), 1600);
        }
    }

    function endGame() {
        localAudioManager.stopAll(); // --- هنا تم إضافة السطر المفقود
        document.removeEventListener('keydown', handleKeyDown);
        clearInterval(localState.timerId);
        clearInterval(lastChanceIntervalId);
        
        gameElements.gameScreen.classList.add('hidden');
        elements.gameModuleContainer.classList.remove('hidden');
        gameElements.gameOverScreen.classList.remove('hidden');
        
        const team1 = coreGameState.teams.team1;
        const team2 = coreGameState.teams.team2;
        const winner = team1.score > team2.score ? team1 : (team2.score > team1.score ? team2 : null);
        
        gameElements.winnerTitle.classList.add('hidden');
        gameElements.winnerName.classList.add('hidden');
        gameElements.finalScores.classList.add('hidden');
        audioManager.play('drum_roll');
        setTimeout(() => {
            gameElements.winnerTitle.classList.remove('hidden');
            gameElements.winnerTitle.classList.add('animate__animated', 'animate__fadeInDown');
        }, 500);
        setTimeout(() => {
            if (winner) {
                gameElements.winnerName.textContent = winner.name;
                gameElements.winnerCard.style.backgroundColor = winner.color;
                const lightColors = ['#facc15', '#e5e7eb', '#f97316'];
                if (lightColors.includes(winner.color)) {
                    gameElements.winnerCard.classList.remove('text-white');
                    gameElements.winnerCard.classList.add('text-gray-900');
                } else {
                    gameElements.winnerCard.classList.remove('text-gray-900');
                    gameElements.winnerCard.classList.add('text-white');
                }
                gameElements.winnerTrophy.style.color = '#facc15';
                if(typeof triggerConfetti === 'function') triggerConfetti();
            } else {
                gameElements.winnerName.textContent = "تعادل!";
                gameElements.winnerCard.style.backgroundColor = '#4b5563';
                gameElements.winnerTrophy.style.color = '#9ca3af';
            }
            gameElements.winnerName.classList.remove('hidden');
            gameElements.winnerName.classList.add('animate__animated', 'animate__tada');
            localAudioManager.play('Winner');
        }, 2000);
        setTimeout(() => {
            gameElements.finalScore1.textContent = `${team1.name}: ${team1.score} نقطة`;
            gameElements.finalScore2.textContent = `${team2.name}: ${team2.score} نقطة`;
            gameElements.finalScores.classList.remove('hidden');
            gameElements.finalScores.classList.add('animate__animated', 'animate__fadeInUp');
        }, 2500);
    }
    
    function handleKeyDown(e) {
        if (elements.gameModuleContainer.classList.contains('hidden')) return;
        if (e.key !== 'F12' && !e.metaKey) e.preventDefault();
        if (localState.isTurnOver) return;
        
        switch (e.key.toLowerCase()) {
            case 'shift': if (!gameElements.decisionButtons.classList.contains('hidden')) gameElements.correctButton.click(); break;
            case 'control': if (!gameElements.decisionButtons.classList.contains('hidden')) gameElements.wrongButton.click(); break;
            case 'alt': gameElements.showAnswerButton.click(); break;
            case 'b': gameElements.bankButton.click(); break;
            case ' ': if (!gameElements.nextQuestionButton.classList.contains('hidden')) gameElements.nextQuestionButton.click(); break;
        }
    }

    function processAnswer(isEndOfQuestions = false) {
        gameElements.answerText.classList.remove('hidden');
        gameElements.decisionButtons.classList.add('hidden');
        localState.questionsAnsweredInTurn++;
        
        if (isEndOfQuestions) {
            startLastChanceTimer();
        } else {
            gameElements.nextQuestionButton.classList.remove('hidden');
        }
    }

    function setupEventListeners() {
        gameElements.correctButton.addEventListener('click', () => {
            localAudioManager.play('correct_answer');
            localState.pot = scoreChain[localState.chainCounter] || 4096;
            localState.chainCounter++;
            gameElements.potDisplay.textContent = localState.pot;
            processAnswer();
        });

        gameElements.wrongButton.addEventListener('click', () => {
            localAudioManager.play('wrong_answer');
            localState.pot = 0;
            localState.chainCounter = 0;
            gameElements.potDisplay.textContent = localState.pot;
            processAnswer();
        });

        gameElements.showAnswerButton.addEventListener('click', () => {
            localAudioManager.play('Reveal');
            gameElements.answerText.classList.remove('hidden');
            gameElements.showAnswerButton.disabled = true;
        });

        gameElements.bankButton.addEventListener('click', () => {
            bankPoints();
        });

        gameElements.nextQuestionButton.addEventListener('click', () => {
            audioManager.play('click');
            nextQuestion();
        });

        gameElements.playAgainButton.addEventListener('click', () => {
            audioManager.play('click');
            start(coreGameState.startingTeamIndex);
        });

        gameElements.mainMenuLobbyButton.addEventListener('click', () => {
            audioManager.play('click');
            document.removeEventListener('keydown', handleKeyDown);
            localAudioManager.stopAll();
            audioManager.play('Wala3');
            audioManager.play('Sport_Percussion');
            showScreen(elements.gameSelectionScreen);
        });
    }
    
    function init(cgs, els, ss, tc) {
        coreGameState = cgs;
        elements = els;
        showScreen = ss;
        triggerConfetti = tc;
        localAudioManager.init();
        
        const ids = {
            gameScreen: 'bank-game-screen',
            gameOverScreen: 'bank-game-over-screen',
            team1Display: 'team1-display-bank',
            team2Display: 'team2-display-bank',
            currentTurnTeamName: 'current-turn-team-name-bank',
            timerDisplay: 'timer-display-bank',
            potDisplay: 'pot-display-bank',
            questionText: 'question-text-bank',
            answerText: 'answer-text-bank',
            gameControls: 'game-controls-bank',
            correctButton: 'correct-button-bank',
            wrongButton: 'wrong-button-bank',
            bankButton: 'bank-button-bank',
            finalScore1: 'final-score-1',
            finalScore2: 'final-score-2',
            playAgainButton: 'play-again-button',
            mainMenuLobbyButton: 'main-menu-lobby-button',
            progressBar: 'questions-progress-bar-bank',
            showAnswerButton: 'show-answer-button-bank',
            decisionButtons: 'decision-buttons-bank',
            nextQuestionButton: 'next-question-button-bank',
            lastChanceText: 'last-chance-text-bank',
            questionCounterDisplay: 'question-counter-display-bank',
            winnerCard: 'winner-card',
            winnerTrophy: 'winner-trophy',
            winnerTitle: 'winner-title',
            winnerName: 'winner-name',
            finalScores: 'final-scores',
        };

        for (const key in ids) { 
            gameElements[key] = document.getElementById(ids[key]); 
            if (!gameElements[key]) {
                console.error(`BankGame: Element with ID '${ids[key]}' not found.`);
            }
        }

        if (gameElements.team1Display) {
            gameElements.team1NameDisplay = gameElements.team1Display.querySelector('h3');
            gameElements.team1ScoreDisplay = gameElements.team1Display.querySelector('p');
        }
        if (gameElements.team2Display) {
            gameElements.team2NameDisplay = gameElements.team2Display.querySelector('h3');
            gameElements.team2ScoreDisplay = gameElements.team2Display.querySelector('p');
        }
        
        if (!listenersAttached) {
            setupEventListeners();
            document.addEventListener('keydown', handleKeyDown);
            listenersAttached = true;
        }
    }
    
    function start(startingTeamIndex) {
        resetLocalState();
        localState.currentTeamIndex = startingTeamIndex || 0;
        loadQuestions();
        startTurn();
    }

    return {
        init,
        start,
        startTurn, 
        getRules: () => {
            return `
            <div class="space-y-4 text-right">
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-gamepad"></i></div>
                    <p class="rule-text">اللعبة عبارة عن 6 جولات، كل فريق له 3 جولات.</p>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-hourglass-half"></i></div>
                    <p class="rule-text">في جولتك، ستجاوب على 12 سؤال في 120 ثانية. لو انتهى الوقت ولم تقل "بنك"، ستخسر كل النقاط التي جمعتها في السلسلة الحالية.</p>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-sort-amount-up-alt"></i></div>
                    <p class="rule-text">تتضاعف النقاط مع كل إجابة صحيحة (1, 4, 8...). إذا أخطأت، تعود سلسلة النقاط إلى الصفر.</p>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-piggy-bank"></i></div>
                    <p class="rule-text">يمكنك أن تقول "بنك" بعد أي سؤال صحيح لتحويل رصيدك المؤقت إلى رصيدك الدائم.</p>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-ban"></i></div>
                    <p class="rule-text">ملاحظة: يمكنك قول "بنك" فقط بين الأسئلة. بمجرد ظهور السؤال التالي، لا يمكنك قول "بنك".</p>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-eye-slash"></i></div>
                    <p class="rule-text">لا يتم إظهار مجموع النقاط الكلي إلا بعد انتهاء كل فريق من دوره في الجولة (أي بعد الجولات الزوجية).</p>
                </div>
            `;
        }
    };
})();