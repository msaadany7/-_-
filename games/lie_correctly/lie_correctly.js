window.LieCorrectlyGame = (() => {
    // Game state and essential variables
    let coreGameState, elements, showScreen, triggerConfetti, audioManager, showGameOverScreen;
    let localState = {};
    const gameElements = {};
    let listenersAttached = false;

    // --- Audio Management ---
    const localAudioManager = {
        elements: {},
        async init() {
            const audioSources = {
                round_start: 'sounds/reveal.mp3',
                submit_lies: 'sounds/whoosh.mp3',
                choice_reveal: 'sounds/card_flip.mp3',
                correct: ['sounds/correct_answer1.mp3', 'sounds/correct_answer2.mp3'],
                wrong: ['sounds/wrong_answer1.mp3', 'sounds/wrong_answer2.mp3'],
                suspense: 'sounds/suspense.mp3'
            };
            Object.keys(audioSources).forEach(key => {
                const source = audioSources[key];
                if (Array.isArray(source)) {
                    this.elements[key] = source.map(src => new Audio(src));
                } else {
                    this.elements[key] = new Audio(source);
                }
            });
            if (this.elements.suspense) { this.elements.suspense.loop = true; this.elements.suspense.volume = 0.3; }
        },
        play(soundName) {
            if (!coreGameState.settings.soundEnabled) return;
            let sound = this.elements[soundName];
            if (!sound) return;
            let soundToPlay = Array.isArray(sound) ? sound[Math.floor(Math.random() * sound.length)] : sound;
            if (soundToPlay) { soundToPlay.currentTime = 0; soundToPlay.play().catch(e => {}); }
        },
        stopAll() {
            Object.keys(this.elements).forEach(soundName => {
                const sound = this.elements[soundName];
                const soundsToStop = Array.isArray(sound) ? sound : [sound];
                soundsToStop.forEach(s => { s.pause(); s.currentTime = 0; });
            });
        }
    };

    // --- Game State Management ---
    function resetLocalState() {
        localState = {
            questions: [],
            currentQuestionIndex: 0,
            totalRounds: 10,
            activeQuestion: null,
            answeringTeamIndex: 0,
            submittedLies: []
        };
        coreGameState.teams.team1.score = 0;
        coreGameState.teams.team2.score = 0;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- UI Update Functions ---
    function updateTeamDisplays() {
        gameElements.team1Name.textContent = coreGameState.teams.team1.name;
        gameElements.team2Name.textContent = coreGameState.teams.team2.name;
        gameElements.team1Display.style.backgroundColor = coreGameState.teams.team1.color;
        gameElements.team2Display.style.backgroundColor = coreGameState.teams.team2.color;
        gameElements.team1Score.textContent = coreGameState.teams.team1.score;
        gameElements.team2Score.textContent = coreGameState.teams.team2.score;
        gameElements.team1Display.classList.toggle('active-team-turn', localState.answeringTeamIndex === 0);
        gameElements.team2Display.classList.toggle('active-team-turn', localState.answeringTeamIndex === 1);
    }

    // --- Game Flow Functions ---
    function startRound() {
        if (localState.currentQuestionIndex >= localState.totalRounds || localState.currentQuestionIndex >= localState.questions.length) {
            endGame();
            return;
        }

        localState.activeQuestion = localState.questions[localState.currentQuestionIndex];
        localState.submittedLies = [];
        
        gameElements.resultPhase.classList.add('hidden');
        
        gameElements.choicesContainer.classList.add('hidden');
        gameElements.choicesContainer.innerHTML = '';
        
        gameElements.questionText.textContent = localState.activeQuestion.q;
        gameElements.questionText.classList.add('animate__animated', 'animate__fadeIn');
        setTimeout(() => gameElements.questionText.classList.remove('animate__animated', 'animate__fadeIn'), 1000);

        gameElements.roundDisplay.textContent = `الجولة ${localState.currentQuestionIndex + 1}`;
        const answeringTeam = coreGameState.teams[localState.answeringTeamIndex === 0 ? 'team1' : 'team2'];
        gameElements.statusText.textContent = `دور الفريق "${answeringTeam.name}" للإجابة`;
        
        gameElements.showDeceptionButton.classList.remove('hidden');
        gameElements.showChoicesButton.classList.add('hidden');
        
        updateTeamDisplays();
        localAudioManager.play('round_start');
    }

    function showDeceptionInput() {
        localAudioManager.play('submit_lies');
        gameElements.lieInput1.value = '';
        gameElements.lieInput2.value = '';
        
        // إعادة تعيين حالة إظهار الإجابة مع كل جولة جديدة
        gameElements.correctAnswerRevealContainer.classList.add('hidden');
        gameElements.showCorrectAnswerButton.classList.remove('hidden');

        gameElements.deceptionOverlay.classList.remove('hidden');
    }

    function saveLies() {
        const lie1 = gameElements.lieInput1.value.trim();
        const lie2 = gameElements.lieInput2.value.trim();

        if (!lie1 || !lie2) {
            alert('يرجى إدخال إجابتين وهميتين.');
            return;
        }
        
        localState.submittedLies = [lie1, lie2];
        
        gameElements.deceptionOverlay.classList.add('hidden');
        gameElements.showDeceptionButton.classList.add('hidden');
        gameElements.showChoicesButton.classList.remove('hidden');
        
        audioManager.play('risk_select');
    }

    function showChoices() {
        audioManager.play('show_choices');

        gameElements.showChoicesButton.classList.add('hidden');
        const degenTeam = coreGameState.teams[localState.answeringTeamIndex === 0 ? 'team2' : 'team1'];
        gameElements.statusText.textContent = `دور الفريق "${degenTeam.name}" للتحوير`;

        const correctAnswer = localState.activeQuestion.a;
        let choices = [
            { text: correctAnswer, isCorrect: true },
            { text: localState.submittedLies[0], isCorrect: false },
            { text: localState.submittedLies[1], isCorrect: false }
        ];
        shuffleArray(choices);

        displayChoices(choices);
    }

    function displayChoices(choices) {
        gameElements.choicesContainer.innerHTML = '';
        gameElements.choicesContainer.classList.remove('hidden');
        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'choice-button-lie animate__animated animate__fadeInUp';
            button.style.animationDelay = `${index * 0.1}s`;
            button.textContent = choice.text;
            button.onclick = () => handleChoiceSelection(button, choice.isCorrect);
            gameElements.choicesContainer.appendChild(button);
        });
    }

    function handleChoiceSelection(selectedButton, isCorrect) {
        gameElements.choicesContainer.querySelectorAll('.choice-button-lie').forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === localState.activeQuestion.a) {
                btn.classList.add('correct-choice');
            } else if (btn === selectedButton) {
                 btn.classList.add('wrong-choice');
            }
        });

        const answeringTeamKey = localState.answeringTeamIndex === 0 ? 'team1' : 'team2';
        
        if (isCorrect) {
            coreGameState.teams[answeringTeamKey].score++;
            gameElements.resultMessage.textContent = `إجابة صحيحة!`;
            gameElements.resultMessage.className = 'text-4xl font-bold mb-6 correct';
            localAudioManager.play('correct');
        } else {
            gameElements.resultMessage.textContent = `إجابة خاطئة!`;
            gameElements.resultMessage.className = 'text-4xl font-bold mb-6 wrong';
            localAudioManager.play('wrong');
        }
        
        setTimeout(() => {
            gameElements.correctAnswerDisplay.textContent = localState.activeQuestion.a;
            updateTeamDisplays();
            gameElements.resultPhase.classList.remove('hidden');
        }, 2000);
    }
    
    function goToNextRound() {
        localState.currentQuestionIndex++;
        localState.answeringTeamIndex = (localState.answeringTeamIndex + 1) % 2;
        startRound();
    }

    function endGame() {
        audioManager.stop('run_amok'); // إيقاف موسيقى اللعبة
        localAudioManager.stopAll();
        audioManager.play('drum_roll');
        
        const winner = coreGameState.teams.team1.score > coreGameState.teams.team2.score 
            ? coreGameState.teams.team1 
            : (coreGameState.teams.team2.score > coreGameState.teams.team1.score 
                ? coreGameState.teams.team2 
                : null);
        const loser = winner ? (winner === coreGameState.teams.team1 ? coreGameState.teams.team2 : coreGameState.teams.team1) : coreGameState.teams.team1;

        setTimeout(() => {
            audioManager.play('winner');
            if (typeof showGameOverScreen === 'function') {
                showGameOverScreen(winner, loser);
            }
        }, 4000);
    }

    function setupEventListeners() {
        if (listenersAttached) return;

        gameElements.showDeceptionButton.addEventListener('click', showDeceptionInput);
        gameElements.saveLiesButton.addEventListener('click', saveLies);
        gameElements.showChoicesButton.addEventListener('click', showChoices);
        gameElements.nextRoundButton.addEventListener('click', goToNextRound);
        
        gameElements.showCorrectAnswerButton.addEventListener('click', () => {
            if (localState.activeQuestion) {
                gameElements.correctAnswerForLiar.textContent = localState.activeQuestion.a;
                gameElements.correctAnswerRevealContainer.classList.remove('hidden');
                // إخفاء الزر بعد الضغط عليه لمنع تكرار الضغط
                gameElements.showCorrectAnswerButton.classList.add('hidden');
            }
        });

        listenersAttached = true;
    }

    function init(cgs, els, ss, tc, am, sgos) {
        coreGameState = cgs;
        elements = els;
        showScreen = ss;
        triggerConfetti = tc;
        audioManager = am;
        showGameOverScreen = sgos; // حفظ دالة إظهار شاشة الفوز
        localAudioManager.init();

        const ids = {
            team1Display: 'team1-display-lie',
            team2Display: 'team2-display-lie',
            team1Name: 'team1-name-lie',
            team2Name: 'team2-name-lie',
            team1Score: 'team1-score-lie',
            team2Score: 'team2-score-lie',
            roundDisplay: 'round-display-lie',
            statusText: 'status-text-lie',
            questionText: 'question-text-lie',
            showDeceptionButton: 'show-deception-button',
            showChoicesButton: 'show-choices-button',
            choicesContainer: 'choices-container-lie',
            resultPhase: 'result-phase-lie',
            resultMessage: 'result-message-lie',
            correctAnswerDisplay: 'correct-answer-display-lie',
            nextRoundButton: 'next-round-button-lie',
            deceptionOverlay: 'deception-overlay',
            lieInput1: 'lie-input-1',
            lieInput2: 'lie-input-2',
            saveLiesButton: 'save-lies-button',
            showCorrectAnswerButton: 'show-correct-answer-button',
            correctAnswerRevealContainer: 'correct-answer-reveal-container',
            correctAnswerForLiar: 'correct-answer-for-liar'
        };
        for (const key in ids) {
            gameElements[key] = document.getElementById(ids[key]);
            if (!gameElements[key]) {
                console.warn(`LieCorrectlyGame: Element with ID '${ids[key]}' not found.`);
            }
        }
        
        setupEventListeners();
    }

    function start(startingTeamIndex) {
        // إيقاف موسيقى القائمة الرئيسية وتشغيل موسيقى اللعبة
        audioManager.stop('Wala3');
        audioManager.stop('Sport_Percussion');
        audioManager.play('run_amok', true);

        resetLocalState();
        if (window.gameQuestions && window.gameQuestions.lie_correctly) {
            localState.questions = [...window.gameQuestions.lie_correctly];
            shuffleArray(localState.questions);
        } else {
            console.error("Lie Correctly game questions not found!");
            localState.questions = [{ q: "No questions found for this game.", a: "Error" }];
        }

        localState.answeringTeamIndex = startingTeamIndex;
        startRound();
    }

    function getRules() {
        return `
            <div class="space-y-4 text-right">
                <div class="rule-card"><div class="rule-icon"><i class="fas fa-question-circle"></i></div><div class="rule-text">يتم طرح سؤال على الفريق الأول (الفريق المُجيب).</div></div>
                <div class="rule-card"><div class="rule-icon"><i class="fas fa-user-secret"></i></div><div class="rule-text">يقوم الفريق الثاني (الفريق المُخادع) بإدخال إجابتين وهميتين بشكل سري.</div></div>
                <div class="rule-card"><div class="rule-icon"><i class="fas fa-list-ol"></i></div><div class="rule-text">يتم عرض 3 اختيارات للفريق المُجيب: الإجابة الصحيحة والإجابتين الوهميتين بترتيب عشوائي.</div></div>
                <div class="rule-card"><div class="rule-icon"><i class="fas fa-check"></i></div><div class="rule-text">إذا اختار الفريق المُجيب الإجابة الصحيحة، يحصل على نقطة.</div></div>
                <div class="rule-card"><div class="rule-icon"><i class="fas fa-times"></i></div><div class="rule-text">إذا اختار الفريق المُجيب إجابة خاطئة، لا يحصل أي فريق على نقاط.</div></div>
                <div class="rule-card"><div class="rule-icon"><i class="fas fa-trophy"></i></div><div class="rule-text">اللعبة 10 جولات، والفريق صاحب أعلى نقاط في النهاية يفوز.</div></div>
            </div>
        `;
    }

    return { init, start, getRules };
})();