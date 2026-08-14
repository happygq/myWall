(function initMyWallI18n(global) {
    "use strict";

    const SUPPORTED_LANGS = Object.freeze(["en", "zh", "ja", "ko"]);
    const DEFAULT_UI_LANG = "en";
    const DEFAULT_CONTENT_LANG = "en";
    const UI_LANG_KEY = "mywall.uiLocale";
    const CONTENT_LANG_KEY = "mywall.contentLocale";
    const dictionaries = new Map();

    function normalizeLang(value, fallback) {
        const lang = String(value || "").trim().toLowerCase().split("-")[0];
        return SUPPORTED_LANGS.includes(lang) ? lang : fallback;
    }

    function readPreference(key, fallback) {
        try {
            return normalizeLang(global.localStorage.getItem(key), fallback);
        } catch (_error) {
            return fallback;
        }
    }

    function writePreference(key, value) {
        try {
            global.localStorage.setItem(key, value);
        } catch (_error) {
            // Private browsing or storage policies must not block language changes.
        }
    }

    function getUiLang() {
        return readPreference(UI_LANG_KEY, DEFAULT_UI_LANG);
    }

    function getContentLang() {
        return readPreference(CONTENT_LANG_KEY, DEFAULT_CONTENT_LANG);
    }

    /** BCP 47 tag for Intl / localeCompare (UI locale, not content). */
    function getUiLocaleTag() {
        return {
            en: "en-US",
            zh: "zh-CN",
            ja: "ja-JP",
            ko: "ko-KR",
        }[getUiLang()] || "en-US";
    }

    async function loadDictionary(lang) {
        const normalized = normalizeLang(lang, DEFAULT_UI_LANG);
        if (dictionaries.has(normalized)) return dictionaries.get(normalized);

        const response = await global.fetch(`/static/locales/${normalized}.json?v=5.0s`);
        if (!response.ok) {
            throw new Error(`Unable to load locale "${normalized}" (${response.status})`);
        }
        const dictionary = await response.json();
        dictionaries.set(normalized, dictionary);
        return dictionary;
    }

    function interpolate(message, params) {
        return Object.entries(params || {}).reduce(
            (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
            message
        );
    }

    function t(key, params) {
        const lang = getUiLang();
        const active = dictionaries.get(lang) || {};
        const english = dictionaries.get(DEFAULT_UI_LANG) || {};
        return interpolate(active[key] ?? english[key] ?? key, params);
    }

    /** Parse data-i18n-params="count:12,foo:bar" into { count: "12", foo: "bar" }. */
    function parseI18nParams(raw) {
        const text = String(raw || "").trim();
        if (!text) return {};
        const params = {};
        text.split(",").forEach((part) => {
            const idx = part.indexOf(":");
            if (idx <= 0) return;
            const name = part.slice(0, idx).trim();
            const value = part.slice(idx + 1).trim();
            if (name) params[name] = value;
        });
        return params;
    }

    function applyI18n(root) {
        const scope = root || global.document;
        const docEl = global.document.documentElement;
        scope.querySelectorAll("[data-i18n]").forEach((element) => {
            const params = parseI18nParams(element.dataset.i18nParams);
            element.textContent = t(element.dataset.i18n, params);
        });
        scope.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
            element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
        });
        scope.querySelectorAll("[data-i18n-title]").forEach((element) => {
            // On <html> the key drives document.title; a title attribute there
            // would be inherited as a native tooltip by every element on the page.
            if (element === docEl) return;
            element.setAttribute("title", t(element.dataset.i18nTitle));
        });
        scope.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
            element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
        });
        scope.querySelectorAll("[data-i18n-alt]").forEach((element) => {
            element.setAttribute("alt", t(element.dataset.i18nAlt));
        });
        scope.querySelectorAll("[data-i18n-value]").forEach((element) => {
            element.setAttribute("value", t(element.dataset.i18nValue));
        });
        const titleKey = docEl.dataset.i18nTitle;
        if (titleKey) global.document.title = t(titleKey);
        docEl.removeAttribute("title");
    }

    async function setUiLang(value) {
        const lang = normalizeLang(value, DEFAULT_UI_LANG);
        await Promise.all([
            loadDictionary(DEFAULT_UI_LANG),
            lang === DEFAULT_UI_LANG ? Promise.resolve() : loadDictionary(lang),
        ]);
        writePreference(UI_LANG_KEY, lang);
        global.document.documentElement.lang = lang;
        applyI18n();
        global.dispatchEvent(new CustomEvent("mywall:ui-language-changed", {
            detail: { lang },
        }));
        return lang;
    }

    function setContentLang(value) {
        const lang = normalizeLang(value, DEFAULT_CONTENT_LANG);
        writePreference(CONTENT_LANG_KEY, lang);
        global.dispatchEvent(new CustomEvent("mywall:content-language-changed", {
            detail: { lang },
        }));
        return lang;
    }

    async function init() {
        const lang = getUiLang();
        await Promise.all([
            loadDictionary(DEFAULT_UI_LANG),
            lang === DEFAULT_UI_LANG ? Promise.resolve() : loadDictionary(lang),
        ]);
        global.document.documentElement.lang = lang;
        return lang;
    }

    const api = Object.freeze({
        SUPPORTED_LANGS,
        DEFAULT_UI_LANG,
        DEFAULT_CONTENT_LANG,
        init,
        t,
        applyI18n,
        getUiLang,
        getUiLocaleTag,
        setUiLang,
        getContentLang,
        setContentLang,
        loadDictionary,
    });

    global.MyWallI18n = api;
    global.t = t;
    global.applyI18n = applyI18n;
})(window);
