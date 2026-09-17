# YouTube Watch Party

A real-time collaborative YouTube Watch Party application that allows multiple users to watch YouTube videos together in synchronized rooms.

Users can create or join rooms, chat in real time, control synchronized video playback, and manage participants according to their assigned roles.

## Live Demo

### Frontend
https://youtube-watch-party-web3task.vercel.app/

### Backend API
https://youtube-watch-party-wb4c.onrender.com/

Backend health check:

```text
https://youtube-watch-party-wb4c.onrender.com/
````

Expected response:

```

```
{
  "message": "YouTube Watch Party API is running"
}
```

---

# Features

## Room Management

-  Create a unique watch party room 
-  Join an existing room using a room ID 
-  Share room URLs with other users 
-  Rooms maintain their current video and playback state 
-  Room state is stored using SQLite 

## User Roles

The application supports three roles:

| RolePermissions |                                              |
| --------------- | -------------------------------------------- |
| Host            | Full room control and participant management |
| Moderator       | Video playback control                       |
| Participant     | Watch video and use chat                     |

### Host Features

The Host can:

-  Play video 
-  Pause video 
-  Seek video 
-  Change the YouTube video 
-  Make a participant a Moderator 
-  Remove Moderator permissions 
-  Remove participants 
-  Leave the room 
-  Transfer Host ownership when leaving 

### Moderator Features

Moderators can:

-  Play video 
-  Pause video 
-  Seek video 
-  Change the YouTube video 
-  Participate in chat 

### Participant Features

Participants can:

-  Watch synchronized videos 
-  Join the room 
-  Send chat messages 
-  View chat history 

---

# Real-Time Synchronization

The application uses **Socket.IO** for real-time communication between clients and the backend.

When the Host or Moderator performs a playback action, the action is sent to the backend through a WebSocket connection.

The backend then broadcasts the updated state to other users in the same room.

Example:

```

```
Host
  |
  | Play / Pause / Seek
  v
Socket.IO Server
  |
  | Broadcast updated state
  v
Other Participants
```

This keeps users watching the same video at approximately the same playback position.

---

# Technology Stack

## Frontend

-  React 
-  TypeScript 
-  Vite 
-  React Router 
-  Tailwind CSS 
-  Axios 
-  Socket.IO Client 
-  Lucide React 
-  YouTube IFrame Player API 

## Backend

-  Node.js 
-  Express.js 
-  TypeScript 
-  Socket.IO 
-  SQLite 
-  better-sqlite3 
-  CORS 
-  dotenv 

## Deployment

-  Frontend: Vercel 
-  Backend: Render 
-  Database: SQLite 

---

# Project Architecture

```

```
youtube-watch-party/
│
├── client/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.tsx
│   │   │   ├── PlaybackControls.tsx
│   │   │   ├── VideoInput.tsx
│   │   │   └── YouTubePlayer.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   └── WatchRoom.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   │
│   │   ├── types/
│   │   │   ├── chat.ts
│   │   │   ├── room.ts
│   │   │   └── youtube.ts
│   │   │
│   │   ├── utils/
│   │   │   └── youtube.ts
│   │   │
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/
│   │
│   ├── src/
│   │   ├── database/
│   │   │   └── database.ts
│   │   │
│   │   ├── routes/
│   │   │   └── roomRoutes.ts
│   │   │
│   │   ├── services/
│   │   │   └── roomService.ts
│   │   │
│   │   ├── types/
│   │   │   └── room.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── generateRoomId.ts
│   │   │   └── youtube.ts
│   │   │
│   │   └── server.ts
│   │
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── watch-party.db
│
├── .gitignore
└── README.md
```

---

# Application Architecture

```

```
                   ┌──────────────────────────┐
                   │          User            │
                   │     Browser / Client     │
                   └────────────┬─────────────┘
                                │
                                │ HTTPS
                                ▼
                   ┌──────────────────────────┐
                   │          Vercel          │
                   │    React + TypeScript    │
                   └────────────┬─────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 │ REST API                    │ Socket.IO
                 │                             │
                 ▼                             ▼
        ┌────────────────────────────────────────────┐
        │                   Render                   │
        │                                            │
        │             Node.js + Express              │
        │                 + Socket.IO                │
        │                                            │
        └───────────────────┬────────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │      SQLite      │
                   │                  │
                   │ Rooms            │
                   │ Chat Messages    │
                   └──────────────────┘
```

---

# How It Works

## 1. Creating a Room

A user creates a new room from the Home page.

The backend generates a unique room ID.

```

```
User
  |
  | Create Room
  v
Express / Socket.IO
  |
  | Generate Room ID
  v
Room Created
```

The creator automatically becomes the Host.

---

## 2. Joining a Room

Another user opens the room URL and joins using a username.

The server checks the room and adds the user to the active participant list.

```

```
User B
  |
  | Join Room
  v
Socket.IO Server
  |
  | Validate Room
  |
  | Add Participant
  v
Room State
```

The current room state is then sent to the new participant.

---

# Playback Synchronization

The YouTube player is embedded using the YouTube IFrame Player API.

The application tracks:

```

```
videoId
playState
currentTime
```

Example room state:

```

```
{
  "roomId": "ABC123",
  "videoId": "dQw4w9WgXcQ",
  "playState": "playing",
  "currentTime": 125.4
}
```

When playback changes, the server broadcasts the updated state to users in the same room.

---

# YouTube Video ID Extraction

The application supports several YouTube URL formats.

### YouTube Watch URL

```

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Short YouTube URL

```

```
https://youtu.be/dQw4w9WgXcQ
```

### Embedded URL

```

```
https://www.youtube.com/embed/dQw4w9WgXcQ
```

### Direct Video ID

```

```
dQw4w9WgXcQ
```

The utility:

```

```
client/src/utils/youtube.ts
```

and backend utility:

```

```
server/src/utils/youtube.ts
```

validate and extract the YouTube video ID.

---

# Role Management

The application maintains active room roles:

```

```
Host
  |
  ├── Moderator
  │
  └── Participant
```

Roles are managed by the backend rather than relying only on frontend UI restrictions.

This prevents a client from simply enabling restricted controls through the browser.

---

# Host Transfer

If the current Host leaves the room, the server automatically elects a new Host.

The election priority is:

```

```
1. Existing Moderator
        ↓
2. First Participant
```

Example:

```

```
Before:

Alice → Host
Bob   → Moderator
Charlie → Participant

Alice leaves
        ↓
Bob → Host
Charlie → Participant
```

If no Moderator exists:

```

```
Alice → Host
Bob → Participant
Charlie → Participant

Alice leaves
        ↓
Bob → Host
Charlie → Participant
```

If everyone leaves, the room record can remain stored in SQLite. The first user who later joins the empty active session becomes Host.

---

# Chat System

Users can send messages in real time.

Chat messages are:

1.  Sent from the client 
2.  Received by Socket.IO 
3.  Saved to SQLite 
4.  Broadcast to users in the room 

```

```
Client
  |
  | send_message
  v
Socket.IO Server
  |
  ├── Save to SQLite
  |
  └── Broadcast message
          |
          ├── User A
          ├── User B
          └── User C
```

Chat history can also be retrieved when a user joins or reconnects to the room.

---

# Database

SQLite is used for lightweight persistence.

Database file:

```

```
server/watch-party.db
```

## Rooms Table

Stores information such as:

```

```
room_id
host_id
video_id
play_state
current_time
created_at
```

## Chat Messages Table

Stores:

```

```
message_id
room_id
user_id
username
message
timestamp
```

Active participant roles are maintained by the server during the current room session rather than being treated as permanent database roles.

---

# API

The backend exposes REST endpoints under:

```

```
/api
```

The backend base URL is:

```

```
https://youtube-watch-party-wb4c.onrender.com
```

The API is primarily used for room-related HTTP operations, while Socket.IO handles real-time room communication.

---

# Socket.IO Events

The application uses Socket.IO events for real-time functionality.

## Room Events

```

```
create_room
join_room
leave_room
sync_state
user_joined
user_left
```

## Playback Events

```

```
play_video
pause_video
seek_video
change_video
```

## Role Management

```

```
update_role
remove_participant
removed_from_room
```

## Chat

```

```
send_message
receive_message
get_chat_history
chat_history
```

## Error Handling

```

```
error_message
```

---

# Environment Variables

## Backend

Create:

```

```
server/.env
```

Example:

```

```
PORT=4000
CLIENT_URL=http://localhost:5173
```

For production, `CLIENT_URL` should contain the deployed frontend URL.

Example:

```

```
CLIENT_URL=https://youtube-watch-party-web3task.vercel.app
```

Do not commit `.env` to GitHub.

---

# Frontend Environment Variables

For local development, the frontend can use the default backend:

```

```
http://localhost:4000
```

For production, create a Vercel environment variable:

```

```
VITE_API_URL=https://youtube-watch-party-wb4c.onrender.com
```

The frontend uses this variable for both:

-  Axios API requests 
-  Socket.IO connections 

---

# Local Installation

## Prerequisites

Make sure you have installed:

-  Node.js 
-  npm 
-  Git 

---

## Clone the Repository

```

```
git clone https://github.com/kartikbrahambhatt/youtube-watch-party.git
```

Enter the project:

```

```
cd youtube-watch-party
```

---

# Backend Setup

Go to the server:

```

```
cd server
```

Install dependencies:

```

```
npm install
```

Create `.env`:

```

```
PORT=4000
CLIENT_URL=http://localhost:5173
```

Start the development server:

```

```
npm run dev
```

Backend will run on:

```

```
http://localhost:4000
```

---

# Frontend Setup

Open another terminal.

Go to the client:

```

```
cd client
```

Install dependencies:

```

```
npm install
```

Start the development server:

```

```
npm run dev
```

Frontend will normally run on:

```

```
http://localhost:5173
```

---

# Production Build

## Backend

From:

```

```
server/
```

run:

```

```
npm run build
```

Start the compiled backend:

```

```
npm start
```

---

## Frontend

From:

```

```
client/
```

run:

```

```
npm run build
```

The production files will be generated in:

```

```
client/dist/
```

---

# Deployment

## Backend Deployment

The backend is deployed on Render.

Configuration:

```

```
Root Directory:
server
```

Build command:

```

```
npm install && npm run build
```

Start command:

```

```
npm start
```

Production backend:

```

```
https://youtube-watch-party-wb4c.onrender.com
```

---

## Frontend Deployment

The frontend is deployed on Vercel.

Configuration:

```

```
Root Directory:
client
```

Build command:

```

```
npm run build
```

Output directory:

```

```
dist
```

Environment variable:

```

```
VITE_API_URL=https://youtube-watch-party-wb4c.onrender.com
```

Production frontend:

```

```
https://youtube-watch-party-web3task.vercel.app/
```

---

# CORS Configuration

The backend uses CORS to allow the deployed frontend to communicate with the server.

Development:

```

```
http://localhost:5173
```

Production:

```

```
https://youtube-watch-party-web3task.vercel.app
```

The production `CLIENT_URL` should match the frontend URL.

---

# Security Considerations

The backend performs role checks before allowing privileged room actions.

Examples:

-  Only the Host can assign Moderator permissions. 
-  Only the Host can remove participants. 
-  Only Host and Moderator users can control playback. 
-  A participant cannot remove the Host. 
-  Room membership is checked before protected operations. 
-  Socket identity is validated for leave operations. 
-  Environment files are excluded from Git. 
-  SQLite database files are excluded from Git. 

---

# Important Production Note About SQLite

This project uses SQLite because the assignment supports SQLite as the database option.

The SQLite database is stored locally on the server filesystem:

```

```
watch-party.db
```

The current Render Free service does not provide persistent disks.

Therefore, SQLite data should not be considered permanent production storage across service recreation, redeployment, or other filesystem resets.

For a production application requiring durable persistent data, the database layer can be migrated to a hosted PostgreSQL database while keeping the room and service architecture largely the same.

---

# Testing Checklist

The following functionality has been tested locally:

-  Backend starts successfully 
-  Frontend starts successfully 
-  TypeScript compilation 
-  Production frontend build 
-  Room creation 
-  Room joining 
-  Unique room IDs 
-  Host role 
-  Moderator role 
-  Participant role 
-  Play synchronization 
-  Pause synchronization 
-  Seek synchronization 
-  Video change 
-  Real-time chat 
-  Chat history 
-  Moderator management 
-  Participant removal 
-  Host transfer 
-  Host leaving 
-  Participant leaving 
-  Socket disconnect handling 
-  SQLite integration 
-  MongoDB dependency removed 

---

# Project Goals

The main goals of this project are:

1.  Build a real-time collaborative watching experience. 
2.  Synchronize YouTube playback between multiple users. 
3.  Implement room-based communication. 
4.  Implement role-based access control. 
5.  Store room and chat information using SQLite. 
6.  Practice WebSocket-based real-time application development. 
7.  Deploy a full-stack TypeScript application. 

---

# Future Improvements

Possible future improvements include:

-  User authentication 
-  JWT-based authentication 
-  Persistent user profiles 
-  PostgreSQL for production persistence 
-  Redis adapter for Socket.IO scaling 
-  Multiple room moderators 
-  Room passwords 
-  Private/invite-only rooms 
-  Video queue 
-  YouTube video search 
-  Playlist support 
-  Reactions/emojis 
-  Typing indicators 
-  User presence indicators 
-  Better playback drift correction 
-  Automatic reconnection handling 
-  Mobile-first UI improvements 
-  Host handoff confirmation 
-  Room expiration and cleanup 

---

# Learning Outcomes

This project provided practical experience with:

-  React development 
-  TypeScript 
-  Node.js 
-  Express.js 
-  REST APIs 
-  Socket.IO 
-  WebSockets 
-  SQLite 
-  Real-time state synchronization 
-  Role-based authorization 
-  YouTube IFrame Player API 
-  CORS 
-  Environment variables 
-  Git and GitHub 
-  Vercel deployment 
-  Render deployment 

---


## User Flow

A typical watch-party session works like this:

1. **Open the application** and enter the Watch Party interface.
2. **Create a room** or join an existing room using its room ID/link.
3. The room creator becomes the **Host** automatically.
4. Participants join with a username and receive the current room state.
5. The Host or Moderator can control the video while other participants receive the updates in real time.
6. Users can communicate through the shared real-time chat.
7. If the Host leaves, ownership is transferred according to the server-side host-transfer rules.

This flow keeps room state, playback state, permissions, and communication coordinated through the backend.

## Real-Time Data Flow

The application uses two communication mechanisms for different responsibilities:

- **REST API** — used for HTTP-based room operations.
- **Socket.IO** — used for real-time room events, playback synchronization, participant updates, and chat.

A simplified flow is:

```text
Browser
   │
   ├── REST API ───────────────► Express Server
   │                                  │
   │                                  ▼
   │                               SQLite
   │
   └── Socket.IO ◄────────────► Socket.IO Server
                                  │
                                  ├── Room State
                                  ├── Playback Events
                                  ├── Role Events
                                  └── Chat Events
```

## Why This Architecture?

The project separates the frontend, backend, persistence layer, and real-time communication responsibilities:

- **React + TypeScript** provides a structured component-based frontend.
- **Express + TypeScript** provides the backend HTTP layer.
- **Socket.IO** handles low-latency communication between users in the same room.
- **SQLite** provides lightweight persistence for rooms and chat data.
- **Vercel and Render** provide separate deployment environments for the client and server.

This separation also makes it easier to replace the persistence layer later if the application needs a database designed for larger-scale production workloads.

## Error Handling

The backend exposes an error event for real-time failures:

```text
error_message
```

The application also validates room membership and permissions before protected operations. This helps keep invalid or unauthorized actions from being accepted simply because a user can see a control in the frontend.

## Development Notes

When running the application locally, start the backend and frontend separately:

```text
Terminal 1 → server → npm run dev
Terminal 2 → client → npm run dev
```

Make sure the frontend's `VITE_API_URL` and the backend's `CLIENT_URL` point to the correct environments. For production deployments, the production frontend URL should be configured in the backend CORS settings.

## Project Highlights

Some of the core implementation highlights are:

- Real-time multi-user YouTube watching
- Room-based architecture
- Server-side role and permission checks
- Host ownership transfer
- Real-time synchronized playback
- Persistent chat history
- Multiple YouTube URL format support
- TypeScript across the frontend and backend
- SQLite persistence
- Separate frontend and backend deployments
- Environment-based configuration
- Production build support

## Screenshots

Screenshots can be added here to showcase the main application screens.

Recommended screenshots:

- Home / Create Room screen
- Join Room screen
- Watch Room with YouTube player
- Playback controls
- Participant list and roles
- Real-time chat
- Deployed application

Example:

```md
![Home Screen](./screenshots/home.png)
![Watch Room](./screenshots/watch-room.png)
![Real-Time Chat](./screenshots/chat.png)
```

## Contributing

This project is primarily maintained as an educational and internship project. If you want to experiment with the code:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test both the frontend and backend.
5. Create a pull request with a clear description of the changes.

## Troubleshooting

### Frontend cannot connect to backend

Check:

- `VITE_API_URL` is correct.
- The backend is running.
- The backend URL is reachable.
- CORS is configured with the correct frontend URL.

### Socket.IO connection fails

Check:

- The Socket.IO server is running.
- The frontend is connecting to the same backend URL used by the REST API.
- The production `CLIENT_URL` matches the deployed frontend URL.

### SQLite data does not persist after deployment changes

The current deployment uses SQLite on the server filesystem. As described above, this should not be treated as durable production storage on the current Render setup. A hosted PostgreSQL database is the suggested future migration path for persistent production data.

## Acknowledgements

This project uses the following technologies and services:

- React
- TypeScript
- Vite
- Tailwind CSS
- Node.js
- Express.js
- Socket.IO
- SQLite
- YouTube IFrame Player API
- Vercel
- Render

---

## Repository Information

**Project:** YouTube Watch Party  
**Type:** Full-Stack Real-Time Web Application  
**Frontend:** React + TypeScript + Vite  
**Backend:** Node.js + Express + TypeScript  
**Real-Time Layer:** Socket.IO  
**Database:** SQLite  
**Frontend Hosting:** Vercel  
**Backend Hosting:** Render

# Author

**Kartik Brahambhatt**

Computer Science & Engineering Student

GitHub:

https://github.com/kartikbrahambhatt

---

# License

This project is created for educational and internship/project purposes.

```

````
