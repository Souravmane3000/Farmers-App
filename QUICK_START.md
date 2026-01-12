# Farm Management App - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 📱 First Steps

### 1. Create Your First Plot
1. Click **"Plots"** from home screen
2. Click **"Add Plot"**
3. Enter plot name (e.g., "North Field")
4. Enter size in acres
5. Save

### 2. Add a Crop
1. Click **"Crops"** from home screen
2. Click **"Add Crop"**
3. Select plot
4. Enter crop name (e.g., "Grapes")
5. Set planting date
6. Save

### 3. Add Inventory Items
1. Click **"Inventory"** from home screen
2. Click **"Add Item"**
3. Enter item name (e.g., "Urea Fertilizer")
4. Select category
5. Set minimum threshold
6. Save

### 4. Record Stock In
1. Go to **"Inventory"**
2. Click **"Stock In"**
3. Select item
4. Enter quantity and purchase price
5. Save

### 5. Record Field Usage
1. Click **"Add Usage"** from home screen
2. Select plot and crop
3. Select item to use
4. Enter quantity
5. Set date, time, and application method
6. Enter weather conditions (rain probability %)
7. Save (stock will auto-deduct)

### 6. Generate Reports
1. Click **"Reports"** from home screen
2. Select report type:
   - Plot-wise Report
   - Monthly Expense Report
   - Stock Audit Report
3. Click **"Generate"**
4. PDF will download automatically

---

## 🎯 Key Features

### Offline-First
- Works without internet
- Data stored locally
- Auto-syncs when online

### Auto-Deduct Stock
- When recording field usage, stock automatically decreases
- Prevents using more than available

### Smart Alerts
- Low stock warnings
- Fertilizer stage reminders
- Pesticide interval alerts
- High rain probability warnings

### PDF Reports
- Plot-wise activity reports
- Monthly expense summaries
- Stock audit reports

---

## 📋 Common Tasks

### Add Stock (Purchase)
1. Inventory → Stock In
2. Select item
3. Enter quantity and price
4. Save

### Manual Stock Adjustment
1. Inventory → Stock Out
2. Select item
3. Enter quantity
4. Add reason
5. Save

### View Usage History
1. Usage → History (to be implemented)
2. Filter by plot, crop, date
3. View details

### Check Alerts
1. Home screen shows alert count
2. Click alerts to view details
3. Mark as read when done

---

## 🔧 Troubleshooting

### Database Not Initializing
- Check browser console for errors
- Clear browser cache and reload
- Check IndexedDB is enabled in browser

### Sync Not Working
- Check internet connection
- Verify API endpoints are configured
- Check browser console for sync errors

### PDF Not Generating
- Check browser console for errors
- Ensure jsPDF is installed
- Try different browser

---

## 📚 Next Steps

1. **Complete Setup**: Add authentication and connect to backend
2. **Add Data**: Create plots, crops, and inventory items
3. **Start Tracking**: Record field usage regularly
4. **Generate Reports**: Review monthly reports
5. **Monitor Alerts**: Respond to alerts promptly

---

## 💡 Tips

- **Regular Updates**: Record usage immediately after application
- **Check Alerts**: Review alerts daily
- **Generate Reports**: Generate monthly reports for review
- **Backup Data**: Export data regularly (feature to be added)
- **Offline Mode**: App works offline - sync happens automatically

---

## 🆘 Support

For issues or questions:
1. Check ARCHITECTURE.md for technical details
2. Check BUILD_PLAN.md for implementation guide
3. Review code comments
4. Check browser console for errors

---

## 🎓 Learning Resources

- **Next.js**: https://nextjs.org/docs
- **Dexie.js**: https://dexie.org
- **React Hook Form**: https://react-hook-form.com
- **Tailwind CSS**: https://tailwindcss.com/docs
