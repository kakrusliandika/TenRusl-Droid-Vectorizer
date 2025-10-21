// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\parse-svg.js
/**
 * Parser SVG berbasis DOMParser + sanitasi ringan.
 * Tujuan:
 *  - Menghasilkan Document & <svg> element
 *  - Menghapus elemen berisiko (script, foreignObject)
 *  - Kumpulkan metadata dasar (width, height, viewBox)
 *  - Kumpulkan peringatan sanitasi
 */

/**
 * Hapus elemen berisiko dari dokumen.
 * @param {Document} doc
 * @param {Array<string>} warnings
 */
function sanitize(doc, warnings) {
    const forbidden = ["script", "foreignObject"];
    forbidden.forEach((tag) => {
        const nodes = Array.from(doc.getElementsByTagName(tag));
        nodes.forEach((n) => {
            warnings.push(`Removed <${tag}> element for safety.`);
            n.parentNode && n.parentNode.removeChild(n);
        });
    });

    // Buang event handler inline (on*)
    const all = Array.from(doc.querySelectorAll("*"));
    all.forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
            if (/^on/i.test(attr.name)) {
                warnings.push(`Removed inline handler "${attr.name}" on <${el.tagName}>.`);
                el.removeAttribute(attr.name);
            }
        });
    });

    // Opsi: blokir <link> (style eksternal) — jarang ada di inline SVG
    const links = Array.from(doc.getElementsByTagName("link"));
    links.forEach((l) => {
        warnings.push("Removed <link> (external styles not allowed).");
        l.parentNode && l.parentNode.removeChild(l);
    });
}

/**
 * Ambil metadata dimensi & viewBox dari elemen <svg>.
 * @param {SVGSVGElement} svg
 */
function extractMeta(svg) {
    const width = svg.getAttribute("width") || null;
    const height = svg.getAttribute("height") || null;
    const viewBox = svg.getAttribute("viewBox") || null;
    return { width, height, viewBox };
}

/**
 * Parse string SVG menjadi Document + sanitasi.
 * @param {string} svgText
 * @param {{strictXml?: boolean}} [options]
 * @returns {{
 *   doc: Document,
 *   svg: SVGSVGElement,
 *   width: string|null,
 *   height: string|null,
 *   viewBox: string|null,
 *   warnings: string[],
 * }}
 */
export function parseSvg(svgText, options = {}) {
    const warnings = [];
    const { strictXml = false } = options;

    const parser = new DOMParser();
    const type = strictXml ? "application/xml" : "image/svg+xml";
    const doc = parser.parseFromString(svgText, type);

    // Deteksi error parser
    if (doc.getElementsByTagName("parsererror").length > 0) {
        const errText = doc.getElementsByTagName("parsererror")[0].textContent || "Invalid SVG XML.";
        throw new Error(`SVG parse error: ${errText}`);
    }

    const svg = doc.documentElement;
    if (!svg || svg.tagName.toLowerCase() !== "svg") {
        throw new Error("Root element is not <svg>.");
    }

    sanitize(doc, warnings);
    const { width, height, viewBox } = extractMeta(svg);

    // Pastikan xmlns yang lazim ada
    if (!svg.hasAttribute("xmlns")) {
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    return { doc, svg, width, height, viewBox, warnings };
}
