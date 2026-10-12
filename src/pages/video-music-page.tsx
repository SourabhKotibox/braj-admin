import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import Hls from "hls.js";
import { Search, Play, Pause, Heart, TrendingUp, Star, Film, Volume2, VolumeX, SkipBack, SkipForward, Share2, Download, Sparkles, Video, Maximize2, Minimize2, Check, Users, Disc3, ArrowLeft, PlayCircle, Clock, ChevronRight, GripVertical, XCircle, ListMusic, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  useGetPublicVideoMusics, getImageUrl, useGetRelatedVideoMusics, 
  usePublicLikeVideoMusic, usePublicShareVideoMusic, downloadFile,
  useGetPublicVideoMusicArtists, useGetPublicVideoMusicAlbums,
  useGetPublicVideoMusicByArtist, useGetPublicVideoMusicByAlbum,
  useGetGenres, useGetCategoriesList, useGetLanguagesList,
  useGetPublicBanners
} from "@/lib/api-client";
import { PublicHeader, PublicFooter } from "./streaming-home";
import { getVideoPlaybackUrls, isHlsUrl, toAbsoluteMediaUrl } from "@/lib/video-playback";

interface VideoTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  description?: string;
  thumbnail?: string;
  coverImage?: string;
  videoUrl: string;
  originalVideoUrl?: string;
  playbackUrls?: string[];
  hlsUrl?: string;
  videoQualities?: Array<{ quality: string; url: string; size: number; }>;
  duration?: number;
  views?: number;
  likes?: number;
  featured?: boolean;
  trending?: boolean;
  isExclusive?: boolean;
}

type ViewMode = "home" | "browse" | "artist" | "album";

export default function VideoMusicPage() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [search, setSearch] = useState("");
  const [currentTrack, setCurrentTrack] = useState<VideoTrack | null>(null);
  const [queue, setQueue] = useState<VideoTrack[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "trending" | "featured" | "exclusive">("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
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
  const [playbackUrlIndex, setPlaybackUrlIndex] = useState(0);
    const { data: bannersRes } = useGetPublicBanners({ page: "videos", limit: "10" });
    const banners = bannersRes?.data || [];
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [fadingBanner, setFadingBanner] = useState(false);

  const goBanner = useCallback((index: number) => {
    if (index === currentBannerIndex || banners.length === 0) return;
    setFadingBanner(true);
    setTimeout(() => { setCurrentBannerIndex(index); setFadingBanner(false); }, 400);
  }, [currentBannerIndex, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => goBanner((currentBannerIndex + 1) % banners.length), 6000);
    return () => clearInterval(timer);
  }, [currentBannerIndex, banners.length, goBanner]);

    const { data: allVideosData, isLoading: loadingAll } = useGetPublicVideoMusics({ 
     search, ...(selectedGenre && { genre: selectedGenre }),
     ...(selectedCategory && { category: selectedCategory }),
     ...(selectedLanguage && { language: selectedLanguage })
   }, viewMode === "browse" || viewMode === "home");
   
   const { data: artistsData } = useGetPublicVideoMusicArtists();
   const { data: albumsData } = useGetPublicVideoMusicAlbums();
   const { data: artistVideos } = useGetPublicVideoMusicByArtist(selectedFilter, { status: "published" }, viewMode === "artist" && !!selectedFilter);
   const { data: albumVideos } = useGetPublicVideoMusicByAlbum(selectedFilter, { status: "published" }, viewMode === "album" && !!selectedFilter);
   const { data: genresData } = useGetGenres({ limit: 100 });
   const { data: categoriesData } = useGetCategoriesList({ limit: 100 });
   const { data: languagesData } = useGetLanguagesList();

  const mapVideo = (v: any): VideoTrack => ({
    ...v,
    id: v.id || v._id,
    originalVideoUrl: v.originalVideoUrl || v.videoUrl,
    playbackUrls: v.playbackUrls,
    videoUrl: v.videoUrl || v.originalVideoUrl || v.videoQualities?.[0]?.url || v.hlsUrl || "",
  });
  const rawVideos = allVideosData?.data || [];
  const allVideos: VideoTrack[] = useMemo(() => rawVideos.map(mapVideo), [rawVideos]);
  const artists: string[] = artistsData?.data || [];
  const albums: string[] = albumsData?.data || [];
  const genres = genresData?.data || [];
  const categories = categoriesData?.data || [];
  const languages = languagesData?.data || [];
  
  const filteredVideos = viewMode === "artist" ? (artistVideos?.data || []).map(mapVideo)
    : viewMode === "album" ? (albumVideos?.data || []).map(mapVideo)
    : allVideos.filter((v) => { 
        if (activeTab === "trending") return v.trending; 
        if (activeTab === "featured") return v.featured; 
        if (activeTab === "exclusive") return v.isExclusive;
        return true; 
      });

  const trendingVideos = allVideos.filter(v => v.trending);
  const featuredVideos = allVideos.filter(v => v.featured);
  const { data: relatedData } = useGetRelatedVideoMusics(currentTrack?.id || "", 12);
  const relatedVideos: VideoTrack[] = relatedData?.data || [];
  const likeMutation = usePublicLikeVideoMusic();
  const shareMutation = usePublicShareVideoMusic();

  useEffect(() => { if (allVideos.length > 0 && !currentTrack) setQueue(allVideos); }, [allVideos]);

  const getPlaybackCandidates = useCallback((track: VideoTrack) => {
    return getVideoPlaybackUrls(track).map((url) => toAbsoluteMediaUrl(url, getImageUrl));
  }, []);

  const getVideoUrl = useCallback((track: VideoTrack, index = 0) => {
    const candidates = getPlaybackCandidates(track);
    return candidates[index] || candidates[0] || "";
  }, [getPlaybackCandidates]);

  useEffect(() => {
    setPlaybackUrlIndex(0);
  }, [currentTrack?.id]);

  const loadVideoSource = useCallback((url: string, autoplay = true) => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const startPlayback = () => {
      if (!autoplay) return;
      video.play().then(() => setIsPlaying(true)).catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    };

    if (isHlsUrl(url) && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, startPlayback);
    } else {
      video.src = url;
      video.load();
      startPlayback();
    }
  }, []);

  useEffect(() => {
    if (!currentTrack || !videoRef.current) return;
    const url = getVideoUrl(currentTrack, playbackUrlIndex);
    if (!url) return;
    loadVideoSource(url);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentTrack, playbackUrlIndex, getVideoUrl, loadVideoSource]);

  const filteredVideosForDisplay = allVideos.filter((v) => { if (activeTab === "trending") return v.trending; if (activeTab === "featured") return v.featured; if (activeTab === "exclusive") return v.isExclusive; return true; });
  const handlePlay = (track: VideoTrack, trackList?: VideoTrack[]) => { setCurrentTrack(track); setPlaybackUrlIndex(0); const list = trackList || filteredVideosForDisplay; const idx = list.findIndex((v) => v.id === track.id); setQueue(list.slice(idx)); };
  const handleNext = useCallback(() => { if (!currentTrack || queue.length === 0) return; const idx = queue.findIndex((t) => t.id === currentTrack.id); setCurrentTrack(idx < queue.length - 1 ? queue[idx + 1] : queue[0]); }, [currentTrack, queue]);

  const tryNextPlaybackUrl = useCallback(() => {
    if (!currentTrack) return false;
    const candidates = getPlaybackCandidates(currentTrack);
    if (playbackUrlIndex >= candidates.length - 1) return false;
    setPlaybackUrlIndex((i) => i + 1);
    return true;
  }, [currentTrack, playbackUrlIndex, getPlaybackCandidates]);


  const handlePrev = () => { if (!currentTrack || queue.length === 0) return; const idx = queue.findIndex((t) => t.id === currentTrack.id); setCurrentTrack(idx > 0 ? queue[idx - 1] : queue[queue.length - 1]); };
  const togglePlay = () => { if (!videoRef.current) return; if (isPlaying) videoRef.current.pause(); else videoRef.current.play().catch(() => {}); };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => { const t = Number(e.target.value); if (videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t); };
  const handleVolume = (v: number) => { if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; } setVolume(v); setIsMuted(v === 0); };
  const toggleMute = () => { if (!videoRef.current) return; if (isMuted) { videoRef.current.muted = false; setIsMuted(false); if (volume === 0) handleVolume(1); } else { videoRef.current.muted = true; setIsMuted(true); } };
  const toggleFullscreen = async () => { 
    if (!isFullscreen) { 
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch (e) {}
      } 
      else if ((videoRef.current as any)?.webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen(); 
      } 
    } else { 
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
      } 
      else if ((videoRef.current as any)?.webkitExitFullscreen) {
        (videoRef.current as any).webkitExitFullscreen(); 
      } 
    } 
    setIsFullscreen(!isFullscreen); 
  };
  const handleLike = async (track: VideoTrack) => { try { await likeMutation.mutateAsync(track.id); setLiked(prev => { const n = new Set(prev); if (n.has(track.id)) n.delete(track.id); else n.add(track.id); return n; }); } catch {} };
  const handleShare = async (track: VideoTrack) => { try { await shareMutation.mutateAsync(track.id); if (navigator.share) await navigator.share({ title: track.title, text: `Watch ${track.title}`, url: window.location.href }); else await navigator.clipboard.writeText(window.location.href); } catch {} };
   const handleDownload = (track: VideoTrack) => { downloadFile(getVideoUrl(track), `${track.title} - ${track.artist}.mp4`); };
   const handleSave = (track: VideoTrack) => { setSaved(prev => { const n = new Set(prev); if (n.has(track.id)) n.delete(track.id); else n.add(track.id); return n; }); };

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

  const fmtTime = (s: number) => { if (!s || !isFinite(s)) return "0:00"; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60); return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}` : `${m}:${sec.toString().padStart(2, "0")}`; };
  const fmtViews = (v: number) => { if (!v) return "0"; if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`; return v.toString(); };

  const isLoading = loadingAll;
  const getGradient = (index: number) => {
    const gradients = [
      "from-rose-600 to-pink-900", "from-violet-600 to-purple-900",
      "from-blue-600 to-indigo-900", "from-emerald-600 to-teal-900",
      "from-amber-600 to-orange-900", "from-cyan-600 to-blue-900"
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader activeTab="home" setActiveTab={() => {}} onSignIn={() => setLocation("/login")} onNavigate={(path) => setLocation(path)} />
      <div className="pt-16" />

      {/* Dynamic Banner Carousel (Hero) */}
      {viewMode === "home" && !currentTrack && banners.length > 0 && (
        <div className="relative w-full overflow-hidden bg-[#030306] mt-[60px] lg:mt-[68px]" style={{ height: "70vh", minHeight: 480 }}>
          {banners.map((banner, idx) => {
            const isCurrent = idx === currentBannerIndex;
            return (
              <div key={banner.id} className={`absolute inset-0 transition-opacity duration-700 ${fadingBanner || !isCurrent ? 'opacity-0' : 'opacity-100 z-10'}`}>
                {/* Backdrop */}
                <div className="absolute inset-0">
                  <img
                    src={getImageUrl(banner.imageUrl)}
                    alt={banner.title}
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                {/* Gradients */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#030306] via-[#030306]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#030306] to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-[20%] bg-gradient-to-b from-[#030306]/30 to-transparent" />
                <div className="absolute inset-0 bg-[#030306]/5" />

                {/* Content */}
                <div className="absolute bottom-14 sm:bottom-16 left-0 px-6 sm:px-10 lg:px-14 max-w-3xl w-full">
                  <div className={`transition-all duration-700 ${fadingBanner || !isCurrent ? "translate-y-4" : "translate-y-0"}`}>
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-2xl">{banner.title}</h1>
                    {banner.subtitle && <p className="text-xl sm:text-2xl text-white/90 font-medium mb-3 drop-shadow-lg">{banner.subtitle}</p>}
                    {banner.description && <p className="text-base sm:text-lg text-white/70 max-w-2xl mb-8 line-clamp-3 leading-relaxed drop-shadow-md">{banner.description}</p>}
                    
                    <button
                      onClick={() => {
                        if (banner.content) handlePlay(banner.content);
                      }}
                      className="px-8 py-3.5 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-current" /> {banner.ctaText || 'Watch Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Banner indicators */}
          {banners.length > 1 && (
            <div className="absolute bottom-6 right-6 sm:right-10 flex gap-2 z-20">
              {banners.map((_, idx) => (
                <div key={idx} className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentBannerIndex ? 'bg-white w-6' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fallback Hero */}
      {viewMode === "home" && !currentTrack && banners.length === 0 && (
        <div className="relative w-full overflow-hidden bg-[#030306] mt-[60px] lg:mt-[68px]" style={{ height: "50vh", minHeight: 320 }}>
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900 via-purple-900 to-fuchsia-900">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200')] bg-cover bg-center opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
            <div className="relative z-10 px-8 py-16 sm:py-24 sm:px-12 flex flex-col justify-end h-full max-w-7xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 drop-shadow-xl">Music Videos</h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-xl mb-8">Watch devotional videos, bhajans, and spiritual music performances.</p>
              <div className="flex gap-3">
                <button onClick={() => setViewMode("browse")} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2"><Play className="w-5 h-5 fill-current" /> Browse Videos</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Home View */}
        {viewMode === "home" && !currentTrack && (
          <>

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

            {/* Albums */}
            {albums.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Disc3 className="w-6 h-6 text-red-500" /> Albums</h2>
                  <button onClick={() => setViewMode("browse")} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">See All <ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {albums.slice(0, 6).map((album, idx) => (
                    <button key={album} onClick={() => handleViewAlbum(album)} className="group flex flex-col items-center gap-3">
                      <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${getGradient(idx + 3)} flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg`}>
                        <Disc3 className="w-12 h-12 text-white/50" />
                      </div>
                      <span className="text-sm text-zinc-400 group-hover:text-white text-center truncate w-full font-medium">{album}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Trending Videos */}
            {trendingVideos.length > 0 && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-red-500" /> Trending Videos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {trendingVideos.slice(0, 4).map((video) => (
                    <div key={video.id} className="group bg-zinc-900/50 rounded-xl overflow-hidden hover:bg-zinc-800/80 transition cursor-pointer" onClick={() => handlePlay(video, trendingVideos)}>
                      <div className="relative aspect-video bg-zinc-800">
                        {video.thumbnail || video.coverImage ? <img src={getImageUrl(video.thumbnail || video.coverImage || "")} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-12 h-12 text-zinc-600" /></div>}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl"><Play className="w-7 h-7 text-white ml-1" /></div></div>
                        {video.duration && <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">{fmtTime(video.duration)}</span>}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-white truncate">{video.title}</p>
                        <p className="text-xs text-zinc-300 truncate">{video.artist} • {fmtViews(video.views || 0)} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All Videos */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 flex-shrink-0"><Video className="w-6 h-6 text-red-500" /> All Videos</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-none">
                  {["all", "trending", "featured", "exclusive"].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${activeTab === tab ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVideosForDisplay.slice(0, 12).map((video) => (
                  <div key={video.id} className="group bg-zinc-900/50 rounded-xl overflow-hidden hover:bg-zinc-800/80 transition cursor-pointer" onClick={() => handlePlay(video)}>
                    <div className="relative aspect-video bg-zinc-800">
                      {video.thumbnail || video.coverImage ? <img src={getImageUrl(video.thumbnail || video.coverImage || "")} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-12 h-12 text-zinc-600" /></div>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl"><Play className="w-7 h-7 text-white ml-1" /></div></div>
                      {video.duration && <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">{fmtTime(video.duration)}</span>}
                      {video.trending && <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">HOT</span>}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-white truncate">{video.title}</p>
                      <p className="text-xs text-zinc-300 truncate cursor-pointer hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleViewArtist(video.artist); }}>{video.artist} • {fmtViews(video.views || 0)} views</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Browse View */}
        {(viewMode === "browse" || viewMode === "artist" || viewMode === "album") && !currentTrack && (
          <>
            <button onClick={handleBackToHome} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition font-medium"><ArrowLeft className="w-5 h-5" /> Back</button>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                {viewMode === "artist" && `Videos by ${selectedFilter}`}
                {viewMode === "album" && selectedFilter}
                {viewMode === "browse" && "Browse Videos"}
              </h1>
              <p className="text-zinc-400">{filteredVideos.length} videos</p>
            </div>
            <div className="relative max-w-xl mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input placeholder="Search videos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-500 rounded-xl" />
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none"><option value="">All Genres</option>{genres.map((g: any) => (<option key={g.id || g._id} value={g.id || g._id}>{g.name}</option>))}</select>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none"><option value="">All Categories</option>{categories.map((c: any) => (<option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>))}</select>
              <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none"><option value="">All Languages</option>{languages.map((l: any) => (<option key={l.id || l._id} value={l.id || l._id}>{l.name}</option>))}</select>
            </div>
            {isLoading ? (<div className="flex justify-center py-16"><div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>) : filteredVideos.length === 0 ? (<div className="text-center py-16"><Video className="w-16 h-16 mx-auto text-zinc-800 mb-4" /><h3 className="text-xl font-medium text-zinc-400">No videos found</h3></div>) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="group bg-zinc-900/50 rounded-xl overflow-hidden hover:bg-zinc-800/80 transition cursor-pointer" onClick={() => handlePlay(video)}>
                    <div className="relative aspect-video bg-zinc-800">
                      {video.thumbnail || video.coverImage ? <img src={getImageUrl(video.thumbnail || video.coverImage || "")} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-12 h-12 text-zinc-600" /></div>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl"><Play className="w-7 h-7 text-white ml-1" /></div></div>
                      {video.duration && <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">{fmtTime(video.duration)}</span>}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-white truncate">{video.title}</p>
                      <p className="text-xs text-zinc-300 truncate cursor-pointer hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleViewArtist(video.artist); }}>{video.artist} • {fmtViews(video.views || 0)} views</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Video Player View */}
        {currentTrack && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <button 
                onClick={() => setCurrentTrack(null)} 
                className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition font-medium"
              >
                <ArrowLeft className="w-5 h-5" /> Back to Videos
              </button>
              <div ref={containerRef} className={`bg-[#050505] flex flex-col w-full ${isFullscreen ? 'h-full justify-between' : 'rounded-2xl overflow-hidden shadow-2xl'}`}>
                <div className={`relative w-full bg-black flex flex-col justify-center ${isFullscreen ? 'flex-1 min-h-0' : 'aspect-video'}`}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain bg-black"
                    playsInline
                    preload="metadata"
                    muted={isMuted}
                    poster={currentTrack.thumbnail || currentTrack.coverImage ? getImageUrl(currentTrack.thumbnail || currentTrack.coverImage || "") : undefined}
                    onClick={togglePlay}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={(e) => {
                      const expected = currentTrack.duration || duration;
                      const played = e.currentTarget.currentTime || currentTime;
                      if (expected > 30 && played < expected * 0.85) {
                        if (tryNextPlaybackUrl()) return;
                      }
                      handleNext();
                    }}
                    onProgress={(e) => {
                      const v = e.currentTarget;
                      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
                    }}
                  />
                  {!isPlaying && (
                    <div onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
                        <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full px-4 pb-4 pt-3 bg-[#0a0a0a]">
                  <div className="mb-3"><div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const percent = (e.clientX - rect.left) / rect.width; handleSeek({ target: { value: String(percent * (duration || 100)) } } as any); }}><div className="absolute h-full bg-white/40 rounded-full" style={{ width: `${(buffered / (duration || 100)) * 100}%` }} /><div className="absolute h-full bg-red-500 rounded-full group-hover:bg-red-400 transition-colors" style={{ width: `${(currentTime / (duration || 100)) * 100}%` }} /></div></div>
                  <div className="flex items-center justify-between flex-wrap gap-y-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="text-white/80 hover:text-white"><SkipBack className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                      <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center">{isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" />}</button>
                      <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="text-white/80 hover:text-white"><SkipForward className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                      <span className="text-white/70 text-xs sm:text-sm">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white/80 hover:text-white">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
                        <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => { e.stopPropagation(); handleVolume(Number(e.target.value)); }} className="hidden sm:block w-16 sm:w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500" />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white/80 hover:text-white">{isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{currentTrack.title}</h1>
                <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
                  <span>{fmtViews(currentTrack.views || 0)} views</span>
                  <span className="cursor-pointer hover:text-red-300 text-white/90" onClick={() => handleViewArtist(currentTrack.artist)}>{currentTrack.artist}</span>
                  {currentTrack.album && <span className="cursor-pointer hover:text-red-300" onClick={() => handleViewAlbum(currentTrack.album!)}>• {currentTrack.album}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <button onClick={() => handleLike(currentTrack)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${liked.has(currentTrack.id) ? "bg-red-500/20 text-red-500" : "bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700"}`}><Heart className={`w-5 h-5 ${liked.has(currentTrack.id) ? "fill-current" : ""}`} /><span className="text-sm">{liked.has(currentTrack.id) ? "Liked" : "Like"}</span></button>
                  <button onClick={() => handleShare(currentTrack)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 rounded-full text-zinc-200 hover:bg-zinc-700 transition-colors"><Share2 className="w-5 h-5" /><span className="text-sm">Share</span></button>
                  <button onClick={() => handleDownload(currentTrack)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 rounded-full text-zinc-200 hover:bg-zinc-700 transition-colors"><Download className="w-5 h-5" /><span className="text-sm">Download</span></button>
                  <button onClick={() => handleSave(currentTrack)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${saved.has(currentTrack.id) ? "bg-green-500/20 text-green-500" : "bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700"}`}>{saved.has(currentTrack.id) ? <Check className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}<span className="text-sm">{saved.has(currentTrack.id) ? "Saved" : "Save"}</span></button>
                </div>
                <div className="bg-zinc-900/80 rounded-xl p-4"><p className="text-white font-medium mb-2">{currentTrack.artist}</p>{currentTrack.description && <p className="text-zinc-300 text-sm">{currentTrack.description}</p>}</div>
              </div>
            </div>

            <div className="lg:w-80 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Queue</h3>
                <span className="text-sm text-zinc-400">{queue.length} videos</span>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {queue.map((video, index) => (
                  <div
                    key={`${video.id}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex gap-3 group cursor-pointer p-2 rounded-lg transition ${
                      draggedIndex === index ? "opacity-50 bg-white/10" : ""
                    } ${dragOverIndex === index ? "bg-white/20" : "hover:bg-zinc-800/50"} ${
                      currentTrack?.id === video.id ? "bg-red-500/20 ring-1 ring-red-500/50" : ""
                    }`}
                    onClick={() => setCurrentTrack(video)}
                  >
                    <div className="flex items-center text-zinc-400">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="relative w-24 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-zinc-800">
                      {video.thumbnail || video.coverImage ? <img src={getImageUrl(video.thumbnail || video.coverImage || "")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-zinc-400" /></div>}
                      {video.duration && <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">{fmtTime(video.duration)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${currentTrack?.id === video.id ? "text-red-300 font-bold" : "text-zinc-100"}`}>{video.title}</p>
                      <p className="text-xs text-zinc-300 truncate">{video.artist}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveFromQueue(index); }} className="p-1 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {queue.length === 0 && (
                  <div className="text-center py-8 text-zinc-400">
                    <ListMusic className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Queue is empty</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
