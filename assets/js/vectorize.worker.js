/* eslint-disable no-restricted-globals */
/**
 * Vectorize Worker (ES Module)
 * Orkestrasi: optimize → parse → normalize → map (VectorDrawable)
 */

import { optimizeSvg } from "../modules/optimize.js";
import { parseSvg } from "../modules/parse-svg.js";
import { normalizeSvgDom } from "../modules/normalize-transform.js";
import { mapToVectorDrawable } from "../modules/map-to-vectordrawable.js";

/* -------- messaging helpers -------- */
function reply(id, type, payload = {}) {
    self.postMessage({ id, type, ...payload });
}

self.addEventListener("message", async (evt) => {
    const { id, action = "vectorize", svgText, options = {} } = evt.data || {};
    if (!id) return;

    try {
        if (action === "ping") {
            reply(id, "success", { message: "pong" });
            return;
        }
        if (action !== "vectorize") {
            reply(id, "error", { error: `Unknown action: ${action}` });
            return;
        }
        if (typeof svgText !== "string" || svgText.trim().length === 0) {
            reply(id, "error", { error: "svgText is empty." });
            return;
        }

        const decimals = Math.max(0, Math.min(8, options.decimals ?? 2));
        const convertShapes = !!options.convertShapes;
        const defaultSizeDp = Math.max(8, Math.min(512, options.defaultSizeDp ?? 24));

        // 1) Optimize
        reply(id, "progress", { step: "optimize:start" });
        const optResult = await optimizeSvg(svgText, options.optimize || {});
        reply(id, "progress", { step: "optimize:done", stats: optResult.stats });

        // 2) Parse
        reply(id, "progress", { step: "parse:start" });
        const parsed = parseSvg(optResult.svg, options.parse || {});
        reply(id, "progress", {
            step: "parse:done",
            meta: { width: parsed.width, height: parsed.height, viewBox: parsed.viewBox },
            warnings: parsed.warnings,
        });

        // 3) Normalize transforms
        reply(id, "progress", { step: "normalize:start" });
        const norm = normalizeSvgDom(parsed.doc, options.normalize || {});
        const serializer = new XMLSerializer();
        const normalizedSvg = serializer.serializeToString(norm.doc);

        // 4) Map → VectorDrawable
        reply(id, "progress", { step: "map:start" });
        const mapped = mapToVectorDrawable(norm.doc, {
            decimals,
            convertShapes,
            defaultViewport: { width: 24, height: 24 },
            defaultSizeDp,
        });

        const warnings = [
            ...(optResult.warnings || []),
            ...(parsed.warnings || []),
            ...(norm.warnings || []),
            ...(mapped.warnings || []),
        ];

        const stats = {
            optimize: optResult.stats,
            normalize: norm.stats,
            mapping: { pathCount: mapped.stats.pathCount, skipped: mapped.stats.skipped },
            outXmlBytes: new Blob([mapped.xml]).size,
        };

        const viewport = mapped.stats.viewport || { width: 24, height: 24 };

        reply(id, "success", {
            optimizedSvg: optResult.svg,
            normalizedSvg,
            vectorXml: mapped.xml,
            viewport,
            stats,
            warnings,
        });
    } catch (err) {
        reply(id, "error", {
            error: err && err.message ? err.message : String(err),
            stack: err && err.stack ? String(err.stack) : undefined,
        });
    }
});
