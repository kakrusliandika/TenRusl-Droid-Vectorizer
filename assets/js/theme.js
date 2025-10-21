/* assets/js/theme.js — Dark/Light theme (no Prism dependency) */
(function () {
    "use strict";

    var LS_KEY = "tenrusl.theme";
    var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function updateMetaThemeColor(mode) {
        try {
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute("content", mode === "light" ? "#8b5cf6" : "#111111");
        } catch {}
    }

    function getStored() {
        try {
            var v = localStorage.getItem(LS_KEY);
            if (v === "light" || v === "dark" || v === "auto") return v;
        } catch {}
        return null;
    }

    function effectiveMode() {
        var s = getStored();
        if (s === "light" || s === "dark") return s;
        return mql && mql.matches ? "dark" : "light";
    }

    function apply(mode) {
        document.documentElement.classList.toggle("light", mode === "light");
        updateMetaThemeColor(mode);
        try {
            window.dispatchEvent(new CustomEvent("tenrusl:themeChanged", { detail: { mode: mode } }));
        } catch {}
    }

    function setTheme(mode, opts) {
        var m = mode === "light" || mode === "dark" || mode === "auto" ? mode : "dark";
        if (!opts || opts.save !== false) {
            try {
                localStorage.setItem(LS_KEY, m);
            } catch {}
        }
        var eff = m === "auto" ? (mql && mql.matches ? "dark" : "light") : m;
        apply(eff);
    }

    function toggleTheme() {
        var s = getStored();
        if (s === "auto") {
            setTheme(mql && mql.matches ? "light" : "dark");
            return;
        }
        var cur = effectiveMode();
        setTheme(cur === "dark" ? "light" : "dark");
    }

    function init() {
        apply(effectiveMode());
        if (mql) {
            var onChange = function () {
                var s = getStored();
                if (!s || s === "auto") apply(effectiveMode());
            };
            if (typeof mql.addEventListener === "function") mql.addEventListener("change", onChange);
            else if (typeof mql.addListener === "function") mql.addListener(onChange);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

    window.TRTheme = { setTheme: setTheme, toggleTheme: toggleTheme, getMode: effectiveMode, getStored: getStored };
})();
