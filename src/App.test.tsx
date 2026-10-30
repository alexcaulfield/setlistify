import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders app component without crashing', () => {
  const { container } = render(<App />);
  expect(container.firstChild).toBeInTheDocument();
});
