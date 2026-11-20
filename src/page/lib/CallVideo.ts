interface VideoStream {
  getVideoTracks?: () => Array<{ readyState: string }>;
}

function hasLiveTrack(video: HTMLVideoElement): boolean {
  const stream = video.srcObject as unknown as VideoStream | null;
  return stream?.getVideoTracks?.().some((track) => track.readyState === 'live') ?? false;
}

function areaOf(video: HTMLVideoElement): number {
  if (video.paused || video.ended || !hasLiveTrack(video)) {
    return 0;
  }
  const { width, height } = video.getBoundingClientRect();
  return width * height;
}

export class CallVideo {
  /**
   * @param root The document of a call page.
   * @returns The largest video that is playing a live video track, or null when there is none.
   */
  public static pick(root: ParentNode): HTMLVideoElement | null {
    let best: HTMLVideoElement | null = null;
    let bestArea = 0;
    for (const video of Array.from(root.querySelectorAll('video'))) {
      const area = areaOf(video);
      if (area > bestArea) {
        best = video;
        bestArea = area;
      }
    }
    return best;
  }
}
