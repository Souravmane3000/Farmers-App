# Farm Management App

Mobile + Web Farm Management App designed for Indian farmers and farm managers.

## Features

- 📱 Mobile-first design with PWA support
- 🌐 Web dashboard for desktop
- 📴 Offline-first architecture with auto-sync
- 🏞️ Plot/Location Management
- 🌾 Crop Management with alerts
- 📦 Inventory Management with auto-deduct
- 📝 Field Usage Tracking
- 💰 Expense Management
- 📊 PDF Report Generation
- 🔔 Smart Alerts for spraying and crop stages

## Tech Stack

- **Frontend**: Next.js 14 (React) + TypeScript
- **Database**: IndexedDB (offline) + PostgreSQL (cloud)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **PDF**: jsPDF
- **Icons**: Lucide React

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                   # Utilities and services
│   ├── db/               # Database (IndexedDB)
│   ├── api/              # API client
│   ├── sync/             # Offline sync service
│   ├── alerts/           # Alert engine
│   └── pdf/              # PDF generation
├── types/                 # TypeScript types
└── public/                # Static assets
```

## Architecture

### Offline-First
- All data stored locally in IndexedDB
- Actions queued when offline
- Auto-sync when connectivity available
- Conflict resolution: latest write wins

### Single Farm Per Account
- One farm per user login
- Simple authentication
- Farm data isolated per user

## License

Private - Commercial Farm Operations App
