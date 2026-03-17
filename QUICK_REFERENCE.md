# Quick Start - Add Data to Farm App

## Forms Now Available

### 1. Add Plot
**Navigate to:** Plots section → Add (+) button
**Fields:**
- Plot Name * (required) - e.g., "North Field"
- Size (Acres) * (required) - e.g., "2.5"
- Notes (optional) - Additional details

**What it does:**
- Creates a plot/field in your farm
- Saves to local database immediately
- Auto-syncs to Supabase every 30 seconds

### 2. Record Field Usage (Add Field Usage)
**Navigate to:** Field Usage section → Add (+) button
**Fields:**
- Plot / Location * (required, dropdown)
- Crop Being Treated * (required, dropdown - shows after selecting plot)
- Item Used * (required, dropdown)
- Quantity Used * (required) - How much was applied
- Date * (required) - When it was applied
- Time * (required) - What time
- Application Method * (required, dropdown)
  - Spray
  - Spread
  - Drip
  - Broadcast
  - Injection
- Rain Probability (optional) - % chance of rain
  - ⚠️ Shows warning if > 50%
  - Shows alert if > 75%
- Weather Condition (optional) - e.g., "Sunny", "Rainy"
- Temperature (optional) - In °C
- Notes (optional) - Additional details

**What it does:**
- Records when/how you used inventory items
- Automatically deducts stock
- Checks rain probability and shows alerts
- Saves to local database
- Auto-syncs to Supabase

## Data Flow Example

### Example 1: Adding a Plot

```
You enter:
  Plot Name: "Field A"
  Size: "5"
  Notes: "Good drainage"
  
↓ Click "Save Plot"

System creates:
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    farmId: "farm_1",
    name: "Field A",
    sizeAcres: 5,
    notes: "Good drainage",
    syncStatus: "PENDING",
    createdAt: "2024-03-17T10:30:00Z",
    updatedAt: "2024-03-17T10:30:00Z"
  }

↓ Saved to IndexedDB (your phone/browser)

↓ Marked for sync

↓ Every 30 seconds: Auto-syncs to Supabase

✓ Now in Supabase database permanently
```

### Example 2: Recording Field Usage

```
You enter:
  Plot: "Field A"
  Crop: "Wheat"
  Item: "Fertilizer NPK"
  Quantity: "2.5"
  Date: "2024-03-17"
  Time: "10:00"
  Method: "Spray"
  Rain Probability: "60%"
  Temperature: "25"
  
↓ Click "Save Usage"

System creates TWO records:

1. Field Usage Log:
   {
     id: "660e8400-e29b-41d4-a716-446655440001",
     farmId: "farm_1",
     plotId: "550e8400-e29b-41d4-a716-446655440000",
     cropId: "...",
     itemId: "...",
     quantityUsed: 2.5,
     usageDate: "2024-03-17",
     usageTime: "10:00",
     applicationMethod: "SPRAY",
     rainProbability: 60,
     temperature: 25,
     syncStatus: "PENDING"
   }

2. Stock Log (auto-deduction):
   {
     id: "770e8400-e29b-41d4-a716-446655440002",
     farmId: "farm_1",
     itemId: "...",
     type: "OUT",
     quantity: 2.5,
     date: "2024-03-17",
     notes: "Used in field",
     syncStatus: "PENDING"
   }

↓ Both saved to IndexedDB

↓ Both marked for sync

↓ Every 30 seconds: Auto-syncs both to Supabase

✓ Now in Supabase database permanently
✓ Stock automatically updated
```

## What Happens If Internet Disconnects

### Scenario: You're filling a form without internet

```
You fill form → Click Save
↓
Data saved to local IndexedDB ✓
Form redirects you to next page
Dialog shows: "Saved locally, will sync when online"
↓
12 hours later, you connect to internet
↓
Auto-sync kicks in
↓
All pending data syncs to Supabase ✓
```

## Status Messages You'll See

| Message | Meaning | Action |
|---------|---------|--------|
| "Plot created successfully!" | Plot saved locally | Will sync automatically |
| "Failed to create plot" | Error saving | Try again or check form |
| "Insufficient stock! Available: X" | Not enough inventory | Use less quantity |
| "Rain Probability Warning: 60%" | Show warning alert | Can proceed if needed |
| "Rain Alert: Very High Probability" | Show red alert | Consider postponing |
| "No plots found. Add plots first" | Database empty | Create a plot first |
| "Loading..." | Fetching data | Wait for load to complete |

## Validations in Place

### Plot Form
- ✓ Name must not be empty
- ✓ Size must be > 0

### Field Usage Form  
- ✓ All required fields must be filled
- ✓ Quantity must be > 0
- ✓ Quantity can't exceed available stock
- ✓ Rain probability must be 0-100
- ✓ Date and time must be valid

## After You Add Data

### In Supabase Dashboard
Your data appears in these tables:
- `plots` - Your fields/plots
- `crops` - Crops planted in plots
- `field_usage_logs` - Record of applying items
- `stock_logs` - Inventory movements
- `inventory_items` - Your inventory

### On Your App
- Data shows in lists (coming soon)
- Can generate reports
- Can track trends
- Can get alerts for issues

## Troubleshooting

**Q: I clicked Save but nothing happened**
- Check browser console (F12) for errors
- Make sure all required fields are filled
- Try again with different data

**Q: Form shows validation errors even when filled**
- Clear the field and re-enter
- Make sure format is correct:
  - Size: must be a number with decimals (e.g., "2.5")
  - Quantity: must be a number (e.g., "10")
  - Date: use date picker (YYYY-MM-DD)
  - Time: use time picker (HH:MM)

**Q: "No plots found" message**
- You need to add a plot first
- Go to Plots → Add (+) → Create a plot
- Then come back and try field usage

**Q: Data not syncing to Supabase**
- Check if `.env.local` has correct credentials
- Verify Supabase project exists
- Check if tables exist in Supabase
- Look at browser console for API errors

---

**Need more help?** Check SUPABASE_SETUP.md for detailed information.
