# Archive — older homepage iterations

These files are **not in production routes** and **not bundled** (nothing in
`src/` imports from this directory). They are kept here for reference, in
case any UI patterns need to be salvaged or restored.

## What's here

| File | What it was |
|---|---|
| `HomeV2.tsx` | Earlier homepage iteration. Used the `v2/` companion components below. Was wired at `/home-v2`. |
| `Index.tsx` | "home-v4" iteration — split from HomeV3 line. Was wired at `/home-v4`. Imports active components from `@/components/*` (DateInput, SubcultureSelector, etc.); those imports still resolve. |
| `v2/` | Companion components for HomeV2 only (RetroDateInput, PhaseSelector, IdentityForm, ChapterIndicator, NostalgicLoading, PaperTexture, TimeDial, plus the never-rendered OccasionSelector and SubjectSelector). |
| `ImageBlacklistButton.tsx` | Standalone "ban this image" button. Was never imported anywhere — DebugInfoDialog has its own inline blacklist button instead. Original component was marked `TEMPORARY: dev only` in its file header. |

## What was removed from `App.tsx`

- `import Index from "./pages/Index";`
- `import HomeV2 from "./pages/HomeV2";`
- The three explicit `<Route>` entries for `/home-v2`, `/home-v3`, `/home-v4`.

The three URL paths now `<Navigate to="/" replace />` so old bookmarks land
on the live homepage instead of 404.

## Notes for future you

- **i18n keys** specific to HomeV2 (PhaseSelector etc.) are still in
  `src/lib/i18n.ts`. Left intentionally — needed if HomeV2 is ever restored.
- **HomeV2 imports** were rewritten from `@/components/v2/X` to `./v2/X` so
  the archived copy still type-checks if you `npm run typecheck`.
- **Bundle impact**: zero. Vite tree-shakes anything not reachable from the
  active import graph, so these files do not ship.
- If you want to genuinely delete this archive later: `rm -rf src/pages/_archive`,
  remove the three `<Navigate>` routes from `App.tsx`, and prune the
  HomeV2-specific keys from `src/lib/i18n.ts`.

## Why park instead of delete

- Recoverability if a layout decision needs revisiting.
- Less destructive in code review (renames are obvious; deletions across
  10+ files less so).
- Keeps git history clean — `git log --follow` still works on the moved files.
