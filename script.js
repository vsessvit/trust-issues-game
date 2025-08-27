// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 910; // New width for a wider game window
canvas.height = 550; // New height for a taller game window

// Game variables
let currentLevel = 1;
let player = { x: 50, y: 500, width: 30, height: 30, dx: 0, dy: 0, onGround: false };
let gravity = 0.5;
let keys = {};
let platforms = [];
let traps = [];
let lives = 5;
let timer = 0;
let gameInterval;
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

// Load sounds
const jumpSound = new Audio('assets/sounds/jump.wav');
const trapSound = new Audio('assets/sounds/trap.wav');
const winSound = new Audio('assets/sounds/win.wav');

// // Load player frames
// const playerFrames = [];
// for (let i = 1; i <= 8; i++) {
//     const img = new Image();
//     img.src = `assets/images/player${i}.jpg`;
//     playerFrames.push(img);
// }

let currentFrame = 0;
let frameCounter = 0;
const frameSpeed = 5;

// Utility to get saved level
function getSavedLevel() {
    const savedLevel = localStorage.getItem('trustIssuesLevel');
    return savedLevel ? parseInt(savedLevel) : 1;
}

// Start game logic
function startGame(levelNum) {
    console.log(`Starting game at level: ${levelNum}`);
    
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

    // Show the game canvas
    canvas.style.display = 'block';
    lives = 5;

    // Load the specified level
    loadLevel(levelNum);
}

// Load level from JSON
function loadLevel(levelNum) {
    goalReached = false;
    currentLevel = levelNum;
    console.log(`Loading level: ${levelNum}`); // Debugging log
    fetch(`levels/level${levelNum}.json`)
        .then(res => res.json())
        .then(data => {
            console.log('Level data:', data); // Debugging log
            currentLevel = levelNum;
            levelData = data;
            platforms = data.platforms || [];
            // Deep copy traps so each reload starts fresh
            traps = (data.traps || []).map(trap => JSON.parse(JSON.stringify(trap)));

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
        })
        .catch(err => {
            console.error("Failed to load level:", err);
            alert("Failed to load level " + levelNum + ". Check your level JSON file for errors.");
        });
}

function onPlayerReachGoal() {
    gamePaused = true;

    // Animate the door closing
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

            // Transition to the next level with elevator animation
            setTimeout(() => {
                elevatorTransition(() => {
                    loadLevel(currentLevel + 1);
                });
            }, 300); // Shortened delay after door animation
        }
    }, doorAnimationDuration / 50); // Smooth animation (50 frames)
}

// Game loop
function runGameLoop() {
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        update();
        draw();
        timer++;
    }, 1000 / 60);
}

// Update game state
function update() {
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

    // Platform collision (skip if player is over a hole)
    player.onGround = false;
    platforms.forEach(p => {
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

        if (!overHole &&
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y < p.y + p.height &&
            player.y + player.height > p.y) {
            if (player.dy > 0) {
                player.y = p.y - player.height;
                player.dy = 0;
                player.onGround = true;
            }
        }
    });

    // Trap collision (player dies)
    traps.forEach(t => {
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
            player.y < t.y
        ) {
            //player dies
            if (!playerDead) { // Only decrement lives once per death
                playSound(trapSound);
                playerDead = true;
                explosionTimer = 0;
                player.dx = 0;
                player.dy = 0;
                lives--;
            }
        }

        // Move traps if they are "moving_hole" or "moving_spikes"
        if (t.type === "moving_hole" && Math.abs(player.x - t.x) < t.movement.triggerDistance) {
            t.x -= t.movement.speed;
        }
        if (t.type === "moving_spikes" && Math.abs(player.x - t.x) < t.movement.triggerDistance) {
            t.x += t.movement.direction === "left" ? -t.movement.speed : t.movement.speed;
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
    // Move player into the center of the door
    player.x = goal.x + (goal.width - player.width) / 2;
    player.y = goal.y + (goal.height - player.height) / 2;
        localStorage.setItem('trustIssuesLevel', currentLevel + 1);
        gamePaused = true;
        onPlayerReachGoal();
    }
}

// // Custom spike trick logic
    // let leftSpike = traps.find(t => t.id === "leftSpike");
    // let rightSpike = traps.find(t => t.id === "rightSpike");

    // // Both spikes are still until player jumps over the right spike
    // if (rightSpike && player.x > rightSpike.x + rightSpike.width) {
    //     // When player jumps over the right spike, allow left spike to move left if player approaches
    //     if (leftSpike && player.x > leftSpike.x + leftSpike.width) {
    //         leftSpike.x -= 3; // Move left to trick the player
    //     }
    // }
let debugMode = false;

// Debug toggle (if you have a debugToggle button in HTML)
const debugToggle = document.getElementById('debugToggle');
if (debugToggle) {
    debugToggle.addEventListener('click', () => {
        debugMode = !debugMode;
        alert(debugMode ? "Debug Mode ON" : "Debug Mode OFF");
    });
}

canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Pause button area
    const pauseBtnX = canvas.width - 60;
    const pauseBtnY = 16;
    const pauseBtnW = 40;
    const pauseBtnH = 40;

    if (
        x >= pauseBtnX && x <= pauseBtnX + pauseBtnW &&
        y >= pauseBtnY && y <= pauseBtnY + pauseBtnH
    ) {
        gamePaused = true;
        const pausePopup = document.getElementById('pausePopup');
        if (pausePopup) {
            pausePopup.classList.remove('hidden');
        }
    }
});

let soundEnabled = true;

function playSound(sound) {
    if (soundEnabled) sound.play();
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
        ctx.fillStyle = p.color || '#F4A460'; // Platform color
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw traps
    traps.forEach(t => {
        if (t.type === "spikes" || t.type === "moving_spikes") {
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
        } else if (t.type === "moving_hole") {
            // Draw holes as empty rectangles
            ctx.fillStyle = "#000000"; // Hole color matches the background
            ctx.fillRect(t.x, t.y, t.width, t.height);
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
            ctx.fillText('Press any key', canvas.width / 2, 100);
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

    frameCounter++;
}

// Modal handling
function showWinModal(callback) {
    console.log("Showing win modal");
    
    // First, clean up any existing modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    const winModalEl = document.getElementById('winModal');
    
    // Completely remove any previous click handlers from the continue button
    const continueBtn = document.getElementById('continueBtn');
    const newBtn = continueBtn.cloneNode(true);
    continueBtn.parentNode.replaceChild(newBtn, continueBtn);
    
    // Add new click handler to the button
    newBtn.addEventListener('click', function() {
        console.log("Continue button clicked");
        
        // Manual modal cleanup
        winModalEl.classList.remove('show');
        winModalEl.style.display = 'none';
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Execute callback after modal is closed
        setTimeout(() => {
            if (typeof callback === 'function') {
                console.log("Loading next level");
                callback();
            }
        }, 100);
    });
    
    // Show the modal using Bootstrap
    const winModal = new bootstrap.Modal(winModalEl);
    winModal.show();
}

// Add this function to your script.js file
function createWinModal() {
    const winModalEl = document.getElementById('winModal');
    
    // Create modal content if it doesn't exist
    if (!winModalEl.querySelector('.modal-dialog')) {
        // Create modal structure
        const modalDialog = document.createElement('div');
        modalDialog.className = 'modal-dialog modal-dialog-centered';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content bg-dark text-light';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = '<h5 class="modal-title">Level Complete!</h5>';
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.innerHTML = '<p>Congratulations! You finished the level.</p>';
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        const continueBtn = document.createElement('button');
        continueBtn.id = 'continueBtn';
        continueBtn.className = 'btn btn-success';
        continueBtn.textContent = 'Continue';
        continueBtn.setAttribute('data-bs-dismiss', 'modal');
        
        modalFooter.appendChild(continueBtn);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modalDialog.appendChild(modalContent);
        winModalEl.appendChild(modalDialog);
    }
}

// Input handling
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (playerDead && showRestartMessage) {
        playerDead = false;
        showRestartMessage = false;
        explosionTimer = 0;
        respawnAnimation = true;
        movementLocked = true;
        canMove = false;

        // Instead of manually resetting player and traps, reload the level:
        loadLevel(currentLevel);

        setTimeout(() => {
            respawnAnimation = false;
            movementLocked = false;
            player.dx = 0;
            player.dy = 0;
            keys = {};
            canMove = true;
        }, 1000);
        return;
    }
    if (showResetPopup) {
        // Do nothing, wait for RESET button
        return;
    }
    if (e.code === 'Enter' && gamePaused) {
        startGame(getSavedLevel());
    }
});
document.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// Orientation check
function checkOrientation() {
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

// All button event listeners inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Start button
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.addEventListener('click', () => {
            startGame(1); // Explicitly start with level 1
            //startGame(getSavedLevel());
        });
    }

    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    const soundIcon = document.getElementById('soundIcon');
    if (soundToggle && soundIcon) {
        soundToggle.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundIcon.textContent = soundEnabled ? 'volume_up' : 'volume_off';
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
        resetBtn.addEventListener('click', function() {
            showResetPopup = false;
            lives = 5;
            playerDead = false;
            explosionTimer = 0;
            showRestartMessage = false;
            respawnAnimation = false;
            movementLocked = false;
            canMove = true;
            loadLevel(currentLevel);
            if (resetPopup) resetPopup.classList.add('hidden');
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', function() {
            pausePopup.classList.add('hidden');
            location.reload(); // Reloads the page to exit
        });
    }
    if (replayBtn) {
        replayBtn.addEventListener('click', function() {
            pausePopup.classList.add('hidden');
            loadLevel(currentLevel); // Restarts the current level
        });
    }
    if (playBtn) {
        playBtn.addEventListener('click', function() {
            pausePopup.classList.add('hidden');
            gamePaused = false; // Resumes the game
        });
    }
});

// On game start
//loadLevel(currentLevel);

function transitionToNextLevel(callback) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'black';
    overlay.style.opacity = '0';
    overlay.style.zIndex = '9999';
    overlay.style.transition = 'opacity 1s ease-in-out';
    document.body.appendChild(overlay);

    // Start fade-out animation
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 100);

    // Wait for animation to complete, then load the next level
    setTimeout(() => {
        document.body.removeChild(overlay);
        if (typeof callback === 'function') {
            callback();
        }
    }, 1100); // 1 second fade-out + small buffer
}

function fallingThroughLayersTransition(callback) {
    const layers = [
        { color: '#F4A460', traps: [{ x: 200, y: 100, width: 50, height: 10, color: '#8B4513' }] },
        { color: '#8B4513', traps: [{ x: 400, y: 200, width: 50, height: 10, color: '#FF4500' }] },
        { color: '#C0C0C0', traps: [{ x: 600, y: 300, width: 50, height: 10, color: '#3B2F2F' }] }
    ];

    let playerY = 0; // Start falling from the top
    const fallSpeed = 5
    ; // Speed of falling
    const layerHeight = canvas.height / layers.length; // Height of each layer

    const animationInterval = setInterval(() => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw layers
        layers.forEach((layer, index) => {
            const layerY = index * layerHeight - playerY;
            if (layerY >= -layerHeight && layerY <= canvas.height) {
                ctx.fillStyle = layer.color;
                ctx.fillRect(0, layerY, canvas.width, layerHeight);

                // Draw traps
                layer.traps.forEach(trap => {
                    ctx.fillStyle = trap.color;
                    ctx.fillRect(trap.x, layerY + trap.y, trap.width, trap.height);
                });
            }
        });

        // Draw player falling
        ctx.fillStyle = '#000000';
        ctx.fillRect(canvas.width / 2 - player.width / 2, playerY, player.width, player.height);

        // Update player position
        playerY += fallSpeed;

        // Stop animation when player reaches the bottom
        if (playerY > canvas.height + layerHeight * (layers.length - 1)) {
            clearInterval(animationInterval);

            // Transition to the next level
            setTimeout(() => {
                if (typeof callback === 'function') {
                    callback();
                }
            }, 500); // Small delay after animation
        }
    }, 1000 / 60); // Smooth animation (60 FPS)
}

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
    deathPieces.forEach(piece => {
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
                x: px, y: py,
                targetX: player.x + Math.random() * player.width,
                targetY: player.y + Math.random() * player.height,
                opacity: 1
            });
        }
    }
    let allArrived = true;
    deathPieces.forEach(piece => {
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
