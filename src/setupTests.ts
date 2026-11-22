import '@testing-library/jest-dom/vitest';

// jsdom does not implement CSS.supports; stub it so NavBar's useEffect can run
if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
  Object.defineProperty(globalThis, 'CSS', {
    value: { supports: () => false },
    writable: true,
  });
}

// jsdom does not implement window.matchMedia; provide a safe default stub
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
