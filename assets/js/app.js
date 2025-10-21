/* =========================================================
   TenRusl Droid Vectorizer — App Orchestrator
   Mode: no Web Worker + no DOMParser (safe fallback)
   Changes:
   - Preview button now opens XML modal
   - Added modal controller (open/copy/download/close + focus trap)
   - sanitizeName: only strip leading "ic_" (avoid "icon"→"on")
   ========================================================= */

import { createPreview, DENSITIES } from "../modules/preview.js";
import { exportAsZip } from "../modules/export-zip.js";
import {
    loadSettings,
    saveSettings,
    updateSettings,
    addHistoryEntry,
    snapshotConfig,
    defaultSettings,
} from "../modules/storage.js";

(function () {
    "use strict";

    /* ---------- Helpers ---------- */
    const $ = (s, c = document) => c.querySelector(s);
    const bytes = (u) => (typeof u === "string" ? new Blob([u]).size : u?.length ?? 0);
    const fmt = (n) => (n >= 1024 ? (n / 1024).toFixed(1) + " KB" : n + " B");

    // Only remove leading "ic_" (not plain "ic"), keep rest
    const sanitizeName = (name) =>
        String(name || "icon")
            .toLowerCase()
            .replace(/\.[^.]+$/, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/(^_+|_+$)/g, "")
            .replace(/^ic_+/i, "")
            .slice(0, 80);

    const i18n = {
        t(key, fb) {
            try {
                const v = window?.TRI18N?.t?.(key);
                if (v && v !== key) return v;
            } catch {}
            return fb ?? key;
        },
    };

    function setStatus(msg) {
        try {
            window.TRStatus?.set?.(msg);
        } catch {}
        try {
            console.debug("[status]", msg);
        } catch {}
    }

    // viewport helpers
    const parseLength = (x) => {
        if (x == null) return null;
        const m = String(x)
            .trim()
            .match(/^(-?\d+(\.\d+)?)([a-z%]*)$/i);
        return m ? parseFloat(m[1]) : null;
    };
    const parseViewBox = (vb) => {
        if (!vb) return null;
        const parts = String(vb).trim().split(/\s+|,/).map(Number);
        if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
        return { width: parts[2], height: parts[3] };
    };

    /* ---------- State ---------- */
    const ui = {
        get drop() {
            return $("#fileDrop");
        },
        get input() {
            return $("#fileInput");
        },

        preset: $("#presetSelect"),
        precSlider: $("#precisionSlider"),
        precVal: $("#precisionValue"),
        convertShapes: $("#convertShapesToggle"),
        defaultDp: $("#defaultDpInput"),
        density: $("#densitySelect"),
        grid: $("#gridToggle"),
        resetBtn: $("#resetBtn"),
        exportAllBtn: $("#exportAllBtn"),
        downloadLogBtn: $("#downloadLogBtn"),

        previewBox: $("#previewContainer"),
        warningsPanel: $("#warningsPanel"),
        resultsList: $("#resultsList"),
        currentInfo: $("#currentInfo"),
    };

    let settings = loadSettings();
    const results = [];
    let preview;
    let xmlModal; // controller

    function ensurePreview() {
        if (!preview) {
            preview = createPreview(ui.previewBox, {
                density: settings.density || "mdpi",
                theme: document.documentElement.classList.contains("light") ? "light" : "dark",
                showGrid: !!settings.grid,
                viewport: { width: 24, height: 24 },
                defaultDp: settings.defaultDp || 24,
            });
        }
        return preview;
    }

    /* ---------- XML Modal Controller ---------- */
    function createXmlModalController() {
        const root = $("#xmlModal");
        const overlay = root?.querySelector(".tenrusl-modal__overlay");
        const dialog = root?.querySelector(".tenrusl-modal__dialog");
        const title = $("#xmlModalTitle");
        const codeEl = $("#xmlModalCode");
        const btnClose = $("#xmlModalClose");
        const btnCopy = $("#xmlModalCopy");
        const btnDownload = $("#xmlModalDownload");

        let lastFocus = null;

        const getFocusable = () =>
            Array.from(
                dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
            ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));

        function open(name, xml) {
            if (!root) return;
            lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

            const titleText = i18n.t("modal.xmlTitle", "XML Preview") + " • " + (name || "icon.svg");
            title.textContent = titleText;

            // Use textContent to avoid HTML injection
            codeEl.textContent = xml || "<!-- Empty XML output -->";

            root.classList.add("is-open");
            root.setAttribute("aria-hidden", "false");
            document.body.classList.add("tenrusl-no-scroll");

            const f = getFocusable();
            (f[0] || btnClose || dialog).focus();
            setStatus(`Modal open: ${name}`);
        }

        function close() {
            if (!root) return;
            root.classList.remove("is-open");
            root.setAttribute("aria-hidden", "true");
            document.body.classList.remove("tenrusl-no-scroll");
            if (lastFocus?.focus) lastFocus.focus();
            setStatus("Modal closed");
        }

        // events
        overlay?.addEventListener("click", close);
        btnClose?.addEventListener("click", close);
        document.addEventListener("keydown", (e) => {
            if (!root.classList.contains("is-open")) return;
            if (e.key === "Escape") {
                e.preventDefault();
                close();
            }
            if (e.key === "Tab") {
                const f = getFocusable();
                if (!f.length) return;
                const i = f.indexOf(document.activeElement);
                if (e.shiftKey) {
                    if (i <= 0) {
                        f[f.length - 1].focus();
                        e.preventDefault();
                    }
                } else {
                    if (i === f.length - 1) {
                        f[0].focus();
                        e.preventDefault();
                    }
                }
            }
        });

        btnCopy?.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(codeEl.textContent || "");
                setStatus(i18n.t("modal.copied", "XML copied"));
            } catch {
                setStatus("Clipboard blocked");
            }
        });

        btnDownload?.addEventListener("click", () => {
            const rawTitle = title.textContent || "XML Preview • icon.svg";
            const name = rawTitle.split("•").pop()?.trim() || "icon.svg";
            const safe = sanitizeName(name);
            const blob = new Blob([codeEl.textContent || ""], { type: "text/xml;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `ic_${safe || "icon"}.xml`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
            setStatus("XML downloaded");
        });

        return { open, close };
    }

    /* ---------- Presets ---------- */
    async function loadPresets() {
        try {
            const res = await fetch("../json/presets.json", { cache: "no-cache", credentials: "same-origin" });
            if (res.ok) {
                const json = await res.json();
                return Array.isArray(json.presets) ? json.presets : [];
            }
        } catch {}
        return [
            {
                id: "max_quality",
                label: "Max Quality",
                settings: { decimals: 4, convertShapes: true, defaultDp: 24, density: "xhdpi", grid: false },
            },
            {
                id: "balanced",
                label: "Balanced",
                settings: { decimals: 2, convertShapes: false, defaultDp: 24, density: "hdpi", grid: false },
            },
            {
                id: "max_reduce",
                label: "Max Reduce",
                settings: { decimals: 1, convertShapes: true, defaultDp: 24, density: "mdpi", grid: true },
            },
        ];
    }

    async function initPresets() {
        const presets = await loadPresets();
        ui.preset.innerHTML = "";
        presets.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.label;
            ui.preset.appendChild(opt);
        });
        const matched = presets.find((p) => (p.settings?.decimals ?? -1) === (settings.decimals ?? 2));
        ui.preset.value = matched?.id || presets[1]?.id || presets[0]?.id || "";
        ui.preset.addEventListener("change", () => {
            const p = presets.find((x) => x.id === ui.preset.value);
            if (p?.settings) {
                settings = saveSettings({ ...settings, ...p.settings });
                applySettingsToUI();
                setStatus(`Preset: ${p.label}`);
            }
        });
    }

    /* ---------- Settings ↔ UI ---------- */
    function applySettingsToUI() {
        ui.precSlider.value = String(settings.decimals ?? 2);
        ui.precVal.textContent = String(settings.decimals ?? 2);
        ui.convertShapes.checked = !!settings.convertShapes;
        ui.defaultDp.value = String(settings.defaultDp ?? 24);
        ui.density.value = String(settings.density ?? "mdpi");
        ui.grid.checked = !!settings.grid;

        const pv = ensurePreview();
        pv.setDensity(ui.density.value);
        pv.setGrid(ui.grid.checked);
        pv.setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    }

    function bindSettings() {
        ui.precSlider.addEventListener("input", () => (ui.precVal.textContent = ui.precSlider.value));
        ui.precSlider.addEventListener("change", () => {
            settings = updateSettings({ decimals: parseInt(ui.precSlider.value, 10) || 0 });
        });
        ui.convertShapes.addEventListener("change", () => {
            settings = updateSettings({ convertShapes: !!ui.convertShapes.checked });
        });
        ui.defaultDp.addEventListener("change", () => {
            const v = Math.max(8, Math.min(512, parseInt(ui.defaultDp.value, 10) || 24));
            settings = updateSettings({ defaultDp: v });
        });
        ui.density.addEventListener("change", () => {
            const d = ui.density.value;
            if (DENSITIES[d]) {
                settings = updateSettings({ density: d });
                ensurePreview().setDensity(d);
            }
        });
        ui.grid.addEventListener("change", () => {
            settings = updateSettings({ grid: !!ui.grid.checked });
            ensurePreview().setGrid(ui.grid.checked);
        });
        ui.resetBtn.addEventListener("click", () => {
            settings = saveSettings(defaultSettings());
            applySettingsToUI();
            setStatus(i18n.t("common.reset", "Reset"));
        });
    }

    /* ---------- Pipeline (no Worker + no DOMParser) ---------- */

    // Parse SVG in main thread without DOMParser
    function parseSvgWithoutDOMParser(svgText) {
        const host = document.createElement("div");
        host.innerHTML = svgText.trim();
        const svgEl = host.querySelector("svg");
        if (!svgEl) throw new Error("Invalid SVG: <svg> not found");

        const SVG_NS = "http://www.w3.org/2000/svg";
        const doc = document.implementation.createDocument(SVG_NS, "svg", null);
        const imported = doc.importNode(svgEl, true);
        doc.replaceChild(imported, doc.documentElement);

        const width = svgEl.getAttribute("width") || null;
        const height = svgEl.getAttribute("height") || null;
        const viewBox = svgEl.getAttribute("viewBox") || null;

        return { doc, width, height, viewBox, warnings: [] };
    }

    async function vectorizeInMain(svgText, opts) {
        const { optimizeSvg } = await import("../modules/optimize.js");
        const { normalizeSvgDom } = await import("../modules/normalize-transform.js");
        const { mapToVectorDrawable } = await import("../modules/map-to-vectordrawable.js");

        const decimals = Math.max(0, Math.min(8, opts.decimals ?? 2));
        const convertShapes = !!opts.convertShapes;
        const defaultSizeDp = Math.max(8, Math.min(512, opts.defaultSizeDp ?? settings.defaultDp ?? 24));

        // 1) Optimize
        const optResult = await optimizeSvg(svgText, opts.optimize || {});

        // 2) Parse (fallback)
        const parsed = parseSvgWithoutDOMParser(optResult.svg);

        // 3) Normalize transforms
        const norm = normalizeSvgDom(parsed.doc, opts.normalize || {});
        const serializer = new XMLSerializer();
        const normalizedSvg = serializer.serializeToString(norm.doc);

        // 4) Map → VectorDrawable
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

        return {
            optimizedSvg: optResult.svg,
            normalizedSvg,
            vectorXml: mapped.xml,
            viewport,
            stats,
            warnings,
        };
    }

    function runVectorize(svgText, options) {
        return vectorizeInMain(svgText, options);
    }

    /* ---------- Import UI (resilient) ---------- */
    let boundDrop = null;
    let unbindFns = [];

    function detachImportHandlers() {
        unbindFns.forEach((fn) => {
            try {
                fn();
            } catch {}
        });
        unbindFns = [];
        if (boundDrop) {
            delete boundDrop.dataset.bound;
        }
        boundDrop = null;
    }

    function bindImportHandlers() {
        const drop = ui.drop;
        const input = ui.input;
        if (!drop || !input) return;

        if (drop.dataset.bound === "1") return;
        drop.dataset.bound = "1";
        boundDrop = drop;

        const openPicker = () => input.click();

        const onFiles = async (files) => {
            const list = Array.from(files || []);
            if (!list.length) return;

            ui.exportAllBtn.disabled = true;
            for (const f of list) {
                try {
                    const text = await f.text();
                    const ok = await processOne(f.name, text);
                    addHistoryEntry({ name: f.name, size: f.size });
                    if (!ok) setStatus(`Failed: ${f.name}`);
                } catch (err) {
                    console.error(err);
                    setStatus(`Failed: ${f.name}`);
                }
            }
            ui.exportAllBtn.disabled = results.length === 0;
            setStatus("Done");
        };

        const onClick = () => openPicker();
        const onKeyDown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
            }
        };
        const onDragOver = (e) => {
            e.preventDefault();
            drop.classList.add("drag");
        };
        const onDragLeave = () => {
            drop.classList.remove("drag");
        };
        const onDrop = (e) => {
            e.preventDefault();
            drop.classList.remove("drag");
            onFiles(e.dataTransfer?.files);
        };
        const onInputChange = (e) => onFiles(e.target.files);

        drop.addEventListener("click", onClick);
        drop.addEventListener("keydown", onKeyDown);
        drop.addEventListener("dragover", onDragOver);
        drop.addEventListener("dragleave", onDragLeave);
        drop.addEventListener("drop", onDrop);
        input.addEventListener("change", onInputChange);

        // Global guard: prevent navigate on dropping outside
        const gDragOver = (e) => e.preventDefault();
        const gDrop = (e) => {
            const target = e.target instanceof Element ? e.target : null;
            const inZone = target && (target.id === "fileDrop" || target.closest?.("#fileDrop"));
            if (!inZone) e.preventDefault();
        };
        window.addEventListener("dragover", gDragOver);
        window.addEventListener("drop", gDrop);

        unbindFns.push(
            () => drop.removeEventListener("click", onClick),
            () => drop.removeEventListener("keydown", onKeyDown),
            () => drop.removeEventListener("dragover", onDragOver),
            () => drop.removeEventListener("dragleave", onDragLeave),
            () => drop.removeEventListener("drop", onDrop),
            () => input.removeEventListener("change", onInputChange),
            () => window.removeEventListener("dragover", gDragOver),
            () => window.removeEventListener("drop", gDrop)
        );
    }

    function bindImportResilient() {
        detachImportHandlers();
        bindImportHandlers();

        const mo = new MutationObserver(() => {
            const curDrop = $("#fileDrop");
            const curInput = $("#fileInput");
            const needRebind = !curDrop || !curInput || curDrop !== boundDrop || curDrop.dataset.bound !== "1";
            if (needRebind) {
                detachImportHandlers();
                bindImportHandlers();
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    /* ---------- Process one file ---------- */
    async function processOne(fileName, svgText) {
        setStatus(`Vectorizing: ${fileName}`);
        const opts = { decimals: settings.decimals ?? 2, convertShapes: !!settings.convertShapes };

        const res = await runVectorize(svgText, opts);

        // derive viewport
        let viewport = res.viewport || { width: 24, height: 24 };
        if (!res.viewport && res.meta) {
            const vb = parseViewBox(res.meta.viewBox);
            if (vb) viewport = vb;
            else {
                const w = parseLength(res.meta.width);
                const h = parseLength(res.meta.height);
                if (w && h) viewport = { width: w, height: h };
            }
        }

        const item = {
            name: fileName,
            svgIn: svgText,
            normalizedSvg: res.normalizedSvg || res.optimizedSvg || svgText,
            xmlOut: res.vectorXml || "",
            viewport,
            stats: {
                inBytes: res.stats?.optimize?.bytesIn ?? bytes(svgText),
                outXmlBytes: res.stats?.outXmlBytes ?? bytes(res.vectorXml || ""),
                pathCount: res.stats?.mapping?.pathCount ?? 0,
            },
            warnings: Array.isArray(res.warnings) ? res.warnings : [],
            config: {
                decimals: settings.decimals,
                convertShapes: settings.convertShapes,
                defaultDp: settings.defaultDp,
                density: settings.density,
                grid: settings.grid,
            },
        };

        results.push(item);
        if (results.length === 1) {
            // Keep preview panel alive (not used by new Preview button)
            ensurePreview().setSvg(item.normalizedSvg, { viewport: item.viewport });
            ui.currentInfo.textContent = `${item.viewport.width}×${item.viewport.height} • ${fmt(
                item.stats.outXmlBytes
            )}`;
        }
        renderWarningsSummary();
        renderResults();
        return true;
    }

    function renderWarningsSummary() {
        const panel = ui.warningsPanel;
        panel.innerHTML = "";

        const all = results.flatMap((r) => r.warnings || []);
        if (!all.length) {
            const empty = document.createElement("div");
            empty.className = "warn-empty";
            empty.textContent = i18n.t("vectorizer.noWarnings", "No warnings");
            panel.appendChild(empty);
            return;
        }
        const map = new Map();
        for (const w of all) map.set(w.code || "UNKNOWN", (map.get(w.code || "UNKNOWN") || 0) + 1);

        const list = document.createElement("div");
        list.className = "warn-list";
        for (const [code, count] of map.entries()) {
            const row = document.createElement("div");
            row.className = "warn-item";
            const c = document.createElement("div");
            c.className = "code";
            c.textContent = `${code} ×${count}`;
            const m = document.createElement("div");
            m.className = "msg";
            m.textContent = i18n.t(`warn.${code}`, "See mapping reference for details.");
            row.append(c, m);
            list.appendChild(row);
        }
        panel.appendChild(list);
    }

    function renderResults() {
        const host = ui.resultsList;
        host.innerHTML = "";
        results.forEach((r) => {
            const row = document.createElement("div");
            row.className = "result";

            const meta = document.createElement("div");
            meta.className = "meta";
            const title = document.createElement("div");
            title.className = "title";
            title.textContent = r.name;
            const sub = document.createElement("div");
            sub.className = "sub";
            const delta =
                typeof r.stats.inBytes === "number" && typeof r.stats.outXmlBytes === "number"
                    ? `Δ ${fmt(r.stats.inBytes)} → ${fmt(r.stats.outXmlBytes)}`
                    : `Size: ${fmt(bytes(r.xmlOut))}`;
            sub.textContent = `${r.viewport.width}×${r.viewport.height} • ${delta} • paths: ${
                r.stats.pathCount ?? "?"
            }`;
            meta.append(title, sub);

            const act = document.createElement("div");
            act.className = "actions";

            // Preview -> open XML modal
            const btnPrev = document.createElement("button");
            btnPrev.className = "btn ghost";
            btnPrev.type = "button";
            btnPrev.innerHTML = '<i class="fa-regular fa-eye icon"></i><span class="label">Preview</span>';
            btnPrev.addEventListener("click", () => {
                xmlModal.open(r.name, r.xmlOut || "");
            });

            // XML download direct
            const btnXml = document.createElement("button");
            btnXml.className = "btn ghost";
            btnXml.type = "button";
            btnXml.innerHTML = '<i class="fa-regular fa-file-code icon"></i><span class="label">XML</span>';
            btnXml.addEventListener("click", () => {
                const blob = new Blob([r.xmlOut || ""], { type: "text/xml;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                const safe = sanitizeName(r.name);
                a.download = `ic_${safe || "icon"}.xml`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(a.href);
            });

            const btnCopy = document.createElement("button");
            btnCopy.className = "btn ghost";
            btnCopy.type = "button";
            btnCopy.innerHTML = '<i class="fa-regular fa-copy icon"></i><span class="label">Copy XML</span>';
            btnCopy.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(r.xmlOut || "");
                    setStatus("XML copied");
                } catch {
                    setStatus("Clipboard blocked");
                }
            });

            act.append(btnPrev, btnXml, btnCopy);
            row.append(meta, act);
            host.appendChild(row);
        });

        ui.exportAllBtn.disabled = results.length === 0;
    }

    ui.exportAllBtn?.addEventListener("click", async () => {
        if (!results.length) return;
        const files = results.map((r) => ({ path: `drawable/ic_${sanitizeName(r.name)}.xml`, data: r.xmlOut || "" }));
        await exportAsZip(files, "vector-drawables.zip");
        setStatus("ZIP exported");
    });

    ui.downloadLogBtn?.addEventListener("click", async () => {
        const log = {
            app: "TenRusl Droid Vectorizer",
            version: "1.0.0",
            when: new Date().toISOString(),
            config: snapshotConfig(),
            results: results.map((r) => ({
                name: r.name,
                viewport: r.viewport,
                stats: r.stats,
                warnings: r.warnings,
                config: r.config,
            })),
        };
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "vectorizer-log.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    });

    async function boot() {
        xmlModal = createXmlModalController();

        applySettingsToUI();
        bindSettings();
        bindImportResilient();
        await initPresets();

        const observer = new MutationObserver(() => {
            ensurePreview().setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        setStatus("Ready — drop SVG files");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
