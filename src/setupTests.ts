// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom lacks matchMedia — provide a no-match stub so components using it don't crash
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Stub R3F + drei in jsdom — they pull in WebGL contexts that jsdom can't provide.
jest.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {},
  useThree: () => ({}),
  extend: () => {},
}));
jest.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Html: () => null,
  Text: () => null,
  AdaptiveDpr: () => null,
  PerformanceMonitor: () => null,
  Float: () => null,
  Line: () => null,
}));
