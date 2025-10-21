# Contributing to TenRusl Droid Vectorizer (TRDV)

First off — thank you for taking the time to contribute! 🎉  
This project is open-source and we welcome issues, discussions, docs fixes, and feature PRs.

> By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 💡 Ways to Contribute

-   **Bug reports** (with minimal repro)
-   **Feature requests** (clearly scoped)
-   **Documentation** (README, usage tips, i18n)
-   **DX/UX improvements** (preview flow, presets, export UX)
-   **Performance** (SW cache, path normalization)

---

## 🧰 Project Setup

This is a static site (no build step). Run with any static server:

```bash
# Clone your fork
git clone --depth 1 https://github.com/<you>/TenRusl-Droid-Vectorizer.git
cd TenRusl-Droid-Vectorizer

# Run locally
npx serve . -p 5173       # or: python -m http.server 5173
# open http://localhost:5173
```

> Ensure **Service Worker** is reachable at scope `/`.  
> If served from `/assets/js/sw.js`, set header: `Service-Worker-Allowed: /`.

---

## 🌳 Branching & Workflow

1. **Fork** the repo and clone your fork.
2. Create a feature branch from `main`:
    ```bash
    git checkout -b feat/<short-feature-name>
    ```
3. Make your changes, then commit:
    ```bash
    git add -A
    git commit -m "feat: add vector preview modal"
    ```
4. Push and open a PR:
    ```bash
    git push origin feat/<short-feature-name>
    ```

Keep PRs focused and small when possible.

---

## 📝 Conventional Commits

Use the conventional commits format for clear history:

```
feat: add XML modal preview
fix: sanitizeName strips only leading ic_
docs: update README with presets section
chore: bump SW version for cache bust
refactor: simplify transform normalization
perf: memoize svg->xml serialization
test: add unit tests for mapping edge cases
```

---

## 🧪 PR Checklist

-   [ ] **Works offline** (core flows with no network)
-   [ ] **Preview densities** render correctly
-   [ ] **Export XML/ZIP** tested
-   [ ] **Warnings** surfaced in UI
-   [ ] **SW VERSION bumped** if assets changed
-   [ ] **Docs updated** (README/i18n) if labels/flows changed
-   [ ] Before/after screenshots for UI changes (optional)

---

## 🌐 Adding i18n

-   Add new files to `/assets/i18n/` (e.g., `fr.json`) and wire them to the language switcher.
-   Keep labels concise; avoid breaking layouts.

---

## 🛡️ Security & Headers

See **\_headers** in the repo for CSP, caching, and SW scope settings.

---

## 🐞 Filing Good Issues

When reporting a bug, include:

-   Steps to reproduce (minimal SVG preferred)
-   Expected vs actual behavior
-   Browser/OS/version
-   Console/network logs if relevant
-   If relevant, attach a small SVG that reproduces the issue

Search existing issues first to avoid duplicates.

---

## 🔄 Keeping Your Fork in Sync

```bash
git remote add upstream https://github.com/kakrusliandika/TenRusl-Droid-Vectorizer.git
git fetch upstream
git checkout main
git merge upstream/main
```

---

## 📜 License

By contributing, you agree that your contributions are licensed under the **MIT License** of this repository.
