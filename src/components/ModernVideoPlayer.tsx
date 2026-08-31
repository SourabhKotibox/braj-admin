import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Heart, Share2, Download, Settings, SkipBack, SkipForward,
  Film, ListVideo, MessageSquare, ThumbsUp, TrendingUp,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useGetRelatedVideoMusics, getImageUrl } from "@/lib/api-client";

interface VideoTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  description?: string;
  thumbnail?: string;
  coverImage?: string;
  bannerImage?: string;
  videoUrl: string;
  hlsUrl?: string;
  videoQualities?: Array<{
    quality: '144p' | '240p' | '360p' | '480p' | '720p' | '1080p';
    url: string;
    size: number;
  }>;
  duration?: number;
  views?: number;
  likes?: number;
}

interface ModernVideoPlayerProps {
  track: VideoTrack;
  queue?: VideoTrack[];
  onNext?: () => void;
  onPrev?: () => void;
  onLike?: () => void;
  onShare?: () => void;
}

export default function ModernVideoPlayer({ track, queue = [], onNext, onPrev, onLike, onShare }: ModernVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentQuality, setCurrentQuality] = useState('720p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [showRelated, setShowRelated] = useState(false);

  const { data: relatedData } = useGetRelatedVideoMusics(track.id, 10);
  const relatedVideos = relatedData?.data || [];

  const qualities = track.videoQualities || [];
  const hasQualities = qualities.length > 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (onNext) onNext();
    };
    const updateBuffered = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("progress", updateBuffered);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("progress", updateBuffered);
    };
  }, [onNext]);

  useEffect(() => {
    if (!track.videoUrl) return;
    const video = videoRef.current;
    if (video) {
      video.src = getCurrentQualityUrl();
    }
  }, [track.id]);

  useEffect(() => {
    if (hasQualities) {
      const quality = qualities.find(q => q.quality === currentQuality);
      if (quality && videoRef.current) {
        const wasPlaying = isPlaying;
        const currentTime = videoRef.current.currentTime;
        videoRef.current.src = quality.url;
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) videoRef.current.play();
      }
    }
  }, [currentQuality]);

  const getCurrentQualityUrl = () => {
    if (hasQualities) {
      const quality = qualities.find(q => q.quality === currentQuality);
      return quality?.url || track.videoUrl;
    }
    return track.videoUrl;
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = Number(e.target.value);
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div ref={containerRef} className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          src={getCurrentQualityUrl()}
          poster={track.thumbnail || track.coverImage}
          preload="metadata"
          className="w-full aspect-video bg-black cursor-pointer"
          playsInline
          onClick={togglePlay}
        />

        {/* Controls Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 transition-opacity ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">{track.title}</h3>
              <p className="text-zinc-400 text-sm">{track.artist}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasQualities && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  {showQualityMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-10">
                      {qualities.map((q) => (
                        <button
                          key={q.quality}
                          onClick={() => { setCurrentQuality(q.quality); setShowQualityMenu(false); }}
                          className={`block w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors ${currentQuality === q.quality ? "text-primary" : "text-white"}`}
                        >
                          {q.quality}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Play Button */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-110"
              >
                <Play className="w-10 h-10 text-white ml-1" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <div className="relative">
              <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-500 rounded-full" style={{ width: `${(buffered / duration) * 100}%` }} />
              </div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="absolute top-0 left-0 h-1 bg-primary rounded-full pointer-events-none" style={{ width: `${(currentTime / duration) * 100}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={onPrev} className="text-white/80 hover:text-white transition-colors">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                </button>
                <button onClick={onNext} className="text-white/80 hover:text-white transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
                <span className="text-xs text-zinc-400">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>
                <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track Info & Actions */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{track.title}</h1>
          <p className="text-zinc-400 text-sm">{track.artist}{track.album ? ` • ${track.album}` : ""}</p>
          {track.views !== undefined && (
            <p className="text-zinc-500 text-xs mt-1">{formatViews(track.views)} views</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLike} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-300 hover:text-white transition-colors">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm">{track.likes ? formatViews(track.likes) : "Like"}</span>
          </button>
          <button onClick={onShare} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-300 hover:text-white transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-300 hover:text-white transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {track.description && (
        <div className="mt-4 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-zinc-400 text-sm">{track.description}</p>
        </div>
      )}

      {/* Queue Toggle */}
      {queue.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-colors"
          >
            <ListVideo className="w-4 h-4" />
            Up Next ({queue.length})
          </button>

          {showQueue && (
            <div className="mt-2 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {queue.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <span className="text-zinc-500 text-sm w-6">{idx + 1}</span>
                  <div className="w-20 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-5 h-5 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{item.artist}</p>
                  </div>
                   {item.duration && (
                    <span className="text-xs text-zinc-500">{formatTime(item.duration)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Related Videos */}
      {relatedVideos.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowRelated(!showRelated)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Related Videos
            {showRelated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showRelated && (
            <div className="mt-2 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold text-white">You Might Also Like</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {relatedVideos.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="w-20 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                      {item.thumbnail || item.coverImage ? (
                        <img src={getImageUrl(item.thumbnail || item.coverImage)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.artist}</p>
                    </div>
                    {item.duration && (
                      <span className="text-xs text-zinc-500">{formatTime(item.duration)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
