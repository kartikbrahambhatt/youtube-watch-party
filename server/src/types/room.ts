export type Role = "host" | "moderator" | "participant";

export interface Participant {
  userId: string;
  username: string;
  role: Role;
  socketId: string;
}

export interface Room {
  roomId: string;
  hostId: string;
  videoId: string | null;
  playState: "playing" | "paused";
  currentTime: number;
  participants: Map<string, Participant>;
}