import { useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";
import type { ChatMessage } from "../types/chat";

interface ChatProps {
  roomId: string;
  userId: string;
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Chat({
  roomId,
  userId,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleReceiveMessage = (
      chatMessage: ChatMessage
    ) => {

      setMessages((currentMessages) => {
        // Prevent duplicate messages
        if (
          currentMessages.some(
            (item) =>
              item.messageId ===
              chatMessage.messageId
          )
        ) {
          return currentMessages;
        }

        return [
          ...currentMessages,
          chatMessage,
        ];
      });
    };

    const handleChatHistory = (
      chatHistory: ChatMessage[]
    ) => {

      setMessages((currentMessages) => {
        const messageMap = new Map<string, ChatMessage>();

        for (const item of chatHistory) {
          messageMap.set(item.messageId, item);
        }

        for (const item of currentMessages) {
          messageMap.set(item.messageId, item);
        }

        return Array.from(messageMap.values()).sort(
          (a, b) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime()
        );
      });
    };

    socket.on(
      "receive_message",
      handleReceiveMessage
    );

    socket.on(
      "chat_history",
      handleChatHistory
    );
    socket.emit(
      "get_chat_history",
      {
        roomId:
          roomId.trim().toUpperCase(),
        userId,
      }
    );

    return () => {
      socket.off(
        "receive_message",
        handleReceiveMessage
      );

      socket.off(
        "chat_history",
        handleChatHistory
      );
    };
  }, [roomId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    socket.emit("send_message", {
      roomId: roomId.trim().toUpperCase(),
      userId,
      message: trimmedMessage,
    });

    setMessage("");
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div
      style={{
        background: "#1f2937",
        borderRadius: "12px",
        padding: "20px",
        height: "500px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        Room Chat
      </h2>

      {/* Messages */}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          background: "#111827",
          borderRadius: "8px",
          marginBottom: "15px",
        }}
      >
        {messages.length === 0 ? (
          <p
            style={{
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((chatMessage) => {
            const isOwnMessage =
              chatMessage.userId === userId;

            return (
              <div
                key={chatMessage.messageId}
                style={{
                  display: "flex",
                  justifyContent: isOwnMessage
                    ? "flex-end"
                    : "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: isOwnMessage
                      ? "#2563eb"
                      : "#374151",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    {isOwnMessage
                      ? "You"
                      : chatMessage.username}
                  </div>

                  <div
                    style={{
                      wordBreak: "break-word",
                    }}
                  >
                    {chatMessage.message}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#d1d5db",
                      marginTop: "5px",
                      textAlign: "right",
                    }}
                  >
                    {formatTime(
                      chatMessage.timestamp
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}

      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        <input
          type="text"
          value={message}
          onChange={(event) =>
            setMessage(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#111827",
            color: "white",
            outline: "none",
          }}
        />

        <button onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}