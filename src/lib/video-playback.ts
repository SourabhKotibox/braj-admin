export function isHlsUrl(url?: string | null): boolean {
  return !!url && url.includes(".m3u8");
}

export function getVideoPlaybackUrls(track: {
  videoUrl?: string;
  hlsUrl?: string;
  originalVideoUrl?: string;
  playbackUrls?: string[];
  videoQualities?: Array<{ quality?: string; url?: string }>;
}): string[] {
  if (track.playbackUrls?.length) {
    return track.playbackUrls.filter(Boolean);
  }

  const urls: string[] = [];
  const add = (u?: string | null) => {
    if (!u || urls.includes(u)) return;
    urls.push(u);
  };

  add(track.originalVideoUrl);
  if (track.videoUrl && !isHlsUrl(track.videoUrl)) add(track.videoUrl);

  for (const q of track.videoQualities || []) {
    if (q?.url && !isHlsUrl(q.url)) add(q.url);
  }

  add(track.hlsUrl);

  const hlsQualities = (track.videoQualities || []).filter((q) => q?.url && isHlsUrl(q.url));
  for (const quality of ["1080p", "720p", "480p", "360p"]) {
    const match = hlsQualities.find((q) => q.quality === quality);
    if (match?.url) add(match.url);
  }
  for (const q of hlsQualities) add(q.url);

  add(track.videoUrl);
  return urls;
}

export function toAbsoluteMediaUrl(url: string, baseFn: (path: string) => string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return baseFn(url);
}
