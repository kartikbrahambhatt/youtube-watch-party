import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { socket } from "../services/socket";

import Chat from "../components/Chat";

import YouTubePlayer from "../components/YouTubePlayer";

import PlaybackControls from "../components/PlaybackControls";

import VideoInput from "../components/VideoInput";

import type {
  Participant,
  RoomState,
} from "../types/room";

import type {
  YouTubePlayer as YouTubePlayerInstance,
} from "../types/youtube";

import {
  extractYouTubeVideoId,
} from "../utils/youtube.ts";

export default function WatchRoom() {
  const { roomId } =
    useParams<{
      roomId: string;
    }>();

  const navigate =
    useNavigate();

  const [room, setRoom] =
    useState<RoomState | null>(
      null
    );

  const [error, setError] =
    useState("");

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const playerRef =
    useRef<YouTubePlayerInstance | null>(
      null
    );

  const applyingRemoteUpdate =
    useRef(false);

  const currentUserId =
    sessionStorage.getItem(
      "userId"
    );

  const currentUsername =
    sessionStorage.getItem(
      "username"
    );

  /*
  |--------------------------------------------------------------------------
  | Player Ready
  |--------------------------------------------------------------------------
  */

  const handlePlayerReady = (
    player: YouTubePlayerInstance
  ) => {
    playerRef.current =
      player;

    setDuration(
      player.getDuration()
    );

    if (!room) {
      return;
    }

    /*
     * Apply current server state
     * to the newly loaded player.
     */

    applyingRemoteUpdate.current =
      true;

    player.seekTo(
      room.currentTime,
      true
    );

    if (
      room.playState ===
      "playing"
    ) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }

    setTimeout(() => {
      applyingRemoteUpdate.current =
        false;
    }, 300);
  };

  /*
  |--------------------------------------------------------------------------
  | Socket Events
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !roomId ||
      !currentUserId ||
      !currentUsername
    ) {
      navigate("/");

      return;
    }

    const normalizedRoomId =
      roomId
        .trim()
        .toUpperCase();

    const handleSyncState = (
      roomState: RoomState
    ) => {
      setRoom(roomState);

      setCurrentTime(
        roomState.currentTime
      );

      /*
       * Apply remote server state
       * to YouTube player.
       */

      if (
        !playerRef.current
      ) {
        return;
      }

      const player =
        playerRef.current;

      applyingRemoteUpdate.current =
        true;

      /*
       * Load a different video
       */

      if (
        roomState.videoId &&
        player.getVideoData()
          ?.video_id !==
        roomState.videoId
      ) {
        player.loadVideoById(
          roomState.videoId
        );
      }

      /*
       * Synchronize position
       */

      player.seekTo(
        roomState.currentTime,
        true
      );

      /*
       * Synchronize play state
       */

      if (
        roomState.playState ===
        "playing"
      ) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }

      setTimeout(() => {
        applyingRemoteUpdate.current =
          false;
      }, 300);
    };

    const handleUserJoined = (
      data: {
        participants:
        Participant[];
      }
    ) => {
      setRoom(
        (currentRoom) => {
          if (
            !currentRoom
          ) {
            return currentRoom;
          }

          return {
            ...currentRoom,
            participants:
              data.participants,
          };
        }
      );
    };

    const handleUserLeft = (
      data: {
        participants:
        Participant[];
      }
    ) => {
      setRoom(
        (currentRoom) => {
          if (
            !currentRoom
          ) {
            return currentRoom;
          }

          return {
            ...currentRoom,
            participants:
              data.participants,
          };
        }
      );
    };

    const handleError = (
      data: {
        message: string;
      }
    ) => {
      setError(data.message);
    };

    const handleRemovedFromRoom = (
      data: { message: string }
    ) => {
      alert(data.message);
      navigate("/");
    };

    socket.on(
      "sync_state",
      handleSyncState
    );

    socket.on(
      "user_joined",
      handleUserJoined
    );

    socket.on(
      "user_left",
      handleUserLeft
    );

    socket.on(
      "error_message",
      handleError
    );

    socket.on(
      "removed_from_room",
      handleRemovedFromRoom
    );

    socket.emit("join_room", {
      roomId: normalizedRoomId,
      userId: currentUserId,
      username: currentUsername,
    });

    return () => {
      socket.off(
        "sync_state",
        handleSyncState
      );

      socket.off(
        "user_joined",
        handleUserJoined
      );

      socket.off(
        "user_left",
        handleUserLeft
      );

      socket.off(
        "error_message",
        handleError
      );

      socket.off(
        "removed_from_room",
        handleRemovedFromRoom
      );
    };

  }, [
    roomId,
    navigate,
    currentUserId,
    currentUsername,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Playback Actions
  |--------------------------------------------------------------------------
  */

  const canControl =


    room?.participants.find(
      (participant) =>
        participant.userId ===
        currentUserId
    )?.role === "host" ||
    room?.participants.find(
      (participant) =>
        participant.userId ===
        currentUserId
    )?.role ===
    "moderator";

  const isHost = room?.hostId === currentUserId;

  const promoteToModerator = (targetUserId: string) => {
    if (!roomId || !currentUserId) return;

    socket.emit("update_role", {
      roomId: roomId.trim().toUpperCase(),
      userId: currentUserId,
      targetUserId,
      role: "moderator",
    });
  };

  const transferHost = (targetUserId: string) => {
    if (!roomId || !currentUserId) return;

    const confirmed = window.confirm(
      "Transfer Host role to this participant? You will become a Participant."
    );

    if (!confirmed) return;

    socket.emit("transfer_host", {
      roomId: roomId.trim().toUpperCase(),
      userId: currentUserId,
      targetUserId,
    });
  };

  const demoteToParticipant = (targetUserId: string) => {
    if (!roomId || !currentUserId) return;

    socket.emit("update_role", {
      roomId: roomId.trim().toUpperCase(),
      userId: currentUserId,
      targetUserId,
      role: "participant",
    });
  };

  const removeUser = (targetUserId: string) => {
    if (!roomId || !currentUserId) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this participant?"
    );

    if (!confirmed) return;

    socket.emit("remove_participant", {
      roomId: roomId.trim().toUpperCase(),
      userId: currentUserId,
      targetUserId,
    });
  };

  const playVideo = () => {
    if (
      !roomId ||
      !currentUserId ||
      !playerRef.current
    ) {
      return;
    }

    const time =
      playerRef.current.getCurrentTime();

    socket.emit(
      "play",
      {
        roomId:
          roomId
            .trim()
            .toUpperCase(),

        userId:
          currentUserId,

        currentTime:
          time,
      }
    );
  };

  const pauseVideo = () => {
    if (
      !roomId ||
      !currentUserId ||
      !playerRef.current
    ) {
      return;
    }

    const time =
      playerRef.current.getCurrentTime();

    socket.emit(
      "pause",
      {
        roomId:
          roomId
            .trim()
            .toUpperCase(),

        userId:
          currentUserId,

        currentTime:
          time,
      }
    );
  };

  const seekVideo = (
    time: number
  ) => {
    if (
      !roomId ||
      !currentUserId
    ) {
      return;
    }

    socket.emit(
      "seek",
      {
        roomId:
          roomId
            .trim()
            .toUpperCase(),

        userId:
          currentUserId,

        time,
      }
    );
  };

  const changeVideo = (
    value: string
  ) => {
    if (
      !roomId ||
      !currentUserId
    ) {
      return;
    }

    const videoId =
      extractYouTubeVideoId(
        value
      );

    if (!videoId) {
      setError(
        "Invalid YouTube URL or video ID"
      );

      return;
    }

    setError("");

    socket.emit(
      "change_video",
      {
        roomId:
          roomId
            .trim()
            .toUpperCase(),

        userId:
          currentUserId,

        videoId,
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Leave Room
  |--------------------------------------------------------------------------
  */

  const leaveRoom = () => {
    if (
      roomId &&
      currentUserId
    ) {
      socket.emit(
        "leave_room",
        {
          roomId,
          userId:
            currentUserId,
          username:
            currentUsername,
        }
      );
    }

    navigate("/");
  };

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111827",
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        <h2>{error}</h2>

        <button
          onClick={() =>
            setError("")
          }
        >
          Close
        </button>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (!room) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111827",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2>
          Connecting to room...
        </h2>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */


  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "white",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1>
              YouTube Watch Party
            </h1>

            <p
              style={{
                color: "#9ca3af",
              }}
            >
              Room Code:
              <strong>
                {" "}
                {room.roomId}
              </strong>
            </p>
          </div>

          <button
            onClick={
              leaveRoom
            }
          >
            Leave Room
          </button>
        </div>

        {/* MAIN */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 300px",
            gap: "25px",
          }}
        >
          {/* VIDEO */}

          <div
            style={{
              background:
                "#1f2937",
              borderRadius:
                "12px",
              padding: "20px",
            }}
          >
            <YouTubePlayer
              videoId={
                room.videoId
              }
              onPlayerReady={
                handlePlayerReady
              }
            />

            <PlaybackControls
              canControl={
                Boolean(
                  canControl
                )
              }
              isPlaying={
                room.playState ===
                "playing"
              }
              currentTime={
                currentTime
              }
              duration={
                duration
              }
              onPlay={
                playVideo
              }
              onPause={
                pauseVideo
              }
              onSeek={
                seekVideo
              }
            />

            <VideoInput
              canControl={
                Boolean(
                  canControl
                )
              }
              onChangeVideo={
                changeVideo
              }
            />

            <div
              style={{
                marginTop:
                  "15px",
                color:
                  "#9ca3af",
              }}
            >
              Your role:{" "}
              <strong
                style={{
                  color:
                    "white",
                }}
              >
                {
                  room.participants.find(
                    (
                      participant
                    ) =>
                      participant.userId ===
                      currentUserId
                  )?.role
                }
              </strong>
            </div>
          </div>

          {/* PARTICIPANTS */}

          <div
            style={{
              background:
                "#1f2937",
              borderRadius:
                "12px",
              padding: "20px",
            }}
          >
            <h2>
              Participants
            </h2>

            <p
              style={{
                color:
                  "#9ca3af",
              }}
            >
              {
                room
                  .participants
                  .length
              }{" "}
              connected
            </p>

            <div
              style={{
                marginTop:
                  "20px",
              }}
            >
              {room.participants.map((participant) => (
                <div
                  key={participant.userId}
                  style={{
                    padding: "15px",
                    marginBottom: "10px",
                    background: "#111827",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <strong>{participant.username}</strong>

                      <div
                        style={{
                          color: "#9ca3af",
                          marginTop: "5px",
                          textTransform: "capitalize",
                        }}
                      >
                        {participant.role}
                      </div>
                    </div>

                    {/* HOST CONTROLS */}
                    {isHost && participant.userId !== currentUserId && (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() =>
                            transferHost(participant.userId)
                          }
                        >
                          Make Host
                        </button>

                        {participant.role === "participant" ? (
                          <button
                            onClick={() =>
                              promoteToModerator(participant.userId)
                            }
                          >
                            Make Moderator
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              demoteToParticipant(participant.userId)
                            }
                          >
                            Remove Moderator
                          </button>
                        )}

                        <button
                          onClick={() =>
                            removeUser(participant.userId)
                          }
                          style={{
                            background: "#dc2626",
                            color: "white",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* CHAT */}

          <div style={{ marginTop: "25px" }}>
            <Chat
              roomId={room.roomId}
              userId={currentUserId!}

            />
          </div>

        </div>
      </div>
    </div>
  );
}