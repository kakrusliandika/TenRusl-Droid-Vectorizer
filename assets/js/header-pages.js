/* =========================================================
   header-pages.js — FINAL (match Home header)
   ======================================================= */
(() => {
    "use strict";

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* ---------- THEME helpers ---------- */
    const THEME_LS = "tenrusl.theme";

    function ensureMetaTheme() {
        let m = document.querySelector('meta[name="theme-color"]');
        if (!m) {
            m = document.createElement("meta");
            m.name = "theme-color";
            document.head.appendChild(m);
        }
        return m;
    }
    function isLight() {
        if (typeof window.getTheme === "function") return window.getTheme() === "light";
        const ls = localStorage.getItem(THEME_LS);
        if (ls) return ls === "light";
        return document.documentElement.classList.contains("light");
    }
    function applyTheme(light) {
        if (typeof window.setTheme === "function") {
            window.setTheme(light ? "light" : "dark");
        } else {
            document.documentElement.classList.toggle("light", !!light);
            localStorage.setItem(THEME_LS, light ? "light" : "dark");
        }
        ensureMetaTheme().setAttribute("content", light ? "#ffffff" : "#0b0d12");
    }
    function toggleTheme() {
        applyTheme(!isLight());
    }

    /* ---------- I18N helpers ---------- */
    function t(key, fallback) {
        return window.PagesI18N && typeof window.PagesI18N.t === "function"
            ? window.PagesI18N.t(key) ?? (fallback || key)
            : fallback || key;
    }
    function curLang() {
        return window.PagesI18N && typeof window.PagesI18N.get === "function" ? window.PagesI18N.get() : "en";
    }
    function flipLang() {
        if (window.PagesI18N && typeof window.PagesI18N.toggleLang === "function") window.PagesI18N.toggleLang();
    }

    /* ---------- inject header ---------- */
    function injectHeader() {
        // Cegah double-inject di pages
        if (document.querySelector('.app-header[data-scope="pages"]')) return;

        const hdr = document.createElement("header");
        hdr.className = "app-header";
        hdr.setAttribute("data-scope", "pages");
        hdr.innerHTML = `
      <div class="brand">
        <img src="/assets/images/icon.svg" width="28" height="28" alt="TRDV" />
        <strong>
          <span class="brand-full">TenRusl Droid Vectorizer</span>
          <span class="brand-abbr">TRDV</span>
        </strong>
        <span class="badge">PWA</span>
      </div>

      <nav class="controls" aria-label="Toolbar">
        <a class="icon-btn ghost" href="/" data-path="/" data-i18n="nav.home">
          <i class="fa-solid fa-house icon" aria-hidden="true"></i>
          <span class="label">Home</span>
        </a>
        <a class="icon-btn ghost" href="/pages/contact.html" data-path="/pages/contact.html" data-i18n="nav.contact">
          <i class="fa-solid fa-headset icon" aria-hidden="true"></i>
          <span class="label">Contact</span>
        </a>
        <a class="icon-btn ghost" href="/pages/privacy.html" data-path="/pages/privacy.html" data-i18n="nav.privacy">
          <i class="fa-solid fa-shield icon" aria-hidden="true"></i>
          <span class="label">Privacy</span>
        </a>
        <a class="icon-btn ghost" href="/pages/terms.html" data-path="/pages/terms.html" data-i18n="nav.terms">
          <i class="fa-solid fa-scale-balanced icon" aria-hidden="true"></i>
          <span class="label">Terms</span>
        </a>
        <a class="icon-btn ghost" href="/pages/cookies.html" data-path="/pages/cookies.html" data-i18n="nav.cookies">
          <i class="fa-solid fa-cookie-bite icon" aria-hidden="true"></i>
          <span class="label">Cookies</span>
        </a>

        <span class="sep" aria-hidden="true"></span>

        <button id="btnUiLangSites" class="icon-btn" type="button"
                title="Toggle UI Language" aria-label="Toggle UI Language">
          <i class="fa-solid fa-globe icon" aria-hidden="true"></i>
          <span id="uiLangBadge" class="badge-mini">EN</span>
        </button>

        <button id="btnTheme" class="icon-btn" type="button"
                title="Toggle Theme" aria-label="Toggle Theme" style="position: relative">
          <i class="fa-solid fa-sun icon icon-sun" aria-hidden="true"></i>
          <i class="fa-solid fa-moon icon icon-moon" aria-hidden="true"></i>
        </button>
      </nav>
    `;
        document.body.prepend(hdr);

        wireHeader(hdr);
    }

    /* ---------- behaviors ---------- */
    function wireHeader(root) {
        // active menu
        const path = location.pathname.replace(/\/+$/, "") || "/";
        $$(".controls a[data-path]", root).forEach((a) => {
            if (a.getAttribute("data-path") === path) a.classList.add("active");
        });

        // theme init
        applyTheme(isLight());

        // lang init + badge
        const badge = $("#uiLangBadge", root);
        if (badge) badge.textContent = curLang().toLowerCase() === "id" ? "ID" : "EN";

        // translate labels inside header
        applyI18N(root);

        // handlers
        $("#btnTheme", root)?.addEventListener("click", toggleTheme);
        $("#btnUiLangSites", root)?.addEventListener("click", () => {
            flipLang();
            applyI18N(root);
            const b = $("#uiLangBadge", root);
            if (b) b.textContent = curLang().toLowerCase() === "id" ? "ID" : "EN";
        });
    }

    function applyI18N(scope) {
        $$("[data-i18n]", scope).forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const label = el.querySelector(".label");
            const text = t(key, label ? label.textContent : el.textContent);
            if (label) label.textContent = text;
            else el.textContent = text;
        });

        // breadcrumbs "Home / X"
        const bc = $(".breadcrumbs");
        if (bc) {
            bc.innerHTML = bc.innerHTML
                .replace(/>Home</g, `>${t("nav.home", "Home")}<`)
                .replace(/>Beranda</g, `>${t("nav.home", "Beranda")}<`);
        }
    }

    // i18n broadcast khusus pages: konsisten ke `tenrusl:langchange`
    document.addEventListener("tenrusl:langchange", () => {
        const hdr = document.querySelector('.app-header[data-scope="pages"]');
        if (!hdr) return;
        applyI18N(hdr);
        const b = $("#uiLangBadge", hdr);
        if (b)
            b.textContent =
                typeof window.PagesI18N?.get === "function" && window.PagesI18N.get() === "id" ? "ID" : "EN";
    });

    // boot
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectHeader, { once: true });
    } else {
        injectHeader();
    }
})();
