\---

title: 'Brand Customization — Admin Configurable App Name, Logo \& PWA Icon'
type: 'feature'
created: '2026-06-08'
status: 'done'
baseline_commit: 'e8145991a827b335cbf848d049b653a9ac1eb191'
context: \[]
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app name ("DMS Borno"), header logo, login page text, footer text, PWA manifest title/icons, and HTML meta tags are all hardcoded across 9+ files. Admins cannot customize branding without editing code.

**Approach:** Extend the existing `SystemSetting` model and `/api/v1/system/settings` API with a new `"branding"` section holding `appName`, `appDescription`, `headerIconUrl`, and `pwaIconUrl`. Create an admin branding page with live preview and icon upload (using existing MinIO/S3 storage service). Wire all consumer files to read from a new `useBranding()` hook instead of hardcoded strings.

## Boundaries \& Constraints

**Always:**

* Use the existing `SystemSetting` model (`prisma/system\_settings` table, `section+key` uniqueness) — no schema migration needed.
* Use the existing `StorageService` for icon uploads — add a `branding` path to `STORAGE\_PATHS`.
* Use the existing `/api/v1/system/settings` GET/PUT endpoints — extend `SETTINGS\_DEFAULTS` with a `branding` section.
* Branding values must have sensible hardcoded fallbacks so the app renders correctly before any admin configuration.
* The dynamic manifest must be served from `/api/v1/manifest` (Next.js API route returning JSON from DB with static fallback).
* `useBranding()` hook must cache aggressively (React Query with `staleTime: 5min`) to avoid layout shift on every navigation.

**Ask First:**

* If `sharp` is not already a dependency and icon resize is needed — confirm whether to add it or accept single-size uploads.
* If the login page needs the branding API call to be server-side (to avoid flash of default content).

**Never:**

* Do not create a new DB table or Prisma model for branding — extend existing settings.
* Do not remove the static `public/manifest.json` — keep it as the build-time fallback.
* Do not modify the PWA service worker to intercept manifest requests — just change the manifest link URL.

## I/O \& Edge-Case Matrix

|Scenario|Input / State|Expected Output / Behavior|Error Handling|
|-|-|-|-|
|Admin updates app name|PUT `{ section: "branding", settings: { appName: "NERMS Kano" } }`|All UI surfaces show "NERMS Kano" immediately (after cache invalidation)|400 if appName is empty string|
|Admin uploads PWA icon|POST icon file (PNG, 512x512 min)|File stored in MinIO at `branding/pwa-icon-{hash}.png`, URL saved in settings|400 if file > 2MB or not PNG/JPG/SVG|
|App loads with no branding configured|No `branding` section in DB|Fallback to hardcoded defaults ("DMS Borno", existing icons)|N/A|
|Dynamic manifest requested|GET `/api/v1/manifest`|Returns manifest JSON with DB values, falls back to static defaults|Returns static manifest on DB error|
|Unauthenticated user hits manifest|GET `/api/v1/manifest`|Returns manifest (no auth required for install prompt to work)|N/A|

</frozen-after-approval>

## Code Map

* `src/app/api/v1/system/settings/route.ts` -- existing settings API; add `branding` defaults
* `src/app/api/v1/manifest/route.ts` -- new dynamic manifest endpoint
* `src/app/api/v1/system/branding/upload/route.ts` -- new icon upload endpoint
* `src/lib/storage/paths.ts` -- add `branding` storage path
* `src/hooks/useBranding.ts` -- new hook wrapping React Query for branding settings
* `src/components/shared/Header.tsx` -- replace hardcoded "DMS Borno" with hook value
* `src/components/layouts/AppShell.tsx` -- replace hardcoded "DMS Borno" with hook value
* `src/app/login/page.tsx` -- replace hardcoded title/description with hook values
* `src/app/layout.tsx` -- use `generateMetadata()` for dynamic title/meta; update footer text; change manifest link to `/api/v1/manifest`
* `src/app/(auth)/admin/settings/branding/page.tsx` -- new admin branding config page with preview
* `public/manifest.json` -- kept as build-time fallback

## Tasks \& Acceptance

**Execution:**

* \[x] `src/lib/storage/paths.ts` -- add `branding: 'branding'` to `STORAGE\_PATHS`
* \[x] `src/app/api/v1/system/settings/route.ts` -- add `branding` section to `SETTINGS\_DEFAULTS` with `appName`, `appDescription`, `headerIconUrl`, `pwaIconUrl` keys and current hardcoded defaults
* \[x] `src/app/api/v1/system/branding/upload/route.ts` -- create icon upload endpoint: accept `FormData` with `file` (PNG/JPG/SVG, max 2MB), store via `storageService.uploadBuffer()` under `branding/` prefix, return `{ url }`
* \[x] `src/app/api/v1/manifest/route.ts` -- create GET handler that reads branding settings from DB and returns a Web App Manifest JSON with dynamic `name`, `short\_name`, `icons` (pointing to uploaded pwaIconUrl or fallback), `description`; skip auth (public); fallback to static defaults on error
* \[x] `src/hooks/useBranding.ts` -- create hook using `useQuery` to fetch `GET /api/v1/system/settings`, extract `branding` section, merge with defaults, return `{ appName, appDescription, headerIconUrl, pwaIconUrl }`; `staleTime: 5 minutes`
* \[x] `src/components/shared/Header.tsx` -- replace hardcoded "DMS Borno" with `useBranding().appName`; conditionally render `headerIconUrl` as `<img>` next to text if set
* \[x] `src/components/layouts/AppShell.tsx` -- same: replace hardcoded "DMS Borno" with branding hook
* \[x] `src/app/login/page.tsx` -- replace hardcoded title/description with branding hook values
* \[x] `src/app/layout.tsx` -- convert `metadata` export to `generateMetadata()` that reads branding from DB (server-side); change manifest link from `/manifest.json` to `/api/v1/manifest`; update footer to use branding; keep `appleWebApp` title dynamic
* \[x] `src/app/(auth)/admin/settings/branding/page.tsx` -- create admin page with: text inputs for appName and appDescription; file upload for header icon; file upload for PWA icon; live preview card showing header + title as it will appear; save button calling `PUT /api/v1/system/settings` with `section: "branding"`; wrap in `<RoleBasedRoute requiredRole="ADMIN">`

**Acceptance Criteria:**

* Given an admin updates appName to "NERMS Kano", when any page loads, then the header, login page, footer, browser title, and manifest all show "NERMS Kano"
* Given an admin uploads a PWA icon, when a user installs the PWA, then the installed app uses the uploaded icon
* Given no branding has been configured, when the app loads, then all surfaces show current defaults ("DRMS", existing icons) with no errors
* Given the branding API is unreachable, when the app loads, then the UI renders with hardcoded fallback values (no crash, no layout shift)

## Spec Change Log

## Design Notes

**Branding data flow:**

```
DB (system\_settings, section="branding")
  ↓ GET /api/v1/system/settings
  ↓ useBranding() hook (React Query, 5min staleTime)
  → Header, Login, AppShell (client components)
  
DB → generateMetadata() (server component, root layout)
DB → /api/v1/manifest (public API route)
```

**Why `generateMetadata()` for the root layout:** The root `layout.tsx` is a server component. Using `generateMetadata()` allows reading branding from DB at request time without client-side flash. This gives correct `<title>`, `<meta>`, and manifest link on first load.

**Why `/api/v1/manifest` instead of intercepting with SW:** Simpler, standards-compliant, works on all browsers. The static `public/manifest.json` remains as fallback if the API fails.

**Icon upload:** Single file upload (no client-side resizing). The admin page validates file type and size server-side. The uploaded file is stored at `branding/pwa-icon-{hash}.{ext}` in MinIO and the URL is saved in settings. All manifest icon sizes point to this single URL (browsers scale automatically for install prompt).

## Verification

**Commands:**

* `npx next build` -- expected: clean build with no errors
* `npx prisma generate` -- expected: no schema changes needed

**Manual checks:**

* Navigate to `/admin/settings/branding`, update appName, verify header/login/footer/title update after page refresh
* Upload a PWA icon, verify `/api/v1/manifest` returns the new icon URL
* With no branding configured, verify all surfaces show "DMS Borno" defaults

## Suggested Review Order

**Branding data layer — settings, storage, public API**

- Branding defaults added to settings section alongside general/security/notifications
  [`route.ts:35`](../../src/app/api/v1/system/settings/route.ts#L35)

- Storage path for branding icon uploads
  [`paths.ts:9`](../../src/lib/storage/paths.ts#L9)

- Public branding endpoint (no auth) — returns only branding fields from DB
  [`route.ts:13`](../../src/app/api/v1/system/branding/route.ts#L13)

- Icon upload endpoint — validates type/size, stores via StorageService
  [`route.ts:9`](../../src/app/api/v1/system/branding/upload/route.ts#L9)

- Dynamic PWA manifest — reads branding from DB, falls back to static defaults
  [`route.ts:32`](../../src/app/api/v1/manifest/route.ts#L32)

**Client-side branding consumption**

- React Query hook fetching public branding endpoint with 5min staleTime
  [`useBranding.ts:20`](../../src/hooks/useBranding.ts#L20)

- Header component — renders appName and optional header icon from hook
  [`Header.tsx:43`](../../src/components/shared/Header.tsx#L43)

- AppShell sidebar — same branding hook for sidebar logo/name
  [`AppShell.tsx:104`](../../src/components/layouts/AppShell.tsx#L104)

- Login page — client component using hook for dynamic title/description
  [`page.tsx:7`](../../src/app/login/page.tsx#L7)

- Branded footer — client component showing appName in footer
  [`BrandedFooter.tsx:6`](../../src/components/shared/BrandedFooter.tsx#L6)

**Server-side metadata**

- Root layout generateMetadata() — reads branding from DB for SSR title/manifest
  [`layout.tsx:16`](../../src/app/layout.tsx#L16)

**Admin configuration UI**

- Branding settings page with live preview, icon upload, save/discard
  [`page.tsx:39`](../../src/app/(auth)/admin/settings/branding/page.tsx#L39)

