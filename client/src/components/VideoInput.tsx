import {
  useState,
} from "react";

interface VideoInputProps {
  canControl: boolean;

  onChangeVideo: (
    videoId: string
  ) => void;
}

export default function VideoInput({
  canControl,
  onChangeVideo,
}: VideoInputProps) {
  const [url, setUrl] =
    useState("");

  const submit = () => {
    if (!url.trim()) {
      return;
    }

    onChangeVideo(
      url.trim()
    );

    setUrl("");
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "20px",
      }}
    >
      <input
        value={url}
        onChange={(e) =>
          setUrl(e.target.value)
        }
        placeholder="Paste YouTube URL..."
        disabled={!canControl}
        style={{
          flex: 1,
          padding: "12px",
          borderRadius: "8px",
          border:
            "1px solid #374151",
          background: "#111827",
          color: "white",
        }}
      />

      <button
        disabled={!canControl}
        onClick={submit}
      >
        Change Video
      </button>
    </div>
  );
}