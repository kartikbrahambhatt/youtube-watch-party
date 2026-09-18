import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "../App.css";
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

  type PlaybackRequestAction =
    | "play"
    | "pause"
    | "seek"
    | "change_video";

  type PlaybackRequest = {
    requestId: string;
    roomId: string;
    userId: string;
    username: string;
    action: PlaybackRequestAction;
    currentTime?: number;
    videoId?: string;
    createdAt: string;
  };

  const [pendingRequests, setPendingRequests] =
    useState<PlaybackRequest[]>([]);

  const [requestStatus, setRequestStatus] =
    useState("");

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

    const handlePendingPlaybackRequests = (
      requests: PlaybackRequest[]
    ) => {
      setPendingRequests(requests);
    };

    const handlePlaybackRequestStatus = (
      data: {
        status:
          | "pending"
          | "approved"
          | "rejected";
        message: string;
        requestId?: string;
      }
    ) => {
      setRequestStatus(data.message);

      if (
        data.status === "approved" ||
        data.status === "rejected"
      ) {
        setTimeout(() => {
          setRequestStatus("");
        }, 3000);
      }
    };

    socket.on(
      "pending_playback_requests",
      handlePendingPlaybackRequests
    );

    socket.on(
      "playback_request_status",
      handlePlaybackRequestStatus
    );

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

      socket.off(
        "pending_playback_requests",
        handlePendingPlaybackRequests
      );

      socket.off(
        "playback_request_status",
        handlePlaybackRequestStatus
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

  const requestPlaybackAction = (
    action: PlaybackRequestAction,
    options?: {
      currentTime?: number;
      videoId?: string;
    }
  ) => {
    if (!roomId || !currentUserId) {
      return;
    }

    setRequestStatus(
      "Sending request..."
    );

    socket.emit(
      "request_playback_action",
      {
        roomId:
          roomId.trim().toUpperCase(),
        userId: currentUserId,
        action,
        currentTime:
          options?.currentTime,
        videoId:
          options?.videoId,
      }
    );
  };

  const requestPlay = () => {
    const time =
      playerRef.current?.getCurrentTime() ??
      currentTime;

    requestPlaybackAction(
      "play",
      { currentTime: time }
    );
  };

  const requestPause = () => {
    const time =
      playerRef.current?.getCurrentTime() ??
      currentTime;

    requestPlaybackAction(
      "pause",
      { currentTime: time }
    );
  };

  const requestSeek = () => {
    const rawTime =
      window.prompt(
        "Enter the time in seconds to seek to:",
        Math.floor(currentTime).toString()
      );

    if (rawTime === null) {
      return;
    }

    const time = Number(rawTime);

    if (
      !Number.isFinite(time) ||
      time < 0
    ) {
      setError(
        "Please enter a valid time in seconds."
      );
      return;
    }

    requestPlaybackAction(
      "seek",
      { currentTime: time }
    );
  };

  const requestVideoChange = () => {
    const value =
      window.prompt(
        "Paste a YouTube URL or video ID:"
      );

    if (value === null) {
      return;
    }

    const videoId =
      extractYouTubeVideoId(value);

    if (!videoId) {
      setError(
        "Invalid YouTube URL or video ID"
      );
      return;
    }

    requestPlaybackAction(
      "change_video",
      { videoId }
    );
  };

  const respondToPlaybackRequest = (
    requestId: string,
    approved: boolean
  ) => {
    if (!roomId || !currentUserId) {
      return;
    }

    socket.emit(
      "respond_playback_request",
      {
        roomId:
          roomId.trim().toUpperCase(),
        userId: currentUserId,
        requestId,
        approved,
      }
    );
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
      <div className="watch-page">
        <div className="state-card">
          <div className="state-icon">!</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="primary-btn" onClick={() => setError("")}>
            Close
          </button>
        </div>
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
      <div className="watch-page">
        <div className="state-card loading-card">
          <div className="loading-spinner" />
          <h2>Connecting to room...</h2>
          <p>Setting up your watch party session.</p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  const currentParticipant = room.participants.find(
    (participant) => participant.userId === currentUserId
  );
  const currentRole = currentParticipant?.role ?? "participant";

  const roleLabel =
    currentRole.charAt(0).toUpperCase() + currentRole.slice(1);

  return (
    <div className="watch-page">
      <div className="watch-shell">
        {/* HEADER */}
        <header className="watch-header">
          <div className="brand-block">
            <div className="yt-room-logo"><span>▶</span></div>
            <div>
              <div className="eyebrow">REAL-TIME WATCH PARTY</div>
              <h1>YouTube Watch Party</h1>
            </div>
          </div>

          <div className="header-actions">
            <div className="room-pill">
              <span className="room-dot" />
              <span className="room-label">ROOM</span>
              <strong>{room.roomId}</strong>
            </div>

            <button className="leave-btn" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        </header>

        {/* MAIN GRID */}
        <main className="watch-grid">
          {/* LEFT / MAIN CONTENT */}
          <section className="main-column">
            <div className="video-card">
              <div className="video-frame">
                <YouTubePlayer
                  videoId={room.videoId}
                  onPlayerReady={handlePlayerReady}
                />
              </div>

              <div className="video-meta">
                <div>
                  <span className="live-dot" />
                  <span>Live synchronized session</span>
                </div>

                <span className={`role-badge role-${currentRole}`}>
                  {roleLabel}
                </span>
              </div>

              <PlaybackControls
                canControl={Boolean(canControl)}
                isPlaying={room.playState === "playing"}
                currentTime={currentTime}
                duration={duration}
                onPlay={playVideo}
                onPause={pauseVideo}
                onSeek={seekVideo}
              />

              <VideoInput
                canControl={Boolean(canControl)}
                onChangeVideo={changeVideo}
              />
            </div>

            {/* REQUEST / MODERATION AREA */}
            {requestStatus && (
              <div className="status-banner">
                <span className="status-icon">✓</span>
                <span>{requestStatus}</span>
              </div>
            )}

            {!canControl && (
              <section className="feature-card request-card">
                <div className="section-heading">
                  <div className="section-icon request-icon">↗</div>
                  <div>
                    <h2>Request a Playback Change</h2>
                    <p>
                      Ask the Host or Moderator before changing the shared
                      playback.
                    </p>
                  </div>
                </div>

                <div className="request-actions">
                  <button className="action-btn" onClick={requestPlay}>
                    <span>▶</span>
                    Request Play
                  </button>

                  <button className="action-btn" onClick={requestPause}>
                    <span>Ⅱ</span>
                    Request Pause
                  </button>

                  <button className="action-btn" onClick={requestSeek}>
                    <span>↔</span>
                    Request Seek
                  </button>

                  <button className="action-btn" onClick={requestVideoChange}>
                    <span>⌁</span>
                    Request Video
                  </button>
                </div>
              </section>
            )}

            {canControl && pendingRequests.length > 0 && (
              <section className="feature-card moderation-card">
                <div className="section-heading">
                  <div className="section-icon moderation-icon">!</div>
                  <div>
                    <div className="heading-row">
                      <h2>Pending Requests</h2>
                      <span className="count-badge">{pendingRequests.length}</span>
                    </div>
                    <p>Review participant playback requests.</p>
                  </div>
                </div>

                <div className="request-list">
                  {pendingRequests.map((request) => (
                    <div className="request-item" key={request.requestId}>
                      <div className="request-user">
                        <div className="avatar">
                          {request.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{request.username}</strong>
                          <span>
                            Requested{" "}
                            {request.action === "change_video"
                              ? "a video change"
                              : request.action}
                            {request.currentTime !== undefined
                              ? ` at ${Math.floor(request.currentTime)}s`
                              : ""}
                          </span>
                          {request.videoId && (
                            <small>Video: {request.videoId}</small>
                          )}
                        </div>
                      </div>

                      <div className="request-decision">
                        <button
                          className="approve-btn"
                          onClick={() =>
                            respondToPlaybackRequest(
                              request.requestId,
                              true
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() =>
                            respondToPlaybackRequest(
                              request.requestId,
                              false
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CHAT */}
            <section className="chat-card">
              <div className="chat-header">
                <div>
                  <div className="section-kicker">ROOM CHAT</div>
                  <h2>Talk with everyone</h2>
                </div>
                <span className="online-badge">
                  <span className="online-dot" />
                  {room.participants.length} online
                </span>
              </div>

              <Chat
                roomId={room.roomId}
                userId={currentUserId!}
              />
            </section>
          </section>

          {/* RIGHT SIDEBAR */}
          <aside className="sidebar">
            <section className="people-card">
              <div className="people-heading">
                <div>
                  <div className="section-kicker">WATCH PARTY</div>
                  <h2>People</h2>
                </div>
                <span className="people-count">
                  {room.participants.length}
                </span>
              </div>

              <div className="people-list">
                {room.participants.map((participant) => {
                  const participantRole = participant.role;
                  const participantRoleLabel =
                    participantRole.charAt(0).toUpperCase() +
                    participantRole.slice(1);

                  return (
                    <div
                      className="person-row"
                      key={participant.userId}
                    >
                      <div className="person-main">
                        <div className="person-avatar">
                          {participant.username.charAt(0).toUpperCase()}
                          <span className="presence-dot" />
                        </div>

                        <div className="person-info">
                          <strong>
                            {participant.username}
                            {participant.userId === currentUserId && (
                              <span className="you-tag">YOU</span>
                            )}
                          </strong>
                          <span
                            className={`mini-role mini-role-${participantRole}`}
                          >
                            {participantRoleLabel}
                          </span>
                        </div>
                      </div>

                      {isHost && participant.userId !== currentUserId && (
                        <div className="person-controls">
                          <button
                            className="mini-btn"
                            onClick={() => transferHost(participant.userId)}
                            title="Make Host"
                          >
                            Host
                          </button>

                          {participant.role === "participant" ? (
                            <button
                              className="mini-btn"
                              onClick={() =>
                                promoteToModerator(participant.userId)
                              }
                              title="Make Moderator"
                            >
                              Mod
                            </button>
                          ) : (
                            <button
                              className="mini-btn"
                              onClick={() =>
                                demoteToParticipant(participant.userId)
                              }
                              title="Remove Moderator"
                            >
                              User
                            </button>
                          )}

                          <button
                            className="mini-btn danger-mini"
                            onClick={() => removeUser(participant.userId)}
                            title="Remove participant"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="role-note">
                <span className="role-note-icon">i</span>
                <p>
                  {isHost
                    ? "You manage roles and can moderate playback requests."
                    : canControl
                    ? "You can control playback and approve participant requests."
                    : "Playback changes require Host or Moderator approval."}
                </p>
              </div>
            </section>

            <section className="room-info-card">
              <div className="info-icon">⌁</div>
              <div>
                <span>ROOM CODE</span>
                <strong>{room.roomId}</strong>
                <small>Share this code to invite others.</small>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
