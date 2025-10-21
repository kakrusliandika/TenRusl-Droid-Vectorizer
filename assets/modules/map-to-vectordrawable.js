// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\map-to-vectordrawable.js
/**
 * Map SVG (DOM) → VectorDrawable XML (string).
 * Fokus v1:
 *  - Path utama (<path d=...>) → <path android:pathData="...">
 *  - Atribut dasar: fill, stroke, strokeWidth, fill-rule, linecap, linejoin, miterlimit
 *  - Alpha dari fill/stroke → fillAlpha/strokeAlpha
 *  - Viewport: dari viewBox (jika ada) atau dari width/height numerik; fallback 24x24
 *  - Bentuk dasar (rect/circle/ellipse/line/polyline/polygon) → opsi convertShapes (default: false)
 *
 * Batasan:
 *  - Gradients, patterns, filter, mask, clipPath kompleks → warning & di-skip
 *  - Grup & transform diasumsikan sudah diflatten oleh normalize-transform
 */

import { applyPrecisionToPathData, roundTo } from "./precision.js";
import { pushWarning, Severity, summarizeWarnings } from "./warnings.js";

/** Escape XML attribute value. */
function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Parse panjang yang mungkin ber-unit → number (tanpa unit). */
function parseLength(x) {
    if (x == null) return null;
    const m = String(x)
        .trim()
        .match(/^(-?\d+(\.\d+)?)([a-z%]*)$/i);
    if (!m) return null;
    return parseFloat(m[1]);
}

/** Parse viewBox "minX minY width height" → {minX,minY,width,height} */
function parseViewBox(vb) {
    if (!vb) return null;
    const parts = String(vb).trim().split(/\s+|,/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
    return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

/** Convert rgba/hex → { r,g,b,a } with a in [0,1]. Supports #rgb, #rgba, #rrggbb, #rrggbbaa and rgb()/rgba(). */
function parseColor(c) {
    if (!c || typeof c !== "string") return null;
    const s = c.trim();

    // none / transparent keywords
    if (s === "none") return { r: 0, g: 0, b: 0, a: 0 };
    if (s.toLowerCase() === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

    // hex
    if (s[0] === "#") {
        const hex = s.slice(1);
        const is3 = hex.length === 3;
        const is4 = hex.length === 4;
        const is6 = hex.length === 6;
        const is8 = hex.length === 8;
        if (!(is3 || is4 || is6 || is8)) return null;

        const expand = (ch) => parseInt(ch + ch, 16);
        const read2 = (i) => parseInt(hex.slice(i, i + 2), 16);

        let r,
            g,
            b,
            a = 255;
        if (is3 || is4) {
            r = expand(hex[0]);
            g = expand(hex[1]);
            b = expand(hex[2]);
            if (is4) a = expand(hex[3]);
        } else {
            r = read2(0);
            g = read2(2);
            b = read2(4);
            if (is8) a = read2(6);
        }
        return { r, g, b, a: a / 255 };
    }

    // rgb/rgba
    const rgb = s.match(/^rgba?\s*\(\s*([^)]+)\)$/i);
    if (rgb) {
        const parts = rgb[1]
            .split(",")
            .map((p) => p.trim())
            .map((p) => (p.endsWith("%") ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
        if (parts.length < 3) return null;
        const r = Math.max(0, Math.min(255, parts[0]));
        const g = Math.max(0, Math.min(255, parts[1]));
        const b = Math.max(0, Math.min(255, parts[2]));
        let a = 1;
        if (parts.length >= 4) a = Math.max(0, Math.min(1, parseFloat(parts[3])));
        return { r, g, b, a };
    }

    // basic named colors (minimal)
    const named = {
        black: { r: 0, g: 0, b: 0, a: 1 },
        white: { r: 255, g: 255, b: 255, a: 1 },
        red: { r: 255, g: 0, b: 0, a: 1 },
        green: { r: 0, g: 128, b: 0, a: 1 },
        blue: { r: 0, g: 0, b: 255, a: 1 },
        gray: { r: 128, g: 128, b: 128, a: 1 },
    };
    const low = s.toLowerCase();
    if (named[low]) return named[low];

    return null;
}

/** Convert {r,g,b,a} → { hex: #RRGGBB, alpha: 0..1 } */
function toVectorColor(rgba) {
    if (!rgba) return null;
    const to2 = (n) => n.toString(16).padStart(2, "0");
    const hex = `#${to2(Math.round(rgba.r))}${to2(Math.round(rgba.g))}${to2(Math.round(rgba.b))}`;
    const alpha = Math.max(0, Math.min(1, rgba.a));
    return { hex, alpha };
}

/** Read style attribute + presentation attributes into a simple map. */
function computeStyle(el) {
    const style = {};
    // presentation attributes
    const attrList = [
        "fill",
        "fill-opacity",
        "fill-rule",
        "stroke",
        "stroke-opacity",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-miterlimit",
        "opacity",
    ];
    for (const a of attrList) {
        if (el.hasAttribute(a)) style[a] = el.getAttribute(a);
    }
    // inline style
    const styleAttr = el.getAttribute("style");
    if (styleAttr) {
        styleAttr.split(";").forEach((d) => {
            const [k, v] = d.split(":");
            if (!k || !v) return;
            style[k.trim()] = v.trim();
        });
    }
    return style;
}

/** Convert non-path shapes to path 'd' (subset). */
function shapeToPath(el, warnings, options) {
    const t = el.tagName.toLowerCase();

    // polygon / polyline
    if (t === "polygon" || t === "polyline") {
        const pts = (el.getAttribute("points") || "").trim();
        if (!pts) return null;
        // normalize separators
        const nums = pts
            .replace(/,/g, " ")
            .split(/\s+/)
            .map((n) => parseFloat(n))
            .filter((n) => !Number.isNaN(n));
        if (nums.length < 4) return null;
        const pairs = [];
        for (let i = 0; i < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
        let d = `M ${pairs[0][0]} ${pairs[0][1]}`;
        for (let i = 1; i < pairs.length; i++) d += ` L ${pairs[i][0]} ${pairs[i][1]}`;
        if (t === "polygon") d += " Z";
        return d;
    }

    // line
    if (t === "line") {
        const x1 = parseLength(el.getAttribute("x1")) || 0;
        const y1 = parseLength(el.getAttribute("y1")) || 0;
        const x2 = parseLength(el.getAttribute("x2")) || 0;
        const y2 = parseLength(el.getAttribute("y2")) || 0;
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    // rect (tanpa rx/ry demi kesederhanaan v1)
    if (t === "rect") {
        const x = parseLength(el.getAttribute("x")) || 0;
        const y = parseLength(el.getAttribute("y")) || 0;
        const w = parseLength(el.getAttribute("width"));
        const h = parseLength(el.getAttribute("height"));
        const rx = parseLength(el.getAttribute("rx"));
        const ry = parseLength(el.getAttribute("ry"));
        if (!w || !h) return null;
        if ((rx && rx > 0) || (ry && ry > 0)) {
            pushWarning(
                warnings,
                "W_RECT_ROUNDED_IGNORED",
                "Rounded rect rx/ry ignored; exporting sharp corners.",
                Severity.Warn,
                { rx, ry }
            );
        }
        return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    }

    // circle
    if (t === "circle") {
        const cx = parseLength(el.getAttribute("cx")) || 0;
        const cy = parseLength(el.getAttribute("cy")) || 0;
        const r = parseLength(el.getAttribute("r"));
        if (!r || r <= 0) return null;
        // Two arcs
        return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;
    }

    // ellipse
    if (t === "ellipse") {
        const cx = parseLength(el.getAttribute("cx")) || 0;
        const cy = parseLength(el.getAttribute("cy")) || 0;
        const rx = parseLength(el.getAttribute("rx"));
        const ry = parseLength(el.getAttribute("ry"));
        if (!rx || !ry || rx <= 0 || ry <= 0) return null;
        return `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} Z`;
    }

    return null;
}

/** Map satu elemen <path> SVG → <path> VectorDrawable (atribut). */
function mapPathElement(el, options, warnings) {
    const style = computeStyle(el);
    let d = el.getAttribute("d") || "";
    if (!d) {
        pushWarning(warnings, "W_PATH_EMPTY", '<path> has empty "d". Skipped.', Severity.Warn);
        return null;
    }

    const decimals = Math.max(0, Math.min(8, options.decimals ?? 2));
    d = applyPrecisionToPathData(d, decimals);

    // fill
    const fill = style.fill ?? el.getAttribute("fill") ?? "#000";
    const fillParsed = parseColor(fill);
    let fillColor, fillAlpha;
    if (fillParsed) {
        const { hex, alpha } = toVectorColor(fillParsed);
        fillColor = hex;
        // overall opacity affects both fill & stroke
        const globalOpacity = style.opacity != null ? Math.max(0, Math.min(1, parseFloat(style.opacity))) : 1;
        const local = style["fill-opacity"] != null ? Math.max(0, Math.min(1, parseFloat(style["fill-opacity"]))) : 1;
        fillAlpha = Math.max(0, Math.min(1, alpha * local * globalOpacity));
    } else {
        if ((fill || "").toLowerCase() !== "none") {
            pushWarning(
                warnings,
                "W_COLOR_UNPARSEABLE",
                `Unparseable fill color: "${fill}". Using black.`,
                Severity.Warn,
                { fill }
            );
        }
        fillColor = "#000000";
        fillAlpha = (fill || "").toLowerCase() === "none" ? 0 : 1;
    }

    // stroke
    const stroke = style.stroke ?? el.getAttribute("stroke");
    let strokeColor, strokeAlpha, strokeWidth;
    if (stroke && stroke !== "none") {
        const stParsed = parseColor(stroke);
        if (stParsed) {
            const { hex, alpha } = toVectorColor(stParsed);
            strokeColor = hex;
            const globalOpacity = style.opacity != null ? Math.max(0, Math.min(1, parseFloat(style.opacity))) : 1;
            const local =
                style["stroke-opacity"] != null ? Math.max(0, Math.min(1, parseFloat(style["stroke-opacity"]))) : 1;
            strokeAlpha = Math.max(0, Math.min(1, alpha * local * globalOpacity));
        } else {
            pushWarning(
                warnings,
                "W_COLOR_UNPARSEABLE",
                `Unparseable stroke color: "${stroke}". Dropping stroke.`,
                Severity.Warn,
                { stroke }
            );
        }
        const sw = style["stroke-width"] ?? el.getAttribute("stroke-width");
        if (sw != null) {
            const v = parseFloat(sw);
            if (!Number.isNaN(v)) strokeWidth = Math.max(0, v);
        }
    }

    // fill-rule
    let fillType;
    const fr = (style["fill-rule"] ?? el.getAttribute("fill-rule") ?? "").toLowerCase();
    if (fr === "evenodd") fillType = "evenOdd";
    // else default nonZero (omit attribute)

    // stroke caps/joins
    const linecap = (style["stroke-linecap"] ?? el.getAttribute("stroke-linecap") ?? "").toLowerCase();
    const linejoin = (style["stroke-linejoin"] ?? el.getAttribute("stroke-linejoin") ?? "").toLowerCase();
    const miterLimit = parseFloat(style["stroke-miterlimit"] ?? el.getAttribute("stroke-miterlimit") ?? "0");

    // Build attribute map
    /** @type {Record<string,string|number>} */
    const attrs = {
        "android:pathData": d,
    };
    if (fillColor) attrs["android:fillColor"] = fillColor;
    if (fillAlpha != null && fillAlpha < 1) attrs["android:fillAlpha"] = roundTo(fillAlpha, 3);
    if (strokeColor) attrs["android:strokeColor"] = strokeColor;
    if (strokeAlpha != null && strokeAlpha < 1) attrs["android:strokeAlpha"] = roundTo(strokeAlpha, 3);
    if (strokeWidth != null && strokeWidth > 0) attrs["android:strokeWidth"] = roundTo(strokeWidth, 3);
    if (fillType) attrs["android:fillType"] = fillType;

    if (linecap === "round" || linecap === "butt" || linecap === "square") {
        attrs["android:strokeLineCap"] = linecap;
    } else if (linecap) {
        pushWarning(
            warnings,
            "W_STROKE_LINECAP_UNSUPPORTED",
            `Unsupported stroke-linecap: "${linecap}".`,
            Severity.Info
        );
    }

    if (linejoin === "miter" || linejoin === "round" || linejoin === "bevel") {
        attrs["android:strokeLineJoin"] = linejoin;
    } else if (linejoin) {
        pushWarning(
            warnings,
            "W_STROKE_LINEJOIN_UNSUPPORTED",
            `Unsupported stroke-linejoin: "${linejoin}".`,
            Severity.Info
        );
    }

    if (!Number.isNaN(miterLimit) && miterLimit > 0) {
        attrs["android:strokeMiterLimit"] = roundTo(miterLimit, 3);
    }

    return attrs;
}

/** Serialize <vector> with child <path> elements. */
function serializeVectorDrawable(vAttrs, pathAttrsList) {
    const header =
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"';

    const vec = Object.entries(vAttrs)
        .map(([k, v]) => ` ${k}="${esc(v)}"`)
        .join("");

    const paths = pathAttrsList
        .map((attrs) => {
            const s = Object.entries(attrs)
                .map(([k, v]) => ` ${k}="${esc(v)}"`)
                .join("");
            return `  <path${s} />`;
        })
        .join("\n");

    return `${header}${vec}>\n${paths}\n</vector>`;
}

/** Discover unsupported constructs & push warnings. */
function scanUnsupported(doc, warnings) {
    const unsupported = ["linearGradient", "radialGradient", "pattern", "filter", "mask", "foreignObject"];
    unsupported.forEach((tag) => {
        const list = doc.getElementsByTagName(tag);
        if (list && list.length > 0) {
            pushWarning(
                warnings,
                `W_UNSUPPORTED_${tag.toUpperCase()}`,
                `Unsupported SVG feature <${tag}> detected; skipped.`,
                Severity.Warn,
                { count: list.length }
            );
        }
    });
    // clipPath limited; beri info
    const clips = doc.getElementsByTagName("clipPath");
    if (clips && clips.length > 0) {
        pushWarning(
            warnings,
            "W_CLIPPATH_LIMITED",
            "clipPath has limited support in VectorDrawable; shapes may not clip as expected.",
            Severity.Info,
            { count: clips.length }
        );
    }
}

/**
 * Map SVG Document → VectorDrawable XML.
 * @param {Document} doc SVG DOM (sudah dinormalisasi transform jika memungkinkan)
 * @param {{
 *   decimals?: number,
 *   convertShapes?: boolean,
 *   defaultViewport?: { width:number, height:number },
 *   defaultSizeDp?: number
 * }} options
 * @returns {{
 *   xml: string,
 *   warnings: Array<{code:string,message:string,severity:string,meta?:any}>,
 *   stats: { pathCount:number, skipped:number, viewport:{width:number,height:number} },
 * }}
 */
export function mapToVectorDrawable(doc, options = {}) {
    const warnings = [];
    scanUnsupported(doc, warnings);

    const svg = doc.documentElement;
    const vb = parseViewBox(svg.getAttribute("viewBox"));
    const wAttr = parseLength(svg.getAttribute("width"));
    const hAttr = parseLength(svg.getAttribute("height"));

    let viewportWidth, viewportHeight;
    if (vb) {
        viewportWidth = vb.width;
        viewportHeight = vb.height;
    } else if (wAttr && hAttr) {
        viewportWidth = wAttr;
        viewportHeight = hAttr;
        pushWarning(warnings, "W_NO_VIEWBOX", "No viewBox on <svg>; using width/height as viewport.", Severity.Info, {
            width: wAttr,
            height: hAttr,
        });
    } else {
        const def = options.defaultViewport || { width: 24, height: 24 };
        viewportWidth = def.width;
        viewportHeight = def.height;
        pushWarning(
            warnings,
            "W_VIEWPORT_FALLBACK",
            "Missing viewBox/size; using fallback viewport 24x24.",
            Severity.Warn,
            def
        );
    }

    const defaultDp = options.defaultSizeDp || 24;
    const vectorAttrs = {
        "android:viewportWidth": String(roundTo(viewportWidth, 3)),
        "android:viewportHeight": String(roundTo(viewportHeight, 3)),
        // ukuran fisik (dp) — aman pakai default persegi
        "android:width": `${defaultDp}dp`,
        "android:height": `${defaultDp}dp`,
    };

    const pathAttrsList = [];
    let skipped = 0;

    // Kumpulkan elemen yang bisa dipetakan
    const all = svg.getElementsByTagName("*");
    for (const el of all) {
        const tag = el.tagName.toLowerCase();

        if (
            tag === "defs" ||
            tag === "clipPath" ||
            tag === "mask" ||
            tag === "linearGradient" ||
            tag === "radialGradient"
        ) {
            continue;
        }

        if (tag === "path") {
            const attrs = mapPathElement(el, options, warnings);
            if (attrs) pathAttrsList.push(attrs);
            else skipped++;
            continue;
        }

        // Bentuk non-path
        if (
            tag === "rect" ||
            tag === "circle" ||
            tag === "ellipse" ||
            tag === "line" ||
            tag === "polyline" ||
            tag === "polygon"
        ) {
            if (!options.convertShapes) {
                pushWarning(
                    warnings,
                    "W_SHAPE_SKIPPED",
                    `<${tag}> not converted (convertShapes=false).`,
                    Severity.Info
                );
                skipped++;
                continue;
            }
            const d = shapeToPath(el, warnings, options);
            if (!d) {
                skipped++;
                continue;
            }
            // Buat elemen virtual path untuk reuse mapPathElement
            const fake = doc.createElement("path");
            fake.setAttribute("d", d);
            // copy style/presentation attributes yang relevan
            [
                "fill",
                "fill-opacity",
                "stroke",
                "stroke-opacity",
                "stroke-width",
                "stroke-linecap",
                "stroke-linejoin",
                "stroke-miterlimit",
                "opacity",
                "fill-rule",
            ].forEach((a) => {
                if (el.hasAttribute(a)) fake.setAttribute(a, el.getAttribute(a));
            });
            const attrs = mapPathElement(fake, options, warnings);
            if (attrs) pathAttrsList.push(attrs);
            else skipped++;
            continue;
        }

        // Group/others: abaikan (transform harusnya sudah diflatten)
        if (tag === "g" || tag === "svg" || tag === "a" || tag === "symbol" || tag === "use") {
            continue;
        }
    }

    const xml = serializeVectorDrawable(vectorAttrs, pathAttrsList);
    return {
        xml,
        warnings,
        stats: {
            pathCount: pathAttrsList.length,
            skipped,
            viewport: { width: viewportWidth, height: viewportHeight },
            warningSummary: summarizeWarnings(warnings),
        },
    };
}
