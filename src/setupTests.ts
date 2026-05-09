// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Stub R3F + drei + postprocessing in jsdom — they pull in WebGL contexts that jsdom can't provide.
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => null,
  useFrame: () => {},
  useThree: () => ({}),
  extend: () => {},
}));
jest.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Html: ({ children }: { children?: React.ReactNode }) => null,
  Text: ({ children }: { children?: React.ReactNode }) => null,
  AdaptiveDpr: () => null,
  PerformanceMonitor: () => null,
  Float: ({ children }: { children?: React.ReactNode }) => null,
  Line: () => null,
}));
jest.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children?: React.ReactNode }) => null,
  Bloom: () => null,
}));
