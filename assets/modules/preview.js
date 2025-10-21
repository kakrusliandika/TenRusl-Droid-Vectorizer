/**
 * Preview module (DOMParser-less)
 * - Render pratinjau dari SVG normalisasi pada skala densitas Android
 * - Tema terang/gelap + grid
 * - Info ukuran viewport → pixel
 * Catatan: Tidak pakai DOMParser; parsing via innerHTML + clone/import node.
 */

export const DENSITIES = Object.freeze({
    mdpi: 1,
    hdpi: 1.5,
    xhdpi: 2,
    xxhdpi: 3,
    xxxhdpi: 4,
});

/** Elemen helper */
function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "style" && v && typeof v === "object") Object.assign(node.style, v);
        else if (v != null) node.setAttribute(k, String(v));
    }
    children.forEach((c) => node.append(c instanceof Node ? c : document.createTextNode(String(c))));
    return node;
}

/** Parse SVG string → SVGSVGElement tanpa DOMParser. */
function parseSvgString(svgText) {
    const host = document.createElement("div");
    host.innerHTML = String(svgText || "").trim();
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("Invalid SVG: <svg> not found");
    svg.querySelectorAll("script").forEach((n) => n.remove());
    const cloned = svg.cloneNode(true);
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return cloned;
}

/** Hitung ukuran piksel dari viewport × density × dp target */
function computePixelSize(viewport, density, targetDp) {
    const vw = viewport?.width ?? 24;
    const vh = viewport?.height ?? 24;
    const base = targetDp ?? 24;
    const sx = (base / vw) * density;
    const sy = (base / vh) * density;
    return {
        pxWidth: Math.max(1, Math.round(vw * sx)),
        pxHeight: Math.max(1, Math.round(vh * sy)),
    };
}

/**
 * Inisialisasi preview di dalam container.
 * API:
 *  - setSvg(svgText, {viewport})
 *  - setDensity(d)
 *  - setTheme(t)
 *  - setGrid(show)
 *  - getState()
 *  - destroy()
 */
export function createPreview(container, options = {}) {
    // ---- state ----
    let densityKey = options.density || "mdpi";
    let theme = options.theme || "light";
    let showGrid = !!options.showGrid;
    let viewport = options.viewport || { width: 24, height: 24 };
    let defaultDp = options.defaultDp || 24;

    // ---- UI ----
    container.innerHTML = "";
    container.classList.add("trdv-preview-root");

    const toolbar = el("div", { class: "trdv-preview-toolbar" });

    const densitySel = el(
        "select",
        { "aria-label": "Density" },
        Object.keys(DENSITIES).map((d) => el("option", { value: d }, [d]))
    );
    densitySel.value = densityKey;

    const themeSel = el("select", { "aria-label": "Theme" }, [
        el("option", { value: "light" }, ["light"]),
        el("option", { value: "dark" }, ["dark"]),
    ]);
    themeSel.value = theme;

    const gridChk = el("input", { type: "checkbox", "aria-label": "Grid" });
    gridChk.checked = showGrid;

    const sizeInfo = el("span", { class: "trdv-preview-sizeinfo" }, ["—"]);

    const densityText = el("span", { class: "label", "data-i18n": "preview.controls.density" }, ["Density"]);
    const themeText = el("span", { class: "label", "data-i18n": "preview.controls.theme" }, ["Theme"]);
    const gridText = el("span", { class: "label", "data-i18n": "preview.controls.grid" }, ["Grid"]);

    toolbar.append(
        el("label", { class: "trdv-field" }, [densityText, " ", densitySel]),
        el("label", { class: "trdv-field" }, [themeText, " ", themeSel]),
        el("label", { class: "trdv-field" }, [gridChk, " ", gridText]),
        sizeInfo
    );

    const stageWrap = el("div", { class: "trdv-stage-wrap" });
    const stage = el("div", { class: `trdv-stage theme-${theme}` });
    if (showGrid) stage.classList.add("with-grid");
    stage.style.color = theme === "dark" ? "#fff" : "#111";

    const canvas = el("div", { class: "trdv-canvas" });
    stage.append(canvas);
    stageWrap.append(stage);

    const style = el("style", {}, [
        `
.trdv-preview-root{display:flex;flex-direction:column;gap:.5rem}
.trdv-preview-toolbar{display:flex;align-items:center;gap:1rem;font:14px system-ui}
.trdv-field{display:inline-flex;align-items:center;gap:.5rem}
.trdv-stage-wrap{overflow:auto;border:1px solid var(--border,#e0e0e0);border-radius:8px;background:var(--surface,#f8f9fa)}
.trdv-stage{display:inline-block;margin:12px;border-radius:12px;padding:12px;box-shadow:0 1px 2px rgba(0,0,0,.06) inset}
.trdv-stage.theme-light{background:#fff;color:#111}
.trdv-stage.theme-dark{background:#111;color:#fff}
.trdv-stage.with-grid{background-image:linear-gradient(#0001 1px, transparent 1px),linear-gradient(90deg,#0001 1px,transparent 1px);background-size:8px 8px}
.trdv-canvas{display:inline-block;line-height:0;min-width:1px;min-height:1px}
.trdv-canvas svg{display:block;max-width:none;max-height:none;color:inherit}
.trdv-preview-sizeinfo{margin-left:auto;opacity:.7}
`,
    ]);

    container.append(style, toolbar, stageWrap);

    /** @type {SVGSVGElement|null} */
    let svgEl = null;

    function rerender() {
        if (!svgEl) return;
        stage.classList.toggle("theme-dark", theme === "dark");
        stage.classList.toggle("theme-light", theme === "light");
        stage.classList.toggle("with-grid", showGrid);
        stage.style.color = theme === "dark" ? "#fff" : "#111";

        const density = DENSITIES[densityKey] || 1;
        const { pxWidth, pxHeight } = computePixelSize(viewport, density, defaultDp);

        svgEl.setAttribute("width", String(pxWidth));
        svgEl.setAttribute("height", String(pxHeight));

        if (!svgEl.getAttribute("viewBox") && viewport?.width && viewport?.height) {
            svgEl.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
            if (!svgEl.getAttribute("preserveAspectRatio")) {
                svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
            }
        }

        sizeInfo.textContent = `${densityKey} • viewport ${viewport.width}×${viewport.height} → ${pxWidth}×${pxHeight}px`;
    }

    function setSvg(svgText, meta) {
        canvas.innerHTML = "";
        svgEl = null;

        try {
            const parsed = parseSvgString(svgText);
            canvas.append(parsed);
            svgEl = parsed;
            svgEl.style.color = "inherit";

            if (meta?.viewport && Number.isFinite(meta.viewport.width) && Number.isFinite(meta.viewport.height)) {
                viewport = { width: meta.viewport.width, height: meta.viewport.height };
            } else {
                const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/\s+|,/).map(Number);
                const vwAttr = parseFloat(svgEl.getAttribute("width") || "");
                const vhAttr = parseFloat(svgEl.getAttribute("height") || "");
                const vw = Number.isFinite(vb[2]) ? vb[2] : Number.isFinite(vwAttr) ? vwAttr : 24;
                const vh = Number.isFinite(vb[3]) ? vb[3] : Number.isFinite(vhAttr) ? vhAttr : 24;
                viewport = { width: vw || 24, height: vh || 24 };
            }

            rerender();
        } catch (e) {
            const msg = el(
                "div",
                { class: "trdv-error", style: { color: theme === "dark" ? "#f88" : "#b00", padding: "8px 0" } },
                ["Preview error: ", String(e && e.message ? e.message : e)]
            );
            canvas.append(msg);
        }
    }

    function applyI18n() {
        try {
            const t = window.TRI18N?.t;
            if (typeof t === "function") {
                densityText.textContent = t("preview.controls.density");
                themeText.textContent = t("preview.controls.theme");
                gridText.textContent = t("preview.controls.grid");
            }
        } catch {}
    }
    applyI18n();
    document.addEventListener("trhc:i18nUpdated", applyI18n);

    densitySel.addEventListener("change", () => {
        densityKey = densitySel.value;
        rerender();
    });
    themeSel.addEventListener("change", () => {
        theme = themeSel.value === "dark" ? "dark" : "light";
        rerender();
    });
    gridChk.addEventListener("change", () => {
        showGrid = !!gridChk.checked;
        rerender();
    });

    return {
        setSvg,
        setDensity(d) {
            if (DENSITIES[d]) {
                densityKey = d;
                densitySel.value = d;
                rerender();
            }
        },
        setTheme(t) {
            theme = t === "dark" ? "dark" : "light";
            themeSel.value = theme;
            rerender();
        },
        setGrid(show) {
            showGrid = !!show;
            gridChk.checked = showGrid;
            rerender();
        },
        getState() {
            const density = DENSITIES[densityKey] || 1;
            const { pxWidth, pxHeight } = computePixelSize(viewport, density, defaultDp);
            return { density: densityKey, theme, viewport: { ...viewport }, size: { pxWidth, pxHeight } };
        },
        destroy() {
            container.innerHTML = "";
            svgEl = null;
            document.removeEventListener("trhc:i18nUpdated", applyI18n);
        },
    };
}
