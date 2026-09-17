import "dotenv/config";
const PORT = Number(process.env.PORT) || 4000;
import http from "http";
import "./database/database";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import roomRoutes from "./routes/roomRoutes";

import {
  createRoom,
  addParticipant,
  getRoom,
  getRoomState,
  removeParticipant,
  removeParticipantBySocketId,
  updateParticipantRole,
  transferHost,
  removeParticipantById,
  loadRoomsFromDatabase,
  saveChatMessage,
  getChatMessages,
  setVideo,
  setPlayState,
  setCurrentTime,
} from "./services/roomService";

const app = express();

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

/*
|--------------------------------------------------------------------------
| HTTP Routes
|--------------------------------------------------------------------------
*/

app.get("/", (_req, res) => {
  res.json({
    message:
      "YouTube Watch Party API is running",
  });
});

app.use(
  "/api/rooms",
  roomRoutes
);

/*
|--------------------------------------------------------------------------
| HTTP Server
|--------------------------------------------------------------------------
*/

const httpServer =
  http.createServer(app);

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

const io = new Server(
  httpServer,
  {
    cors: {
      origin:
        process.env.CLIENT_URL ||
        "http://localhost:5173",

      methods: [
        "GET",
        "POST",
      ],

      credentials: true,
    },
  }
);

/*
|--------------------------------------------------------------------------
| Socket Connection
|--------------------------------------------------------------------------
*/
function canControlPlayback(
  role: string
): boolean {
  return (
    role === "host" ||
    role === "moderator"
  );
}

type PlaybackRequestAction =
  | "play"
  | "pause"
  | "seek"
  | "change_video";

interface PlaybackRequest {
  requestId: string;
  roomId: string;
  userId: string;
  username: string;
  action: PlaybackRequestAction;
  currentTime?: number;
  videoId?: string;
  createdAt: string;
}

const pendingPlaybackRequests =
  new Map<string, Map<string, PlaybackRequest>>();

function getPendingRequests(
  roomId: string
): PlaybackRequest[] {
  return Array.from(
    pendingPlaybackRequests.get(roomId)?.values() || []
  );
}

function removePendingRequestsForUser(
  roomId: string,
  userId: string
): boolean {
  const requests =
    pendingPlaybackRequests.get(roomId);

  if (!requests) {
    return false;
  }

  const removed = requests.delete(userId);

  if (requests.size === 0) {
    pendingPlaybackRequests.delete(roomId);
  }

  return removed;
}

function broadcastPendingRequests(
  io: Server,
  roomId: string
): void {
  const room = getRoom(roomId);

  if (!room) {
    return;
  }

  const requests = getPendingRequests(roomId);

  room.participants.forEach((participant) => {
    if (canControlPlayback(participant.role)) {
      io.to(participant.socketId).emit(
        "pending_playback_requests",
        requests
      );
    }
  });
}

function isValidYouTubeVideoId(
  videoId: string
): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(videoId);
}

io.on(
  "connection",
  (socket) => {
    socket.on(
      "play",
      (data) => {
        const {
          roomId,
          userId,
          currentTime,
        } = data;

        const normalizedRoomId =
          roomId?.trim().toUpperCase();

        if (!normalizedRoomId || !userId) {
          socket.emit("error_message", {
            message: "Room ID and user ID are required",
          });

          return;
        }

        const room =
          getRoom(normalizedRoomId);

        if (!room) {
          socket.emit(
            "error_message",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        const participant =
          room.participants.get(
            userId
          );

        if (
          !participant ||
          !canControlPlayback(
            participant.role
          )
        ) {
          socket.emit(
            "error_message",
            {
              message:
                "You do not have permission to play the video",
            }
          );

          return;
        }

        if (
          typeof currentTime ===
          "number"
        ) {
          setCurrentTime(
            normalizedRoomId,
            currentTime
          );
        }

        setPlayState(
          normalizedRoomId,
          "playing"
        );

        const roomState =
          getRoomState(normalizedRoomId);

        io.to(normalizedRoomId).emit(
          "sync_state",
          roomState
        );
      }
    );

    socket.on(
      "pause",
      (data) => {
        const {
          roomId,
          userId,
          currentTime,
        } = data;

        const normalizedRoomId =
          roomId?.trim().toUpperCase();

        if (!normalizedRoomId || !userId) {
          socket.emit("error_message", {
            message: "Room ID and user ID are required",
          });

          return;
        }

        const room =
          getRoom(normalizedRoomId);

        if (!room) {
          socket.emit(
            "error_message",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        const participant =
          room.participants.get(
            userId
          );

        if (
          !participant ||
          !canControlPlayback(
            participant.role
          )
        ) {
          socket.emit(
            "error_message",
            {
              message:
                "You do not have permission to pause the video",
            }
          );

          return;
        }

        if (
          typeof currentTime ===
          "number"
        ) {
          setCurrentTime(
            normalizedRoomId,
            currentTime
          );
        }

        setPlayState(
          normalizedRoomId,
          "paused"
        );

        const roomState =
          getRoomState(normalizedRoomId);

        io.to(normalizedRoomId).emit(
          "sync_state",
          roomState
        );
      }
    );

    socket.on(
      "seek",
      (data) => {
        const {
  roomId,
  userId,
  time,
} = data;

const normalizedRoomId =
  roomId?.trim().toUpperCase();

if (!normalizedRoomId || !userId) {
  socket.emit("error_message", {
    message: "Room ID and user ID are required",
  });

  return;
}

const room =
  getRoom(normalizedRoomId);

        if (!room) {
          socket.emit(
            "error_message",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        const participant =
          room.participants.get(
            userId
          );

        if (
          !participant ||
          !canControlPlayback(
            participant.role
          )
        ) {
          socket.emit(
            "error_message",
            {
              message:
                "You do not have permission to seek",
            }
          );

          return;
        }

        if (
          typeof time !== "number" ||
          time < 0
        ) {
          return;
        }

        setCurrentTime(
          normalizedRoomId,
          time
        );

        const roomState =
          getRoomState(normalizedRoomId);

        io.to(normalizedRoomId).emit(
          "sync_state",
          roomState
        );
      }
    );

    socket.on(
      "change_video",
      (data) => {
        const {
  roomId,
  userId,
  videoId,
} = data;

const normalizedRoomId =
  roomId?.trim().toUpperCase();

if (!normalizedRoomId || !userId) {
  socket.emit("error_message", {
    message: "Room ID and user ID are required",
  });

  return;
}

const room =
  getRoom(normalizedRoomId);

        if (!room) {
          socket.emit(
            "error_message",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        const participant =
          room.participants.get(
            userId
          );

        if (
          !participant ||
          !canControlPlayback(
            participant.role
          )
        ) {
          socket.emit(
            "error_message",
            {
              message:
                "You do not have permission to change the video",
            }
          );

          return;
        }

        if (
          typeof videoId !==
          "string" ||
          !videoId.trim()
        ) {
          return;
        }

        setVideo(
          normalizedRoomId,
          videoId.trim()
        );

        const roomState =
          getRoomState(normalizedRoomId);

        io.to(normalizedRoomId).emit(
          "sync_state",
          roomState
        );
      }
    );
    socket.on(
      "get_room_state",
      (data) => {
        const {
          roomId,
        } = data;

        const roomState =
          getRoomState(
            roomId
              .trim()
              .toUpperCase()
          );

        if (!roomState) {
          socket.emit(
            "error_message",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        socket.emit(
          "sync_state",
          roomState
        );
      }
    );
    console.log(
      "Client connected:",
      socket.id
    );

    /*
    |--------------------------------------------------------------------------
    | CREATE ROOM
    |--------------------------------------------------------------------------
    */

    socket.on(
      "create_room",
      (data) => {
        const {
          userId,
          username,
        } = data;

        if (
          !userId ||
          !username
        ) {
          socket.emit(
            "error_message",
            {
              message:
                "Username and userId are required",
            }
          );

          return;
        }

        const room =
          createRoom(
            userId,
            username,
            socket.id
          );

        socket.join(
          room.roomId
        );

        const roomState =
          getRoomState(
            room.roomId
          );

        socket.emit(
          "room_created",
          roomState
        );

        console.log(
          `${username} created room ${room.roomId}`
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | JOIN ROOM
    |--------------------------------------------------------------------------
    */

    socket.on(
      "join_room",
      (data) => {
        const {
          roomId,
          userId,
          username,
        } = data;

        if (
          !roomId ||
          !userId ||
          !username
        ) {
          socket.emit(
            "error_message",
            {
              message:
                "roomId, userId and username are required",
            }
          );

          return;
        }

        const normalizedRoomId =
          roomId
            .trim()
            .toUpperCase();

        const room =
          getRoom(
            normalizedRoomId
          );

        if (!room) {
          socket.emit(
            "error_message",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        const participant =
          addParticipant(
            normalizedRoomId,
            userId,
            username,
            socket.id
          );

        if (!participant) {
          socket.emit(
            "error_message",
            {
              message:
                "Unable to join room",
            }
          );

          return;
        }

        socket.join(
          normalizedRoomId
        );

        const roomState =
          getRoomState(
            normalizedRoomId
          );

        /*
        | Send current room state
        | to the new participant
        */

        socket.emit(
          "sync_state",
          roomState
        );

        /*
        | Tell everyone else that
        | a new participant joined
        */

        socket
          .to(normalizedRoomId)
          .emit(
            "user_joined",
            {
              username,
              userId,
              role:
                participant.role,
              participants:
                roomState
                  ?.participants ||
                [],
            }
          );

        // Hosts and Moderators also receive any requests that
        // were waiting before they joined/reconnected.
        if (canControlPlayback(participant.role)) {
          socket.emit(
            "pending_playback_requests",
            getPendingRequests(normalizedRoomId)
          );
        }

        console.log(
          `${username} joined room ${normalizedRoomId}`
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | PARTICIPANT PLAYBACK REQUESTS
    |--------------------------------------------------------------------------
    */

    socket.on(
      "request_playback_action",
      (data) => {
        const {
          roomId,
          userId,
          action,
          currentTime,
          videoId,
        } = data;

        const normalizedRoomId =
          roomId?.trim().toUpperCase();

        if (
          !normalizedRoomId ||
          !userId ||
          !action
        ) {
          socket.emit("error_message", {
            message:
              "Room ID, user ID and action are required",
          });
          return;
        }

        const room =
          getRoom(normalizedRoomId);

        if (!room) {
          socket.emit("error_message", {
            message: "Room not found",
          });
          return;
        }

        const requester =
          room.participants.get(userId);

        if (
          !requester ||
          requester.socketId !== socket.id
        ) {
          socket.emit("error_message", {
            message:
              "You are not an active participant in this room",
          });
          return;
        }

        if (requester.role !== "participant") {
          socket.emit("error_message", {
            message:
              "Only Participants need approval for playback changes",
          });
          return;
        }

        const validActions: PlaybackRequestAction[] = [
          "play",
          "pause",
          "seek",
          "change_video",
        ];

        if (
          !validActions.includes(
            action as PlaybackRequestAction
          )
        ) {
          socket.emit("error_message", {
            message: "Invalid playback request",
          });
          return;
        }

        if (
          (action === "play" ||
            action === "pause") &&
          currentTime !== undefined &&
          (
            typeof currentTime !== "number" ||
            !Number.isFinite(currentTime) ||
            currentTime < 0
          )
        ) {
          socket.emit("error_message", {
            message: "Invalid playback time",
          });
          return;
        }

        if (action === "seek") {
          if (
            typeof currentTime !== "number" ||
            !Number.isFinite(currentTime) ||
            currentTime < 0
          ) {
            socket.emit("error_message", {
              message:
                "A valid seek time is required",
            });
            return;
          }
        }

        if (action === "change_video") {
          if (
            typeof videoId !== "string" ||
            !isValidYouTubeVideoId(videoId.trim())
          ) {
            socket.emit("error_message", {
              message:
                "A valid YouTube video ID is required",
            });
            return;
          }
        }

        const existingRequests =
          pendingPlaybackRequests.get(
            normalizedRoomId
          );

        if (
          existingRequests?.has(userId)
        ) {
          socket.emit("error_message", {
            message:
              "You already have a pending request",
          });
          return;
        }

        const request: PlaybackRequest = {
          requestId:
            `${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
          roomId: normalizedRoomId,
          userId: requester.userId,
          username: requester.username,
          action:
            action as PlaybackRequestAction,
          createdAt:
            new Date().toISOString(),
        };

        if (
          action === "play" ||
          action === "pause" ||
          action === "seek"
        ) {
          request.currentTime =
            Number(currentTime) || 0;
        }

        if (action === "change_video") {
          request.videoId =
            videoId.trim();
        }

        if (!existingRequests) {
          pendingPlaybackRequests.set(
            normalizedRoomId,
            new Map()
          );
        }

        pendingPlaybackRequests
          .get(normalizedRoomId)!
          .set(userId, request);

        socket.emit(
          "playback_request_status",
          {
            status: "pending",
            message:
              "Your request was sent to the Host/Moderator",
          }
        );

        broadcastPendingRequests(
          io,
          normalizedRoomId
        );
      }
    );

    socket.on(
      "respond_playback_request",
      (data) => {
        const {
          roomId,
          userId,
          requestId,
          approved,
        } = data;

        const normalizedRoomId =
          roomId?.trim().toUpperCase();

        if (
          !normalizedRoomId ||
          !userId ||
          !requestId ||
          typeof approved !== "boolean"
        ) {
          socket.emit("error_message", {
            message:
              "Room ID, user ID, request ID and decision are required",
          });
          return;
        }

        const room =
          getRoom(normalizedRoomId);

        if (!room) {
          socket.emit("error_message", {
            message: "Room not found",
          });
          return;
        }

        const approver =
          room.participants.get(userId);

        if (
          !approver ||
          approver.socketId !== socket.id ||
          !canControlPlayback(approver.role)
        ) {
          socket.emit("error_message", {
            message:
              "Only the Host or Moderator can approve requests",
          });
          return;
        }

        const requests =
          pendingPlaybackRequests.get(
            normalizedRoomId
          );

        const request =
          requests
            ? Array.from(
                requests.values()
              ).find(
                (item) =>
                  item.requestId === requestId
              )
            : undefined;

        if (!request) {
          socket.emit("error_message", {
            message:
              "Playback request is no longer pending",
          });
          return;
        }

        requests!.delete(request.userId);

        if (requests!.size === 0) {
          pendingPlaybackRequests.delete(
            normalizedRoomId
          );
        }

        const requester =
          room.participants.get(
            request.userId
          );

        if (!requester) {
          socket.emit("error_message", {
            message:
              "The requesting participant is no longer in the room",
          });

          broadcastPendingRequests(
            io,
            normalizedRoomId
          );
          return;
        }

        if (!approved) {
          io.to(requester.socketId).emit(
            "playback_request_status",
            {
              status: "rejected",
              message:
                "Your playback request was rejected",
              requestId,
            }
          );

          broadcastPendingRequests(
            io,
            normalizedRoomId
          );
          return;
        }

        /*
         * Re-check the request before applying it.
         * Approval happens only after the server validates
         * the current room participant and requested action.
         */
        if (
          request.action === "seek"
        ) {
          if (
            typeof request.currentTime !== "number" ||
            !Number.isFinite(
              request.currentTime
            ) ||
            request.currentTime < 0
          ) {
            socket.emit("error_message", {
              message:
                "Invalid seek request",
            });
            broadcastPendingRequests(
              io,
              normalizedRoomId
            );
            return;
          }

          setCurrentTime(
            normalizedRoomId,
            request.currentTime
          );
        }

        if (
          request.action === "play" ||
          request.action === "pause"
        ) {
          if (
            typeof request.currentTime ===
              "number" &&
            Number.isFinite(
              request.currentTime
            ) &&
            request.currentTime >= 0
          ) {
            setCurrentTime(
              normalizedRoomId,
              request.currentTime
            );
          }

          setPlayState(
            normalizedRoomId,
            request.action === "play"
              ? "playing"
              : "paused"
          );
        }

        if (
          request.action === "change_video"
        ) {
          if (
            !request.videoId ||
            !isValidYouTubeVideoId(
              request.videoId
            )
          ) {
            socket.emit("error_message", {
              message:
                "Invalid YouTube video request",
            });
            broadcastPendingRequests(
              io,
              normalizedRoomId
            );
            return;
          }

          setVideo(
            normalizedRoomId,
            request.videoId
          );
          setCurrentTime(
            normalizedRoomId,
            0
          );
          setPlayState(
            normalizedRoomId,
            "paused"
          );
        }

        const roomState =
          getRoomState(
            normalizedRoomId
          );

        io.to(normalizedRoomId).emit(
          "sync_state",
          roomState
        );

        io.to(requester.socketId).emit(
          "playback_request_status",
          {
            status: "approved",
            message:
              "Your playback request was approved",
            requestId,
          }
        );

        broadcastPendingRequests(
          io,
          normalizedRoomId
        );
      }
    );

    socket.on(
      "get_chat_history",
      (data) => {
        const {
          roomId,
          userId,
        } = data;

        const normalizedRoomId =
          roomId?.trim().toUpperCase();

        if (
          !normalizedRoomId ||
          !userId
        ) {
          socket.emit(
            "error_message",
            {
              message:
                "Room ID and user ID are required",
            }
          );

          return;
        }

        const room =
          getRoom(
            normalizedRoomId
          );

        if (!room) {
          socket.emit(
            "error_message",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        const participant =
          room.participants.get(
            userId
          );

        if (!participant) {
          socket.emit(
            "error_message",
            {
              message:
                "You are not a participant in this room",
            }
          );

          return;
        }

        const chatMessages =
          getChatMessages(
            normalizedRoomId
          );

        socket.emit(
          "chat_history",
          chatMessages
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | LEAVE ROOM
    |--------------------------------------------------------------------------
    */

    socket.on(
      "leave_room",
      (data) => {
        const {
          roomId,
          userId,
        } = data;

        if (!roomId || !userId) {
          return;
        }

        const normalizedRoomId =
          roomId.trim().toUpperCase();

        const room =
          getRoom(normalizedRoomId);

        if (!room) {
          return;
        }

        const participant =
          room.participants.get(userId);

        // A client can only remove its own active connection.
        if (
          !participant ||
          participant.socketId !== socket.id
        ) {
          return;
        }

        const removedParticipant =
          removeParticipant(
            normalizedRoomId,
            userId
          );

        removePendingRequestsForUser(
          normalizedRoomId,
          userId
        );

        if (!removedParticipant) {
          return;
        }

        socket.leave(
          normalizedRoomId
        );

        const roomState =
          getRoomState(
            normalizedRoomId
          );

        socket
          .to(normalizedRoomId)
          .emit(
            "user_left",
            {
              username:
                removedParticipant.username,
              userId:
                removedParticipant.userId,
              participants:
                roomState?.participants ||
                [],
            }
          );

        // sync_state also sends the new hostId.
        io.to(normalizedRoomId).emit(
          "sync_state",
          roomState
        );

        broadcastPendingRequests(
          io,
          normalizedRoomId
        );

        console.log(
          `${removedParticipant.username} left room ${normalizedRoomId}`
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | DISCONNECT
    |--------------------------------------------------------------------------
    */
    socket.on("transfer_host", (data) => {
      const { roomId, userId, targetUserId } = data;

      const normalizedRoomId = roomId?.trim().toUpperCase();

      if (!normalizedRoomId || !userId || !targetUserId) {
        socket.emit("error_message", {
          message: "Room ID, user ID and target user ID are required",
        });
        return;
      }

      const room = getRoom(normalizedRoomId);

      if (!room) {
        socket.emit("error_message", {
          message: "Room not found",
        });
        return;
      }

      const requester = room.participants.get(userId);

      if (
        !requester ||
        requester.role !== "host" ||
        requester.socketId !== socket.id
      ) {
        socket.emit("error_message", {
          message: "Only the current Host can transfer Host role",
        });
        return;
      }

      const target = room.participants.get(targetUserId);

      if (!target) {
        socket.emit("error_message", {
          message: "Target participant not found",
        });
        return;
      }

      if (!transferHost(normalizedRoomId, targetUserId)) {
        socket.emit("error_message", {
          message: "Unable to transfer Host role",
        });
        return;
      }

      io.to(normalizedRoomId).emit(
        "sync_state",
        getRoomState(normalizedRoomId)
      );

      broadcastPendingRequests(
        io,
        normalizedRoomId
      );

      console.log(
        `${requester.username} transferred Host role to ${target.username} in room ${normalizedRoomId}`
      );
    });

    socket.on("update_role", (data) => {
      const { roomId, userId, targetUserId, role } = data;

      const normalizedRoomId = roomId?.trim().toUpperCase();

      const room = getRoom(normalizedRoomId);

      if (!room) {
        socket.emit("error_message", {
          message: "Room not found",
        });
        return;
      }

      const requester = room.participants.get(userId);

      if (
        !requester ||
        requester.role !== "host" ||
        requester.socketId !== socket.id
      ) {
        socket.emit("error_message", {
          message: "Only the current Host can change user roles",
        });
        return;
      }

      if (role !== "moderator" && role !== "participant") {
        socket.emit("error_message", {
          message: "Invalid role",
        });
        return;
      }

      const updated = updateParticipantRole(
        normalizedRoomId,
        targetUserId,
        role
      );

      if (!updated) {
        socket.emit("error_message", {
          message: "Unable to update user role",
        });
        return;
      }

      io.to(normalizedRoomId).emit(
        "sync_state",
        getRoomState(normalizedRoomId)
      );

      broadcastPendingRequests(
        io,
        normalizedRoomId
      );
    });

    socket.on("remove_participant", (data) => {
      const { roomId, userId, targetUserId } = data;

      const normalizedRoomId = roomId?.trim().toUpperCase();

      const room = getRoom(normalizedRoomId);

      if (!room) {
        socket.emit("error_message", {
          message: "Room not found",
        });
        return;
      }

      const requester = room.participants.get(userId);

      if (
        !requester ||
        requester.role !== "host" ||
        requester.socketId !== socket.id
      ) {
        socket.emit("error_message", {
          message: "Only the Host can remove participants",
        });
        return;
      }

      const target = room.participants.get(targetUserId);

      if (!target) {
        socket.emit("error_message", {
          message: "Participant not found",
        });
        return;
      }

      const targetSocketId = target.socketId;

      const removed = removeParticipantById(
        normalizedRoomId,
        targetUserId
      );

      removePendingRequestsForUser(
        normalizedRoomId,
        targetUserId
      );

      if (!removed) {
        socket.emit("error_message", {
          message: "Unable to remove participant",
        });
        return;
      }

      io.to(targetSocketId).emit("removed_from_room", {
        message: "You were removed from the room by the Host",
      });

      io.to(normalizedRoomId).emit(
        "sync_state",
        getRoomState(normalizedRoomId)
      );

      broadcastPendingRequests(
        io,
        normalizedRoomId
      );

      const targetSocket = io.sockets.sockets.get(targetSocketId);

      if (targetSocket) {
        targetSocket.leave(normalizedRoomId);
      }
    });

    socket.on("send_message", (data) => {
      const { roomId, userId, message } = data;

      const normalizedRoomId = roomId?.trim().toUpperCase();

      if (!normalizedRoomId || !userId || !message?.trim()) {
        socket.emit("error_message", {
          message: "Room ID, user ID and message are required",
        });
        return;
      }

      const room = getRoom(normalizedRoomId);

      if (!room) {
        socket.emit("error_message", {
          message: "Room not found",
        });
        return;
      }

      const participant = room.participants.get(userId);

      if (!participant) {
        socket.emit("error_message", {
          message: "You are not a participant in this room",
        });
        return;
      }

      const chatMessage = {
        messageId: `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        roomId: normalizedRoomId,
        userId: participant.userId,
        username: participant.username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      saveChatMessage(chatMessage);


      io.to(normalizedRoomId).emit(
        "receive_message",
        chatMessage
      );
    });

    socket.on(
      "disconnect",
      () => {
        const removed =
          removeParticipantBySocketId(
            socket.id
          );

        if (removed) {
          removePendingRequestsForUser(
            removed.roomId,
            removed.participant.userId
          );

          const roomState =
            getRoomState(
              removed.roomId
            );

          io.to(removed.roomId).emit(
            "user_left",
            {
              username:
                removed.participant.username,
              userId:
                removed.participant.userId,
              participants:
                roomState?.participants ||
                [],
            }
          );

          io.to(removed.roomId).emit(
            "sync_state",
            roomState
          );

          broadcastPendingRequests(
            io,
            removed.roomId
          );

          console.log(
            `${removed.participant.username} disconnected from room ${removed.roomId}`
          );
        }

        console.log(
          "Client disconnected:",
          socket.id
        );
      }
    );
  }
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

loadRoomsFromDatabase();

httpServer.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);