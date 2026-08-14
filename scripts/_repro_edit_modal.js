/**
 * Repro harness for the "edit modal won't close / photo missing" bug.
 *
 * Loads static/js/app.js into a vm sandbox with an auto-stubbed DOM, then drives
 * the exact sequence editDisc() runs. We only care about ReferenceError: that is
 * what aborts editDisc() after the modal is already visible but before the close
 * handlers are bound. TypeErrors from the crude DOM stub are expected and ignored.
 *
 * Usage: node scripts/_repro_edit_modal.js [path-to-app.js]
 */
const fs = require("fs");
const vm = require("vm");

const file = process.argv[2] || "static/js/app.js";
const source = fs.readFileSync(file, "utf8");

function makeStub(name) {
    const cache = new Map();
    const target = function () {};
    target.__name = name;
    return new Proxy(target, {
        get(_t, prop) {
            if (prop === Symbol.toPrimitive) return () => 0;
            if (prop === Symbol.iterator) return function* () {};
            if (prop === "then") return undefined;
            if (prop === "length") return 0;
            if (prop === "constructor") return Object;
            if (typeof prop === "symbol") return undefined;
            if (prop === "contains" || prop === "matches") return () => false;
            if (prop === "forEach" || prop === "addEventListener"
                || prop === "removeEventListener" || prop === "setAttribute"
                || prop === "removeAttribute" || prop === "add" || prop === "remove"
                || prop === "toggle" || prop === "focus" || prop === "blur") {
                return () => undefined;
            }
            if (prop === "querySelectorAll") return () => [];
            if (prop === "value" || prop === "textContent" || prop === "innerHTML") return "";
            if (!cache.has(prop)) cache.set(prop, makeStub(`${name}.${String(prop)}`));
            return cache.get(prop);
        },
        set() { return true; },
        apply() { return makeStub(`${name}()`); },
        has() { return true; },
    });
}

const documentStub = makeStub("document");
const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: () => 0,
    document: documentStub,
    navigator: { userAgent: "node" },
    location: { href: "http://127.0.0.1:5000/", search: "" },
    localStorage: {
        _d: {},
        getItem(k) { return k in this._d ? this._d[k] : null; },
        setItem(k, v) { this._d[k] = String(v); },
        removeItem(k) { delete this._d[k]; },
    },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    getComputedStyle: () => makeStub("computedStyle"),
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o); } },
    Image: class { constructor() { this.onload = null; } },
    URLSearchParams,
    Float64Array, Math, JSON, Date, Promise, Object, Array, String, Number, Boolean,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, escape: (s) => s,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.addEventListener = () => {};
sandbox.dispatchEvent = () => true;

vm.createContext(sandbox);
try {
    new vm.Script(source, { filename: file }).runInContext(sandbox);
} catch (e) {
    console.log(`LOAD FAILED: ${e.name}: ${e.message}`);
    process.exit(2);
}

// Minimal i18n so tr() resolves like it does in the browser.
const dict = JSON.parse(fs.readFileSync("static/locales/en.json", "utf8"));
sandbox.MyWallI18n = {
    t: (k) => (k in dict ? dict[k] : `__MISSING__${k}`),
    applyI18n: () => {},
    getUiLocaleTag: () => "en-US",
};

const results = [];
function probe(label, fn) {
    try {
        fn();
        results.push({ label, ok: true, detail: "no throw" });
    } catch (e) {
        // vm errors come from another realm, so instanceof would always be false.
        const fatal = e && e.name === "ReferenceError";
        results.push({ label, ok: !fatal, detail: `${e.name}: ${e.message}` });
    }
}

probe("refreshDynamicUi()", () => sandbox.refreshDynamicUi());
probe("bindEditDiscModal()", () => sandbox.bindEditDiscModal());
probe("closeEditDiscModal()", () => sandbox.closeEditDiscModal());

// Assert the i18n keys the edit modal reads at runtime actually exist.
const runtimeKeys = [
    "edit.previewHintWithBox", "edit.previewNoBox", "edit.previewEmpty",
    "edit.previewNoPhoto", "edit.sourceAllAvailable", "edit.noMatch",
    "edit.sourceNone", "dialog.editDisc", "dialog.createDisc",
];
const missingKeys = runtimeKeys.filter((k) => !(k in dict));

console.log(`\n=== ${file} ===`);
for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.label.padEnd(24)} ${r.detail}`);
}
console.log(`  ${missingKeys.length ? "FAIL" : "PASS"}  ${"edit-modal i18n keys".padEnd(24)} ${missingKeys.length ? "missing: " + missingKeys.join(", ") : "all present"}`);

const failed = results.some((r) => !r.ok) || missingKeys.length > 0;
console.log(failed ? "\nRESULT: FAIL (ReferenceError or missing key)\n" : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
