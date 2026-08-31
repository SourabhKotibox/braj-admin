import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, Video, Edit, Trash2, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGetAllVideoMusics, useDeleteVideoMusic, useToggleVideoMusicFeatured, useToggleVideoMusicTrending } from "@/lib/api-client";

export default function VideoMusicListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetAllVideoMusics({ search });
  const deleteMutation = useDeleteVideoMusic();
  const featuredMutation = useToggleVideoMusicFeatured();
  const trendingMutation = useToggleVideoMusicTrending();

  const videos = data?.data || [];

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this video music?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Video music deleted successfully" });
      } catch {
        toast({ title: "Failed to delete video music", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Video Music</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your music videos and video content</p>
        </div>
        <Button onClick={() => setLocation("/video-music/new")} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Video Music
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
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
      ) : videos.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No video music yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Add your first music video to get started</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Video</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Artist</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Album</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Duration</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Featured</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Trending</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {videos.map((video: any) => (
                <tr key={video.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden">
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Video className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <span className="font-medium text-foreground">{video.title}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{video.artist}</td>
                  <td className="p-4 text-muted-foreground">{video.album || "-"}</td>
                  <td className="p-4 text-muted-foreground">
                    {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : "-"}
                  </td>
                  <td className="p-4">
                    <Badge variant={video.status === "published" ? "default" : "secondary"}>
                      {video.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Switch
                      checked={video.featured}
                      onCheckedChange={() => featuredMutation.mutate(video.id)}
                    />
                  </td>
                  <td className="p-4">
                    <Switch
                      checked={video.trending}
                      onCheckedChange={() => trendingMutation.mutate(video.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setLocation(`/video-music/${video.id}`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(video.id)}>
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
