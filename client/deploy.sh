#!/bin/bash
set -e
cd "$(dirname "$0")"

DEPLOY_DIR="../.deploy"
REPO="https://github.com/ForkArcade/forkarcade.github.io.git"

# Pierwsze uruchomienie — klonuj repo
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  git clone "$REPO" "$DEPLOY_DIR"
fi

npm run build

# Wyczyść stare pliki (bez .git), wrzuć nowe
find "$DEPLOY_DIR" -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +
cp -r dist/* "$DEPLOY_DIR/"
cp public/404.html "$DEPLOY_DIR/"
cp -r ../sdk "$DEPLOY_DIR/sdk"

cd "$DEPLOY_DIR"
git add -A
git commit -m "Deploy $(date +%Y-%m-%d\ %H:%M)" || echo "No changes"
git push
echo "Done: https://forkarcade.github.io/"
