# ForkArcade Client

## Dev

```bash
npm run dev
```

## Deploy na https://forkarcade.github.io/

```bash
npm run build
cd dist
cp ../public/404.html .
cp -r ../../sdk .
git init -b main
git add -A
git commit -m "Deploy"
git remote add origin https://github.com/ForkArcade/forkarcade.github.io.git
git push -f origin main
rm -rf .git
cd ..
```
