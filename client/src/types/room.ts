export type Role =
  | "host"
  | "moderator"
  | "participant";

export interface Participant {
  userId: string;
  username: string;
  role: Role;
  socketId: string;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  videoId: string | null;
  playState: "playing" | "paused";
  currentTime: number;
  participants: Participant[];
}