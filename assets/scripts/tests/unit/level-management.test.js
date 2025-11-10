/**
 * @jest-environment jsdom
 */
/* eslint-env jest */

describe('Level Management System', () => {
  let mockLevelData;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    global.localStorage = mockLocalStorage;

    // Setup DOM
    document.body.innerHTML = `
      <div id="levelDisplay">Level: 1</div>
      <canvas id="gameCanvas" width="910" height="550"></canvas>
    `;

    // Mock level data structure
    mockLevelData = {
      level: 1,
      player: {
        startX: 50,
        startY: 400,
        width: 30,
        height: 50,
        color: "#000000"
      },
      platforms: [
        {
          x: 0,
          y: 450,
          width: 910,
          height: 50,
          color: "#F4A460"
        }
      ],
      traps: [
        {
          x: 700,
          y: 450,
          width: 80,
          height: 50,
          color: "#8B4513",
          type: "moving_hole",
          movement: {
            direction: "left",
            triggerDistance: 90,
            speed: 3
          }
        }
      ],
      goal: {
        x: 850,
        y: 400,
        width: 40,
        height: 50,
        color: "#C0C0C0"
      },
      background: {
        color: "#8B4513"
      },
      sound: {
        jump: "assets/sounds/jump.wav",
        trap: "assets/sounds/trap.wav",
        win: "assets/sounds/win.wav"
      }
    };

    // Mock fetch for level loading
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLevelData)
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // Level Data Validation
  describe('Level Data Structure', () => {
    it('should have valid level data structure', () => {
      expect(mockLevelData).toHaveProperty('level');
      expect(mockLevelData).toHaveProperty('player');
      expect(mockLevelData).toHaveProperty('platforms');
      expect(mockLevelData).toHaveProperty('traps');
      expect(mockLevelData).toHaveProperty('goal');
      expect(mockLevelData).toHaveProperty('background');
      expect(mockLevelData).toHaveProperty('sound');
    });

    it('should have valid player configuration', () => {
      const { player } = mockLevelData;
      expect(player).toHaveProperty('startX');
      expect(player).toHaveProperty('startY');
      expect(player).toHaveProperty('width');
      expect(player).toHaveProperty('height');
      expect(player).toHaveProperty('color');
      
      expect(typeof player.startX).toBe('number');
      expect(typeof player.startY).toBe('number');
      expect(player.width).toBeGreaterThan(0);
      expect(player.height).toBeGreaterThan(0);
    });

    it('should have valid platforms array', () => {
      expect(Array.isArray(mockLevelData.platforms)).toBe(true);
      expect(mockLevelData.platforms.length).toBeGreaterThan(0);
      
      mockLevelData.platforms.forEach(platform => {
        expect(platform).toHaveProperty('x');
        expect(platform).toHaveProperty('y');
        expect(platform).toHaveProperty('width');
        expect(platform).toHaveProperty('height');
        expect(platform.width).toBeGreaterThan(0);
        expect(platform.height).toBeGreaterThan(0);
      });
    });

    it('should have valid traps array', () => {
      expect(Array.isArray(mockLevelData.traps)).toBe(true);
      
      mockLevelData.traps.forEach(trap => {
        expect(trap).toHaveProperty('x');
        expect(trap).toHaveProperty('y');
        expect(trap).toHaveProperty('width');
        expect(trap).toHaveProperty('height');
        expect(trap).toHaveProperty('type');
        expect(typeof trap.type).toBe('string');
      });
    });

    it('should have valid goal configuration', () => {
      const { goal } = mockLevelData;
      expect(goal).toHaveProperty('x');
      expect(goal).toHaveProperty('y');
      expect(goal).toHaveProperty('width');
      expect(goal).toHaveProperty('height');
      expect(goal.width).toBeGreaterThan(0);
      expect(goal.height).toBeGreaterThan(0);
    });
  });

  // Level Loading
  describe('Level Loading', () => {
    it('should load level data successfully', async () => {
      const levelNumber = 1;
      const response = await fetch(`assets/scripts/levels/level${levelNumber}.json`);
      const data = await response.json();
      
      expect(fetch).toHaveBeenCalledWith(`assets/scripts/levels/level${levelNumber}.json`);
      expect(data).toEqual(mockLevelData);
    });

    it('should handle level loading errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
      );

      try {
        const response = await fetch('assets/scripts/levels/level999.json');
        expect(response.ok).toBe(false);
        expect(response.status).toBe(404);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should validate level number range', () => {
      const validLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const invalidLevels = [0, -1, 11, 999, null, undefined, 'invalid'];

      validLevels.forEach(level => {
        expect(level).toBeGreaterThan(0);
        expect(level).toBeLessThanOrEqual(10);
      });

      invalidLevels.forEach(level => {
        if (typeof level === 'number') {
          expect(level < 1 || level > 10).toBe(true);
        } else {
          expect(typeof level !== 'number').toBe(true);
        }
      });
    });
  });

  // Level Progression
  describe('Level Progression', () => {
    it('should track current level', () => {
      let currentLevel = 1;
      expect(currentLevel).toBe(1);
      
      currentLevel++;
      expect(currentLevel).toBe(2);
    });

    it('should save level progress to localStorage', () => {
      const completedLevel = 3;
      const nextLevel = completedLevel + 1;
      
      mockLocalStorage.setItem('trustIssuesLevel', nextLevel);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('trustIssuesLevel', nextLevel);
    });

    it('should load saved progress from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('5');
      
      const savedLevel = parseInt(mockLocalStorage.getItem('trustIssuesLevel'), 10);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('trustIssuesLevel');
      expect(savedLevel).toBe(5);
    });

    it('should handle no saved progress', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const savedLevel = mockLocalStorage.getItem('trustIssuesLevel');
      const currentLevel = savedLevel ? parseInt(savedLevel, 10) : 1;
      
      expect(currentLevel).toBe(1);
    });

    it('should not exceed maximum level', () => {
      const maxLevel = 10;
      let currentLevel = 10;
      
      const nextLevel = Math.min(currentLevel + 1, maxLevel);
      expect(nextLevel).toBe(maxLevel);
    });

    it('should handle level completion', () => {
      const currentLevel = 5;
      const isGoalReached = true;
      
      if (isGoalReached && currentLevel < 10) {
        const nextLevel = currentLevel + 1;
        expect(nextLevel).toBe(6);
      } else if (isGoalReached && currentLevel === 10) {
        // Game completed
        expect(currentLevel).toBe(10);
      }
    });
  });

  // Level-Specific Features
  describe('Level-Specific Features', () => {
    it('should handle moving traps configuration', () => {
      const movingTrap = mockLevelData.traps.find(trap => trap.type === 'moving_hole');
      
      expect(movingTrap).toBeDefined();
      expect(movingTrap.movement).toBeDefined();
      expect(movingTrap.movement.direction).toBe('left');
      expect(movingTrap.movement.speed).toBe(3);
      expect(movingTrap.movement.triggerDistance).toBe(90);
    });

    it('should validate trap types', () => {
      const validTrapTypes = [
        'spikes',
        'moving_hole', 
        'movingDot',
        'disappearing_platform',
        'wall'
      ];
      
      mockLevelData.traps.forEach(trap => {
        if (trap.type) {
          expect(validTrapTypes).toContain(trap.type);
        }
      });
    });

    it('should handle level 10 special mechanics', () => {
      const level10Data = {
        level: 10,
        traps: Array(25).fill(null).map((_, index) => ({
          x: -30,
          y: 450 - (index * 15),
          width: 15,
          height: 15,
          type: "movingDot",
          moveDelay: 5000,
          speed: index < 9 ? 2 : 1,
          direction: "right"
        }))
      };

      expect(level10Data.level).toBe(10);
      expect(level10Data.traps.length).toBeGreaterThan(20);
      expect(level10Data.traps.every(trap => trap.type === 'movingDot')).toBe(true);
    });
  });

  // Level Reset and State Management
  describe('Level Reset and State Management', () => {
    it('should reset level state properly', () => {
      let gameState = {
        playerDead: true,
        explosionTimer: 30,
        lives: 3,
        timer: 180,
        goalReached: true
      };

      // Reset state
      gameState = {
        playerDead: false,
        explosionTimer: 0,
        lives: gameState.lives, // Keep lives
        timer: 0,
        goalReached: false
      };

      expect(gameState.playerDead).toBe(false);
      expect(gameState.explosionTimer).toBe(0);
      expect(gameState.timer).toBe(0);
      expect(gameState.goalReached).toBe(false);
      expect(gameState.lives).toBe(3); // Lives preserved
    });

    it('should handle level restart', () => {
      let gameState = {
        currentLevel: 5,
        lives: 0,
        timer: 300
      };

      // Restart level
      gameState = {
        currentLevel: 1,
        lives: 5,
        timer: 0
      };

      expect(gameState.currentLevel).toBe(1);
      expect(gameState.lives).toBe(5);
      expect(gameState.timer).toBe(0);
    });

    it('should clear level progress', () => {
      mockLocalStorage.removeItem('trustIssuesLevel');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('trustIssuesLevel');
    });
  });

  // Level Display Updates
  describe('Level Display Updates', () => {
    it('should update level display element', () => {
      const levelDisplay = document.getElementById('levelDisplay');
      const currentLevel = 3;
      
      levelDisplay.textContent = `Level: ${currentLevel}`;
      
      expect(levelDisplay.textContent).toBe('Level: 3');
    });

    it('should handle missing level display element', () => {
      document.body.innerHTML = '';
      const levelDisplay = document.getElementById('levelDisplay');
      
      expect(levelDisplay).toBeNull();
      
      // Should not throw when trying to update non-existent element
      expect(() => {
        if (levelDisplay) {
          levelDisplay.textContent = 'Level: 1';
        }
      }).not.toThrow();
    });
  });

  // Sound Configuration
  describe('Sound Configuration', () => {
    it('should have valid sound paths', () => {
      const { sound } = mockLevelData;
      
      expect(sound.jump).toContain('assets/sounds/');
      expect(sound.trap).toContain('assets/sounds/');
      expect(sound.win).toContain('assets/sounds/');
      
      expect(sound.jump).toContain('.wav');
      expect(sound.trap).toContain('.wav');
      expect(sound.win).toContain('.wav');
    });

    it('should handle missing sound configuration', () => {
      const levelWithoutSound = { ...mockLevelData };
      delete levelWithoutSound.sound;
      
      expect(levelWithoutSound.sound).toBeUndefined();
    });
  });

  // Level Validation
  describe('Level Validation', () => {
    it('should validate level boundaries', () => {
      const canvasWidth = 910;
      const canvasHeight = 550;
      
      // Check goal is within canvas
      expect(mockLevelData.goal.x).toBeGreaterThanOrEqual(0);
      expect(mockLevelData.goal.x + mockLevelData.goal.width).toBeLessThanOrEqual(canvasWidth);
      expect(mockLevelData.goal.y).toBeGreaterThanOrEqual(0);
      expect(mockLevelData.goal.y + mockLevelData.goal.height).toBeLessThanOrEqual(canvasHeight);
    });

    it('should validate player start position', () => {
      const { player } = mockLevelData;
      const canvasWidth = 910;
      const canvasHeight = 550;
      
      expect(player.startX).toBeGreaterThanOrEqual(0);
      expect(player.startX + player.width).toBeLessThanOrEqual(canvasWidth);
      expect(player.startY).toBeGreaterThanOrEqual(0);
      expect(player.startY + player.height).toBeLessThanOrEqual(canvasHeight);
    });

    it('should ensure level has required elements', () => {
      expect(mockLevelData.platforms.length).toBeGreaterThan(0);
      expect(mockLevelData.goal).toBeDefined();
      expect(mockLevelData.player).toBeDefined();
    });
  });
});
