import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Video, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGetPublicVideoMusics, getImageUrl } from "@/lib/api-client";
import VideoMusicPlayer from "@/components/VideoMusicPlayer";
import { PublicHeader, PublicFooter } from "./streaming-home";

export default function VideoMusicBrowsePage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const { data, isLoading } = useGetPublicVideoMusics({ search });
  const videos = (data?.data || []).map((v: any) => ({
    ...v,
    id: v.id || v._id,
    videoUrl: v.videoUrl || v.videoQualities?.[0]?.url || v.hlsUrl || "",
  }));

  const playUrl = selectedVideo
    ? (selectedVideo.videoUrl?.startsWith("http") ? selectedVideo.videoUrl : getImageUrl(selectedVideo.videoUrl || selectedVideo.hlsUrl || ""))
    : "";

  return (
    <div className="min-h-screen bg-[#030306] text-white">
      <PublicHeader activeTab="home" setActiveTab={() => {}} onSignIn={() => setLocation("/login")} onNavigate={(path) => setLocation(path)} />
      <div className="pt-20 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {selectedVideo ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <button onClick={() => setSelectedVideo(null)} className="text-white/70 hover:text-white">← Back to Video Music</button>
              <VideoMusicPlayer
                src={playUrl}
                title={selectedVideo.title}
                artist={selectedVideo.artist}
                poster={getImageUrl(selectedVideo.thumbnail || selectedVideo.coverImage || "")}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Video Music</h1>
                <button onClick={() => setLocation("/videos")} className="text-sm text-zinc-400 hover:text-white">Open video player →</button>
              </div>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search music videos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                  <h3 className="text-lg font-medium">No music videos found</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videos.map((video: any) => (
                    <div key={video.id} className="group cursor-pointer" onClick={() => setSelectedVideo(video)}>
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-2">
                        {video.thumbnail || video.coverImage ? (
                          <img src={getImageUrl(video.thumbnail || video.coverImage)} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-10 h-10 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            <Play className="w-6 h-6 text-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <h3 className="font-medium text-sm truncate">{video.title}</h3>
                      <p className="text-zinc-400 text-xs truncate">{video.artist}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
