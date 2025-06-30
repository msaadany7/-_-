window.DressFriendGame = (() => {
    let coreGameState, elements, showScreen, triggerConfetti, coreAudioManager;
    let localState = {};
    const gameElements = {};
    let listenersAttached = false;
    let availableQuestions = [];

    const localAudioManager = {
        elements: {},
        async init() {
            const audioSources = {
                roulette_spin: 'sounds/roulette_wheel.mp3',
                question_reveal: 'sounds/Reveal.mp3',
                timer_end: 'sounds/timer_end.mp3',
                point_win: ['sounds/correct_answer1.mp3', 'sounds/correct_answer2.mp3'],
                Winner: 'sounds/Winner.mp3',
                game_start: 'sounds/question_reveal.mp3',
                '30_sec_timer': 'sounds/30Seconds_Timer.mp3',
                background_music: 'sounds/Background2.mp3'
            };
            Object.keys(audioSources).forEach(key => {
                const source = audioSources[key];
                this.elements[key] = Array.isArray(source) ? source.map(src => new Audio(src)) : new Audio(source);
            });
            if (this.elements.background_music) { this.elements.background_music.loop = true; }
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
        setVolume(soundName, volume) {
            const sound = this.elements[soundName];
            if (sound && !Array.isArray(sound)) {
                sound.volume = volume;
            }
        },
        stopAll() {
            Object.keys(this.elements).forEach(soundName => this.stop(soundName));
        }
    };

    function resetLocalState() {
        localState = {
            currentRound: 1, totalRounds: 8, questions: [], timer: 30, timerId: null,
            isTieBreaker: false, currentRotation: 0, isSpinning: false
        };
        coreGameState.teams.team1.score = 0;
        coreGameState.teams.team2.score = 0;
    }

    function shuffleQuestions() {
        if (availableQuestions.length === 0) {
            availableQuestions = window.gameQuestions && window.gameQuestions.dress_friend ? [...window.gameQuestions.dress_friend] : ["لا توجد أسئلة."];
        }
        for (let i = availableQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
        }
        localState.questions = [...availableQuestions];
    }

    function setupRound() {
        gameElements.team1Display.classList.remove('active-team-turn');
        gameElements.team2Display.classList.remove('active-team-turn');
        gameElements.roundDisplay.textContent = localState.isTieBreaker ? "الجولة الفاصلة" : `الجولة ${localState.currentRound}`;
        gameElements.questionDisplay.classList.add('hidden');
        gameElements.questionDisplay.classList.remove('question-reveal-effect');
        gameElements.startTimerButton.classList.add('hidden');
        gameElements.answersFinishedButton.classList.add('hidden');
        gameElements.outcomeButtons.classList.add('hidden');
        gameElements.continueButton.classList.add('hidden');
        gameElements.answerTimer.classList.add('hidden');
        gameElements.rouletteWheel.classList.remove('hidden');
        gameElements.rouletteWheel.style.pointerEvents = 'auto';
        
        // --- بداية الجزء المعدل ---
        // نقوم بتعطيل الحركة مؤقتًا، ثم نضبط زاوية البدء
        gameElements.rouletteWheel.style.transition = 'none';
        gameElements.rouletteWheel.style.transform = `rotate(${localState.currentRotation}deg)`;
        // --- نهاية الجزء المعدل ---

        localState.isSpinning = false;
        updateScores();
    }

    function handleRouletteClick() {
        if (localState.isSpinning) return;
        localState.isSpinning = true;

        // --- بداية الجزء المعدل ---
        // إعادة تفعيل الحركة قبل البدء
        gameElements.rouletteWheel.style.transition = 'transform 8s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        // --- نهاية الجزء المعدل ---

        localAudioManager.play('roulette_spin');
        gameElements.rouletteWheel.style.pointerEvents = 'none';

        const spinCycles = Math.floor(Math.random() * 5) + 8;
        const randomExtraDegrees = Math.floor(Math.random() * 360);
        const targetRotation = localState.currentRotation + (spinCycles * 360) + randomExtraDegrees;
        
        gameElements.rouletteWheel.style.transform = `rotate(${targetRotation}deg)`;
        
        localState.currentRotation = targetRotation;

        setTimeout(() => {
            localAudioManager.play('question_reveal');
            gameElements.rouletteWheel.classList.add('hidden');
            
            if (localState.questions.length === 0) shuffleQuestions();
            const question = localState.questions.pop();
            const indexInAvailable = availableQuestions.indexOf(question);
            if (indexInAvailable > -1) availableQuestions.splice(indexInAvailable, 1);

            gameElements.questionDisplay.textContent = question;
            gameElements.questionDisplay.classList.add('question-reveal-effect');
            gameElements.questionDisplay.classList.remove('hidden');
            gameElements.startTimerButton.classList.remove('hidden');
        }, 8000);
    }


    function startAnswerTimer() {
        localAudioManager.setVolume('background_music', 0.25);
        localAudioManager.play('30_sec_timer');
        gameElements.startTimerButton.classList.add('hidden');
        gameElements.answerTimer.classList.remove('hidden');
        gameElements.answersFinishedButton.classList.remove('hidden');
        localState.timer = 30;
        gameElements.answerTimer.textContent = localState.timer;
        clearInterval(localState.timerId);
        localState.timerId = setInterval(() => {
            localState.timer--;
            gameElements.answerTimer.textContent = localState.timer;
            if (localState.timer < 10) gameElements.answerTimer.classList.add('text-red-500');
            if (localState.timer <= 0) endRoundByTime(true);
        }, 1000);
    }

    function endRoundByTime(isTimeUp = false) {
        clearInterval(localState.timerId);
        localAudioManager.stop('30_sec_timer');
        localAudioManager.setVolume('background_music', 1.0);
        if (isTimeUp) localAudioManager.play('timer_end');
        gameElements.answerTimer.classList.add('hidden');
        gameElements.answerTimer.classList.remove('text-red-500');
        gameElements.answersFinishedButton.classList.add('hidden');
        gameElements.outcomeButtons.classList.remove('hidden');
    }

    function handleOutcomeClick(winnerIndex) {
        clearInterval(localState.timerId);
        localAudioManager.stop('30_sec_timer');
        localAudioManager.setVolume('background_music', 1.0);
        localAudioManager.play('point_win');
        if (elements.scorePopup) {
            elements.scorePopup.textContent = `+1`;
            elements.scorePopup.classList.add('show');
            setTimeout(() => { elements.scorePopup.classList.remove('show'); }, 1500);
        }
        coreGameState.teams[winnerIndex === 0 ? 'team1' : 'team2'].score++;
        updateScores();
        const winnerDisplay = winnerIndex === 0 ? gameElements.team1Display : gameElements.team2Display;
        winnerDisplay.classList.add('active-team-turn');
        gameElements.outcomeButtons.classList.add('hidden');
        gameElements.questionDisplay.classList.add('hidden');
        gameElements.answerTimer.classList.add('hidden');
        gameElements.answersFinishedButton.classList.add('hidden');
        if (localState.currentRound >= localState.totalRounds) {
            endGame();
        } else {
            gameElements.continueButton.classList.remove('hidden');
        }
    }

    function handleContinueClick() {
        localState.currentRound++;
        setupRound();
    }
    
    function endGame() {
        localAudioManager.stop('background_music');
        const team1 = coreGameState.teams.team1;
        const team2 = coreGameState.teams.team2;
        if (team1.score === team2.score && !localState.isTieBreaker) {
            localState.isTieBreaker = true;
            localState.totalRounds++;
            if (coreAudioManager) coreAudioManager.play('drum_roll');
            gameElements.questionDisplay.innerHTML = `<span class="text-yellow-400">🔥 تعادل! استعدوا للجولة الفاصلة! 🔥</span>`;
            gameElements.questionDisplay.classList.remove('hidden');
            gameElements.continueButton.classList.remove('hidden');
            return;
        }
        localAudioManager.stopAll();
        if (coreAudioManager) coreAudioManager.play('drum_roll');
        document.getElementById('dress-friend-screen').classList.add('hidden');
        const gameOverContainer = document.getElementById('dress-friend-over-screen');
        if (!gameOverContainer) return;
        const winner = team1.score > team2.score ? team1 : (team2.score > team1.score ? team2 : null);
        gameOverContainer.innerHTML = `
            <div class="text-center p-4 flex flex-col justify-center items-center h-full">
                <div id="winner-card-dress" class="winner-card w-full text-white animate__animated animate__zoomIn" style="background-color: ${winner ? winner.color : '#4b5563'};">
                    <i class="fas fa-trophy text-8xl mb-4" style="color: ${winner ? '#facc15' : '#9ca3af'};"></i>
                    <h2 class="text-2xl">الفائز هو</h2>
                    <h3 id="winner-name-dress" class="winner-name">${winner ? winner.name : 'تعادل!'}</h3>
                    <div class="mt-4 text-lg space-y-1">
                        <p class="font-bold">${team1.name}: ${team1.score} نقطة</p>
                        <p>${team2.name}: ${team2.score} نقطة</p>
                    </div>
                </div>
                <div class="mt-6 grid grid-cols-2 gap-4 w-full">
                    <button id="dress-play-again-button" class="button-primary text-white font-bold py-3 px-6 rounded-xl text-lg"><i class="fas fa-redo mr-2"></i> لعب مرة أخرى</button>
                    <button id="dress-main-menu-button" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-xl text-lg"><i class="fas fa-forward mr-2"></i> القائمة الرئيسية</button>
                </div>
            </div>`;
        gameOverContainer.classList.remove('hidden');
        showScreen(elements.gameModuleContainer);
        setTimeout(() => {
            if (winner && typeof triggerConfetti === 'function') triggerConfetti();
            localAudioManager.play('Winner');
        }, 2500);
        gameOverContainer.querySelector('#dress-play-again-button').onclick = () => location.reload();
        gameOverContainer.querySelector('#dress-main-menu-button').onclick = () => {
            localAudioManager.stopAll();
            if (coreAudioManager) {
                coreAudioManager.play('Wala3');
                coreAudioManager.play('Sport_Percussion');
            }
            showScreen(elements.gameSelectionScreen);
        };
    }

    function updateScores() {
        gameElements.team1Display.querySelector('p').textContent = coreGameState.teams.team1.score;
        gameElements.team2Display.querySelector('p').textContent = coreGameState.teams.team2.score;
        gameElements.team1Display.querySelector('h3').textContent = coreGameState.teams.team1.name;
        gameElements.team2Display.querySelector('h3').textContent = coreGameState.teams.team2.name;
        gameElements.team1Display.style.backgroundColor = coreGameState.teams.team1.color;
        gameElements.team2Display.style.backgroundColor = coreGameState.teams.team2.color;
    }
    
    function init(cgs, els, ss, tc, am) {
        coreGameState = cgs; elements = els; showScreen = ss; triggerConfetti = tc; coreAudioManager = am;
        localAudioManager.init();
        const ids = {
            team1Display: 'team1-display-dress', team2Display: 'team2-display-dress', roundDisplay: 'round-display-dress',
            answerTimer: 'answer-timer-dress', rouletteWheel: 'roulette-wheel', questionDisplay: 'question-display-dress',
            startTimerButton: 'start-timer-button', answersFinishedButton: 'answers-finished-button',
            outcomeButtons: 'outcome-buttons-dress', team1WinsButton: 'team1-wins-button',
            team2WinsButton: 'team2-wins-button', continueButton: 'continue-button-dress'
        };
        for (const key in ids) {
            if (document.getElementById(ids[key])) gameElements[key] = document.getElementById(ids[key]);
        }
        if (!listenersAttached) {
            if (gameElements.rouletteWheel) gameElements.rouletteWheel.addEventListener('click', handleRouletteClick);
            if (gameElements.startTimerButton) gameElements.startTimerButton.addEventListener('click', startAnswerTimer);
            if (gameElements.answersFinishedButton) gameElements.answersFinishedButton.addEventListener('click', () => endRoundByTime(false));
            if (gameElements.team1WinsButton) gameElements.team1WinsButton.addEventListener('click', () => handleOutcomeClick(0));
            if (gameElements.team2WinsButton) gameElements.team2WinsButton.addEventListener('click', () => handleOutcomeClick(1));
            if (gameElements.continueButton) gameElements.continueButton.addEventListener('click', handleContinueClick);
            listenersAttached = true;
        }
    }

    function start() {
        localAudioManager.stopAll();
        resetLocalState();
        shuffleQuestions();
        localAudioManager.play('background_music');
        localAudioManager.play('game_start');
        if (gameElements.team1WinsButton) {
            gameElements.team1WinsButton.style.backgroundColor = coreGameState.teams.team1.color;
            gameElements.team1WinsButton.textContent = `فوز ${coreGameState.teams.team1.name}`;
        }
        if (gameElements.team2WinsButton) {
            gameElements.team2WinsButton.style.backgroundColor = coreGameState.teams.team2.color;
            gameElements.team2WinsButton.textContent = `فوز ${coreGameState.teams.team2.name}`;
        }
        showScreen(elements.gameModuleContainer);
        document.getElementById('dress-friend-screen').classList.remove('hidden');
        const gameOverContainer = document.getElementById('dress-friend-over-screen');
        if(gameOverContainer) gameOverContainer.classList.add('hidden');
        setupRound();
    }

    function getRules() {
        return `
            <div class="space-y-4 text-right">
                <div class="rule-card"> <div class="rule-icon"><i class="fas fa-gavel"></i></div> <div class="rule-text">في كل جولة، الحكم يعرض سؤال على أحد لاعبي الفريق ليبدأ المزايدة على زميله.</div> </div>
                <div class="rule-card"> <div class="rule-icon"><i class="fas fa-chart-line"></i></div> <div class="rule-text">بعد المزايدة، اللاعب الذي عليه الدور يجب أن يجيب في 30 ثانية عدد الإجابات التي حددها زميله.</div> </div>
                <div class="rule-card"> <div class="rule-icon"><i class="fas fa-shield-alt"></i></div> <div class="rule-text">المتسابق الذي يجيب يمكنه ذكر 3 إجابات إضافية لتأمين نفسه ضد الأخطاء.</div> </div>
                <div class="rule-card"> <div class="rule-icon"><i class="fas fa-user-secret"></i></div> <div class="rule-text">التحدي فردي تمامًا، وممنوع على صاحب المزايدة مساعدة زميله.</div> </div>
                <div class="rule-card"> <div class="rule-icon"><i class="fas fa-exchange-alt"></i></div> <div class="rule-text">إذا فشل المتسابق، تذهب النقطة للفريق المنافس.</div> </div>
                <div class="rule-card"> <div class="rule-icon"><i class="fas fa-flag-checkered"></i></div> <div class="rule-text">اللعبة 8 جولات، وفي حالة التعادل تضاف جولة فاصلة. الفريق صاحب أعلى نقاط يفوز.</div> </div>
            </div>
        `;
    }

    return { init, start, getRules };
})();