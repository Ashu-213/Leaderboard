# ANTERIX CLUB - Live Leaderboard

Real-time leaderboard system for events with collaborative editing. Features a dark cosmic theme and instant score updates.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Setup Environment
Create `.env` files:

**Backend**: `backend/.env`
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/leaderboard
FRONTEND_URL=http://localhost:5173
```

**Frontend**: `frontend/.env`
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Start MongoDB
```bash
mongod
```

### 4. Run the App
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### 5. Access
- **Leaderboard**: http://localhost:5173/leaderboard
- **Editor**: http://localhost:5173/editor

## 🎮 How to Use

### Navigation Bar
Click to switch between pages:
- **📊 Leaderboard** - Public display view
- **✏️ Editor** - Edit scores and teams

### Adding Teams
1. Go to Editor page
2. Type team name
3. Click "Add Team"

### Editing Scores
1. Click on any score field
2. Type new number
3. Press Enter or click outside
4. Changes sync instantly to all viewers

### Viewing Results
- Leaderboard shows live rankings
- Top 3 teams get medals and highlights
- Updates happen automatically

## 🎨 Games Included
- Mad Ludo
- Treasure Hunt  
- Space Roulette
- Cosmic Jump
- Space Colosseum

Total score calculated automatically.

## 🔧 Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Styling**: Custom CSS with cosmic theme

## 🐛 Troubleshooting

**MongoDB won't start?**
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

**Port already in use?**
Change ports in `.env` files.

**Socket connection errors?**
- Check backend is running on port 5000
- Verify URLs in frontend `.env`

**Scores not updating?**
- Check browser console (F12) for errors
- Ensure MongoDB is connected
- Restart both servers

## 🚀 Deployment

### Deploy to Render (Recommended)
See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy Steps:**
1. Set up MongoDB Atlas database
2. Push code to GitHub/GitLab  
3. Deploy backend web service on Render
4. Deploy frontend static site on Render
5. Set environment variables in Render dashboard

**Live URLs after deployment:**
- Leaderboard: `https://your-app.onrender.com/leaderboard`
- Editor: `https://your-app.onrender.com/editor`

### Local Environment Files
For local development, create these `.env` files:

**Backend** (`backend/.env`):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/leaderboard
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 🎯 Features
- ✅ Real-time score updates
- ✅ Collaborative editing  
- ✅ Dark cosmic theme
- ✅ Mobile responsive
- ✅ Auto-calculation of totals
- ✅ Top 3 medal highlights
- ✅ Rate limiting protection
- ✅ Cross-platform deployment
- ✅ MongoDB database
- ✅ Socket.io real-time sync

## 🌐 For Production
- Use MongoDB Atlas (cloud database)
- Deploy frontend to Netlify/Vercel
- Deploy backend to Render/Railway
- Update CORS settings

---

🎮 **Ready for live events!** Deploy and start tracking scores in real-time.
