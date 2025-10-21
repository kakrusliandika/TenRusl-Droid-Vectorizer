// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\optimize-svg.js
/**
 * Optimizer ringan untuk SVG (tanpa bundler).
 * Strategi:
 * 1) Jika tersedia global optimizer (svgo-browser) → gunakan.
 * 2) Jika tidak, lakukan optimasi ringan berbasis string:
 *    - Hapus XML declaration, DOCTYPE, komentar
 *    - Hapus <metadata>, <desc>, <title> (non-visual), kecuali jika user ingin pertahankan
 *    - Pangkas whitespace berlebih di antar-tag (tanpa menyentuh atribut 'd')
 */

const XML_DECLARATION = /^\s*<\?xml[\s\S]*?\?>\s*/i;
const DOCTYPE = /^\s*<!doctype[\s\S]*?>\s*/i;
const COMMENTS = /<!--([\s\S]*?)-->/g;

/**
 * Optimasi berbasis string sederhana (fallback).
 * @param {string} svg
 * @param {{keepTitle?: boolean, keepDesc?: boolean, keepMetadata?: boolean, collapseWhitespace?: boolean}} options
 * @returns {{ svg: string, warnings: string[], stats: { bytesIn: number, bytesOut: number, saved: number, ratio: number } }}
 */
function fallbackOptimize(svg, options = {}) {
    const warnings = [];
    const bytesIn = new Blob([svg]).size;

    let out = svg;

    // 1) header & doctype
    out = out.replace(XML_DECLARATION, "");
    out = out.replace(DOCTYPE, "");

    // 2) komentar
    out = out.replace(COMMENTS, "");

    // 3) metadata non-visual
    if (!options.keepMetadata) {
        out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, () => {
            warnings.push("Stripped <metadata>.");
            return "";
        });
    }
    if (!options.keepDesc) {
        out = out.replace(/<desc[\s\S]*?<\/desc>/gi, () => {
            warnings.push("Stripped <desc>.");
            return "";
        });
    }
    if (!options.keepTitle) {
        out = out.replace(/<title[\s\S]*?<\/title>/gi, () => {
            warnings.push("Stripped <title>.");
            return "";
        });
    }

    // 4) whitespace antar tag
    if (options.collapseWhitespace !== false) {
        out = out
            .replace(/>\s+</g, "><")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    const bytesOut = new Blob([out]).size;
    const saved = Math.max(bytesIn - bytesOut, 0);
    const ratio = bytesOut > 0 ? 1 - bytesOut / bytesIn : 0;

    return { svg: out, warnings, stats: { bytesIn, bytesOut, saved, ratio } };
}

/**
 * Jalankan optimizer SVGO jika tersedia.
 * Catatan: svgo-browser biasanya mengekspos global `svgo` dengan method `optimize(svg, config)`
 *          Namun environment dapat bervariasi; cek presence dengan aman.
 * @param {string} svg
 * @param {object} config
 */
async function trySvgo(svg, config = {}) {
    const g = typeof self !== "undefined" ? self : window;
    const svgoGlobal =
        (g && g.svgo && typeof g.svgo.optimize === "function" && g.svgo) ||
        (g && g.SVGO && typeof g.SVGO.optimize === "function" && g.SVGO) ||
        null;

    if (!svgoGlobal) return null;

    try {
        const res = await svgoGlobal.optimize(svg, config);
        const optimized = typeof res === "string" ? res : (res && (res.data || res.content || res.svg)) || null;
        if (!optimized) return null;

        const bytesIn = new Blob([svg]).size;
        const bytesOut = new Blob([optimized]).size;
        const saved = Math.max(bytesIn - bytesOut, 0);
        const ratio = bytesOut > 0 ? 1 - bytesOut / bytesIn : 0;

        return {
            svg: optimized,
            warnings: [],
            stats: { bytesIn, bytesOut, saved, ratio },
        };
    } catch (_e) {
        return null;
    }
}

/**
 * API utama optimize.
 * @param {string} svgText
 * @param {object} options
 */
export async function optimizeSvg(svgText, options = {}) {
    const svgoRes = await trySvgo(svgText, options.svgo || {});
    if (svgoRes) return svgoRes;

    return fallbackOptimize(svgText, options.fallback || {});
}
