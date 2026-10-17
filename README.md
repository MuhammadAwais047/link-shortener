# ✂️ SnipURL — Link Shortener

Turn long URLs into short, tidy snips. **100% client-side** — built with pure HTML, CSS and vanilla JavaScript, no backend, no database, no API keys.

**Live demo:** https://muhammadawais047.github.io/link-shortener/

## How it works

A shortener normally needs a server to store the code→URL map. This app solves it with the **URL hash as the routing layer**: every snip is a link like `…/link-shortener/#/aB3xK9`. When someone opens that link, the app reads the code from the hash, looks it up in `localStorage` and redirects — with a 3-second countdown and a "go now" escape hatch.

> **Honest limitation:** snips live in the *creator's* browser (localStorage), so they resolve on the same browser/profile that created them. This is the standard trade-off of a zero-backend shortener — swap localStorage for any KV store and it goes multi-device.

## Features

- **Auto-generated codes** — 6-character base62, crypto-secure (`crypto.getRandomValues` with rejection sampling, no modulo bias)
- **Custom aliases** — claim `#/my-link` instead of random characters
- **Smart URL validation** — auto-prepends `https://`, rejects non-http(s) schemes (no `javascript:` URLs), requires a real hostname
- **Duplicate detection** — snipping the same URL twice returns your existing link
- **Redirect page** — spinner, destination preview, live countdown, automatic `location.replace` (no history pollution)
- **Click tracking** — every redirect bumps a per-link counter
- **Search & manage** — filter your snips, copy, open, or delete them
- **Stats bar** — links snipped, total clicks, characters saved
- **Toast notifications** instead of blocking dialogs
- **Accessible** — labelled inputs, `role="alert"` messages, keyboard-friendly, focus-visible styles
- **Responsive** and `prefers-reduced-motion` friendly

## Tech

| Layer  | Choice                                            |
| ------ | ------------------------------------------------- |
| Markup | Semantic HTML5                                    |
| Style  | Modern CSS (grid, custom properties, animations)  |
| Logic  | Vanilla ES2020 — hash routing + localStorage      |

## Run locally

```bash
python -m http.server 8080
# then open http://localhost:8080
```

Or simply open `index.html` in a browser.

## Project structure

```
link-shortener/
├── index.html   # app view + redirect view (hash-routed)
├── styles.css   # theme, cards, redirect screen
└── app.js       # code generation, validation, routing, storage
```

---

© 2026 [Muhammad Awais](https://github.com/MuhammadAwais047). Licensed under the [MIT License](LICENSE).
