import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Users, Music, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGetPublicAudioArtists, useGetPublicAudios } from "@/lib/api-client";

export default function AudioArtistsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data: artistsData, isLoading } = useGetPublicAudioArtists();
  const { data: audiosData } = useGetPublicAudios({});

  const artists = artistsData?.data || [];
  const audios = audiosData?.data || [];

  // Count tracks and albums per artist
  const artistStats = audios.reduce((acc: any, audio: any) => {
    if (audio.artist) {
      if (!acc[audio.artist]) {
        acc[audio.artist] = { tracks: 0, albums: new Set() };
      }
      acc[audio.artist].tracks += 1;
      if (audio.album) {
        acc[audio.artist].albums.add(audio.album);
      }
    }
    return acc;
  }, {});

  const filteredArtists = artists.filter((artist: string) =>
    !search || artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Popular Artists</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your music artists</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists..."
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
      ) : filteredArtists.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No artists found</h3>
          <p className="text-muted-foreground text-sm mt-1">Artists are created automatically when you add audio tracks</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredArtists.map((artist: string) => {
            const stats = artistStats[artist] || { tracks: 0, albums: new Set() };
            return (
              <div key={artist} className="group bg-card rounded-xl border p-4 hover:border-primary/50 transition-all">
                <div className="aspect-square rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-white">{artist.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className="font-medium text-foreground truncate text-center" title={artist}>{artist}</h3>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {stats.tracks} track{stats.tracks !== 1 ? 's' : ''} • {stats.albums.size} album{stats.albums.size !== 1 ? 's' : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
