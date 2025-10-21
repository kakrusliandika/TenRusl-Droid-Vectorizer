// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\warnings.js
/**
 * Utilitas peringatan terstruktur.
 * Struktur:
 *  { code: string, message: string, severity: 'info'|'warn'|'error', meta?: any }
 */

export const Severity = Object.freeze({
    Info: "info",
    Warn: "warn",
    Error: "error",
});

/**
 * Tambahkan warning terstruktur.
 * @param {Array} list
 * @param {string} code
 * @param {string} message
 * @param {'info'|'warn'|'error'} [severity='warn']
 * @param {any} [meta]
 */
export function pushWarning(list, code, message, severity = Severity.Warn, meta) {
    list.push({ code, message, severity, meta });
}

/**
 * Gabungkan & hitung ringkasan per kode.
 * @param {Array<{code:string,severity:string}>} warnings
 * @returns {Record<string,{count:number,severity:string}>}
 */
export function summarizeWarnings(warnings) {
    const out = {};
    for (const w of warnings) {
        if (!out[w.code]) out[w.code] = { count: 0, severity: w.severity };
        out[w.code].count += 1;
        if (rankSeverity(w.severity) > rankSeverity(out[w.code].severity)) {
            out[w.code].severity = w.severity;
        }
    }
    return out;
}

function rankSeverity(s) {
    if (s === Severity.Error) return 3;
    if (s === Severity.Warn) return 2;
    return 1;
}

/** Kode standar yang umum dipakai modul lain. */
export const WarningCodes = Object.freeze({
    // Parsing / Sanitasi
    PATH_EMPTY: "W_PATH_EMPTY",
    COLOR_UNPARSEABLE: "W_COLOR_UNPARSEABLE",
    RECT_ROUNDED_IGNORED: "W_RECT_ROUNDED_IGNORED",
    SHAPE_SKIPPED: "W_SHAPE_SKIPPED",
    NO_VIEWBOX: "W_NO_VIEWBOX",
    VIEWPORT_FALLBACK: "W_VIEWPORT_FALLBACK",

    // Stroke & Fill
    STROKE_LINECAP_UNSUPPORTED: "W_STROKE_LINECAP_UNSUPPORTED",
    STROKE_LINEJOIN_UNSUPPORTED: "W_STROKE_LINEJOIN_UNSUPPORTED",

    // Fitur SVG tidak didukung
    UNSUPPORTED_LINEARGRADIENT: "W_UNSUPPORTED_LINEARGRADIENT",
    UNSUPPORTED_RADIALGRADIENT: "W_UNSUPPORTED_RADIALGRADIENT",
    UNSUPPORTED_PATTERN: "W_UNSUPPORTED_PATTERN",
    UNSUPPORTED_FILTER: "W_UNSUPPORTED_FILTER",
    UNSUPPORTED_MASK: "W_UNSUPPORTED_MASK",
    CLIPPATH_LIMITED: "W_CLIPPATH_LIMITED",
});
