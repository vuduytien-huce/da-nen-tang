# Agent Instructions (BiblioTech v2.0)

## Package Manager
Use **npm**: `npm install`, `npm run start`, `npm run web`
Database: `npx prisma db push`, `npx prisma studio`

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Antigravity AI <antigravity@google.com>
```

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `npx tsc --noEmit path/to/file.ts` |
| DB Sync | `npx prisma generate` |

## Secret Codes (For Testing)
- **Librarian Profile**: `LIB_SECRET_2026`
- **Admin Profile**: `ADMIN_SECRET_2026`

## Key Conventions
- **Role-Based Access**: Librarian > Admin > Member.
- **SQL Logic**: Use `supabase.rpc` for critical business logic.
- **i18n**: Use `t('key')`. **SAFE initialization required** (Check `getLocales()`).
- **Database**: Use direct Postgres connection string. Quote `"Role"`.
- **Error Handling**: Every major screen must be wrapped in an Error Boundary.

## Feature Patterns
- **Scanning**: Use @/src/components/CameraScanner.tsx (Expo-camera).
- **Payment**: Use @/src/services/paymentService.ts (VietQR + HMAC).
- **Book Metadata**: Use @/src/services/bookService.ts (Google Books/OpenLib).

## Avoid
- No generic colors (use the blue/dark theme).
- No hardcoded secrets (use .env).
- Avoid bypassing `useLibrary` hooks for data fetching.
