/**
 * Heuristic scan: report called identifiers in a browser script that are never
 * declared locally and are not known browser/global builtins.
 * Usage: node scripts/_check_undefined_calls.js static/js/app.js [...]
 */
const fs = require("fs");

const BUILTINS = new Set([
    "require", "String", "Number", "Boolean", "Array", "Object", "JSON", "Math", "Date",
    "Promise", "Map", "Set", "WeakMap", "WeakSet", "Error", "TypeError", "RangeError",
    "RegExp", "Symbol", "BigInt", "Proxy", "Reflect", "Intl", "parseInt", "parseFloat",
    "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent", "encodeURI",
    "decodeURI", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
    "requestAnimationFrame", "cancelAnimationFrame", "fetch", "alert", "confirm",
    "prompt", "structuredClone", "queueMicrotask", "getComputedStyle", "matchMedia",
    "FormData", "URL", "URLSearchParams", "Blob", "File", "FileReader", "Image",
    "AbortController", "CustomEvent", "Event", "MouseEvent", "KeyboardEvent",
    "IntersectionObserver", "ResizeObserver", "MutationObserver", "HTMLElement",
    "Element", "Node", "NodeList", "DOMParser", "TextEncoder", "TextDecoder",
    "console", "window", "document", "navigator", "location", "history", "localStorage",
    "sessionStorage", "performance", "screen", "top", "self", "globalThis", "atob", "btoa",
    "if", "for", "while", "switch", "catch", "return", "typeof", "function", "new",
    "await", "yield", "else", "do", "try", "throw", "case", "delete", "void", "in", "of",
    "super", "this", "class", "const", "let", "var",
]);

let bad = 0;
for (const file of process.argv.slice(2)) {
    const src = fs.readFileSync(file, "utf8");
    // Strip comments and string/template literals so we don't scan prose.
    const code = src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
        .replace(/`(?:\\[\s\S]|[^`\\])*`/g, "``")
        .replace(/"(?:\\[\s\S]|[^"\\])*"/g, '""')
        .replace(/'(?:\\[\s\S]|[^'\\])*'/g, "''");

    const declared = new Set();
    const declRe = /(?:function\s*\*?\s*([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*))/g;
    for (const m of code.matchAll(declRe)) {
        declared.add(m[1] || m[2] || m[3]);
    }
    // Destructured / parameter names are noisy; capture simple ones too.
    for (const m of code.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g)) {
        for (const part of m[1].split(",")) {
            const name = part.split(/[:=]/).pop().trim();
            if (/^[A-Za-z_$][\w$]*$/.test(name)) declared.add(name);
        }
    }

    // Bare calls: identifier( not preceded by a dot or an identifier char.
    const callRe = /(^|[^.\w$'"`])([A-Za-z_$][\w$]*)\s*\(/g;
    const missing = new Map();
    for (const m of code.matchAll(callRe)) {
        const name = m[2];
        if (declared.has(name) || BUILTINS.has(name)) continue;
        const line = code.slice(0, m.index).split("\n").length;
        if (!missing.has(name)) missing.set(name, line);
    }

    if (missing.size) {
        bad = 1;
        console.log(`\n${file}: ${missing.size} possibly-undefined call target(s)`);
        for (const [name, line] of [...missing].sort((a, b) => a[1] - b[1])) {
            console.log(`  line ${line}: ${name}()`);
        }
    } else {
        console.log(`${file}: no undefined call targets found`);
    }
}
process.exit(bad);
