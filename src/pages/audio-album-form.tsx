import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon, Save, ArrowLeft, Disc3, Music, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import MediaPicker from "@/components/MediaPicker";
import { getImageUrl } from "@/lib/api-client";
import {
  useGetAudioAlbumById, useCreateAudioAlbum, useUpdateAudioAlbum,
  useGetAudioArtistsAdmin, useGetGenres, useGetAllAudios,
} from "@/lib/api-client";

function ImageBox({ label, preview, onOpen }: { label: string; preview: string; onOpen: () => void }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-300 mb-2">{label}</p>
      <div
        onClick={onOpen}
        className="border-2 border-dashed border-gray-600 rounded-xl aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-red-500/50 bg-gray-800/50 transition-colors overflow-hidden"
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-10 w-10 text-gray-500" />
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <span className="text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  );
}

export default function AudioAlbumFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const { data: albumData, isLoading: loadingAlbum } = useGetAudioAlbumById(id || "");
  const { data: artistsData } = useGetAudioArtistsAdmin({ page: 1, limit: 100 });
  const { data: genresData } = useGetGenres({ page: 1, limit: 100, admin: true });
  const { data: audiosData } = useGetAllAudios({ limit: "500" });
  const createMutation = useCreateAudioAlbum();
  const updateMutation = useUpdateAudioAlbum();

  const artistsList = (artistsData as any)?.data || [];
  const genresList = (genresData as any)?.data || [];
  const audiosList = (audiosData as any)?.data || [];

  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const [image, setImage] = useState({ filePath: "", preview: "" });
  const [coverImage, setCoverImage] = useState({ filePath: "", preview: "" });
  const [name, setName] = useState("");
  const [artist, setArtist] = useState("");
  const [artistId, setArtistId] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && albumData?.data) {
      const a = albumData.data;
      setImage({ filePath: a.image || "", preview: a.image ? getImageUrl(a.image) : "" });
      setCoverImage({ filePath: a.coverImage || "", preview: a.coverImage ? getImageUrl(a.coverImage) : "" });
      setName(a.name || "");
      setArtist(a.artist || "");
      setArtistId(a.artistId || "");
      setGenre(a.genre?.id || a.genre || "");
      setReleaseDate(a.releaseDate ? new Date(a.releaseDate).toISOString().split("T")[0] : "");
      setDescription(a.description || "");
      setStatus(a.status ?? true);
      setSelectedSongs(a.songs || a.trackIds || []);
    }
  }, [albumData, isEdit]);

  const filteredSongs = audiosList.filter((audio: any) => {
    const matchesSearch = !songSearchQuery || 
      audio.title.toLowerCase().includes(songSearchQuery.toLowerCase()) ||
      (audio.artist && audio.artist.toLowerCase().includes(songSearchQuery.toLowerCase()));
    const matchesArtist = !artistId || audio.artistId === artistId;
    return matchesSearch && matchesArtist;
  });

  const toggleSongSelection = (songId: string) => {
    setSelectedSongs(prev => 
      prev.includes(songId) 
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const selectAllSongs = () => {
    const allIds = filteredSongs.map((s: any) => s.id);
    setSelectedSongs(allIds);
  };

  const clearAllSongs = () => {
    setSelectedSongs([]);
  };

  const handleArtistChange = (value: string) => {
    setArtistId(value);
    const selectedArtist = artistsList.find((a: any) => a.id === value);
    if (selectedArtist) {
      setArtist(selectedArtist.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: "Album name is required", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('artist', artist);
      formData.append('artistId', artistId);
      formData.append('genre', genre);
      formData.append('releaseDate', releaseDate);
      formData.append('description', description);
      formData.append('status', status.toString());
      formData.append('songs', JSON.stringify(selectedSongs));
      if (image.filePath) formData.append('image', image.filePath);
      if (coverImage.filePath) formData.append('coverImage', coverImage.filePath);

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: formData });
        toast({ title: "Album updated successfully" });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: "Album created successfully" });
      }
      setLocation("/audio-albums");
    } catch (error: any) {
      toast({ 
        title: isEdit ? "Update failed" : "Creation failed", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && loadingAlbum) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/audio-albums")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">{isEdit ? "Edit Album" : "Add New Album"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/audio-albums")} className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : isEdit ? "Update Album" : "Create Album"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard title="Album Images" icon={Disc3}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageBox label="Album Cover" preview={image.preview} onOpen={() => setImagePickerOpen(true)} />
            <ImageBox label="Banner Image" preview={coverImage.preview} onOpen={() => setCoverPickerOpen(true)} />
          </div>
        </SectionCard>

        <SectionCard title="Album Information" icon={Disc3}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Album Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" placeholder="Enter album name" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Artist</Label>
              <Select value={artistId} onValueChange={handleArtistChange}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select artist" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {artistsList.map((a: any) => (
                    <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select genre" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {genresList.map((g: any) => (
                    <SelectItem key={g.id || g._id} value={g.id || g._id} className="text-white hover:bg-gray-700">{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Release Date</Label>
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Status</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={status} onCheckedChange={setStatus} />
                <span className="text-gray-400">{status ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" placeholder="Enter album description..." />
          </div>
        </SectionCard>

        <SectionCard title={`Select Songs (${selectedSongs.length} selected)`} icon={Music}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search songs..."
                value={songSearchQuery}
                onChange={(e) => setSongSearchQuery(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={selectAllSongs} className="border-gray-700 text-gray-300 hover:bg-gray-800 whitespace-nowrap">
                Select All
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearAllSongs} className="border-gray-700 text-gray-300 hover:bg-gray-800 whitespace-nowrap">
                Clear All
              </Button>
            </div>

            {filteredSongs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No songs found. {artistId ? 'Try selecting an artist first.' : 'Upload songs to add them to this album.'}</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox 
                          checked={filteredSongs.length > 0 && filteredSongs.every((s: any) => selectedSongs.includes(s.id))}
                          onCheckedChange={(checked) => {
                            if (checked) selectAllSongs();
                            else clearAllSongs();
                          }}
                          className="border-gray-600"
                        />
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-gray-400">Song</th>
                      <th className="p-3 text-left text-sm font-medium text-gray-400">Artist</th>
                      <th className="p-3 text-left text-sm font-medium text-gray-400">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredSongs.map((song: any) => (
                      <tr 
                        key={song.id} 
                        className={`hover:bg-gray-800/50 cursor-pointer ${selectedSongs.includes(song.id) ? 'bg-red-900/20' : ''}`}
                        onClick={() => toggleSongSelection(song.id)}
                      >
                        <td className="p-3">
                          <Checkbox 
                            checked={selectedSongs.includes(song.id)}
                            onCheckedChange={() => toggleSongSelection(song.id)}
                            className="border-gray-600"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                              {song.thumbnail ? (
                                <img src={getImageUrl(song.thumbnail)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Music className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <span className="text-white text-sm">{song.title}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-400 text-sm">{song.artist || "-"}</td>
                        <td className="p-3 text-gray-400 text-sm">
                          {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedSongs.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Selected Songs ({selectedSongs.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSongs.map(songId => {
                    const song = audiosList.find((a: any) => a.id === songId);
                    return song ? (
                      <span key={songId} className="inline-flex items-center gap-1 bg-red-900/30 text-red-300 px-2 py-1 rounded text-xs">
                        {song.title}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSongSelection(songId); }}
                          className="hover:text-red-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setLocation("/audio-albums")} className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
          <Button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white">
            {isSaving ? "Saving..." : isEdit ? "Update Album" : "Create Album"}
          </Button>
        </div>
      </form>

      <MediaPicker open={imagePickerOpen} onClose={() => setImagePickerOpen(false)} onSelect={(m: any) => { setImage({ filePath: m.filePath, preview: m.url }); setImagePickerOpen(false); }} source="audio" accept="image/*" />
      <MediaPicker open={coverPickerOpen} onClose={() => setCoverPickerOpen(false)} onSelect={(m: any) => { setCoverImage({ filePath: m.filePath, preview: m.url }); setCoverPickerOpen(false); }} source="audio" accept="image/*" />
    </div>
  );
}
