// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\precision.js
/**
 * Presisi numerik untuk pathData & atribut numerik.
 * Tujuan:
 *  - Membulatkan angka desimal pada 'd' tanpa mengubah huruf perintah.
 *  - Aman untuk angka pada arc-flag (0/1) karena tetap dibulatkan ke 0/1.
 */

/** Pembulatan stabil (hindari -0). */
export function roundTo(value, decimals = 2) {
    const f = Math.pow(10, decimals);
    const v = Math.round((Number(value) + Number.EPSILON) * f) / f;
    return v === 0 ? 0 : v;
}

/**
 * Terapkan presisi pada string pathData.
 * Strategi:
 *  - Regex angka umum: -?\d*\.?\d+(e[+-]?\d+)? (termasuk eksponen)
 *  - Skip jika match bukan angka valid
 *  - Jaga pemisah (spasi/koma) & huruf perintah apa adanya
 *
 * @param {string} d
 * @param {number} decimals
 * @returns {string}
 */
export function applyPrecisionToPathData(d, decimals = 2) {
    if (typeof d !== "string" || d.trim() === "") return d;
    const re = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi;
    return d.replace(re, (numStr) => {
        const num = Number(numStr);
        if (!Number.isFinite(num)) return numStr;
        const r = roundTo(num, decimals);
        const s = String(r);
        return s
            .replace(/^-?0(\.0+)?$/, "0")
            .replace(/(\.\d*?[1-9])0+$/, "$1")
            .replace(/\.0+$/, "");
    });
}

/**
 * Terapkan presisi pada atribut numerik umum (mis. strokeWidth).
 * @param {string|number|null|undefined} v
 * @param {number} decimals
 * @returns {string|undefined}
 */
export function applyPrecisionToNumberAttr(v, decimals = 2) {
    if (v == null) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    const r = roundTo(n, decimals);
    return String(r);
}
