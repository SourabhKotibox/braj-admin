import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, Play, Pause, Heart, TrendingUp, Star, Music, Volume2, VolumeX, SkipBack, SkipForward, Share2, Download, Sparkles, Check, X, Maximize2, Users, Disc3, Filter, ArrowLeft, Clock, PlayCircle, Shuffle, Repeat, ListMusic, ChevronRight, GripVertical, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  useGetPublicAudios, getImageUrl, useGetRelatedAudios, 
  usePublicLikeAudio, usePublicShareAudio, downloadFile,
  useGetPublicAudioArtists, useGetPublicAudioAlbums,
  useGetPublicAudioByArtist, useGetPublicAudioByAlbum,
  useGetGenres, useGetCategoriesList, useGetLanguagesList,
  useGetPublicBanners
} from "@/lib/api-client";
import { PublicHeader, PublicFooter } from "./streaming-home";

interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  coverImage?: string;
  audioUrl: string;
  audioQualities?: Array<{ quality: string; url: string; bitrate: number; }>;
  duration?: number;
  lyrics?: string;
  views?: number;
  likes?: number;
  featured?: boolean;
  trending?: boolean;
  isExclusive?: boolean;
  genre?: any;
  category?: any;
  language?: any;
}

type ViewMode = "home" | "browse" | "artist" | "album" | "genre";

export default function AudioMusicPage() {
  const [, setLocation] = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [search, setSearch] = useState("");
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [selectedFilter, setSelectedFilter] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
   const [selectedLanguage, setSelectedLanguage] = useState("");
   const [showQueue, setShowQueue] = useState(false);
   const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
   const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
   const { data: bannersRes } = useGetPublicBanners({ page: "music", limit: "10" });
   const banners = bannersRes?.data || [];

   const { data: allAudiosData, isLoading: loadingAll } = useGetPublicAudios({ 
     search, ...(selectedGenre && { genre: selectedGenre }),
     ...(selectedCategory && { category: selectedCategory }),
     ...(selectedLanguage && { language: selectedLanguage })
   }, viewMode === "browse" || viewMode === "home");
   
   const { data: artistsData } = useGetPublicAudioArtists();
   const { data: albumsData } = useGetPublicAudioAlbums();
   const { data: artistAudios } = useGetPublicAudioByArtist(selectedFilter, { status: "published" }, viewMode === "artist" && !!selectedFilter);
   const { data: albumAudios } = useGetPublicAudioByAlbum(selectedFilter, { status: "published" }, viewMode === "album" && !!selectedFilter);
   const { data: genresData } = useGetGenres({ limit: 100 });
   const { data: categoriesData } = useGetCategoriesList({ limit: 100 });
   const { data: languagesData } = useGetLanguagesList();

  const allAudios: AudioTrack[] = (allAudiosData?.data || []).map((a: any) => ({
    ...a,
    id: a.id || a._id,
    audioUrl: a.audioUrl || a.audioQualities?.[0]?.url || "",
  }));
  const artists: string[] = artistsData?.data || [];
  const albums: string[] = albumsData?.data || [];
  const genres = genresData?.data || [];
  const categories = categoriesData?.data || [];
  const languages = languagesData?.data || [];
  
  const mapTrack = (a: any): AudioTrack => ({
    ...a,
    id: a.id || a._id,
    audioUrl: a.audioUrl || a.audioQualities?.[0]?.url || "",
  });
  const filteredAudios = viewMode === "artist" ? (artistAudios?.data || []).map(mapTrack)
    : viewMode === "album" ? (albumAudios?.data || []).map(mapTrack)
    : allAudios;

  const featuredAudios = allAudios.filter(a => a.featured);
  const trendingAudios = allAudios.filter(a => a.trending);
  const { data: relatedData } = useGetRelatedAudios(currentTrack?.id || "", 8);
  const relatedTracks: AudioTrack[] = relatedData?.data || [];
  const likeMutation = usePublicLikeAudio();
  const shareMutation = usePublicShareAudio();

  useEffect(() => { if (allAudios.length > 0 && !currentTrack) setQueue(allAudios); }, [allAudios]);

  const getAudioUrl = useCallback((track: AudioTrack) => {
    let url = track.audioUrl;
    if (track.audioQualities?.length) {
      const high = track.audioQualities.find(q => q.quality === "high");
      const medium = track.audioQualities.find(q => q.quality === "medium");
      url = high?.url || medium?.url || track.audioQualities[0]?.url || track.audioUrl;
    }
    // Return URL as-is if it's already absolute (starts with http)
    if (url && url.startsWith("http")) {
      return url;
    }
    // Convert relative URLs to absolute URLs
    return url ? getImageUrl(url) : "";
  }, []);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;
    if (audio.src !== getAudioUrl(currentTrack)) {
      audio.src = getAudioUrl(currentTrack);
      audio.load();
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentTrack, getAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => handleNext();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("loadedmetadata", onMeta); audio.removeEventListener("ended", onEnd); audio.removeEventListener("play", onPlay); audio.removeEventListener("pause", onPause); };
  }, [queue]);

  const handlePlayTrack = (track: AudioTrack, trackList?: AudioTrack[]) => { 
    setCurrentTrack(track); 
    const list = trackList || filteredAudios;
    const idx = list.findIndex((a) => a.id === track.id); 
    setQueue(list.slice(idx)); 
  };
  
  const handleNext = useCallback(() => { if (!currentTrack || queue.length === 0) return; const idx = queue.findIndex((t) => t.id === currentTrack.id); setCurrentTrack(idx < queue.length - 1 ? queue[idx + 1] : queue[0]); }, [currentTrack, queue]);
  const handlePrev = () => { if (!currentTrack || queue.length === 0) return; const idx = queue.findIndex((t) => t.id === currentTrack.id); setCurrentTrack(idx > 0 ? queue[idx - 1] : queue[queue.length - 1]); };
  const togglePlay = () => { if (!audioRef.current) return; if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {}); };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => { const t = Number(e.target.value); if (audioRef.current) audioRef.current.currentTime = t; setCurrentTime(t); };
  const handleVolume = (v: number) => { if (audioRef.current) { audioRef.current.volume = v; audioRef.current.muted = v === 0; } setVolume(v); setIsMuted(v === 0); };
  const toggleMute = () => { if (!audioRef.current) return; if (isMuted) { audioRef.current.muted = false; setIsMuted(false); if (volume === 0) handleVolume(0.8); } else { audioRef.current.muted = true; setIsMuted(true); } };
  const handleLike = async (track: AudioTrack) => { try { await likeMutation.mutateAsync(track.id); setLiked(prev => { const n = new Set(prev); if (n.has(track.id)) n.delete(track.id); else n.add(track.id); return n; }); } catch {} };
  const handleShare = async (track: AudioTrack) => { try { await shareMutation.mutateAsync(track.id); if (navigator.share) await navigator.share({ title: track.title, text: `Listen to ${track.title}`, url: window.location.href }); else await navigator.clipboard.writeText(window.location.href); } catch {} };
   const handleDownload = (track: AudioTrack) => { downloadFile(getAudioUrl(track), `${track.title} - ${track.artist}.mp3`); };
   const handleSave = (track: AudioTrack) => { setSaved(prev => { const n = new Set(prev); if (n.has(track.id)) n.delete(track.id); else n.add(track.id); return n; }); };

   // Drag and Drop handlers for queue reordering
   const handleDragStart = (index: number) => {
     setDraggedIndex(index);
   };

   const handleDragOver = (e: React.DragEvent, index: number) => {
     e.preventDefault();
     setDragOverIndex(index);
   };

   const handleDragLeave = () => {
     setDragOverIndex(null);
   };

   const handleDrop = (e: React.DragEvent, dropIndex: number) => {
     e.preventDefault();
     if (draggedIndex === null || draggedIndex === dropIndex) {
       setDraggedIndex(null);
       setDragOverIndex(null);
       return;
     }
     const newQueue = [...queue];
     const [draggedItem] = newQueue.splice(draggedIndex, 1);
     newQueue.splice(dropIndex, 0, draggedItem);
     setQueue(newQueue);
     setDraggedIndex(null);
     setDragOverIndex(null);
   };

   const handleRemoveFromQueue = (index: number) => {
     const newQueue = queue.filter((_, i) => i !== index);
     setQueue(newQueue);
     if (newQueue.length > 0 && index === queue.findIndex(t => t.id === currentTrack?.id)) {
       setCurrentTrack(newQueue[Math.min(index, newQueue.length - 1)]);
     }
   };

   const handleViewArtist = (artist: string) => { setViewMode("artist"); setSelectedFilter(artist); };
  const handleViewAlbum = (album: string) => { setViewMode("album"); setSelectedFilter(album); };
  const handleBackToHome = () => { setViewMode("home"); setSelectedFilter(""); };

  const fmtTime = (s: number) => { if (!s || !isFinite(s)) return "0:00"; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; };
  const fmtViews = (v: number) => { if (!v) return "0"; if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return v.toString(); };

  const isLoading = loadingAll;

  const getGradient = (index: number) => {
    const gradients = [
      "from-rose-600 to-pink-900",
      "from-violet-600 to-purple-900",
      "from-blue-600 to-indigo-900",
      "from-emerald-600 to-teal-900",
      "from-amber-600 to-orange-900",
      "from-cyan-600 to-blue-900",
      "from-fuchsia-600 to-pink-900",
      "from-lime-600 to-green-900"
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader activeTab="home" setActiveTab={() => {}} onSignIn={() => setLocation("/login")} onNavigate={(path) => setLocation(path)} />
      <audio ref={audioRef} preload="metadata" />
      <div className="pt-16" />

      {/* Fullscreen Player */}
      {isFullscreen && currentTrack && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-900 to-black flex flex-col">
          <div className="absolute inset-0 overflow-hidden"><img src={getImageUrl(currentTrack.coverImage || currentTrack.thumbnail || "")} alt="" className="w-full h-full object-cover blur-[100px] opacity-30 scale-110" /></div>
          
          {/* Queue Panel Overlay */}
          {showQueue && (
            <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm flex justify-end">
              <div className="w-full max-w-md bg-zinc-900 h-full overflow-y-auto border-l border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Queue</h3>
                  <button onClick={() => setShowQueue(false)} className="p-2 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-2">
                  {queue.map((track, index) => (
                    <div
                      key={`${track.id}-${index}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-move transition ${
                        draggedIndex === index ? "opacity-50 bg-white/10" : ""
                      } ${dragOverIndex === index ? "bg-white/20" : "hover:bg-white/5"} ${
                        currentTrack?.id === track.id ? "bg-red-500/20" : ""
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                        {track.thumbnail ? (
                          <img src={getImageUrl(track.thumbnail)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-zinc-500" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => setCurrentTrack(track)}>
                        <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? "text-red-400" : "text-white"}`}>{track.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                      </div>
                      <span className="text-xs text-zinc-500">{track.duration ? fmtTime(track.duration) : ""}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveFromQueue(index); }} className="p-1 text-zinc-500 hover:text-red-400">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {queue.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">
                      <ListMusic className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Queue is empty</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
            <button onClick={() => setIsFullscreen(false)} className="absolute top-6 left-6 p-3 text-white hover:text-white bg-white/20 rounded-full backdrop-blur-sm"><X className="w-6 h-6" /></button>
            <button onClick={() => setShowQueue(!showQueue)} className="absolute top-6 right-6 p-3 text-white hover:text-white bg-white/20 rounded-full backdrop-blur-sm">
              <ListMusic className="w-6 h-6" />
              {queue.length > 0 && <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">{queue.length}</span>}
            </button>
            <div className={`w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 mb-8 ${isPlaying ? "animate-spin-slow" : ""}`}>
              {currentTrack.coverImage || currentTrack.thumbnail ? <img src={getImageUrl(currentTrack.coverImage || currentTrack.thumbnail || "")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-red-900 to-black flex items-center justify-center"><Music className="w-20 h-20 text-red-500/50" /></div>}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-1">{currentTrack.title}</h2>
            <p className="text-white/60 text-center mb-1">{currentTrack.artist}</p>
            {currentTrack.album && <p className="text-white/40 text-sm text-center mb-8">{currentTrack.album}</p>}
            <div className="w-full max-w-lg mb-6">
              <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg" />
              <div className="flex justify-between text-sm text-white/50 mt-2"><span>{fmtTime(currentTime)}</span><span>{fmtTime(duration)}</span></div>
            </div>
            <div className="flex items-center gap-8">
              <button onClick={handlePrev} className="text-white hover:text-white transition"><SkipBack className="w-8 h-8" /></button>
              <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-white hover:scale-105 flex items-center justify-center shadow-xl transition-transform">{isPlaying ? <Pause className="w-10 h-10 text-black" /> : <Play className="w-10 h-10 text-black ml-1" />}</button>
              <button onClick={handleNext} className="text-white hover:text-white transition"><SkipForward className="w-8 h-8" /></button>
            </div>
            <div className="flex items-center gap-4 mt-8">
              <button onClick={toggleMute} className="text-white hover:text-white">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
              <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => handleVolume(Number(e.target.value))} className="w-28 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white" />
            </div>
          </div>
        </div>
      )}

      {/* Mini Player */}
      {currentTrack && !isFullscreen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10">
          <div className="h-1 bg-white/10"><div className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} /></div>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer shadow-lg" onClick={() => setIsFullscreen(true)}>
              {currentTrack.thumbnail || currentTrack.coverImage ? <img src={getImageUrl(currentTrack.thumbnail || currentTrack.coverImage || "")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music className="w-6 h-6 text-zinc-400" /></div>}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsFullscreen(true)}>
              <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleLike(currentTrack)} className={`p-2 rounded-full transition ${liked.has(currentTrack.id) ? "text-red-500" : "text-white/70 hover:text-white"}`}><Heart className={`w-5 h-5 ${liked.has(currentTrack.id) ? "fill-current" : ""}`} /></button>
              <button onClick={handlePrev} className="p-2 text-white/70 hover:text-white transition"><SkipBack className="w-5 h-5" /></button>
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:scale-105 transition shadow-lg">{isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}</button>
              <button onClick={handleNext} className="p-2 text-white/70 hover:text-white transition"><SkipForward className="w-5 h-5" /></button>
              <button onClick={() => setIsFullscreen(true)} className="p-2 text-white/70 hover:text-white transition ml-2"><Maximize2 className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Home View */}
        {viewMode === "home" && (
          <>
            {/* Dynamic Banner Carousel */}
            {banners.length > 0 ? (
              <div className="relative rounded-3xl overflow-hidden mb-10">
                <div className="relative aspect-[21/9] sm:aspect-[3/1]">
                  {banners.map((banner, idx) => (
                    <div
                      key={banner.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${idx === 0 ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <img
                        src={getImageUrl(banner.imageUrl)}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      <div className="absolute inset-0 flex items-center">
                        <div className="px-8 py-12 sm:py-16 sm:px-12 max-w-2xl">
                          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3">{banner.title}</h1>
                          {banner.subtitle && <p className="text-lg sm:text-xl text-white/80 mb-2">{banner.subtitle}</p>}
                          {banner.description && <p className="text-sm sm:text-base text-white/60 mb-6 line-clamp-2">{banner.description}</p>}
                          <button
                            onClick={() => {
                              if (banner.content) {
                                handlePlayTrack(banner.content);
                              }
                            }}
                            className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:scale-105 transition-transform flex items-center gap-2"
                          >
                            <Play className="w-5 h-5" /> {banner.ctaText || 'Listen Now'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Banner indicators */}
                {banners.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {banners.map((_, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white' : 'bg-white/40'}`} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Hero Section (fallback) */
              <div className="relative rounded-3xl overflow-hidden mb-10 bg-gradient-to-r from-red-900 via-rose-900 to-pink-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200')] bg-cover bg-center opacity-20" />
                <div className="relative z-10 px-8 py-12 sm:py-16 sm:px-12">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4">Music</h1>
                  <p className="text-lg sm:text-xl text-white/70 max-w-xl mb-6">Discover devotional songs, bhajans, and spiritual music. Your soul's companion for peace and devotion.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setViewMode("browse")} className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:scale-105 transition-transform flex items-center gap-2"><Play className="w-5 h-5" /> Start Listening</button>
                    <button className="px-6 py-3 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 backdrop-blur-sm transition">Browse All</button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Access - Artists */}
            {artists.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6 text-red-500" /> Popular Artists</h2>
                  <button onClick={() => setViewMode("browse")} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">See All <ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {artists.slice(0, 8).map((artist, idx) => (
                    <button key={artist} onClick={() => handleViewArtist(artist)} className="group flex flex-col items-center gap-3">
                      <div className={`w-full aspect-square rounded-full bg-gradient-to-br ${getGradient(idx)} flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg`}>
                        <span className="text-2xl font-bold text-white/90">{artist.charAt(0)}</span>
                      </div>
                      <span className="text-xs text-zinc-400 group-hover:text-white text-center truncate w-full">{artist}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Access - Albums */}
            {albums.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Disc3 className="w-6 h-6 text-red-500" /> Albums</h2>
                  <button onClick={() => setViewMode("browse")} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">See All <ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {albums.slice(0, 6).map((album, idx) => (
                    <button key={album} onClick={() => handleViewAlbum(album)} className="group flex flex-col items-center gap-3">
                      <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${getGradient(idx + 3)} flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg overflow-hidden`}>
                        <Disc3 className="w-12 h-12 text-white/50 group-hover:animate-spin" style={{ animationDuration: "3s" }} />
                      </div>
                      <span className="text-sm text-zinc-400 group-hover:text-white text-center truncate w-full font-medium">{album}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Trending Now */}
            {trendingAudios.length > 0 && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-red-500" /> Trending Now</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {trendingAudios.slice(0, 6).map((audio) => (
                    <div key={audio.id} className="group bg-zinc-900/50 rounded-xl p-3 hover:bg-zinc-800/80 transition cursor-pointer" onClick={() => handlePlayTrack(audio, trendingAudios)}>
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-zinc-800">
                        {audio.coverImage || audio.thumbnail ? <img src={getImageUrl(audio.coverImage || audio.thumbnail || "")} alt={audio.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-zinc-600" /></div>}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl"><Play className="w-6 h-6 text-white ml-0.5" /></div></div>
                        {audio.isExclusive && <span className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full"><Sparkles className="w-3 h-3 inline" /></span>}
                      </div>
                       <p className="text-sm font-semibold text-white truncate">{audio.title}</p>
                       <p className="text-xs text-zinc-300 truncate">{audio.artist}</p>
                     </div>
                   ))}
                 </div>
               </section>
            )}

            {/* Featured */}
            {featuredAudios.length > 0 && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-2"><Star className="w-6 h-6 text-amber-500" /> Featured</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredAudios.slice(0, 6).map((audio, idx) => (
                    <div key={audio.id} className={`group relative rounded-2xl overflow-hidden bg-gradient-to-br ${getGradient(idx)} p-5 cursor-pointer hover:scale-[1.02] transition-transform`} onClick={() => handlePlayTrack(audio, featuredAudios)}>
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="relative z-10 flex items-end gap-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                          {audio.thumbnail ? <img src={getImageUrl(audio.thumbnail)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/20 flex items-center justify-center"><Music className="w-8 h-8 text-white/70" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold text-white truncate">{audio.title}</p>
                          <p className="text-sm text-white/90 truncate">{audio.artist}</p>
                          <p className="text-xs text-white/70 mt-1">{fmtViews(audio.views || 0)} views</p>
                        </div>
                        <button className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-5 h-5 text-black ml-0.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All Songs List */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Music className="w-6 h-6 text-red-500" /> All Songs</h2>
                <button onClick={() => setViewMode("browse")} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></button>
              </div>
               <div className="bg-zinc-900/30 rounded-2xl overflow-hidden">
                {allAudios.slice(0, 10).map((audio, idx) => (
                  <div key={audio.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition cursor-pointer group" onClick={() => handlePlayTrack(audio)}>
                    <span className="w-6 text-center text-sm text-zinc-400 group-hover:hidden">{idx + 1}</span>
                    <PlayCircle className="w-5 h-5 text-white hidden group-hover:block" />
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                      {audio.thumbnail ? <img src={getImageUrl(audio.thumbnail)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music className="w-5 h-5 text-zinc-400" /></div>}
                    </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium text-white truncate">{audio.title}</p>
                       <p className="text-xs text-zinc-300 truncate">{audio.artist}{audio.album ? ` • ${audio.album}` : ""}</p>
                     </div>
                     <div className="flex items-center gap-3">
                       {audio.trending && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">HOT</span>}
                       <span className="text-xs text-zinc-300">{audio.duration ? fmtTime(audio.duration) : ""}</span>
                       <button onClick={(e) => { e.stopPropagation(); handleLike(audio); }} className={`p-1.5 rounded-full transition ${liked.has(audio.id) ? "text-red-500" : "text-white/70 hover:text-red-500"}`}><Heart className={`w-4 h-4 ${liked.has(audio.id) ? "fill-current" : ""}`} /></button>
                     </div>
                   </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Browse View */}
        {(viewMode === "browse" || viewMode === "artist" || viewMode === "album") && (
          <>
            {/* Back Button */}
            {viewMode !== "browse" && (
              <button onClick={handleBackToHome} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition"><ArrowLeft className="w-5 h-5" /> Back</button>
            )}

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                {viewMode === "artist" && `Songs by ${selectedFilter}`}
                {viewMode === "album" && selectedFilter}
                {viewMode === "browse" && "Browse Music"}
              </h1>
              <p className="text-zinc-500">{filteredAudios.length} songs</p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input placeholder="Search songs, artists, albums..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-500 rounded-xl" />
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none">
                <option value="">All Genres</option>
                {genres.map((g: any) => (<option key={g.id || g._id} value={g.id || g._id}>{g.name}</option>))}
              </select>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none">
                <option value="">All Categories</option>
                {categories.map((c: any) => (<option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>))}
              </select>
              <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none">
                <option value="">All Languages</option>
                {languages.map((l: any) => (<option key={l.id || l._id} value={l.id || l._id}>{l.name}</option>))}
              </select>
            </div>

            {/* Songs Grid */}
            {isLoading ? (
              <div className="flex justify-center py-16"><div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredAudios.length === 0 ? (
              <div className="text-center py-16"><Music className="w-16 h-16 mx-auto text-zinc-800 mb-4" /><h3 className="text-xl font-medium text-zinc-500">No songs found</h3></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAudios.map((audio) => (
                  <div key={audio.id} className="group bg-zinc-900/50 rounded-xl p-3 hover:bg-zinc-800/80 transition cursor-pointer" onClick={() => handlePlayTrack(audio)}>
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-zinc-800">
                      {audio.coverImage || audio.thumbnail ? <img src={getImageUrl(audio.coverImage || audio.thumbnail || "")} alt={audio.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-zinc-600" /></div>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl"><Play className="w-6 h-6 text-white ml-0.5" /></div></div>
                      {audio.isExclusive && <span className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full"><Sparkles className="w-3 h-3 inline" /></span>}
                    </div>
                     <p className="text-sm font-semibold text-white truncate">{audio.title}</p>
                     <p className="text-xs text-zinc-300 truncate cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); handleViewArtist(audio.artist); }}>{audio.artist}</p>
                     {audio.album && <p className="text-xs text-zinc-400 truncate cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); handleViewAlbum(audio.album!); }}>{audio.album}</p>}
                     <div className="flex items-center gap-2 mt-2">
                       <button onClick={(e) => { e.stopPropagation(); handleLike(audio); }} className={`p-1 rounded-full transition ${liked.has(audio.id) ? "text-red-500" : "text-white/70 hover:text-red-500"}`}><Heart className={`w-4 h-4 ${liked.has(audio.id) ? "fill-current" : ""}`} /></button>
                       <button onClick={(e) => { e.stopPropagation(); handleDownload(audio); }} className="p-1 text-white/70 hover:text-white rounded-full"><Download className="w-4 h-4" /></button>
                       <button onClick={(e) => { e.stopPropagation(); handleSave(audio); }} className={`p-1 rounded-full ml-auto ${saved.has(audio.id) ? "text-green-500" : "text-white/70 hover:text-green-500"}`}>{saved.has(audio.id) ? <Check className="w-4 h-4" /> : <ListMusic className="w-4 h-4" />}</button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Related Tracks */}
        {currentTrack && relatedTracks.length > 0 && viewMode === "home" && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-red-500" /> You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {relatedTracks.map((audio) => (
                <div key={audio.id} className="group bg-zinc-900/50 rounded-xl p-3 hover:bg-zinc-800/80 transition cursor-pointer" onClick={() => handlePlayTrack(audio, relatedTracks)}>
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-zinc-800">
                    {audio.coverImage || audio.thumbnail ? <img src={getImageUrl(audio.coverImage || audio.thumbnail || "")} alt={audio.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-zinc-600" /></div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl"><Play className="w-6 h-6 text-white ml-0.5" /></div></div>
                  </div>
                   <p className="text-sm font-semibold text-white truncate">{audio.title}</p>
                   <p className="text-xs text-zinc-300 truncate cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); handleViewArtist(audio.artist); }}>{audio.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <PublicFooter />
      <style>{`@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin-slow { animation: spin-slow 8s linear infinite; }`}</style>
    </div>
  );
}
