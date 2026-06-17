# Admin UI Handoff

## Project Snapshot

- App stack: Next.js + TypeScript + Firebase.
- Working area: `/Applications/XAMPP/xamppfiles/htdocs/JobNEXTJS`.
- Main admin route: `/admin/`.
- Admin dashboard and task manager are merged into one screen.
- The admin area is intentionally sparse: no filler copy, no fake data, no decorative helper text.

## Core UX Decisions Already Made

- Removed the old hero label `Bảng điều khiển`.
- Removed the date/time lead line from the hero.
- Kept only real Firebase-backed data in the UI.
- Reworked the status group to the three actual task states:
  - `Đang làm`
  - `Quá hạn`
  - `Hoàn thành`
- The top-level status counts are still driven from Firebase task data.
- The task summary cards are now a collapsible panel.
- On mobile, the task/work area is prioritized above summary information.

## Current Mobile Behavior

- Mobile navigation uses a left drawer.
- The drawer is compact and scroll-safe.
- Logout is placed in the admin brand block inside the drawer.
- A sticky compact topbar is shown on mobile.
- The `Thêm mới` button becomes a floating `+` FAB on mobile.
- Task cards are compacted toward a Google Keep style:
  - tighter spacing
  - less visual noise
  - secondary metadata hidden on mobile
  - action buttons kept visible and compact
- The summary panel:
  - opens/closes only when tapped
  - remembers its state per user with `localStorage`
  - uses a soft blue-only visual language
  - animates open/close with a gentle transition

## Visual Language

- Palette direction: blue-only, minimal accenting.
- Avoid mixed-color decoration unless absolutely necessary.
- Prefer light surfaces, soft shadows, and compact chips.
- Avoid large explanatory labels and verbose helper text.
- Keep cards clean and legible on mobile first.

## Important Files

- [app/admin/page.tsx](/Applications/XAMPP/xamppfiles/htdocs/JobNEXTJS/app/admin/page.tsx)
- [app/admin/layout.tsx](/Applications/XAMPP/xamppfiles/htdocs/JobNEXTJS/app/admin/layout.tsx)
- [app/globals.css](/Applications/XAMPP/xamppfiles/htdocs/JobNEXTJS/app/globals.css)

## Important Implementation Notes

- `app/admin/page.tsx`
  - Handles Firebase auth + task loading.
  - Renders summary cards, status chips, task list, dialogs, and the mobile FAB.
  - Stores the summary open/closed state per user.
- `app/admin/layout.tsx`
  - Owns the admin shell, drawer navigation, logout action, and mobile topbar.
  - Sidebar is the navigation source of truth for admin routes.
- `app/globals.css`
  - Contains all admin-specific styling.
  - Mobile rules live under the `@media (max-width: 640px)` block.
  - Drawer, summary panel, task cards, FAB, and topbar are all styled there.

## What Is Already Working

- The admin page is using real Firebase task data.
- The mobile drawer opens from the left.
- The summary panel state persists per user.
- The summary area is collapsed by default on mobile.
- The summary panel opens with a soft animation.
- The FAB is a compact circular icon button.
- TypeScript typecheck passes.

## What May Still Need Tuning

1. Mobile task cards can still be tightened further if the user wants even less noise.
2. The summary panel could use a slightly stronger or weaker motion curve depending on taste.
3. Drawer width and radius can still be refined if the user wants a tighter Material feel.
4. If the stylesheet keeps growing, consider splitting admin styles into a dedicated admin stylesheet.

## Rules For Future Changes

- Keep the UI sparse and practical.
- Do not invent labels or data.
- Use only Firebase-backed values.
- Prefer mobile-first compactness over decorative desktop styling.
- If changing counts or labels, preserve the actual task semantics.
- If the user asks for parity, reuse the existing admin style language instead of introducing a second design system.

## Suggested Next Steps For Another AI

1. Reduce any remaining mobile card noise further if requested.
2. Tune motion and corner radii for the summary panel and drawer.
3. Clean up dead CSS classes if the stylesheet becomes hard to maintain.
4. Split the admin CSS into a dedicated file only if further layout work makes that worthwhile.
