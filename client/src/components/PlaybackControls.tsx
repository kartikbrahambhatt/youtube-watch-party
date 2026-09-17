interface PlaybackControlsProps {
  canControl: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  onPlay: () => void;
  onPause: () => void;
  onSeek: (
    time: number
  ) => void;
}

function formatTime(
  seconds: number
): string {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    Math.floor(seconds % 60);

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function PlaybackControls({
  canControl,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
}: PlaybackControlsProps) {
  return (
    <div
      style={{
        marginTop: "15px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          disabled={!canControl}
          onClick={
            isPlaying
              ? onPause
              : onPlay
          }
        >
          {isPlaying
            ? "Pause"
            : "Play"}
        </button>

        <span>
          {formatTime(currentTime)}
          {" / "}
          {formatTime(duration)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(
          currentTime,
          duration || 0
        )}
        disabled={
          !canControl ||
          duration <= 0
        }
        onChange={(event) => {
          onSeek(
            Number(
              event.target.value
            )
          );
        }}
        style={{
          width: "100%",
          marginTop: "15px",
        }}
      />

      {!canControl && (
        <p
          style={{
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          Only the Host or Moderator
          can control playback.
        </p>
      )}
    </div>
  );
}