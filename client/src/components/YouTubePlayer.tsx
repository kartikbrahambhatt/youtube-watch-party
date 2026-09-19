import {
  useEffect,
  useRef,
} from "react";

import type {
  YouTubeAPI,
  YouTubePlayer,
} from "../types/youtube";

interface YouTubePlayerProps {
  videoId: string | null;

  onPlayerReady?: (
    player: YouTubePlayer
  ) => void;
}

declare global {
  interface Window {
    YT?: YouTubeAPI;

    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function YouTubePlayer({
  videoId,
  onPlayerReady,
}: YouTubePlayerProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const playerRef =
    useRef<YouTubePlayer | null>(
      null
    );

  const readyCallbackRef =
    useRef(onPlayerReady);

  /*
   * Always keep the latest callback
   * without recreating the YouTube player.
   */
  useEffect(() => {
    readyCallbackRef.current =
      onPlayerReady;
  }, [onPlayerReady]);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    let cancelled = false;

    const createPlayer = () => {
      if (
        cancelled ||
        !containerRef.current ||
        !window.YT
      ) {
        return;
      }

      /*
       * Destroy old player before
       * creating a new one.
       */
      if (playerRef.current) {
        playerRef.current.destroy();

        playerRef.current = null;
      }

      playerRef.current =
        new window.YT.Player(
          containerRef.current,
          {
            width: "100%",
            height: "100%",

            videoId,

            playerVars: {
              autoplay: 0,
              controls: 0,
              rel: 0,
            },

            events: {
              onReady: (
                event
              ) => {
                readyCallbackRef.current?.(
                  event.target
                );
              },
            },
          }
        );
    };

    /*
     * YouTube API already loaded
     */
    if (
      window.YT &&
      window.YT.Player
    ) {
      createPlayer();
    } else {
      /*
       * Check if script already exists.
       */
      const existingScript =
        document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        );

      if (!existingScript) {
        const script =
          document.createElement(
            "script"
          );

        script.src =
          "https://www.youtube.com/iframe_api";

        script.async = true;

        document.body.appendChild(
          script
        );
      }

      /*
       * YouTube calls this function
       * when its API finishes loading.
       */
      window.onYouTubeIframeAPIReady =
        () => {
          createPlayer();
        };
    }

    return () => {
      cancelled = true;

      if (
        playerRef.current
      ) {
        playerRef.current.destroy();

        playerRef.current = null;
      }
    };
  }, [videoId]);

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {videoId ? (
        <>
          <div
            ref={containerRef}
            style={{
              width: "100%",
              height: "100%",
            }}
          />

          {/* Block native YouTube mouse/touch controls.
              Playback stays controlled by the app. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "transparent",
              cursor: "default",
            }}
          />
        </>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
          }}
        >
          <p>
            Paste a YouTube URL
            to start watching.
          </p>
        </div>
      )}
    </div>
  );
}