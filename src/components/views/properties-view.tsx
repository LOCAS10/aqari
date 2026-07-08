"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Search,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  Loader2,
  Eye,
  MapPin,
  Phone,
  Bed,
  Bath,
  Maximize,
  ArrowRight,
  Play,
  Mic,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyImage {
  id: string;
  url: string;
}

interface PropertyVideo {
  id: string;
  url: string;
}

interface PropertyAudio {
  id: string;
  url: string;
}

interface PropertyInquiry {
  id: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
}

interface Property {
  id: string;
  title: string;
  description: string | null;
  propertyType: "APARTMENT" | "VILLA" | "LAND";
  transactionType: "SALE" | "RENT";
  price: number;
  area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  city: string | null;
  address: string | null;
  location: string | null;
  features: string[];
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "RENTED";
  contactPhone: string | null;
  images: string[];
  videos: string[];
  audios: string[];
  inquiries?: any[];
  _count?: { inquiries: number };
  createdAt: string;
  updatedAt: string;
}

function mapProperty(raw: any): Property {
  return {
    ...raw,
    images: safeParse(raw.images),
    videos: safeParse(raw.videos),
    audios: safeParse(raw.audios),
    features: safeParse(raw.features),
  };
}

function safeParse(val: any): any[] {
  if (!val) return [];
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  if (Array.isArray(val)) return val;
  return [];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-DZ");
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("ar-DZ").format(price) + " د.ج";
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "شقة",
  VILLA: "فيلا",
  LAND: "أرض",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  SALE: "بيع",
  RENT: "كراء",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  AVAILABLE: { label: "متاح", className: "bg-green-100 text-green-700" },
  RESERVED: { label: "محجوز", className: "bg-yellow-100 text-yellow-700" },
  SOLD: { label: "مباع", className: "bg-red-100 text-red-700" },
  RENTED: { label: "مؤجر", className: "bg-blue-100 text-blue-700" },
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  APARTMENT: "bg-blue-100 text-blue-700",
  VILLA: "bg-emerald-100 text-emerald-700",
  LAND: "bg-amber-100 text-amber-700",
};

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  SALE: "bg-slate-100 text-slate-700",
  RENT: "bg-cyan-100 text-cyan-700",
};

// ---------------------------------------------------------------------------
// Image placeholder component
// ---------------------------------------------------------------------------

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-muted ${className ?? ""}`}
    >
      <Building2 className="size-8 text-muted-foreground" />
    </div>
  );
}

// ===========================================================================
// PropertiesView
// ===========================================================================

interface PropertiesViewProps {
  onSelectProperty: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function PropertiesView({ onSelectProperty, onEdit }: PropertiesViewProps) {
  const queryClient = useQueryClient();

  // ---- State ----
  const [search, setSearch] = React.useState("");
  const [propertyType, setPropertyType] = React.useState<string>("ALL");
  const [transactionType, setTransactionType] = React.useState<string>("ALL");
  const [status, setStatus] = React.useState<string>("ALL");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [deleteTarget, setDeleteTarget] = React.useState<Property | null>(
    null
  );

  // ---- Data fetching ----
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties");
      if (!res.ok) throw new Error("فشل في تحميل العقارات");
      const json = await res.json();
      return (json.properties || []).map(mapProperty);
    },
  });

  // ---- Delete mutation ----
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في حذف العقار");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("تم حذف العقار بنجاح");
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف العقار");
    },
  });

  // ---- Filtering ----
  const filtered = React.useMemo(() => {
    try {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(properties) ? properties : [];
    return list.filter((p: any) => {
      if (
        q &&
        !(p.title || "").toLowerCase().includes(q) &&
        !((p.description || "")).toLowerCase().includes(q) &&
        !((p.address || "")).toLowerCase().includes(q)
      )
        return false;
      if (propertyType !== "ALL" && p.propertyType !== propertyType) return false;
      if (transactionType !== "ALL" && p.transactionType !== transactionType)
        return false;
      if (status !== "ALL" && p.status !== status) return false;
      return true;
    });
    } catch(e: any) { console.error('filter error:', e); return []; }
  }, [properties, search, propertyType, transactionType, status]);

  // ---- Render helpers ----
  const thumb = (p: Property, size = "h-12 w-16") => {
    if (p.images?.length > 0 && typeof p.images[0] === 'string') {
      return (
        <img
          src={p.images[0]}
          alt={p.title}
          className={`object-cover rounded-md ${size}`}
        />
      );
    }
    return <ImagePlaceholder className={size} />;
  };

  const statusBadge = (s: string) => {
    const cfg = STATUS_CONFIG[s] ?? { label: s, className: "" };
    return (
      <Badge variant="outline" className={cfg.className}>
        {cfg.label}
      </Badge>
    );
  };

  const typeBadge = (t: string) => (
    <Badge variant="outline" className={PROPERTY_TYPE_COLORS[t] ?? ""}>
      {PROPERTY_TYPE_LABELS[t] ?? t}
    </Badge>
  );

  const transactionBadge = (t: string) => (
    <Badge variant="outline" className={TRANSACTION_TYPE_COLORS[t] ?? ""}>
      {TRANSACTION_TYPE_LABELS[t] ?? t}
    </Badge>
  );

  // ---- JSX ----
  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* ========== Filter bar ========== */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="size-5" />
            العقارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[220px]">
              <Label className="mb-1.5">بحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالعنوان، الوصف، العنوان..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>

            {/* Property type */}
            <div className="w-[150px]">
              <Label className="mb-1.5">نوع العقار</Label>
              <Select
                value={propertyType}
                onValueChange={setPropertyType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  <SelectItem value="APARTMENT">شقق</SelectItem>
                  <SelectItem value="VILLA">فيلات</SelectItem>
                  <SelectItem value="LAND">أراضي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction type */}
            <div className="w-[150px]">
              <Label className="mb-1.5">نوع العملية</Label>
              <Select
                value={transactionType}
                onValueChange={setTransactionType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  <SelectItem value="SALE">بيع</SelectItem>
                  <SelectItem value="RENT">كراء</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="w-[150px]">
              <Label className="mb-1.5">الحالة</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  <SelectItem value="AVAILABLE">متاح</SelectItem>
                  <SelectItem value="RESERVED">محجوز</SelectItem>
                  <SelectItem value="SOLD">مباع</SelectItem>
                  <SelectItem value="RENTED">مؤجر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View toggle */}
            <div className="flex gap-1 self-end">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("table")}
                title="عرض جدولي"
              >
                <List className="size-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                title="عرض شبكي"
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== Content ========== */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Home className="size-12" />
            <p className="text-lg font-medium">لا توجد عقارات</p>
            <p className="text-sm">لم يتم العثور على عقارات تطابق معايير البحث</p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* ---------- Table view ---------- */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">صورة</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">العملية</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">المساحة</TableHead>
                  <TableHead className="text-right">المدينة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">استفسارات</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((property) => (
                  <TableRow
                    key={property.id}
                    className="cursor-pointer"
                    onClick={() => onSelectProperty(property.id)}
                  >
                    <TableCell>{thumb(property)}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {property.title}
                    </TableCell>
                    <TableCell>{typeBadge(property.propertyType)}</TableCell>
                    <TableCell>
                      {transactionBadge(property.transactionType)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(property.price)}
                    </TableCell>
                    <TableCell>
                      {property.area} م²
                    </TableCell>
                    <TableCell>{property.city}</TableCell>
                    <TableCell>{statusBadge(property.status)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        {property.inquiryCount ?? property.inquiries?.length ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => onSelectProperty(property.id)}
                          title="عرض"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => onEdit?.(property.id)}
                          title="تعديل"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(property)}
                          title="حذف"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* ---------- Grid view ---------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((property) => (
            <Card
              key={property.id}
              className="cursor-pointer transition-shadow hover:shadow-md py-0 gap-0 overflow-hidden"
              onClick={() => onSelectProperty(property.id)}
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] w-full relative">
                {property.images?.length > 0 && typeof property.images[0] === 'string' ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlaceholder className="w-full h-full" />
                )}
                {/* Status overlay */}
                <div className="absolute top-2 left-2">
                  {statusBadge(property.status)}
                </div>
              </div>

              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                  {property.title}
                </h3>
                <p className="text-base font-bold text-primary">
                  {formatPrice(property.price)}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span className="truncate">{property.city || ''}{property.city && property.address ? '، ' : ''}{property.address || ''}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {typeBadge(property.propertyType)}
                  {transactionBadge(property.transactionType)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ========== Delete confirmation dialog ========== */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm leading-relaxed">
            هل أنت متأكد من حذف العقار{" "}
            <span className="font-semibold text-foreground">
              &quot;{deleteTarget?.title}&quot;
            </span>
            ؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===========================================================================
// PropertyDetailView
// ===========================================================================

interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
}

export function PropertyDetailView({
  propertyId,
  onBack,
}: PropertyDetailViewProps) {
  const queryClient = useQueryClient();

  // ---- Fetch property ----
  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["properties", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) throw new Error("فشل في تحميل العقار");
      const json = await res.json();
      return mapProperty(json.property);
    },
    enabled: !!propertyId,
  });

  // ---- Image gallery state ----
  const [api, setApi] = React.useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentSlide(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // ---- Inquiry form state ----
  const [inquiryName, setInquiryName] = React.useState("");
  const [inquiryPhone, setInquiryPhone] = React.useState("");
  const [inquiryMessage, setInquiryMessage] = React.useState("");

  // ---- Submit inquiry mutation ----
  const inquiryMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      message: string;
    }) => {
      const res = await fetch(`/api/properties/${propertyId}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("فشل في إرسال الاستفسار");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["properties", propertyId],
      });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("تم إرسال الاستفسار بنجاح");
      setInquiryName("");
      setInquiryPhone("");
      setInquiryMessage("");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إرسال الاستفسار");
    },
  });

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryPhone.trim()) return;
    inquiryMutation.mutate({
      name: inquiryName,
      phone: inquiryPhone,
      message: inquiryMessage,
    });
  };

  // ---- Loading ----
  if (isLoading) {
    return (
      <div dir="rtl" className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div dir="rtl" className="max-w-7xl mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <X className="size-12" />
            <p className="text-lg font-medium">لم يتم العثور على العقار</p>
            <Button variant="outline" onClick={onBack}>
              <ArrowRight className="size-4" />
              العودة للقائمة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = property.images ?? [];
  const videos = property.videos ?? [];
  const audios = property.audios ?? [];
  const inquiries = property.inquiries ?? [];

  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* ========== Back button ========== */}
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowRight className="size-4" />
        العودة للقائمة
      </Button>

      {/* ========== Image Gallery ========== */}
      {images.length > 0 && (
        <Card className="overflow-hidden py-0 gap-0">
          <div className="relative px-8 py-4">
            <Carousel setApi={setApi} opts={{ loop: true }}>
              <CarouselContent>
                {images.map((img, idx) => (
                  <CarouselItem key={idx}>
                    <div className="aspect-[16/9] w-full rounded-lg overflow-hidden bg-muted">
                      <img
                        src={typeof img === 'string' ? img : img.url}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="right-2 left-auto" />
              <CarouselNext className="left-2 right-auto" />
            </Carousel>

            {/* Dots indicator */}
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => api?.scrollTo(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlide
                        ? "w-6 bg-primary"
                        : "w-2 bg-muted-foreground/30"
                    }`}
                    aria-label={`الانتقال للصورة ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ========== Property Info ========== */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{property.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const cfg = STATUS_CONFIG[property.status];
                  return cfg ? (
                    <Badge variant="outline" className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  ) : null;
                })()}
                <Badge
                  variant="outline"
                  className={PROPERTY_TYPE_COLORS[property.propertyType] ?? ""}
                >
                  {PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
                </Badge>
                <Badge
                  variant="outline"
                  className={TRANSACTION_TYPE_COLORS[property.transactionType] ?? ""}
                >
                  {TRANSACTION_TYPE_LABELS[property.transactionType] ??
                    property.transactionType}
                </Badge>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(property.price)}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {property.area != null && (
              <div className="flex items-center gap-2 text-sm">
                <Maximize className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">المساحة</p>
                  <p className="font-medium">{property.area} م²</p>
                </div>
              </div>
            )}
            {property.rooms != null && (
              <div className="flex items-center gap-2 text-sm">
                <Bed className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">الغرف</p>
                  <p className="font-medium">{property.rooms}</p>
                </div>
              </div>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-2 text-sm">
                <Bath className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">الحمامات</p>
                  <p className="font-medium">{property.bathrooms}</p>
                </div>
              </div>
            )}
            {property.floor != null && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">الطابق</p>
                  <p className="font-medium">{property.floor}</p>
                </div>
              </div>
            )}
            {property.contactPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">الهاتف</p>
                  <p className="font-medium" dir="ltr">
                    {property.contactPhone}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1">
            <h4 className="font-medium text-sm">الموقع</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>
                {property.city}، {property.address}
                {property.location ? ` — ${property.location}` : ""}
              </span>
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="space-y-1">
              <h4 className="font-medium text-sm">الوصف</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          )}

          {/* Features */}
          {property.features && property.features.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">المميزات</h4>
              <div className="flex flex-wrap gap-2">
                {property.features.map((feature, idx) => (
                  <Badge key={idx} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground border-t pt-4">
            <span>تاريخ الإنشاء: {formatDate(property.createdAt)}</span>
            <span>آخر تحديث: {formatDate(property.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ========== Videos ========== */}
      {videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play className="size-5" />
              الفيديوهات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video, idx) => (
                <div
                  key={idx}
                  className="aspect-video rounded-lg overflow-hidden bg-muted"
                >
                  <video
                    src={typeof video === 'string' ? video : video.url}
                    controls
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== Audios ========== */}
      {audios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="size-5" />
              التسجيلات الصوتية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audios.map((audio, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                >
                  <div className="flex items-center justify-center size-10 rounded-full bg-primary/10">
                    <Mic className="size-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">تسجيل صوتي {idx + 1}</p>
                    <audio
                      src={typeof audio === 'string' ? audio : audio.url}
                      controls
                      className="w-full mt-1"
                      preload="metadata"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== Inquiries ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="size-5" />
            الاستفسارات ({inquiries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inquiry list */}
          {inquiries.length > 0 ? (
            <div className="space-y-3">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="p-4 rounded-lg border bg-background space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {inquiry.name}
                      </span>
                      <span
                        className="text-xs text-muted-foreground"
                        dir="ltr"
                      >
                        {inquiry.phone}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(inquiry.createdAt)}
                    </span>
                  </div>
                  {inquiry.message && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {inquiry.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              لا توجد استفسارات بعد
            </p>
          )}

          {/* Add inquiry form */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-sm mb-4">إضافة استفسار جديد</h4>
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inquiry-name">الاسم</Label>
                  <Input
                    id="inquiry-name"
                    placeholder="اسم المستفسر"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inquiry-phone">الهاتف</Label>
                  <Input
                    id="inquiry-phone"
                    placeholder="رقم الهاتف"
                    value={inquiryPhone}
                    onChange={(e) => setInquiryPhone(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inquiry-message">الرسالة</Label>
                <Textarea
                  id="inquiry-message"
                  placeholder="اكتب الرسالة هنا..."
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                disabled={inquiryMutation.isPending}
                className="gap-2"
              >
                {inquiryMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Phone className="size-4" />
                )}
                إرسال الاستفسار
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}