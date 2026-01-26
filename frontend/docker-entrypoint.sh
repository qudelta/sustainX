#!/bin/sh
set -e

echo "🔍 Checking node_modules..."

# If node_modules volume is empty or doesn't exist, copy from build
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "📦 Copying dependencies from build..."
  cp -r /tmp/node_modules /app/
  echo "✅ Dependencies ready"
else
  echo "✅ Dependencies already present"
fi

echo "🚀 Starting Vite dev server..."
exec "$@"
