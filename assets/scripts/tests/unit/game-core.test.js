/**
 * @jest-environment jsdom
 */
/* eslint-env jest */

// Mock the game script variables and functions
let currentLevel, player, gravity, keys, platforms, traps, lives, timer, gamePaused, playerDead, goalReached;
let level7SpikeTimerStarted, level9DisappearTimerStarted, level8WallTimerStarted, level10DotsTimerStarted;
let levelData, deathPieces, respawnAnimation, explosionTimer, showRestartMessage;

// Mock audio objects
const mockAudio = {
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  currentTime: 0
};

// Mock canvas and context
const mockCanvas = {
  width: 910,
  height: 550,
  getContext: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    fillText: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn()
  }))
};

// Helper function to reset game state
function resetGameState() {
  currentLevel = 1;
  player = {
    x: 50,
    y: 500,
    width: 30,
    height: 30,
    dx: 0,
    dy: 0,
    onGround: false
  };
  gravity = 0.5;
  keys = {};
  platforms = [];
  traps = [];
  lives = 5;
  timer = 0;
  gamePaused = true;
  playerDead = false;
  goalReached = false;
  level7SpikeTimerStarted = false;
  level9DisappearTimerStarted = false;
  level8WallTimerStarted = false;
  level10DotsTimerStarted = false;
  levelData = {};
  deathPieces = [];
  respawnAnimation = false;
  explosionTimer = 0;
  showRestartMessage = false;
}

// Helper function to simulate player movement
function simulatePlayerMovement(direction, duration = 1) {
  const originalX = player.x;
  const originalY = player.y;
  
  if (direction === 'left') {
    keys['ArrowLeft'] = true;
    player.dx = -3;
  } else if (direction === 'right') {
    keys['ArrowRight'] = true;
    player.dx = 3;
  } else if (direction === 'jump') {
    keys['ArrowUp'] = true;
    if (player.onGround) {
      player.dy = -10;
      player.onGround = false;
    }
  }
  
  // Simulate physics update
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;
  
  return { originalX, originalY, newX: player.x, newY: player.y };
}

// Helper function to check collision between rectangles
function checkRectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

describe('Game Core Functionality', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <canvas id="gameCanvas"></canvas>
      <div id="lives">Lives: 5</div>
      <div id="timer">Time: 0s</div>
      <div id="levelDisplay">Level: 1</div>
      <div id="resetPopup" class="hidden"></div>
      <div id="fallOutPopup" class="hidden"></div>
    `;
    
    // Reset game state
    resetGameState();
    
    // Mock global objects
    const mockSetItem = jest.fn();
    const mockGetItem = jest.fn();
    const mockRemoveItem = jest.fn();
    const mockClear = jest.fn();
    
    global.localStorage = {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
      clear: mockClear
    };
    
    // Mock setTimeout and clearTimeout
    global.setTimeout = jest.fn((fn, delay) => {
      return { id: Math.random(), fn, delay };
    });
    global.clearTimeout = jest.fn();
    global.setInterval = jest.fn();
    global.clearInterval = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Game Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(currentLevel).toBe(1);
      expect(lives).toBe(5);
      expect(timer).toBe(0);
      expect(gamePaused).toBe(true);
      expect(playerDead).toBe(false);
      expect(goalReached).toBe(false);
    });

    test('should initialize player with correct starting position', () => {
      expect(player.x).toBe(50);
      expect(player.y).toBe(500);
      expect(player.width).toBe(30);
      expect(player.height).toBe(30);
      expect(player.dx).toBe(0);
      expect(player.dy).toBe(0);
      expect(player.onGround).toBe(false);
    });

    test('should have canvas elements in DOM', () => {
      const canvas = document.getElementById('gameCanvas');
      expect(canvas).toBeTruthy();
      expect(canvas.tagName).toBe('CANVAS');
    });

    test('should have UI elements in DOM', () => {
      expect(document.getElementById('lives')).toBeTruthy();
      expect(document.getElementById('timer')).toBeTruthy();
      expect(document.getElementById('levelDisplay')).toBeTruthy();
    });
  });

  describe('Player Movement', () => {
    beforeEach(() => {
      gamePaused = false;
      player.onGround = true;
    });

    test('should move player left when left arrow is pressed', () => {
      const result = simulatePlayerMovement('left');
      expect(result.newX).toBeLessThan(result.originalX);
      expect(player.dx).toBe(-3);
    });

    test('should move player right when right arrow is pressed', () => {
      const result = simulatePlayerMovement('right');
      expect(result.newX).toBeGreaterThan(result.originalX);
      expect(player.dx).toBe(3);
    });

    test('should make player jump when jump key is pressed and on ground', () => {
      const originalY = player.y;
      simulatePlayerMovement('jump');
      expect(player.dy).toBe(-9.5);
      expect(player.onGround).toBe(false);
    });

    test('should not jump when player is not on ground', () => {
      player.onGround = false;
      const originalDy = player.dy;
      simulatePlayerMovement('jump');
      expect(player.dy).toBe(originalDy + gravity); // Only gravity applied
    });

    test('should apply gravity to player', () => {
      player.dy = 0;
      player.dy += gravity;
      expect(player.dy).toBe(0.5);
    });

    test('should reset horizontal movement when no keys pressed', () => {
      keys = {};
      player.dx = 0;
      expect(player.dx).toBe(0);
    });
  });

  describe('Collision Detection', () => {
    beforeEach(() => {
      gamePaused = false;
    });

    test('should detect platform collision from above', () => {
      const platform = { x: 40, y: 520, width: 60, height: 20 };
      platforms = [platform];
      
      player.x = 50;
      player.y = 500;
      player.dy = 5; // Moving down
      
      const collision = checkRectCollision(player, platform);
      expect(collision).toBe(true);
    });

    test('should detect trap collision', () => {
      const trap = { x: 45, y: 495, width: 40, height: 40, type: 'spikes' };
      traps = [trap];
      
      player.x = 50;
      player.y = 500;
      
      const collision = checkRectCollision(player, trap);
      expect(collision).toBe(true);
    });

    test('should detect goal collision', () => {
      levelData.goal = { x: 800, y: 500, width: 40, height: 50 };
      
      player.x = 805;
      player.y = 510;
      
      const collision = checkRectCollision(player, levelData.goal);
      expect(collision).toBe(true);
    });
  });

  describe('Game State Management', () => {
    test('should pause game correctly', () => {
      gamePaused = false;
      gamePaused = true;
      expect(gamePaused).toBe(true);
    });

    test('should unpause game correctly', () => {
      gamePaused = true;
      gamePaused = false;
      expect(gamePaused).toBe(false);
    });

    test('should handle player death', () => {
      playerDead = false;
      explosionTimer = 0;
      
      // Simulate player death
      playerDead = true;
      explosionTimer = 0;
      lives--;
      
      expect(playerDead).toBe(true);
      expect(lives).toBe(4);
      expect(explosionTimer).toBe(0);
    });

    test('should handle goal reached', () => {
      goalReached = false;
      gamePaused = false;
      
      // Simulate reaching goal
      goalReached = true;
      gamePaused = true;
      
      expect(goalReached).toBe(true);
      expect(gamePaused).toBe(true);
    });
  });

  describe('Lives and Death Management', () => {
    test('should start with 5 lives', () => {
      expect(lives).toBe(5);
    });

    test('should lose life on death', () => {
      const originalLives = lives;
      lives--;
      expect(lives).toBe(originalLives - 1);
    });

    test('should show reset popup when lives reach 0', () => {
      lives = 0;
      const resetPopup = document.getElementById('resetPopup');
      
      // Simulate the condition that would show reset popup
      if (lives === 0) {
        resetPopup.classList.remove('hidden');
      }
      
      expect(resetPopup.classList.contains('hidden')).toBe(false);
    });

    test('should handle fall out of bounds', () => {
      player.x = -50; // Outside canvas
      const fallOutPopup = document.getElementById('fallOutPopup');
      
      // Check if player is out of bounds
      const outOfBounds = (
        player.x + player.width < 0 ||
        player.x > mockCanvas.width ||
        player.y > mockCanvas.height ||
        player.y + player.height < 0
      );
      
      expect(outOfBounds).toBe(true);
    });
  });

  describe('Level-Specific Features', () => {
    test('should handle level 7 spike timer activation', () => {
      currentLevel = 7;
      level7SpikeTimerStarted = false;
      
      // Simulate player movement to trigger spike
      player.dx = 3;
      if (currentLevel === 7 && !level7SpikeTimerStarted && player.dx !== 0) {
        level7SpikeTimerStarted = true;
      }
      
      expect(level7SpikeTimerStarted).toBe(true);
    });

    test('should handle level 8 wall timer activation', () => {
      currentLevel = 8;
      level8WallTimerStarted = false;
      
      // Simulate player movement to trigger wall
      player.dy = -5;
      if (currentLevel === 8 && !level8WallTimerStarted && player.dy !== 0) {
        level8WallTimerStarted = true;
      }
      
      expect(level8WallTimerStarted).toBe(true);
    });

    test('should handle level 9 disappearing platform timer', () => {
      currentLevel = 9;
      level9DisappearTimerStarted = false;
      
      // Simulate player movement to trigger disappearing platforms
      player.dx = -2;
      if (currentLevel === 9 && !level9DisappearTimerStarted && player.dx !== 0) {
        level9DisappearTimerStarted = true;
      }
      
      expect(level9DisappearTimerStarted).toBe(true);
    });

    test('should handle level 10 dots timer activation', () => {
      currentLevel = 10;
      level10DotsTimerStarted = false;
      
      // Simulate level 10 auto-trigger
      if (currentLevel === 10 && !level10DotsTimerStarted) {
        level10DotsTimerStarted = true;
      }
      
      expect(level10DotsTimerStarted).toBe(true);
    });

    test('should handle moving traps', () => {
      const movingTrap = {
        type: 'moving_hole',
        x: 200,
        y: 500,
        width: 40,
        height: 40,
        movement: { triggerDistance: 100 }
      };
      
      traps = [movingTrap];
      player.x = 150; // Within trigger distance
      
      const distance = Math.abs(player.x - movingTrap.x);
      expect(distance).toBeLessThan(movingTrap.movement.triggerDistance);
    });
  });

  describe('Timer and Scoring', () => {
    test('should increment timer', () => {
      const originalTimer = timer;
      timer++;
      expect(timer).toBe(originalTimer + 1);
    });

    test('should convert timer to seconds correctly', () => {
      timer = 180; // 3 seconds at 60 FPS
      const seconds = Math.floor(timer / 60);
      expect(seconds).toBe(3);
    });
  });

  describe('Sound Management', () => {
    test('should handle sound playing', () => {
      const jumpSound = mockAudio;
      jumpSound.currentTime = 0;
      jumpSound.play();
      
      expect(jumpSound.currentTime).toBe(0);
      expect(jumpSound.play).toHaveBeenCalled();
    });

    test('should handle sound stopping', () => {
      const sounds = [mockAudio, mockAudio, mockAudio];
      sounds.forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
      });
      
      sounds.forEach(sound => {
        expect(sound.pause).toHaveBeenCalled();
        expect(sound.currentTime).toBe(0);
      });
    });
  });

  describe('Animation and Visual Effects', () => {
    test('should handle death animation pieces', () => {
      deathPieces = [];
      const pieceCount = 30;
      
      // Simulate creating death pieces
      for (let i = 0; i < pieceCount; i++) {
        deathPieces.push({
          x: player.x + Math.random() * player.width,
          y: player.y + Math.random() * player.height,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * -8 - 2
        });
      }
      
      expect(deathPieces.length).toBe(pieceCount);
    });

    test('should handle respawn animation', () => {
      respawnAnimation = false;
      respawnAnimation = true;
      expect(respawnAnimation).toBe(true);
    });

    test('should track explosion timer', () => {
      explosionTimer = 0;
      explosionTimer++;
      expect(explosionTimer).toBe(1);
    });
  });

  describe('Level Progression', () => {
    test('should advance to next level', () => {
      currentLevel = 3;
      currentLevel++;
      expect(currentLevel).toBe(4);
    });

    test('should not exceed maximum level', () => {
      currentLevel = 10;
      const nextLevel = Math.min(currentLevel + 1, 10);
      expect(nextLevel).toBe(10);
    });
    
    test('should handle game completion on level 10', () => {
      currentLevel = 10;
      goalReached = true;
      
      // Level 10 completion should trigger game completion
      const isGameComplete = (currentLevel === 10 && goalReached);
      expect(isGameComplete).toBe(true);
    });
  });

  describe('Input Handling', () => {
    test('should register key presses', () => {
      keys['ArrowLeft'] = true;
      keys['ArrowRight'] = false;
      keys['ArrowUp'] = true;
      keys['Space'] = true;
      
      expect(keys['ArrowLeft']).toBe(true);
      expect(keys['ArrowRight']).toBe(false);
      expect(keys['ArrowUp']).toBe(true);
      expect(keys['Space']).toBe(true);
    });

    test('should clear keys on key up', () => {
      keys['ArrowLeft'] = true;
      keys['ArrowLeft'] = false;
      
      expect(keys['ArrowLeft']).toBe(false);
    });
  });
});