import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the terminal app', () => {
  render(<App />);
  const tabElement = screen.getByText(/intro/i);
  expect(tabElement).toBeInTheDocument();
});
