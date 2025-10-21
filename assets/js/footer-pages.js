/* =========================================================
   footer-pages.js — FINAL
   - Inject site-footer
   - i18n labels OK (tanpa [object Object])
   - Mobile: center + GitHub icon
   ======================================================= */
(() => {
    "use strict";

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    function t(key, fallback) {
        return window.PagesI18N && typeof window.PagesI18N.t === "function"
            ? window.PagesI18N.t(key) ?? (fallback || key)
            : fallback || key;
    }

    function applyI18N(scope) {
        $$("[data-i18n]", scope).forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const label = el.querySelector(".label");
            const text = t(key, label ? label.textContent : el.textContent);
            if (label) label.textContent = text;
            else el.textContent = text;
        });
    }

    function injectFooter() {
        if ($(".site-footer")) return;
        const year = new Date().getFullYear();

        const f = document.createElement("footer");
        f.className = "site-footer";
        f.innerHTML = `
      <div class="left">
        <span>© ${year} TenRusl Droid Vectorizer</span>
        <span class="badge">PWA</span>
      </div>
      <div class="right">
        <a href="/pages/privacy.html" class="footer-link icon-btn ghost" data-i18n="nav.privacy">
          <i class="fa-solid fa-shield icon" aria-hidden="true"></i>
          <span class="label">Privacy</span>
        </a>
        <a href="/pages/terms.html" class="footer-link icon-btn ghost" data-i18n="nav.terms">
          <i class="fa-solid fa-scale-balanced icon" aria-hidden="true"></i>
          <span class="label">Terms</span>
        </a>
        <a href="/pages/cookies.html" class="footer-link icon-btn ghost" data-i18n="nav.cookies">
          <i class="fa-solid fa-cookie-bite icon" aria-hidden="true"></i>
          <span class="label">Cookies</span>
        </a>
        <a href="https://github.com/kakrusliandika/TenRusl-Droid-Vectorizer" target="_blank" rel="noopener" class="icon-btn ghost">
          <i class="fa-brands fa-github icon" aria-hidden="true"></i>
          <span class="label">GitHub</span>
        </a>
      </div>
    `;
        document.body.appendChild(f);
        applyI18N(f);
    }

    document.addEventListener("tenrusl:i18nUpdated", () => {
        const f = document.querySelector(".site-footer");
        if (f) applyI18N(f);
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectFooter, { once: true });
    } else {
        injectFooter();
    }
})();
