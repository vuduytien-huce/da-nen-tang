---
name: library-management-system
description: Expert guide for maintaining and extending the BiblioTech v2.0 (Premium Edition) library management system.
---

# BiblioTech v2.0 - Technical Implementation Guide

## 1. Implementation Status (Audit 2026-04-27)

| Feature | Status | Implementation Detail |
|---|---|---|
| **Librarian Home** | ✅ COMPLETED | Classic list-based dashboard (No Bento). |
| **Member Home** | ✅ COMPLETED | Integrated Red Overdue Banner for fines. |
| **Admin Config** | ✅ COMPLETED | UI for system parameters (Fine, Limits). |
| **Reports** | ✅ COMPLETED | Visual charts for library performance. |
| **ISBN Primary Key** | ✅ COMPLETED | Prisma schema and RPCs standardized on ISBN. |
| **3-Copy Rule** | ✅ COMPLETED | DB defaults set to 3 physical copies. |
| **5-Book Limit** | ✅ COMPLETED | Enforced in DB triggers and Profile defaults. |
| **Scanning** | ✅ COMPLETED | `CameraScanner.tsx` with `expo-camera`. |
| **Payment** | ✅ COMPLETED | `paymentService.ts` with VietQR + HMAC. |
| **Metadata Sync** | ✅ COMPLETED | `bookService.ts` with Multi-Source logic. |
| **SecureStore** | ✅ COMPLETED | Integrated in `supabase.ts` for native security. |
| **Axios** | ✅ COMPLETED | Core networking for external APIs & Metadata. |
| **Fetch API** | 🔥 READY | Native networking for lightweight requests. |
| **NativeWind** | ✅ COMPLETED | Primary styling engine (Tailwind CSS v4). |
| **Tamagui** | 🔵 SẴN SÀNG KHI CẦN | Alternative high-performance UI kit. |
| **Stitch MCP** | 🔥 READY | Connected via MCP for rapid UI/feature development. |
| **Notifications** | ✅ COMPLETED | `expo-notifications` fully integrated. |
| **Audiobook Sync** | ✅ COMPLETED | Scrapers for Fonos/VoizFM + `audiobookMetadataService`. |
| **Admin Logic** | 🔥 READY | Node.js/Deno Edge Functions for User Management. |

---

## 2. System Overview

BiblioTech v2.0 is a high-fidelity library management system built with React Native (Expo) and Supabase. It uses a **Role-Based Access Control (RBAC)** model and handles critical business logic via Postgres RPC functions for transactional integrity.

### Role Hierarchy & Permissions

- **Librarian**: Highest authority. Manages book inventory, approves returns, handles payments, and monitors system health.
- **Admin**: Manages user accounts, system configurations, and trust relationships.
- **Member**: Browses books, manages personal borrows, and makes payments.

---

## 3. Core Technology Stack

- **Frontend**: React Native + Expo Router (SDK 54+)
- **Networking**: **Axios** (external APIs) + **Fetch API** (Native fallback) + **Supabase Client**
- **Persistence**: **Expo SecureStore** (PRIORITY for Refresh Tokens) + AsyncStorage
- **Styling**: **NativeWind v4** (Tailwind CSS) + **React Native Paper** (UI components) + **Tamagui** (Ready when needed)
- **Database/ORM**: Supabase (PostgreSQL) + `@/prisma/schema.prisma`
- **Server State**: **TanStack React Query** (`@tanstack/react-query`) for data fetching and caching
- **Form Management**: **React Hook Form** (`react-hook-form`) for all form validation
- **Business Logic**: **Supabase Edge Functions (Node.js/Deno)** + Postgres RPC (Transactional logic)
- **I18n**: `i18next` with `t('key')` (Safe initialization required)
- **Device Features**: **Expo Camera** (Barcode/ISBN Scanning)
- **Notifications**: **Expo Notifications** (Push & Local notifications for Expo Go)
- **State Management**: **Zustand** (Lightweight client-side state)
- **Animations**: **React Native Reanimated** (Premium micro-interactions)
- **Frameworks**: **Stitch MCP** (Active - Rapid Development & Orchestration)
- **Payment & Security**: **VietQR** (Dynamic QR generation) + **Crypto-JS** (HMAC-SHA256 signatures)
- **Scraper Tools**: **Playwright** + **Cheerio** (Metadata enrichment from Fonos/VoizFM)
- **Error Handling**: React Error Boundaries wrapping every major screen

---

## 4. Critical Business Rules (Hardcoded)

- **Minimum Copies**: Every book title must have at least **3 physical copies** (`total_copies >= 3`).
- **Borrow Limit**: Members can borrow a maximum of **5 books** simultaneously.
- **Fine Rate**: Standard rate is **2,000 VNĐ/ngày**.
- **Primary Key**: Books are indexed by **ISBN** as the primary key.
- **Role Constants**:
- **Librarian**: `LIB_SECRET_2026` (For profile activation/testing)
- **Admin**: `ADMIN_SECRET_2026` (For profile activation/testing)

---

## 5. Key Component Patterns

### 5.1. Scanning (Barcode/QR)

- **Location**: `@/src/components/CameraScanner.tsx`
- **Library**: `expo-camera`
- **Pattern**: Use for scanning ISBNs during book entry and member ID verification.

### 5.2. Payment (VietQR & HMAC)

- **Location**: `@/src/services/paymentService.ts`
- **Library**: `crypto-js`
- **Logic**: 
  - Generate VietQR standard URLs using bank ID, account number, and amount.
  - Secure transactions using **HMAC-SHA256** signatures to verify webhook data.
- **UI**: 
  - Integrated into the Red Overdue Banner on the Member Home.
  - Simple "Scan & Pay" flow for fine resolution.

### 5.3. Book Metadata

- **Location**: `@/src/services/bookService.ts`
- **Fallback**: Open Library API (Primary Image) → Google Books API (Primary Text) → Local Database.

### 5.4. Database & API Interaction

- **Networking**: Use **Axios** for complex request transformations (e.g., custom payment gateways).
- **Sync**: Always run `npx prisma generate` after schema changes.
- **Business Logic**: Use `supabase.rpc('function_name', { params })` for borrows, returns, and payments to ensure atomic transactions.

### 5.5. Security & Authentication

- **SecureStore**: **MANDATORY** Store the `refresh_token` in **Expo SecureStore**.
- **Implementation Note**: Update `src/api/supabase.ts` to replace standard AsyncStorage with a SecureStore-backed adapter for native platforms.

### 5.6. Forms, Data Fetching & UI Components

**React Hook Form** — dùng cho mọi form trong app:

```tsx
import { useForm, Controller } from 'react-hook-form';

const { control, handleSubmit, formState: { errors } } = useForm();
```

- Wrap controlled inputs (TextInput, Paper components) với `<Controller />`.
- Không dùng state thủ công để quản lý form value.

**TanStack React Query** — server state và caching:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query: fetch data
const { data, isLoading } = useQuery({ queryKey: ['books'], queryFn: fetchBooks });

// Mutation: write data + invalidate cache
const queryClient = useQueryClient();
const mutation = useMutation({ mutationFn: addBook, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }) });
```

- Dùng với `useLibrary` hook — không bypass.
- Key naming convention: `['books']`, `['borrows', userId]`, `['system-config']`.

**React Native Paper** — UI components cao cấp:

```tsx
import { Button, TextInput, Card, Chip, Dialog } from 'react-native-paper';
```

- Ưu tiên dùng Paper components thay vì tự build từ đầu.
- Override theme theo **Blue/Dark Navy** palette của BiblioTech (`#0F121D`, `#3A75F2`).
- Không dùng Paper theme mặc định màu sắc.

### 5.7. Notifications (Push & Local)

- **Library**: `expo-notifications`
- **Pattern**:
  - Request permissions on app launch via `Notifications.requestPermissionsAsync()`.
  - Handle foreground notifications using `Notifications.setNotificationHandler`.
  - Store `expoPushToken` in the `profiles` table to send targeted notifications (e.g., overdue reminders).
- **Use Cases**: 
  - Overdue alerts (Local/Push).
  - Return approval confirmations.
  - System-wide announcements.

### 5.8. Audiobook Metadata & Scrapers

- **Location**: `@/src/services/audiobookMetadataService.ts`
- **Source**: Fonos, VoizFM (via `scratch/metadata-scraper`)
- **Pattern**:
  - Store rich metadata: `chapters`, `duration`, `narrator`, `sample_url`.
  - Use **Playwright** for headless scraping of dynamic catalogs.
  - Sync to `audiobook_metadata` table for cross-platform search.
- **Logic**: 
  - Match physical books to audiobooks via **ISBN** or Title/Author similarity.
  - Pricing comparison between platforms to suggest the best value.

### 5.9. Rapid Development with Stitch MCP

- **Integration**: Model Context Protocol (MCP)
- **Role**: Automated UI scaffolding, component refactoring, and agent orchestration.
- **Pattern**:
  - Use `stitch_build_site` for initial screen layouts using the BiblioTech Blue/Navy theme.
  - Use `stitch_refactor` to optimize existing components for better performance.
  - **Fastest Readiness**: Direct connection between design tokens and generated code via MCP tools.
- **Optimization**:
  - Always enforce `NativeWind v4` and `React Native Paper` constraints in Stitch prompts.
  - Use the **Premium Design** system (Section 3) as the reference for all generated UI.

### 5.10. Admin & User Management (Node.js/Edge Functions)

- **Philosophy**: Use Edge Functions as a "Backend Controller" (ASP.NET Style) to handle logic that requires elevated permissions (`service_role`).
- **Architecture**:
  - **Middleware (`_shared/middleware.ts`)**: Handles Auth (JWT check), CORS, and Global Error Handling.
  - **Validation (`_shared/validation.ts`)**: Uses **Zod** for strong typing and data validation (comparable to C# Data Annotations).
  - **Router (`admin-manager/index.ts`)**: Dispatches requests based on path and method.
- **Admin Capabilities**:
  - **Bypass RLS**: Uses `service_role` key to perform administrative tasks.
  - **User Lifecycle**: Create, list, and delete users via `supabase.auth.admin` API.
- **Example Usage**:
  ```typescript
  // Call from React Native
  const { data } = await supabase.functions.invoke('admin-manager', {
    body: { email: 'user@example.com', password: '...', fullName: '...', role: 'Librarian' },
    method: 'POST' // Targeted to path 'create-user'
  });
  ```
- **Comparison to ASP.NET**: 
  - `Edge Functions` = `Controllers`.
  - `Service Role Client` = `DbContext` with SA access.
  - `Zod Schema` = `DTOs` + `Attributes`.

---

## 6. Directory Structure (BiblioTech Standard)

```text
/
├── app/                  # Expo Router (Grouped by Role)
│   ├── (auth)/           # Login/Signup/Secret Entry
│   ├── (librarian)/      # Premium Inventory & Approval Dashboard
│   ├── (admin)/          # User Management & System Config
│   └── (member)/         # Catalog & Borrow Tracking
├── src/
│   ├── components/       # Premium UI (Blue/Navy theme)
│   ├── services/         # Business Logic (Payment, Metadata)
│   ├── hooks/            # useLibrary, useAuth, useTheme
│   ├── locales/          # i18n JSON files
│   └── utils/            # HMAC, Date formatting, ISBN validation
├── prisma/               # Schema and Migrations
└── supabase/             # Edge Functions & Remote Config
```

---

## 7. Development Workflow (BiblioTech v2.0)

1. **Schema Updates**: Modify `@/prisma/schema.prisma` → `npx prisma db push` → `npx prisma generate`.
2. **RPC Logic**: Define critical logic in `.sql` files in root, then apply to Supabase SQL Editor.
3. **UI Updates**: Use HSL tailored colors. Avoid plain red/blue/green. Ensure dark mode support.
4. **Testing**: Verify flows using the secret codes (`LIB_SECRET_2026`, `ADMIN_SECRET_2026`).

---

## 8. Troubleshooting

- **White Screen**: Check `ErrorBoundary.tsx`. Ensure all screen components are properly exported.
- **Missing Fines**: Check `SystemConfig` in the DB. Ensure `fine_rate` is not null.
- **Auth Issues**: Verify `SecureStore` permissions in `app.json`.
- **ISBN Errors**: Ensure input is trimmed and validated using `ISBN-10/13` regex.
