import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Heart, Share2, Download, Music } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title: string;
  artist: string;
  thumbnail?: string;
  onLike?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

export default function AudioPlayer({ src, title, artist, thumbnail, onLike, onShare, onDownload }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

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

  return (
    <div className="w-full bg-gradient-to-b from-zinc-900 to-black rounded-2xl overflow-hidden">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-2xl">
            {thumbnail ? (
              <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-16 h-16 text-zinc-600" />
              </div>
            )}
          </div>

          <div className="flex-1 w-full text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{title}</h2>
            <p className="text-zinc-400 text-sm mb-6">{artist}</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-10">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="text-xs text-zinc-500 w-10">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-4">
                <button className="text-zinc-400 hover:text-white transition-colors">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  )}
                </button>
                <button className="text-zinc-400 hover:text-white transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-4 mt-4">
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <div className="flex items-center gap-2 ml-auto">
                  {onLike && (
                    <button onClick={onLike} className="text-zinc-400 hover:text-primary transition-colors">
                      <Heart className="w-5 h-5" />
                    </button>
                  )}
                  {onShare && (
                    <button onClick={onShare} className="text-zinc-400 hover:text-white transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                  )}
                  {onDownload && (
                    <button onClick={onDownload} className="text-zinc-400 hover:text-white transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
