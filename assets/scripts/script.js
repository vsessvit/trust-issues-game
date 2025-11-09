// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 910; // New width for a wider game window
canvas.height = 550; // New height for a taller game window

// Game variables
let currentLevel = 1;
let player = {
    x: 50,
    y: 500,
    width: 30,
    height: 30,

    dx: 0,
    dy: 0,
    onGround: false
};
let gravity = 0.5;
let keys = {};
let platforms = [];
let traps = [];
let level7SpikeTimerStarted = false;
let level7SpikeTimeout = null;
let level9DisappearTimerStarted = false;
let level9DisappearTimeout = null;
let level8WallTimerStarted = false;
let level8WallTimeout = null;
let level10DotsTimerStarted = false;
let level10DotsTimeout = null;
const victoryMusic = new Audio('assets/sounds/victory.wav');
let lives = 5;
let timer = 0;
let gameInterval;
let level5SpikeTimeout = null;
let level5SpikeInterval = null;
let levelData = {};
let gamePaused = true;
let deathPieces = [];
let respawnAnimation = false;

// Additional game variables
let playerDead = false;
let explosionTimer = 0;
let showRestartMessage = false;
let goalReached = false;
let showResetPopup = false;
let showFallOutPopup = false;
let fallOutPopupTimer = 0;

// Load sounds
const jumpSound = new Audio('assets/sounds/jump.wav');
const trapSound = new Audio('assets/sounds/trap.wav');
const winSound = new Audio('assets/sounds/win.wav');
const deathSound = new Audio('assets/sounds/death.wav');

let frameCounter = 0;

// Utility to get saved level
function getSavedLevel() {
    const savedLevel = localStorage.getItem('trustIssuesLevel');
    return savedLevel ? parseInt(savedLevel) : 1;
}

// Start game logic
function startGame(levelNum) {
    // Start game directly for all devices (desktop and mobile)
    actuallyStartGame(levelNum);
}

// Actually start the game (after overlay is dismissed or on desktop)
function actuallyStartGame(levelNum) {
    // --- MOBILE/TABLET CONTROL VISIBILITY ---
    const leftControls = document.querySelector('.left-controls');
    const onscreenControls = document.querySelector('.onscreen-controls');
    const isMobileOrTablet = window.innerWidth <= 1400; // Include tablets up to 1200px

    if (isMobileOrTablet) {
        if (leftControls) leftControls.classList.add('hide-on-mobile-game');
        if (onscreenControls) {
            onscreenControls.classList.add('active');
        }
    } else {
        if (leftControls) leftControls.classList.remove('hide-on-mobile-game');
        if (onscreenControls) {
            onscreenControls.classList.remove('active');
        }
    }

    // Hide the start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
    // Hide the start button container
    const startButtonContainer = document.querySelector('.start-button-container');
    if (startButtonContainer) {
        startButtonContainer.style.display = 'none';
    }
    // Hide the instructions
    const instructionsContainer = document.querySelector('.instructions-centered');
    if (instructionsContainer) {
        instructionsContainer.style.display = 'none';
    }
    // Hide the level select buttons
    const levelSelect = document.getElementById('levelSelect');
    if (levelSelect) {
        levelSelect.style.display = 'none';
    }
    // Show the game canvas
    canvas.style.display = 'block';

    // Add game-active class to show black background
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.classList.add('game-active');
    }

    lives = 5;
    // Load the specified level
    loadLevel(levelNum);
}

// Load level from JSON
function loadLevel(levelNum) {
    // Reset level 7 spike timer state
    level7SpikeTimerStarted = false;
    if (level7SpikeTimeout) {
        clearTimeout(level7SpikeTimeout);
        level7SpikeTimeout = null;
    }
    // Reset level 9 disappear timer state
    level9DisappearTimerStarted = false;
    if (level9DisappearTimeout) {
        clearTimeout(level9DisappearTimeout);
        level9DisappearTimeout = null;
    }

    // Reset level 8 wall timer state
    level8WallTimerStarted = false;
    if (level8WallTimeout) {
        clearTimeout(level8WallTimeout);
        level8WallTimeout = null;
    }

    // Reset level 10 dots timer state
    level10DotsTimerStarted = false;
    if (level10DotsTimeout) {
        clearTimeout(level10DotsTimeout);
        level10DotsTimeout = null;
    }

    // Clear level 5 spike timers/intervals to prevent leftover spikes
    if (typeof level5SpikeTimeout !== 'undefined' && level5SpikeTimeout) {
        clearTimeout(level5SpikeTimeout);
        level5SpikeTimeout = null;
    }
    if (typeof level5SpikeInterval !== 'undefined' && level5SpikeInterval) {
        clearInterval(level5SpikeInterval);
        level5SpikeInterval = null;
    }
    goalReached = false;
    currentLevel = levelNum;

    fetch(`assets/scripts/levels/level${levelNum}.json`)
        .then(res => res.json())
        .then(data => {

            currentLevel = levelNum;
            levelData = data;
            platforms = data.platforms || [];
            // Deep copy traps so each reload starts fresh
            traps = (data.traps || []).map(trap => JSON.parse(JSON.stringify(trap)));

            // For level 7, hide spikes with appearAfterMove until triggered
            if (levelNum === 7) {
                traps.forEach(t => {
                    if (t.appearAfterMove) {
                        t.hidden = true;
                    }
                });
            }

            player = {
                x: data.player.startX,
                y: data.player.startY,
                width: data.player.width || 30,
                height: data.player.height || 30,
                dx: 0,
                dy: 0,
                onGround: false
            };
            gamePaused = false;
            runGameLoop();

            // --- Level 5: Timed spike spawning logic ---
            if (levelNum === 5) {
                // Clear previous spike timers if any
                if (level5SpikeTimeout) {
                    clearTimeout(level5SpikeTimeout);
                    level5SpikeTimeout = null;
                }
                if (level5SpikeInterval) {
                    clearInterval(level5SpikeInterval);
                    level5SpikeInterval = null;
                }
                // Remove any existing spikes
                traps = traps.filter(t => t.type !== 'spikes');
                let spikeStep = 0;
                const stepPlatforms = platforms.slice(0, 11); // 11 steps
                level5SpikeTimeout = setTimeout(() => {
                    level5SpikeInterval = setInterval(() => {
                        if (spikeStep >= stepPlatforms.length) {
                            clearInterval(level5SpikeInterval);
                            level5SpikeInterval = null;
                            return;
                        }
                        const p = stepPlatforms[spikeStep];
                        // Place spike in the center of the step
                        traps.push({
                            x: p.x + p.width / 2 - 20,
                            y: p.y - 20,
                            width: 40,
                            height: 20,
                            color: '#8B4513',
                            type: 'spikes'
                        });
                        spikeStep++;
                    }, 1000); //1 second between each spike
                }, 3000); //3 seconds delay before spikes start appearing
            }
            // --- End Level 5 spike logic ---
        })
        .catch(err => {
            console.error("Failed to load level:", err);
            alert("Failed to load level " + levelNum + ". Check your level JSON file for errors.");
        });
}

function onPlayerReachGoal() {
    gamePaused = true;

    // Check if this is level 10 - show winning animation instead
    if (currentLevel === 10) {
        showGameCompletionAnimation();
        return;
    }

    // Animate the door closing (for levels 1-9)
    const goal = levelData.goal;
    const doorAnimationDuration = 1000; // 1 second

    // Split the door into two halves for animation
    const leftDoor = { x: goal.x, y: goal.y, width: goal.width / 2, height: goal.height };
    const rightDoor = { x: goal.x + goal.width / 2, y: goal.y, width: goal.width / 2, height: goal.height };

    const animationInterval = setInterval(() => {
        // Move the doors toward each other
        leftDoor.width -= 2;
        rightDoor.x += 2;
        rightDoor.width -= 2;

        // Redraw the doors
        ctx.fillStyle = goal.color || '#C0C0C0';
        ctx.fillRect(leftDoor.x, leftDoor.y, leftDoor.width, leftDoor.height);
        ctx.fillRect(rightDoor.x, rightDoor.y, rightDoor.width, rightDoor.height);

        // Stop the animation when the doors are fully closed
        if (leftDoor.width <= 0 || rightDoor.width <= 0) {
            clearInterval(animationInterval);
            // Only transition to next level if currentLevel < 10
            if (currentLevel < 10) {
                setTimeout(() => {
                    elevatorTransition(() => {
                        loadLevel(currentLevel + 1);
                    });
                }, 300); // Shortened delay after door animation
            } else {
                // If level 10, show completion animation
                setTimeout(() => {
                    showGameCompletionAnimation();
                }, 300);
            }
        }
    }, doorAnimationDuration / 50); // Smooth animation (50 frames)
}

// Game completion animation for level 10
function showGameCompletionAnimation() {
    stopAllSounds();
    playSound(victoryMusic);

    // Get canvas position and size
    const canvasRect = canvas.getBoundingClientRect();

    // Create overlay positioned over the game canvas
    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.style.top = canvasRect.top + 'px';
    overlay.style.left = canvasRect.left + 'px';
    overlay.style.width = canvasRect.width + 'px';
    overlay.style.height = canvasRect.height + 'px';
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.classList.add('show'); }, 10);

    // Add confetti canvas first (behind text)
    const confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'victory-confetti';
    confettiCanvas.width = canvasRect.width;
    confettiCanvas.height = canvasRect.height;
    overlay.appendChild(confettiCanvas);
    drawWinConfetti(confettiCanvas);

    // Pulsing congratulatory message
    const msg = document.createElement('h1');
    msg.className = 'victory-message';
    msg.textContent = "Congratulations, you've finished the game!";
    msg.style.fontSize = Math.min(canvasRect.width / 15, 48) + 'px';
    msg.style.position = 'absolute';
    msg.style.top = '35%';
    msg.style.left = '0';
    msg.style.right = '0';
    msg.style.textAlign = 'center';
    msg.style.margin = '0 auto';
    msg.style.padding = '0 10px';
    overlay.appendChild(msg);

    // Play again button (bigger)
    const restartBtn = document.createElement('button');
    restartBtn.className = 'victory-button';
    restartBtn.textContent = 'Play again';
    restartBtn.style.fontSize = Math.min(canvasRect.width / 15, 28) + 'px';
    restartBtn.style.position = 'absolute';
    restartBtn.style.bottom = '20%';
    restartBtn.style.left = '50%';
    restartBtn.style.transform = 'translateX(-50%)';
    restartBtn.style.padding = '16px 40px';
    restartBtn.style.minWidth = '200px';
    restartBtn.style.minHeight = '60px';
    restartBtn.addEventListener('click', () => {
        overlay.remove();
        victoryMusic.pause();
        victoryMusic.currentTime = 0;
        localStorage.setItem('trustIssuesLevel', 1);
        startGame(1);
    });
    overlay.appendChild(restartBtn);
}

// Confetti for win screen
function drawWinConfetti(canvas) {
    const ctx = canvas.getContext('2d');
    const confettiCount = 80;
    const confetti = [];

    // Create confetti pieces
    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            w: Math.random() * 8 + 4,
            h: Math.random() * 8 + 4,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 3 + 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 6,
            color: `hsl(${Math.random() * 360}, 90%, 60%)`,
            gravity: 0.1
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        confetti.forEach(piece => {
            // Update position
            piece.x += piece.vx;
            piece.y += piece.vy;
            piece.vy += piece.gravity;
            piece.rotation += piece.rotationSpeed;

            // Reset if off screen
            if (piece.y > canvas.height) {
                piece.y = -20;
                piece.x = Math.random() * canvas.width;
                piece.vy = Math.random() * 3 + 2;
            }
            if (piece.x > canvas.width) piece.x = 0;
            if (piece.x < 0) piece.x = canvas.width;

            // Draw confetti piece
            ctx.save();
            ctx.translate(piece.x + piece.w / 2, piece.y + piece.h / 2);
            ctx.rotate((piece.rotation * Math.PI) / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
            ctx.restore();
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// Game loop
function runGameLoop() {
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        update();
        draw();
        if (!gamePaused) {
            timer++;
        }
    }, 1000 / 60);
}

// Update game state
function update() {
    // Level 6: Make moving hole visible when player is close
    if (currentLevel === 6) {
        traps.forEach(t => {
            if (t.type === "moving_hole" && Math.abs(player.x - t.x) < (t.movement && t.movement.triggerDistance ? t.movement.triggerDistance : 120)) {
                t.hidden = false;
            }
        });
    }

    // Level 7: Trigger spike after player moves 
    if (currentLevel === 7 && !level7SpikeTimerStarted) {
        if (player.dx !== 0 || player.dy !== 0) {
            // Find all spike traps with appearAfterMove
            const spikes = traps.filter(t => t.appearAfterMove && t.hidden);
            if (spikes.length) {
                level7SpikeTimerStarted = true;
                spikes.forEach(spike => {
                    level7SpikeTimeout = setTimeout(() => {
                        spike.hidden = false;
                        // If spike moves right, schedule direction reversal after 3 seconds
                        if (spike.movement && spike.movement.direction === "right") {
                            setTimeout(() => {
                                spike.movement.direction = "left";
                            }, 6000);
                        }
                    }, spike.movement && spike.movement.triggerDelay ? spike.movement.triggerDelay : 3000);
                });
            }
        }
    }

    //Level 8: Trigger moving wall after player moves 
    if (currentLevel === 8 && !level8WallTimerStarted) {
        if (player.dx !== 0 || player.dy !== 0) {
            // Find all moving wall traps with appearAfterMove
            const walls = traps.filter(t => t.appearAfterMove && t.hidden);
            if (walls.length) {
                level8WallTimerStarted = true;
                walls.forEach(wall => {
                    level8WallTimeout = setTimeout(() => {
                        wall.hidden = false;
                    }, wall.movement && wall.movement.triggerDelay ? wall.movement.triggerDelay : 1500);
                });
            }
        }
    }

    // Level 9: Trigger disappearing floor after player moves
    if (currentLevel === 9 && !level9DisappearTimerStarted) {
        if (player.dx !== 0 || player.dy !== 0) {
            // Find all platforms with disappearing property
            const disappearingPlatforms = platforms.filter(p => p.disappearing && !p.disappeared);
            if (disappearingPlatforms.length) {
                level9DisappearTimerStarted = true;
                disappearingPlatforms.forEach(platform => {
                    level9DisappearTimeout = setTimeout(() => {
                        platform.disappeared = true;
                    }, platform.disappearDelay ? platform.disappearDelay : 3000);
                });
            }
        }
    }

    // Level 10: Start moving dots after 4 seconds
    if (currentLevel === 10 && !level10DotsTimerStarted) {
        level10DotsTimerStarted = true;
        level10DotsTimeout = setTimeout(() => {
            traps.forEach(trap => {
                if (trap.type === "movingDot") {
                    trap.moving = true;
                }
            });
        }, 4000);
    }

    if (gamePaused) return;
    if (keys['ArrowLeft']) player.dx = -3;
    else if (keys['ArrowRight']) player.dx = 3;
    else player.dx = 0;

    if ((keys['ArrowUp'] || keys['Space']) && player.onGround) {
        player.dy = -10;
        player.onGround = false;
        playSound(jumpSound);
    }

    player.dy += gravity;
    player.x += player.dx;
    player.y += player.dy;

    // Detect if player walks outside the screen
    if (!playerDead && (
        player.x + player.width < 0 ||
        player.x > canvas.width ||
        player.y > canvas.height ||
        player.y + player.height < 0
    )) {
        playSound(deathSound);
        showFallOutPopup = true;
        fallOutPopupTimer = 60; // 1 second at 60 FPS
        playerDead = true;
        explosionTimer = 0;
        player.dx = 0;
        player.dy = 0;
        lives--;
    }

    // Platform collision (skip if player is over a hole)
    player.onGround = false;
    platforms.forEach(p => {
        if (p.disappeared) return; // Skip disappeared platforms
        let overHole = false;
        traps.forEach(t => {
            if (
                t.type === "moving_hole" &&
                player.x + player.width > t.x &&
                player.x < t.x + t.width &&
                player.y + player.height >= t.y &&
                player.y < t.y + t.height
            ) {
                overHole = true;
            }
        });

        // Platform collision: Only allow landing on top, not jumping through from below
        if (!overHole &&
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y + player.height > p.y &&
            player.y + player.height - player.dy <= p.y &&
            player.dy > 0) {
            // Land on top
            player.y = p.y - player.height;
            player.dy = 0;
            player.onGround = true;
        }
        // Prevent jumping through from below
        // If player's head is colliding with platform bottom while moving up
        if (!overHole &&
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y < p.y + p.height &&
            player.y > p.y &&
            player.dy < 0) {
            // Hit head on platform
            player.y = p.y + p.height;
            player.dy = 0;
        }
    });

    // Trap collision (player dies)
    traps.forEach(t => {
        if (t.hidden) return; // Skip hidden traps (for level 7 spike)
        if (
            (t.type === "moving_hole" &&
                player.x + player.width > t.x &&
                player.x < t.x + t.width &&
                player.y + player.height > t.y &&
                player.y < t.y + t.height) ||
            (t.type === "spikes" || t.type === "moving_spikes") &&
            player.x + player.width > t.x &&
            player.x < t.x + t.width &&
            player.y + player.height > t.y - t.height &&
            player.y < t.y ||
            (t.type === "movingDot" &&
                player.x + player.width > t.x &&
                player.x < t.x + t.width &&
                player.y + player.height > t.y &&
                player.y < t.y + t.height)
        ) {
            //player dies
            if (!playerDead) { // Only decrement lives once per death
                playSound(trapSound);
                playSound(deathSound);
                playerDead = true;
                explosionTimer = 0;
                player.dx = 0;
                player.dy = 0;
                lives--;
            }
        }

        // Move traps if they are "moving_hole" or "moving_spikes"
        if (t.type === "moving_hole" && Math.abs(player.x - t.x) < t.movement.triggerDistance) {
            if (t.hidden) t.hidden = false; // Reveal the hole when player is close
            // Only move if movement.speed is set and nonzero
            if (t.movement && t.movement.speed) {
                t.x -= t.movement.speed;
            }
        } else if (t.type === "moving_hole" && !t.hidden && t.movement && t.movement.speed === 0) {
            // If hole is revealed and speed is zero, keep it visible
            // No movement, just ensure it's drawn
        }
        if (t.type === "moving_spikes") {
            // For level 7, only move if not hidden
            if (t.hidden) return;
            // If triggerDistance is set, only move if player is close
            if (t.movement && t.movement.triggerDistance) {
                if (Math.abs(player.x - t.x) < t.movement.triggerDistance) {
                    t.x += t.movement.direction === "left" ? -t.movement.speed : t.movement.speed;
                }
            } else {
                // For level 7, just move every frame once revealed
                t.x += t.movement.direction === "left" ? -t.movement.speed : t.movement.speed;
            }
        }

        // Move movingDot traps (Level 10)
        if (t.type === "movingDot" && t.moving) {
            if (t.direction === "right") {
                t.x += t.speed;
            } else if (t.direction === "left") {
                t.x -= t.speed;
            }
        }
    });

    // Handle player explosion and restart message
    if (playerDead) {
        explosionTimer++;
        if (explosionTimer > 60) { // Show explosion for 1 second
            if (lives <= 0) {
                showResetPopup = true;
                showRestartMessage = false;
            } else {
                showRestartMessage = true;
            }
        }
        return; // Skip normal update while dead
    }

    // Goal collision check
    const goal = levelData.goal;
    if (
        goal &&
        !goalReached &&
        player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y < goal.y + goal.height &&
        player.y + player.height > goal.y
    ) {
        goalReached = true;
        // Play win sound when reaching goal
        playSound(winSound);
        // Move player into the center of the door
        player.x = goal.x + (goal.width - player.width) / 2;
        player.y = goal.y + (goal.height - player.height) / 2;
        // Only save progress if not on the final level
        if (currentLevel < 10) {
            localStorage.setItem('trustIssuesLevel', currentLevel + 1);
        }
        gamePaused = true;
        onPlayerReachGoal();
    }
}

let debugMode = false;

// Debug toggle (HTML button)
const debugToggle = document.getElementById('debugToggle');
if (debugToggle) {
    debugToggle.addEventListener('click', () => {
        debugMode = !debugMode;
        alert(debugMode ? "Debug Mode ON" : "Debug Mode OFF");
    });
}

function handleCanvasTouch(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Pause button area
    const pauseBtnX = canvas.width - 60;
    const pauseBtnY = 16;
    const pauseBtnW = 40;
    const pauseBtnH = 40;

    if (
        x >= pauseBtnX && x <= pauseBtnX + pauseBtnW &&
        y >= pauseBtnY && y <= pauseBtnY + pauseBtnH
    ) {
        e.preventDefault();
        gamePaused = true;
        showPausePopup();
    }
}

canvas.addEventListener('click', handleCanvasTouch);
canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });

let soundEnabled = true;

function playSound(sound) {
    if (!soundEnabled) return;

    // Always reset to start
    sound.currentTime = 0;
    sound.play().catch(() => {
        // Handle autoplay restrictions silently
    });
}

function stopAllSounds() {
    [jumpSound, trapSound, winSound, deathSound, victoryMusic].forEach(snd => {
        snd.pause();
        snd.currentTime = 0;
    });
}

// Draw the player as a stick figure with running animation
function drawPlayer(ctx, player) {
    const { x, y, width, height } = player;

    // Calculate center of the player
    const centerX = x + width / 2;

    // Use player movement direction to determine animation
    const isMoving = player.dx !== 0;
    const direction = player.dx > 0 ? 1 : -1;

    // Head
    ctx.beginPath();
    ctx.arc(centerX, y + height * 0.2, width * 0.2, 0, Math.PI * 2); // Circle for the head
    ctx.fillStyle = '#F5F5DC'; // Beige color
    ctx.fill();
    ctx.closePath();

    // Body
    ctx.beginPath();
    ctx.moveTo(centerX, y + height * 0.4); // Start at the neck
    ctx.lineTo(centerX, y + height * 0.8); // Draw the body
    ctx.strokeStyle = '#F5F5DC';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    // Arms - running animation
    ctx.beginPath();
    if (isMoving) {
        // Running arm animation
        const armSwing = Math.sin(frameCounter / 5) * 20;

        // Forward arm
        ctx.moveTo(centerX, y + height * 0.5);
        ctx.lineTo(centerX + (armSwing * direction), y + height * 0.6);

        // Backward arm
        ctx.moveTo(centerX, y + height * 0.5);
        ctx.lineTo(centerX - (armSwing * direction), y + height * 0.6);
    } else {
        // Standing position
        ctx.moveTo(centerX, y + height * 0.5);
        ctx.lineTo(centerX - width * 0.3, y + height * 0.6);

        ctx.moveTo(centerX, y + height * 0.5);
        ctx.lineTo(centerX + width * 0.3, y + height * 0.6);
    }
    ctx.stroke();
    ctx.closePath();

    // Legs - running animation
    ctx.beginPath();
    if (isMoving || !player.onGround) {
        // Running or jumping leg animation
        const legSwing = Math.cos(frameCounter / 5) * 20;

        // Forward leg
        ctx.moveTo(centerX, y + height * 0.8);
        ctx.lineTo(centerX + (legSwing * direction), y + height);

        // Backward leg
        ctx.moveTo(centerX, y + height * 0.8);
        ctx.lineTo(centerX - (legSwing * direction), y + height);
    } else {
        // Standing position
        ctx.moveTo(centerX, y + height * 0.8);
        ctx.lineTo(centerX - width * 0.2, y + height);

        ctx.moveTo(centerX, y + height * 0.8);
        ctx.lineTo(centerX + width * 0.2, y + height);
    }
    ctx.stroke();
    ctx.closePath();
}

// Draw game
function draw() {
    // Clear the canvas
    ctx.fillStyle = "#000000"; // Background color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    platforms.forEach(p => {
        if (p.disappeared) return; // Don't draw disappeared platforms
        ctx.fillStyle = p.color || '#F4A460'; // Platform color
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw traps
    traps.forEach(t => {
        if (t.type === "moving_hole") {
            if (t.hidden) return; // Don't draw hidden holes
            ctx.fillStyle = t.visibleColor || "#000000";
            ctx.fillRect(t.x, t.y, t.width, t.height);
        } else if (t.hidden) {
            return; // Don't draw other hidden traps
        } else if (t.type === "spikes" || t.type === "moving_spikes") {
            // Draw spikes as triangles
            ctx.fillStyle = t.color || '#8B4513'; // Spike color
            const spikeCount = Math.floor(t.width / 10); // Number of spikes based on width
            for (let i = 0; i < spikeCount; i++) {
                ctx.beginPath();
                ctx.moveTo(t.x + i * 10, t.y); // Bottom-left of spike
                ctx.lineTo(t.x + i * 10 + 5, t.y - t.height); // Top of spike
                ctx.lineTo(t.x + i * 10 + 10, t.y); // Bottom-right of spike
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // Default trap rendering
            ctx.fillStyle = t.color || '#FF4500';
            ctx.fillRect(t.x, t.y, t.width, t.height);
        }
    });

    // Draw goal
    const goal = levelData.goal;
    ctx.fillStyle = goal.color || '#C0C0C0'; // Goal color
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);

    // Draw HUD
    ctx.fillStyle = '#F5F5DC';
    ctx.font = '20px Arial';
    ctx.fillText(`Level: ${currentLevel}`, 10, 20);
    ctx.fillText(`Time: ${Math.floor(timer / 60)}s`, 10, 60);

    // Draw pause button (top-right corner)
    const pauseBtnX = canvas.width - 60;
    const pauseBtnY = 16;
    const pauseBtnW = 40;
    const pauseBtnH = 40;

    // Draw button background
    ctx.fillStyle = "#000000ff";
    ctx.fillRect(pauseBtnX, pauseBtnY, pauseBtnW, pauseBtnH);

    // Draw pause icon
    ctx.fillStyle = "#F5F5DC";
    ctx.fillRect(pauseBtnX + 10, pauseBtnY + 8, 6, 24);
    ctx.fillRect(pauseBtnX + 24, pauseBtnY + 8, 6, 24);

    // Draw lives HUD
    const livesBoxSize = 18;
    const livesBoxGap = 6;
    const totalLives = 5;
    const startX = (canvas.width - (totalLives * livesBoxSize + (totalLives - 1) * livesBoxGap)) / 2;
    const startY = 8;
    ctx.fillStyle = '#000000';
    ctx.fillRect(startX - 8, startY - 4, totalLives * livesBoxSize + (totalLives - 1) * livesBoxGap + 16, livesBoxSize + 8);
    const platformColor = platforms[0]?.color || '#F4A460';
    for (let i = 0; i < totalLives; i++) {
        if (i < lives) {
            ctx.fillStyle = platformColor;
            ctx.fillRect(startX + i * (livesBoxSize + livesBoxGap), startY, livesBoxSize, livesBoxSize);
        } else {
            ctx.strokeStyle = platformColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(startX + i * (livesBoxSize + livesBoxGap), startY, livesBoxSize, livesBoxSize);
        }
    }

    // Handle player death
    if (playerDead) {
        drawDeathAnimation(ctx, player, explosionTimer);
        // Only show 'Press any key' if lives remain
        if (showRestartMessage && lives > 0) {
            ctx.save();
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#F5F5DC';
            ctx.textAlign = 'center';
            ctx.fillText('Tap or press any key', canvas.width / 2, 100);
            ctx.restore();
        }
    } else if (respawnAnimation) {
        drawRespawnAnimation(ctx, player);
    } else {
        drawPlayer(ctx, player);
    }

    // Show RESET popup if lives are 0
    const resetPopup = document.getElementById('resetPopup');
    if (showResetPopup && resetPopup) {
        resetPopup.classList.remove('hidden');
    } else if (resetPopup) {
        resetPopup.classList.add('hidden');
    }

    // Show fall out popup
    const fallOutPopup = document.getElementById('fallOutPopup');
    if (showFallOutPopup && fallOutPopup) {
        fallOutPopup.classList.remove('hidden');
        if (fallOutPopupTimer > 0) {
            fallOutPopupTimer--;
        } else {
            fallOutPopup.classList.add('hidden');
            showFallOutPopup = false;
            showRestartMessage = true;
        }
    } else if (fallOutPopup) {
        fallOutPopup.classList.add('hidden');
    }

    frameCounter++;
}

// Input handling
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    // If RESET popup is shown, only allow reset actions
    if (showResetPopup) {
        if (e.code === 'Enter' || e.code === 'Space') {
            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn) {
                resetBtn.click();
            }
        }
        // Prevent all other actions while reset popup is visible
        return;
    }
    if (playerDead && showRestartMessage) {
        playerDead = false;
        showRestartMessage = false;
        explosionTimer = 0;
        respawnAnimation = true;
        // Instead of manually resetting player and traps, reload the level:
        loadLevel(currentLevel);

        setTimeout(() => {
            respawnAnimation = false;
            player.dx = 0;
            player.dy = 0;
            keys = {};
        }, 1000);
        return;
    }
    if (e.code === 'Enter' && gamePaused) {
        startGame(getSavedLevel());
    }
});
document.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// Orientation check - now supports both orientations
function checkOrientation() {
    // Game now works in both portrait and landscape modes
    // CSS media queries handle the responsive layout
    if (window.innerHeight > window.innerWidth) {
        document.body.classList.add('portrait-mode');
    } else {
        document.body.classList.remove('portrait-mode');
    }
}

window.addEventListener('resize', checkOrientation);
checkOrientation();

// Instructions text
const instructionsText = {
    en: "Use arrow keys or spacebar to move and jump. Avoid traps and reach the goal. Expect the unexpected!",
    uk: "Використовуйте стрілки або пробіл для руху та стрибків. Уникайте пасток і дістаньтеся до мети. Очікуйте несподіванки!",
    es: "Usa las flechas o la barra espaciadora para moverte y saltar. Evita las trampas y alcanza la meta. ¡Espera lo inesperado!"
};

const startButtonText = {
    en: "Press Enter or Tap to Start the Game",
    uk: "Натисніть Enter або торкніться, щоб почати гру",
    es: "Presiona Enter o toca para comenzar el juego"
};

// All button event listeners inside DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
    // Ensure onscreen controls are hidden on page load for phones
    const initialOnscreenControls = document.querySelector('.onscreen-controls');
    if (initialOnscreenControls) {
        initialOnscreenControls.classList.remove('active');
        initialOnscreenControls.style.display = 'none';
    }
    // Always remove 'active' from onscreen-controls and set display to none on page load
    setTimeout(() => {
        const controls = document.querySelector('.onscreen-controls');
        if (controls) {
            controls.classList.remove('active');
            controls.style.display = 'none';
        }
    }, 0);

    // Level select menu logic
    const levelSelect = document.getElementById('levelSelect');
    const mainStartButton = document.getElementById('mainStartButton');
    const maxLevel = 10; // Now supporting 10 levels
    function getUnlockedLevel() {
        const saved = localStorage.getItem('trustIssuesLevel');
        return saved ? Math.max(1, parseInt(saved)) : 1;
    }
    function renderLevelButtons() {
        if (!levelSelect) return;
        levelSelect.innerHTML = '';
        const unlocked = getUnlockedLevel();
        for (let i = 1; i <= maxLevel; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.textContent = i;
            btn.disabled = i > unlocked;
            btn.title = btn.disabled ? 'Locked' : `Go to Level ${i}`;
            btn.addEventListener('click', () => {
                startGame(i);
            });
            levelSelect.appendChild(btn);
        }
    }
    renderLevelButtons();

    // Start button (main)
    if (mainStartButton) {
        mainStartButton.addEventListener('click', () => {
            const savedLevel = localStorage.getItem('trustIssuesLevel');
            if (savedLevel && parseInt(savedLevel) > 10) {
                // Show custom message and Got it button
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.background = 'rgba(0,0,0,0.95)';
                overlay.style.display = 'flex';
                overlay.style.flexDirection = 'column';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                overlay.style.zIndex = '99999';
                overlay.style.transition = 'opacity 1s';
                overlay.style.opacity = '1';
                document.body.appendChild(overlay);

                const msg = document.createElement('h1');
                msg.textContent = 'You finished the game!';
                msg.style.color = '#FFD700';
                msg.style.fontSize = '3rem';
                msg.style.textShadow = '0 0 20px #ED6509, 0 0 40px #fff';
                msg.style.marginBottom = '30px';
                overlay.appendChild(msg);

                const gotItBtn = document.createElement('button');
                gotItBtn.textContent = 'Got it';
                gotItBtn.style.background = '#ED6509';
                gotItBtn.style.color = '#fff';
                gotItBtn.style.fontSize = '1.5rem';
                gotItBtn.style.padding = '16px 40px';
                gotItBtn.style.border = 'none';
                gotItBtn.style.borderRadius = '10px';
                gotItBtn.style.marginTop = '40px';
                gotItBtn.style.cursor = 'pointer';
                gotItBtn.style.boxShadow = '0 0 20px #ED6509';
                gotItBtn.addEventListener('click', () => {
                    overlay.remove();
                    localStorage.setItem('trustIssuesLevel', 1);
                });
                overlay.appendChild(gotItBtn);
            } else {
                startGame(getUnlockedLevel());
            }
        });
    }

    // --- On-screen controls for mobile/tablet ---
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnJump = document.getElementById('btnJump');
    const btnPause = document.getElementById('btnPause');

    // Helper to trigger key events for game logic
    function triggerKey(code, pressed) {
        keys[code] = pressed;
    }

    if (btnLeft && btnRight && btnJump) {
        // Touch events for left
        btnLeft.addEventListener('touchstart', e => { e.preventDefault(); triggerKey('ArrowLeft', true); }, { passive: false });
        btnLeft.addEventListener('touchend', e => { e.preventDefault(); triggerKey('ArrowLeft', false); }, { passive: false });
        // Touch events for right
        btnRight.addEventListener('touchstart', e => { e.preventDefault(); triggerKey('ArrowRight', true); }, { passive: false });
        btnRight.addEventListener('touchend', e => { e.preventDefault(); triggerKey('ArrowRight', false); }, { passive: false });
        // Touch events for jump (space)
        btnJump.addEventListener('touchstart', e => { e.preventDefault(); triggerKey('Space', true); }, { passive: false });
        btnJump.addEventListener('touchend', e => { e.preventDefault(); triggerKey('Space', false); }, { passive: false });
        // Mouse fallback for desktop testing
        btnLeft.addEventListener('mousedown', e => { e.preventDefault(); triggerKey('ArrowLeft', true); });
        btnLeft.addEventListener('mouseup', e => { e.preventDefault(); triggerKey('ArrowLeft', false); });
        btnRight.addEventListener('mousedown', e => { e.preventDefault(); triggerKey('ArrowRight', true); });
        btnRight.addEventListener('mouseup', e => { e.preventDefault(); triggerKey('ArrowRight', false); });
        btnJump.addEventListener('mousedown', e => { e.preventDefault(); triggerKey('Space', true); });
        btnJump.addEventListener('mouseup', e => { e.preventDefault(); triggerKey('Space', false); });
    }

    // Pause button for mobile
    if (btnPause) {
        btnPause.addEventListener('touchstart', e => {
            e.preventDefault();
            e.stopPropagation();

            gamePaused = true;
            showPausePopup();
        });
        btnPause.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            gamePaused = true;
            showPausePopup();
        });
    }

    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    const soundIcon = document.getElementById('soundIcon');
    if (soundToggle && soundIcon) {
        soundToggle.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundIcon.textContent = soundEnabled ? 'volume_up' : 'volume_off';
            if (!soundEnabled) {
                stopAllSounds();
            }
        });
    }

    // Settings dropdown
    const settingsBtn = document.getElementById('settingsBtn');
    const languageMenu = document.getElementById('languageMenu');
    if (settingsBtn && languageMenu) {
        settingsBtn.addEventListener('click', () => {
            languageMenu.classList.toggle('show');
        });
    }

    // Language selection
    document.querySelectorAll('#languageMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const lang = item.getAttribute('data-lang');
            const instructions = document.querySelector('.instructions-centered p');
            instructions.textContent = instructionsText[lang] || instructionsText['en'];
            languageMenu.classList.remove('show');

            // Change Start button text
            const startButton = document.querySelector('.start-button');
            if (startButton) {
                startButton.textContent = startButtonText[lang] || startButtonText['en'];
            }
        });
    });

    // Add event listeners for pause popup buttons
    const pausePopup = document.getElementById('pausePopup');
    const exitBtn = document.getElementById('exitBtn');
    const replayBtn = document.getElementById('replayBtn');
    const playBtn = document.getElementById('playBtn');

    // RESET popup
    const resetPopup = document.getElementById('resetPopup');
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            showResetPopup = false;
            lives = 5;
            playerDead = false;
            explosionTimer = 0;
            showRestartMessage = false;
            respawnAnimation = false;
            loadLevel(currentLevel);
            if (resetPopup) resetPopup.classList.add('hidden');
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', function () {
            pausePopup.classList.add('hidden');
            location.reload(); // Reloads the page to exit
        });
    }
    if (replayBtn) {
        replayBtn.addEventListener('click', function () {
            pausePopup.classList.add('hidden');
            loadLevel(currentLevel); // Restarts the current level
        });
    }
    if (playBtn) {
        playBtn.addEventListener('click', function () {
            pausePopup.classList.add('hidden');
            gamePaused = false; // Resumes the game

            // Restore mobile/tablet controls when resuming
            const isMobileOrTablet = window.innerWidth <= 1200; // Include tablets up to 1200px
            const leftControls = document.querySelector('.left-controls');
            const onscreenControls = document.querySelector('.onscreen-controls');

            if (isMobileOrTablet) {
                if (leftControls) leftControls.classList.add('hide-on-mobile-game');
                if (onscreenControls) onscreenControls.classList.add('active');
            }
        });
    }
});


// --- Ensure controls update on pause/game end ---
function showPausePopup() {

    const leftControls = document.querySelector('.left-controls');
    const onscreenControls = document.querySelector('.onscreen-controls');
    const pausePopup = document.getElementById('pausePopup');

    // Show pause popup
    if (pausePopup) {
        pausePopup.classList.remove('hidden');
    }

    // Keep mobile/tablet controls visible but make pause popup accessible
    if (window.innerWidth <= 1200) { // Include tablets up to 1200px
        if (leftControls) leftControls.classList.add('hide-on-mobile-game');
        if (onscreenControls) onscreenControls.classList.remove('active');
    } else {
        if (leftControls) leftControls.classList.remove('hide-on-mobile-game');
        if (onscreenControls) onscreenControls.classList.remove('active');
    }
}

// Patch pause button click to use showPausePopup
document.addEventListener('DOMContentLoaded', () => {
    const pausePopup = document.getElementById('pausePopup');
    if (pausePopup) {
        pausePopup.addEventListener('show', showPausePopup);
    }
});

function elevatorTransition(callback) {
    const layers = [
        { color: '#F4A460' }, // Layer 1
        { color: '#8B4513' }, // Layer 2
        { color: '#C0C0C0' }  // Layer 3
    ];

    let elevatorY = canvas.height; // Start from the bottom of the canvas
    const elevatorSpeed = 20; // Faster elevator speed for smoother transition
    const layerHeight = canvas.height / layers.length; // Height of each layer

    const animationInterval = setInterval(() => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw layers
        layers.forEach((layer, index) => {
            const layerY = canvas.height - (index + 1) * layerHeight + elevatorY;
            if (layerY >= -layerHeight && layerY <= canvas.height) {
                ctx.fillStyle = layer.color;
                ctx.fillRect(0, layerY, canvas.width, layerHeight);
            }
        });

        // Draw elevator (player inside)
        ctx.fillStyle = '#000000';
        ctx.fillRect(canvas.width / 2 - player.width / 2, elevatorY - player.height, player.width, player.height);

        // Move elevator upward
        elevatorY -= elevatorSpeed;

        // Stop animation when elevator reaches the top
        if (elevatorY <= -layerHeight) {
            clearInterval(animationInterval);

            // Transition to the next level
            setTimeout(() => {
                if (typeof callback === 'function') {
                    callback();
                }
            }, 300); // Shortened delay after animation
        }
    }, 1000 / 60); // Smooth animation (60 FPS)
}

function drawDeathAnimation(ctx, player, explosionTimer) {
    const pieceCount = 30;
    const pieceSize = Math.max(4, Math.floor(player.width / 7));
    if (deathPieces.length === 0) {
        // Initialize pieces
        for (let i = 0; i < pieceCount; i++) {
            const px = player.x + Math.random() * player.width;
            const py = player.y + Math.random() * player.height;
            const dx = (Math.random() - 0.5) * 8;
            const dy = (Math.random() - 0.5) * 8 - 2;
            deathPieces.push({
                x: px, y: py, dx, dy,
                opacity: 1
            });
        }
    }
    // Animate pieces
    deathPieces.forEach((piece) => {
        piece.x += piece.dx;
        piece.y += piece.dy;
        piece.opacity -= 0.025;
        ctx.globalAlpha = Math.max(0, piece.opacity);
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(piece.x, piece.y, pieceSize, pieceSize);
        ctx.globalAlpha = 1;
    });

    if (explosionTimer > 60) {
        showRestartMessage = true;
        deathPieces = [];
    }
}

function drawRespawnAnimation(ctx, player) {
    const pieceCount = 30;
    const pieceSize = Math.max(4, Math.floor(player.width / 7));
    if (deathPieces.length === 0) {
        // Initialize pieces at random positions
        for (let i = 0; i < pieceCount; i++) {
            const px = Math.random() * canvas.width;
            const py = Math.random() * canvas.height;
            deathPieces.push({
                x: px,
                y: py,
                targetX: player.x + Math.random() * player.width,
                targetY: player.y + Math.random() * player.height,
                opacity: 1,
            });
        }
    }
    let allArrived = true;
    deathPieces.forEach((piece) => {
        // Move towards target
        piece.x += (piece.targetX - piece.x) * 0.2;
        piece.y += (piece.targetY - piece.y) * 0.2;
        piece.opacity += (1 - piece.opacity) * 0.2;
        ctx.globalAlpha = Math.max(0, piece.opacity);
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(piece.x, piece.y, pieceSize, pieceSize);
        ctx.globalAlpha = 1;
        if (Math.abs(piece.x - piece.targetX) > 2 || Math.abs(piece.y - piece.targetY) > 2) {
            allArrived = false;
        }
    });
    if (allArrived) {
        respawnAnimation = false;
        deathPieces = [];
    }
}

// Restart level on canvas tap/click if dead
function handleCanvasRestart(e) {
    if (playerDead && showRestartMessage && lives > 0) {
        e.preventDefault();
        playerDead = false;
        showRestartMessage = false;
        explosionTimer = 0;
        respawnAnimation = true;
        loadLevel(currentLevel);
        setTimeout(() => {
            respawnAnimation = false;
            player.dx = 0;
            player.dy = 0;
            keys = {};
        }, 1000);
    }
}
canvas.addEventListener('click', handleCanvasRestart);
canvas.addEventListener('touchstart', handleCanvasRestart, { passive: false });
