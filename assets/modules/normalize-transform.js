// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\normalize-transform.js
/**
 * Normalisasi transform:
 * - Flatten transform dari parent → child
 * - Terapkan transform ke path 'd' menggunakan svgpath (global `SVGPath` atau `svgpath`)
 * - Konversi ke absolut & unshort
 * - Hapus atribut transform yang sudah diaplikasikan
 *
 * Catatan:
 * - Untuk bentuk selain <path> (rect, circle, ellipse, line, poly*, text), modul ini
 *   tidak mengkonversi ke path. Ia hanya meneruskan transform ke anak atau beri peringatan ringan.
 * - Harapkan library `svgpath` tersedia global sebagai `SVGPath` atau `svgpath`.
 */

// ---------- Matriks & Transform parsing ----------

/** @typedef {[number, number, number, number, number, number]} Matrix */

/** Matriks identitas. */
const I = [1, 0, 0, 1, 0, 0];

/**
 * Multiply 2 matriks 2D SVG [a b c d e f].
 * @param {Matrix} m1
 * @param {Matrix} m2
 * @returns {Matrix}
 */
function mul(m1, m2) {
    const [a1, b1, c1, d1, e1, f1] = m1;
    const [a2, b2, c2, d2, e2, f2] = m2;
    return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    ];
}

/** Derajat→radian */
const deg = (x) => (x * Math.PI) / 180;

/**
 * Parse string transform SVG menjadi Matrix.
 * Mendukung: matrix, translate, scale, rotate(θ[,cx,cy]), skewX, skewY
 * @param {string} t
 * @returns {Matrix}
 */
function parseTransform(t) {
    if (!t || typeof t !== "string") return I;

    // Pisah fungsi transform: e.g. "translate(10,20) scale(2)"
    const calls = t.match(/[a-zA-Z]+\s*\(([^)]+)\)/g);
    if (!calls) return I;

    let M = I;
    for (const call of calls) {
        const name = call.split("(")[0].trim();
        const args = call
            .slice(call.indexOf("(") + 1, call.lastIndexOf(")"))
            .replace(/,/g, " ")
            .trim()
            .split(/\s+/)
            .map(parseFloat);

        let m = I;
        switch (name) {
            case "matrix": {
                if (args.length === 6) m = [args[0], args[1], args[2], args[3], args[4], args[5]];
                break;
            }
            case "translate": {
                const [tx = 0, ty = 0] = args;
                m = [1, 0, 0, 1, tx, ty];
                break;
            }
            case "scale": {
                const [sx = 1, sy = sx] = args;
                m = [sx, 0, 0, sy, 0, 0];
                break;
            }
            case "rotate": {
                const [angle = 0, cx = 0, cy = 0] = args;
                const r = deg(angle);
                const cos = Math.cos(r);
                const sin = Math.sin(r);
                if (args.length > 1) {
                    m = mul(mul([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]), [1, 0, 0, 1, -cx, -cy]);
                } else {
                    m = [cos, sin, -sin, cos, 0, 0];
                }
                break;
            }
            case "skewX": {
                const [ax = 0] = args;
                m = [1, 0, Math.tan(deg(ax)), 1, 0, 0];
                break;
            }
            case "skewY": {
                const [ay = 0] = args;
                m = [1, Math.tan(deg(ay)), 0, 1, 0, 0];
                break;
            }
            default:
                m = I;
        }

        M = mul(M, m);
    }
    return M;
}

/** Serialize matrix ke string "matrix(a,b,c,d,e,f)" */
function matrixToString(m) {
    const [a, b, c, d, e, f] = m.map((n) => +n.toFixed(6));
    return `matrix(${a},${b},${c},${d},${e},${f})`;
}

// ---------- Aplikasi ke path ----------

/**
 * Terapkan transform matrix ke atribut 'd' path menggunakan svgpath.
 * Dibutuhkan global SVGPath (atau svgpath).
 * @param {string} d
 * @param {Matrix} M
 * @returns {{ d: string, warned: boolean, warning?: string }}
 */
function transformPathD(d, M) {
    if (!d || typeof d !== "string") {
        return { d, warned: true, warning: 'Empty path "d".' };
    }
    const g = typeof self !== "undefined" ? self : window;
    const SvgPathCtor = g && (g.SVGPath || g.svgpath);
    if (typeof SvgPathCtor !== "function") {
        return {
            d,
            warned: true,
            warning:
                "svgpath library not found; transform not applied. Include assets/plugin/svgpath/lib/svgpath.min.js before normalization.",
        };
    }
    try {
        const transformed = new SvgPathCtor(d).transform(matrixToString(M)).abs().unshort().toString();
        return { d: transformed, warned: false };
    } catch (e) {
        return { d, warned: true, warning: `Failed to apply transform to path: ${e.message || e}` };
    }
}

// ---------- Traversal & Normalization ----------

/**
 * Flatten transform secara DFS.
 * @param {Element} el
 * @param {Matrix} parentM
 * @param {string[]} warnings
 * @param {{convertShapes?: boolean}} options
 * @returns {void}
 */
function dfs(el, parentM, warnings, options) {
    if (el.nodeType !== 1) return; // ELEMENT_NODE
    const tag = el.tagName.toLowerCase();

    // Hitung transform saat ini
    const ownT = el.getAttribute("transform") || "";
    const M = mul(parentM, parseTransform(ownT));

    // Jika PATH → terapkan transform
    if (tag === "path" && el.hasAttribute("d")) {
        const d0 = el.getAttribute("d") || "";
        const { d, warned, warning } = transformPathD(d0, M);
        if (warned && warning) warnings.push(warning);
        el.setAttribute("d", d);
        // transform sudah diaplikasikan → hapus atribut
        if (el.hasAttribute("transform")) el.removeAttribute("transform");
        return;
    }

    // Bentuk lain: lewati ke anak
    if (
        tag === "g" ||
        tag === "svg" ||
        tag === "defs" ||
        tag === "clipPath" ||
        tag === "mask" ||
        tag === "symbol" ||
        tag === "a"
    ) {
        const children = Array.from(el.children);
        children.forEach((c) => dfs(c, M, warnings, options));
        if (el.hasAttribute("transform")) el.removeAttribute("transform");
        return;
    }

    if (
        tag === "rect" ||
        tag === "circle" ||
        tag === "ellipse" ||
        tag === "line" ||
        tag === "polyline" ||
        tag === "polygon" ||
        tag === "text" ||
        tag === "tspan"
    ) {
        if (ownT) {
            warnings.push(
                `<${tag}> retains transform attribute; consider converting to <path> before mapping to VectorDrawable.`
            );
        }
        const children = Array.from(el.children);
        children.forEach((c) => dfs(c, M, warnings, options));
        return;
    }

    const children = Array.from(el.children);
    children.forEach((c) => dfs(c, M, warnings, options));
}

/**
 * API utama normalisasi transform pada DOM SVG.
 * @param {Document} doc
 * @param {{ convertShapes?: boolean }} options
 * @returns {{ doc: Document, warnings: string[], stats: { flattenedPaths: number } }}
 */
export function normalizeSvgDom(doc, options = {}) {
    const warnings = [];
    let flattenedPaths = 0;

    const svg = doc.documentElement;
    if (!svg || svg.tagName.toLowerCase() !== "svg") {
        throw new Error("normalizeSvgDom: Root element is not <svg>.");
    }

    const before = doc.getElementsByTagName("path").length;

    dfs(svg, I, warnings, options);

    const after = doc.getElementsByTagName("path").length;
    flattenedPaths = Math.max(after, before);

    return { doc, warnings, stats: { flattenedPaths } };
}
