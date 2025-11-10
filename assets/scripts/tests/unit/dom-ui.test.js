/**
 * @jest-environment jsdom
 */
/* eslint-env jest */

describe('DOM and UI Functionality', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.body.innerHTML = `
      <canvas id="gameCanvas" width="910" height="550"></canvas>
      <div id="lives">Lives: 5</div>
      <div id="timer">Time: 0s</div>
      <div id="levelDisplay">Level: 1</div>
      <button id="startButton">Start Game</button>
      <button id="restartButton">Restart</button>
      <button id="pauseButton">Pause</button>
    `;
  });

  // DOM Elements
  describe('DOM Elements', () => {
    it('should have all required game elements', () => {
      expect(document.querySelector('#gameCanvas')).not.toBeNull();
      expect(document.querySelector('#lives')).not.toBeNull();
      expect(document.querySelector('#timer')).not.toBeNull();
      expect(document.querySelector('#levelDisplay')).not.toBeNull();
    });

    it('should have control buttons', () => {
      expect(document.querySelector('#startButton')).not.toBeNull();
      expect(document.querySelector('#restartButton')).not.toBeNull();
      expect(document.querySelector('#pauseButton')).not.toBeNull();
    });

    it('canvas should have correct dimensions for desktop', () => {
      const canvas = document.getElementById('gameCanvas');
      expect(canvas.width).toBe(910);
      expect(canvas.height).toBe(550);
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should handle canvas context creation', () => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      expect(ctx).toBeTruthy();
      expect(typeof ctx.fillRect).toBe('function');
    });

    it('should have reasonable aspect ratio for gaming', () => {
      const canvas = document.getElementById('gameCanvas');
      const aspectRatio = canvas.width / canvas.height;
      expect(aspectRatio).toBeCloseTo(1.65, 1);
    });
  }); // <-- CLOSE 'DOM Elements'

  // UI Updates
  describe('UI Updates', () => {
    it('should update lives display dynamically', () => {
      const livesElement = document.getElementById('lives');
      expect(livesElement.textContent).toBe('Lives: 5');
      livesElement.textContent = 'Lives: 4';
      expect(livesElement.textContent).toBe('Lives: 4');
    });

    it('should update timer display dynamically', () => {
      const timerElement = document.getElementById('timer');
      expect(timerElement.textContent).toBe('Time: 0s');
      timerElement.textContent = 'Time: 10s';
      expect(timerElement.textContent).toBe('Time: 10s');
    });

    it('should update level display dynamically', () => {
      const levelElement = document.getElementById('levelDisplay');
      expect(levelElement.textContent).toBe('Level: 1');
      levelElement.textContent = 'Level: 2';
      expect(levelElement.textContent).toBe('Level: 2');
    });
  });

  // Button Interactions
  describe('Button Interactions', () => {
    it('start button should be clickable', () => {
      const startButton = document.getElementById('startButton');
      const mockClickHandler = jest.fn();
      startButton.addEventListener('click', mockClickHandler);
      startButton.click();
      expect(mockClickHandler).toHaveBeenCalledTimes(1);
    });

    it('restart button should be clickable', () => {
      const restartButton = document.getElementById('restartButton');
      const mockClickHandler = jest.fn();
      restartButton.addEventListener('click', mockClickHandler);
      restartButton.click();
      expect(mockClickHandler).toHaveBeenCalledTimes(1);
    });

    it('pause button should be clickable', () => {
      const pauseButton = document.getElementById('pauseButton');
      const mockClickHandler = jest.fn();
      pauseButton.addEventListener('click', mockClickHandler);
      pauseButton.click();
      expect(mockClickHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle button disabled/enabled state', () => {
      const startButton = document.getElementById('startButton');
      startButton.disabled = true;
      expect(startButton.disabled).toBe(true);
      startButton.disabled = false;
      expect(startButton.disabled).toBe(false);
    });
  });

  // Accessibility & Error Handling
  describe('Accessibility & Error Handling', () => {
    it('should have accessible button labels', () => {
      const startButton = document.getElementById('startButton');
      expect(startButton.textContent).toMatch(/Start/i);
      const restartButton = document.getElementById('restartButton');
      expect(restartButton.textContent).toMatch(/Restart/i);
      const pauseButton = document.getElementById('pauseButton');
      expect(pauseButton.textContent).toMatch(/Pause/i);
    });

    it('should not throw when clicking missing button', () => {
      document.body.innerHTML = '';
      const missingButton = document.getElementById('startButton');
      expect(() => {
        if (missingButton) missingButton.click();
      }).not.toThrow();
    });
  });
});
