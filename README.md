# TenRusl Droid Vectorizer (TRDV) — SVG → VectorDrawable (PWA, Offline)

> Private, fast, and offline-first **PWA** to convert **SVG** into **Android VectorDrawable XML**, with **path optimization**, **transform normalization** (to raw paths), **Android density preview (mdpi–xxxhdpi)**, **per-file export & ZIP**, and a **conversion log**.

![Status](https://img.shields.io/badge/PWA-Ready-8b5cf6)
![License](https://img.shields.io/badge/License-MIT-green)
![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20SVG%20%7C%20VectorDrawable%20%7C%20PWA-111)
![NoBuild](https://img.shields.io/badge/Build-None%20%28Static%20Site%29-2ea44f)
![Stars](https://img.shields.io/github/stars/kakrusliandika/TenRusl-Droid-Vectorizer?style=social)
![Forks](https://img.shields.io/github/forks/kakrusliandika/TenRusl-Droid-Vectorizer?style=social)

Live: **https://tenrusl-droid-vectorizer.pages.dev/**

---

## Table of Contents

-   [✨ Key Features](#-key-features)
-   [▶️ Quick Demo](#️-quick-demo)
-   [📦 Install (Open Source)](#-install-open-source)
-   [🚀 Deployment](#-deployment)
-   [🗂️ Directory Structure](#️-directory-structure)
-   [⚙️ How It Works](#️-how-it-works)
-   [🧩 Presets & Settings](#-presets--settings)
-   [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
-   [🖨️ Export](#️-export)
-   [📲 PWA & Caching](#-pwa--caching)
-   [🌍 I18N](#-i18n)
-   [🛡️ Security Headers (Recommended)](#️-security-headers-recommended)
-   [🛠️ Development](#️-development)
-   [🐞 Troubleshooting](#-troubleshooting)
-   [🤝 Contributing](#-contributing)
-   [📜 Code of Conduct](#-code-of-conduct)
-   [🏆 Credits](#-credits)
-   [👤 Author](#-author)
-   [🗺️ Roadmap](#-roadmap)
-   [📄 License](#-license)

---

## ✨ Key Features

-   **SVG → VectorDrawable XML**
    -   Optimizes SVG, normalizes transforms into raw path data, and maps attributes to Android VectorDrawable.
-   **Transform → Path normalization**
    -   Converts `<g transform>`, rotated/scaled paths, etc. into flattened path data (_requires `svgpath` vendor_).
-   **Precision control**
    -   Decimal precision (0–8) to balance size vs. fidelity.
-   **Shapes → Paths (optional)**
    -   Convert `<rect>/<circle>/<line>/<poly*>` to `<path>` before mapping.
-   **Android density preview**
    -   Live viewport→px preview at **mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi**, light/dark theme, optional grid.
-   **Per-file & bulk export**
    -   Download single **XML** or **Export All** to **ZIP** (`drawable/ic_<name>.xml`).
-   **Conversion log**
    -   Download JSON log (input stats, warnings, config snapshot).
-   **Offline-first PWA**
    -   Works fully offline; caches core assets and modules.

---

## ▶️ Quick Demo

1. **Drop** or **select** one or more **SVG** files (left panel).
2. Adjust **Precision (decimals)**, **Convert shapes**, **Default size (dp)**.
3. Set **Preview density** and toggle **Grid**.
4. Review **Warnings** and **Results** list.
5. **Preview** a processed SVG, **Copy XML**, **Download XML**, or **Export All** (ZIP).
6. (Optional) **Download Log** to inspect stats/warnings.

---

## 📦 Install (Open Source)

### 1) Clone the repository

```bash
# SSH
git clone --depth 1 git@github.com:kakrusliandika/TenRusl-Droid-Vectorizer.git
# or HTTPS
git clone --depth 1 https://github.com/kakrusliandika/TenRusl-Droid-Vectorizer.git

cd TenRusl-Droid-Vectorizer
```

### 2) Run it (no build step)

```bash
# Node
npx serve . -p 5173

# Or Python
python -m http.server 5173

# Or Bun
bunx serve . -p 5173
```

Open `http://localhost:5173`.

### 3) Keep your fork in sync (optional)

```bash
git remote add upstream https://github.com/kakrusliandika/TenRusl-Droid-Vectorizer.git
git fetch upstream
git checkout main
git merge upstream/main
```

### 4) Create a feature branch (for PRs)

```bash
git checkout -b feat/awesome-improvements
# ...changes...
git add -A
git commit -m "feat: awesome improvements to TRDV Vectorizer"
git push origin feat/awesome-improvements
# Open a PR on GitHub
```

---

### Building?

No build step required. Keep the Service Worker reachable at site root (`/sw.js`) or provide header:
`Service-Worker-Allowed: /` if you serve it under `/assets/js/sw.js`.

---

## 🚀 Deployment

### Cloudflare Pages (recommended)

-   **Build command**: _(empty)_
-   **Output directory**: `/`
-   Ensure SW is registered as `/sw.js` with scope `/` (or set the header if under `/assets/js/sw.js`).
-   `_headers` and `_redirects` are honored.

### Netlify / Vercel / Any static host

-   Upload the repo.
-   Apply **security headers** (see below).
-   For SPA routes (if any), keep `/*  /index.html  200` in `_redirects` (optional).

### Apache / Nginx

-   Mirror headers via `.htaccess` or server config.
-   Ensure SW scope covers `/`.

---

## 🗂️ Directory Structure

```
/
├─ index.html
├─ manifest.webmanifest
├─ robots.txt
├─ sitemap.xml
├─ sitemap-index.xml
├─ CODE_OF_CONDUCT.md
├─ CONTRIBUTING.md
├─ LICENSE
├─ README.md
├─ humans.txt
├─ _headers
├─ _redirects
├─ .well-known/
│  └─ security.txt
├─ assets/
│  ├─ css/
│  │  ├─ app.css
│  │  ├─ chrome.css
│  │  ├─ header.css
│  │  ├─ footer.css
│  │  ├─ theme.css
│  ├─ i18n/
│  │  ├─ en.json
│  │  └─ id.json
│  ├─ images/
│  │  └─ icon.svg
│  ├─ js/
│  │  ├─ app.js
│  │  ├─ footer.js
│  │  ├─ header.js
│  │  ├─ language.js
│  │  ├─ sw.js         # or /sw.js at root
│  │  └─ theme.js
│  ├─ modules/
│  │  ├─ export-zip.js
│  │  ├─ map-to-vectordrawable.js
│  │  ├─ normalize-transform.js
│  │  ├─ optimize.js
│  │  ├─ parse-svg.js
│  │  ├─ precision.js
│  │  ├─ preview.js
│  │  ├─ storage.js
│  │  └─ warnings.js
│  └─ plugin/
│     └─ svgpath/lib/svgpath.min.js
├─ pages/
│  ├─ offline.html
│  ├─ privacy.html
│  ├─ terms.html
│  ├─ cookies.html
│  └─ contact.html
```

---

## ⚙️ How It Works

**Pipeline**

1. **Optimize SVG** — minifies & simplifies markup (SVGO-like strategies).
2. **Parse (no DOMParser fallback)** — safely acquires an `SVGDocument` via `innerHTML + importNode`.
3. **Normalize transforms → path** — applies transforms onto path data; requires vendor **`svgpath`**.
4. **Map to VectorDrawable XML** — builds `<vector>` with `<path>` elements, dimensions, and attributes.
5. **Preview** — computes Android pixel size for selected density using viewport and default dp.

**Precision**

-   Decimal places (0–8) applied to path data; trade-off size vs. fidelity.

**Shapes → Path (optional)**

-   Converts basic shapes to paths so mapping is consistent.

---

## 🧩 Presets & Settings

-   **Presets**: _Max Quality_, _Balanced_, _Max Reduce_ (affect decimals, convertShapes, density, grid).
-   **Settings** (persisted to `localStorage`):
    -   `decimals`, `convertShapes`, `defaultDp`, `density`, `grid`, `theme`, `locale`.

---

## ⌨️ Keyboard Shortcuts

_Currently none._ (Planned: quick toggle theme/density.)

---

## 🖨️ Export

-   **Download XML** — per item (`ic_<sanitized_name>.xml`).
-   **Copy XML** — to clipboard.
-   **Export All (ZIP)** — bundles all results to `vector-drawables.zip` under `drawable/`.
-   **Download Log** — JSON file with stats, warnings, and current config snapshot.

---

## 📲 PWA & Caching

The SW maintains:

-   **CORE_CACHE** — app shell (HTML/CSS/JS/manifest/icon).
-   **RUNTIME_CACHE** — same-origin assets (stale-while-revalidate), navigations (network-first with offline fallback).
-   **Precache list** — includes key modules and i18n files so the app works offline.

Notes:

-   Bump `VERSION` in SW to invalidate old caches.
-   Offline navigation can fallback to `/pages/offline.html`.

---

## 🌍 I18N

-   Dictionaries: `/assets/i18n/en.json`, `/assets/i18n/id.json`.
-   Runtime language switch triggers `trhc:i18nUpdated` to reapply labels.

---

## 🛡️ Security Headers (Recommended)

Use `_headers` (Cloudflare Pages/Netlify):

```
/*
  Content-Security-Policy: default-src 'self'; img-src 'self' blob: data:; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Adjust CSP if you host vendors elsewhere.

---

## 🛠️ Development

-   Entry: `index.html`
-   Orchestrator: `assets/js/app.js`
-   PWA: `assets/js/sw.js` (or `/sw.js`)
-   Modules: `assets/modules/*.js`
-   i18n: `assets/i18n/*.json`
-   Theme: `assets/css/*`

---

## 🐞 Troubleshooting

-   **“svgpath library not found; transform not applied”**
    -   Ensure `assets/plugin/svgpath/lib/svgpath.min.js` is included **before** normalization runs (see `<script>` in `index.html`).
-   **Preview not showing**
    -   Check that `preview.js` mounted correctly; ensure `setSvg()` receives a **valid** `<svg>`.
-   **ZIP contains only `ic_on.xml`**
    -   This was due to over-aggressive filename sanitizer removing `ic` from “icon”. **Fixed**: now only strips leading `ic_`.
-   **Clipboard blocked**
    -   Some browsers require a user gesture; click **Copy XML** again or allow clipboard permissions.
-   **SW not active**
    -   Serve over HTTP(S) (not `file://`), hard-reload, or clear old SW in DevTools → Application.

---

## 🤝 Contributing

Contributions welcome! See **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## 📜 Code of Conduct

Please follow the **[Code of Conduct](CODE_OF_CONDUCT.md)**.

---

## 🏆 Credits

-   **svgpath**
-   **SVGO** (inspired strategies)
-   **JSZip**
-   **Font Awesome**

---

## 👤 Author

-   **Andika Rusli (TenRusl)**
-   **Site**: https://tenrusl-droid-vectorizer.pages.dev
-   **GitHub**: https://github.com/kakrusliandika/TenRusl-Droid-Vectorizer

---

## 🗺️ Roadmap

-   [ ] In-page XML **modal viewer** with syntax highlight
-   [ ] Batch presets per folder
-   [ ] Drag-reorder results + multi-select export
-   [ ] More mapping coverage & warnings catalog
-   [ ] CLI companion (Node)

---

## 📄 License

**MIT** — see **LICENSE**.
