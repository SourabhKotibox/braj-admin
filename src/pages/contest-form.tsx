import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MediaPicker from "@/components/MediaPicker";
import { getImageUrl } from "@/lib/api-client";
import {
  useGetContestVideoById, useCreateContestVideo, useUpdateContestVideo,
  useGetGenres, useGetCategoriesList, useGetLanguagesList,
  useGetAllContestants, useCreateContestant, useDeleteContestant,
} from "@/lib/api-client";

function refId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id || value._id?.toString?.() || "";
}

export default function ContestFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const { data: videoData, isLoading: loadingVideo } = useGetContestVideoById(id || "");
  const { data: genresData } = useGetGenres({ page: 1, limit: 100 });
  const { data: categoriesData } = useGetCategoriesList({ limit: 100 });
  const { data: languagesData } = useGetLanguagesList();
  const { data: contestantsData, refetch: refetchContestants } = useGetAllContestants({ contestVideoId: id || "" });
  const createMutation = useCreateContestVideo();
  const updateMutation = useUpdateContestVideo();
  const createContestantMutation = useCreateContestant();
  const deleteContestantMutation = useDeleteContestant();

  const genresList = (genresData as any)?.data || [];
  const categoriesList = (categoriesData as any)?.data || [];
  const languagesList = (languagesData as any)?.data || [];
  const contestants = (contestantsData as any)?.data || [];

  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [thumbnail, setThumbnail] = useState({ filePath: "", preview: "" });
  const [coverImage, setCoverImage] = useState({ filePath: "", preview: "" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFilePath, setVideoFilePath] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [genre, setGenre] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [maxContestants, setMaxContestants] = useState("");
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [votingEndDate, setVotingEndDate] = useState("");
  const [allowGuestPurchase, setAllowGuestPurchase] = useState(true);

  const [contestantName, setContestantName] = useState("");
  const [contestantEmail, setContestantEmail] = useState("");
  const [contestantPhone, setContestantPhone] = useState("");
  const [contestantPhoto, setContestantPhoto] = useState("");
  const [contestantIntro, setContestantIntro] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isAddingContestant, setIsAddingContestant] = useState(false);

  useEffect(() => {
    if (isEdit && videoData?.data) {
      const v = videoData.data;
      setThumbnail({ filePath: v.thumbnail || "", preview: v.thumbnail ? getImageUrl(v.thumbnail) : "" });
      setCoverImage({ filePath: v.coverImage || "", preview: v.coverImage ? getImageUrl(v.coverImage) : "" });
      setTitle(v.title || "");
      setDescription(v.description || "");
      setShortDescription(v.shortDescription || "");
      setVideoUrl(v.videoUrl || "");
      setHlsUrl(v.hlsUrl || "");
      setDuration(v.duration?.toString() || "");
      setGenre(refId(v.genre));
      setCategory(refId(v.category));
      setLanguage(refId(v.language));
      setTags(v.tags || []);
      setStatus(v.status || "draft");
      setFeatured(v.featured || false);
      setTrending(v.trending || false);
      setPrice(v.price?.toString() || "0");
      setCurrency(v.currency || "INR");
      setMaxContestants(v.maxContestants?.toString() || "100");
      setVotingEnabled(v.votingEnabled ?? true);
      setVotingEndDate(v.votingEndDate ? new Date(v.votingEndDate).toISOString().split("T")[0] : "");
      setAllowGuestPurchase(v.allowGuestPurchase ?? true);
    }
  }, [videoData, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        title,
        description,
        shortDescription,
        thumbnail: thumbnail.filePath,
        coverImage: coverImage.filePath,
        videoUrl: videoUrl || videoFilePath,
        hlsUrl,
        duration: duration ? Number(duration) : undefined,
        genre: genre || undefined,
        category: category || undefined,
        language: language || undefined,
        tags,
        status,
        featured,
        trending,
        price: Number(price),
        currency,
        maxContestants: maxContestants ? Number(maxContestants) : undefined,
        votingEnabled,
        votingEndDate: votingEndDate || undefined,
        allowGuestPurchase,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        toast({ title: "Contest updated successfully" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Contest created successfully" });
      }
      setLocation("/contests");
    } catch {
      toast({ title: isEdit ? "Update failed" : "Creation failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContestant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !contestantName) return;
    setIsAddingContestant(true);
    try {
      await createContestantMutation.mutateAsync({
        contestVideoId: id,
        name: contestantName,
        email: contestantEmail,
        phone: contestantPhone,
        photo: contestantPhoto,
        intro: contestantIntro,
      });
      toast({ title: "Contestant added successfully" });
      setContestantName("");
      setContestantEmail("");
      setContestantPhone("");
      setContestantPhoto("");
      setContestantIntro("");
      refetchContestants();
    } catch {
      toast({ title: "Failed to add contestant", variant: "destructive" });
    } finally {
      setIsAddingContestant(false);
    }
  };

  const handleDeleteContestant = async (contestantId: string) => {
    if (confirm("Are you sure you want to remove this contestant?")) {
      try {
        await deleteContestantMutation.mutateAsync(contestantId);
        toast({ title: "Contestant removed" });
        refetchContestants();
      } catch {
        toast({ title: "Failed to remove contestant", variant: "destructive" });
      }
    }
  };

  if (isEdit && loadingVideo) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Contest" : "Add New Contest"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/contests")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-primary hover:bg-primary/90">
            {isSaving ? "Saving..." : isEdit ? "Update Contest" : "Create Contest"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Contest Details</TabsTrigger>
          {isEdit && <TabsTrigger value="contestants">Contestants</TabsTrigger>}
        </TabsList>

        <TabsContent value="details">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Media Files</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-2">Thumbnail</p>
                  <div
                    onClick={() => setThumbnailPickerOpen(true)}
                    className="border-2 border-dashed border-border rounded-xl aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden"
                  >
                    {thumbnail.preview ? (
                      <img src={thumbnail.preview} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-2">Cover Image</p>
                  <div
                    onClick={() => setCoverPickerOpen(true)}
                    className="border-2 border-dashed border-border rounded-xl aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden"
                  >
                    {coverImage.preview ? (
                      <img src={coverImage.preview} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Video File *</Label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL or file path" />
                <Button type="button" variant="outline" onClick={() => setVideoPickerOpen(true)}>Media Library</Button>
                {videoFilePath && <p className="text-xs text-muted-foreground">Selected: {videoFilePath}</p>}
              </div>
              <div className="space-y-2">
                <Label>HLS URL</Label>
                <Input value={hlsUrl} onChange={(e) => setHlsUrl(e.target.value)} placeholder="https://example.com/playlist.m3u8" />
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Short Description</Label>
                  <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                    <SelectContent>
                      {genresList.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categoriesList.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>
                      {languagesList.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input value={tagInput} onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="contest, music, vote" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Contest Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (INR)</Label>
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Contestants</Label>
                  <Input value={maxContestants} onChange={(e) => setMaxContestants(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Voting End Date</Label>
                  <Input value={votingEndDate} onChange={(e) => setVotingEndDate(e.target.value)} type="date" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={votingEnabled} onCheckedChange={setVotingEnabled} />
                  <Label>Voting Enabled</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={allowGuestPurchase} onCheckedChange={setAllowGuestPurchase} />
                  <Label>Allow Guest Purchase</Label>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Publishing</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Switch checked={status === "published"} onCheckedChange={(v) => setStatus(v ? "published" : "draft")} />
                  <Label>Published</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={featured} onCheckedChange={setFeatured} />
                  <Label>Featured</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={trending} onCheckedChange={setTrending} />
                  <Label>Trending</Label>
                </div>
              </div>
            </div>
          </form>
        </TabsContent>

        {isEdit && (
          <TabsContent value="contestants" className="space-y-6">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Add Contestant</h2>
              <form onSubmit={handleAddContestant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={contestantName} onChange={(e) => setContestantName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={contestantEmail} onChange={(e) => setContestantEmail(e.target.value)} type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={contestantPhone} onChange={(e) => setContestantPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Photo URL</Label>
                  <Input value={contestantPhoto} onChange={(e) => setContestantPhoto(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Intro</Label>
                  <Textarea value={contestantIntro} onChange={(e) => setContestantIntro(e.target.value)} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={isAddingContestant} className="bg-primary hover:bg-primary/90">
                    {isAddingContestant ? "Adding..." : "Add Contestant"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Votes</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contestants.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No contestants yet</td></tr>
                  ) : contestants.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="p-4 font-medium text-foreground">{c.name}</td>
                      <td className="p-4 text-muted-foreground">{c.email || "-"}</td>
                      <td className="p-4 text-muted-foreground">{c.phone || "-"}</td>
                      <td className="p-4 text-muted-foreground">{c.votes || 0}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteContestant(c.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Media Pickers */}
      {thumbnailPickerOpen && (
        <MediaPicker
          open={thumbnailPickerOpen}
          onClose={() => setThumbnailPickerOpen(false)}
          onSelect={(media: any) => {
            setThumbnail({ filePath: media.filePath, preview: media.url || media.filePath });
            setThumbnailPickerOpen(false);
          }}
          source="video-music"
          accept="image/*"
        />
      )}
      {coverPickerOpen && (
        <MediaPicker
          open={coverPickerOpen}
          onClose={() => setCoverPickerOpen(false)}
          onSelect={(media: any) => {
            setCoverImage({ filePath: media.filePath, preview: media.url || media.filePath });
            setCoverPickerOpen(false);
          }}
          source="video-music"
          accept="image/*"
        />
      )}
      {videoPickerOpen && (
        <MediaPicker
          open={videoPickerOpen}
          onClose={() => setVideoPickerOpen(false)}
          onSelect={(media: any) => {
            setVideoFilePath(media.filePath);
            setVideoUrl(media.url || media.filePath);
            setVideoPickerOpen(false);
          }}
          source="video-music"
          accept="video/*"
        />
      )}
    </div>
  );
}
