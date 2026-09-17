export interface YouTubePlayer {
  playVideo(): void;

  pauseVideo(): void;

  seekTo(
    seconds: number,
    allowSeekAhead: boolean
  ): void;

  loadVideoById(
    videoId: string
  ): void;

  getCurrentTime(): number;

  getDuration(): number;

  getVideoData(): {
    video_id?: string;
  };

  destroy(): void;
}

export interface YouTubeReadyEvent {
  target: YouTubePlayer;
}

export interface YouTubePlayerOptions {
  width?: string;
  height?: string;

  videoId?: string;

  playerVars?: {
    autoplay?: number;
    controls?: number;
    rel?: number;
    modestbranding?: number;
  };

  events?: {
    onReady?: (
      event: YouTubeReadyEvent
    ) => void;
  };
}

export interface YouTubeAPI {
  Player: new (
    element: HTMLElement,
    options: YouTubePlayerOptions
  ) => YouTubePlayer;
}