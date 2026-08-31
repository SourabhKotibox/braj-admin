import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Disc3, Edit, Trash2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGetPublicAudioAlbums, useGetPublicAudios } from "@/lib/api-client";

export default function AudioAlbumsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data: albumsData, isLoading } = useGetPublicAudioAlbums();
  const { data: audiosData } = useGetPublicAudios({});

  const albums = albumsData?.data || [];
  const audios = audiosData?.data || [];

  // Count tracks per album
  const albumCounts = audios.reduce((acc: any, audio: any) => {
    if (audio.album) {
      acc[audio.album] = (acc[audio.album] || 0) + 1;
    }
    return acc;
  }, {});

  const filteredAlbums = albums.filter((album: string) =>
    !search || album.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audio Albums</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your music albums</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search albums..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Disc3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No albums found</h3>
          <p className="text-muted-foreground text-sm mt-1">Albums are created automatically when you add audio tracks</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAlbums.map((album: string) => (
            <div key={album} className="group bg-card rounded-xl border p-4 hover:border-primary/50 transition-all">
              <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-3">
                <Disc3 className="w-12 h-12 text-white" />
              </div>
              <h3 className="font-medium text-foreground truncate" title={album}>{album}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {albumCounts[album] || 0} track{(albumCounts[album] || 0) !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
