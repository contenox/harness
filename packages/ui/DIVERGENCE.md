# Divergences from upstream `@contenox/ui`

This copy was adopted from the CRM console's vendored snapshot
(`crm@2e80749`, `crm/packages/ui`), which is a superset of the previous copy in
this repository: 21 additional components, their stories and 35 component tests.
Everything below the "CRM divergences" heading is that snapshot's own record,
kept verbatim so a future re-sync knows what was intentional there.

## Our edits on top of the CRM snapshot

- `package.json` — `@contenox/acp-client` is a local `file:../acp-client` link
  (this repository has no npm workspace root), so the ACP session components
  resolve against the copy in `packages/acp-client`.
- `src/components/chat/ChatComposer.tsx` — dropped an unused `Panel` import the
  harness's stricter `noUnusedLocals` typecheck flagged.
- `src/product/session/workspace/FileCanvas.tsx` — two raw palette classes
  (`text-red-600 dark:text-red-400`) became the semantic
  `text-error dark:text-dark-error`; the harness design-token guard rejects raw
  palette usage inside the library.
- `src/session-state.ts` + `./session-state` export — the ACP reducers get their
  own entry. The `./session` entry is the product surface and pulls the whole
  component tree (and Monaco with it); the harness controller only needs state,
  and importing state through `./session` dragged the editor into controller
  tests.
- `src/session-lib.ts` + `./session-lib` export — the pure config-option
  mapping helpers, for the same reason (no React, no editor).
- `product/session/workspace/` — the relay client's workbench ported in: its
  newer `fileCanvasState` reducer (`close_within`), `FileCanvas` with
  `TreeEntryRef`/`FileTreeManagement`, `SessionWorkspaceLayout` and
  `useSessionWorkspace`. The app hooks were inverted into a
  `SessionWorkspaceSource` parameter (list/read/write + the listing cache) so the
  library never imports app state; `lib/workspaceTree` gained the relay's
  `isWithin`/`parentDir`/`replaceDirectory` helpers, and `lib/useMediaQuery`
  was added for the wide/narrow pane split.
- `src/session-workspace.ts` + `./session-workspace` export — the workbench entry
  above (it carries Monaco, so it stays out of the chat entry).
- `src/session-ui.ts` + `./session-ui` export — the session shell components
  (transcript, config bar, permission ask, composer, pickers) **without**
  `product/session/workspace`. Importing the full `./session` entry put Monaco
  and its workers into the harness chat chunk (17 MB build, 66 s); the narrow
  entry keeps the app at 2 MB and 11 s.
- `package.json` — the `@contenox/acp-client` range is a local
  `file:../acp-client` link here (no npm workspace root in this repository).


This package is vendored. The design system is adopted, never authored here, so
every edit made to it in this repository is listed below and a re-sync reapplies
exactly this list. An entry
here is a cost paid on every future sync — keep the list short. Reusable visual
compositions belong in this package; components coupled to application hooks,
routes, API types, or account state remain in `app/src/components/`.

`src/index.css` is this app's ONE source of truth for styling: its `@theme`
block is the only place a colour, spacing step, radius, font or easing is
defined, and `app/src/app.css` consumes those tokens without redefining any.
Three of the six entries below exist to make that true.

## `src/index.ts` — the stylesheet is not a module side effect

**Upstream:** line 1 is `import "./index.css";`, so importing any component
pulls the whole design system's stylesheet into the JS module graph.

**Here:** that import is gone. The stylesheet is reached only through
`app/src/app.css`, which does `@import '@contenox/ui/theme.css'` (the
`./theme.css` export, which points at this same file). Storybook's
`.storybook/preview.ts` already imports `../src/index.css` explicitly and is
unaffected.

**Why:** with both entry paths live, Tailwind compiled this file **twice** — once
inlined into `app.css`, once as its own module — and Vite injected the second
`<style>` after the first. Both wrote `:root` in `@layer theme`, so the
package's own values beat the app's on document order, and every primary control
rendered in the package's indigo no matter what the app declared. Worse, `vite
build` collapsed the two while `vite dev` did not, so the development server and
the production bundle disagreed about the palette and neither was obviously
wrong. Two stylesheets is two sources of truth; the app owns the entry point.

**On sync:** delete the import again. If upstream ever moves to a `theme.css`
that is not also the module's side effect, drop this entry.

## `src/index.css` — the accent is the brand's, and does not flip

**Upstream:** `--color-primary-*` is an indigo ramp (`#6366f1` at 500), `.dark`
re-points all eleven `--color-primary-*` tokens plus `--color-primary` and
`--color-brand` at the neutral `--color-dark-primary-*` ladder, the two
`--color-gradientEnd` tokens are the literal `#3730a3`, and there is no
`--font-sans`.

**Here:**

- the primary ramp is the mint from `runtime/website/src/styles/tokens.css`,
  copied stop for stop, plus the `950` the site also defines;
- the `.dark` block no longer re-points the primary ramp. `--color-dark-primary-*`
  stays exactly as upstream has it and still serves everything that asks for it
  by name — `dark:text-dark-primary`, `:focus-visible`'s dark outline,
  `--color-dark-text-primary`;
- both gradient end stops are `var(--color-primary-800)`;
- `--font-sans` is added, matching `--font-body`.

**Why:** indigo is not in this product's palette — contenox.com is mint — and the
site defines that accent **once**: its call to action is
`from-primary-500 to-primary-700` in both schemes, and only accent *text* walks
the ramp (`text-primary-700` light, `dark:text-primary-400`). Inverting the whole
ramp to the neutral ladder under `.dark` is what left this app with a white
button on black and a brand that only existed in the light scheme. The site's
own comment — dark primary is the neutral-white used for *text* and for the focus
ring, the accent stays on the CTA — is preserved by keeping the neutral ladder
and dropping only the re-point.

`--font-sans` is added because Tailwind's own preflight resolves through it: left
at Tailwind's default stack, the body ran Outfit while everything the `font-sans`
utility touched ran the OS font.

**On sync:** take upstream's file and reapply the mint stops, the deletion of the
primary block inside `.dark`, the two gradient stops, and `--font-sans`.

## `src/index.css` — the type is served from this origin

**Upstream:** lines 1 and 2 are
`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap')`
and the same for `JetBrains+Mono:wght@400;500`, and the four font tokens name
those two families: `--font-sans`, `--font-display` and `--font-body` are
`"Outfit", …` and `--font-mono` is `"JetBrains Mono", …`.

**Here:** both `@import url(...)` lines are gone and the four tokens name the two
faces `fonts.css` declares — `"Geist"` and `"Geist Mono"` — keeping the same
fallback stacks.

**Why:** those two lines shipped in the built CSS, so every page load made an
uncredentialed cross-origin request to Google carrying the visitor's IP, User-
Agent and `Referer` — a third party in a product whose position is that it has
none, and one contradicting the same-origin property `app/src/lib/http.ts`
asserts (docs/internal/audit-2026-08-08.md, finding 15). Deleting the imports
alone is not the fix: the tokens would then name families nothing declares,
which is not an error at any layer — it renders in `system-ui` and reports
nothing. The faces the product actually owns are already vendored under
`app/public/fonts` and already declared in `fonts.css`; the tokens now point at
them, which is what makes the deletion visible rather than silent.

**On sync:** delete both `@import url(...)` lines again and repoint the four
font tokens. `npm run verify:bundle` fails if a `fonts.googleapis.com` or
`fonts.gstatic.com` reference returns to `dist/`.

## `src/components/Button.tsx` — `danger` is a button, and primary ends darker

**Upstream:** the danger variant is `bg-transparent`, `text-error
dark:text-dark-error`, `hover:bg-error/10 dark:hover:bg-dark-error/10` — no
border, no fill, no chrome of any kind. The primary palette's gradient runs
`from-primary-500 to-primary-600` with `hover:from-primary-400
hover:to-primary-500`, restated verbatim behind `dark:` variants.

**Here:** danger gains `border border-error-300 dark:border-dark-error-400`,
`bg-error-50 dark:bg-dark-error-50`, `text-error-700 dark:text-dark-error-800`
and `hover:bg-error-100 dark:hover:bg-dark-error-100`. The primary gradient ends
at `to-primary-700` (`hover:to-primary-600`, `disabled:hover:to-primary-700`) and
the `dark:` restatements are removed.

**Why:** a permission request renders the agent's options as buttons, and with no
chrome the reject option was bare red text under two filled buttons — the one
control on the screen that must not be mistaken for a link was the least tappable
thing on it. Tonal rather than solid keeps it clearly subordinate to the primary
action, which is what an emphasis scale is for. `to-primary-700` is the site's
own CTA end stop; against mint, `to-primary-600` left white label text washed
out. The `dark:` restatements named the same stops as the base classes and became
pure duplication once the ramp stopped flipping.

**On sync:** reapply both. If upstream gives `danger` real chrome, take
upstream's spelling and drop that half of the entry.

## `src/components/FormField.tsx` — the label names the control

**Upstream:** the `Label` is rendered with no `htmlFor` and nothing gives the
control an accessible name, so the label is merely adjacent text: a screen reader
announces an unlabelled field, tapping the word does not focus the input, and
`getByLabel('Email')` finds nothing.

**Here:** the field owns an id — the new optional `htmlFor` prop, or one from
`useId()` — puts it on the `Label`, and clones it onto the single child element.
A child that already carries an `id` keeps it.

**Why:** it is an accessibility failure, and fixing it in the primitive fixes
every consumer rather than making each screen restate the pair. Cloning is what
lets `<FormField label="Email"><Input …/></FormField>` — the shape every caller
already uses — stay unchanged.

**On sync:** reapply. `app/test/e2e/harness.ts` addresses fields by label and
depends on it.

## `src/components/Card.tsx` — the hover lift is opt-in

**Upstream:** `hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-lg
hover:shadow-indigo-500/10 dark:hover:border-indigo-400/30` sit in Card's base
class list, so they reach every variant.

**Here:** those classes moved behind an `interactive` prop that defaults to
`false`, and the accent moved from the hardcoded `indigo-*` to the theme's
`primary-*` ramp.

**Why:** every screen in this app renders `<Card variant="filled">` as a static
container — the sign-in card, the pairing-key panel, the hosts list, the account
panel. All of them lifted 4px whenever the pointer crossed them, which moves a
password field out from under the cursor and a six-character pairing key out
from under the eye. Only `HostPickerPage`'s reachable host rows are genuinely
clickable, and they pass `interactive`.

The `primary-*` ramp is this app's brand accent; `indigo-*` is no longer in the
palette. No `dark:` variant is needed where upstream had one.

**On sync:** keep the prop and keep its default off. If upstream ever makes the
lift opt-in itself, drop this entry and take upstream's spelling.

## `src/components/EmptyState.tsx` — an empty state can carry its own next step

**Upstream:** the props are exactly `title`, `subtitle`, `description`, `icon`,
`className`, `orientation`, `iconSize`, `variant` — no children, no action slot
of any kind — and the render is icon, subtitle, description, nothing else.

**Here:** an optional `children` prop, rendered after the description in a
`mt-6 flex flex-col gap-3` block that follows the orientation's alignment.
Nothing else about the component changed.

**Why:** every empty state in this app greets a NEW user, and without a slot for
an action none of them could carry the step that fills the emptiness — "no
machines paired" had no way to hold the install path, which is the audit's
finding 8 (`docs/internal/gap-audit-2026-08-11.md`): a fresh signup dead-ends on
screens that describe what is missing and cannot offer the way out.

**On sync:** reapply the prop and the block. If upstream grows its own action
slot, take upstream's spelling and drop this entry.

## `src/components/chat/ChatComposer.tsx` — the focus glow follows the accent

**Upstream:** the focused composer's glow is written as a literal
`rgba(99,102,241,…)` in four arbitrary `shadow-[…]` values — indigo 500, spelt
out, next to `ring-primary-500` utilities that do read the theme.

**Here:** those four are `color-mix(in oklab, var(--color-primary-500) N%,
transparent)` at the same percentages and the same geometry.

**Why:** it is the last hardcoded colour in a component this app renders on every
session screen, and it was the reason the composer still glowed indigo after the
palette changed. Same class of bug as Card's `indigo-*`.

**On sync:** reapply.

## `src/components/Select.tsx` — an option can be disabled

**Upstream:** `options: Array<{ value: string; label: string }>`, and the
render maps each entry to a `SelectOption` with only `key`, `value` and the
label — `SelectOption` itself already spreads
`React.OptionHTMLAttributes<HTMLOptionElement>`, so the capability exists one
layer down and the `options` array simply cannot reach it.

**Here:** the entry type gains `disabled?: boolean` and the map passes it
through: `<SelectOption … disabled={option.disabled}>`.

**Why:** the consumers screen offers session mode "reused" as a visible but
disabled option — the wire contract keeps the value while creation refuses it,
and a picker that hid the option would hide that the mode exists. A native
`<option disabled>` is the one way a `<select>` can say "exists, not now";
without this the only alternative was rebuilding the picker outside the
package.

**On sync:** reapply, or drop this entry if upstream's `options` entries have
grown a `disabled` field.

## Known, deliberately not diverged

- `Card`'s `default` variant paints `bg-white/80` / `border-neutral-200/60` and
  their dark twins. Those are Tailwind's own palette, and they are letter for
  letter contenox.com's card. Every `Card` in this app is `variant="filled"`,
  which is on the surface ramp.
- `Dialog`'s overlay is `bg-black/50`. A scrim is not a brand colour.
- `WorkflowVisualizer` has a `ring-fuchsia-500` debug ring behind a `debug` prop.
  Unreachable from this app.
- `TypographyProps` declares an `id` prop that none of the components render.
  Nothing here needs it yet.
