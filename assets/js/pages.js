/* =========================================================
   pages.js — fitur halaman saja
   ======================================================= */
(function () {
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* ---------- Code copy ---------- */
    function enhanceCode() {
        $$("pre > code").forEach((code) => {
            const pre = code.parentElement;
            if (pre.querySelector(".btn.copy")) return;
            const b = document.createElement("button");
            b.type = "button";
            b.className = "btn btn-sm copy";
            b.textContent = window.PagesI18N?.t("copy") || "Copy";
            pre.appendChild(b);
            b.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(code.innerText);
                    const ok = window.PagesI18N?.t("copied") || "Copied";
                    b.textContent = ok;
                    setTimeout(() => (b.textContent = window.PagesI18N?.t("copy") || "Copy"), 1400);
                } catch {
                    b.textContent = "Error";
                }
            });
        });
    }

    // Update label tombol copy saat bahasa berubah
    function bindI18n() {
        document.addEventListener("tenrusl:langchange", () => {
            $$(".btn.copy").forEach((b) => (b.textContent = window.PagesI18N?.t("copy") || "Copy"));
        });
    }

    /* ---------- Table sort ---------- */
    function initTableSort() {
        $$("th[data-sort]").forEach((th) => {
            th.addEventListener("click", () => {
                const table = th.closest("table");
                if (!table || !table.tBodies[0]) return;

                const idx = Array.from(th.parentNode.children).indexOf(th);
                const type = th.dataset.sort || "text";
                const dir = th.classList.contains("asc") ? "desc" : "asc";

                $$("th[data-sort]", table).forEach((x) => x.classList.remove("asc", "desc"));
                th.classList.add(dir);

                const rows = Array.from(table.tBodies[0].rows);
                const parse = (v) => {
                    const s = (v ?? "").toString().trim();
                    if (type === "number") return parseFloat(s.replace(/[^\d.-]/g, "")) || 0;
                    if (type === "date") return Date.parse(s) || 0;
                    return s.toLowerCase();
                };

                rows.sort((a, b) => {
                    const av = parse(a.cells[idx]?.innerText);
                    const bv = parse(b.cells[idx]?.innerText);
                    return dir === "asc" ? (av > bv ? 1 : av < bv ? -1 : 0) : av < bv ? 1 : av > bv ? -1 : 0;
                });

                rows.forEach((r) => table.tBodies[0].appendChild(r));
            });
        });
    }

    /* ---------- Reveal on scroll ---------- */
    function reveal() {
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add("reveal-in");
                        obs.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        $$(".reveal").forEach((el) => obs.observe(el));
    }

    /* ---------- SW register (ROOT ONLY) ---------- */
    async function registerSW() {
        if (!("serviceWorker" in navigator)) return;
        try {
            await navigator.serviceWorker.register("/assets/js/sw.js");
        } catch (err) {
            // diam bila gagal
        }
    }

    /* ---------- boot ---------- */
    document.addEventListener("DOMContentLoaded", () => {
        enhanceCode();
        initTableSort();
        reveal();
        registerSW();
        bindI18n();
    });
})();
