/* eslint-env node */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/assets/scripts/tests/setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/assets/scripts/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'assets/scripts/script.js',
    '!assets/scripts/tests/**',
    '!assets/scripts/levels/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html'],
  
  // Module paths
  roots: ['<rootDir>'],
  
  // Transform files
  transform: {},
  
  // Mock static assets
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/assets/scripts/tests/__mocks__/fileMock.js'
  }
};