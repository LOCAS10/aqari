"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Save,
  X,
  Upload,
  Image,
  Video,
  Mic,
  MicOff,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAgentContext } from "@/contexts/agent-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyFormProps {
  editId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface UploadedFile {
  url: string;
  name: string;
  progress: number;
  uploading: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "FURNISHED_APARTMENT", label: "شقة مفروشة" },
  { value: "APARTMENT", label: "شقة فارغة" },
  { value: "COMMERCIAL", label: "محل تجاري" },
  { value: "VILLA", label: "فيلا" },
  { value: "FURNISHED_VILLA", label: "فيلا مفروشة" },
  { value: "WAREHOUSE", label: "هنكار" },
  { value: "LAND", label: "أرض" },
];

const TRANSACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "RENT", label: "كراء" },
  { value: "SALE", label: "بيع" },
  { value: "BUY", label: "شراء" },
  { value: "MORTGAGE", label: "رهن" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "AVAILABLE", label: "متاح" },
  { value: "RESERVED", label: "محجوز" },
  { value: "SOLD", label: "مباع" },
  { value: "RENTED", label: "مؤجر" },
];

const FEATURE_OPTIONS: { value: string; label: string }[] = [
  { value: "elevator", label: "مصعد" },
  { value: "parking", label: "موقف سيارات" },
  { value: "garden", label: "حديقة" },
  { value: "pool", label: "مسبح" },
  { value: "security", label: "حارس أمن" },
  { value: "ac", label: "تكييف" },
  { value: "furnished_kitchen", label: "مطبخ مؤثث" },
  { value: "near_transport", label: "قريبة من المواصلات" },
  { value: "balcony", label: "بالكونة" },
  { value: "sea_view", label: "إطلالة بحرية" },
  { value: "near_mosque", label: "قريب من المسجد" },
  { value: "near_school", label: "قريب من المدرسة" },
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];

// ---------------------------------------------------------------------------
// Upload helper - server-side file upload
// ---------------------------------------------------------------------------

async function uploadFile(file: File, resourceType: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('resourceType', resourceType);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'فشل في رفع الملف' }));
    throw new Error(err.error || 'فشل في رفع الملف');
  }

  const data = await res.json();
  return data.url;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PropertyForm({
  editId,
  onSaved,
  onCancel,
}: PropertyFormProps) {
  const queryClient = useQueryClient();

  // -- form state -----------------------------------------------------------
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [floor, setFloor] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [status, setStatus] = useState("AVAILABLE");
  const [contactPhone, setContactPhone] = useState("");

  // -- media state ----------------------------------------------------------
  const [images, setImages] = useState<UploadedFile[]>([]);
  const [videos, setVideos] = useState<UploadedFile[]>([]);
  const [audios, setAudios] = useState<UploadedFile[]>([]);

  // -- audio recording ------------------------------------------------------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // -- refs -----------------------------------------------------------------
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // -- saving state ---------------------------------------------------------
  const [isSaving, setIsSaving] = useState(false);

  // Auto-assign current agent from PIN login
  const { agentId: currentAgentId } = useAgentContext();

  // Fetch property for editing
  const { data: editProperty, isLoading: isLoadingProperty } = useQuery({
    queryKey: ["property", editId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${editId}`);
      if (!res.ok) throw new Error("فشل في تحميل بيانات العقار");
      return res.json();
    },
    enabled: !!editId,
  });

  // Load edit data
  useEffect(() => {
    if (!editProperty?.property) return;
    const p = editProperty.property;
    setTitle(p.title ?? "");
    setDescription(p.description ?? "");
    setPropertyType(p.propertyType ?? "");
    setTransactionType(p.transactionType ?? "");
    setPrice(p.price != null ? String(p.price) : "");
    setArea(p.area != null ? String(p.area) : "");
    setAddress(p.address ?? "");
    setLocation(p.location ?? "");
    setRooms(p.rooms != null ? String(p.rooms) : "");
    setBathrooms(p.bathrooms != null ? String(p.bathrooms) : "");
    setFloor(p.floor != null ? String(p.floor) : "");
    setStatus(p.status ?? "AVAILABLE");
    setContactPhone(p.contactPhone ?? "");

    const safeParse = (val: any): any[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    setFeatures(safeParse(p.features));
    setImages(safeParse(p.images).map((url: string, i: number) => ({
      url, name: `صورة ${i + 1}`, progress: 100, uploading: false,
    })));
    setVideos(safeParse(p.videos).map((url: string, i: number) => ({
      url, name: `فيديو ${i + 1}`, progress: 100, uploading: false,
    })));
    setAudios(safeParse(p.audios).map((url: string, i: number) => ({
      url, name: `تسجيل ${i + 1}`, progress: 100, uploading: false,
    })));
  }, [editProperty]);

  // =========================================================================
  // Conditional display logic
  // =========================================================================
  const isApartmentOrVilla =
    propertyType === "APARTMENT" ||
    propertyType === "VILLA" ||
    propertyType === "FURNISHED_APARTMENT" ||
    propertyType === "FURNISHED_VILLA";

  const isApartment =
    propertyType === "APARTMENT" ||
    propertyType === "FURNISHED_APARTMENT";

  const toggleFeature = useCallback((value: string) => {
    setFeatures((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  }, []);

  // =========================================================================
  // Media upload helpers
  // =========================================================================
  async function handleFileUpload(
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    resourceType: string = 'image'
  ) {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Add placeholder
      setter((prev) => [
        ...prev,
        { url: "", name: file.name, progress: 20, uploading: true },
      ]);

      try {
        // Upload to server
        const url = await uploadFile(file, resourceType);
        setter((prev) =>
          prev.map((item) =>
            item.name === file.name && item.uploading
              ? { ...item, url, uploading: false, progress: 100 }
              : item
          )
        );
      } catch (err: any) {
        toast.error(`فشل في رفع: ${file.name} - ${err.message}`);
        setter((prev) => prev.filter((item) => !(item.name === file.name && item.uploading)));
      }
    }
  }

  function removeMediaItem(
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    index: number
  ) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  // -- drag & drop ----------------------------------------------------------
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(
    e: React.DragEvent,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    resourceType: string = 'image'
  ) {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files, setter, resourceType);
  }

  // -- audio recording ------------------------------------------------------
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `تسجيل-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const url = await uploadFile(file, 'audio');
          setAudios((prev) => [
            ...prev,
            { url, name: file.name, progress: 100, uploading: false },
          ]);
        } catch (err: any) {
          toast.error(err.message || "فشل في حفظ التسجيل الصوتي");
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error("لم يتم السماح بالوصول إلى الميكروفون");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // =========================================================================
  // Submit - using plain fetch for maximum reliability
  // =========================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!propertyType) {
      toast.error("يرجى اختيار نوع العقار");
      return;
    }
    if (!transactionType) {
      toast.error("يرجى اختيار نوع العملية");
      return;
    }
    if (!price.trim()) {
      toast.error("يرجى إدخال السعر");
      return;
    }

    // Check if media is still uploading
    const stillUploading =
      images.some((img) => img.uploading) ||
      videos.some((vid) => vid.uploading) ||
      audios.some((aud) => aud.uploading);
    if (stillUploading) {
      toast.error("يرجى الانتظار حتى اكتمال رفع جميع الملفات");
      return;
    }

    // Build title if empty
    const finalTitle =
      title.trim() ||
      `${PROPERTY_TYPE_OPTIONS.find((t) => t.value === propertyType)?.label || "عقار"}${address.trim() ? " - " + address.trim() : ""}`;

    const payload = {
      title: finalTitle,
      description: description.trim() || null,
      propertyType,
      transactionType,
      price: Number(price) || 0,
      area: area ? Number(area) : null,
      city: null,
      address: address.trim() || null,
      location: location.trim() || null,
      rooms: rooms ? Number(rooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      floor: floor ? Number(floor) : null,
      features: features.length > 0 ? features : [],
      status: status || "AVAILABLE",
      contactPhone: contactPhone.trim() || null,
      agentId: editId ? (editProperty as any)?.property?.agentId || null : currentAgentId || null,
      images: images.map((i) => i.url).filter(Boolean),
      videos: videos.map((v) => v.url).filter(Boolean),
      audios: audios.map((a) => a.url).filter(Boolean),
    };

    console.log("[PropertyForm] Submitting payload:", {
      title: payload.title,
      propertyType: payload.propertyType,
      transactionType: payload.transactionType,
      price: payload.price,
      imagesCount: payload.images.length,
      videosCount: payload.videos.length,
      agentId: payload.agentId,
    });

    setIsSaving(true);
    try {
      const url = editId ? `/api/properties/${editId}` : "/api/properties";
      const method = editId ? "PUT" : "POST";

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      console.log("[PropertyForm] Sending request to:", url, "method:", method);
      console.log("[PropertyForm] Payload size:", JSON.stringify(payload).length, "bytes");

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: 'no-store',
        });
      } catch (fetchErr: any) {
        console.error("[PropertyForm] Fetch error:", fetchErr);
        if (fetchErr.name === 'AbortError') {
          throw new Error("انتهت مهلة الطلب، حاول مرة أخرى");
        }
        throw new Error("خطأ في الاتصال بالخادم: " + (fetchErr.message || "فشل في إرسال الطلب"));
      } finally {
        clearTimeout(timeoutId);
      }

      console.log("[PropertyForm] Response status:", res.status, res.statusText);
      console.log("[PropertyForm] Response content-type:", res.headers.get("content-type"));

      if (!res.ok) {
        let errorMsg = `خطأ ${res.status}`;
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const errData = await res.json();
            console.error("[PropertyForm] API error response:", errData);
            errorMsg = errData.error || errData.details || errorMsg;
          } catch {
            console.error("[PropertyForm] Could not parse error JSON");
          }
        } else {
          console.error("[PropertyForm] Non-JSON error response, status:", res.status);
          errorMsg = `خطأ من الخادم (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      console.log("[PropertyForm] Success:", data.property?.id);

      toast.success(editId ? "تم تحديث العقار بنجاح" : "تم إضافة العقار بنجاح");
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      if (editId) queryClient.invalidateQueries({ queryKey: ["property", editId] });
      onSaved();
    } catch (err: any) {
      console.error("[PropertyForm] Submit error:", err);
      toast.error(err.message || "فشل في حفظ العقار");
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================
  if (editId && isLoadingProperty) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="mr-2 text-muted-foreground">جاري تحميل بيانات العقار...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      <Card>
        <CardContent className="p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {editId ? "تعديل العقار" : "إضافة عقار جديد"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ---------------------------------------------------------------- */}
            {/* Basic Info Section                                                */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold border-b pb-2">المعلومات الأساسية</h3>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">العنوان</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="يتم توليده تلقائياً من نوع العقار والعنوان"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أدخل وصف العقار"
                />
              </div>

              {/* Property Type & Transaction Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع العقار</Label>
                  <Select
                    value={propertyType}
                    onValueChange={(val) => {
                      setPropertyType(val);
                      if (!["APARTMENT", "VILLA", "FURNISHED_APARTMENT", "FURNISHED_VILLA"].includes(val)) {
                        setRooms("");
                        setBathrooms("");
                        setFloor("");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر نوع العقار" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>نوع العملية</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر نوع العملية" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price & Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">
                    السعر (درهم مغربي) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="أدخل السعر"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">المساحة م²</Label>
                  <Input
                    id="area"
                    type="number"
                    min="0"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="أدخل المساحة"
                  />
                </div>
              </div>

              {/* Location & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">الموقع</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="أدخل الموقع أو رابط الخريطة"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="أدخل العنوان التفصيلي"
                  />
                </div>
              </div>

              {/* Conditional fields: Rooms, Bathrooms, Floor */}
              {isApartmentOrVilla && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rooms">عدد الغرف</Label>
                    <Input
                      id="rooms"
                      type="number"
                      min="0"
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value)}
                      placeholder="عدد الغرف"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">عدد الحمامات</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      min="0"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      placeholder="عدد الحمامات"
                    />
                  </div>
                </div>
              )}

              {isApartment && (
                <div className="space-y-2">
                  <Label htmlFor="floor">الطابق</Label>
                  <Input
                    id="floor"
                    type="number"
                    min="0"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="رقم الطابق"
                  />
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Features Section                                                 */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">المميزات</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FEATURE_OPTIONS.map((feature) => (
                  <div key={feature.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`feature-${feature.value}`}
                      checked={features.includes(feature.value)}
                      onCheckedChange={() => toggleFeature(feature.value)}
                    />
                    <Label
                      htmlFor={`feature-${feature.value}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {feature.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Status & Contact                                                 */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold border-b pb-2">الحالة و التواصل</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">هاتف التواصل</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="أدخل رقم الهاتف"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Images Section                                                   */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                <Image className="inline-block h-5 w-5 ml-2" />
                الصور
              </h3>

              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setImages, 'image')}
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  اسحب الصور هنا أو انقر للاختيار
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP, GIF
                </p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFileUpload(e.target.files, setImages, 'image');
                    e.target.value = "";
                  }}
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border">
                      {img.url ? (
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 bg-muted flex flex-col items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                      {img.uploading && (
                        <div className="absolute bottom-0 left-0 right-0">
                          <Progress value={img.progress} className="h-1 rounded-none" />
                        </div>
                      )}
                      <button
                        type="button"
                        className="absolute top-1 left-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMediaItem(setImages, idx);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Videos Section                                                   */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                <Video className="inline-block h-5 w-5 ml-2" />
                الفيديوهات
              </h3>

              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setVideos, 'video')}
                onClick={() => videoInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  اسحب الفيديوهات هنا أو انقر للاختيار
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP4, WebM, MOV
                </p>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={ACCEPTED_VIDEO_TYPES.join(",")}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFileUpload(e.target.files, setVideos, 'video');
                    e.target.value = "";
                  }}
                />
              </div>

              {videos.length > 0 && (
                <div className="space-y-2">
                  {videos.map((vid, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Video className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{vid.name}</p>
                        {vid.uploading && (
                          <Progress value={vid.progress} className="h-1.5 mt-1" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeMediaItem(setVideos, idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Audio Section                                                    */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                <Mic className="inline-block h-5 w-5 ml-2" />
                التسجيلات الصوتية
              </h3>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  رفع ملف صوتي
                </Button>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept={ACCEPTED_AUDIO_TYPES.join(",")}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFileUpload(e.target.files, setAudios, 'audio');
                    e.target.value = "";
                  }}
                />

                {isRecording ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={stopRecording}
                  >
                    <MicOff className="h-4 w-4 ml-2" />
                    إيقاف التسجيل ({formatDuration(recordingDuration)})
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={startRecording}
                  >
                    <Mic className="h-4 w-4 ml-2" />
                    تسجيل الآن
                  </Button>
                )}

                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse self-center">
                    جاري التسجيل {formatDuration(recordingDuration)}
                  </Badge>
                )}
              </div>

              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, setAudios, 'audio')}
                onClick={() => audioInputRef.current?.click()}
              >
                <p className="text-sm text-muted-foreground">
                  أو اسحب ملفات صوتية هنا (MP3, WAV, OGG, WebM)
                </p>
              </div>

              {audios.length > 0 && (
                <div className="space-y-2">
                  {audios.map((aud, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Mic className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{aud.name}</p>
                        {aud.uploading && (
                          <Progress value={aud.progress} className="h-1.5 mt-1" />
                        )}
                        {aud.url && !aud.uploading && (
                          <audio controls className="mt-1 w-full max-w-sm h-8">
                            <source src={aud.url} />
                          </audio>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeMediaItem(setAudios, idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Submit Actions                                                   */}
            {/* ---------------------------------------------------------------- */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 ml-2" />
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    {editId ? "تحديث" : "حفظ"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}