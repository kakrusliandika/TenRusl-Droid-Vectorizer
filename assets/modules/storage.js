// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\storage.js
/**
 * Storage util (local/session) dengan namespace aman.
 * Menyimpan:
 *  - settings: { decimals, convertShapes, defaultDp, density, theme, grid, locale }
 *  - history: [{ name, size, ts }]
 *  - presets (opsional): { [presetName]: {decimals,...} }
 */

const NS = "trdv";
const KEY_SETTINGS = `${NS}:settings`;
const KEY_HISTORY = `${NS}:history`;
const KEY_PRESETS = `${NS}:presets`;

/** Parse JSON aman. */
function safeParse(json, fallback) {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

/** Simpan JSON aman. */
function safeStringify(obj) {
    try {
        return JSON.stringify(obj);
    } catch {
        return "{}";
    }
}

/** Cek availability localStorage. */
function hasLocalStorage() {
    try {
        const k = "__ls_test__";
        window.localStorage.setItem(k, "1");
        window.localStorage.removeItem(k);
        return true;
    } catch {
        return false;
    }
}

const inMemory = new Map(); // fallback memory

function lsGet(key) {
    if (hasLocalStorage()) {
        const v = window.localStorage.getItem(key);
        return v == null ? null : v;
    }
    return inMemory.has(key) ? inMemory.get(key) : null;
}

function lsSet(key, value) {
    if (hasLocalStorage()) {
        window.localStorage.setItem(key, value);
    } else {
        inMemory.set(key, value);
    }
}

function lsRemove(key) {
    if (hasLocalStorage()) {
        window.localStorage.removeItem(key);
    } else {
        inMemory.delete(key);
    }
}

/** Default settings. */
export function defaultSettings() {
    return {
        decimals: 2,
        convertShapes: false,
        defaultDp: 24,
        density: "mdpi",
        theme: "light",
        grid: false,
        locale: "en",
    };
}

/** Ambil settings (gabung default). */
export function loadSettings() {
    const raw = lsGet(KEY_SETTINGS);
    const obj = safeParse(raw, {});
    return { ...defaultSettings(), ...obj };
}

/** Simpan settings. */
export function saveSettings(settings) {
    const merged = { ...defaultSettings(), ...(settings || {}) };
    lsSet(KEY_SETTINGS, safeStringify(merged));
    return merged;
}

/** Update sebagian settings (patch). */
export function updateSettings(patch) {
    const cur = loadSettings();
    const next = { ...cur, ...(patch || {}) };
    return saveSettings(next);
}

/** Bersihkan settings. */
export function clearSettings() {
    lsRemove(KEY_SETTINGS);
}

/** Riwayat file: tambah entri. */
export function addHistoryEntry({ name, size }) {
    const list = loadHistory();
    const ts = Date.now();
    // hindari duplikat berurutan untuk file sama & ukuran sama
    if (list[0] && list[0].name === name && list[0].size === size) {
        list[0].ts = ts;
    } else {
        list.unshift({ name, size, ts });
    }
    // batasi 100 entri
    while (list.length > 100) list.pop();
    lsSet(KEY_HISTORY, safeStringify(list));
    return list;
}

/** Ambil riwayat. */
export function loadHistory() {
    const raw = lsGet(KEY_HISTORY);
    const arr = safeParse(raw, []);
    return Array.isArray(arr) ? arr : [];
}

/** Hapus riwayat. */
export function clearHistory() {
    lsRemove(KEY_HISTORY);
}

/** Presets: simpan preset bernama. */
export function savePreset(name, config) {
    if (!name || typeof name !== "string") return;
    const all = loadPresets();
    all[name] = { ...config };
    lsSet(KEY_PRESETS, safeStringify(all));
    return all[name];
}

/** Ambil semua preset. */
export function loadPresets() {
    const raw = lsGet(KEY_PRESETS);
    const obj = safeParse(raw, {});
    return obj && typeof obj === "object" ? obj : {};
}

/** Ambil satu preset. */
export function getPreset(name) {
    const all = loadPresets();
    return all[name] || null;
}

/** Hapus preset. */
export function deletePreset(name) {
    const all = loadPresets();
    if (all[name]) {
        delete all[name];
        lsSet(KEY_PRESETS, safeStringify(all));
    }
    return all;
}

/** Export snapshot konfigurasi (mis. untuk log atau manifest). */
export function snapshotConfig() {
    return {
        settings: loadSettings(),
        presets: loadPresets(),
        history: loadHistory().slice(0, 10), // ringkas
        exportedAt: new Date().toISOString(),
    };
}
