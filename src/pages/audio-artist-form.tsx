import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon, Upload as UploadIcon, Save, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import MediaPicker from "@/components/MediaPicker";
import { getImageUrl } from "@/lib/api-client";
import {
  useGetAudioArtistById, useCreateAudioArtist, useUpdateAudioArtist, useGetGenres,
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

export default function AudioArtistFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const { data: artistData, isLoading: loadingArtist } = useGetAudioArtistById(id || "");
  const { data: genresData } = useGetGenres({ page: 1, limit: 100, admin: true });
  const createMutation = useCreateAudioArtist();
  const updateMutation = useUpdateAudioArtist();

  const genresList = (genresData as any)?.data || [];

  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const [image, setImage] = useState({ filePath: "", preview: "" });
  const [coverImage, setCoverImage] = useState({ filePath: "", preview: "" });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [genre, setGenre] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && artistData?.data) {
      const a = artistData.data;
      setImage({ filePath: a.image || "", preview: a.image ? getImageUrl(a.image) : "" });
      setCoverImage({ filePath: a.coverImage || "", preview: a.coverImage ? getImageUrl(a.coverImage) : "" });
      setName(a.name || "");
      setBio(a.bio || "");
      setGenre(a.genre?.id || a.genre || "");
      setCountry(a.country || "");
      setStatus(a.status ?? true);
    }
  }, [artistData, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: "Artist name is required", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('bio', bio.trim());
      formData.append('genre', genre);
      formData.append('country', country);
      formData.append('status', status.toString());
      if (image.filePath) formData.append('image', image.filePath);
      if (coverImage.filePath) formData.append('coverImage', coverImage.filePath);

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: formData });
        toast({ title: "Artist updated successfully" });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: "Artist created successfully" });
      }
      setLocation("/audio-artists");
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

  if (isEdit && loadingArtist) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/audio-artists")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">{isEdit ? "Edit Artist" : "Add New Artist"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/audio-artists")} className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : isEdit ? "Update Artist" : "Create Artist"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard title="Artist Images" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageBox label="Profile Image" preview={image.preview} onOpen={() => setImagePickerOpen(true)} />
            <ImageBox label="Cover Image" preview={coverImage.preview} onOpen={() => setCoverPickerOpen(true)} />
          </div>
        </SectionCard>

        <SectionCard title="Artist Information" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Artist Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" placeholder="Enter artist name" />
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
              <Label className="text-gray-300">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" placeholder="Enter country" />
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
            <Label className="text-gray-300">Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" placeholder="Enter artist biography..." />
          </div>
        </SectionCard>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setLocation("/audio-artists")} className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
          <Button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white">
            {isSaving ? "Saving..." : isEdit ? "Update Artist" : "Create Artist"}
          </Button>
        </div>
      </form>

      <MediaPicker open={imagePickerOpen} onClose={() => setImagePickerOpen(false)} onSelect={(m: any) => { setImage({ filePath: m.filePath, preview: m.url }); setImagePickerOpen(false); }} source="audio" accept="image/*" />
      <MediaPicker open={coverPickerOpen} onClose={() => setCoverPickerOpen(false)} onSelect={(m: any) => { setCoverImage({ filePath: m.filePath, preview: m.url }); setCoverPickerOpen(false); }} source="audio" accept="image/*" />
    </div>
  );
}
