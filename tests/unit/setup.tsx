// Global jest setup - ONLY non-JSX compatible imports and hooks
import '@testing-library/jest-native/extend-expect';

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
