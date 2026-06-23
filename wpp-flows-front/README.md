# Conecta— WhatsApp Chatbots for Restaurants

A production-quality SaaS frontend for managing WhatsApp restaurant chatbots
powered by the Evolution API. Built with **Vite + React + TypeScript**.

> Backend is intentionally not wired in. Every API call goes through a
> service layer with mocked async responses so the real Evolution API can be
> dropped in by changing one file (`src/instances/api.ts`).

---

## Stack

| Concern      | Tool                              |
| ------------ | --------------------------------- |
| Build / dev  | Vite 5                            |
| Framework    | React 18 + TypeScript (strict)    |
| Routing      | React Router 6 (lazy routes)      |
| Server state | TanStack Query 5                  |
| Client state | Zustand 5 (+ persist middleware)  |
| Forms        | React Hook Form 7                 |
| Validation   | Zod 3                             |
| Styling      | Tailwind CSS 3 (dark mode: class) |
| Icons        | Lucide React                      |

## Scripts

```bash
npm install
npm run dev        # vite dev server on http://localhost:5173
npm run build      # tsc -b && vite build → /dist
npm run preview    # preview the production build
```

Demo credentials (any 8+ char password works):

```
marina@trattoria-bellini.com
mesademo2026
```

---

## Folder structure

```
src/
├── app/                 # Application root (App.tsx, router.tsx)
├── assets/              # Static assets
├── components/
│   ├── ui/              # Reusable design-system primitives
│   ├── layout/          # AppShell, Sidebar, Topbar, RouteGuards
│   └── feedback/        # Toaster, StatusBadge
├── constants/           # APP_CONFIG, ROUTES, STORAGE_KEYS, navigation
├── context/             # (reserved for future React contexts)
├── hooks/               # useTheme, useAuth, useDebouncedValue, useMediaQuery
├── instances/           # api.ts (mock fetch), storage.ts (localStorage wrapper)
├── lib/                 # utils (cn, formatCurrency...), queryClient, schemas (zod)
├── pages/
│   ├── login/           # LoginPage
│   ├── dashboard/       # DashboardPage + components/
│   ├── bots/            # BotsPage + components/
│   ├── menu/            # MenuPage + components/
│   ├── flows/           # FlowsPage + components/
│   ├── conversations/   # ConversationsPage + components/
│   └── settings/        # SettingsPage
├── providers/           # AppProviders, QueryProvider, ThemeProvider
├── services/            # authService, botService, menuService, flowService,
│                        #   chatService, dashboardService (all mocked)
├── stores/              # authStore, themeStore, uiStore (toasts, sidebar)
├── styles/              # globals.css (design tokens + base styles)
├── types/               # Strong types per domain
└── utils/               # (reserved for ad-hoc utilities)
```

The structure is **feature-based at the page level** (each `/pages/<feature>`
owns its own components) and **type-based at the framework level**
(`/components/ui` for primitives, `/services` for API, `/stores` for state).
This keeps page-specific code colocated while shared infrastructure stays in
predictable global folders.

---

## Architecture

### Service layer (the only thing that touches "the network")

Every domain service goes through `apiCall()` in
[`src/instances/api.ts`](src/instances/api.ts):

```ts
export async function apiCall<TResult>(opts, resolver) {
  await sleep(API_LATENCY_MS + jitter);
  if (opts.shouldFail) throw new ApiError(...);
  return resolver();
}
```

Today, the resolver returns mocked data (and writes through `localStorage`
so changes survive reloads). To migrate to the real backend you only need
to swap `apiCall` to dispatch fetch/axios — every caller is already
async/await ready.

Services exposed:

| Service            | Mock-replaceable methods                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authService`      | `login`, `logout`, `me`                                                                                                                            |
| `botService`       | `list`, `getById`, `create`, `update`, `remove`, `connect`, `disconnect`                                                                           |
| `menuService`      | `listCategories`, `listItems`, `createCategory`, `updateCategory`, `removeCategory`, `reorderCategories`, `createItem`, `updateItem`, `removeItem` |
| `flowService`      | `list`, `getById`, `create`, `update`, `remove`, `saveSteps`                                                                                       |
| `chatService`      | `list`, `getById`, `listMessages`, `sendMessage`, `updateStatus`                                                                                   |
| `dashboardService` | `getStats`                                                                                                                                         |

### State

- **Server state** — TanStack Query. Each domain has a
  centralized `queryKeys` object in `src/lib/queryClient.ts` so all
  invalidations are typed and traceable.
- **Client state** — Zustand. Three stores:
  - `authStore` — current user/session (rehydrated from `localStorage` on bootstrap)
  - `themeStore` — light / dark / system (with persist middleware)
  - `uiStore` — sidebar open state + toast queue (also exposes a `toast` helper)
- **Forms** — React Hook Form + Zod resolver. All schemas live in
  `src/lib/schemas.ts`.

### Routing

`src/app/router.tsx` declares lazy routes guarded by:

- `<RequireAuth />` — wraps the app shell. Redirects to `/login` when
  unauthenticated.
- `<RedirectIfAuthenticated />` — wraps `/login`. Sends authenticated users
  back to the dashboard.

Routes:

```
/login                  →  Login (mock-authed)
/                       →  Dashboard
/bots                   →  Bot management
/menu                   →  Menu management
/flows                  →  Flow builder
/conversations          →  Conversations
/settings               →  Settings
```

---

## Design System

The visual language is inspired by the **Apple** and **Vercel** references in
`context/design/references` — quiet, utilitarian, near-monochrome with a
single accent color and generous breathing room.

### Tokens (`src/styles/globals.css`)

CSS custom properties drive every color, with a parallel dark-mode set under
`.dark`. Tailwind reads them through HSL channel variables so any component
can express e.g. `bg-primary/10` and stay theme-correct in both modes.

| Token           | Light                  | Dark             | Use                      |
| --------------- | ---------------------- | ---------------- | ------------------------ |
| `--primary`     | hsl(152 60% 36%) green | hsl(152 56% 48%) | Brand accent, all CTAs   |
| `--background`  | hsl(0 0% 100%)         | hsl(224 14% 6%)  | Page canvas              |
| `--card`        | hsl(0 0% 100%)         | hsl(224 14% 8%)  | Surfaces                 |
| `--muted`       | hsl(220 14% 96%)       | hsl(224 12% 14%) | Subtle surfaces          |
| `--border`      | hsl(220 13% 91%)       | hsl(224 12% 16%) | Hairlines                |
| `--success`     | hsl(152 60% 36%)       | hsl(152 56% 48%) | Online status, confirms  |
| `--warning`     | hsl(38 92% 50%)        | hsl(38 92% 58%)  | Connecting, hidden items |
| `--destructive` | hsl(358 75% 55%)       | hsl(358 75% 60%) | Errors, deletes          |
| `--info`        | hsl(212 96% 52%)       | hsl(212 96% 58%) | Informational badges     |

Plus `*-soft` variants (10% tinted backgrounds for badges) and
`*-foreground` (text-on-color).

### Typography

- **Body**: Inter via Google Fonts (`-0.011em` letter-spacing for the "Apple-tight" feel).
- **Display headings**: same family, weight 600, `-0.022em` letter-spacing,
  `text-balance` for clean line breaks.
- **Mono**: JetBrains Mono — used in IDs, JSON preview, phone numbers.
- Three weights only: 400 / 500 / 600. (Vercel-style discipline.)

### Shapes & elevation

- Radii: 6/8/12/16px (`rounded-md/lg/xl`). Inputs and cards use 12px;
  pill shapes use `rounded-full`.
- Shadows: a single soft system (`shadow-soft-sm/md/lg`) with a 1px
  border-shadow stack — the Vercel "shadow-as-border" technique applied
  through Tailwind tokens.
- Elevation only when content needs to "lift": modals, dropdowns,
  active stat cards.

### Motion

All transitions stay between 150–220ms with `ease-out`. Keyframes:
`fade-in`, `fade-in-up`, `scale-in`, `slide-in-right`, `pulse-soft`,
`shimmer` (for skeletons). Buttons compress on press
(`active:scale-[0.98]`).

### Components — what's reusable

`src/components/ui/`:

- `Button`, `IconButton` — 6 variants, 5 sizes, loading and icon states.
- `Input`, `Textarea`, `Select` — uniform 40px height, accessible focus rings,
  `invalid` prop drives the error styling.
- `Label`, `FormField` — wires label, hint and error message in one place.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Badge` (6 tones, optional pulsing dot) — `StatusBadge` is the
  domain-specific wrapper for bot status.
- `Avatar` (initials fallback, 3 sizes, optional image)
- `Modal` (portal-rendered, backdrop blur, ESC-to-close, scroll-lock)
- `Switch`, `Tabs`, `Separator`, `Tooltip`, `Skeleton`, `EmptyState`
- `Toaster` — global queue driven by `uiStore`; helpers under `toast.success/error/info/warning`.

---

## Page-by-page tour

### 1. Login (`/login`)

Two-column split layout. Left column is a brand panel with stats and a
testimonial; right is a clean form with React Hook Form + Zod validation,
password show/hide, "keep me signed in" Switch, and a demo credentials
hint. Uses `useAuth().login.mutateAsync` for the request and toasts on
both success and failure.

### 2. Dashboard (`/`)

- Header with greeting, "Open flow builder" + "New bot" actions.
- Four stat cards (conversations, active chats, orders today, avg. response).
- A 14-day SVG line chart for conversation volume.
- A live `BotStatusCard` for the primary bot, including a placeholder QR
  grid when disconnected and connect/disconnect mutations.
- Bot list overview + recent activity feed.

### 3. Bots (`/bots`)

- Grid of `BotCard`s. Each shows status, metrics, phone, last connected,
  per-card connect/disconnect/delete with confirm modal.
- Search + status filter (All / Online / Connecting / Offline).
- "New bot" modal with fully validated form (Zod).

### 4. Menu (`/menu`)

- Categories rendered as draggable rows (HTML5 drag-and-drop, no extra dep).
- Each row lists items with image, name, price, hidden badge, and inline
  edit/delete.
- Dual modals — `CategoryFormModal` (create + edit) and `ItemFormModal`
  (with Switch toggle for availability).
- Reordering persists via `menuService.reorderCategories`.

### 5. Flow Builder (`/flows`) — the centerpiece

- Visual list of flow steps as numbered nodes connected by hairlines.
- Each step is collapsible and editable inline (title, type, content).
- Step types: `message`, `menu`, `item-selection`, `confirmation`, `payment`.
- For `menu` and `confirmation` steps, options are editable
  (label/value) with add and remove.
- Drag-to-reorder on every step (HTML5 drag).
- Tabs switch between **Editor** and **JSON** view; on wide screens both
  show side-by-side.
- The JSON preview matches the structure asked for in the spec:

  ```ts
  {
    id: string,
    steps: [
      {
        id: string,
        type: "message" | "menu" | "item-selection" | "confirmation" | "payment",
        content: string,
        options?: [{ label: string, value: string }]
      }
    ]
  }
  ```

- "Save changes" button is disabled until the local edit is dirty
  (deep compared against the persisted flow). A new-flow button mints a
  starter flow with a single welcome message step.

### 6. Conversations (`/conversations`)

- Two-pane layout (chat list left, message thread right) inside one card.
- List has search (debounced 200ms), status tabs, and from/to date filters
  — filters are bundled into a memoized object so React Query keys stay stable.
- Each item shows avatar, contact, last preview, status dot badge, unread count.
- Right pane: `ChatPanel` with header (avatar, status, tags, call button,
  "Close / Reopen" toggle), scrolling messages with auto-scroll-to-bottom,
  `MessageBubble` styled differently for bot vs user, delivery checkmarks,
  and a textarea reply form (Enter to send, Shift+Enter newline).

### 7. Settings (`/settings`)

- Profile form, theme picker (Light / Dark / System) and a notifications
  panel using `Switch` controls. Bonus surface to demonstrate the design
  system.

---

## Design decisions

1. **One service entry-point.** The `apiCall` wrapper in
   `src/instances/api.ts` is the only place that knows about latency,
   request mocking, and (later) fetch/axios. This keeps every service
   stateless and trivially mockable in tests.
2. **localStorage as the mock backend.** Mock services persist through a
   tiny `storage` helper. Reorder a category, refresh, it stays. This makes
   the demo feel real _and_ keeps the seed predictable on first load.
3. **TanStack Query owns server state.** No useEffect+useState dance for
   loading/error states; everything is `useQuery`/`useMutation` with central
   `queryKeys`.
4. **Zustand for cross-cutting client state only.** Auth, theme, sidebar,
   toasts. Page-local state stays in `useState` to avoid cross-page coupling.
5. **HTML5 drag for reordering.** Avoiding `react-dnd`/`dnd-kit` keeps the
   bundle lean. If we add nested or virtualized lists later, swapping in
   `dnd-kit` is a localized change inside the two pages that use it.
6. **CSS variables + Tailwind class strategy.** Light/dark switch via
   `<html class="dark">` toggling — no flash on reload because the
   `themeStore` is hydrated from `localStorage` synchronously.
7. **Form schemas in one file.** `src/lib/schemas.ts` is the single source
   of truth — components import the inferred type, not a hand-written one.
8. **Lazy routes by default.** Each page is a `lazy()` import so the initial
   bundle stays small (the index chunk gzips to ~83KB; pages load as needed).

---

## Future scalability

When the real backend lands:

1. **Replace `apiCall`** in `src/instances/api.ts` with an axios/fetch
   client that reads `import.meta.env.VITE_API_URL` and the auth token
   from `authStore`. Every service call automatically picks it up.
2. **Add an interceptor for 401s** that calls `useAuthStore.getState().signOut()`.
3. **Real WhatsApp QR codes** — replace `QrPlaceholder` with an `<img>`
   bound to the base64 payload returned by Evolution API. The component
   already accepts a `seed` prop so the swap is contained.
4. **Realtime updates** — TanStack Query has all the keys; add a websocket
   listener that calls `queryClient.invalidateQueries(...)` on inbound
   events (new message, status change).
5. **Flow versioning** — extend the Flow type with `version` and a
   `publishedSteps` snapshot; the editor already separates the in-memory
   `steps` state from the persisted `flow.steps`, so adding a draft/publish
   workflow only touches `flowService.saveSteps`.
6. **Multi-tenancy** — `restaurantId` on the user model is already there;
   add it to all service requests as a header in `apiCall`.
7. **Component library extraction** — `src/components/ui` is dependency-free
   beyond Tailwind and `lucide-react`. It is publishable as `@mesa/ui` if
   we want to reuse it in a marketing site or admin panel.
8. **Tests** — every service method is pure-async and easy to assert on,
   and the React Query keys are centralized; this codebase is ready for
   Vitest + Testing Library without restructuring.
9. **i18n** — copy is centralized in JSX today. When we need it, wrap
   strings with a `useTranslation` hook keyed off React's context — pages
   are small enough to migrate one at a time.
10. **Optimistic UI on mutations** — the Query keys are already designed for
    it; replace `onSuccess: invalidate` with `onMutate: setQueryData` for
    the highest-traffic mutations (send message, toggle availability).

---

## Replacing the mock backend in 4 changes

```diff
// 1) src/instances/api.ts
- export async function apiCall(opts, resolver) {
-   await sleep(...)
-   return resolver()
+ import axios from 'axios'
+ const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })
+ export async function apiCall(opts) {
+   const { data } = await api.request({
+     url: opts.endpoint, method: opts.method ?? 'GET', data: opts.body,
+   })
+   return data
  }
```

Then drop the `resolver` argument from every service call (or keep the
helper signature but ignore it — the services don't care).

```diff
// 2) Add an auth interceptor
+ api.interceptors.request.use((config) => {
+   const token = useAuthStore.getState().token
+   if (token) config.headers.Authorization = `Bearer ${token}`
+   return config
+ })
```

```diff
// 3) Stop seeding from localStorage
- const seed = () => storage.get(...)
+ // delete seed/persist helpers from each service file
```

```diff
// 4) Wire VITE_API_URL
+ # .env.local
+ VITE_API_URL=https://api.mesa.app/v1
```

That's the entire backend swap. No page or component changes.

---

## Testing the demo

1. `npm run dev`
2. Open <http://localhost:5173>
3. Sign in with the demo credentials (or any 8+ char password).
4. Navigate the sidebar:
   - **Dashboard** — connect/disconnect the primary bot to see the QR
     placeholder swap with the live state.
   - **Bots** — create a new bot, watch it land in `connecting`, then connect.
   - **Menu** — drag a category, refresh — the order persists.
   - **Flow Builder** — toggle to JSON view, edit a step, hit Save.
   - **Conversations** — send a reply; the bubble appears and the list
     re-sorts by `lastMessageAt`.
5. Toggle dark mode from the topbar (sun/moon icon).
6. Reset the demo: in DevTools → Application → Local Storage,
   delete the `mesa.*` keys.
