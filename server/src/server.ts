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

        console.log(
          `${username} joined room ${normalizedRoomId}`
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

      if (!requester || requester.role !== "host") {
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