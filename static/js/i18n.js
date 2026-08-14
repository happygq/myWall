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

    async function loadDictionary(lang) {
        const normalized = normalizeLang(lang, DEFAULT_UI_LANG);
        if (dictionaries.has(normalized)) return dictionaries.get(normalized);

        const response = await global.fetch(`/static/locales/${normalized}.json`);
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

    async function setUiLang(value) {
        const lang = normalizeLang(value, DEFAULT_UI_LANG);
        await Promise.all([
            loadDictionary(DEFAULT_UI_LANG),
            lang === DEFAULT_UI_LANG ? Promise.resolve() : loadDictionary(lang),
        ]);
        writePreference(UI_LANG_KEY, lang);
        global.document.documentElement.lang = lang;
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
        getUiLang,
        setUiLang,
        getContentLang,
        setContentLang,
        loadDictionary,
    });

    global.MyWallI18n = api;
    global.t = t;
})(window);
