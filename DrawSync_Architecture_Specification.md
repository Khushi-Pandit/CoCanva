

| DRAWSYNC *Intelligent Collaborative Canvas Platform* \----------------------------------------------------------- Complete System Architecture, Product Design & Engineering Specification Version 1.0  \-  2025 CONFIDENTIAL \- FOR INTERNAL ENGINEERING USE |
| :---: |

# **Table of Contents**

1\.  Executive Summary & Vision4

2\.  Innovation Showcase — What Makes DrawSync Different5

3\.  System Architecture Overview8

4\.  Technology Stack & Rationale11

5\.  Database Design (MongoDB \+ Mongoose/TypeScript)13

6\.  Backend Architecture (Node.js \+ TypeScript)18

7\.  REST API Reference — Complete Specification22

8\.  Real-time Collaboration Engine (Socket.IO)29

9\.  AI Intelligence Layer34

10\.  Voice & Spatial Audio System39

11\.  Frontend Architecture & Component Design42

12\.  Security Architecture47

13\.  Performance, Caching & Scalability50

14\.  Infrastructure & Deployment53

15\.  Development Phases & Roadmap56

| 1\. Executive Summary & Vision *What we are building and why it matters* |
| :---- |

**DrawSync** is a next-generation, AI-native collaborative canvas platform purpose-built for software engineers, product teams, and architects. It goes far beyond a whiteboard app. DrawSync is a living, intelligent workspace where humans and AI co-create together in real time.

## **1.1 The Problem We Solve**

Modern engineering teams need more than a static diagram tool. They need:

* A shared infinite canvas that works in real time across teams and time zones

* AI that does not just chat — it draws, suggests, and completes diagrams contextually

* Seamless voice collaboration tied spatially to the canvas itself

* Developer-specific primitives: flowcharts, system diagrams, ERDs, architecture maps

* A platform that remembers, learns, and evolves with the team

## **1.2 Vision Statement**

| ★ DrawSync will be the first canvas platform where an AI collaborator can join your session, understand your architecture, draw missing components as ghost suggestions, route your connectors intelligently, convert your flowcharts to real code scaffolding, and speak to you via spatially positioned voice — all in one living document. |
| :---- |

## **1.3 Core Principles**

* **Real-time first:** Every operation is broadcast before it is persisted. Latency wins over consistency for drawing events.

* **AI as a collaborator, not a tool:** The AI has its own cursor, draws its own suggestions, and participates in sessions as a first-class entity.

* **Zero data loss:** Soft deletes, versioned elements, event sourcing for undo/redo, and a full replay engine.

* **Developer-native:** Code import/export, Mermaid/PlantUML round-trip, keyboard-first UX, and CLI access.

* **Security by default:** Row-level permissions, token-scoped sharing, end-to-end encrypted voice, audit logs.

| 2\. Innovation Showcase *Features that do not exist anywhere else* |
| :---- |

**The following innovations are original to DrawSync.** Each one is technically feasible with the chosen stack and represents a genuine leap beyond existing tools like FigJam, Miro, Excalidraw, and Lucidchart.

## **2.1 ★ Ghost AI Collaborator**

| ★ The most ambitious innovation: an AI entity that joins your canvas session with its own named cursor, analyses the current diagram in real time, and draws semi-transparent "ghost" suggestions that you can accept, reject, or modify with a single click. |
| :---- |

How it works:

1. User invokes the AI collaborator via the "@AI" command in the canvas chat panel or toolbar.

2. The server creates a virtual socket session for the AI entity with display name "DrawSync AI" and a distinct cursor colour (gradient animated).

3. The AI analyses the current canvas state (all elements, their types, labels, and connections) using the Claude API with a vision-augmented prompt.

4. The AI emits element:add events on the socket with a special flag isGhostSuggestion: true. These render on all clients as translucent overlays with a glowing border.

5. Any collaborator can hover a ghost element and click Accept (integrates it at full opacity) or Dismiss (removes it with an animation).

6. The AI can also emit connector:suggest events to propose missing connections between existing shapes.

This means **the AI draws alongside you**, not just in a sidebar chat. This is entirely novel in the canvas space.

## **2.2 ★ Spatial Voice Chat**

| ★ Voice audio is positionally attenuated based on each speaker's current viewport position on the canvas. If a teammate is working on the authentication section while you are in the payments section, their voice fades to a whisper — and you can "walk" over to them by panning the canvas. |
| :---- |

Implementation uses the **Web Audio API PannerNode** with canvas-to-world coordinate mapping. Each peer's microphone stream is routed through a panner whose position updates with their cursor/viewport. The listener position maps to your own viewport centre. This turns a flat chat into a **spatial office experience**.

## **2.3 ★ Canvas Time Travel & Branching**

| ★ Full Git-style version history for every canvas. See a timeline slider, scrub through the entire drawing session frame by frame, branch off a historical snapshot, and merge branches back with a visual diff overlay. |
| :---- |

Implementation:

* **Event Sourcing:** Every element mutation is stored as an immutable CanvasEvent document (not just the final state).

* **Snapshots:** Full canvas snapshots are taken every 50 events for fast scrubbing. The replay engine applies delta events between snapshots.

* **Branches:** A branch is a new Canvas document whose eventLog starts from a fork point. Merge resolves conflicts with a three-way diff (base, theirs, yours) shown as a visual overlay on the canvas.

## **2.4 ★ Code ↔ Diagram Bidirectional Bridge**

| ★ Paste TypeScript/Python/Go code and DrawSync generates a complete architecture diagram. Draw a flowchart and export it as executable pseudocode, Mermaid, PlantUML, Terraform HCL, or even a working GitHub Actions YAML. |
| :---- |

**Code → Diagram:** AST parsing extracts classes, functions, imports, and call graphs. The AI maps these to canvas elements and lays them out automatically using a force-directed graph algorithm (D3-force on the server).

**Diagram → Code:** Shape types map to code primitives. A flowchart with decision diamonds generates if/else scaffolding. A sequence diagram generates stub functions. An ERD generates TypeScript interfaces and Mongoose schemas.

## **2.5 ★ Canvas Replay & Session Recording**

| ★ Every drawing session is recorded as a compressed event stream. Owners can play back any session as a video-like replay with a scrubber, playback speed control (0.5× to 10×), and the ability to "step in" at any point to continue editing from that moment in history. |
| :---- |

## **2.6 ★ AI Auto-Layout Engine**

| ★ One click re-arranges any messy diagram into a publication-quality layout using the server-side Dagre/ELK graph layout engine, with AI choosing the best algorithm (hierarchical for flowcharts, force-directed for networks, circular for state machines) based on the diagram's semantic type. |
| :---- |

## **2.7 ★ Semantic Canvas Search**

| ★ Full-text and semantic vector search across all your canvases. "Find all canvases that contain an OAuth flow" returns results even if the shapes are unlabelled — because the AI understands diagram patterns, not just text. |
| :---- |

Each element group is embedded as a vector using a compact vision model and stored in a pgvector/Atlas Vector Search index. Queries use cosine similarity with optional text BM25 hybrid scoring.

## **2.8 ★ Live Annotation Threads**

| ★ Right-click any element or region to start a threaded discussion, just like Google Docs comments — but with rich media (paste screenshots, attach code snippets, @mention teammates) and AI-powered resolution suggestions. |
| :---- |

## **2.9 ★ Presentation Mode with AI Narrator**

| ★ Convert any canvas into a guided walkthrough with auto-generated slides. The AI writes a narrative for each section, highlights paths through the diagram, and can even present it aloud using text-to-speech with synchronized canvas highlighting. |
| :---- |

## **2.10 ★ Plugin & Widget SDK**

| ★ A first-party JavaScript SDK lets developers embed interactive React widgets directly onto the canvas — live API status monitors, runnable code cells, database query results, Figma embeds. The canvas becomes an executable notebook. |
| :---- |

| 3\. System Architecture Overview *The complete technical landscape* |
| :---- |

## **3.1 High-Level Architecture**

| ┌─────────────────────────────────────────────────────────────────────────┐ │                         CLIENT LAYER                                   │ │  Next.js 15 (App Router)  ·  React 19  ·  TypeScript  ·  Tailwind CSS  │ │  Canvas Engine (Custom 2D renderer \+ Konva fallback)                   │ │  Socket.IO Client  ·  WebRTC (voice)  ·  Web Audio API (spatial)       │ └───────────────┬─────────────────────────────────────┬───────────────────┘                 │ HTTPS REST /api/v1/\*                 │ WSS (Socket.IO) ┌───────────────▼─────────────────────────────────────▼───────────────────┐ │                       API GATEWAY / LOAD BALANCER                       │ │           Nginx  ·  SSL Termination  ·  Rate Limiting  ·  CORS          │ └────────────┬──────────────────────────────────────────────┬─────────────┘              │                                              │ ┌────────────▼────────────┐          ┌─────────────────────▼──────────────┐ │   REST API Server       │          │   Socket.IO / Collab Server        │ │   Node.js \+ TypeScript  │          │   Node.js \+ TypeScript             │ │   Express 5             │          │   Socket.IO 4                      │ │   Port 4000             │          │   Port 4001 (or same cluster)      │ └────────────┬────────────┘          └──────────────┬─────────────────────┘              │                                      │ ┌────────────▼──────────────────────────────────────▼──────┐ │                    SERVICE LAYER                          │ │  CanvasService  ElementService  AIService  VoiceService   │ │  UserService    SearchService   ReplayService             │ └────────────┬──────────────────────────────────────────────┘              │ ┌────────────▼─────────────────────────────────────────────────────────────┐ │                      DATA LAYER                                          │ │  MongoDB Atlas         │  Redis 7 (pub/sub, presence, rate limits)       │ │  Collections:          │  Channels: canvas:{id}:cursors                 │ │  • users               │            canvas:{id}:locks                   │ │  • canvases            │  Cache: canvas:{id}:elements (LRU 15min)       │ │  • canvas\_elements     │                                                 │ │  • canvas\_events       │  Anthropic Claude API (AI features)            │ │  • canvas\_snapshots    │  Firebase Auth (identity)                      │ │  • canvas\_branches     │  AWS S3 / Cloudflare R2 (assets, thumbnails)   │ │  • annotations         │  Resend (transactional email)                  │ │  • active\_sessions     │  Stripe (billing — future)                     │ │  • plugins             │                                                 │ └──────────────────────────────────────────────────────────────────────────┘ |
| :---- |

## **3.2 Multi-Server Collaboration Architecture**

For production scale, multiple Socket.IO server instances coordinate via Redis Pub/Sub using the @socket.io/redis-adapter. This allows horizontal scaling of the real-time layer independently of the REST API.

|   Socket Server A          Redis Pub/Sub           Socket Server B   (Users 1-500)            (canvas:{id})           (Users 501-1000)        │                       │                         │   User1 draws ──► emit ──► publish ──────────────► deliver ──► User800 sees it                        (canvas:abc123)              instantly |
| :---- |

## **3.3 Data Flow — Drawing an Element**

7. User pointer down → client generates UUID elementId.

8. While drawing: stroke:preview events emitted at 60fps over WebSocket (no DB writes).

9. Pointer up: element:add emitted → server broadcasts to room immediately (\< 5ms).

10. Server persists element to MongoDB async (decoupled from broadcast).

11. Redis cache for canvas:{id}:elements invalidated, refreshed on next join.

12. Response acknowledged back to originating client with server-confirmed version number.

## **3.4 AI Request Flow**

13. Client emits ai:request with { type, canvasContext, message } over WebSocket.

14. Server queues request in an in-process job queue (BullMQ / simple async queue).

15. AIService calls Anthropic Claude API with canvas state as structured context.

16. Streaming response chunked back to client via ai:stream events.

17. For Ghost AI Collaborator: AI draws via virtual socket, emitting element:add with isGhost flag.

| 4\. Technology Stack & Rationale *Every choice justified* |
| :---- |

## **4.1 Backend Stack**

| Technology | Version | Purpose | Why This Choice |
| :---- | :---- | :---- | :---- |
| Node.js | v22 LTS | Runtime for both REST and WebSocket servers | Event loop ideal for I/O-heavy real-time apps; massive ecosystem |
| TypeScript | 5.5+ | Language for all backend code | Type safety catches bugs at compile time; self-documenting APIs |
| Express | 5.x | HTTP framework for REST API | Minimal, well-understood, mature ecosystem; perfect for API layer |
| Socket.IO | 4.x | Real-time WebSocket layer | Rooms, namespaces, auto-reconnect; Redis adapter for horizontal scale |
| MongoDB | 7.x (Atlas) | Primary database | Flexible schema fits canvas elements; Atlas Vector Search for AI |
| Mongoose | 8.x | ODM layer with TypeScript | Schema validation, middleware, virtual fields, type inference |
| Redis | 7.x | Cache \+ Pub/Sub \+ sessions | Sub-millisecond pub/sub for multi-server collab; LRU cache |
| BullMQ | 5.x | Job queue for AI requests | Rate limiting, retries, priority queues for Anthropic API calls |
| Firebase Admin | 12.x | Auth token verification | Handles OAuth, magic links, social login; battle-tested at scale |
| Zod | 3.x | Runtime schema validation | Validates all API inputs; generates TypeScript types automatically |
| Winston \+ Pino | 3.x | Structured logging | JSON logs for production; human-readable for development |
| Vitest | 1.x | Testing framework | Fast, ESM-native, compatible with TypeScript without config |

## **4.2 Frontend Stack**

| Technology | Purpose |
| :---- | :---- |
| Next.js 15 (App Router) | Full-stack React framework; server components for dashboard; client components for canvas |
| React 19 | UI layer with concurrent features; transitions for smooth canvas interactions |
| TypeScript | End-to-end type safety shared with backend via a shared-types package |
| Tailwind CSS v4 | Utility-first styling; design system tokens for canvas UI consistency |
| Custom Canvas Engine | Pure Canvas 2D API renderer for maximum performance; Konva as optional fallback |
| Perfect Freehand | Calligraphic stroke rendering (thinning, pressure, velocity) — the best available |
| Rough.js | Sketchy shape rendering for handdrawn aesthetic elements |
| Socket.IO Client | Real-time events with automatic reconnection and state recovery |
| WebRTC | Peer-to-peer voice audio; server only relays SDP/ICE signals |
| Web Audio API | Spatial audio panning for positional voice chat |
| Zustand | Lightweight global state; canvas elements, undo stack, user presence |
| TanStack Query | Server state management for REST API calls; optimistic updates |
| Framer Motion | Fluid animations for UI transitions, ghost element appearances, tooltips |

## **4.3 Infrastructure**

| Component | Choice |
| :---- | :---- |
| Container | Docker with multi-stage builds; separate images for API, socket, and worker services |
| Orchestration | Kubernetes (production) / Docker Compose (development) |
| CI/CD | GitHub Actions: lint → test → build → push to container registry → deploy |
| CDN / Assets | Cloudflare R2 for canvas thumbnails and image elements; Cloudflare CDN for static assets |
| Monitoring | Grafana \+ Prometheus for metrics; Sentry for error tracking; Datadog APM |
| Secrets | HashiCorp Vault (production) / .env files with dotenv-vault (development) |
| Email | Resend for transactional emails (canvas invitations, share notifications) |

| 5\. Database Design *MongoDB schema — every collection, every field* |
| :---- |

## **5.1 Design Philosophy**

* **Separate canvas metadata from elements:** Canvas document holds no element data — elements live in their own collection. This avoids MongoDB's 16 MB document limit for large canvases.

* **Event sourcing for undo/history:** Every mutation writes an event to canvas\_events. State is reconstructed from events \+ periodic snapshots.

* **Soft deletes everywhere:** isDeleted flag on elements, events, and canvases. Hard deletes are async background jobs.

* **Compound indexes for all query patterns:** No collection scans in the hot path.

## **5.2 Collection: users**

| // IUser — MongoDB document shape interface IUser {   \_id:         ObjectId;   fId:         string;          // Firebase UID — primary lookup key   email:       string;          // unique, lowercase, trimmed   fullName:    string;          // display name, max 120 chars   avatarUrl:   string | null;   // CDN URL to uploaded avatar   avatarId:    number;          // fallback numeric avatar seed   plan:        "free" | "pro" | "team" | "enterprise";   preferences: {     theme:          "system" | "dark" | "light";     cursorColor:    string;     // CSS hex chosen by user     defaultTool:    string;     // last used tool persisted     gridEnabled:    boolean;     snapToGrid:     boolean;     fontSize:       number;   };   canvasCount:  number;         // cached count, updated async   isActive:     boolean;   lastSeenAt:   Date;   createdAt:    Date;   updatedAt:    Date; } // Indexes users.createIndex({ fId: 1 }, { unique: true }); users.createIndex({ email: 1 }, { unique: true }); |
| :---- |

## **5.3 Collection: canvases**

| interface ICanvas {   \_id:         ObjectId;   title:       string;          // max 200 chars   description: string;          // rich text, max 2000 chars   owner:       ObjectId;        // ref: User   collaborators: Array\<{     user:    ObjectId;          // ref: User     role:    "viewer" | "editor" | "commenter";     addedAt: Date;     addedBy: ObjectId;   }\>;   shareTokens: Array\<{     token:     string;          // 40-char hex, crypto.randomBytes(20)     role:      "viewer" | "editor" | "commenter";     label:     string;          // e.g. "Public viewer link"     expiresAt: Date | null;     // optional expiry     maxUses:   number | null;   // optional use limit     useCount:  number;     createdAt: Date;     revokedAt: Date | null;   }\>;   isPublic:    boolean;         // read access without any token   thumbnail:   string | null;   // CDN URL (not base64 in DB)   thumbnailUpdatedAt: Date | null;   elementCount:  number;        // cached, updated on save   activeUserCount: number;      // in-memory, not persisted   tags:        string\[\];        // max 20 tags, max 50 chars each   category:    "flowchart" | "architecture" | "brainstorm" | "wireframe" | "erd" | "other";   lastViewport: { x: number; y: number; zoom: number; };   currentBranch: ObjectId | null;  // ref: canvas\_branches   defaultBranch: ObjectId | null;  // the canonical branch   forkOf:       ObjectId | null;   // if this is a fork/duplicate   forkSnapshotId: ObjectId | null;   settings: {     gridSize:       number;     // default 20     snapToGrid:     boolean;     backgroundColor: string;     allowComments:  boolean;     allowAnonymousView: boolean;     aiEnabled:      boolean;   };   archivedAt:  Date | null;   deletedAt:   Date | null;   createdAt:   Date;   updatedAt:   Date; } |
| :---- |

## **5.4 Collection: canvas\_elements**

One document per drawing primitive. This is the hottest collection — every draw operation writes here.

| interface ICanvasElement {   \_id:         ObjectId;   canvasId:    ObjectId;        // indexed — primary query axis   elementId:   string;          // UUID from client, unique per canvas   type:        ElementType;     // stroke|shape|text|image|frame|connector|sticky|widget   subtype:     string;          // pen|marker|rectangle|ellipse|... (see Section 7\)   // Spatial   x: number; y: number; width: number; height: number; rotation: number;   // Stroke path (ordered, high-resolution)   points:      Array\<{ x: number; y: number; p: number; t: number; }\>; // p=pressure, t=time   // Connector   fromElementId:  string | null;   toElementId:    string | null;   fromAnchor:     "top"|"right"|"bottom"|"left"|"center"|null;   toAnchor:       "top"|"right"|"bottom"|"left"|"center"|null;   fromPoint:      Point | null;   toPoint:        Point | null;   waypoints:      Point\[\];      // user-dragged waypoints on connector   controlPoints:  Point\[\];      // Bezier control points (computed)   routingAlgorithm: "orthogonal"|"curved"|"straight";   // Text   text:       string; label: string;   fontSize:   number; fontFamily: string; fontWeight: string;   fontStyle:  string; textAlign:  string; textColor:  string;   lineHeight: number; letterSpacing: number;   // Style   strokeColor: string; fillColor: string;   strokeWidth: number; opacity:   number;   dashed: boolean; dashArray: number\[\];   roughness: number; roundness: number;   shadow: { blur: number; color: string; offsetX: number; offsetY: number; } | null;   // Arrow   arrowStart: boolean; arrowEnd: boolean;   arrowHeadStyle: "triangle"|"open"|"dot"|"diamond"|"none";   arrowTailStyle: "triangle"|"open"|"dot"|"diamond"|"none";   // Image / Widget   imageUrl:   string | null;   // CDN URL   widgetType: string | null;   // for type="widget"   widgetData: Record\<string, unknown\> | null;   // Layer   zIndex:    number;   groupId:   string | null;    // logical grouping UUID   frameId:   string | null;    // parent frame elementId   // AI   isGhostSuggestion: boolean;  // AI-proposed, not yet accepted   aiConfidence:      number;   // 0-1, shown in ghost UI   aiReasoning:       string;   // shown in ghost tooltip   // State   isDeleted: boolean; isLocked: boolean; isPinned: boolean;   // Audit   createdBy: ObjectId; updatedBy: ObjectId; version: number;   createdAt: Date;    updatedAt: Date; } |
| :---- |

Indexes on canvas\_elements:

| canvas\_elements.createIndex({ canvasId: 1, isDeleted: 1 });             // primary query canvas\_elements.createIndex({ canvasId: 1, elementId: 1 }, { unique: true }); canvas\_elements.createIndex({ canvasId: 1, zIndex: 1 });                // render order canvas\_elements.createIndex({ canvasId: 1, frameId: 1 });               // frame contents canvas\_elements.createIndex({ canvasId: 1, groupId: 1 });               // group operations canvas\_elements.createIndex({ canvasId: 1, fromElementId: 1 });         // connector queries canvas\_elements.createIndex({ canvasId: 1, toElementId: 1 }); canvas\_elements.createIndex({ canvasId: 1, isGhostSuggestion: 1 });     // AI ghost queries canvas\_elements.createIndex({ canvasId: 1, updatedAt: 1 });             // incremental sync |
| :---- |

## **5.5 Collection: canvas\_events (Event Sourcing)**

| interface ICanvasEvent {   \_id:         ObjectId;   canvasId:    ObjectId;   branchId:    ObjectId;        // which branch this event belongs to   sequenceNo:  number;          // monotonically increasing per canvas   type:        "element\_add" | "element\_update" | "element\_delete"              | "element\_batch" | "canvas\_clear" | "canvas\_title\_change"              | "collaborator\_add" | "branch\_create";   payload:     Record\<string, unknown\>; // the actual delta   prevState:   Record\<string, unknown\>; // for undo (previous values only)   userId:      ObjectId;   sessionId:   string;          // socket session that produced this event   clientTimestamp: Date;        // when client sent it   createdAt:   Date;            // when server received it } // TTL: events older than 90 days are archived to S3 and removed from MongoDB canvas\_events.createIndex({ canvasId: 1, sequenceNo: 1 }); canvas\_events.createIndex({ canvasId: 1, createdAt: 1 }); canvas\_events.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days |
| :---- |

## **5.6 Collection: annotations**

| interface IAnnotation {   \_id:         ObjectId;   canvasId:    ObjectId;   // Where on canvas (can be region or element-attached)   attachedToElementId: string | null;   region: { x: number; y: number; width: number; height: number; } | null;   // Thread   parentId:    ObjectId | null;  // null \= root comment   text:        string;           // rich text (ProseMirror JSON)   attachments: Array\<{ url: string; type: string; name: string; }\>;   reactions:   Array\<{ emoji: string; users: ObjectId\[\]; }\>;   mentions:    ObjectId\[\];   resolvedAt:  Date | null;   resolvedBy:  ObjectId | null;   author:      ObjectId;   isAiGenerated: boolean;   createdAt:   Date;   updatedAt:   Date; } |
| :---- |

## **5.7 Other Collections (Summary)**

| Collection | Purpose & Key Fields |
| :---- | :---- |
| canvas\_snapshots | Full element snapshots every 50 events. Fields: canvasId, branchId, sequenceNo, elements\[\], createdAt. Used for time-travel scrubbing. |
| canvas\_branches | Git-style branches. Fields: canvasId, name, baseSnapshotId, createdBy, mergedAt, parentBranchId. |
| active\_sessions | Live socket presence. TTL 2h. Fields: canvasId, userId, socketId, userName, userColor, role, joinedAt, lastSeen. |
| plugins | Registered canvas widgets/plugins. Fields: name, version, authorId, manifest (JSON), assetUrl, isPublic, installCount. |
| canvas\_templates | Starter templates. Fields: title, category, thumbnail, elements\[\], creatorId, isOfficial, useCount. |
| notifications | In-app and email notifications. Fields: userId, type, payload, read, createdAt. TTL 30 days. |
| api\_keys | For programmatic access. Fields: userId, keyHash, name, scopes\[\], lastUsed, revokedAt. |

| 6\. Backend Architecture *Node.js \+ TypeScript — folder by folder* |
| :---- |

## **6.1 Project Structure**

| drawsync-api/ ├── src/ │   ├── config/             \# DB, Redis, Firebase, S3, environment validation │   │   ├── db.ts │   │   ├── redis.ts │   │   ├── firebase.ts │   │   ├── storage.ts      \# S3/R2 client │   │   └── env.ts          \# Zod-validated env schema (fails fast on missing vars) │   │ │   ├── types/              \# Shared TypeScript interfaces exported as npm package │   │   ├── canvas.types.ts │   │   ├── element.types.ts │   │   ├── user.types.ts │   │   ├── socket.types.ts │   │   └── ai.types.ts │   │ │   ├── models/             \# Mongoose models with TypeScript generics │   │   ├── user.model.ts │   │   ├── canvas.model.ts │   │   ├── canvas-element.model.ts │   │   ├── canvas-event.model.ts │   │   ├── canvas-snapshot.model.ts │   │   ├── canvas-branch.model.ts │   │   ├── annotation.model.ts │   │   ├── active-session.model.ts │   │   └── notification.model.ts │   │ │   ├── middleware/         \# Express middleware │   │   ├── auth.middleware.ts   \# Firebase token verification │   │   ├── validate.middleware.ts  \# Zod schema validation │   │   ├── rateLimit.middleware.ts │   │   └── error.middleware.ts  \# Central error handler │   │ │   ├── services/           \# Business logic — no HTTP or socket knowledge │   │   ├── canvas.service.ts │   │   ├── element.service.ts │   │   ├── ai.service.ts │   │   ├── voice.service.ts │   │   ├── search.service.ts │   │   ├── replay.service.ts │   │   ├── layout.service.ts    \# Auto-layout (Dagre/ELK) │   │   ├── codegen.service.ts   \# Diagram ↔ Code bridge │   │   ├── thumbnail.service.ts │   │   ├── notification.service.ts │   │   └── storage.service.ts │   │ │   ├── controllers/        \# HTTP handlers — thin, delegate to services │   │   ├── user.controller.ts │   │   ├── canvas.controller.ts │   │   ├── element.controller.ts │   │   ├── annotation.controller.ts │   │   ├── ai.controller.ts │   │   ├── search.controller.ts │   │   ├── branch.controller.ts │   │   └── template.controller.ts │   │ │   ├── routes/             \# Express routers — only routing logic │   │   ├── user.routes.ts │   │   ├── canvas.routes.ts │   │   ├── annotation.routes.ts │   │   ├── ai.routes.ts │   │   ├── search.routes.ts │   │   └── template.routes.ts │   │ │   ├── socket/             \# Socket.IO event handlers │   │   ├── socket.server.ts     \# Socket.IO server init \+ Redis adapter │   │   ├── handlers/ │   │   │   ├── canvas.handler.ts │   │   │   ├── element.handler.ts │   │   │   ├── voice.handler.ts │   │   │   ├── ai.handler.ts │   │   │   └── annotation.handler.ts │   │   ├── middleware/ │   │   │   └── socketAuth.middleware.ts │   │   └── rooms/ │   │       ├── RoomManager.ts   \# In-memory presence state │   │       ├── LockManager.ts   \# Element locking │   │       └── VoiceRoomManager.ts │   │ │   ├── jobs/               \# BullMQ background workers │   │   ├── ai.job.ts            \# AI request processing │   │   ├── thumbnail.job.ts     \# Thumbnail generation queue │   │   ├── snapshot.job.ts      \# Periodic canvas snapshots │   │   ├── search-index.job.ts  \# Vector embedding queue │   │   └── cleanup.job.ts       \# Soft-delete pruning │   │ │   └── utils/ │       ├── logger.ts │       ├── errors.ts       \# Typed error classes │       ├── sanitize.ts     \# Element field whitelist │       └── geometry.ts     \# Point math helpers │ ├── tests/ │   ├── unit/               \# Pure function tests │   ├── integration/        \# Service \+ DB tests (test MongoDB) │   └── e2e/                \# Full HTTP \+ socket tests (Supertest \+ socket.io-client) │ ├── server.ts               \# Entry point — wires Express \+ Socket.IO \+ jobs ├── tsconfig.json ├── Dockerfile └── package.json |
| :---- |

## **6.2 Service Layer Pattern**

Services are pure TypeScript classes that receive dependencies via constructor injection. They have no knowledge of Express request/response objects or Socket.IO sockets, making them fully testable in isolation.

| export class CanvasService {   constructor(     private readonly canvasRepo: CanvasRepository,     private readonly elementRepo: ElementRepository,     private readonly eventRepo: EventRepository,     private readonly cache: RedisCache,     private readonly storage: StorageService,   ) {}   async getCanvas(canvasId: string, userId: string): Promise\<CanvasWithRole\> {     // 1\. Cache check     // 2\. DB fetch \+ populate     // 3\. Role resolution     // 4\. Return typed result   } } |
| :---- |

## **6.3 Error Handling Strategy**

A typed error hierarchy ensures consistent HTTP status codes and error payloads across all endpoints.

| class AppError extends Error {   constructor(public message: string, public statusCode: number, public code: string) { super(message); } } class NotFoundError    extends AppError { constructor(msg: string) { super(msg, 404, "NOT\_FOUND"); } } class ForbiddenError   extends AppError { constructor(msg: string) { super(msg, 403, "FORBIDDEN"); } } class ValidationError  extends AppError { constructor(msg: string) { super(msg, 400, "VALIDATION"); } } class ConflictError    extends AppError { constructor(msg: string) { super(msg, 409, "CONFLICT"); } } // Central error middleware emits: // { error: { code, message, details?, requestId } } |
| :---- |

| 7\. REST API Reference *Complete endpoint specification — every route, every field* |
| :---- |

| ℹ Base URL: https://api.drawsync.app/v1  |  Auth: Authorization: Bearer \<Firebase ID Token\>  |  All responses: application/json |
| :---- |

## **7.1 Authentication & Users**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| POST | /auth/signup | Bearer | Register account. Body: { fullName, preferences? }. Verifies token server-side. |
| POST | /auth/login | Bearer | Returns MongoDB user from Firebase token. Creates user if missing (magic link flow). |
| GET | /users/me | Required | Own profile including plan, preferences, canvasCount. |
| PUT | /users/me | Required | Update fullName, avatarUrl, preferences. Validates with Zod. |
| GET | /users/me/canvases | Required | Owned canvases. Query: ?page\&limit\&search\&category\&tags\&sort |
| GET | /users/me/shared | Required | Canvases shared with me. Includes myRole per canvas. |
| GET | /users/me/notifications | Required | In-app notifications. Query: ?unread=true\&limit |
| PUT | /users/me/notifications/read | Required | Mark notifications read. Body: { ids\[\] } or { all: true } |
| DELETE | /users/me | Required | Account deletion. Queues async job to clean canvases. |
| GET | /users/search | Required | Search users by email/name for collaborator invite. Query: ?q= |

## **7.2 Canvas CRUD**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| POST | /canvases | Required | Create canvas. Body: { title?, category?, settings?, templateId? } |
| GET | /canvases/:id | Optional | Canvas metadata \+ userRole. Header: x-share-token. Returns full canvas object. |
| PUT | /canvases/:id | Editor+ | Update title, description, tags, category, settings. Owner-only: isPublic. |
| DELETE | /canvases/:id | Owner | Soft-delete canvas. Queues async hard-delete after 30 days. |
| POST | /canvases/:id/restore | Owner | Restore soft-deleted canvas. |
| POST | /canvases/:id/duplicate | Any role | Clone canvas as new owner. Body: { title? }. Deep copies elements. |
| POST | /canvases/:id/archive | Owner | Archive (hide from dashboard, preserve data). |
| GET | /canvases/public | None | Browse public canvases. Query: ?q\&category\&sort=trending|recent|popular |

## **7.3 Elements**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| GET | /canvases/:id/elements | Any role | All non-deleted elements sorted by zIndex. Query: ?minX\&minY\&maxX\&maxY for viewport filtering. |
| POST | /canvases/:id/elements/save | Editor+ | Bulk upsert. Body: { elements\[\], deletedIds\[\], viewport? }. Works with sendBeacon. |
| GET | /canvases/:id/elements/:elementId | Any role | Single element by elementId. |
| POST | /canvases/:id/elements/import | Editor+ | Import elements from Mermaid, PlantUML, or draw.io XML. Body: { format, data } |
| GET | /canvases/:id/elements/export | Any role | Export as SVG, PNG, PDF, Mermaid, PlantUML. Query: ?format\&elementIds\[\] |

## **7.4 Sharing & Collaboration**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| GET | /canvases/join/:token | None | Resolve share token → { canvasId, title, role, expiresAt } |
| POST | /canvases/:id/share | Owner | Generate/get share links. Body: { roles\[\], expiresIn?, maxUses?, label? } |
| DELETE | /canvases/:id/share/:role | Owner | Revoke share token for role. |
| POST | /canvases/:id/collaborators | Owner | Add by email or userId. Body: { email?, userId?, role, message? }. Sends invite email. |
| PUT | /canvases/:id/collaborators/:uid | Owner | Change role. Body: { role } |
| DELETE | /canvases/:id/collaborators/:uid | Owner | Remove collaborator. |
| POST | /canvases/:id/leave | Collab | Self-remove. |
| GET | /canvases/:id/collaborators | Any role | List collaborators with name, avatar, role, lastSeen. |

## **7.5 Thumbnails & Assets**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| POST | /canvases/:id/thumbnail | Editor+ | Upload thumbnail. Body: multipart/form-data file OR { thumbnail: base64 }. Stored in R2. |
| POST | /assets/upload | Required | Pre-signed R2 upload URL for canvas images. Body: { filename, contentType, canvasId } |
| DELETE | /assets/:assetId | Required | Delete asset if owned by requesting user. |

## **7.6 Annotations**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| GET | /canvases/:id/annotations | Any role | All annotations. Query: ?elementId\&resolved=false |
| POST | /canvases/:id/annotations | Commenter+ | Create annotation/comment. Body: { text, region?, attachedToElementId?, parentId? } |
| PUT | /canvases/:id/annotations/:aId | Author | Edit text or attachments. |
| DELETE | /canvases/:id/annotations/:aId | Author/Owner | Soft-delete annotation. |
| POST | /canvases/:id/annotations/:aId/resolve | Commenter+ | Mark thread resolved. |
| POST | /canvases/:id/annotations/:aId/react | Any role | Add emoji reaction. Body: { emoji } |

## **7.7 AI Endpoints**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| POST | /canvases/:id/ai/chat | Any role | Conversational AI with canvas context. Body: { message, history\[\], canvasContext }. Streaming response. |
| POST | /canvases/:id/ai/summarize | Any role | Generate structured summary of current canvas content. |
| POST | /canvases/:id/ai/suggest | Any role | Request AI ghost suggestions. Triggers Ghost AI Collaborator flow. |
| POST | /canvases/:id/ai/layout | Editor+ | Auto-layout all or selected elements. Body: { algorithm?, elementIds? } |
| POST | /canvases/:id/ai/code-to-diagram | Editor+ | Convert code to diagram. Body: { code, language, diagramType? } |
| POST | /canvases/:id/ai/diagram-to-code | Any role | Convert diagram to code. Body: { language, elementIds? } |
| POST | /canvases/:id/ai/accept-ghost | Editor+ | Accept AI ghost elements. Body: { elementIds\[\] } |
| DELETE | /canvases/:id/ai/ghosts | Editor+ | Dismiss all ghost suggestions. |

## **7.8 Branches (Version History)**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| GET | /canvases/:id/branches | Any role | List all branches with name, createdBy, eventCount, createdAt. |
| POST | /canvases/:id/branches | Editor+ | Create branch from current state or named snapshot. Body: { name, fromSnapshotId? } |
| GET | /canvases/:id/branches/:bId/events | Any role | Paginated event stream for replay. Query: ?from=seqNo\&limit |
| GET | /canvases/:id/branches/:bId/snapshot/:seqNo | Any role | Elements at a specific point in history. |
| POST | /canvases/:id/branches/:bId/merge | Owner | Merge branch back into main. Body: { strategy: "overwrite"|"append" } |

## **7.9 Search**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| GET | /search/canvases | Required | Full-text \+ semantic search. Query: ?q\&type=text|semantic|hybrid\&category\&tags |
| GET | /search/elements | Required | Search elements across all accessible canvases by text content. |

## **7.10 Templates**

| Method | Path | Auth | Description |
| :---- | :---- | :---- | :---- |
| GET | /templates | Optional | Browse templates. Query: ?category\&q\&official=true |
| POST | /templates | Required | Publish canvas as template. Body: { title, description, category, isPublic } |
| POST | /canvases | Required | Create from template: include templateId in body. |

| 8\. Real-time Collaboration Engine *Socket.IO event architecture — full specification* |
| :---- |

## **8.1 Connection & Room Model**

| // Client connection const socket \= io('wss://api.drawsync.app', {   auth: { token: await firebase.auth().currentUser.getIdToken() },   transports: \['websocket'\],   reconnection: true,   reconnectionAttempts: Infinity,   reconnectionDelay: 1000,   reconnectionDelayMax: 5000, }); // Join a canvas room socket.emit('canvas:join', { canvasId, shareToken: optionalToken }); // Server assigns room \= canvasId (Socket.IO room) // One socket can be in exactly one canvas room at a time // Multiple tabs \= multiple sockets \= multiple room members |
| :---- |

## **8.2 Complete Socket Event Reference — Client → Server**

| Event | Payload Shape | Behaviour |
| :---- | :---- | :---- |
| canvas:join | { canvasId, shareToken? } | Resolves role, sends state snapshot, announces presence |
| canvas:leave | {} | Removes from room, releases locks, cleans voice |
| canvas:save | { canvasId, elements\[\], deletedIds\[\], viewport? } | Bulk upsert \+ broadcast saved |
| canvas:clear | { canvasId } | Soft-delete all elements (editor+), broadcast cleared |
| canvas:undo | { canvasId, restored\[\], deletedIds\[\] } | Applies undo delta \+ persists \+ broadcasts |
| canvas:redo | { canvasId, restored\[\], deletedIds\[\] } | Applies redo delta \+ persists \+ broadcasts |
| element:add | { canvasId, element } | Broadcast first, then async DB persist |
| element:update | { canvasId, element } | Lock check, broadcast, async DB persist |
| element:delete | { canvasId, elementIds\[\] } | Soft-delete in DB, release locks, broadcast |
| elements:batch | { canvasId, added\[\], updated\[\], deletedIds\[\] } | Atomic batch for paste/group-move |
| element:lock | { canvasId, elementId } | Acquire lock. Emits lock\_conflict if taken. |
| element:unlock | { canvasId, elementId } | Release lock if held by caller |
| element:ghost:accept | { canvasId, elementIds\[\] } | Promote ghost elements to real |
| element:ghost:dismiss | { canvasId, elementIds\[\] } | Remove ghost elements |
| stroke:preview | { canvasId, points\[\], style } | High-freq live stroke — NO DB write |
| cursor:move | { canvasId, x, y } | Update in-memory cursor — NO DB write |
| selection:update | { canvasId, elementIds\[\] } | Peer selection awareness |
| viewport:update | { canvasId, viewport } | Follow-me viewport sync |
| annotation:add | { canvasId, annotation } | Persist \+ broadcast new annotation |
| annotation:resolve | { canvasId, annotationId } | Mark thread resolved, notify |
| ai:request | { canvasId, type, message, context } | Queue AI job, stream response back |
| ai:stop | { canvasId, requestId } | Cancel in-flight AI generation |
| voice:join | { canvasId } | Join spatial voice channel |
| voice:leave | { canvasId } | Leave voice channel |
| voice:offer | { canvasId, targetSocketId, sdp } | Forward SDP offer to peer |
| voice:answer | { canvasId, targetSocketId, sdp } | Forward SDP answer to peer |
| voice:ice | { canvasId, targetSocketId, candidate } | Forward ICE candidate |
| voice:mute\_toggle | { canvasId, muted } | Update mute state, broadcast to room |
| voice:position | { canvasId, x, y, zoom } | Update spatial position for audio panning |

## **8.3 Complete Socket Event Reference — Server → Client**

| Event | Payload Shape | When Emitted |
| :---- | :---- | :---- |
| canvas:joined | { canvasId, title, role, lastViewport, settings } | After successful canvas:join |
| canvas:role | { role, canvasId } | Role confirmation on join |
| canvas:state | { elements\[\], canvasId, snapshotSeq } | Full element snapshot on join |
| canvas:saved | { savedAt, elementCount, savedBy } | After canvas:save persisted |
| canvas:cleared | { userId, userName } | After canvas:clear |
| canvas:undo | { restored\[\], deletedIds\[\], userId } | Propagate undo to peers |
| canvas:redo | { restored\[\], deletedIds\[\], userId } | Propagate redo to peers |
| element:added | { element, userId, socketId } | New element from peer |
| element:updated | { element, userId, socketId } | Updated element from peer |
| element:deleted | { elementIds\[\], userId } | Deleted elements from peer |
| elements:batch | { added\[\], updated\[\], deletedIds\[\], userId } | Batch from peer |
| element:locked | { elementId, userId, userName, socketId } | Element locked by peer |
| element:unlocked | { elementId, userId } | Lock released by peer |
| element:lock\_conflict | { elementId, lockedBy, lockedByName } | Lock attempt on taken element |
| element:persist\_error | { elementId, event } | DB write failed — show toast |
| element:ghost:added | { elements\[\], confidence, reasoning } | AI ghost suggestions arrived |
| stroke:preview | { userId, socketId, points\[\], style } | Live stroke from peer |
| cursor:moved | { userId, socketId, userName, userColor, x, y } | Peer cursor update |
| selection:updated | { userId, socketId, elementIds\[\] } | Peer selection change |
| viewport:updated | { userId, socketId, viewport } | Peer viewport update (follow-me) |
| users:active | \[{ socketId, userId, userName, userColor, role, cursor }\] | Full room occupant list |
| user:joined | { userId, userName, userColor, role, socketId } | Peer joined room |
| user:left | { userId, socketId, userName } | Peer left room |
| annotation:added | { annotation, userId } | New annotation from peer |
| annotation:resolved | { annotationId, resolvedBy } | Thread resolved by peer |
| ai:stream | { requestId, chunk, done, elements? } | Streaming AI response chunks |
| ai:error | { requestId, error } | AI request failed |
| voice:user\_joined | { participant, participants\[\], canvasId } | Peer joined voice channel |
| voice:user\_left | { socketId, userId, participants\[\], canvasId } | Peer left voice channel |
| voice:offer | { canvasId, fromSocketId, fromUserId, sdp } | SDP offer from peer |
| voice:answer | { canvasId, fromSocketId, sdp } | SDP answer from peer |
| voice:ice | { canvasId, fromSocketId, candidate } | ICE candidate from peer |
| voice:mute\_changed | { socketId, muted, participants\[\] } | Peer muted/unmuted |
| voice:participants | { canvasId, participants\[\] } | Current voice room on join |
| error | { code, message } | Server-side error |

## **8.4 Optimistic Concurrency & Conflict Resolution**

Each element carries a version number. When a client sends element:update, the server checks:

* **Happy path:** Server version matches client expectation → update applied, version incremented, broadcast.

* **Stale update:** Server version is higher (another peer edited first) → server broadcasts element:conflict with the current server state. Client merges or prompts user.

* **Lock check:** If another socket holds the lock for this elementId, the update is rejected with element:lock\_conflict.

For text elements, a simple Operational Transform (OT) policy is applied: last-write-wins for style properties, character-level merging for text content using a CRDT-inspired approach.

| 9\. AI Intelligence Layer *The brain of DrawSync* |
| :---- |

## **9.1 AI Architecture Overview**

All AI features route through the AIService, which manages Anthropic API calls via BullMQ job queues. This provides rate limiting, retries, priority queuing (interactive requests \> background jobs), and cost tracking per user/canvas.

| AIService   ├── chat()              → Conversational AI with canvas context   ├── ghostSuggest()      → Ghost AI Collaborator (draws on canvas)   ├── summarize()         → Canvas summary for sharing/documentation   ├── autoLayout()        → Semantic layout algorithm selection \+ execution   ├── codeFromDiagram()   → Diagram → code in chosen language   ├── diagramFromCode()   → Code → canvas elements   ├── strokeSuggest()     → Real-time shape recognition from rough stroke   ├── annotationResolve() → Suggest resolution for annotation threads   └── presentationGen()  → Canvas → guided presentation with narration |
| :---- |

## **9.2 Ghost AI Collaborator — Implementation Detail**

| // 1\. Client triggers via socket or REST socket.emit('ai:request', {   canvasId,   type: 'ghost\_suggest',   message: 'Complete this authentication flow diagram',   context: buildCanvasContext(elements), // text description of all elements }); // 2\. Server AIService builds structured prompt: const prompt \= \` You are a diagram assistant embedded in a collaborative canvas. Current canvas elements (JSON): ${JSON.stringify(sanitizedElements, null, 2)} The user says: "${message}" Respond ONLY with a JSON object: {   "suggestions": \[     {       "elementId": "\<uuid\>",       "type": "shape",       "subtype": "rectangle",       "x": 200, "y": 300, "width": 160, "height": 60,       "label": "Refresh Token Store",       "fillColor": "\#E3F2FD",       "strokeColor": "\#1565C0",       "confidence": 0.92,       "reasoning": "Missing token refresh step detected in OAuth flow"     },     // connector suggestion:     {       "elementId": "\<uuid2\>",       "type": "connector",       "fromElementId": "\<existingId\>",       "toElementId":   "\<uuid\>",       "label": "refresh",       "confidence": 0.87,       "reasoning": "Token refresh requires connection from auth server"     }   \],   "summary": "Added missing token refresh flow components" } \`; // 3\. Server emits ghost elements back to ALL clients in room io.to(canvasId).emit('element:ghost:added', {   elements: suggestions.map(s \=\> ({ ...s, isGhostSuggestion: true })),   summary,   requestId, }); // 4\. Client renders ghost elements at 40% opacity with glowing border // 5\. Any user can accept or dismiss via button overlay or socket event |
| :---- |

## **9.3 Canvas Context Builder**

The AIService builds a rich text representation of the canvas to include in prompts. This is structured enough for the AI to reason about spatial relationships and connections.

| function buildCanvasContext(elements: ICanvasElement\[\]): string {   const shapes   \= elements.filter(e \=\> e.type \=== "shape");   const texts    \= elements.filter(e \=\> e.type \=== "text");   const connectors \= elements.filter(e \=\> e.type \=== "connector");   const labels   \= \[...shapes, ...texts\].map(e \=\> e.label || e.text || e.subtype).filter(Boolean);   const connDesc \= connectors.map(c \=\> {     const from \= elements.find(e \=\> e.elementId \=== c.fromElementId);     const to   \= elements.find(e \=\> e.elementId \=== c.toElementId);     return \`"${from?.label}" → "${to?.label}"${c.label ? \` (${c.label})\` : ""}\`;   });   return \[     \`Canvas contains ${elements.length} elements.\`,     \`Shapes: ${shapes.map(s \=\> \`${s.subtype}("${s.label||""}")\`).join(", ")}\`,     connDesc.length ? \`Connections: ${connDesc.join("; ")}\` : "No connections.",     \`Text blocks: ${texts.map(t \=\> \`"${t.text?.slice(0,80)}"\`).join(", ")}\`,   \].join("\\n"); } |
| :---- |

## **9.4 Code ↔ Diagram Bridge**

**Code → Diagram:** Uses tree-sitter for language-agnostic AST parsing, then maps AST nodes to canvas element types:

| Code Construct | Canvas Element | Auto-Properties |
| :---- | :---- | :---- |
| Class / Interface | Rectangle shape | Label \= class name; fields listed inside |
| Function / Method | Rounded rectangle | Label \= function signature |
| Import / Dependency | Connector (dashed) | Connects dependent to dependency |
| Function call | Connector (solid, arrow) | From caller to callee |
| if/else branch | Diamond shape | Label \= condition |
| loop (for/while) | Arrow back to previous node | Label \= loop condition |
| return statement | Oval / terminal shape | Label \= return value type |
| try/catch | Rectangle with red border | Sub-shapes for each catch block |

**Diagram → Code:** Traverses element graph depth-first, mapping shapes back to code primitives. Output is scaffolding (function stubs, class shells) in the chosen language, not complete implementation.

## **9.5 Streaming AI Responses**

Interactive AI chat uses Anthropic's streaming API. Chunks are forwarded to the client via Socket.IO in real time:

| const stream \= await anthropicClient.messages.stream({   model: 'claude-opus-4-5',   max\_tokens: 1024,   system: systemPrompt,   messages, }); for await (const chunk of stream) {   if (chunk.type \=== "content\_block\_delta") {     socket.emit('ai:stream', {       requestId,       chunk: chunk.delta.text,       done: false,     });   } } socket.emit('ai:stream', { requestId, chunk: '', done: true }); |
| :---- |

| 10\. Voice & Spatial Audio System *WebRTC \+ Web Audio API — peer-to-peer with position* |
| :---- |

## **10.1 Voice Architecture**

Voice is entirely peer-to-peer WebRTC. The server only relays SDP handshake signals and ICE candidates — no audio data ever passes through the server. This gives:

* **Sub-100ms latency:** Direct peer connections without server hops

* **Zero server bandwidth cost:** Audio streams bypass the server entirely

* **Privacy:** Audio cannot be recorded or intercepted at the server level

## **10.2 Spatial Audio Implementation**

| // On each frame, update PannerNode position for each peer function updateSpatialAudio(   peerUserId: string,   peerViewportCenter: { x: number; y: number },   myViewportCenter: { x: number; y: number },   audioContext: AudioContext,   pannerNodes: Map\<string, PannerNode\> ) {   const panner \= pannerNodes.get(peerUserId);   if (\!panner) return;   // Convert canvas coordinates to audio space (normalised \-10 to \+10)   const scale \= 0.001;   const dx \= (peerViewportCenter.x \- myViewportCenter.x) \* scale;   const dy \= (peerViewportCenter.y \- myViewportCenter.y) \* scale;   // Clamp to reasonable range   const x \= Math.max(-10, Math.min(10, dx));   const z \= Math.max(-10, Math.min(10, dy));   const distance \= Math.sqrt(dx\*dx \+ dy\*dy);   panner.positionX.setTargetAtTime(x, audioContext.currentTime, 0.1);   panner.positionZ.setTargetAtTime(z, audioContext.currentTime, 0.1);   // Volume attenuation based on canvas distance   panner.rolloffFactor \= 1.5;   panner.refDistance  \= 2;   // full volume within 2 "units"   panner.maxDistance  \= 15;  // silent beyond 15 "units" } // Peer emits viewport centre every 500ms: socket.emit('voice:position', { canvasId, x: vpCenterX, y: vpCenterY, zoom }); |
| :---- |

## **10.3 Mesh vs SFU Strategy**

DrawSync starts with a full-mesh WebRTC topology (every peer connects to every other peer). This works well for up to 6 simultaneous voice participants. For larger groups (team-wide), a selective forwarding unit (SFU) such as mediasoup can be introduced as an optional upgrade path, transparently replacing the signaling without changing the client API.

| Participants | Strategy | Server Load |
| :---- | :---- | :---- |
| 1-6 | Full mesh (current) | Zero audio bandwidth |
| 7-20 | SFU via mediasoup | Minimal — only routing |
| 20+ | Selective SFU with scene graph partitioning | Only nearby peers are connected |

| 11\. Frontend Architecture & Component Design *Next.js \+ React \+ Custom Canvas Engine* |
| :---- |

## **11.1 Routing Structure (Next.js App Router)**

| app/ ├── (auth)/ │   ├── login/page.tsx          \# Firebase Auth UI │   └── signup/page.tsx ├── (dashboard)/               \# Protected layout with sidebar │   ├── layout.tsx              \# Sidebar, navbar, notifications │   ├── page.tsx                \# Home: recent canvases, quick start │   ├── canvases/page.tsx       \# Full canvas list with filters │   ├── shared/page.tsx         \# Shared with me │   ├── templates/page.tsx      \# Template gallery │   ├── search/page.tsx         \# Global search results │   └── settings/page.tsx       \# Profile, preferences, billing ├── canvas/ │   ├── \[id\]/page.tsx           \# The full-screen canvas editor │   └── join/\[token\]/page.tsx   \# Share link landing page ├── api/                        \# Next.js API routes (minimal — mostly for auth refresh) └── layout.tsx                  \# Root: providers, fonts, global styles |
| :---- |

## **11.2 Canvas Editor Architecture**

The canvas editor is the most performance-critical component. It uses a layered rendering model:

| \<CanvasEditorRoot\>           // Context providers (socket, presence, undo, tools)   \<CanvasToolbar /\>          // Top toolbar: tools, AI, share, history   \<CanvasSidebar /\>          // Right panel: layers, properties, AI chat   \<CanvasVoiceBar /\>         // Bottom voice participants strip   \<CanvasStage\>              // The infinite canvas itself     \<StaticLayer /\>          // Committed elements (re-render only on change)     \<DynamicLayer /\>         // Active drawing (re-renders every frame)     \<PeerLayer /\>            // Remote cursors \+ live stroke previews     \<GhostLayer /\>           // AI ghost suggestions (animated opacity)     \<SelectionLayer /\>       // Selection handles, resize grips     \<AnnotationLayer /\>      // Comment pins and annotation popups     \<GridLayer /\>            // Background grid (canvas layer 0\)   \</CanvasStage\>   \<CanvasAnnotationPanel /\> // Floating annotation threads   \<CanvasAIPanel /\>          // AI chat \+ ghost suggestion panel \</CanvasEditorRoot\> |
| :---- |

## **11.3 Rendering Pipeline**

All drawing is performed on raw HTML5 Canvas 2D contexts, not SVG or DOM. This allows 60fps rendering of thousands of elements with no DOM overhead.

18. Input events captured on a transparent overlay element (pointerdown/move/up).

19. Viewport transform (pan/zoom) applied via canvas context.transform().

20. Static layer: re-renders only when a committed element changes. Uses offscreen canvas for caching.

21. Dynamic layer: redraws every requestAnimationFrame during active drawing operations.

22. Peer layer: composite of remote cursor positions and live stroke previews, updated at 30fps.

23. Hit testing: spatial R-tree (rbush library) for sub-millisecond element selection at any zoom level.

## **11.4 State Management**

| // Zustand stores (each independently subscribable) canvasStore: {   elements: Map\<string, ICanvasElement\>;  // keyed by elementId   ghostElements: Map\<string, ICanvasElement\>;   viewport: { x: number; y: number; zoom: number; };   selectedIds: Set\<string\>;   addElements(els), updateElement(id, patch), deleteElements(ids),   acceptGhost(id), dismissGhost(id) } toolStore: {   activeTool: ToolType;   toolOptions: ToolOptions;  // current stroke style, shape type, etc.   setTool(tool), setOption(key, value) } undoStore: {   stack: UndoEntry\[\];  // max 100 entries   redoStack: UndoEntry\[\];   push(entry), undo(), redo() } presenceStore: {   peers: Map\<string, PeerState\>;  // socketId → cursor, color, name, role   voicePeers: Map\<string, VoicePeer\>;   updatePeer(socketId, patch), removePeer(socketId) } aiStore: {   isThinking: boolean;   chatHistory: ChatMessage\[\];   streamingText: string;   ghostCount: number; } |
| :---- |

## **11.5 Dashboard Design**

The dashboard is a server-rendered Next.js page with the following key sections:

* **Hero quick-start:** "New canvas", "From template", "Import from Mermaid/code" — three prominent CTAs above the fold.

* **Recent canvases:** Grid of up to 8 canvas cards with live thumbnails, last-edited time, collaborator avatars, and a hover preview expanding the thumbnail.

* **Shared with me:** Separate grid showing canvases owned by others, with role badge (Viewer/Editor).

* **Activity feed:** Right sidebar showing recent activity across all accessible canvases (comments, joins, edits).

* **Featured templates:** Horizontal scroll of official templates: System Design, Auth Flow, Kubernetes Architecture, etc.

* **Search bar:** Full-width semantic search powered by Atlas Vector Search. Results appear inline with canvas thumbnail and matching element preview.

| 12\. Security Architecture *Defence in depth* |
| :---- |

## **12.1 Authentication & Authorization**

| Layer | Mechanism |
| :---- | :---- |
| Identity | Firebase Authentication — never roll your own crypto. Supports email/password, Google, GitHub, magic links. |
| Token verification | Firebase ID tokens verified server-side on every request. Token never trusted from client body — fId extracted from verified token only. |
| Session | Stateless JWT (Firebase token). No server-side session storage. Tokens expire after 1 hour; silent refresh handled by Firebase SDK. |
| API authorization | Role-based: owner \> editor \> commenter \> viewer. Checked per-resource in the service layer. |
| Socket authorization | Token verified in Socket.IO middleware before connection is accepted. Role re-verified on canvas:join. |
| Share tokens | Cryptographically random 40-char hex. Optional expiry, use limits, and per-role granularity. |
| API keys | SHA-256 hashed before storage. Key is shown once at creation. Rate-limited independently. |

## **12.2 Input Validation & Sanitization**

* **All REST inputs:** Validated with Zod schemas in validate.middleware.ts before reaching controllers.

* **Element fields:** Strict allowlist (ELEMENT\_ALLOWED\_FIELDS set) — unknown fields are silently dropped, preventing prototype pollution and NoSQL injection.

* **MongoDB:** Mongoose schema typing \+ Zod double-validation prevents operator injection ($where, $expr).

* **HTML content:** Annotation rich text sanitized with DOMPurify before storage and display.

* **File uploads:** Magic-byte validation, mime-type whitelist, max 10MB, virus scan via ClamAV on the worker.

## **12.3 Rate Limiting Strategy**

| Endpoint Group | Limit |
| :---- | :---- |
| Auth (signup/login) | 30 requests / 15 min per IP |
| REST API (general) | 500 requests / 15 min per authenticated user |
| AI endpoints | 60 requests / hour per user (tracked via Redis \+ BullMQ) |
| Asset upload | 100 uploads / day per user |
| Socket events (drawing) | Soft throttle: stroke:preview capped at 60/sec client-side; no hard server limit |
| Socket events (save) | 1 canvas:save per 2 seconds per socket (server enforced) |

## **12.4 Data Privacy**

* Canvas content is encrypted at rest in MongoDB Atlas (AES-256).

* Thumbnails and images stored in Cloudflare R2 with private bucket policy (pre-signed URLs only).

* Voice audio never touches the server (pure WebRTC P2P).

* AI requests include canvas context — users must opt-in to AI features per canvas. AI-enabled flag in canvas settings defaults to false.

* GDPR: account deletion queues async job to scrub all personal data within 30 days.

| 13\. Performance, Caching & Scalability *Built to handle 100,000 concurrent users* |
| :---- |

## **13.1 Caching Strategy**

| Data | Cache Layer | TTL | Invalidation |
| :---- | :---- | :---- | :---- |
| Canvas elements | Redis (canvas:{id}:elements) | 15 min | On any element save/delete to this canvas |
| Canvas metadata | Redis (canvas:{id}:meta) | 5 min | On canvas update |
| User profile | Redis (user:{id}:profile) | 30 min | On user update |
| Active sessions | In-memory Map (primary) | 2h TTL | On socket disconnect |
| Share token lookup | Redis (token:{t}:canvas) | 24h | On token revocation |
| AI responses | Redis (ai:{hash}:response) | 1h | Never (deterministic input → same output) |
| Thumbnails | Cloudflare CDN edge cache | 7 days | Cache-busted by updatedAt timestamp in URL |

## **13.2 Frontend Performance**

* **Virtual rendering:** Only elements within the visible viewport \+ a 20% buffer are rendered. R-tree spatial index makes culling O(log n).

* **Offscreen canvas caching:** The static layer is drawn to an offscreen canvas once and composited, avoiding re-draw of unchanged elements during pan/zoom.

* **Stroke simplification:** Ramer-Douglas-Peucker algorithm applied to stroke points before storage (configurable tolerance). Reduces point count by 60-80% with imperceptible quality loss.

* **Lazy loading:** Images and widget elements are loaded on-demand as they scroll into viewport.

* **Worker threads:** Heavy compute (layout algorithms, code parsing, thumbnail generation) runs in Web Workers to keep the main thread free for rendering.

## **13.3 Horizontal Scaling**

The architecture is stateless at the API layer and uses Redis for all shared state, enabling horizontal scaling of every service independently:

| Kubernetes HPA (Horizontal Pod Autoscaler) targets:   API server:    CPU \> 70%  → scale out, min 2, max 20 pods   Socket server: connections \> 5000/pod → scale out, min 2, max 50 pods   AI workers:    queue depth \> 100 → scale out, min 1, max 10 pods Redis Cluster: 3-node Redis cluster for high availability MongoDB Atlas: auto-scaling M30 → M50 → M60 based on IOPS Socket.IO: @socket.io/redis-adapter routes events across pods |
| :---- |

## **13.4 Database Performance**

* **Write concern:** Drawing events use w:1 (acknowledged). Canvas metadata uses w:majority. This balances durability vs. latency for high-frequency operations.

* **Bulk writes:** All batch saves use MongoDB bulkWrite() with ordered:false for parallel execution.

* **Partial updates:** Only changed fields are sent in $set operations (not full element replacement).

* **Projection:** API responses project only needed fields. Dashboard list never fetches element data.

* **Connection pooling:** Mongoose pool size \= 10 per API pod; 5 per socket pod (lower because socket events are less DB-intensive).

| 14\. Infrastructure & Deployment *From localhost to production on Kubernetes* |
| :---- |

## **14.1 Repository Structure (Monorepo)**

| drawsync/                        \# Turborepo monorepo ├── apps/ │   ├── web/                     \# Next.js frontend │   ├── api/                     \# Express \+ Socket.IO backend │   └── worker/                  \# BullMQ background workers ├── packages/ │   ├── shared-types/            \# TypeScript interfaces (used by all) │   ├── ui/                      \# Shared React component library │   └── canvas-engine/           \# Portable canvas rendering primitives ├── infrastructure/ │   ├── k8s/                     \# Kubernetes manifests │   ├── terraform/               \# Cloud infrastructure as code │   └── docker/                  \# Dockerfiles ├── turbo.json └── package.json |
| :---- |

## **14.2 Environment Variables (Complete)**

| \# ── Server ────────────────────────────────────────────── NODE\_ENV=production PORT=4000 FRONTEND\_URL=https://drawsync.app \# ── Database ───────────────────────────────────────────── MONGO\_URL=mongodb+srv://... REDIS\_URL=redis://...:6379 \# ── Authentication ─────────────────────────────────────── FIREBASE\_SERVICE\_ACCOUNT\_JSON={"type":"service\_account",...} \# ── AI ─────────────────────────────────────────────────── ANTHROPIC\_API\_KEY=sk-ant-... AI\_MODEL\_CHAT=claude-opus-4-5 AI\_MODEL\_FAST=claude-haiku-4-5-20251001 AI\_RATE\_LIMIT\_PER\_HOUR=60 \# ── Storage ────────────────────────────────────────────── R2\_ACCOUNT\_ID=... R2\_ACCESS\_KEY\_ID=... R2\_SECRET\_ACCESS\_KEY=... R2\_BUCKET\_NAME=drawsync-assets CDN\_BASE\_URL=https://assets.drawsync.app \# ── Email ──────────────────────────────────────────────── RESEND\_API\_KEY=re\_... EMAIL\_FROM=noreply@drawsync.app \# ── Feature flags ──────────────────────────────────────── ENABLE\_GHOST\_AI=true ENABLE\_SPATIAL\_VOICE=true ENABLE\_BRANCHING=true |
| :---- |

## **14.3 CI/CD Pipeline**

| GitHub Actions → on: push to main or PR   1\. lint           → ESLint \+ Prettier check across all packages   2\. type-check     → tsc \--noEmit for all TypeScript   3\. test:unit      → Vitest (fast, in-process)   4\. test:integration → Vitest with MongoDB memory server   5\. build          → Docker multi-stage build (node:22-alpine)   6\. scan           → Trivy container vulnerability scan   7\. push           → GHCR / ECR container registry   8\. deploy:staging → kubectl apply to staging namespace (auto on PR merge)   9\. smoke-test     → Playwright E2E against staging  10\. deploy:prod    → Manual approval gate → kubectl rolling update |
| :---- |

| 15\. Development Phases & Roadmap *From MVP to world-class product* |
| :---- |

## **Phase 1 — Core Foundation (Weeks 1-6)**

| ℹ Goal: A working collaborative canvas with real-time drawing, auth, and basic sharing. No AI, no voice. |
| :---- |

* Monorepo setup (Turborepo), TypeScript configs, ESLint/Prettier, Vitest

* MongoDB models: User, Canvas, CanvasElement (with all fields)

* Firebase Auth integration \+ JWT middleware

* REST API: Auth, Canvas CRUD, Element bulk save/load, Share tokens

* Socket.IO: canvas:join/leave, element:add/update/delete, cursor:move, stroke:preview

* Custom Canvas 2D renderer: stroke, shape, text, connector rendering

* Undo/redo with local history stack

* Dashboard: canvas list, create, delete, duplicate

* Sharing: share link generation, join by token

## **Phase 2 — Collaboration & Polish (Weeks 7-10)**

| ℹ Goal: Full real-time collaboration with presence, voice, and annotations. |
| :---- |

* Redis integration: pub/sub for multi-server, presence caching

* WebRTC voice chat (mesh topology, mute/unmute)

* Spatial audio implementation (Web Audio API PannerNode)

* Annotation system (threaded comments, element-attached)

* Element locking and conflict resolution

* Canvas thumbnails (automated \+ manual, stored in R2)

* Collaborator management (invite by email, role changes)

* Notifications (in-app \+ email via Resend)

* Canvas settings (background, grid, snap, AI opt-in)

## **Phase 3 — AI Intelligence (Weeks 11-15)**

| ★ Goal: Ghost AI Collaborator, auto-layout, canvas chat, and code bridge. |
| :---- |

* BullMQ job queue for AI requests

* AI canvas chat with streaming (claude-opus-4-5)

* Canvas summarization and presentation generation

* Ghost AI Collaborator (virtual socket, ghost elements, accept/dismiss)

* Auto-layout engine (Dagre \+ ELK, semantic algorithm selection)

* Code → Diagram (tree-sitter parsing, AST mapping)

* Diagram → Code (TypeScript, Python, Mermaid, PlantUML output)

* Semantic canvas search (Atlas Vector Search)

## **Phase 4 — Version History & Advanced Features (Weeks 16-20)**

| ✓ Goal: Time travel, branching, canvas replay, and plugin SDK. |
| :---- |

* Event sourcing infrastructure (canvas\_events collection, sequence numbers)

* Periodic snapshots (every 50 events, background job)

* Canvas time travel UI (timeline scrubber, step-through mode)

* Branch creation and merge

* Session replay (event stream playback with speed control)

* Template gallery (official \+ community templates)

* Plugin/Widget SDK (React widget embedding on canvas)

* Presentation mode with AI narrator (TTS \+ synchronized highlighting)

## **Phase 5 — Scale & Enterprise (Weeks 21+)**

| ✓ Goal: Production-grade reliability, team management, and billing. |
| :---- |

* Kubernetes deployment with HPA autoscaling

* Grafana \+ Prometheus observability stack

* Team workspaces (shared canvas libraries, role templates)

* Audit log for enterprise compliance

* Stripe billing integration (Free / Pro / Team / Enterprise plans)

* API key management for programmatic access

* SSO (SAML 2.0 / OIDC for enterprise customers)

* SOC 2 Type II compliance groundwork

## **Appendix A — Element Subtypes Complete List**

| Type | Subtypes |
| :---- | :---- |
| stroke | pen, pencil, marker, brush, highlighter, eraser |
| shape | rectangle, rounded-rectangle, ellipse, circle, triangle, diamond, parallelogram, trapezoid, cylinder, hexagon, star, cross, arrow-shape, callout, cloud, polygon |
| text | body, heading, code, label, sticky-text |
| image | raster, svg-embed |
| connector | straight, curved, elbow, stepped |
| frame | section, swimlane, group-box |
| sticky | yellow, pink, green, blue, purple, orange |
| widget | code-cell, api-status, embed, timer, chart |

## **Appendix B — Performance Targets**

| Metric | Target |
| :---- | :---- |
| Canvas load time (cold, 1000 elements) | \< 1.5 seconds |
| Real-time event latency (p50) | \< 20ms |
| Real-time event latency (p99) | \< 100ms |
| Stroke preview frame rate | 60fps on mid-range hardware |
| AI chat first token latency | \< 800ms |
| AI ghost suggestion generation | \< 3 seconds for up to 10 elements |
| REST API response time (p95) | \< 200ms |
| Canvas save (1000 elements) | \< 500ms |
| Voice call setup time | \< 2 seconds (ICE negotiation) |
| Concurrent users per canvas | Up to 50 (voice up to 20\) |
| Canvases per account (free) | 10 |
| Elements per canvas | Unlimited (virtualized rendering) |

| DrawSync *Build the future of collaborative engineering — one canvas at a time.* |
| :---: |

