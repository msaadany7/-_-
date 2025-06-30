window.RiskGame = (() => {
    let coreGameState, elements, showScreen, triggerConfetti, coreAudioManager;
    let localState = {};
    const gameElements = {};
    let listenersAttached = false;
    let isPaused = false;
    let currentQuestion = null;
    let currentTopicIndex = -1;
    let currentQuestionIndexInTopic = -1;
    let doublePointsQuestion = null;
    let helplineTimerId = null;

    const localAudioManager = {
        elements: {},
        async init() {
            const audioSources = {
                risk_select: 'sounds/risk_select.mp3',
                question_reveal: 'sounds/question_reveal.mp3',
                double_points_reveal: 'sounds/double_points_reveal.mp3',
                correct_answer: ['sounds/correct_answer1.mp3', 'sounds/correct_answer2.mp3', 'sounds/correct_answer3.mp3'],
                wrong_answer: ['sounds/wrong_answer1.mp3', 'sounds/wrong_answer2.mp3', 'sounds/wrong_answer3.mp3'],
                timer_tick: 'sounds/timer_tick.mp3',
                timer_end: 'sounds/timer_end.mp3',
                Sport_Rhythmic: 'sounds/Sport_Rhythmic.mp3', // موسيقى الخلفية
                helpline: 'sounds/helpline.mp3',
                extra_time: 'sounds/extra_time.mp3',
                show_choices: 'sounds/show_choices.mp3',
                steal_question: 'sounds/steal_question.mp3',
                Winner: 'sounds/Winner.mp3',
                Reveal: 'sounds/Reveal.mp3',
                whoosh: 'sounds/whoosh.mp3',
                friend_call: 'sounds/friend_call.mp3'
            };
            Object.keys(audioSources).forEach(key => {
                const source = audioSources[key];
                if (Array.isArray(source)) { this.elements[key] = source.map(src => new Audio(src)); }
                else { this.elements[key] = new Audio(source); }
            });
            if (this.elements.Sport_Rhythmic) { this.elements.Sport_Rhythmic.loop = true; this.elements.Sport_Rhythmic.volume = 0.3; }
        },
        play(soundName) {
            if (!coreGameState.settings.soundEnabled) return;
            const sound = this.elements[soundName];
            if (!sound) { console.warn(`Sound not found: ${soundName}`); return; }
            let soundToPlay = Array.isArray(sound) ? sound[Math.floor(Math.random() * sound.length)] : sound;
            if (soundToPlay) { soundToPlay.currentTime = 0; soundToPlay.play().catch(e => {}); }
        },
        stop(soundName) {
            const sound = this.elements[soundName];
            if (!sound) return;
            const soundsToStop = Array.isArray(sound) ? sound : [sound];
            soundsToStop.forEach(s => { s.pause(); s.currentTime = 0; });
        },
        manageBackgroundMusic(action) {
            if (!this.elements.Sport_Rhythmic) return;
            if (action === 'play') {
                if (coreGameState.settings.soundEnabled) {
                    this.elements.Sport_Rhythmic.play().catch(e => console.error("Error playing Sport_Rhythmic:", e));
                }
            } else if (action === 'pause') {
                this.elements.Sport_Rhythmic.pause();
            } else if (action === 'stop') {
                this.elements.Sport_Rhythmic.pause();
                this.elements.Sport_Rhythmic.currentTime = 0;
            }
        }
    };

    function resetLocalState() {
        localState = {
            currentTeamIndex: 0,
            questionsData: [],
            totalQuestionsAnswered: 0,
            timer: 30,
            timerId: null,
            isAnswering: false,
            usedLifelines: {
                team1: { helpline: false, extra_time: false, show_choices: false, steal_question: false },
                team2: { helpline: false, extra_time: false, show_choices: false, steal_question: false } 
            },
            currentStealingTeamIndex: null,
            isDoublePointsQuestionActive: false,
        };
        coreGameState.teams.team1.score = 0;
        coreGameState.teams.team2.score = 0;
        isPaused = false;
        currentQuestion = null;
        currentTopicIndex = -1;
        currentQuestionIndexInTopic = -1;
        helplineTimerId = null;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function loadQuestions() {
        if (window.gameQuestions && window.gameQuestions.risk_game && window.gameQuestions.risk_game.topics) {
            localState.questionsData = JSON.parse(JSON.stringify(window.gameQuestions.risk_game.topics));
            const allPossibleQuestions = [];
            localState.questionsData.forEach((topic, tIndex) => {
                topic.questions.forEach((q, qIndex) => {
                    allPossibleQuestions.push({ topicIndex: tIndex, questionIndex: qIndex, id: `${tIndex}-${qIndex}` });
                });
            });
            shuffleArray(allPossibleQuestions);
            doublePointsQuestion = allPossibleQuestions[0];
            console.log("Double points question selected:", doublePointsQuestion);
        } else {
            console.error("Risk game questions not found or badly structured!");
            localState.questionsData = [{ name: "أسئلة عامة", questions: [{ q: "سؤال تجريبي", a: "إجابة", points: 10, choices: ["أ", "ب", "ج", "د"] }] }];
            doublePointsQuestion = { topicIndex: 0, questionIndex: 0, id: '0-0' };
        }
    }

    function updateTeamDisplays() {
        if(gameElements.team1NameDisplayRisk) gameElements.team1NameDisplayRisk.textContent = coreGameState.teams.team1.name;
        if(gameElements.team2NameDisplayRisk) gameElements.team2NameDisplayRisk.textContent = coreGameState.teams.team2.name;
        if(gameElements.team1DisplayRisk) gameElements.team1DisplayRisk.style.backgroundColor = coreGameState.teams.team1.color;
        if(gameElements.team2DisplayRisk) gameElements.team2DisplayRisk.style.backgroundColor = coreGameState.teams.team2.color;

        if(gameElements.team1DisplayRisk) gameElements.team1DisplayRisk.classList.remove('active-team-turn');
        if(gameElements.team2DisplayRisk) gameElements.team2DisplayRisk.classList.remove('active-team-turn');
        
        const activeTeamIndex = localState.currentStealingTeamIndex !== null ? localState.currentStealingTeamIndex : localState.currentTeamIndex;
        const activeTeam = coreGameState.teams[activeTeamIndex === 0 ? 'team1' : 'team2'];

        if (activeTeamIndex === 0) {
            if(gameElements.team1DisplayRisk) gameElements.team1DisplayRisk.classList.add('active-team-turn');
        } else {
            if(gameElements.team2DisplayRisk) gameElements.team2DisplayRisk.classList.add('active-team-turn');
        }
        if(gameElements.currentTurnTeamNameRisk) gameElements.currentTurnTeamNameRisk.textContent = activeTeam.name;
        if(gameElements.currentTurnTeamNameRisk) gameElements.currentTurnTeamNameRisk.style.color = activeTeam.color;

        if(gameElements.team1ScoreDisplayRisk) gameElements.team1ScoreDisplayRisk.textContent = coreGameState.teams.team1.score;
        if(gameElements.team2ScoreDisplayRisk) gameElements.team2ScoreDisplayRisk.textContent = coreGameState.teams.team2.score;
        
        updateLifelineButtonsState();
    }

    function displayGameScreen() {
        if (coreAudioManager) {
            coreAudioManager.stop('Wala3');
            coreAudioManager.stop('Sport_Percussion');
        }
        
        showScreen(elements.gameModuleContainer); 
        if (gameElements.riskGameScreen) gameElements.riskGameScreen.classList.remove('hidden'); 
        if (gameElements.gameOverScreen) gameElements.gameOverScreen.classList.add('hidden');
        if (gameElements.questionDisplayArea) gameElements.questionDisplayArea.classList.add('hidden');
        if (gameElements.doublePointsConfirmationScreen) gameElements.doublePointsConfirmationScreen.classList.add('hidden');
        if (gameElements.preQuestionCountdownDisplay) gameElements.preQuestionCountdownDisplay.classList.add('hidden');

        updateTeamDisplays();
        renderTopicsAndQuestions();
        localAudioManager.manageBackgroundMusic('play');
        startTurn();
    }

    function renderTopicsAndQuestions() {
        if (!gameElements.topicsContainer) return;
        gameElements.topicsContainer.innerHTML = '';
        localState.questionsData.forEach((topic, tIndex) => {
            const topicDiv = document.createElement('div');
            topicDiv.className = 'topic-card bg-gray-900 rounded-lg p-4 shadow-lg text-center';
            topicDiv.innerHTML = `<h3 class="text-xl font-bold mb-3 text-green-400">${topic.name}</h3><div class="grid grid-cols-4 gap-2"></div>`;
            const questionsGrid = topicDiv.querySelector('div');
            topic.questions.forEach((q, qIndex) => {
                const questionBox = document.createElement('button');
                const isAnswered = q.answeredByTeam !== undefined;
                const isDoublePoints = doublePointsQuestion && doublePointsQuestion.topicIndex === tIndex && doublePointsQuestion.questionIndex === qIndex;

                questionBox.className = `question-box p-3 rounded-md font-bold text-lg transition-all duration-200 ${
    isAnswered ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
}`;
                
                questionBox.textContent = q.points;
                questionBox.dataset.topicIndex = tIndex;
                questionBox.dataset.questionIndex = qIndex;
                questionBox.disabled = isAnswered;

                if (!isAnswered) {
                    questionBox.addEventListener('click', () => {
                        localAudioManager.play('whoosh');
                        questionBox.classList.add('question-box-selected');
                        setTimeout(() => {
                            questionBox.classList.remove('question-box-selected');
                            selectQuestion(tIndex, qIndex);
                        }, 300);
                    });
                }
                questionsGrid.appendChild(questionBox);
            });
            gameElements.topicsContainer.appendChild(topicDiv);
        });
        if(gameElements.topicsContainer) gameElements.topicsContainer.classList.remove('hidden'); 
    }

    function startTurn() {
        if (gameElements.preQuestionCountdownDisplay) gameElements.preQuestionCountdownDisplay.classList.add('hidden');
        if (gameElements.doublePointsConfirmationScreen) gameElements.doublePointsConfirmationScreen.classList.add('hidden');
        if(gameElements.questionDisplayArea) gameElements.questionDisplayArea.classList.add('hidden');
        if(gameElements.answerControls) gameElements.answerControls.classList.add('hidden');
        if(gameElements.lifelineButtons) gameElements.lifelineButtons.classList.add('hidden');
        if(gameElements.continueGameButton) gameElements.continueGameButton.classList.add('hidden');
        if(gameElements.showAnswerButtonRisk) gameElements.showAnswerButtonRisk.classList.add('hidden');
        if(gameElements.answerText) gameElements.answerText.classList.add('hidden');
        
        if(gameElements.timerDisplay) {
            gameElements.timerDisplay.textContent = localState.timer;
            gameElements.timerDisplay.classList.remove('hidden');
        }
        if(gameElements.progressBar) {
            gameElements.progressBar.style.width = '100%';
            gameElements.progressBar.classList.remove('warning', 'danger');
            if(gameElements.progressBar.parentElement) gameElements.progressBar.parentElement.classList.remove('hidden');
        }
        
        if(gameElements.teamInstructions) { 
            gameElements.teamInstructions.classList.remove('hidden');
            const currentTeam = coreGameState.teams[localState.currentTeamIndex === 0 ? 'team1' : 'team2'];
            gameElements.teamInstructions.innerHTML = `دور <span style="color: ${currentTeam.color};">${currentTeam.name}</span> لاختيار السؤال`;
        }
        if (gameElements.topicsContainer) {
            gameElements.topicsContainer.classList.remove('hidden');
        }
        updateTeamDisplays();
    }
    
    function selectQuestion(tIndex, qIndex) {
        if (localState.isAnswering || isPaused) return;

        currentTopicIndex = tIndex;
        currentQuestionIndexInTopic = qIndex;
        currentQuestion = localState.questionsData[tIndex].questions[qIndex];
        
        localState.isDoublePointsQuestionActive = doublePointsQuestion && doublePointsQuestion.topicIndex === tIndex && doublePointsQuestion.questionIndex === qIndex;

        if (gameElements.topicsContainer) gameElements.topicsContainer.classList.add('hidden');
        if(gameElements.teamInstructions) gameElements.teamInstructions.classList.add('hidden');

        if (localState.isDoublePointsQuestionActive) {
            showScreen(elements.gameModuleContainer);
            if (gameElements.riskGameScreen) gameElements.riskGameScreen.classList.remove('hidden');
            if (gameElements.doublePointsConfirmationScreen) {
                 gameElements.doublePointsConfirmationScreen.classList.remove('hidden');
                 localAudioManager.play('double_points_reveal');
                 const flashEffect = document.createElement('div');
                 flashEffect.className = 'double-points-flash';
                 document.body.appendChild(flashEffect);
                 setTimeout(() => flashEffect.remove(), 1000);
            }
        } else {
            startCountdownQuestion(3, showQuestion);
        }
    }

    function startCountdownQuestion(duration, onCompleteCallback) {
        localAudioManager.manageBackgroundMusic('pause');
        clearInterval(localState.timerId);
        
        if(gameElements.timerDisplay) gameElements.timerDisplay.classList.add('hidden');

        if(gameElements.preQuestionCountdownDisplay) {
            gameElements.preQuestionCountdownDisplay.classList.remove('hidden');
            let count = duration || 3;
            gameElements.preQuestionCountdownNumber.textContent = count;
            gameElements.preQuestionCountdownNumber.style.animation = 'none';
            void gameElements.preQuestionCountdownNumber.offsetWidth;
            gameElements.preQuestionCountdownNumber.style.animation = 'giant-number-pop 1s ease-out forwards';
            localAudioManager.play('timer_tick');

            const countdownInterval = setInterval(() => {
                count--;
                if (count > 0) {
                    gameElements.preQuestionCountdownNumber.textContent = count;
                    gameElements.preQuestionCountdownNumber.style.animation = 'none';
                    void gameElements.preQuestionCountdownNumber.offsetWidth;
                    gameElements.preQuestionCountdownNumber.style.animation = 'giant-number-pop 1s ease-out forwards';
                    localAudioManager.play('timer_tick');
                } else {
                    clearInterval(countdownInterval);
                    localAudioManager.stop('timer_tick');
                    gameElements.preQuestionCountdownDisplay.classList.add('hidden');
                    if (onCompleteCallback) onCompleteCallback();
                }
            }, 1000);
        }
    }

    function showQuestion() {
        localAudioManager.play('question_reveal');

        if (gameElements.questionInfoDisplay) {
            gameElements.questionTopicInfo.textContent = localState.questionsData[currentTopicIndex].name;
            gameElements.questionPointsInfo.textContent = `${currentQuestion.points} نقطة`;
            gameElements.questionInfoDisplay.classList.remove('hidden');
        }

        if(gameElements.questionText) gameElements.questionText.textContent = currentQuestion.q;
        if(gameElements.answerText) gameElements.answerText.textContent = currentQuestion.a;
        if(gameElements.questionDisplayArea) gameElements.questionDisplayArea.classList.remove('hidden');
        if(gameElements.answerControls) gameElements.answerControls.classList.remove('hidden');
        if(gameElements.lifelineButtons) gameElements.lifelineButtons.classList.remove('hidden');
        if(gameElements.showAnswerButtonRisk) gameElements.showAnswerButtonRisk.classList.remove('hidden');
        if(gameElements.choicesDisplay) gameElements.choicesDisplay.classList.add('hidden');
        
        if (localState.isDoublePointsQuestionActive) {
            if (gameElements.doublePointsIndicator) gameElements.doublePointsIndicator.classList.remove('hidden');
        } else {
            if (gameElements.doublePointsIndicator) gameElements.doublePointsIndicator.classList.add('hidden');
        }
        
        localState.isAnswering = true;
        startQuestionTimer();
    }

    function startQuestionTimer() {
        localAudioManager.manageBackgroundMusic('pause');
        clearInterval(localState.timerId);
        localState.timer = 30;
        if(gameElements.timerDisplay) gameElements.timerDisplay.textContent = localState.timer;
        gameElements.timerDisplay.classList.remove('hidden');
        if(gameElements.progressBar) {
            gameElements.progressBar.style.width = '100%';
            gameElements.progressBar.classList.remove('warning', 'danger');
            if(gameElements.progressBar.parentElement) gameElements.progressBar.parentElement.classList.remove('hidden');
        }
        localAudioManager.play('timer_tick');
        localState.timerId = setInterval(() => {
            if (isPaused) return;
            localState.timer--;
            document.getElementById('timer-display-risk').textContent = localState.timer;
            if(gameElements.progressBar) {
                const timePercent = (localState.timer / 30) * 100;
                gameElements.progressBar.style.width = `${timePercent}%`;
                gameElements.progressBar.classList.remove('warning', 'danger');
                if (timePercent < 50 && timePercent >= 20) {
                    gameElements.progressBar.classList.add('warning');
                } else if (timePercent < 20) {
                    gameElements.progressBar.classList.add('danger');
                }
            }
            if (localState.timer <= 0) {
                clearInterval(localState.timerId);
                localAudioManager.stop('timer_tick');
                localAudioManager.play('timer_end');
                processAnswer(false, true);
            }
        }, 1000);
    }
    
    function processAnswer(isCorrect, isTimeUp = false, isStealAttempt = false, isCorrectFromChoice = false) {
        clearInterval(localState.timerId);
        localAudioManager.stop('timer_tick');
        localAudioManager.stop('friend_call');
        localState.isAnswering = false;
        clearInterval(helplineTimerId);
        localAudioManager.manageBackgroundMusic('play');

        const teamToScoreIndex = localState.currentStealingTeamIndex !== null ? localState.currentStealingTeamIndex : localState.currentTeamIndex;
        const teamToScoreKey = teamToScoreIndex === 0 ? 'team1' : 'team2';
        
        let pointsEarned = currentQuestion.points;
        if (localState.isDoublePointsQuestionActive) {
            pointsEarned *= 2;
        }

        if (isCorrect) {
            localAudioManager.play('correct_answer');
            coreGameState.teams[teamToScoreKey].score += pointsEarned;
            if(elements.scorePopup) {
                elements.scorePopup.textContent = `+${pointsEarned}`;
                elements.scorePopup.classList.add('show');
                setTimeout(() => { elements.scorePopup.classList.remove('show'); }, 1500);
            }
        } else {
            localAudioManager.play('wrong_answer');
        }
        
        const answeredBox = gameElements.topicsContainer ? gameElements.topicsContainer.querySelector(`[data-topic-index="${currentTopicIndex}"][data-question-index="${currentQuestionIndexInTopic}"]`) : null;
        if (answeredBox) {
            answeredBox.disabled = true;
            answeredBox.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'double-points-question');
            answeredBox.classList.add('bg-gray-700', 'text-gray-500');
            answeredBox.style.cursor = 'not-allowed';
            localState.questionsData[currentTopicIndex].questions[currentQuestionIndexInTopic].answeredByTeam = teamToScoreKey;
        }
        localState.totalQuestionsAnswered++;
        localState.currentStealingTeamIndex = null;
        localState.isDoublePointsQuestionActive = false;

        if(gameElements.answerControls) gameElements.answerControls.classList.add('hidden');
        if(gameElements.lifelineButtons) gameElements.lifelineButtons.classList.add('hidden');
        if(gameElements.choicesDisplay) gameElements.choicesDisplay.classList.add('hidden');
        if(gameElements.helplineTimerContainer) gameElements.helplineTimerContainer.classList.add('hidden');
        if(gameElements.timerDisplay) gameElements.timerDisplay.classList.add('hidden');
        if(gameElements.progressBar.parentElement) gameElements.progressBar.parentElement.classList.add('hidden');
        if(gameElements.continueGameButton) gameElements.continueGameButton.classList.remove('hidden');
        if (!isCorrect && !isTimeUp) {
            if(gameElements.showAnswerButtonRisk) gameElements.showAnswerButtonRisk.classList.remove('hidden');
        }
        updateTeamDisplays();
    }

    function useLifeline(lifelineName) {
        const currentTeamKey = localState.currentTeamIndex === 0 ? 'team1' : 'team2';
        if (isPaused || localState.usedLifelines[currentTeamKey][lifelineName] || !localState.isAnswering) return;
        
        if (lifelineName === 'steal_question') {
             if(localState.currentStealingTeamIndex !== null) return;
             localState.usedLifelines[currentTeamKey][lifelineName] = true;
        } else {
             localState.usedLifelines[currentTeamKey][lifelineName] = true;
        }
        
        localAudioManager.play(lifelineName);
        updateLifelineButtonsState();

        switch (lifelineName) {
            case 'helpline':
                clearInterval(localState.timerId);
                localAudioManager.stop('timer_tick');
                localAudioManager.manageBackgroundMusic('pause');

                if(gameElements.timerDisplay) gameElements.timerDisplay.classList.add('hidden');
                if(gameElements.helplineTimerContainer) gameElements.helplineTimerContainer.classList.remove('hidden');
                
                if(gameElements.lifelineButtons) gameElements.lifelineButtons.classList.add('hidden');
                
                let helplineCurrentTime = 30;
                if(gameElements.helplineTimerDisplay) gameElements.helplineTimerDisplay.textContent = helplineCurrentTime;
                
                if(gameElements.helplineStartButton) {
                    gameElements.helplineStartButton.disabled = false;
                    gameElements.helplineStartButton.onclick = () => {
                        localAudioManager.play('friend_call');
                        helplineTimerId = setInterval(() => {
                            if (isPaused) return;
                            helplineCurrentTime--;
                            if(gameElements.helplineTimerDisplay) gameElements.helplineTimerDisplay.textContent = helplineCurrentTime;
                            if(gameElements.helplineIcon) gameElements.helplineIcon.classList.toggle('animate__pulse');
                            if (helplineCurrentTime <= 0) {
                                clearInterval(helplineTimerId);
                                localAudioManager.stop('timer_tick');
                                localAudioManager.play('timer_end');
                                if(gameElements.helplineStartButton) gameElements.helplineStartButton.disabled = true;
                                if(gameElements.helplineIcon) gameElements.helplineIcon.classList.remove('animate__pulse');
                                if(gameElements.lifelineButtons) gameElements.lifelineButtons.classList.remove('hidden');
                                updateLifelineButtonsState();
                                localAudioManager.manageBackgroundMusic('play');
                            }
                        }, 1000);
                        gameElements.helplineStartButton.disabled = true;
                    };
                }
                break;
            case 'extra_time':
                localState.timer += 30;
                if(gameElements.timerDisplay) gameElements.timerDisplay.textContent = localState.timer;
                if(gameElements.progressBar) gameElements.progressBar.style.width = `${(localState.timer / 30) * 100}%`;
                break;
            case 'show_choices':
                clearInterval(localState.timerId);
    localAudioManager.stop('timer_tick');
    if(gameElements.timerDisplay) gameElements.timerDisplay.classList.add('hidden');
    if(gameElements.progressBar.parentElement) gameElements.progressBar.parentElement.classList.add('hidden');
    
                if (currentQuestion && currentQuestion.choices && currentQuestion.choices.length > 0 && gameElements.choicesDisplay) {
                    gameElements.choicesDisplay.innerHTML = '';
                    const shuffledChoices = [...currentQuestion.choices];
                    shuffleArray(shuffledChoices);
                    shuffledChoices.forEach(choice => {
                        const choiceButton = document.createElement('button');
                        choiceButton.className = 'choice-button';
                        choiceButton.textContent = choice;
                        choiceButton.addEventListener('click', () => {
                            if (isPaused) return;
                            clearInterval(localState.timerId);
                            localAudioManager.stop('timer_tick');
                            const isCorrectChoice = (choice === currentQuestion.a);
                            if (isCorrectChoice) {
                                choiceButton.classList.add('correct-choice', 'animate__animated', 'animate__pulse');
                                setTimeout(() => processAnswer(true, false, false, true), 1000); 
                            } else {
                                choiceButton.classList.add('wrong-choice', 'animate__animated', 'animate__shakeX');
                                setTimeout(() => processAnswer(false, false, false, true), 1000);
                            }
                            gameElements.choicesDisplay.querySelectorAll('button').forEach(btn => btn.disabled = true);
                        });
                        gameElements.choicesDisplay.appendChild(choiceButton);
                    });
                    gameElements.choicesDisplay.classList.remove('hidden');
                }
                break;
            case 'steal_question':
                if (gameElements.lifelineButtons) gameElements.lifelineButtons.classList.add('hidden');
                localState.currentStealingTeamIndex = (localState.currentTeamIndex + 1) % 2;
                updateTeamDisplays();
                if(gameElements.answerControls) gameElements.answerControls.classList.remove('hidden');
                startQuestionTimer();
                break;
        }
    }
    
    function updateLifelineButtonsState() {
        const currentTeamKey = localState.currentTeamIndex === 0 ? 'team1' : 'team2';
        const teamLifelines = localState.usedLifelines[currentTeamKey];

        const lifelineButtons = [
            { element: gameElements.helplineButton, name: 'helpline' },
            { element: gameElements.extraTimeButton, name: 'extra_time' },
            { element: gameElements.showChoicesButton, name: 'show_choices' },
            { element: gameElements.stealQuestionButton, name: 'steal_question' }
        ];

        lifelineButtons.forEach(item => {
            if (item.element) {
                const isUsed = teamLifelines[item.name];
                item.element.disabled = isUsed;
                item.element.classList.toggle('lifeline-used', isUsed);
                item.element.classList.toggle('lifeline-active', !isUsed);
            }
        });
        if(gameElements.stealQuestionButton) {
            const canSteal = localState.currentStealingTeamIndex === null;
            const isStealUsed = teamLifelines.steal_question;
            gameElements.stealQuestionButton.disabled = isStealUsed || !canSteal;
            gameElements.stealQuestionButton.classList.toggle('lifeline-active', !isStealUsed && canSteal);
        }
    }

    function endGame() {
        document.removeEventListener('keydown', handleKeyDown);
        clearInterval(localState.timerId);
        clearInterval(helplineTimerId);
        localAudioManager.manageBackgroundMusic('stop');
        localAudioManager.stop('timer_tick');
        
        if(gameElements.riskGameScreen) gameElements.riskGameScreen.classList.add('hidden');
        if(elements.pauseButton) elements.pauseButton.classList.add('hidden');
        if(elements.gameModuleContainer) elements.gameModuleContainer.classList.remove('hidden');
        if(gameElements.gameOverScreen) gameElements.gameOverScreen.classList.remove('hidden');
        
        const team1 = coreGameState.teams.team1;
        const team2 = coreGameState.teams.team2;
        const winner = team1.score > team2.score ? team1 : (team2.score > team1.score ? team2 : null);
        const loser = winner ? (winner === team1 ? team2 : team1) : null;
        
        gameElements.winnerTitle.classList.add('hidden');
        gameElements.winnerName.classList.add('hidden');
        gameElements.finalScores.classList.add('hidden');

        audioManager.play('drum_roll');

        setTimeout(() => {
            if(gameElements.winnerTitle) {
                gameElements.winnerTitle.classList.remove('hidden');
                gameElements.winnerTitle.classList.add('animate__animated', 'animate__fadeInDown');
            }
        }, 500);

        setTimeout(() => {
            if (winner) {
                if(gameElements.winnerName) gameElements.winnerName.textContent = winner.name;
                if(gameElements.winnerCard) gameElements.winnerCard.style.backgroundColor = winner.color;
                
                const lightColors = ['#facc15', '#e5e7eb', '#f97316'];
                if (lightColors.includes(winner.color)) {
                    if(gameElements.winnerCard) {
                        gameElements.winnerCard.classList.remove('text-white');
                        gameElements.winnerCard.classList.add('text-gray-900');
                    }
                } else {
                    if(gameElements.winnerCard) {
                        gameElements.winnerCard.classList.remove('text-gray-900');
                        gameElements.winnerCard.classList.add('text-white');
                    }
                }
                if(gameElements.winnerTrophy) gameElements.winnerTrophy.style.color = '#facc15';
                if(typeof triggerConfetti === 'function') triggerConfetti();
            } else {
                if(gameElements.winnerName) gameElements.winnerName.textContent = "تعادل!";
                if(gameElements.winnerCard) gameElements.winnerCard.style.backgroundColor = '#4b5563';
                if(gameElements.winnerTrophy) gameElements.winnerTrophy.style.color = '#9ca3af';
            }
            if(gameElements.winnerName) {
                gameElements.winnerName.classList.remove('hidden');
                gameElements.winnerName.classList.add('animate__animated', 'animate__tada');
            }
            localAudioManager.play('Winner');
        }, 2000);
        
        setTimeout(() => {
            if(winner && loser){
                if(gameElements.finalScore1) gameElements.finalScore1.textContent = `${winner.name}: ${winner.score} نقطة`;
                if(gameElements.finalScore2) gameElements.finalScore2.textContent = `${loser.name}: ${loser.score} نقطة`;
            } else {
                if(gameElements.finalScore1) gameElements.finalScore1.textContent = `${team1.name}: ${team1.score} نقطة`;
                if(gameElements.finalScore2) gameElements.finalScore2.textContent = `${team2.name}: ${team2.score} نقطة`;
            }
            if(gameElements.finalScores) {
                gameElements.finalScores.classList.remove('hidden');
                gameElements.finalScores.classList.add('animate__animated', 'animate__fadeInUp');
            }
        }, 2500);
    }

    function pauseGame() {
        if (isPaused) return;
        isPaused = true;
        clearInterval(localState.timerId);
        clearInterval(helplineTimerId);
        localAudioManager.manageBackgroundMusic('pause');
        localAudioManager.stop('timer_tick');
        elements.pauseScreen.classList.remove('hidden');
    }

    function resumeGame() {
        if (!isPaused) return;
        isPaused = false;
        elements.pauseScreen.classList.add('hidden');
        if (localState.isAnswering) {
            startQuestionTimer();
        } else if (gameElements.helplineTimerContainer && !gameElements.helplineTimerContainer.classList.contains('hidden') && helplineTimerId) {
            // مؤقت الاتصال بصديق يعتمد على زر "بداية الوقت" لإعادة التشغيل
        }
        localAudioManager.manageBackgroundMusic('play');
    }

    function handleKeyDown(e) {
       if (elements.gameModuleContainer.classList.contains('hidden')) return;
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.metaKey && e.altKey && e.key === 'I')) {
             return;
        }
        e.preventDefault();
        
        if (isPaused) {
            if (e.key.toLowerCase() === 'escape' || e.key === ' ' || e.key.toLowerCase() === 'p') {
                if(elements.resumeGameButton) elements.resumeGameButton.click();
            }
            return;
        }

        if (e.key.toLowerCase() === 'p' || e.key === 'escape') {
            if(elements.pauseButton) elements.pauseButton.click();
            return;
        }
        
        if (gameElements.doublePointsConfirmationScreen && !gameElements.doublePointsConfirmationScreen.classList.contains('hidden')) {
            if (e.key === ' ' || e.key === 'Enter') {
                gameElements.goToQuestionButton.click();
            }
            return;
        }

        if (gameElements.preQuestionCountdownDisplay && !gameElements.preQuestionCountdownDisplay.classList.contains('hidden')) {
            return;
        }

        if (!localState.isAnswering) {
            return;
        }

        if (localState.currentStealingTeamIndex !== null) {
             switch (e.key.toLowerCase()) {
                case 'shift': if(gameElements.correctButton) gameElements.correctButton.click(); break;
                case 'control': if(gameElements.wrongButton) gameElements.wrongButton.click(); break;
            }
            return;
        }
        
        switch (e.key.toLowerCase()) {
            case 'shift': if(gameElements.correctButton) gameElements.correctButton.click(); break;
            case 'control': if(gameElements.wrongButton) gameElements.wrongButton.click(); break;
            case '1': if(gameElements.helplineButton) gameElements.helplineButton.click(); break;
            case '2': if(gameElements.extraTimeButton) gameElements.extraTimeButton.click(); break;
            case '3': if(gameElements.showChoicesButton) gameElements.showChoicesButton.click(); break;
            case '4': if(gameElements.stealQuestionButton) gameElements.stealQuestionButton.click(); break;
            case 'alt': if(gameElements.showChoicesButton) gameElements.showChoicesButton.click(); break;
        }
    }
    
    function setupEventListeners() {
        if(gameElements.correctButton) gameElements.correctButton.addEventListener('click', () => {
            if (isPaused || !localState.isAnswering) return;
            processAnswer(true);
        });

        if(gameElements.wrongButton) gameElements.wrongButton.addEventListener('click', () => {
            if (isPaused || !localState.isAnswering) return;
            processAnswer(false);
        });

        if(gameElements.showAnswerButtonRisk) gameElements.showAnswerButtonRisk.addEventListener('click', () => {
            if(gameElements.answerText) {
                gameElements.answerText.classList.remove('hidden');
                gameElements.answerText.classList.add('animate__animated', 'animate__fadeInUp', 'animate-answer-reveal');
                localAudioManager.play('Reveal');
            }
            
            if (helplineTimerId) {
                clearInterval(helplineTimerId);
                localAudioManager.stop('timer_tick');
                if(gameElements.helplineTimerContainer) gameElements.helplineTimerContainer.classList.add('hidden');
            }

            if(gameElements.showAnswerButtonRisk) gameElements.showAnswerButtonRisk.disabled = true;
        });

        if(gameElements.helplineButton) gameElements.helplineButton.addEventListener('click', () => { audioManager.play('click'); useLifeline('helpline'); });
        if(gameElements.extraTimeButton) gameElements.extraTimeButton.addEventListener('click', () => { audioManager.play('click'); useLifeline('extra_time'); });
        if(gameElements.showChoicesButton) gameElements.showChoicesButton.addEventListener('click', () => { audioManager.play('click'); useLifeline('show_choices'); });
        if(gameElements.stealQuestionButton) gameElements.stealQuestionButton.addEventListener('click', () => { audioManager.play('click'); useLifeline('steal_question'); });

        if(elements.pauseButton) elements.pauseButton.addEventListener('click', () => { audioManager.play('click'); pauseGame(); });
        if(elements.resumeGameButton) elements.resumeGameButton.addEventListener('click', () => { audioManager.play('click'); resumeGame(); });

        if(elements.pauseMainMenuButton) elements.pauseMainMenuButton.addEventListener('click', () => {
            audioManager.play('click');
            document.removeEventListener('keydown', handleKeyDown);
            localAudioManager.manageBackgroundMusic('stop');
            localAudioManager.stop('Winner');
            audioManager.stop('drum_roll');
            audioManager.play('Wala3');
            audioManager.play('Sport_Percussion');
            showScreen(elements.gameSelectionScreen);
        });

        if(gameElements.playAgainButton) gameElements.playAgainButton.addEventListener('click', () => {
            audioManager.play('click');
            start(coreGameState.startingTeamIndex);
        });

        if(gameElements.mainMenuLobbyButton) gameElements.mainMenuLobbyButton.addEventListener('click', () => {
            audioManager.play('click');
            document.removeEventListener('keydown', handleKeyDown);
            localAudioManager.stop('Winner');
            audioManager.stop('drum_roll');
            localAudioManager.manageBackgroundMusic('stop');
            audioManager.play('Wala3');
            audioManager.play('Sport_Percussion');
            showScreen(elements.gameSelectionScreen);
        });
        
        if(gameElements.continueGameButton) gameElements.continueGameButton.addEventListener('click', () => {
            audioManager.play('click');
            const totalQuestions = localState.questionsData.reduce((total, topic) => total + topic.questions.length, 0);
            if (localState.totalQuestionsAnswered >= totalQuestions) {
                endGame();
                return;
            }
            localState.currentTeamIndex = (localState.currentTeamIndex + 1) % 2;
            if(gameElements.questionDisplayArea) gameElements.questionDisplayArea.classList.add('hidden');
            if(gameElements.questionInfoDisplay) gameElements.questionInfoDisplay.classList.add('hidden');
            if(gameElements.showAnswerButtonRisk) {
                gameElements.showAnswerButtonRisk.classList.add('hidden');
                gameElements.showAnswerButtonRisk.disabled = false;
            }
            if(gameElements.answerText) gameElements.answerText.classList.add('hidden');
            if(gameElements.doublePointsIndicator) gameElements.doublePointsIndicator.classList.add('hidden');
            if(gameElements.continueGameButton) gameElements.continueGameButton.classList.add('hidden');
            if(gameElements.helplineTimerContainer) gameElements.helplineTimerContainer.classList.add('hidden');
            
            renderTopicsAndQuestions();
            startTurn();
        });

        if(gameElements.goToQuestionButton) {
            gameElements.goToQuestionButton.addEventListener('click', () => {
                audioManager.play('click');
                if(gameElements.doublePointsConfirmationScreen) gameElements.doublePointsConfirmationScreen.classList.add('hidden');
                startCountdownQuestion(3, showQuestion);
            });
        }
    }

    function init(cgs, els, ss, tc, am) {
        coreGameState = cgs;
        elements = els;
        showScreen = ss;
        triggerConfetti = tc;
        coreAudioManager = am;
        localAudioManager.init();
        const ids = {
            riskGameScreen: 'risk-game-screen',
            topicsContainer: 'topics-container',
            questionDisplayArea: 'question-display-area',
            questionText: 'question-text',
            answerText: 'answer-text',
            doublePointsIndicator: 'double-points-indicator',
            timerDisplay: 'timer-display-risk',
            progressBar: 'questions-progress-bar-risk',
            answerControls: 'answer-controls',
            correctButton: 'correct-button-risk',
            wrongButton: 'wrong-button-risk',
            lifelineButtons: 'lifeline-buttons',
            helplineButton: 'helpline-button',
            extraTimeButton: 'extra-time-button', 
            showChoicesButton: 'show-choices-button',
            stealQuestionButton: 'steal-question-button',
            choicesDisplay: 'choices-display',
            preQuestionCountdownDisplay: 'pre-question-countdown-display',
            preQuestionCountdownNumber: 'pre-question-countdown-number',
            teamInstructions: 'team-instructions',
            helplineTimerContainer: 'helpline-timer-container',
            helplineStartButton: 'helpline-start-button',
            helplineTimerDisplay: 'helpline-timer-display',
            helplineIcon: 'helpline-icon',
            showAnswerButtonRisk: 'show-answer-button-risk',
            continueGameButton: 'continue-game-button',
            team1DisplayRisk: 'team1-display-risk',
            team2DisplayRisk: 'team2-display-risk',
            currentTurnTeamNameRisk: 'current-turn-team-name-risk',
            gameOverScreen: 'risk-game-over-screen',
            winnerCard: 'winner-card',
            winnerTrophy: 'winner-trophy',
            winnerTitle: 'winner-title',
            winnerName: 'winner-name',
            finalScores: 'final-scores',
            finalScore1: 'final-score-1',
            finalScore2: 'final-score-2',
            playAgainButton: 'play-again-button',
            mainMenuLobbyButton: 'main-menu-lobby-button',
            questionInfoDisplay: 'question-info-display',
            questionTopicInfo: 'question-topic-info',
            questionPointsInfo: 'question-points-info',
            doublePointsConfirmationScreen: 'double-points-confirmation-screen',
            goToQuestionButton: 'goToQuestionButton',
        };
        for (const key in ids) {
            gameElements[key] = document.getElementById(ids[key]);
            if (!gameElements[key]) {
                console.warn(`RiskGame: Element with ID '${ids[key]}' not found.`);
            }
        }
        gameElements.team1NameDisplayRisk = gameElements.team1DisplayRisk ? gameElements.team1DisplayRisk.querySelector('h3') : null;
        gameElements.team1ScoreDisplayRisk = gameElements.team1DisplayRisk ? gameElements.team1DisplayRisk.querySelector('p') : null;
        gameElements.team2NameDisplayRisk = gameElements.team2DisplayRisk ? gameElements.team2DisplayRisk.querySelector('h3') : null;
        gameElements.team2ScoreDisplayRisk = gameElements.team2DisplayRisk ? gameElements.team2DisplayRisk.querySelector('p') : null;
        if (!listenersAttached) {
            document.addEventListener('keydown', handleKeyDown);
            setupEventListeners();
            listenersAttached = true;
        }
    }
    
    function start(startingTeamIndex) {
        resetLocalState();
        coreGameState.startingTeamIndex = startingTeamIndex || 0;
        localState.currentTeamIndex = coreGameState.startingTeamIndex;
        loadQuestions();
        displayGameScreen();
    }

    return {
        init,
        start,
        startTurn,
        getRules: () => {
    return `
    <div class="text-center mb-6">
        <h2 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500 py-2">
            🎲 قوانين لعبة ريسك 😄
        </h2>
    </div>

    <div class="space-y-5 text-lg">
        <div class="flex items-start bg-gray-900/50 p-4 rounded-xl">
            <span class="text-2xl mr-4">🔥</span>
            <p>اللعبة عبارة عن 16 سؤال .. بس فيهم 4 أسئلة نار!</p>
        </div>

        <div class="flex items-start bg-gray-900/50 p-4 rounded-xl">
            <span class="text-2xl mr-4">📚</span>
            <p>هيبقى في 4 مواضيع مختلفة، وكل موضوع فيه 4 أسئلة صعوبتها بردو مختلفة.</p>
        </div>

        <div class="flex items-start bg-gray-900/50 p-4 rounded-xl">
            <span class="text-2xl mr-4">💯</span>
            <p>السؤال الأسهل عليه 5 نقط، وبعده 10، وبعد كده 20… والسؤال الأصعب عليه 40 نقطة كاملة!</p>
        </div>
        
        <div class="flex items-start bg-gray-900/50 p-4 rounded-xl">
            <span class="text-2xl mr-4">⏱️</span>
            <p>كل فريق بيختار السؤال اللي عايز يجاوبه، وعنده <span class="font-bold text-yellow-400">30 ثانية</span> يفكر ويرد. جاوبت صح.. كسبت النقاط! الوقت خلص أو جاوبت غلط… مفيش نقط 🙃</p>
        </div>

        <div class="mt-6">
            <h3 class="text-2xl font-bold text-green-400 mb-3">🧠 وسائل المساعدة (مرة واحدة لكل فريق)</h3>
            <div class="space-y-4 pl-4">
                <div class="p-3 rounded-lg bg-gray-800">
                    <p class="font-bold text-xl">📱 الاتصال بصديق:</p>
                    <p class="text-gray-300 pr-2">بعد ما تقول السؤال، هيبقى عندك 30 ثانية صاحبك يتوقع فيهم الإجابة.</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-800">
                    <p class="font-bold text-xl">⏳ زيادة وقت:</p>
                    <p class="text-gray-300 pr-2">عايز تفكر شوية كمان؟ خدلك 30 ثانية زيادة على السؤال الحالي.</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-800">
                    <p class="font-bold text-xl">❓ عرض اختيارات:</p>
                    <p class="text-gray-300 pr-2">مش عارف تجاوب؟ ممكن يتعرضلك 4 اختيارات، واحدة بس منهم صح!</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-800">
                    <p class="font-bold text-xl">🕵️‍♂️ سرقة سؤال الخصم:</p>
                    <p class="text-gray-300 pr-2">في أخر 5 ثواني في وقت الخصم، حقك تطلب سرقة سؤال الفريق التاني.. تقدر تجاوب مكانه ولو جاوبت صح تكسب نقط السؤال 😈</p>
                </div>
            </div>
        </div>

        <div class="mt-6 border-t-2 border-yellow-500 pt-4">
            <h3 class="text-2xl font-bold text-yellow-400">⚠️ تنبيه مهم جدًا:</h3>
            <ul class="list-disc pr-6 mt-2 space-y-2 text-gray-200">
                <li>لازم الفريق يتكلم مع بعض الأول قبل ما يقول أي حاجة للحكم.</li>
                <li>لو حد في الفريق قال إجابة، هتتحسب فورًا.</li>
                <li>ولو طلب وسيلة مساعدة… هتتنفذ وهتتحسب ومفيهاش رجوع.</li>
            </ul>
        </div>
    </div>
    `;
}
    };
})();