#!/usr/bin/env node
/**
 * downloader.js
 * Unduh semua file dari 1..N URL direktori jsDelivr (rekursif).
 * Contoh:
 *   node downloader.js "https://cdn.jsdelivr.net/npm/svgson@5.3.1/"
 *   node downloader.js "https://cdn.jsdelivr.net/npm/svgson@5.3.1/" "https://cdn.jsdelivr.net/npm/svgo-browser@1.3.8/" -o ..\vendor -c 8
 *
 * Opsi:
 *   -o, --out <dir>        Folder output (default: downloads)
 *   -c, --concurrency <n>  Unduhan paralel (default: 6)
 *   -n, --dry-run          Hanya list file, tidak unduh
 *   -h, --help             Bantuan
 */

const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");

function printHelp() {
    console.log(
        `
Usage:
  node downloader.js <url1> [url2 ...] [options]

Options:
  -o, --out <dir>         Folder output (default: downloads)
  -c, --concurrency <n>   Unduhan paralel (default: 6)
  -n, --dry-run           Hanya menampilkan daftar file
  -h, --help              Tampilkan bantuan

Contoh:
  node downloader.js "https://cdn.jsdelivr.net/npm/svgson@5.3.1/"
  node downloader.js "https://cdn.jsdelivr.net/npm/svgson@5.3.1/" "https://cdn.jsdelivr.net/npm/svgo-browser@1.3.8/" -o ..\\vendor -c 8
`.trim()
    );
}

function parseArgs(argv) {
    const out = { urls: [], outDir: "downloads", concurrency: 6, dryRun: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "-o" || a === "--out") out.outDir = argv[++i];
        else if (a === "-c" || a === "--concurrency") out.concurrency = Math.max(1, parseInt(argv[++i], 10) || 6);
        else if (a === "-n" || a === "--dry-run") out.dryRun = true;
        else if (a === "-h" || a === "--help") {
            printHelp();
            process.exit(0);
        } else if (!a.startsWith("-")) out.urls.push(a);
    }
    if (out.urls.length === 0) {
        out.urls = ["https://cdn.jsdelivr.net/npm/svgson@5.3.1/"]; // default
    }
    return out;
}

function ensureTrailingSlash(u) {
    const url = new URL(u);
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
}

function isDirUrl(u) {
    try {
        return new URL(u).pathname.endsWith("/");
    } catch {
        return false;
    }
}

async function fetchText(u) {
    const res = await fetch(u, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} saat GET ${u}`);
    return await res.text();
}

function parseLinksFromIndex(html, currentUrl, baseUrl) {
    // Ambil semua <a href="...">...</a>
    const re = /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gim;
    const out = [];
    let m;
    const base = new URL(baseUrl);
    const here = new URL(currentUrl);

    while ((m = re.exec(html)) !== null) {
        const hrefRaw = m[1];
        const text = (m[2] || "").trim();
        let child;
        try {
            child = new URL(hrefRaw, here);
        } catch {
            continue;
        }

        // Hanya yang masih 1 origin & di bawah base path
        if (child.origin !== base.origin) continue;
        if (!child.pathname.startsWith(base.pathname)) continue;
        if (text.toLowerCase().includes("parent") || hrefRaw.startsWith("..")) continue;

        const rel = decodeURIComponent(child.pathname.slice(base.pathname.length));
        if (!rel) continue;
        const isDir = rel.endsWith("/") || text.endsWith("/");
        out.push({ url: child.toString(), relPath: rel, isDir });
    }
    const seen = new Set();
    return out.filter((x) => {
        const k = x.url + "|" + x.isDir;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

async function crawlAllFiles(baseUrl) {
    const start = ensureTrailingSlash(baseUrl);
    const dirVisited = new Set();
    const files = [];

    async function walk(dirUrl) {
        const key = new URL(dirUrl).toString();
        if (dirVisited.has(key)) return;
        dirVisited.add(key);

        let html;
        try {
            html = await fetchText(dirUrl);
        } catch (e) {
            console.error(`Gagal index: ${dirUrl} -> ${e.message}`);
            return;
        }

        const links = parseLinksFromIndex(html, dirUrl, start);
        for (const l of links) {
            if (l.isDir) await walk(l.url);
            else files.push({ url: l.url, relPath: l.relPath });
        }
    }

    if (!isDirUrl(baseUrl)) {
        const name = decodeURIComponent(new URL(baseUrl).pathname.split("/").pop());
        return [{ url: baseUrl, relPath: name }];
    }

    await walk(start);
    return files;
}

async function downloadFileTo(fileUrl, destFullPath) {
    await fs.promises.mkdir(path.dirname(destFullPath), { recursive: true });
    const res = await fetch(fileUrl, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const total = Number(res.headers.get("content-length") || 0);
    let downloaded = 0;

    const stream = Readable.fromWeb(res.body);
    if (process.stderr.isTTY) {
        stream.on("data", (chunk) => {
            downloaded += chunk.length;
            const pct = total ? ` ${((downloaded / total) * 100).toFixed(1)}%` : "";
            process.stderr.write(
                `\r↳ ${path.basename(destFullPath)}  ${downloaded}${total ? "/" + total : ""} bytes${pct}   `
            );
        });
    }
    await pipeline(stream, fs.createWriteStream(destFullPath));
    if (process.stderr.isTTY) process.stderr.write("\n");
}

async function withConcurrency(items, limit, worker) {
    const executing = new Set();
    let done = 0;

    for (const it of items) {
        const p = (async () => {
            try {
                await worker(it);
            } catch (e) {
                console.error(`❌ ${it.url} -> ${e.message}`);
            }
        })();
        executing.add(p);
        p.finally(() => {
            executing.delete(p);
            done++;
            if (process.stderr.isTTY) process.stderr.write(`\rSelesai: ${done}/${items.length}               `);
        });
        if (executing.size >= limit) await Promise.race(executing);
    }
    await Promise.all(executing);
    if (process.stderr.isTTY) process.stderr.write("\n");
}

function labelFromBaseUrl(u) {
    const segs = new URL(ensureTrailingSlash(u)).pathname.split("/").filter(Boolean);
    return segs[segs.length - 1] || "package";
}

(async () => {
    const args = parseArgs(process.argv.slice(2));
    const outRoot = path.resolve(process.cwd(), args.outDir);

    console.log(`Output folder : ${outRoot}`);
    console.log(`Concurrency   : ${args.concurrency}\n`);

    const allTasks = [];
    for (const baseUrl of args.urls) {
        const isDir = isDirUrl(baseUrl);
        const label = labelFromBaseUrl(baseUrl);
        console.log(`Memindai: ${baseUrl} ${isDir ? "(direktori)" : "(file)"}`);
        const files = await crawlAllFiles(baseUrl);
        console.log(`→ Ditemukan ${files.length} file`);
        for (const f of files) {
            const dest = path.join(outRoot, label, f.relPath.replace(/^\//, ""));
            allTasks.push({ url: f.url, dest });
        }
    }

    if (args.dryRun) {
        console.log("\n[Dry Run] File yang akan diunduh:");
        allTasks.forEach((t) => console.log(`${t.url}  =>  ${t.dest}`));
        process.exit(0);
    }

    await withConcurrency(allTasks, args.concurrency, async ({ url, dest }) => {
        await downloadFileTo(url, dest);
    });

    console.log(`\n✅ Selesai. Total file: ${allTasks.length}`);
})();
