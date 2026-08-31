import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Music, Edit, Trash2, Star, TrendingUp, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetAllAudios, useDeleteAudio, useToggleAudioFeatured, useToggleAudioTrending, useUpdateAudio, getImageUrl, useGetAudioArtistsAdmin, useGetAudioAlbumsAdmin } from "@/lib/api-client";

export default function AudioListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useGetAllAudios({ search });
  const { data: artistsData } = useGetAudioArtistsAdmin({ page: 1, limit: 100 });
  const { data: albumsData } = useGetAudioAlbumsAdmin({ page: 1, limit: 100 });
  const deleteMutation = useDeleteAudio();
  const featuredMutation = useToggleAudioFeatured();
  const trendingMutation = useToggleAudioTrending();
  const updateMutation = useUpdateAudio();

  const audios = data?.data || [];
  const artistsList = (artistsData as any)?.data || [];
  const albumsList = (albumsData as any)?.data || [];

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this audio?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Audio deleted successfully" });
      } catch {
        toast({ title: "Failed to delete audio", variant: "destructive" });
      }
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } });
      toast({ title: `Status updated to ${status}` });
      refetch();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audio / Music</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your audio tracks and music library</p>
        </div>
        <Button onClick={() => setLocation("/audio/new")} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Audio
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search audio..."
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
      ) : audios.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No audio tracks yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Add your first audio track to get started</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Audio</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Artist</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Album</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Duration</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">New</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Featured</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Trending</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {audios.map((audio: any) => (
                <tr key={audio.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden">
                        {audio.thumbnail ? (
                          <img src={getImageUrl(audio.thumbnail)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <span className="font-medium text-foreground">{audio.title}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Select 
                      value={audio.artistId || ""} 
                      onValueChange={async (val) => {
                        if (val === "__new__") {
                          setLocation("/audio-artists/new");
                          return;
                        }
                        const selectedArtist = artistsList.find((a: any) => a.id === val);
                        try {
                          await updateMutation.mutateAsync({ 
                            id: audio.id, 
                            data: { artist: selectedArtist?.name || val, artistId: val } 
                          });
                          toast({ title: "Artist updated" });
                          refetch();
                        } catch {
                          toast({ title: "Failed to update artist", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="w-40 h-8 bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select artist" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {artistsList.map((a: any) => (
                          <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{a.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__" className="text-green-400 hover:bg-gray-700 border-t border-gray-600">
                          + Add New Artist
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <Select 
                      value={audio.albumId || ""} 
                      onValueChange={async (val) => {
                        if (val === "__new__") {
                          setLocation("/audio-albums/new");
                          return;
                        }
                        const selectedAlbum = albumsList.find((a: any) => a.id === val);
                        try {
                          await updateMutation.mutateAsync({ 
                            id: audio.id, 
                            data: { album: selectedAlbum?.name || val, albumId: val } 
                          });
                          toast({ title: "Album updated" });
                          refetch();
                        } catch {
                          toast({ title: "Failed to update album", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="w-40 h-8 bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select album" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {albumsList.map((a: any) => (
                          <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{a.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__" className="text-green-400 hover:bg-gray-700 border-t border-gray-600">
                          + Add New Album
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {audio.duration ? `${Math.floor(audio.duration / 60)}:${(audio.duration % 60).toString().padStart(2, '0')}` : "-"}
                  </td>
                  <td className="p-4">
                    <Select value={audio.status} onValueChange={(value) => handleStatusChange(audio.id, value)}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 text-center">
                    {audio.isNewContent && (
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        <Sparkles className="w-3 h-3 mr-1" />
                        New
                      </Badge>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={audio.featured}
                      onCheckedChange={() => featuredMutation.mutate(audio.id)}
                    />
                  </td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={audio.trending}
                      onCheckedChange={() => trendingMutation.mutate(audio.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setLocation(`/audio/${audio.id}`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(audio.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
