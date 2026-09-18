import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { socket } from "../services/socket";

function generateUserId() {
  return crypto.randomUUID();
}

export default function Home() {
  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");

  const [roomId, setRoomId] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    const handleError = (data: {
      message: string;
    }) => {
      setError(data.message);
    };

    const handleRoomCreated = (
      room: {
        roomId: string;
      }
    ) => {
      sessionStorage.setItem(
        "isHost",
        "true"
      );

      navigate(
        `/room/${room.roomId}`
      );
    };

    socket.on(
      "error_message",
      handleError
    );

    socket.on(
      "room_created",
      handleRoomCreated
    );

    return () => {
      socket.off(
        "error_message",
        handleError
      );

      socket.off(
        "room_created",
        handleRoomCreated
      );
    };
  }, [navigate]);

  const createRoom = () => {
    setError("");

    if (!username.trim()) {
      setError(
        "Please enter your username"
      );

      return;
    }

    const userId =
      generateUserId();

    sessionStorage.setItem(
      "userId",
      userId
    );

    sessionStorage.setItem(
      "username",
      username.trim()
    );

    socket.emit(
      "create_room",
      {
        userId,
        username:
          username.trim(),
      }
    );
  };

  const joinRoom = () => {
    setError("");

    if (!username.trim()) {
      setError(
        "Please enter your username"
      );

      return;
    }

    if (!roomId.trim()) {
      setError(
        "Please enter room code"
      );

      return;
    }

    const userId =
      generateUserId();

    sessionStorage.setItem(
      "userId",
      userId
    );

    sessionStorage.setItem(
      "username",
      username.trim()
    );

    sessionStorage.setItem(
      "isHost",
      "false"
    );

    navigate(
      `/room/${roomId
        .trim()
        .toUpperCase()}`
    );
  };

  return (
    <div className="yt-home">
      <div className="yt-home-noise" />
      <header className="yt-home-header">
        <div className="yt-brand"><div className="yt-logo"><span>▶</span></div><div><strong>WatchParty</strong><span>Watch together</span></div></div>
        <div className="yt-live-pill"><span /> LIVE</div>
      </header>
      <main className="yt-home-main">
        <section className="yt-hero">
          <div className="yt-hero-copy">
            <div className="yt-kicker">YOUTUBE WATCH PARTY</div>
            <h1>Watch YouTube.<br /><span>Together.</span></h1>
            <p>Create a private room, invite your friends, and watch the same video in perfect sync.</p>
            <div className="yt-features"><div><b>●</b><span>Real-time playback sync</span></div><div><b>●</b><span>Live room chat</span></div><div><b>●</b><span>Host & moderator controls</span></div></div>
          </div>
          <section className="yt-entry-card">
            <div className="yt-card-top"><div className="yt-card-icon">▶</div><div><h2>Start watching</h2><p>Enter your name to continue</p></div></div>
            <label>Your name</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Kartik" autoComplete="off" />
            <button className="yt-primary-action" onClick={createRoom}><span>+</span>Create a watch party<b>→</b></button>
            <div className="yt-or"><span />OR<span /></div>
            <label>Have a room code?</label>
            <div className="yt-join-row"><input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ABC123" autoComplete="off" maxLength={12} /><button onClick={joinRoom}>Join</button></div>
            {error && <div className="yt-error">⚠ {error}</div>}
            <div className="yt-card-note"><span>🔒</span>Private room • Share the code with your friends</div>
          </section>
        </section>
        <section className="yt-how"><div><b>01</b><span>Create a room</span></div><i /><div><b>02</b><span>Share the code</span></div><i /><div><b>03</b><span>Watch together</span></div></section>
      </main>
      <footer className="yt-home-footer"><span>Built for synchronized YouTube watching</span><span>●</span><span>Real-time • Private • Simple</span></footer>
    </div>
  );

}