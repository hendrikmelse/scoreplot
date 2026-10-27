# Working in this repo

Scoreplot, a web app for keeping score in games (React + TypeScript frontend in `web/`). The README describes the layout. This file holds what a new Claude session needs on top of that.

## Before every push

Run all of CI's steps from `web/` right before pushing (not earlier in the session), and fix anything that fails first:

```
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

The steps are defined in `.github/workflows/ci.yml`. A failure blocks the deploy job and emails the owner. It happened once after running only tsc and vitest: eslint (`react-hooks/purity`, `performance.now` in a component) and prettier (a SCSS file) both failed in CI.
