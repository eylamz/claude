# RCE & Security Audit (Next.js)

**Date:** 2025-03-04  
**Scope:** Remote Code Execution (RCE) and related server-side patterns.

## Summary

- **Classic RCE patterns:** None found (no `eval`, `new Function`, `child_process`, `vm`, or dynamic `require`/`import` with user input).
- **Issues found and addressed:** Information disclosure in icons API; unescaped user input in MongoDB `$regex` (ReDoS / regex injection risk).

---

## What Was Checked

| Pattern | Result |
|--------|--------|
| `eval()`, `new Function()` | None in app/lib source |
| `child_process` (exec/spawn/execSync/spawnSync) | Not used |
| `vm.runInNewContext` / `vm.runInThisContext` | Not used |
| Dynamic `require(path)` or `import(path)` with user input | i18n uses `currentLocale` only after allowlist check (`locales.includes`) |
| `readFile`/path with user input | `/api/icons/[name]` – path built from `iconName`; **validated** with `/^[a-zA-Z0-9-_]+$/` (no `..`), so path traversal blocked |
| Server actions (`'use server'`) | Only `lib/actions/auth.ts` – uses validated email/password and Mongoose; no code execution |
| Raw request body passed to `.find()`/queries | Not found; filters are built from parsed params |

---

## Fixes Applied

### 1. Icons API – information disclosure

- **File:** `app/api/icons/[name]/route.ts`
- **Issue:** 404 response included `path: iconsPath`, exposing server filesystem path.
- **Fix:** Removed `path` from the JSON response; error is still logged server-side only.

### 2. MongoDB `$regex` – ReDoS / regex injection

- **Issue:** Admin and search routes pass user-controlled `search` (or `q`) directly into `$regex`, which can lead to:
  - **ReDoS** (e.g. `(a+)+$` causing long runtimes),
  - **Broader matching** (e.g. `.*`).
- **Fix:**
  - Added `lib/security/regex.ts` with `escapeRegexForMongo()`.
  - Updated `app/api/admin/events/route.ts` to use it for the `search` parameter.

### 3. Other routes to harden (same pattern)

Use `escapeRegexForMongo(search)` (or equivalent) for any user-controlled string passed to `$regex` in:

- `app/api/admin/forms/route.ts` (search)
- `app/api/admin/guides/route.ts` (search)
- `app/api/admin/products/route.ts` (search)
- `app/api/admin/reviews/route.ts` (search)
- `app/api/admin/skateparks/route.ts` (search)
- `app/api/admin/trainers/route.ts` (search)
- `app/api/admin/users/route.ts` (search)
- `app/api/admin/newsletter/route.ts` (search)
- `app/api/trainers/route.ts` (search / flippedQ)
- `app/api/orders/route.ts` (orderNumber – consider escape or strict format)
- `app/api/search/route.ts` (query / flippedQuery – already length-limited; add escape for defense in depth)
- `lib/api/guides.ts` (search)

---

## Other Notes

- **`dangerouslySetInnerHTML`:** Used with `JSON.stringify(structuredData)`, static SVG strings, or allowlisted icon names; no user HTML injected. Keep any future use to trusted/sanitized content only.
- **Droplet compromise:** If the server was hacked, the vector may be outside this repo (e.g. SSH, weak credentials, vulnerable OS/stack, another service). Rotate all secrets, reimage the droplet, and audit SSH/access and running processes.

---

## Recommendation

1. Apply `escapeRegexForMongo()` (or equivalent) to every place that passes user input into `$regex` (see list above).
2. Rotate secrets (DB, NEXTAUTH_SECRET, API keys, etc.) and ensure `.env` is not in repo or backups.
3. Harden the droplet: disable password auth for SSH, use fail2ban, keep OS and Node/Next.js updated, and run only necessary services.
