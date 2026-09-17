import { Participant, Room } from "../types/room";
import { generateRoomId } from "../utils/generateRoomId";
import { db } from "../database/database";

const rooms = new Map<string, Room>();

function persistHostId(
  roomId: string,
  hostId: string
): void {
  db.prepare(`
    UPDATE rooms
    SET host_id = ?
    WHERE room_id = ?
  `).run(hostId, roomId);
}

function electNewHost(room: Room): Participant | null {
  const participants = Array.from(
    room.participants.values()
  );

  if (participants.length === 0) {
    room.hostId = "";
    persistHostId(room.roomId, "");
    return null;
  }

  // If the current host is still connected, nothing needs to change.
  const currentHost = participants.find(
    (participant) =>
      participant.userId === room.hostId
  );

  if (currentHost) {
    currentHost.role = "host";
    return currentHost;
  }

  // Prefer the first connected moderator.
  // Map iteration order preserves join order.
  const newHost =
    participants.find(
      (participant) =>
        participant.role === "moderator"
    ) || participants[0];

  for (const participant of participants) {
    if (participant.userId === newHost.userId) {
      participant.role = "host";
    } else if (participant.role === "host") {
      participant.role = "participant";
    }
  }

  room.hostId = newHost.userId;
  persistHostId(
    room.roomId,
    newHost.userId
  );

  return newHost;
}

export function createRoom(
  userId: string,
  username: string,
  socketId: string
): Room {
  let roomId = generateRoomId();

  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }

  const host: Participant = {
    userId,
    username,
    role: "host",
    socketId,
  };

  const room: Room = {
    roomId,
    hostId: userId,
    videoId: null,
    playState: "paused",
    currentTime: 0,
    participants: new Map([
      [userId, host],
    ]),
  };

  rooms.set(roomId, room);

  db.prepare(`
    INSERT INTO rooms (
      room_id,
      host_id,
      video_id,
      play_state,
      current_time,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    room.roomId,
    room.hostId,
    room.videoId,
    room.playState,
    room.currentTime,
    new Date().toISOString()
  );

  return room;
}

export function getRoom(
  roomId: string
): Room | undefined {
  return rooms.get(roomId);
}

export function addParticipant(
  roomId: string,
  userId: string,
  username: string,
  socketId: string
): Participant | null {
  const room = rooms.get(roomId);

  if (!room) {
    return null;
  }

  // Reconnecting users keep their current active role.
  const existingParticipant =
    room.participants.get(userId);

  if (existingParticipant) {
    existingParticipant.socketId = socketId;
    existingParticipant.username = username;
    return existingParticipant;
  }

  /*
   * If nobody is currently connected, the first person to join
   * becomes the new Host. This also handles a room restored from SQLite.
   */
  const isEmptyRoom =
    room.participants.size === 0;

  const role: "host" | "participant" =
    isEmptyRoom ? "host" : "participant";

  const participant: Participant = {
    userId,
    username,
    role,
    socketId,
  };

  room.participants.set(
    userId,
    participant
  );

  if (role === "host") {
    room.hostId = userId;
    persistHostId(
      roomId,
      userId
    );
  }

  return participant;
}

export function removeParticipant(
  roomId: string,
  userId: string
): Participant | null {
  const room = rooms.get(roomId);

  if (!room) {
    return null;
  }

  const participant =
    room.participants.get(userId);

  if (!participant) {
    return null;
  }

  const wasHost =
    participant.role === "host" ||
    room.hostId === userId;

  room.participants.delete(userId);

  if (wasHost) {
    electNewHost(room);
  } else if (room.participants.size === 0) {
    room.hostId = "";
    persistHostId(room.roomId, "");
  }

  // Keep the room alive even when everyone leaves.
  // The next person who joins an empty room becomes Host.
  return participant;
}

export function removeParticipantBySocketId(
  socketId: string
): {
  roomId: string;
  participant: Participant;
} | null {
  for (const room of rooms.values()) {
    for (const participant of room.participants.values()) {
      if (participant.socketId === socketId) {
        const removed = removeParticipant(
          room.roomId,
          participant.userId
        );

        if (!removed) {
          return null;
        }

        return {
          roomId: room.roomId,
          participant: removed,
        };
      }
    }
  }

  return null;
}

export function getParticipants(
  roomId: string
): Participant[] {
  const room = rooms.get(roomId);

  if (!room) {
    return [];
  }

  return Array.from(
    room.participants.values()
  );
}

/*
|--------------------------------------------------------------------------
| VIDEO STATE
|--------------------------------------------------------------------------
*/

export function setVideo(
  roomId: string,
  videoId: string
): boolean {
  const room = rooms.get(roomId);

  if (!room) {
    return false;
  }

  room.videoId = videoId;
  room.currentTime = 0;
  room.playState = "paused";

  db.prepare(`
    UPDATE rooms
    SET
      video_id = ?,
      current_time = ?,
      play_state = ?
    WHERE room_id = ?
  `).run(
    videoId,
    0,
    "paused",
    roomId
  );

  return true;
}

export function setPlayState(
  roomId: string,
  playState: "playing" | "paused"
): boolean {
  const room = rooms.get(roomId);

  if (!room) {
    return false;
  }

  room.playState = playState;

  db.prepare(`
    UPDATE rooms
    SET play_state = ?
    WHERE room_id = ?
  `).run(
    playState,
    roomId
  );

  return true;
}

export function setCurrentTime(
  roomId: string,
  currentTime: number
): boolean {
  const room = rooms.get(roomId);

  if (!room) {
    return false;
  }

  room.currentTime = Math.max(
    0,
    currentTime
  );

  db.prepare(`
    UPDATE rooms
    SET current_time = ?
    WHERE room_id = ?
  `).run(
    room.currentTime,
    roomId
  );

  return true;
}

export function getRoomState(
  roomId: string
) {
  const room = rooms.get(roomId);

  if (!room) {
    return null;
  }

  return {
    roomId: room.roomId,
    hostId: room.hostId,
    videoId: room.videoId,
    playState: room.playState,
    currentTime: room.currentTime,
    participants:
      getParticipants(roomId),
  };
}

export function updateParticipantRole(
  roomId: string,
  targetUserId: string,
  role: "moderator" | "participant"
): boolean {
  const room = rooms.get(roomId);

  if (!room) {
    return false;
  }

  const participant =
    room.participants.get(targetUserId);

  if (!participant) {
    return false;
  }

  // Host role cannot be changed.
  if (participant.role === "host") {
    return false;
  }

  participant.role = role;

  return true;
}

export function transferHost(
  roomId: string,
  targetUserId: string
): boolean {
  const room = rooms.get(roomId);

  if (!room) {
    return false;
  }

  const target = room.participants.get(targetUserId);

  if (!target) {
    return false;
  }

  // The target is already Host. Nothing to change.
  if (room.hostId === targetUserId && target.role === "host") {
    return true;
  }

  // Transfer the Host role to the selected active participant.
  // The previous Host becomes a Participant. Other Moderators keep
  // their Moderator role.
  for (const participant of room.participants.values()) {
    if (participant.userId === targetUserId) {
      participant.role = "host";
    } else if (participant.userId === room.hostId) {
      participant.role = "participant";
    }
  }

  room.hostId = targetUserId;
  persistHostId(room.roomId, targetUserId);

  return true;
}

export function removeParticipantById(
  roomId: string,
  targetUserId: string
): boolean {
  const room = rooms.get(roomId);

  if (!room) {
    return false;
  }

  const participant =
    room.participants.get(targetUserId);

  if (!participant) {
    return false;
  }

  // Host cannot be removed.
  if (
    participant.role === "host" ||
    room.hostId === targetUserId
  ) {
    return false;
  }

  room.participants.delete(targetUserId);

  return true;
}

export function loadRoomsFromDatabase(): void {
  const savedRooms = db
    .prepare(`
      SELECT
        room_id,
        host_id,
        video_id,
        play_state,
        current_time
      FROM rooms
    `)
    .all() as Array<{
      room_id: string;
      host_id: string;
      video_id: string | null;
      play_state: "playing" | "paused";
      current_time: number;
    }>;

  for (const savedRoom of savedRooms) {
    const room: Room = {
      roomId: savedRoom.room_id,
      hostId: savedRoom.host_id,
      videoId: savedRoom.video_id,
      playState: savedRoom.play_state,
      currentTime: savedRoom.current_time,
      participants: new Map(),
    };

    rooms.set(room.roomId, room);
  }

  console.log(
    `Loaded ${savedRooms.length} room(s) from SQLite`
  );
}

export interface SavedChatMessage {
  messageId: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export function saveChatMessage(
  chatMessage: SavedChatMessage
): void {
  db.prepare(`
    INSERT INTO chat_messages (
      message_id,
      room_id,
      user_id,
      username,
      message,
      timestamp
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    chatMessage.messageId,
    chatMessage.roomId,
    chatMessage.userId,
    chatMessage.username,
    chatMessage.message,
    chatMessage.timestamp
  );
}

export function getChatMessages(
  roomId: string
): SavedChatMessage[] {
  const messages = db
    .prepare(`
      SELECT
        message_id AS messageId,
        room_id AS roomId,
        user_id AS userId,
        username,
        message,
        timestamp
      FROM chat_messages
      WHERE room_id = ?
      ORDER BY timestamp ASC
    `)
    .all(roomId) as SavedChatMessage[];

  return messages;
}