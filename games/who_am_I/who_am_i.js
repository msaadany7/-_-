window.WhoAmIGame = (() => {
    let coreGameState, elements, showScreen, triggerConfetti, coreAudioManager;
    const gameElements = {};
    let localState = {};

    const localAudioManager = {
        elements: {},
        async init() {
            const audioSources = {
                clue_reveal: 'sounds/reveal.mp3',
                typewriter: 'sounds/click.mp3',
                champions: 'sounds/champions.mp3',
                wrong: 'sounds/wrong_answer1.mp3',
                clue_archived: 'sounds/card_flip.mp3',
                magic_reveal: 'sounds/steal_question.mp3',
                final_reveal: 'sounds/final_reveal.mp3',
                winner: 'sounds/Winner.mp3'
            };
            Object.keys(audioSources).forEach(key => {
                this.elements[key] = new Audio(audioSources[key]);
                if (key === 'typewriter') this.elements[key].volume = 0.4;
            });
        },
        play(soundName, loop = false) {
            if (!coreGameState.settings.soundEnabled) return;
            const sound = this.elements[soundName];
            if (sound) {
                sound.currentTime = 0;
                sound.loop = loop;
                sound.play().catch(e => {});
            }
        },
        stop(soundName) {
            const sound = this.elements[soundName];
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        },
        stopAll() {
            Object.keys(this.elements).forEach(soundName => this.stop(soundName));
        }
    };

    function init(cgs, els, ss, tc, am) {
        coreGameState = cgs;
        elements = els;
        showScreen = ss;
        triggerConfetti = tc;
        coreAudioManager = am;
        localAudioManager.init();

        const ids = {
            gameScreen: 'who-am-i-game-screen',
            team1Display: 'team1-display-who',
            team2Display: 'team2-display-who',
            cluesArchive: 'clues-archive',
            currentClueCard: 'current-clue-card',
            currentClueText: 'current-clue-text',
            showNextClueButton: 'show-next-clue-button',
            magicRevealButton: 'magic-reveal-button',
            interRoundScreen: 'who-am-i-inter-round-screen',
            interRoundTitle: 'inter-round-title-who',
            interRoundStartButton: 'inter-round-start-button',
            playerRevealOverlay: 'player-reveal-overlay',
            playerRevealImage: 'player-reveal-image',
            playerRevealName: 'player-reveal-name',
            playerRevealContinueButton: 'player-reveal-continue-button',
            playerRevealStarsContainer: 'player-reveal-stars',
            cluesArchiveBar: 'clues-archive-bar',
            finalCluesContainer: 'final-clues-container',
            finalCluesList: 'final-clues-list'
        };
        for (const key in ids) {
            gameElements[key] = document.querySelector(`#${ids[key]}`);
        }

        if (gameElements.team1Display) {
            gameElements.team1Name = gameElements.team1Display.querySelector('h3');
            gameElements.team1Score = gameElements.team1Display.querySelector('p');
            gameElements.team1Controls = gameElements.team1Display.querySelector('.team-controls-box');
            if (gameElements.team1Controls) {
                gameElements.team1CorrectBtn = gameElements.team1Controls.querySelector('.correct-button');
                gameElements.team1WrongBtn = gameElements.team1Controls.querySelector('.wrong-button');
            }
        }

        if (gameElements.team2Display) {
            gameElements.team2Name = gameElements.team2Display.querySelector('h3');
            gameElements.team2Score = gameElements.team2Display.querySelector('p');
            gameElements.team2Controls = gameElements.team2Display.querySelector('.team-controls-box');
            if (gameElements.team2Controls) {
                gameElements.team2CorrectBtn = gameElements.team2Controls.querySelector('.correct-button');
                gameElements.team2WrongBtn = gameElements.team2Controls.querySelector('.wrong-button');
            }
        }
        
        setupEventListeners();
    }

    function setupEventListeners() {
        if(gameElements.showNextClueButton) gameElements.showNextClueButton.addEventListener('click', revealNextClue);
        if(gameElements.magicRevealButton) gameElements.magicRevealButton.addEventListener('click', () => showAnswer(true));
        if(gameElements.interRoundStartButton) gameElements.interRoundStartButton.addEventListener('click', setupNewRound);
        if(gameElements.playerRevealContinueButton) gameElements.playerRevealContinueButton.addEventListener('click', () => {
            if(gameElements.playerRevealOverlay) gameElements.playerRevealOverlay.classList.add('hidden');
            showInterRoundScreen();
        });

        if (gameElements.team1CorrectBtn) gameElements.team1CorrectBtn.addEventListener('click', () => handleGuess(0, true));
        if (gameElements.team1WrongBtn) gameElements.team1WrongBtn.addEventListener('click', () => handleGuess(0, false));
        if (gameElements.team2CorrectBtn) gameElements.team2CorrectBtn.addEventListener('click', () => handleGuess(1, true));
        if (gameElements.team2WrongBtn) gameElements.team2WrongBtn.addEventListener('click', () => handleGuess(1, false));
    }

    function resetLocalState() {
        localState = {
            questions: [],
            currentPlayerIndex: -1,
            currentClueIndex: -1,
            isRoundActive: false,
            teamInPenalty: -1,
            cluesRevealedSincePenalty: 0,
            typewriterTimer: null,
        };
    }

    function start() {
        resetLocalState();
        if (window.gameQuestions && window.gameQuestions.who_am_i) {
            localState.questions = [...window.gameQuestions.who_am_i].sort(() => 0.5 - Math.random());
        }
        coreGameState.teams.team1.score = 0;
        coreGameState.teams.team2.score = 0;
        updateScores();

        if (coreAudioManager) {
            coreAudioManager.play('special_round_music4', true);
        }

        showInterRoundScreen();
    }

    function showInterRoundScreen() {
        const nextRoundNumber = localState.currentPlayerIndex + 2;
        if (nextRoundNumber > localState.questions.length) {
            endGame();
            return;
        }
        gameElements.interRoundScreen.classList.remove('hidden');
        if (gameElements.gameScreen) gameElements.gameScreen.classList.add('hidden');
        gameElements.interRoundTitle.textContent = `الجولة ${nextRoundNumber}`;
    }

    function setupNewRound() {
        gameElements.interRoundScreen.classList.add('hidden');
        gameElements.gameScreen.classList.remove('hidden');
        
        if(gameElements.finalCluesContainer) gameElements.finalCluesContainer.classList.add('hidden');
        if(gameElements.finalCluesList) gameElements.finalCluesList.innerHTML = '';

        localState.currentPlayerIndex++;
        if (localState.currentPlayerIndex >= localState.questions.length) {
            endGame();
            return;
        }

        localState.currentClueIndex = -1;
        localState.isRoundActive = true;
        localState.teamInPenalty = -1;
        localState.cluesRevealedSincePenalty = 0;

        if(gameElements.cluesArchive) gameElements.cluesArchive.innerHTML = '';
        if (gameElements.cluesArchiveBar) gameElements.cluesArchiveBar.classList.remove('hidden');
        if(gameElements.currentClueCard) gameElements.currentClueCard.classList.add('hidden');
        if(gameElements.currentClueText) gameElements.currentClueText.innerHTML = '';
        if(gameElements.showNextClueButton) {
            gameElements.showNextClueButton.classList.remove('hidden');
            gameElements.showNextClueButton.disabled = true;
        }
        if(gameElements.magicRevealButton) gameElements.magicRevealButton.classList.add('hidden');

        liftPenalty(0);
        liftPenalty(1);
        setTeamControlsDisabled(0, true);
        setTeamControlsDisabled(1, true);

        if (gameElements.team1Name) gameElements.team1Name.textContent = coreGameState.teams.team1.name;
        if (gameElements.team2Name) gameElements.team2Name.textContent = coreGameState.teams.team2.name;
        if (gameElements.team1Display) gameElements.team1Display.style.borderColor = coreGameState.teams.team1.color;
        if (gameElements.team2Display) gameElements.team2Display.style.borderColor = coreGameState.teams.team2.color;
        
        revealNextClue();
    }
    
    function typeWriterEffect(text, onComplete) {
        let i = 0;
        gameElements.currentClueText.innerHTML = '';
        gameElements.currentClueCard.classList.remove('hidden');
        if(localState.typewriterTimer) clearInterval(localState.typewriterTimer);
        localState.typewriterTimer = setInterval(() => {
            if (i < text.length) {
                gameElements.currentClueText.innerHTML += text.charAt(i);
                if (text.charAt(i) !== ' ') localAudioManager.play('typewriter');
                i++;
            } else {
                clearInterval(localState.typewriterTimer);
                if (onComplete) onComplete();
            }
        }, 50);
    }
    
    function revealNextClue() {
        if (!localState.isRoundActive || localState.currentClueIndex >= 4) return;
        
        gameElements.showNextClueButton.disabled = true;
        
        const oldClueText = gameElements.currentClueText.textContent;
        if (localState.currentClueIndex > -1 && oldClueText.length > 0) {
            localAudioManager.play('clue_archived');
            const archiveCard = document.createElement('div');
            archiveCard.className = 'clue-card-archive';
            archiveCard.textContent = `${localState.currentClueIndex + 1}. ${oldClueText}`;
            gameElements.cluesArchive.appendChild(archiveCard);
            gameElements.cluesArchive.scrollLeft = gameElements.cluesArchive.scrollWidth;

            if (localState.teamInPenalty !== -1) {
                localState.cluesRevealedSincePenalty++;
                if (localState.cluesRevealedSincePenalty >= 2) {
                    liftPenalty(localState.teamInPenalty);
                }
            }
        }

        localState.currentClueIndex++;
        const newClue = localState.questions[localState.currentPlayerIndex].clues[localState.currentClueIndex];

        if (localState.currentClueIndex === 4) {
             typeWriterEffect(newClue, () => {
                gameElements.showNextClueButton.classList.add('hidden');
                setTimeout(showFinalClueList, 1000);
            });
        } else {
            typeWriterEffect(newClue, () => {
                 localAudioManager.play('clue_reveal');
                 if (localState.currentClueIndex === 0) {
                    gameElements.magicRevealButton.classList.remove('hidden');
                 }
                 gameElements.showNextClueButton.disabled = false;
                 if (localState.teamInPenalty !== 0) setTeamControlsDisabled(0, false);
                 if (localState.teamInPenalty !== 1) setTeamControlsDisabled(1, false);
            });
        }
    }

    function showFinalClueList() {
        localAudioManager.play('final_reveal');
        
        if(gameElements.currentClueCard) gameElements.currentClueCard.classList.add('hidden');
        if (gameElements.cluesArchiveBar) gameElements.cluesArchiveBar.classList.add('hidden');
        
        const allClues = localState.questions[localState.currentPlayerIndex].clues;
        
        if(gameElements.finalCluesList) gameElements.finalCluesList.innerHTML = '';
        allClues.forEach((clue, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'final-clue-item';
            listItem.textContent = `${index + 1}. ${clue}`;
            gameElements.finalCluesList.appendChild(listItem);
        });
        if(gameElements.finalCluesContainer) gameElements.finalCluesContainer.classList.remove('hidden');

        if (localState.teamInPenalty !== 0) setTeamControlsDisabled(0, false);
        if (localState.teamInPenalty !== 1) setTeamControlsDisabled(1, false);
    }

    function applyPenalty(teamIndex) {
        const otherTeamIndex = teamIndex === 0 ? 1 : 0;
        liftPenalty(otherTeamIndex);
        
        localState.teamInPenalty = teamIndex;
        localState.cluesRevealedSincePenalty = 0;
        setTeamControlsDisabled(teamIndex, true);
        const teamDisplay = teamIndex === 0 ? gameElements.team1Display : gameElements.team2Display;
        if (teamDisplay) teamDisplay.classList.add('team-penalized');
    }

    function liftPenalty(teamIndex) {
        if (localState.teamInPenalty === teamIndex) {
            localState.teamInPenalty = -1;
            localState.cluesRevealedSincePenalty = 0;
        }
        setTeamControlsDisabled(teamIndex, !localState.isRoundActive);
        const teamDisplay = teamIndex === 0 ? gameElements.team1Display : gameElements.team2Display;
        if (teamDisplay) teamDisplay.classList.remove('team-penalized');
    }

    function handleGuess(teamIndex, isCorrect) {
        if (!localState.isRoundActive) return;

        if (isCorrect) {
            localAudioManager.play('champions');
            
            const teamKey = `team${teamIndex + 1}`;
            coreGameState.teams[teamKey].score++;
            updateScores();

            const teamDisplay = teamIndex === 0 ? gameElements.team1Display : gameElements.team2Display;
            if (teamDisplay) {
                teamDisplay.classList.add('score-flash');
                setTimeout(() => teamDisplay.classList.remove('score-flash'), 1000);
            }
            
            showAnswer(false);

        } else {
            localAudioManager.play('wrong');
            applyPenalty(teamIndex);
        }
    }

    function showAnswer(playSound = true) {
        if ((!localState.isRoundActive && !gameElements.playerRevealOverlay.classList.contains('hidden')) || !localState.questions[localState.currentPlayerIndex]) return;
        
        localState.isRoundActive = false;
        clearInterval(localState.typewriterTimer);
        liftPenalty(0);
        liftPenalty(1);
        setTeamControlsDisabled(0, true);
        setTeamControlsDisabled(1, true);
        if(gameElements.showNextClueButton) gameElements.showNextClueButton.classList.add('hidden');
        if(gameElements.magicRevealButton) gameElements.magicRevealButton.classList.add('hidden');
        
        const player = localState.questions[localState.currentPlayerIndex];
        if(gameElements.playerRevealImage) gameElements.playerRevealImage.src = player.image;
        if(gameElements.playerRevealName) gameElements.playerRevealName.textContent = player.name;
        
        if (playSound) {
            localAudioManager.play('magic_reveal');
        }

        // --- START: MODIFIED CODE BLOCK ---
        if (coreAudioManager && coreAudioManager.elements['special_round_music4']) {
            const originalVolume = coreAudioManager.elements['special_round_music4'].volume; // حفظ مستوى الصوت الحالي
            coreAudioManager.setVolume('special_round_music4', 0.1); // خفض الصوت
            setTimeout(() => {
                coreAudioManager.setVolume('special_round_music4', originalVolume); // إعادة الصوت لمستواه الأصلي المحفوظ
            }, 7000); // بعد 6 ثواني
        }
        // --- END: MODIFIED CODE BLOCK ---

        createSparkles();
        if(gameElements.playerRevealOverlay) gameElements.playerRevealOverlay.classList.remove('hidden');
    }
    
    function createSparkles() {
        const container = gameElements.playerRevealStarsContainer;
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const size = Math.random() * 10 + 5;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.animationDuration = `${Math.random() * 2 + 1}s`;
            star.style.animationDelay = `${Math.random() * 1}s`;
            container.appendChild(star);
        }
    }

    function setTeamControlsDisabled(teamIndex, isDisabled) {
        const correctBtn = teamIndex === 0 ? gameElements.team1CorrectBtn : gameElements.team2CorrectBtn;
        const wrongBtn = teamIndex === 0 ? gameElements.team1WrongBtn : gameElements.team2WrongBtn;
        if (correctBtn) correctBtn.disabled = isDisabled;
        if (wrongBtn) wrongBtn.disabled = isDisabled;
    }

    function updateScores() {
        if(gameElements.team1Score) gameElements.team1Score.textContent = coreGameState.teams.team1.score;
        if(gameElements.team2Score) gameElements.team2Score.textContent = coreGameState.teams.team2.score;
    }

    function endGame() {
        if (coreAudioManager) {
            coreAudioManager.stop('special_round_music4');
        }
        
        localAudioManager.stop('suspense');
        
        if (coreGameState.teams.team1.score === coreGameState.teams.team2.score && localState.questions.length > localState.currentPlayerIndex + 1) {
            // Tie-breaker logic can be implemented here if needed.
        }
        
        localAudioManager.play('winner');
        triggerConfetti();
        document.getElementById('who-am-i-game-screen').classList.add('hidden');
        
        const gameOverScreen = document.getElementById('game-over-screen');
        const winnerNameEl = document.getElementById('winner-name');
        const finalScoreTextEl = document.getElementById('final-score-text');
        const mainMenuButton = document.getElementById('main-menu-button');
        const playAgainButton = document.getElementById('play-again-button');

        const winner = coreGameState.teams.team1.score > coreGameState.teams.team2.score 
            ? coreGameState.teams.team1 
            : (coreGameState.teams.team2.score > coreGameState.teams.team1.score 
                ? coreGameState.teams.team2 
                : null);
        
        const loser = winner 
            ? (winner === coreGameState.teams.team1 ? coreGameState.teams.team2 : coreGameState.teams.team1) 
            : coreGameState.teams.team1;

        if (winner) {
            if (winnerNameEl) {
                winnerNameEl.textContent = winner.name;
                winnerNameEl.style.color = winner.color;
            }
            if (finalScoreTextEl) {
                finalScoreTextEl.textContent = `${winner.score} - ${loser.score}`;
            }
        } else {
            if (winnerNameEl) {
                winnerNameEl.textContent = "تعادل!";
                winnerNameEl.style.color = '#ffffff';
            }
            if (finalScoreTextEl) {
                finalScoreTextEl.textContent = `${coreGameState.teams.team1.score} - ${coreGameState.teams.team2.score}`;
            }
        }
        
        if (mainMenuButton) {
            mainMenuButton.onclick = () => {
                localAudioManager.stopAll();
                if (coreAudioManager) {
                    coreAudioManager.play('Wala3');
                    coreAudioManager.play('Sport_Percussion');
                }
                showScreen(elements.gameSelectionScreen);
            };
        }
        
        if (playAgainButton) {
            playAgainButton.onclick = () => location.reload();
        }

        if (gameOverScreen) gameOverScreen.classList.remove('hidden');
    }

    function getRules() {
        return `
            <div class="space-y-4 text-right">
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-question-circle"></i></div>
                    <div class="rule-text">في كل جولة، يتم عرض 5 معلومات عن لاعب كرة قدم غامض. اللعبة مكونة من 3 جولات.</div>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-eye"></i></div>
                    <div class="rule-text">يقوم المضيف بكشف المعلومات واحدة تلو الأخرى.</div>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-magic"></i></div>
                    <div class="rule-text">يظهر "زر سحري" يمكن للمضيف الضغط عليه لكشف الإجابة وإنهاء الجولة في أي وقت.</div>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-check"></i></div>
                    <div class="rule-text">الفريق الذي يخمن بشكل صحيح أولاً يحصل على نقطة.</div>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-times"></i></div>
                    <div class="rule-text">إذا خمن فريق بشكل خاطئ، يتم منعه من الإجابة.</div>
                </div>
                 <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-exchange-alt"></i></div>
                    <div class="rule-text">إذا أخطأ الفريق الآخر، تُرفع العقوبة عن الفريق الأول. أو تُرفع بعد كشف معلومتين جديدتين.</div>
                </div>
                <div class="rule-card">
                    <div class="rule-icon"><i class="fas fa-trophy"></i></div>
                    <div class="rule-text">الفريق صاحب أعلى عدد من النقاط في النهاية هو الفائز.</div>
                </div>
            </div>
        `;
    }

    return { init, start, getRules };
})();