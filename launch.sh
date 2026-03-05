#!/bin/bash
# Launch the portfolio dev server

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting portfolio dev server..."
npm start
