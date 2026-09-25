# Advanced Interface

ArtCenter · Advanced Interface with Dan Park. Each component assignment lives in its own folder and gets its own page.

Live: https://wei-afk.github.io/Advanced-Interface/

| Folder | Page |
|---|---|
| `home/` | Home page that links to every component |
| `Progress-Bar/` | Week 1 · Progress indicators |

## Adding a component (e.g. Button)

1. Create a folder at the root, e.g. `Button/`, with its own `package.json` and a `build` script that outputs to `dist/` (a Vite project with `base: './'`).
2. Add a card for it in `home/index.html` (the `COMPONENTS` list).
3. Push. The deploy workflow builds every folder that has a `package.json` and publishes it at `/Advanced-Interface/<Folder>/`.

## Run one locally

```bash
cd Progress-Bar && npm install && npm run dev
```
