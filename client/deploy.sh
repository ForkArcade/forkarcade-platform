#!/bin/bash
set -e
cd "$(dirname "$0")"
npm run build
cp public/404.html dist/
cp -r ../sdk dist/sdk
cd dist
git init -b main
git add -A
git commit -m "Deploy"
git remote add origin https://github.com/ForkArcade/forkarcade.github.io.git
git push -f origin main
rm -rf .git
echo "Done: https://forkarcade.github.io/"
