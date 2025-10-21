// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\language.js
/* language.js — i18n EN/ID for TenRusl Droid Vectorizer */
(function () {
    "use strict";

    const LS_LANG = "tenrusl.uiLang";
    const LS_DICT = (lang) => `tenrusl.i18n.${lang}`;
    const SUPPORTED = ["en", "id"];
    const uiBadge = document.getElementById("uiLangBadge");

    // Fallback minimal agar UI tetap berfungsi meski JSON gagal dimuat
    const FALLBACK = {
        en: {
            // App
            "app.title": "TenRusl Droid Vectorizer",
            "app.tagline": "Convert SVG to Android VectorDrawable",

            // Footer/pages
            privacy: "Privacy",
            terms: "Terms",
            cookies: "Cookies",

            // Common
            "common.reset": "Reset",
            "common.close": "Close",
            "common.copy": "Copy",
            "common.copied": "Copied",
            "common.download": "Download",

            // Preset labels (by id)
            "preset.max_quality": "Max Quality",
            "preset.balanced": "Balanced",
            "preset.max_reduce": "Max Reduce",

            // Vectorizer UI
            "vectorizer.inputs": "Inputs & Settings",
            "vectorizer.dropTitle": "Drop SVG files here",
            "vectorizer.dropHint": "or click to select files",
            "vectorizer.presets": "Presets",
            "vectorizer.precision": "Precision (decimals)",
            "vectorizer.convertShapes": "Convert shapes to paths",
            "vectorizer.defaultDp": "Default size (dp)",
            "vectorizer.density": "Preview density",
            "vectorizer.grid": "Grid",

            "vectorizer.downloadLog": "Download Log",
            "vectorizer.exportAll": "Export All",
            "vectorizer.preview": "Preview",
            "vectorizer.results": "Results",
            "vectorizer.noWarnings": "No warnings",

            // Preview controls (bila modul preview memberi data-i18n)
            "preview.controls.density": "Density",
            "preview.controls.theme": "Theme",
            "preview.controls.grid": "Grid",

            // Status/hints
            "vectorizer.ready": "Ready — drop SVG files",
            "vectorizer.processing": "Processing…",
            "vectorizer.done": "Done",
            "vectorizer.failed": "Failed",

            // Actions (result rows)
            "actions.preview": "Preview",
            "actions.xml": "XML",
            "actions.copyXml": "Copy XML",

            // Warning messages (summary)
            "warn.UNKNOWN": "See mapping reference for details.",
            "warn.FILL_NON_SOLID": "Non-solid fills may not translate to VectorDrawable.",
            "warn.STROKE_COMPLEX": "Complex strokes may be simplified.",
            "warn.FILTERS_IGNORED": "SVG filters are not supported and were ignored.",
        },
        id: {
            // App
            "app.title": "TenRusl Droid Vectorizer",
            "app.tagline": "Konversi SVG ke Android VectorDrawable",

            // Footer/pages
            privacy: "Privasi",
            terms: "Ketentuan",
            cookies: "Cookie",

            // Common
            "common.reset": "Reset",
            "common.close": "Tutup",
            "common.copy": "Salin",
            "common.copied": "Tersalin",
            "common.download": "Unduh",

            // Preset labels (by id)
            "preset.max_quality": "Kualitas Maksimal",
            "preset.balanced": "Seimbang",
            "preset.max_reduce": "Kompresi Maksimal",

            // Vectorizer UI
            "vectorizer.inputs": "Input & Pengaturan",
            "vectorizer.dropTitle": "Jatuhkan berkas SVG di sini",
            "vectorizer.dropHint": "atau klik untuk memilih berkas",
            "vectorizer.presets": "Preset",
            "vectorizer.precision": "Presisi (desimal)",
            "vectorizer.convertShapes": "Konversi bentuk menjadi path",
            "vectorizer.defaultDp": "Ukuran default (dp)",
            "vectorizer.density": "Kerapatan pratinjau",
            "vectorizer.grid": "Kisi (grid)",

            "vectorizer.downloadLog": "Unduh Log",
            "vectorizer.exportAll": "Ekspor Semua",
            "vectorizer.preview": "Pratinjau",
            "vectorizer.results": "Hasil",
            "vectorizer.noWarnings": "Tidak ada peringatan",

            // Preview controls (bila modul preview memberi data-i18n)
            "preview.controls.density": "Kerapatan",
            "preview.controls.theme": "Tema",
            "preview.controls.grid": "Kisi",

            // Status/hints
            "vectorizer.ready": "Siap — jatuhkan berkas SVG",
            "vectorizer.processing": "Memproses…",
            "vectorizer.done": "Selesai",
            "vectorizer.failed": "Gagal",

            // Actions (result rows)
            "actions.preview": "Pratinjau",
            "actions.xml": "XML",
            "actions.copyXml": "Salin XML",

            // Warning messages (summary)
            "warn.UNKNOWN": "Lihat referensi mapping untuk detail.",
            "warn.FILL_NON_SOLID": "Fill non-solid mungkin tidak dapat diterjemahkan ke VectorDrawable.",
            "warn.STROKE_COMPLEX": "Stroke kompleks mungkin disederhanakan.",
            "warn.FILTERS_IGNORED": "Filter SVG tidak didukung dan diabaikan.",
        },
    };

    let dict = FALLBACK.en;

    const clamp = (x) => (SUPPORTED.includes(String(x).toLowerCase()) ? String(x).toLowerCase() : "en");

    function t(key) {
        return dict[key] || key;
    }

    async function loadDict(lang) {
        // 1) coba dari cache LS — merge dengan fallback agar kunci baru tetap ada
        const cached = localStorage.getItem(LS_DICT(lang));
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                return { ...FALLBACK[lang], ...parsed };
            } catch {
                /* lanjut ke fetch */
            }
        }
        // 2) fetch file i18n & simpan; tetap merge dengan fallback
        try {
            const res = await fetch(`/assets/i18n/${lang}.json`, { cache: "no-cache", credentials: "same-origin" });
            if (!res.ok) throw new Error("i18n fetch fail");
            const json = await res.json();
            localStorage.setItem(LS_DICT(lang), JSON.stringify(json));
            return { ...FALLBACK[lang], ...json };
        } catch {
            return FALLBACK[lang] || FALLBACK.en;
        }
    }

    function relabelPresetOptions(scope = document) {
        const sel = scope.querySelector("#presetSelect");
        if (!sel) return;
        Array.from(sel.options).forEach((opt) => {
            const id = String(opt.value || "").toLowerCase();
            if (id && dict[`preset.${id}`]) {
                opt.textContent = dict[`preset.${id}`];
            }
        });
    }

    function applyTexts() {
        // Title dokumen (opsional)
        if (document.title && dict["app.title"]) {
            document.title = dict["app.title"];
        }

        // Semua elemen ber-data-i18n
        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const k = el.getAttribute("data-i18n");
            const txt = t(k);
            const label = el.matches(".label") ? el : el.querySelector(":scope > .label");
            if (label) {
                label.textContent = txt;
            } else if (el.childElementCount === 0) {
                el.textContent = txt;
            } else {
                const span = document.createElement("span");
                span.className = "label";
                span.textContent = txt;
                el.appendChild(span);
            }
        });

        // Relabel preset <select> berdasarkan id option (max_quality/balanced/max_reduce)
        relabelPresetOptions();
    }

    async function setUiLang(lang) {
        const next = clamp(lang);
        dict = await loadDict(next);
        localStorage.setItem(LS_LANG, next);
        document.documentElement.lang = next === "id" ? "id" : "en";
        if (uiBadge) uiBadge.textContent = next.toUpperCase();
        applyTexts();
        document.dispatchEvent(new CustomEvent("tenrusl:i18nUpdated", { detail: { lang: next } }));
    }

    function detectInitialLang() {
        const fromLS = localStorage.getItem(LS_LANG);
        if (fromLS) return clamp(fromLS);

        const metaCountry = document.querySelector('meta[name="tenrusl-country"]')?.getAttribute("content");
        const hinted = (window.__tenrusl_COUNTRY || metaCountry || "").toUpperCase();
        if (hinted === "ID") return "id";

        const langs = (navigator.languages || [navigator.language || "en"]).map((x) => String(x).toLowerCase());
        if (langs.some((x) => x.startsWith("id"))) return "id";

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (/^Asia\/(Jakarta|Makassar|Jayapura)$/i.test(tz)) return "id";
        return "en";
    }

    async function init() {
        const initial = detectInitialLang();
        await setUiLang(initial);
    }

    document.addEventListener("DOMContentLoaded", init);

    // Expose
    window.TRI18N = {
        setUiLang,
        toggleUiLang: () => setUiLang((localStorage.getItem(LS_LANG) || "en") === "en" ? "id" : "en"),
        t,
    };
})();
