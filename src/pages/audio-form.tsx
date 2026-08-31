import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ImageIcon, Upload as UploadIcon, Plus, Trash2, Music, Info, Settings, FileText, Sparkles, Edit2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import MediaPicker from "@/components/MediaPicker";
import { getImageUrl, analyzeAudio, normalizeAudio } from "@/lib/api-client";
import {
  useGetAudioById, useCreateAudio, useUpdateAudio,
  useGetGenres, useGetCategoriesList, useGetLanguagesList, useGetCountries,
  useGetAudioArtistsAdmin, useGetAudioAlbumsAdmin,
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

export default function AudioFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const { data: audioData, isLoading: loadingAudio } = useGetAudioById(id || "");
  const { data: genresData } = useGetGenres({ page: 1, limit: 100, admin: true });
  const { data: categoriesData } = useGetCategoriesList({ limit: 100, admin: true });
  const { data: languagesData } = useGetLanguagesList();
  const { data: countriesData } = useGetCountries({ limit: 100, admin: true });
  const { data: artistsData } = useGetAudioArtistsAdmin({ page: 1, limit: 100 });
  const { data: albumsData } = useGetAudioAlbumsAdmin({ page: 1, limit: 100 });
  const createMutation = useCreateAudio();
  const updateMutation = useUpdateAudio();

  const genresList = (genresData as any)?.data || [];
  const categoriesList = (categoriesData as any)?.data || [];
  const languagesList = (languagesData as any)?.data || [];
  const countries = countriesData?.data || [];
  const artistsList = (artistsData as any)?.data || [];
  const albumsList = (albumsData as any)?.data || [];

  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);

  const [thumbnail, setThumbnail] = useState({ filePath: "", preview: "" });
  const [coverImage, setCoverImage] = useState({ filePath: "", preview: "" });
  const [bannerImage, setBannerImage] = useState({ filePath: "", preview: "" });
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [artistId, setArtistId] = useState("");
  const [album, setAlbum] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFilePath, setAudioFilePath] = useState("");
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
  const [isExclusive, setIsExclusive] = useState(false);
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [planRequired, setPlanRequired] = useState<"free" | "basic" | "standard" | "premium">("free");
  const [lyrics, setLyrics] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  const [bitrate, setBitrate] = useState("");
  const [sampleRate, setSampleRate] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [qualityEnabled, setQualityEnabled] = useState(false);
  const [qualityRows, setQualityRows] = useState<Array<{
    id: string;
    quality: 'low' | 'medium' | 'high' | 'lossless';
    type: string;
    filePath: string;
    url: string;
    bitrate: string;
  }>>([]);
  const [qualityPickerOpen, setQualityPickerOpen] = useState(false);
  const [currentQualityRowId, setCurrentQualityRowId] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const [artistSearchQuery, setArtistSearchQuery] = useState("");
  const [albumSearchQuery, setAlbumSearchQuery] = useState("");
  const [artistDropdownOpen, setArtistDropdownOpen] = useState(false);
  const [albumDropdownOpen, setAlbumDropdownOpen] = useState(false);

  const [normalizeEnabled, setNormalizeEnabled] = useState(false);
  const [targetLoudness, setTargetLoudness] = useState("-14");
  const [truePeak, setTruePeak] = useState("-1");
  const [loudnessRange, setLoudnessRange] = useState("11");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [loudnessInfo, setLoudnessInfo] = useState<any>(null);
  const [normalizedUrl, setNormalizedUrl] = useState("");

  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && audioData?.data) {
      const a = audioData.data;
      setThumbnail({ filePath: a.thumbnail || "", preview: a.thumbnail ? getImageUrl(a.thumbnail) : "" });
      setCoverImage({ filePath: a.coverImage || "", preview: a.coverImage ? getImageUrl(a.coverImage) : "" });
      setTitle(a.title || "");
      setArtist(a.artist || "");
      setAlbum(a.album || "");
      setDescription(a.description || "");
      setShortDescription(a.shortDescription || "");
      setAudioUrl(a.audioUrl || "");
      setDuration(a.duration?.toString() || "");
      setGenre(a.genre?.id || a.genre || "");
      setCategory(a.category?.id || a.category || "");
      setLanguage(a.language?.id || a.language || "");
      setCountry(a.country || "");
      setArtistId(a.artistId || "");
      setAlbumId(a.albumId || "");
      setTags(a.tags || []);
      setStatus(a.status || "draft");
      setFeatured(a.featured || false);
      setTrending(a.trending || false);
      setIsNewContent(a.isNewContent ?? true);
      setIsExclusive(a.isExclusive || false);
      setDownloadAllowed(a.downloadAllowed ?? true);
      setPlanRequired(a.planRequired || "free");
      setLyrics(a.lyrics || "");
      setTrackNumber(a.trackNumber?.toString() || "");
      setBitrate(a.bitrate?.toString() || "");
      setSampleRate(a.sampleRate?.toString() || "");
      setReleaseDate(a.releaseDate ? new Date(a.releaseDate).toISOString().split("T")[0] : "");
      setSlug(a.slug || "");
      setMetaTitle(a.metaTitle || "");
      setMetaDescription(a.metaDescription || "");
      if (a.audioQualities && a.audioQualities.length > 0) {
        setQualityEnabled(true);
        setQualityRows(a.audioQualities.map((q: any, i: number) => ({
          id: String(i + 1),
          quality: q.quality || "high",
          type: q.url?.startsWith("http") ? "url" : "local",
          filePath: q.url?.startsWith("http") ? "" : q.url || "",
          url: q.url?.startsWith("http") ? q.url : "",
          bitrate: q.bitrate?.toString() || "320",
        })));
      }
    }
  }, [audioData, isEdit]);

  const handleAudioSelect = (media: any) => {
    const fileUrl = media.url || getImageUrl(media.filePath);
    setAudioFilePath(media.filePath);
    setAudioUrl(fileUrl);
    setAudioPreviewUrl(fileUrl);
    setAudioPickerOpen(false);
    
    // Auto-fill title from filename if not already set
    if (!title && media.name) {
      // Remove file extension and clean up the name
      const cleanName = media.name
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/[-_]/g, " ") // Replace dashes and underscores with spaces
        .replace(/\b\w/g, (l: string) => l.toUpperCase()); // Capitalize words
      setTitle(cleanName);
    }
    
    // Auto-fill duration if available
    if (media.duration) {
      setDuration(media.duration.toString());
    } else if (fileUrl) {
      // Try to get duration from audio element
      const audio = new Audio();
      audio.src = fileUrl;
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(Math.round(audio.duration).toString());
        }
      });
    }
    
    // Auto-fill slug from title
    if (title && !slug) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
    
    // Auto-generate quality entries based on uploaded file
    if (media.filePath || media.url) {
      const qualities = [
        { id: "high", quality: "high" as const, bitrate: "320" },
        { id: "medium", quality: "medium" as const, bitrate: "192" },
        { id: "low", quality: "low" as const, bitrate: "128" },
      ];
      
      const newQualityRows = qualities.map((q) => ({
        id: q.id,
        quality: q.quality,
        type: "url",
        filePath: media.filePath || "",
        url: fileUrl,
        bitrate: q.bitrate,
      }));
      
      setQualityRows(newQualityRows);
      setQualityEnabled(true);
    }
  };

  const handleAnalyzeLoudness = async () => {
    if (!audioUrl && !audioFilePath) return;
    setIsAnalyzing(true);
    try {
      const url = audioUrl || audioFilePath;
      const res = await analyzeAudio(url);
      if (res.success) {
        setLoudnessInfo(res.data);
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNormalize = async () => {
    if (!audioUrl && !audioFilePath) return;
    setIsNormalizing(true);
    try {
      const url = audioUrl || audioFilePath;
      const res = await normalizeAudio(url, {
        targetLoudness: Number(targetLoudness),
        truePeak: Number(truePeak),
        loudnessRange: Number(loudnessRange),
      });
      if (res.success) {
        setNormalizedUrl(res.outputUrl || "");
        if (res.outputUrl) {
          const newRow = {
            id: String(Date.now()),
            quality: "high" as const,
            type: "url",
            filePath: "",
            url: res.outputUrl,
            bitrate: "320",
          };
          setQualityRows([...qualityRows, newRow]);
          setQualityEnabled(true);
        }
      }
    } catch (error: any) {
      console.error("Normalization failed:", error);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!artist.trim()) {
      toast({ title: "Artist is required", variant: "destructive" });
      return;
    }
    if (!audioUrl && !audioFilePath) {
      toast({ title: "Please upload or provide an audio URL", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        artist: artist.trim(),
        artistId: artistId,
        album: album.trim(),
        albumId: albumId,
        description,
        shortDescription,
        thumbnail: thumbnail.filePath,
        coverImage: coverImage.filePath,
        bannerImage: bannerImage.filePath,
        audioUrl: audioUrl || audioFilePath,
        duration: duration ? Number(duration) : undefined,
        genre: genre || undefined,
        category: category || undefined,
        language: language || undefined,
        country,
        tags,
        status,
        featured,
        trending,
        isNewContent,
        isExclusive,
        downloadAllowed,
        planRequired,
        lyrics,
        trackNumber: trackNumber ? Number(trackNumber) : undefined,
        bitrate: bitrate ? Number(bitrate) : undefined,
        sampleRate: sampleRate ? Number(sampleRate) : undefined,
        releaseDate: releaseDate || undefined,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || description,
        audioQualities: qualityEnabled
          ? qualityRows.filter((q) => q.url || q.filePath).map((q) => ({
              quality: q.quality,
              url: q.url || q.filePath,
              bitrate: Number(q.bitrate) || 320,
              size: 0,
            }))
          : [],
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: payload });
        toast({ title: "Audio updated successfully" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Audio created successfully" });
      }
      setLocation("/audio");
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

  if (isEdit && loadingAudio) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{isEdit ? "Edit Audio" : "Add New Audio"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/audio")} className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white">
            {isSaving ? "Saving..." : isEdit ? "Update Audio" : "Create Audio"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Media Section */}
        <SectionCard title="Media Files" icon={Music}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageBox label="Thumbnail" preview={thumbnail.preview} onOpen={() => setThumbnailPickerOpen(true)} />
            <ImageBox label="Cover Image" preview={coverImage.preview} onOpen={() => setCoverPickerOpen(true)} />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Audio File *</Label>
            <div className="flex gap-2">
              <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Audio URL or file path" className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              <Button type="button" variant="outline" onClick={() => setAudioPickerOpen(true)} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <UploadIcon className="w-4 h-4 mr-2" />
                Media Library
              </Button>
            </div>
            {audioFilePath && <p className="text-xs text-gray-500">Selected: {audioFilePath}</p>}
            
            {/* Audio Preview Player */}
            {audioPreviewUrl && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-2 font-medium">Preview:</p>
                <audio 
                  controls 
                  src={audioPreviewUrl} 
                  className="w-full h-10"
                  preload="metadata"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Basic Info */}
        <SectionCard title="Basic Information" icon={Info}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Artist *</Label>
              <div className="relative">
                <Select value={artistId} onValueChange={(val) => {
                  setArtistId(val);
                  const selectedArtist = artistsList.find((a: any) => a.id === val);
                  if (selectedArtist) setArtist(selectedArtist.name);
                }}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select or type artist" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <div className="p-2">
                      <Input
                        placeholder="Search artists..."
                        value={artistSearchQuery}
                        onChange={(e) => setArtistSearchQuery(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white mb-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {artistsList
                      .filter((a: any) => !artistSearchQuery || a.name.toLowerCase().includes(artistSearchQuery.toLowerCase()))
                      .map((a: any) => (
                        <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">
                          <div className="flex items-center justify-between w-full">
                            <span>{a.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setLocation(`/audio-artists/${a.id}/edit`); }}
                              className="ml-2 p-1 rounded hover:bg-gray-600"
                            >
                              <Edit2 className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </SelectItem>
                      ))}
                    <SelectItem value="__new__" className="text-white hover:bg-gray-700 border-t border-gray-600">
                      <div className="flex items-center gap-2 text-green-400">
                        <Plus className="w-4 h-4" />
                        <span>Add New Artist</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!artistId && (
                  <Input 
                    value={artist} 
                    onChange={(e) => setArtist(e.target.value)} 
                    placeholder="Or type artist name manually" 
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 mt-2" 
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Album</Label>
              <div className="relative">
                <Select value={albumId} onValueChange={(val) => {
                  setAlbumId(val);
                  const selectedAlbum = albumsList.find((a: any) => a.id === val);
                  if (selectedAlbum) setAlbum(selectedAlbum.name);
                }}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select or type album" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <div className="p-2">
                      <Input
                        placeholder="Search albums..."
                        value={albumSearchQuery}
                        onChange={(e) => setAlbumSearchQuery(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white mb-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {albumsList
                      .filter((a: any) => !albumSearchQuery || a.name.toLowerCase().includes(albumSearchQuery.toLowerCase()))
                      .map((a: any) => (
                        <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">
                          <div className="flex items-center justify-between w-full">
                            <span>{a.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setLocation(`/audio-albums/${a.id}/edit`); }}
                              className="ml-2 p-1 rounded hover:bg-gray-600"
                            >
                              <Edit2 className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </SelectItem>
                      ))}
                    <SelectItem value="__new__" className="text-white hover:bg-gray-700 border-t border-gray-600">
                      <div className="flex items-center gap-2 text-green-400">
                        <Plus className="w-4 h-4" />
                        <span>Add New Album</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!albumId && (
                  <Input 
                    value={album} 
                    onChange={(e) => setAlbum(e.target.value)} 
                    placeholder="Or type album name manually" 
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 mt-2" 
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Track Number</Label>
              <Input type="number" value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Duration (seconds)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Release Date</Label>
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Short Description</Label>
            <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
        </SectionCard>

        {/* Classification */}
        <SectionCard title="Classification" icon={Settings} defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label className="text-gray-300">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {categoriesList.map((c: any) => (
                    <SelectItem key={c.id || c._id} value={c.id || c._id} className="text-white hover:bg-gray-700">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {languagesList.map((l: any) => (
                    <SelectItem key={l.id || l._id} value={l.id || l._id} className="text-white hover:bg-gray-700">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {countries.map((c: any) => (
                    <SelectItem key={c.id || c._id} value={c.id || c._id} className="text-white hover:bg-gray-700">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Bitrate (kbps)</Label>
              <Input type="number" value={bitrate} onChange={(e) => setBitrate(e.target.value)} placeholder="320" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Sample Rate (Hz)</Label>
              <Input type="number" value={sampleRate} onChange={(e) => setSampleRate(e.target.value)} placeholder="44100" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Tags (comma separated)</Label>
            <Input value={tagInput} onChange={(e) => {
              setTagInput(e.target.value);
              setTags(e.target.value.split(",").map((t) => t.trim()).filter(Boolean));
            }} placeholder="pop, romantic, 2024" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
        </SectionCard>

        {/* Lyrics */}
        <SectionCard title="Lyrics (Optional)" icon={FileText} defaultOpen={false}>
          <Textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={10} placeholder="Enter lyrics here..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
        </SectionCard>

        {/* Audio Normalization */}
        <SectionCard title="Audio Loudness Normalization" icon={Sparkles} defaultOpen={false}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mt-1">Normalize audio to ensure consistent volume levels across all tracks</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={normalizeEnabled} onCheckedChange={setNormalizeEnabled} />
              <Label className="text-gray-300">Enable</Label>
            </div>
          </div>
          {normalizeEnabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Target Loudness (LUFS)</Label>
                  <Input type="number" value={targetLoudness} onChange={(e) => setTargetLoudness(e.target.value)} placeholder="-14" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  <p className="text-xs text-gray-500">Standard: -14 (YouTube/Spotify)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">True Peak (dBTP)</Label>
                  <Input type="number" value={truePeak} onChange={(e) => setTruePeak(e.target.value)} placeholder="-1" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  <p className="text-xs text-gray-500">Max: -1 dBTP</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Loudness Range (LU)</Label>
                  <Input type="number" value={loudnessRange} onChange={(e) => setLoudnessRange(e.target.value)} placeholder="11" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  <p className="text-xs text-gray-500">Target range</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleAnalyzeLoudness} disabled={isAnalyzing || (!audioUrl && !audioFilePath)} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  {isAnalyzing ? "Analyzing..." : "Analyze Loudness"}
                </Button>
                <Button type="button" onClick={handleNormalize} disabled={isNormalizing || (!audioUrl && !audioFilePath)} className="bg-red-600 hover:bg-red-500 text-white">
                  {isNormalizing ? "Normalizing..." : "Normalize Audio"}
                </Button>
              </div>
              {loudnessInfo && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-white">Current Loudness Analysis</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500">Integrated:</span><span className="text-white ml-2">{Number(loudnessInfo.inputI).toFixed(1)} LUFS</span></div>
                    <div><span className="text-gray-500">True Peak:</span><span className="text-white ml-2">{Number(loudnessInfo.inputTp).toFixed(1)} dBTP</span></div>
                    <div><span className="text-gray-500">LRA:</span><span className="text-white ml-2">{Number(loudnessInfo.inputLra).toFixed(1)} LU</span></div>
                    <div><span className="text-gray-500">Threshold:</span><span className="text-white ml-2">{Number(loudnessInfo.inputThresh).toFixed(1)} LUFS</span></div>
                  </div>
                </div>
              )}
              {normalizedUrl && (
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <p className="text-green-400 text-sm">Normalization complete! Added as a quality option.</p>
                  <p className="text-xs text-gray-500 mt-1 break-all">{normalizedUrl}</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Settings */}
        <SectionCard title="Settings" icon={Settings} defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="draft" className="text-white hover:bg-gray-700">Draft</SelectItem>
                  <SelectItem value="published" className="text-white hover:bg-gray-700">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Plan Required</Label>
              <Select value={planRequired} onValueChange={(v: any) => setPlanRequired(v)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="free" className="text-white hover:bg-gray-700">Free</SelectItem>
                  <SelectItem value="basic" className="text-white hover:bg-gray-700">Basic</SelectItem>
                  <SelectItem value="standard" className="text-white hover:bg-gray-700">Standard</SelectItem>
                  <SelectItem value="premium" className="text-white hover:bg-gray-700">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={featured} onCheckedChange={setFeatured} />
              <Label className="text-gray-300">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={trending} onCheckedChange={setTrending} />
              <Label className="text-gray-300">Trending</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isNewContent} onCheckedChange={setIsNewContent} />
              <Label className="text-gray-300">New Content</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={downloadAllowed} onCheckedChange={setDownloadAllowed} />
              <Label className="text-gray-300">Download Allowed</Label>
            </div>
          </div>
        </SectionCard>

        {/* SEO */}
        <SectionCard title="SEO Settings" icon={FileText} defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="custom-url-slug" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Meta Title</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Meta Description</Label>
            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
        </SectionCard>

        {/* Audio Quality */}
        <SectionCard title="Audio Quality" icon={Music} defaultOpen={false}>
          <div className="flex items-center justify-between">
            <Label className="text-gray-300">Enable Quality Options</Label>
            <Switch checked={qualityEnabled} onCheckedChange={setQualityEnabled} />
          </div>
          {qualityEnabled && (
            <div className="space-y-3">
              {qualityRows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-gray-800/50 p-4 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Quality</Label>
                    <Select value={row.quality} onValueChange={(v) => {
                      const rows = [...qualityRows];
                      rows[idx].quality = v as any;
                      setQualityRows(rows);
                    }}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="low" className="text-white hover:bg-gray-700">Low (128 kbps)</SelectItem>
                        <SelectItem value="medium" className="text-white hover:bg-gray-700">Medium (192 kbps)</SelectItem>
                        <SelectItem value="high" className="text-white hover:bg-gray-700">High (320 kbps)</SelectItem>
                        <SelectItem value="lossless" className="text-white hover:bg-gray-700">Lossless (FLAC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Type</Label>
                    <Select value={row.type} onValueChange={(v) => {
                      const rows = [...qualityRows];
                      rows[idx].type = v;
                      setQualityRows(rows);
                    }}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="url" className="text-white hover:bg-gray-700">URL</SelectItem>
                        <SelectItem value="local" className="text-white hover:bg-gray-700">Media Library</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">{row.type === "url" ? "URL" : "File"}</Label>
                    {row.type === "url" ? (
                      <Input value={row.url} onChange={(e) => {
                        const rows = [...qualityRows];
                        rows[idx].url = e.target.value;
                        setQualityRows(rows);
                      }} placeholder="https://..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                    ) : (
                      <div className="flex gap-1">
                        <Input value={row.filePath} readOnly placeholder="Select file" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                        <Button type="button" variant="outline" size="icon" onClick={() => {
                          setCurrentQualityRowId(row.id);
                          setQualityPickerOpen(true);
                        }} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                          <span className="text-xs">📁</span>
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Bitrate (kbps)</Label>
                    <Input type="number" value={row.bitrate} onChange={(e) => {
                      const rows = [...qualityRows];
                      rows[idx].bitrate = e.target.value;
                      setQualityRows(rows);
                    }} placeholder="320" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => {
                    setQualityRows(qualityRows.filter((r) => r.id !== row.id));
                  }} className="text-red-400 hover:text-red-300 hover:bg-gray-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => {
                setQualityRows([...qualityRows, { id: String(Date.now()), quality: "medium", type: "url", filePath: "", url: "", bitrate: "192" }]);
              }} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Quality
              </Button>
            </div>
          )}
        </SectionCard>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setLocation("/audio")} className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
          <Button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-500 text-white">
            {isSaving ? "Saving..." : isEdit ? "Update Audio" : "Create Audio"}
          </Button>
        </div>
      </form>

      <MediaPicker open={thumbnailPickerOpen} onClose={() => setThumbnailPickerOpen(false)} onSelect={(m: any) => { setThumbnail({ filePath: m.filePath, preview: m.url }); setThumbnailPickerOpen(false); }} source="audio" accept="image/*" />
      <MediaPicker open={coverPickerOpen} onClose={() => setCoverPickerOpen(false)} onSelect={(m: any) => { setCoverImage({ filePath: m.filePath, preview: m.url }); setCoverPickerOpen(false); }} source="audio" accept="image/*" />
      <MediaPicker open={audioPickerOpen} onClose={() => setAudioPickerOpen(false)} onSelect={handleAudioSelect} source="audio" accept="audio/*" />
      <MediaPicker open={qualityPickerOpen} onClose={() => setQualityPickerOpen(false)} onSelect={(m: any) => {
        if (currentQualityRowId) {
          const rows = qualityRows.map((r) => r.id === currentQualityRowId ? { ...r, filePath: m.filePath } : r);
          setQualityRows(rows);
        }
        setQualityPickerOpen(false);
      }} source="audio" accept="audio/*" />
    </div>
  );
}
