import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Heart, Share2, Music, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetAllAudios } from "@/lib/api-client";
import AudioPlayer from "@/components/AudioPlayer";

export default function AudioBrowsePage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const { data, isLoading } = useGetAllAudios({ search, status: "published" });
  const audios = data?.data || [];

  if (selectedAudio) {
    return (
      <div className="min-h-screen bg-[#030306] text-white p-4 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => setSelectedAudio(null)} className="text-white">
            ← Back to Audio
          </Button>
          <AudioPlayer
            src={selectedAudio.audioUrl}
            title={selectedAudio.title}
            artist={selectedAudio.artist}
            thumbnail={selectedAudio.thumbnail}
          />
          {selectedAudio.lyrics && (
            <div className="bg-zinc-900 rounded-xl p-6 mt-4">
              <h3 className="text-lg font-semibold mb-3">Lyrics</h3>
              <p className="text-zinc-400 whitespace-pre-wrap text-sm leading-relaxed">{selectedAudio.lyrics}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030306] text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Audio / Music</h1>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search audio tracks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : audios.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No audio tracks found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {audios.map((audio: any) => (
              <div
                key={audio.id}
                className="group cursor-pointer"
                onClick={() => setSelectedAudio(audio)}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2">
                  {audio.thumbnail ? (
                    <img src={audio.thumbnail} alt={audio.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-10 h-10 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-medium text-sm truncate">{audio.title}</h3>
                <p className="text-zinc-400 text-xs truncate">{audio.artist}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
