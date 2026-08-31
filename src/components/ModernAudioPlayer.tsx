import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  Heart, Share2, Download, Repeat, Shuffle, ListMusic,
  ChevronDown, ChevronUp, Music, MoreHorizontal, TrendingUp
} from "lucide-react";
import { useGetRelatedAudios, getImageUrl } from "@/lib/api-client";

interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  coverImage?: string;
  audioUrl: string;
  audioQualities?: Array<{
    quality: 'low' | 'medium' | 'high' | 'lossless';
    url: string;
    bitrate: number;
  }>;
  duration?: number;
  lyrics?: string;
}

interface ModernAudioPlayerProps {
  track: AudioTrack;
  queue?: AudioTrack[];
  onNext?: () => void;
  onPrev?: () => void;
  onLike?: () => void;
  onShare?: () => void;
}

export default function ModernAudioPlayer({ track, queue = [], onNext, onPrev, onLike, onShare }: ModernAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<'low' | 'medium' | 'high' | 'lossless'>('high');
  const [showRelated, setShowRelated] = useState(false);

  const { data: relatedData } = useGetRelatedAudios(track.id, 10);
  const relatedTracks = relatedData?.data || [];
  const [isExpanded, setIsExpanded] = useState(false);

  const qualities = track.audioQualities || [];
  const hasQualities = qualities.length > 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else if (onNext) {
        onNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isRepeat, onNext]);

  useEffect(() => {
    if (!track.audioUrl) return;
    const audio = audioRef.current;
    if (audio) {
      audio.src = getCurrentQualityUrl();
      if (isPlaying) audio.play();
    }
  }, [track.id]);

  useEffect(() => {
    if (hasQualities) {
      const quality = qualities.find(q => q.quality === currentQuality);
      if (quality && audioRef.current) {
        const wasPlaying = isPlaying;
        audioRef.current.src = quality.url;
        if (wasPlaying) audioRef.current.play();
      }
    }
  }, [currentQuality]);

  const getCurrentQualityUrl = () => {
    if (hasQualities) {
      const quality = qualities.find(q => q.quality === currentQuality);
      return quality?.url || track.audioUrl;
    }
    return track.audioUrl;
  };

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
  }, []);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, "#e50914");
        gradient.addColorStop(1, "#ff6b6b");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      cancelAnimationFrame(animationRef.current);
    } else {
      initAudioContext();
      audio.play();
      drawVisualizer();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, initAudioContext, drawVisualizer]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = Number(e.target.value);
    audio.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQualityLabel = (q: string) => {
    switch (q) {
      case 'low': return '128 kbps';
      case 'medium': return '192 kbps';
      case 'high': return '320 kbps';
      case 'lossless': return 'FLAC';
      default: return q;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <audio ref={audioRef} src={getCurrentQualityUrl()} preload="metadata" />

      {/* Main Player Card */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
        {/* Visualizer */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-b from-zinc-800/50 to-transparent">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={800} height={256} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-2xl border-4 border-zinc-700/50 ${isPlaying ? "animate-spin-slow" : ""}`}>
              {track.coverImage || track.thumbnail ? (
                <img src={track.coverImage || track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-red-800 flex items-center justify-center">
                  <Music className="w-16 h-16 text-white/50" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Track Info */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{track.title}</h2>
            <p className="text-zinc-400 text-sm">{track.artist}{track.album ? ` • ${track.album}` : ""}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-6">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 rounded-full transition-colors ${isShuffle ? "text-primary" : "text-zinc-400 hover:text-white"}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>
            <button onClick={onPrev} className="p-2 text-zinc-300 hover:text-white transition-colors">
              <SkipBack className="w-6 h-6" />
            </button>
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-1" />
              )}
            </button>
            <button onClick={onNext} className="p-2 text-zinc-300 hover:text-white transition-colors">
              <SkipForward className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`p-2 rounded-full transition-colors ${isRepeat ? "text-primary" : "text-zinc-400 hover:text-white"}`}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          {/* Volume & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              {hasQualities && (
                <select
                  value={currentQuality}
                  onChange={(e) => setCurrentQuality(e.target.value as any)}
                  className="bg-zinc-800 text-xs text-zinc-300 border border-zinc-700 rounded-lg px-2 py-1 cursor-pointer"
                >
                  {qualities.map((q) => (
                    <option key={q.quality} value={q.quality}>
                      {getQualityLabel(q.quality)}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={onLike} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                <Heart className="w-5 h-5" />
              </button>
              <button onClick={onShare} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Queue & Lyrics Toggle */}
      <div className="flex gap-2 mt-4">
        {queue.length > 0 && (
          <button
            onClick={() => setShowQueue(!showQueue)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-colors"
          >
            <ListMusic className="w-4 h-4" />
            Queue
            {showQueue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
        {track.lyrics && (
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-colors"
          >
            {showLyrics ? "Hide Lyrics" : "Show Lyrics"}
          </button>
        )}
      </div>

      {/* Queue Panel */}
      {showQueue && queue.length > 0 && (
        <div className="mt-4 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white">Up Next</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {queue.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <span className="text-zinc-500 text-sm w-6">{idx + 1}</span>
                <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{item.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lyrics Panel */}
      {showLyrics && track.lyrics && (
        <div className="mt-4 bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h3 className="font-semibold text-white mb-4">Lyrics</h3>
          <p className="text-zinc-400 whitespace-pre-wrap text-sm leading-relaxed">{track.lyrics}</p>
        </div>
      )}

      {/* Related Songs Panel */}
      {relatedTracks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowRelated(!showRelated)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Related Songs
            {showRelated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showRelated && (
            <div className="mt-2 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold text-white">You Might Also Like</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {relatedTracks.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                      {item.thumbnail || item.coverImage ? (
                        <img src={getImageUrl(item.thumbnail || item.coverImage)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.artist}</p>
                    </div>
                    {item.duration && (
                      <span className="text-xs text-zinc-500">
                        {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
