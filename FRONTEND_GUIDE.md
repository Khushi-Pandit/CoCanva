# DrawSync Frontend — Setup & Integration Guide

## Quick Start

```bash
cd d:\CoCanva\drawsync-web
npm install
# Edit .env.local with your Firebase credentials
npm run dev          # http://localhost:3000
```

## Configure Firebase

Edit `d:\CoCanva\drawsync-web\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=<your key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your project id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your app id>
```

## Project Structure

```
drawsync-web/src/
├── types/                  # Shared TypeScript types
│   ├── canvas.ts           # Canvas, CanvasRole, Collaborator
│   ├── element.ts          # DrawableElement, Stroke, Shape, FlowchartElement, TextElement
│   ├── user.ts             # UserProfile, Notification
│   └── socket.ts           # Socket event payload types
│
├── lib/
│   ├── firebase.ts         # Firebase Auth singleton
│   ├── utils.ts            # cn, timeAgo, getInitials, generateColor, debounce
│   ├── element.transform.ts # fromAPI / toAPI serialization + canvas math helpers
│   ├── export.ts           # PNG / SVG / JSON export
│   ├── api/
│   │   ├── client.ts       # Fetch wrapper with auth token injection
│   │   ├── canvas.api.ts   # All canvas REST endpoints
│   │   ├── element.api.ts  # Bulk save, import/export, thumbnails, ghosts
│   │   ├── ai.api.ts       # Chat, ghost suggest, summarize, layout, code-to-diagram
│   │   └── user.api.ts     # Profile, notifications, search
│   └── socket/
│       ├── socket.client.ts     # Socket.IO singleton factory
│       ├── useCollaboration.ts  # Full real-time hook (join, elements, cursors, locks)
│       └── useVoice.ts          # WebRTC voice hook (join, mute, peer connections)
│
├── store/
│   ├── auth.store.ts          # Firebase user, token, profile
│   ├── canvas.store.ts        # Elements, viewport, tools, history, sync
│   ├── collaboration.store.ts # Peers, cursors, locks, live strokes
│   └── ui.store.ts            # Panel visibility + toast notifications
│
├── components/
│   ├── providers/
│   │   └── AuthProvider.tsx       # Firebase auth state → Zustand
│   ├── canvas/
│   │   ├── CanvasEngine.tsx       # 2D render loop (RAF), all draw tools
│   │   ├── Toolbar.tsx            # Left tool sidebar
│   │   ├── TopBar.tsx             # Top bar (undo/redo, zoom, save, share)
│   │   ├── FlowchartOverlay.tsx   # HTML flowchart layer (drag, edit, connectors)
│   │   ├── TextLayer.tsx          # Text element HTML layer
│   │   └── RemoteCursors.tsx      # Remote peer cursor overlays
│   ├── ai/
│   │   └── AIChatPanel.tsx        # AI chat sidebar (streaming messages)
│   ├── voice/
│   │   └── VoiceRoom.tsx          # Voice join/leave/mute panel
│   ├── share/
│   │   └── ShareModal.tsx         # Share link generation + invite by email
│   └── ui/
│       ├── Button.tsx             # Premium Button component
│       └── Toast.tsx              # Toast notification system
│
└── app/
    ├── layout.tsx                # Root layout with AuthProvider
    ├── page.tsx                  # Redirects to /login
    ├── login/page.tsx            # Login with email + Google
    ├── signup/page.tsx           # Sign up with email + Google
    ├── dashboard/page.tsx        # Full dashboard (grid/list, CRUD)
    └── canvas/
        ├── [id]/page.tsx         # Main canvas editor (all features)
        └── join/[token]/page.tsx # Share token join handler
```

## Feature Matrix

| Feature | Status |
|---------|--------|
| Firebase Auth (Email + Google) | ✅ Complete |
| Dashboard with Canvas CRUD | ✅ Complete |
| Infinite Canvas with 60fps render loop | ✅ Complete |
| Drawing: Pen, Pencil, Marker, Brush | ✅ Complete |
| Eraser (smart split strokes) | ✅ Complete |
| Shapes: Rect, Circle, Triangle, Diamond, Line, Arrow | ✅ Complete |
| Flowchart: All shapes + SVG connectors | ✅ Complete |
| Text Tool (click to place) | ✅ Complete |
| Pan + Zoom (wheel, space+drag) | ✅ Complete |
| Undo/Redo (50 state history) | ✅ Complete |
| Socket.IO Real-time sync | ✅ Complete |
| Remote Cursors | ✅ Complete |
| Element Locking | ✅ Complete |
| Live Stroke Preview | ✅ Complete |
| AI Chat Panel | ✅ Complete |
| Ghost AI Suggestions | ✅ Ready (via socket) |
| WebRTC Voice Chat | ✅ Complete |
| Share Links (generate + join) | ✅ Complete |
| Invite by Email | ✅ Complete |
| Export (PNG, SVG, JSON) | ✅ Complete |
| Bulk Save to Backend | ✅ Complete |
| Keyboard Shortcuts (⌘Z, ⌘S, ⌘J) | ✅ Complete |
| Responsive Grid/List Dashboard | ✅ Complete |
| Toast Notifications | ✅ Complete |
| Dark/Light CSS tokens | ✅ Ready (light mode) |

## Backend Integration

The frontend communicates with the DrawSync API at `http://localhost:4000/v1`.

Make sure the backend is running:
```bash
cd d:\CoCanva\drawsync-api
npm run dev
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + S` | Save canvas |
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Shift + Z` | Redo |
| `⌘/Ctrl + J` | Toggle AI Chat |
| `Space + Drag` | Pan canvas |
| `Scroll` | Pan canvas |
| `Ctrl + Scroll` | Zoom canvas |
