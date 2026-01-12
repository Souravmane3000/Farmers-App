# Farm Management App - Architecture Documentation

## Overview

This is a Mobile + Web Farm Management App designed for Indian farmers with offline-first architecture, single-farm per login, and icon-based simple UI.

## Tech Stack

- **Frontend Framework**: Next.js 14 (React) with TypeScript
- **Database (Offline)**: IndexedDB via Dexie.js
- **Database (Cloud)**: PostgreSQL (via API - to be implemented)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **PDF Generation**: jsPDF + jspdf-autotable
- **Icons**: Lucide React
- **PWA**: Service Worker for offline support

## Architecture Principles

### 1. Offline-First
- All data stored locally in IndexedDB
- Actions queued when offline
- Auto-sync when connectivity available
- Conflict resolution: "latest write wins"

### 2. Single Farm Per Account
- One farm per user login
- Farm data isolated per user
- Simple authentication (to be implemented)

### 3. Mobile-First Design
- Icon-based navigation
- Large touch-friendly buttons
- Minimal text
- Step-by-step flows
- High contrast for sunlight visibility

## Database Schema

### IndexedDB Tables (via Dexie)

1. **users** - User accounts
2. **farms** - Farm information (one per user)
3. **plots** - Plot/location management
4. **crops** - Crop records with stages
5. **inventoryItems** - Inventory item definitions
6. **stockLogs** - Stock in/out transactions
7. **fieldUsageLogs** - Field usage tracking (core feature)
8. **expenses** - Expense records
9. **suppliers** - Supplier information
10. **alerts** - System alerts
11. **syncQueue** - Pending sync operations

### Key Relationships

- Farm → Plots (1:N)
- Plot → Crops (1:N, current crop)
- Farm → Inventory Items (1:N)
- Farm → Field Usage Logs (1:N)
- Field Usage Log → Plot, Crop, Item (N:1 each)
- Stock Log → Item (N:1)

## Core Modules

### 1. Plot/Location Management
- Create/edit/delete plots
- Track plot size (acres)
- Assign crops to plots
- View usage history per plot

### 2. Crop Management
- Seasonal crops (Grapes & Sugarcane focus)
- Planting date, expected harvest date
- Fertilizer stage tracking
- Pesticide interval tracking
- Alerts for stages

### 3. Inventory Management
- Categories: Seeds, Fertilizers, Pesticides, Equipment, Fuel
- Current stock calculation (sum of stock logs)
- Minimum threshold alerts
- Stock-in (purchase)
- Stock-out (manual adjustment)
- Auto-deduct on field usage

### 4. Field Usage Tracking (Core)
- Date & time
- Plot & crop
- Item used & quantity
- Application method
- Weather (manual entry):
  - Rain probability (%)
  - Weather condition
  - Temperature
- Notes
- Auto-deducts inventory
- Rain probability alerts

### 5. Expense Management
- Record purchases
- Link to stock-in
- Category tracking
- Receipt photos (mobile)
- Month-wise reports
- Plot-wise cost tracking

### 6. Reports (PDF)
- Plot-wise Report
- Month-wise Expense Report
- Stock Audit Report

## Offline Sync Strategy

### Sync Queue System
1. All create/update/delete operations add to sync queue
2. Queue items have:
   - Table name
   - Record ID
   - Operation type (create/update/delete)
   - Data payload
   - Retry count
   - Last error

### Sync Process
1. Check online status
2. Process queue items sequentially
3. Call API endpoint `/api/sync/[table]`
4. On success: Remove from queue, update sync status
5. On failure: Increment retry count
6. After 5 retries: Mark as conflict

### Conflict Resolution
- Compare `updatedAt` timestamps
- Latest write wins
- Update local or push to server accordingly

## Alert Engine

### Alert Types
1. **Low Stock** - When current stock ≤ min threshold
2. **Fertilizer Stage** - When crop reaches fertilizer application stage
3. **Pesticide Interval** - When pesticide interval completed
4. **High Rain Probability** - When rain probability ≥ 70% (before usage)
5. **Expiry Warning** - When item expiring within 30 days

### Alert Processing
- Runs on:
  - Field usage creation
  - Stock changes
  - Crop updates
  - Manual check (dashboard)
- Alerts stored in IndexedDB
- Displayed on dashboard
- Can be marked as read

## PDF Generation

### Report Types
1. **Plot-wise Report**
   - Plot details
   - All field usage activities
   - Inputs used summary
   - Total cost

2. **Monthly Expense Report**
   - Purchases list
   - Usage cost
   - Total spend

3. **Stock Audit Report**
   - Current stock levels
   - Low stock items
   - Recent movements (30 days)

### Implementation
- Client-side generation using jsPDF
- Tables using jspdf-autotable
- Downloadable as PDF
- Offline-viewable once generated

## API Design

### Sync Endpoints
- `POST /api/sync/[table]` - Create record
- `PUT /api/sync/[table]` - Update record
- `DELETE /api/sync/[table]` - Delete record

### Future Endpoints (To Implement)
- `POST /api/auth/login` - User authentication
- `GET /api/farm` - Get farm data
- `GET /api/plots` - Get plots
- `GET /api/crops` - Get crops
- etc.

## UI Components

### Core Components
- `Button` - Primary/secondary/danger variants
- `Input` - Text input with label/error
- `Select` - Dropdown with options
- `BackButton` - Navigation back

### Page Structure
- Header with title and actions
- Main content area
- Bottom padding for mobile (pb-20)

## Build Plan

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Database schema
- [x] Offline sync service
- [x] Alert engine
- [x] PDF generation

### Phase 2: Core UI ✅
- [x] Home dashboard
- [x] Field usage tracking
- [x] Plot management
- [x] Inventory management
- [x] Reports

### Phase 3: Remaining Modules
- [ ] Crop management
- [ ] Expense management
- [ ] Supplier management
- [ ] Usage history view
- [ ] Alerts page

### Phase 4: Polish
- [ ] Authentication
- [ ] PWA service worker
- [ ] Error handling
- [ ] Loading states
- [ ] Data validation
- [ ] Testing

### Phase 5: Backend Integration
- [ ] PostgreSQL database
- [ ] API endpoints
- [ ] Authentication service
- [ ] File upload (receipts)
- [ ] Production deployment

## File Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── usage/             # Field usage pages
│   ├── plots/             # Plot management
│   ├── crops/             # Crop management
│   ├── inventory/         # Inventory management
│   ├── expenses/          # Expense management
│   ├── reports/           # Reports
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home dashboard
│   └── globals.css        # Global styles
├── components/            # Reusable components
├── lib/                   # Utilities and services
│   ├── db/               # Database (IndexedDB)
│   ├── sync/             # Offline sync service
│   ├── alerts/           # Alert engine
│   └── pdf/              # PDF generation
├── types/                 # TypeScript types
└── public/                # Static assets
```

## Deployment Considerations

### PWA Requirements
- HTTPS required
- Service worker registration
- Manifest.json
- Icons (192x192, 512x512)

### Performance
- Code splitting
- Lazy loading
- Image optimization
- Database indexing

### Security
- Input validation
- XSS prevention
- CSRF protection
- Secure authentication

## Future Enhancements

1. Multi-language support (Hindi, regional languages)
2. Weather API integration (auto-fetch)
3. GPS integration for plot mapping
4. Barcode scanning (removed per requirements)
5. Team collaboration features
6. Market price integration
7. AI crop recommendations
8. Integration with government schemes
