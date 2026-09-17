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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111827",
        color: "white",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#1f2937",
          padding: "40px",
          borderRadius: "16px",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
            marginBottom: "10px",
          }}
        >
          YouTube Watch Party
        </h1>

        <p
          style={{
            color: "#9ca3af",
            marginBottom: "30px",
          }}
        >
          Watch YouTube together
          in real time.
        </p>

        <input
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
          placeholder="Enter your username"
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "15px",
            borderRadius: "8px",
            border:
              "1px solid #374151",
            background: "#111827",
            color: "white",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={createRoom}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "25px",
          }}
        >
          Create Watch Party
        </button>

        <div
          style={{
            textAlign: "center",
            color: "#9ca3af",
            marginBottom: "20px",
          }}
        >
          OR
        </div>

        <input
          value={roomId}
          onChange={(e) =>
            setRoomId(
              e.target.value
            )
          }
          placeholder="Enter room code"
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "15px",
            borderRadius: "8px",
            border:
              "1px solid #374151",
            background: "#111827",
            color: "white",
            boxSizing: "border-box",
            textTransform:
              "uppercase",
          }}
        />

        <button
          onClick={joinRoom}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Join Watch Party
        </button>

        {error && (
          <p
            style={{
              color: "#ef4444",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}