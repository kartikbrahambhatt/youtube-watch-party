export function extractYouTubeVideoId(
  url: string
): string | null {
  const value = url.trim();

  // Direct YouTube video ID
  if (
    /^[a-zA-Z0-9_-]{11}$/.test(value)
  ) {
    return value;
  }

  try {
    const parsedUrl = new URL(value);

    /*
     * Standard URL:
     * https://www.youtube.com/watch?v=VIDEO_ID
     */
    if (
      parsedUrl.hostname ===
        "www.youtube.com" ||
      parsedUrl.hostname ===
        "youtube.com"
    ) {
      const videoId =
        parsedUrl.searchParams.get("v");

      if (
        videoId &&
        /^[a-zA-Z0-9_-]{11}$/.test(
          videoId
        )
      ) {
        return videoId;
      }

      /*
       * Embed URL:
       * https://www.youtube.com/embed/VIDEO_ID
       */
      const parts =
        parsedUrl.pathname
          .split("/")
          .filter(Boolean);

      if (
        parts[0] === "embed" &&
        parts[1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(
          parts[1]
        )
      ) {
        return parts[1];
      }
    }

    /*
     * Short URL:
     * https://youtu.be/VIDEO_ID
     */
    if (
      parsedUrl.hostname ===
        "youtu.be"
    ) {
      const videoId =
        parsedUrl.pathname
          .split("/")
          .filter(Boolean)[0];

      if (
        videoId &&
        /^[a-zA-Z0-9_-]{11}$/.test(
          videoId
        )
      ) {
        return videoId;
      }
    }
  } catch {
    return null;
  }

  return null;
}