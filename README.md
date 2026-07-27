# DaMingDaFun Studio

Static Vue and Tres.js website for DaMingDaFun Studio.

## Development

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## GitHub Pages Deployment

This project includes `.github/workflows/deploy.yml`.

After pushing to the `main` or `master` branch, GitHub Actions will:

1. install dependencies with `npm ci`
2. build the site with `npm run build`
3. upload `dist/` to GitHub Pages
4. deploy the latest build automatically

In the GitHub repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.

The Vite config uses `base: './'`, so the site can run correctly from a GitHub Pages project path such as:

```text
https://USERNAME.github.io/REPOSITORY/
```

## Notes

- The site has no backend requirement.
- Routing uses hash history, which works on GitHub Pages without extra server routing rules.
- `public/.nojekyll` prevents GitHub Pages from processing the built files with Jekyll.
