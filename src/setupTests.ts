import '@testing-library/jest-dom/vitest';

// jsdom does not implement CSS.supports; stub it so NavBar's useEffect can run
if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
  Object.defineProperty(globalThis, 'CSS', {
    value: { supports: () => false },
    writable: true,
  });
}
