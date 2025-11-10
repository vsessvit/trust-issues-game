// Jest DOM setup for testing DOM elements
// Note: Since Jest 26 used, i'm skipping the import and define own matchers

// Mock canvas context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock Audio
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  volume: 1,
  currentTime: 0,
  duration: 0,
  ended: false,
  paused: true
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock setTimeout and setInterval
global.setTimeout = jest.fn();
global.setInterval = jest.fn();
global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16);
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Setup DOM structure that the game expects
document.body.innerHTML = `
  <canvas id="gameCanvas"></canvas>
  <div id="lives">Lives: 5</div>
  <div id="timer">Time: 0s</div>
  <div id="levelDisplay">Level: 1</div>
  <button id="startButton">Start Game</button>
  <button id="restartButton">Restart</button>
  <button id="pauseButton">Pause</button>
`;

// Suppress console errors in tests unless needed
global.console.error = jest.fn();
global.console.warn = jest.fn();