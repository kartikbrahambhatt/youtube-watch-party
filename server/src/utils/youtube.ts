export function extractYouTubeVideoId(
  url: string
): string | null {
  const value = url.trim();

  /*
   * Direct video ID
   */
  if (
    /^[a-zA-Z0-9_-]{11}$/.test(
      value
    )
  ) {
    return value;
  }

  try {
    const parsedUrl =
      new URL(value);

    /*
     * https://www.youtube.com/watch?v=VIDEO_ID
     */
    if (
      parsedUrl.hostname.includes(
        "youtube.com"
      )
    ) {
      const videoId =
        parsedUrl.searchParams.get(
          "v"
        );

      if (
        videoId &&
        /^[a-zA-Z0-9_-]{11}$/.test(
          videoId
        )
      ) {
        return videoId;
      }

      /*
       * https://www.youtube.com/embed/VIDEO_ID
       */
      const pathParts =
        parsedUrl.pathname
          .split("/")
          .filter(Boolean);

      const embedIndex =
        pathParts.indexOf(
          "embed"
        );

      if (
        embedIndex !== -1 &&
        pathParts[embedIndex + 1]
      ) {
        const id =
          pathParts[
            embedIndex + 1
          ];

        if (
          /^[a-zA-Z0-9_-]{11}$/.test(
            id
          )
        ) {
          return id;
        }
      }
    }

    /*
     * https://youtu.be/VIDEO_ID
     */
    if (
      parsedUrl.hostname ===
      "youtu.be"
    ) {
      const id =
        parsedUrl.pathname
          .split("/")
          .filter(Boolean)[0];

      if (
        id &&
        /^[a-zA-Z0-9_-]{11}$/.test(
          id
        )
      ) {
        return id;
      }
    }
  } catch {
    return null;
  }

  return null;
}