# Admin-Role & Debug-UI Gating — Project Plan

> Apart project, opgespaard tijdens Sprint A. Scope groeide te groot
> voor binnen-Sprint-A behandeling. Wordt opgepakt na de UI/React
> optimalisatie sprint.
>
> Datum bewaard: 2026-04-26

---

## Context

Tijdens Sprint A item 2 hebben we `PromptViewerDialog` + `DebugInfoDialog`
op `TimelineStoryPage` achter `import.meta.env.DEV` gegated, omdat de
audit waarschuwde dat ze prompt-engineering en interne search-traces
exposeerden aan end users.

De eigenaar gebruikt deze dialogs zelf in productie om image-search
debuggen ("waar komt deze foto vandaan?"), dus pure DEV-only is te
streng. We willen ze **admin-only** zichtbaar maken.

Bij verkenning bleek dat scope al snel groot werd zodra "ik wil ook
andere users admin kunnen maken" werd toegevoegd. Daarom: dev-flag is
voor nu teruggedraaid (debug UI is weer zichtbaar voor iedereen, ook
end users — geaccepteerde tijdelijke trade-off). Echte admin-gating
wordt dit aparte project.

---

## Eindstand die we willen

- `is_admin` boolean op `profiles` tabel (default false)
- Frontend `useIsAdmin()` hook die uit `AuthContext` leest
- Debug-dialogs gegated op `useIsAdmin()` ipv `import.meta.env.DEV`
- Admins kunnen andere users promoten/demoten via een knop in
  `AccountPage` (geen aparte route nodig voor v1)
- Eigenaar kan zichzelf bootstrap'en zonder lockout-risico

---

## Architectuur

### Datamodel

`is_admin BOOLEAN NOT NULL DEFAULT FALSE` op `public.profiles`.

Alternatief overwogen: `auth.users.app_metadata.is_admin`. Voordeel:
users kunnen het sowieso niet wijzigen. Nadeel: minder queryable,
minder flexibel als we later "lijst alle admins" UI willen. Keuze
viel op `profiles.is_admin` met column-level GRANT-restrictie omdat
profiles al jouw user-state-tabel is en RLS er al netjes op staat.

### RLS / column-level beveiliging

Bestaande policies op profiles blijven (auth.uid() = id).

Toegevoegd:
```sql
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (avatar_url, display_name, updated_at)
  ON public.profiles TO authenticated;
```

Effect: users kunnen via supabase-js alleen die 3 columns updaten.
Direct `update({ is_admin: true })` faalt met "permission denied for
column is_admin". Service_role (= dashboard SQL editor + edge
functions met service-role key) bypassed alles — dus geen lockout.

### RPC's voor admin-management

Twee SECURITY DEFINER functies, callable door authenticated:

#### `set_admin_status(p_target_email TEXT, p_is_admin BOOLEAN)`

```sql
CREATE OR REPLACE FUNCTION public.set_admin_status(
  p_target_email TEXT,
  p_is_admin BOOLEAN
)
RETURNS TABLE(target_user_id UUID, target_email TEXT, is_admin BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin BOOLEAN;
  v_target_id UUID;
BEGIN
  SELECT p.is_admin INTO v_caller_is_admin
  FROM public.profiles p WHERE p.id = auth.uid();

  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can change admin status';
  END IF;

  SELECT u.id INTO v_target_id
  FROM auth.users u WHERE u.email = p_target_email;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', p_target_email;
  END IF;

  -- Foot-gun bescherming: voorkom self-demote via UI
  IF v_target_id = auth.uid() AND p_is_admin = false THEN
    RAISE EXCEPTION 'You cannot demote yourself; ask another admin or use the SQL editor';
  END IF;

  UPDATE public.profiles
  SET is_admin = p_is_admin
  WHERE id = v_target_id;

  RETURN QUERY
    SELECT p.id, p_target_email, p.is_admin
    FROM public.profiles p
    WHERE p.id = v_target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_admin_status(TEXT, BOOLEAN)
  TO authenticated;
```

#### `list_admins()`

```sql
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(user_id UUID, email TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  ) THEN
    RAISE EXCEPTION 'Only admins can list admins';
  END IF;

  RETURN QUERY
    SELECT u.id, u.email::text, p.display_name
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE p.is_admin = true
    ORDER BY u.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;
```

### Frontend changes

#### `src/contexts/AuthContext.tsx`
- Bij user-mount: fetch `profiles.is_admin` voor huidige user
- `isAdmin: boolean` toevoegen aan context value
- Re-fetch bij `onAuthStateChange` (login/logout/refresh)

#### `src/hooks/useIsAdmin.ts` (nieuw)
```ts
import { useAuth } from '@/contexts/AuthContext';

export function useIsAdmin(): boolean {
  return useAuth().isAdmin;
}
```

Geen DEV/localStorage/URL-param fallback — pure role-check. Tijdens
local dev kun je je eigen account admin maken via Supabase dashboard,
dat werkt ook lokaal als je tegen de prod-DB werkt; voor pure local
TS-builds met een aparte test-DB doe je dat in dezelfde flow.

#### `src/components/account/AdminUserManagement.tsx` (nieuw)
Kaart-component die alleen rendert als `useIsAdmin()` true is.

Bevat:
- Tabel/lijst van huidige admins (uit `list_admins()` RPC)
- Input-veld "email" + knop **Promoot tot admin**
- Per admin een **Demoot**-knop (uitgegrijst voor eigen rij — self-demote-bescherming)
- Toasts bij succes/fout (gebruik bestaande `useToast`)
- Loading-state met `Loader2` (consistent met rest van AccountPage)

#### `src/pages/AccountPage.tsx`
Rendert `<AdminUserManagement />` onderaan, gegated op `useIsAdmin()`.
Geen route-wijzigingen.

#### `src/pages/TimelineStoryPage.tsx`
Callsite swap:
```tsx
{import.meta.env.DEV && events.length > 0 && !isLoading && (
```
wordt:
```tsx
{useIsAdmin() && events.length > 0 && !isLoading && (
```

#### i18n
4 nieuwe keys × 4 talen (~16 entries):
- `admin.sectionTitle` — "Adminbeheer"
- `admin.currentAdmins` — "Huidige admins"
- `admin.promoteEmail` — "Email van nieuwe admin"
- `admin.promoteButton` — "Promoot"
- `admin.demoteButton` — "Demoot"
- `admin.cannotDemoteSelf` — "Je kunt jezelf niet demoten"
- `admin.userNotFound` — "Geen gebruiker gevonden met email {email}"
- `admin.success` — "Gelukt"

---

## Bootstrap (de eerste admin)

`set_admin_status` vereist dat caller al admin is. Dus voor de aller-
eerste admin moet er één keer SQL gedraaid worden in Supabase
dashboard:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'jouw@email.com');
```

Voorwaarde: account moet eerst aangemaakt zijn in de app (anders
bestaat de profiles-rij nog niet door de `handle_new_user` trigger).

Twee bootstrap-opties:
- **A. Hardcoded in migration** — email in git-history, geen
  handwerk na deploy.
- **B. Manueel in dashboard** — geen email in git, jij draait 1 SQL.

Voor closed beta is A prima en scheelt fout-prone handwerk.
Beslissing uit te stellen tot moment van bouw.

---

## Veiligheidschecks

| Aanvalsvector | Mitigatie |
|---|---|
| User probeert direct `update({ is_admin: true })` | Column-level REVOKE → "permission denied for column is_admin" |
| User maakt eigen profiles-rij met is_admin=true | RLS INSERT policy + `handle_new_user` trigger zet default false |
| User leest andermans is_admin | RLS SELECT policy beperkt tot `auth.uid() = id` |
| Niet-admin roept RPC aan | RPC checkt `auth.uid()` is admin, raise exception |
| Admin probeert self-demote via UI | Self-demote guard in RPC |
| User probeert via edge function | Edge functions met anon-key kunnen `is_admin` niet wijzigen |
| JWT token tampering | Supabase signed tokens, kan niet vervalst |
| Email enumeration via list_admins | Vereist al admin-status om RPC te roepen |

---

## Open vragen voor wanneer we dit oppakken

1. **Bootstrap-email**: hardcoded in migration of handmatig in dashboard?
2. **Audit-log**: willen we een `admin_actions_log` tabel die wie wie wanneer promoot/demoot logt? ~10 regels extra, handig voor security-review.
3. **Email zichtbaarheid in `list_admins()`**: emails uit `auth.users` joinen — admin ziet andermans email. Acceptabel binnen admin-cohort?
4. **Verloop & verificatie van email-bevestiging**: als iemand promoot voordat target z'n email heeft bevestigd, gaat het dan goed? Edge case, waarschijnlijk niet relevant voor closed beta.
5. **Eventueel uitbreiden naar meerdere rollen** (moderator, viewer, etc.) — niet nu, design wel zo dat een `role TEXT` of `roles TEXT[]` kolom later makkelijk in de plaats kan komen.

---

## Implementatie-volgorde wanneer dit project wordt opgepakt

1. Migration toepassen (incl. bootstrap als optie A gekozen)
2. AuthContext extension + `useIsAdmin` hook (compileert maar nog
   niet gebruikt — UI nog ongewijzigd)
3. `AdminUserManagement` component + integratie in AccountPage
4. Test: log in als jezelf, maak een tweede test-account admin via
   UI, log in als die, check dat 2e account ook admins kan zien
5. Pas dán de gate op `TimelineStoryPage` swap'en van DEV → useIsAdmin
6. Tijdens deze stap: end-users zien de debug-dialogs niet meer

Inschatting: 1.5–2 uur werk, één PR/commit.

---

## Andere plekken waar `useIsAdmin()` later relevant kan worden

Niet meteen bouwen, wel bewust van zijn:
- Eventuele toekomstige "admin-only" pagina's: blacklist-overzicht,
  user-overzicht, story-moderation
- Spawn van bulk-operaties (mass-regenerate, mass-purge)
- Zichtbaarheid van `RefreshCw`/`handleClearCache` knoppen — nu user-
  visible omdat ze legit zijn, maar zou ook admin-only kunnen
- `AccountPage` zelf — "alle gebruikers" lijst voor manueel beheer

---

## Status

- ⏸️ Geparkeerd na Sprint A
- 🎯 Op te pakken **na** UI/React optimalisatie sprint
- 📌 Tussentijds: debug-dialogs zijn weer zichtbaar voor iedereen
  (geaccepteerde trade-off totdat dit project landt)
