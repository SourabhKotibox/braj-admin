import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import MediaPicker from "@/components/MediaPicker";
import { getImageUrl, toStorageMediaPath } from "@/lib/api-client";
import {
  useGetVideoMusicById, useCreateVideoMusic, useUpdateVideoMusic,
  useGetGenres, useGetCategoriesList, useGetLanguagesList, useGetCountries,
} from "@/lib/api-client";

type QualityRow = { id: string; type: string; quality: string; filePath: string; url: string };

function refId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id || value._id?.toString?.() || "";
}

function ImageBox({ label, preview, onOpen }: { label: string; preview: string; onOpen: () => void }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div
        onClick={onOpen}
        className="border-2 border-dashed border-border rounded-xl aspect-[4/3] flex items-center justify-center cursor-pointer hover:border-primary/40 bg-muted/20 transition-colors overflow-hidden"
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export default function VideoMusicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const { data: videoData, isLoading: loadingVideo } = useGetVideoMusicById(id || "");
  const { data: genresData } = useGetGenres({ page: 1, limit: 100 });
  const { data: categoriesData } = useGetCategoriesList({ limit: 100 });
  const { data: languagesData } = useGetLanguagesList();
  const { data: countriesData } = useGetCountries({ limit: 100 });
  const createMutation = useCreateVideoMusic();
  const updateMutation = useUpdateVideoMusic();

  const genresList = (genresData as any)?.data || [];
  const categoriesList = (categoriesData as any)?.data || [];
  const languagesList = (languagesData as any)?.data || [];
  const countries = countriesData?.data || [];

  /* ---- Media picker states ---- */
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [qualityPickerOpen, setQualityPickerOpen] = useState(false);
  const [currentQualityRowId, setCurrentQualityRowId] = useState<string | null>(null);

  /* ---- Form state ---- */
  const [thumbnail, setThumbnail] = useState({ filePath: "", preview: "" });
  const [coverImage, setCoverImage] = useState({ filePath: "", preview: "" });
  const [bannerImage, setBannerImage] = useState({ filePath: "", preview: "" });
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFilePath, setVideoFilePath] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [genre, setGenre] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [country, setCountry] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("draft");
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [isNewContent, setIsNewContent] = useState(true);
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [planRequired, setPlanRequired] = useState<"free" | "basic" | "standard" | "premium">("free");
  const [releaseDate, setReleaseDate] = useState("");

  /* ---- Quality Info ---- */
  const [qualityEnabled, setQualityEnabled] = useState(false);
  const [qualityRows, setQualityRows] = useState<QualityRow[]>([
    { id: "1", type: "url", quality: "480p", filePath: "", url: "" },
  ]);

  /* ---- SEO ---- */
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && videoData?.data) {
      const v = videoData.data;
      setThumbnail({ filePath: v.thumbnail || "", preview: v.thumbnail ? getImageUrl(v.thumbnail) : "" });
      setCoverImage({ filePath: v.coverImage || "", preview: v.coverImage ? getImageUrl(v.coverImage) : "" });
      setBannerImage({ filePath: v.bannerImage || "", preview: v.bannerImage ? getImageUrl(v.bannerImage) : "" });
      setTitle(v.title || "");
      setArtist(v.artist || "");
      setAlbum(v.album || "");
      setDescription(v.description || "");
      setShortDescription(v.shortDescription || "");
      setVideoUrl(toStorageMediaPath(v.videoUrl) || v.videoUrl || "");
      setHlsUrl(/example\.com/i.test(v.hlsUrl || "") ? "" : (toStorageMediaPath(v.hlsUrl) || v.hlsUrl || ""));
      setDuration(v.duration?.toString() || "");
      setGenre(refId(v.genre));
      setCategory(refId(v.category));
      setLanguage(refId(v.language));
      setCountry(v.country || "");
      setTags(v.tags || []);
      setStatus(v.status || "draft");
      setFeatured(v.featured || false);
      setTrending(v.trending || false);
      setIsNewContent(v.isNewContent ?? true);
      setDownloadAllowed(v.downloadAllowed ?? true);
      setPlanRequired(v.planRequired || "free");
      setReleaseDate(v.releaseDate ? new Date(v.releaseDate).toISOString().split("T")[0] : "");
      setSlug(v.slug || "");
      setMetaTitle(v.metaTitle || "");
      setMetaDescription(v.metaDescription || "");
      if (v.videoQualities && v.videoQualities.length > 0) {
        setQualityEnabled(true);
        setQualityRows(v.videoQualities.map((q: any, i: number) => ({
          id: String(i + 1),
          type: q.url?.startsWith("http") ? "url" : "local",
          quality: q.quality || "480p",
          filePath: q.url?.startsWith("http") ? "" : q.url || "",
          url: q.url?.startsWith("http") ? q.url : "",
        })));
      }
    }
  }, [videoData, isEdit]);

  const handleVideoSelect = (media: any) => {
    const stored = toStorageMediaPath(media.filePath || media.url) || media.filePath || media.url || "";
    setVideoFilePath(stored);
    setVideoUrl(stored);
    setVideoPickerOpen(false);
    if (!title && media.name) {
      setTitle(media.name.replace(/\.[^/.]+$/, ""));
    }
    if (media.duration) {
      setDuration(media.duration.toString());
    }
    const hls = media.hlsMasterPlaylistUrl || media.hlsUrl;
    if (media.isHls && hls && !/example\.com/i.test(hls)) {
      setHlsUrl(toStorageMediaPath(hls) || hls);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanVideoUrl = toStorageMediaPath(videoUrl || videoFilePath) || videoUrl || videoFilePath || "";
      const cleanHls = /example\.com/i.test(hlsUrl || "") ? "" : (toStorageMediaPath(hlsUrl) || hlsUrl || "");
      if (!cleanVideoUrl) {
        toast({ title: "Please select a video file", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      const payload = {
        title,
        artist,
        album,
        description,
        shortDescription,
        thumbnail: toStorageMediaPath(thumbnail.filePath) || thumbnail.filePath,
        coverImage: toStorageMediaPath(coverImage.filePath) || coverImage.filePath,
        bannerImage: toStorageMediaPath(bannerImage.filePath) || bannerImage.filePath,
        videoUrl: cleanVideoUrl,
        hlsUrl: cleanHls || undefined,
        duration: duration ? Number(duration) : undefined,
        genre: genre || undefined,
        category: category || undefined,
        language: language || undefined,
        country: country || undefined,
        tags,
        status,
        featured,
        trending,
        isNewContent,
        downloadAllowed,
        planRequired,
        releaseDate: releaseDate || undefined,
        slug,
        metaTitle,
        metaDescription,
        videoQualities: qualityEnabled
          ? qualityRows.filter((q) => q.url || q.filePath).map((q) => ({
              quality: q.quality,
              url: toStorageMediaPath(q.url || q.filePath) || q.url || q.filePath,
              size: 0,
            }))
          : [],
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        toast({ title: "Video music updated successfully" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Video music created successfully" });
      }
      setLocation("/video-music");
    } catch {
      toast({ title: isEdit ? "Update failed" : "Creation failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && loadingVideo) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Video Music" : "Add New Video Music"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/video-music")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-primary hover:bg-primary/90">
            {isSaving ? "Saving..." : isEdit ? "Update Video Music" : "Create Video Music"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Media Section */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Media Files</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImageBox label="Thumbnail" preview={thumbnail.preview} onOpen={() => setThumbnailPickerOpen(true)} />
            <ImageBox label="Cover Image" preview={coverImage.preview} onOpen={() => setCoverPickerOpen(true)} />
            <ImageBox label="Banner Image" preview={bannerImage.preview} onOpen={() => setBannerPickerOpen(true)} />
          </div>
          <div className="space-y-2">
            <Label>Video File *</Label>
            <div className="flex gap-2">
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL or file path" className="flex-1" />
              <Button type="button" variant="outline" onClick={() => setVideoPickerOpen(true)}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Media Library
              </Button>
            </div>
            {videoFilePath && <p className="text-xs text-muted-foreground">Selected: {videoFilePath}</p>}
          </div>
          <div className="space-y-2">
            <Label>HLS URL</Label>
            <Input value={hlsUrl} onChange={(e) => setHlsUrl(e.target.value)} placeholder="Leave empty unless you have a real .m3u8 URL" />
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Artist *</Label>
              <Input value={artist} onChange={(e) => setArtist(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Album</Label>
              <Input value={album} onChange={(e) => setAlbum(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Release Date</Label>
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c: any) => (
                    <SelectItem key={c.id || c._id} value={c.id || c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          </div>
        </div>

        {/* Classification */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Classification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                <SelectContent>
                  {genresList.map((g: any) => (
                    <SelectItem key={g.id || g._id} value={g.id || g._id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categoriesList.map((c: any) => (
                    <SelectItem key={c.id || c._id} value={c.id || c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent>
                  {languagesList.map((l: any) => (
                    <SelectItem key={l.id || l._id} value={l.id || l._id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Input value={tagInput} onChange={(e) => {
              setTagInput(e.target.value);
              setTags(e.target.value.split(",").map((t) => t.trim()).filter(Boolean));
            }} placeholder="pop, music video, 2024" />
          </div>
        </div>

        {/* Quality Info */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Video Quality</h2>
            <div className="flex items-center gap-2">
              <Switch checked={qualityEnabled} onCheckedChange={setQualityEnabled} />
              <Label>Enable Quality Options</Label>
            </div>
          </div>
          {qualityEnabled && (
            <div className="space-y-3">
              {qualityRows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Quality</Label>
                    <Select value={row.quality} onValueChange={(v) => {
                      const rows = [...qualityRows];
                      rows[idx].quality = v;
                      setQualityRows(rows);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="144p">144p</SelectItem>
                        <SelectItem value="240p">240p</SelectItem>
                        <SelectItem value="360p">360p</SelectItem>
                        <SelectItem value="480p">480p</SelectItem>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={row.type} onValueChange={(v) => {
                      const rows = [...qualityRows];
                      rows[idx].type = v;
                      setQualityRows(rows);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="local">Media Library</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{row.type === "url" ? "URL" : "File"}</Label>
                    {row.type === "url" ? (
                      <Input value={row.url} onChange={(e) => {
                        const rows = [...qualityRows];
                        rows[idx].url = e.target.value;
                        setQualityRows(rows);
                      }} placeholder="https://..." />
                    ) : (
                      <div className="flex gap-1">
                        <Input value={row.filePath} readOnly placeholder="Select file" />
                        <Button type="button" variant="outline" size="icon" onClick={() => {
                          setCurrentQualityRowId(row.id);
                          setQualityPickerOpen(true);
                        }}>
                          <UploadIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => {
                    setQualityRows(qualityRows.filter((r) => r.id !== row.id));
                  }}>
                    <span className="text-destructive">&times;</span>
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => {
                setQualityRows([...qualityRows, { id: String(Date.now()), type: "url", quality: "720p", filePath: "", url: "" }]);
              }}>
                Add Quality
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan Required</Label>
              <Select value={planRequired} onValueChange={(v: any) => setPlanRequired(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={featured} onCheckedChange={setFeatured} />
              <Label>Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={trending} onCheckedChange={setTrending} />
              <Label>Trending</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isNewContent} onCheckedChange={setIsNewContent} />
              <Label>New Content</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={downloadAllowed} onCheckedChange={setDownloadAllowed} />
              <Label>Download Allowed</Label>
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">SEO Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="custom-url-slug" />
            </div>
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setLocation("/video-music")}>Cancel</Button>
          <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90">
            {isSaving ? "Saving..." : isEdit ? "Update Video Music" : "Create Video Music"}
          </Button>
        </div>
      </form>

      {/* Media Pickers */}
      <MediaPicker open={thumbnailPickerOpen} onClose={() => setThumbnailPickerOpen(false)} onSelect={(m: any) => { setThumbnail({ filePath: m.filePath, preview: m.url }); setThumbnailPickerOpen(false); }} source="audio" accept="image/*" />
      <MediaPicker open={coverPickerOpen} onClose={() => setCoverPickerOpen(false)} onSelect={(m: any) => { setCoverImage({ filePath: m.filePath, preview: m.url }); setCoverPickerOpen(false); }} source="audio" accept="image/*" />
      <MediaPicker open={bannerPickerOpen} onClose={() => setBannerPickerOpen(false)} onSelect={(m: any) => { setBannerImage({ filePath: m.filePath, preview: m.url }); setBannerPickerOpen(false); }} source="video-music" accept="image/*" />
      <MediaPicker open={videoPickerOpen} onClose={() => setVideoPickerOpen(false)} onSelect={handleVideoSelect} source="video-music" accept="video/*" />
      <MediaPicker open={qualityPickerOpen} onClose={() => setQualityPickerOpen(false)} onSelect={(m: any) => {
        if (currentQualityRowId) {
          const rows = qualityRows.map((r) => r.id === currentQualityRowId ? { ...r, filePath: m.filePath } : r);
          setQualityRows(rows);
        }
        setQualityPickerOpen(false);
      }} source="video-music" accept="video/*" />
    </div>
  );
}
