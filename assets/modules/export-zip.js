// C:\laragon\www\TenRusl-Droid-Vectorizer\assets\js\modules\export-zip.js
/**
 * Export ZIP (tanpa dependensi eksternal).
 * Implementasi: ZIP "store" (tanpa kompresi, method 0) + CRC-32.
 * Cakupan:
 *  - buildZipBlob(files) → Blob ZIP
 *  - downloadBlob(blob, filename) → trigger unduhan
 *  - exportAsZip(files, zipName) → utility siap pakai
 *
 * Struktur files: Array<{ path: string, data: string|Uint8Array|Blob }>
 * - path gunakan "/" untuk folder (mis. "drawable/ic_home.xml")
 * - data string akan di-encode UTF-8
 */

function textToUint8(str) {
    return new TextEncoder().encode(str);
}

function concatUint8(arrays) {
    const len = arrays.reduce((n, a) => n + a.length, 0);
    const out = new Uint8Array(len);
    let off = 0;
    for (const a of arrays) {
        out.set(a, off);
        off += a.length;
    }
    return out;
}

// CRC-32
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(buf) {
    let c = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
    return (c ^ -1) >>> 0;
}

// DOS time/date encoding
function dosDateTime(ts = new Date()) {
    const d = ts instanceof Date ? ts : new Date(ts);
    const time =
        ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
    const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
    return { time, date };
}

/**
 * Normalisasi file entry → {nameUtf8, dataUint8, crc, size}
 */
async function normalizeEntry(entry) {
    const nameUtf8 = textToUint8(entry.path.replace(/\\/g, "/"));
    let dataUint8;

    if (entry.data instanceof Uint8Array) {
        dataUint8 = entry.data;
    } else if (entry.data instanceof Blob) {
        dataUint8 = new Uint8Array(await entry.data.arrayBuffer());
    } else if (typeof entry.data === "string") {
        dataUint8 = textToUint8(entry.data);
    } else {
        dataUint8 = new Uint8Array(0);
    }

    const crc = crc32(dataUint8);
    const size = dataUint8.length >>> 0;
    return { nameUtf8, dataUint8, crc, size };
}

/**
 * Bangun ZIP tanpa kompresi.
 * @param {Array<{path:string,data:string|Uint8Array|Blob,date?:Date}>} files
 * @returns {Promise<Blob>}
 */
export async function buildZipBlob(files) {
    const localRecs = [];
    const centralRecs = [];
    let offset = 0;

    for (const f of files) {
        const { nameUtf8, dataUint8, crc, size } = await normalizeEntry(f);
        const { time, date } = dosDateTime(f.date);

        // Local file header
        const LFH = new Uint8Array(30);
        const dv = new DataView(LFH.buffer);
        dv.setUint32(0, 0x04034b50, true); // signature
        dv.setUint16(4, 20, true); // version needed to extract
        dv.setUint16(6, 0, true); // general purpose bit flag
        dv.setUint16(8, 0, true); // compression method 0 (store)
        dv.setUint16(10, time, true); // last mod file time
        dv.setUint16(12, date, true); // last mod file date
        dv.setUint32(14, crc, true); // crc-32
        dv.setUint32(18, size, true); // compressed size
        dv.setUint32(22, size, true); // uncompressed size
        dv.setUint16(26, nameUtf8.length, true); // file name length
        dv.setUint16(28, 0, true); // extra field length

        const localRecord = concatUint8([LFH, nameUtf8, dataUint8]);
        localRecs.push(localRecord);

        // Central directory header
        const CDH = new Uint8Array(46);
        const cdv = new DataView(CDH.buffer);
        cdv.setUint32(0, 0x02014b50, true); // signature
        cdv.setUint16(4, 20, true); // version made by
        cdv.setUint16(6, 20, true); // version needed
        cdv.setUint16(8, 0, true); // flags
        cdv.setUint16(10, 0, true); // method (store)
        cdv.setUint16(12, time, true); // time
        cdv.setUint16(14, date, true); // date
        cdv.setUint32(16, crc, true); // crc
        cdv.setUint32(20, size, true); // comp size
        cdv.setUint32(24, size, true); // uncomp size
        cdv.setUint16(28, nameUtf8.length, true); // file name len
        cdv.setUint16(30, 0, true); // extra len
        cdv.setUint16(32, 0, true); // comment len
        cdv.setUint16(34, 0, true); // disk number start
        cdv.setUint16(36, 0, true); // internal attrs
        cdv.setUint32(38, 0, true); // external attrs
        cdv.setUint32(42, offset, true); // relative offset of local header

        centralRecs.push(concatUint8([CDH, nameUtf8]));

        offset += localRecord.length;
    }

    const centralDir = concatUint8(centralRecs);

    // End of central directory
    const total = files.length;
    const EOCD = new Uint8Array(22);
    const edv = new DataView(EOCD.buffer);
    edv.setUint32(0, 0x06054b50, true); // signature
    edv.setUint16(4, 0, true); // number of this disk
    edv.setUint16(6, 0, true); // disk where central directory starts
    edv.setUint16(8, total, true); // number of central dir records on this disk
    edv.setUint16(10, total, true); // total number of central dir records
    edv.setUint32(12, centralDir.length, true); // size of central directory
    edv.setUint32(16, offset, true); // offset of central directory
    edv.setUint16(20, 0, true); // comment length

    const zipBytes = concatUint8([...localRecs, centralDir, EOCD]);
    return new Blob([zipBytes], { type: "application/zip" });
}

/** Trigger unduhan blob. */
export function downloadBlob(blob, filename = "download.bin") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Utility: ekspor sebagai ZIP dan unduh.
 * @param {Array<{path:string,data:string|Uint8Array|Blob,date?:Date}>} files
 * @param {string} zipName
 */
export async function exportAsZip(files, zipName = "vector-drawables.zip") {
    const blob = await buildZipBlob(files);
    downloadBlob(blob, zipName);
    return blob;
}
