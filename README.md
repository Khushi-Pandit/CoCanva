# DrawSync Web

The frontend application for the DrawSync Intelligent Collaborative Canvas Platform.

## 🚀 Overview

DrawSync Web is a highly interactive, real-time spatial workspace. It features an infinite canvas, multi-modal AI agents, and built-in WebRTC voice rooms, all synchronized in real-time across peers.

## 🛠️ Technology Stack

- **Framework:** Next.js 14 (App Router), React 19
- **State Management:** Zustand
- **Styling:** Tailwind CSS, Radix UI, Framer Motion
- **Real-time:** Socket.IO Client, WebRTC
- **Authentication:** Firebase Client SDK

## 📁 Project Structure

- `src/app/`: Next.js App Router pages (`/canvas`, `/notes`, `/dashboard`)
- `src/components/`: Reusable UI components
  - `ai/`: AI Assistant chat panels
  - `canvas/`: The core infinite canvas engine and toolbar
  - `voice/`: WebRTC voice room UI
  - `dashboard/`: User project management
- `src/lib/`: Utilities, API clients, and hooks
  - `socket/`: Real-time state hooks (`useCollaboration`, `useTranscription`)
  - `api/`: REST HTTP clients for backend communication
- `src/store/`: Zustand state definitions (`canvas`, `collaboration`, `ui`)

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js (v20+)
- Bun or npm

### Installation
1. Install dependencies:
   ```bash
   bun install
   ```
2. Set up environment variables. Create a `.env.local` file matching your Firebase and API configuration.

### Running Locally
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## ✨ Key Features

1. **Infinite Canvas Engine**: Built using HTML5 Canvas overlaid with DOM nodes for exact interactivity and flowcharts.
2. **Context-Aware AI**: The UI bundles canvas SVG and JSON state to the backend when chatting with the AI.
3. **Live Voice & Transcription**: Uses the Web Speech API to provide live transcripts for lecture recording and AI analysis.
4. **Millisecond Sync**: Real-time cursor presence and stroke synchronization powered by WebSockets.
