/* C:\laragon\www\TenRusl-DiffView\assets\js\header.js
   header.js — FINAL (HOME / .app-header) for DiffView
   - Injects <header.app-header> if missing
   - Binds controls (theme & UI lang)
   - Syncs UI language badge
   - Registers Service Worker
*/
(() => {
    "use strict";

    /* ---------- tiny DOM helpers ---------- */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* ---------- i18n helper (same contract as footer.js) ---------- */
    function t(key, fallback) {
        const tri18n = window.TRI18N && typeof window.TRI18N.t === "function" ? window.TRI18N.t : null;
        const out = tri18n ? tri18n(key) : null;
        return out ?? (fallback || key);
    }

    /* ---------- ensure header exists ---------- */
    function injectHeader() {
        const existing = $(".app-header");
        if (existing) return existing;

        const h = document.createElement("header");
        h.className = "app-header";
        h.innerHTML = `
            <div class="brand">
                <img src="/assets/images/icon.svg" width="28" height="28" alt="TRDV" />
                <strong>
                    <span class="brand-full">TenRusl Droid Vectorizer</span>
                    <span class="brand-abbr">TRDV</span>
                </strong>
                <span class="badge">PWA</span>
            </div>

            <nav class="controls" aria-label="Toolbar">
                <button
                    id="btnUiLang"
                    class="icon-btn"
                    type="button"
                    title="Toggle UI Language"
                    aria-label="Toggle UI Language"
                >
                    <i class="fa-solid fa-globe icon" aria-hidden="true"></i>
                    <span id="uiLangBadge" class="badge-mini">EN</span>
                </button>
                <button
                    id="btnTheme"
                    class="icon-btn"
                    type="button"
                    title="Toggle Theme"
                    aria-label="Toggle Theme"
                    style="position: relative"
                >
                    <i class="fa-solid fa-sun icon icon-sun" aria-hidden="true"></i>
                    <i class="fa-solid fa-moon icon icon-moon" aria-hidden="true"></i>
                </button>
            </nav>
        `;
        // place header at the very top of <body>
        const first = document.body.firstChild;
        if (first) document.body.insertBefore(h, first);
        else document.body.appendChild(h);
        return h;
    }

    /* ---------- i18n apply (future-proof if you add data-i18n in header) ---------- */
    function applyI18N(scope) {
        $$("[data-i18n]", scope).forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const label = el.querySelector(".label");
            const text = t(key, label ? label.textContent : el.textContent);
            if (label) label.textContent = text;
            else el.textContent = text;
        });
        setUiBadge(scope); // keep badge in sync with current lang
    }

    /* ---------- UI Language badge ---------- */
    function getCurrentUiLang() {
        try {
            const ls = localStorage.getItem("tenrusl.uiLang");
            if (ls) return String(ls).toLowerCase();
        } catch {}
        // ask TRI18N if available by reading documentElement.lang as set by language.js
        const htmlLang = (document.documentElement.lang || "").toLowerCase();
        if (htmlLang === "id" || htmlLang === "en") return htmlLang;
        return "en";
    }
    function setUiBadge(scope) {
        const badge = $("#uiLangBadge", scope || document);
        if (!badge) return;
        const lang = getCurrentUiLang();
        badge.textContent = (lang || "en").toUpperCase();
    }

    /* ---------- bind controls & SW ---------- */
    function bindHeader() {
        // ensure header element
        const header = $(".app-header") || injectHeader();
        if (!header) return;

        // progressive enhancement marker
        document.documentElement.classList.remove("no-js");

        // buttons
        const btnTheme = $("#btnTheme", header);
        const btnUiLang = $("#btnUiLang", header);

        if (btnTheme) {
            btnTheme.addEventListener("click", () => {
                if (window.TRTheme && typeof TRTheme.toggleTheme === "function") {
                    TRTheme.toggleTheme();
                }
            });
        }
        if (btnUiLang) {
            btnUiLang.addEventListener("click", () => {
                if (window.TRI18N && typeof TRI18N.toggleUiLang === "function") {
                    TRI18N.toggleUiLang();
                } else {
                    // minimal fallback: toggle LS & badge only (no texts)
                    try {
                        const cur = getCurrentUiLang();
                        const next = cur === "en" ? "id" : "en";
                        localStorage.setItem("tenrusl.uiLang", next);
                    } catch {}
                    setUiBadge(header);
                    document.dispatchEvent(
                        new CustomEvent("tenrusl:i18nUpdated", { detail: { lang: getCurrentUiLang() } })
                    );
                }
            });
        }

        // initial sync
        setUiBadge(header);
        applyI18N(header);

        // Service Worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/assets/js/sw.js").catch(() => {
                /* ignore */
            });
        }
    }

    // Re-apply when i18n dictionary changes
    document.addEventListener("tenrusl:i18nUpdated", () => {
        const h = $(".app-header");
        if (h) applyI18N(h);
    });

    // Boot
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindHeader, { once: true });
    } else {
        bindHeader();
    }

    // Optional: expose tiny API (for testing/extension)
    window.TRHeader = window.TRHeader || {
        inject: injectHeader,
        bind: bindHeader,
        setBadge: setUiBadge,
    };
})();
