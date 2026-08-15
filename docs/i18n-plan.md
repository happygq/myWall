# myWall Multilingual Branch Architecture

> Status: experimental plan for the `i18n` branch. It remains separate from `main` unless an explicit merge decision is made.
> Initial locales: English (`en`), Simplified Chinese (`zh`), Japanese (`ja`), and Korean (`ko`).

## Dual-track release strategy

- `main` remains the v4.1 Chinese stable release and preserves its Chinese-first runtime experience.
- `i18n` is the multilingual experimental release, defaults to English, and evolves independently until its behavior is stable.
- Development, testing, and deployment must start from the intended branch. The branches neither share commits automatically nor auto-merge.
- Existing ignore rules remain in force. Databases, photos, uploads, recognition output, and credentials must not be committed.
- Repository documentation on `i18n` is English-only. Localized runtime dictionaries may contain their target languages because they are UI assets rather than project documentation.

## Locale model

Language preference is split into two independent dimensions:

- **UI locale:** buttons, sidebar labels, dialogs, notices, and status messages. Default: `en`.
- **Content locale:** card titles, person names, synopses, and genre labels. Default: `en`; users may select `zh`, `ja`, or `ko`. Missing target-language values fall back to English, original-language data, and existing compatibility fields.

Preferences are stored in browser `localStorage`:

- `mywall.uiLocale`
- `mywall.contentLocale`

Supported values are fixed to `en | zh | ja | ko`. Invalid values resolve to the defaults. A future `?lang=` override may provide temporary previews, but branch isolation remains the primary release boundary.

## UI internationalization

Frontend dictionaries are located at:

- `static/locales/en.json`
- `static/locales/zh.json`
- `static/locales/ja.json`
- `static/locales/ko.json`

`static/js/i18n.js` provides asynchronous dictionary loading, `t(key)`, `getUiLang()` / `setUiLang()`, and `getContentLang()` / `setContentLang()`. Startup loads the selected UI dictionary before rendering fixed text marked with `data-i18n`. Missing keys fall back to English and then the key itself; an incomplete locale must never block the page.

The sidebar exposes compact language chips for English, Simplified Chinese, Japanese, and Korean. Selecting a chip changes the UI locale and does not implicitly overwrite the independent content locale. Incomplete Japanese or Korean entries display English fallback text while preserving the selected locale.

## Content internationalization and compatible migration

The planned SQLite `discs` additions are JSON text columns:

- `titles_i18n`: `{"en": "...", "zh": "...", "ja": "...", "ko": "..."}`
- `synopses_i18n`: the same locale map for synopses
- `genres_i18n`: per-locale arrays of display labels

People remain in the `directors` / `cast` JSON arrays, with localized fields added per entry:

```json
{
  "id": 123,
  "names": {"en": "...", "zh": "...", "ja": "...", "ko": "..."},
  "characters": {"en": "...", "zh": "...", "ja": "...", "ko": "..."}
}
```

Compatibility requirements:

1. Keep `title_cn`, `title_en`, `synopsis_cn`, and `synopsis_en` without deletion or renaming so old databases and the stable release remain readable.
2. Migrations only add columns with a default of `'{}'` and must be safe to rerun.
3. The first migration backfills JSON from legacy fields: `title_cn → zh`, `title_en → en`, and equivalent synopsis fields, while preserving originals.
4. New writes synchronize the legacy compatibility fields and the JSON `zh` / `en` values until the stable branch has a separately approved migration path.
5. API responses retain old fields alongside localized fields. The frontend content selector reads localized fields and applies the documented fallback sequence.

## Four-locale TMDb persistence

TMDb's `language` argument must be explicit. New workflows must not rely on mutable global `self.lang` as their only locale source. After enrichment or import confirms a TMDb item, prefetch and persist:

- `en` → `en-US`
- `zh` → `zh-CN`
- `ja` → `ja-JP`
- `ko` → `ko-KR`

Fetch details, synopses, genres, and credits with the same locale and merge them by stable IDs. Images and IDs are deduplicated rather than stored once per language. A failed locale request records missing coverage and allows the remaining locales to continue. Retries fill gaps without overwriting non-empty manual translations. Search may use the current UI or content locale, while the confirmed four-locale fetch is the persistence source.

## Manuals and documentation

- Canonical manual: `static/docs/manual.en.html`
- Compatibility entry: `static/docs/manual.html`, which forwards to the canonical English manual
- All Markdown files, plans, screenshot captions, and project guidance on `i18n` remain English-only.
- Runtime locale dictionaries retain translated UI strings, including Simplified Chinese. Those files are outside the English-only documentation policy.
- A future translated user manual must use an explicit locale filename such as `manual.zh.html`; it must not silently replace the English compatibility entry.

## Genre filtering

The initial release displays canonical English genre labels while retaining Chinese, Japanese, and Korean aliases. Filtering should match a canonical genre ID when available, otherwise an OR set of aliases, rather than comparing only the current display text. Existing normalization data remains intact and can evolve toward:

```text
genre_id → canonical_en → aliases[en|zh|ja|ko]
```

Until canonical IDs are complete, the API may return both original genre values and English display labels. Migration must not rewrite stored source-language values.

## Milestones

- **M1 — Branch, documentation, and schema:** define dual-track boundaries, JSON schemas, compatible migrations, and dictionary scaffolding.
- **M2 — English-first UI:** move fixed template and `app.js` text into dictionaries, default to English, and check missing keys.
- **M3 — Four-locale content persistence:** implement schema migration, locale-specific TMDb details/credits, enrichment/import writes, and fallback behavior.
- **M4 — Locale controls:** independently switch UI and content locales across cards, details, search, and genre filters.
- **M5 — Manual and branch guidance:** deliver the complete canonical English manual, an English compatibility entry, and accurate branch instructions.

## Acceptance boundaries

- `main` commits, default locale, and runtime path remain unchanged.
- The first `i18n` visit defaults both UI locale and content locale to `en`; valid user preferences survive refresh.
- One item can store all four locales. Switching display language never overwrites another translation.
- Existing databases upgrade in place, while legacy fields, source-language data, and old API consumers remain supported.
- Every repository documentation file is English-only; localized UI dictionaries are the intentional exception.
- The repository contains no credentials, databases, personal photos, uploaded media, or recognition output.
