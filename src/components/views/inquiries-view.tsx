"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Phone,
  PhoneCall,
  Plus,
  Search,
  Loader2,
  Trash2,
  Eye,
  Clock,
  User,
  Building2,
  MessageSquare,
  HandMetal,
  ArrowDownUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAgentContext } from "@/contexts/agent-context";

// ─── Types ───────────────────────────────────────────────────────────────────

type InquiryStatus = "NEW" | "CONTACTED" | "FOLLOW_UP" | "CLOSED";
type InquiryType = "REQUEST" | "OFFER";
type InquirySubType = "SALE" | "RENT" | "MORTGAGE";

interface Property {
  id: string;
  title: string;
  propertyType: string;
}

const PROPERTY_TYPE_OPTIONS = [
  { value: "FURNISHED_APARTMENT", label: "شقة مفروشة" },
  { value: "APARTMENT", label: "شقة فارغة" },
  { value: "COMMERCIAL", label: "محل تجاري" },
  { value: "VILLA", label: "فيلا" },
  { value: "FURNISHED_VILLA", label: "فيلا مفروشة" },
  { value: "WAREHOUSE", label: "هنكار" },
  { value: "LAND", label: "أرض" },
];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  FURNISHED_APARTMENT: "شقة مفروشة",
  APARTMENT: "شقة فارغة",
  COMMERCIAL: "محل تجاري",
  VILLA: "فيلا",
  FURNISHED_VILLA: "فيلا مفروشة",
  WAREHOUSE: "هنكار",
  LAND: "أرض",
};

interface Inquiry {
  id: string;
  propertyId: string;
  propertyType: string;
  agentId: string;
  callerName: string;
  callerPhone: string;
  message: string;
  status: InquiryStatus;
  inquiryType: string;
  inquirySubType: string;
  createdAt: string;
  property: Property;
  agent: { id: string; name: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  InquiryStatus,
  { label: string; className: string }
> = {
  NEW: { label: "جديد", className: "bg-blue-100 text-blue-700" },
  CONTACTED: { label: "تم التواصل", className: "bg-green-100 text-green-700" },
  FOLLOW_UP: { label: "متابعة", className: "bg-amber-100 text-amber-700" },
  CLOSED: { label: "مغلق", className: "bg-gray-100 text-gray-700" },
};

const STATUS_LIST: InquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "CLOSED",
];

const INQUIRY_TYPE_CONFIG: Record<InquiryType, { label: string; className: string; icon: React.ElementType }> = {
  REQUEST: { label: "طلب", className: "bg-indigo-100 text-indigo-700", icon: HandMetal },
  OFFER: { label: "عرض", className: "bg-orange-100 text-orange-700", icon: ArrowDownUp },
};

const INQUIRY_SUBTYPE_CONFIG: Record<InquirySubType, { label: string; className: string }> = {
  SALE: { label: "بيع", className: "bg-red-50 text-red-700 border-red-200" },
  RENT: { label: "كراء", className: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  MORTGAGE: { label: "رهن", className: "bg-purple-50 text-purple-700 border-purple-200" },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("ar-DZ");

// ─── Component ───────────────────────────────────────────────────────────────

interface InquiriesViewProps {
  filterType?: "REQUEST" | "OFFER";
}

export default function InquiriesView({ filterType }: InquiriesViewProps) {
  const queryClient = useQueryClient();
  const { agentId: currentAgentId } = useAgentContext();

  // ── Local state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [subTypeFilter, setSubTypeFilter] = useState<string>("ALL");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    propertyId: "",
    propertyType: "",
    callerName: "",
    callerPhone: "",
    message: "",
    inquiryType: "" as InquiryType | "",
    inquirySubType: "" as InquirySubType | "",
  });

  // Detail dialog
  const [detailInquiry, setDetailInquiry] = useState<Inquiry | null>(null);

  // Status popover
  const [statusPopoverId, setStatusPopoverId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const {
    data: inquiriesData,
    isLoading: inquiriesLoading,
  } = useQuery<{ inquiries: Inquiry[] }>({
    queryKey: ["inquiries"],
    queryFn: () => fetch("/api/inquiries").then((r) => r.json()),
  });

  const { data: propertiesData } = useQuery<{ properties: Property[] }>({
    queryKey: ["properties"],
    queryFn: () => fetch("/api/properties").then((r) => r.json()),
  });

  const { data: agentsData } = useQuery<{ agents: { id: string; name: string }[] }>({
    queryKey: ["agents"],
    queryFn: () => fetch("/api/agents").then((r) => r.json()),
  });

  const inquiries = inquiriesData?.inquiries ?? [];
  const properties = propertiesData?.properties ?? [];
  const agentsList = agentsData?.agents ?? [];

  // ── Derived data ─────────────────────────────────────────────────────────
  const newCount = inquiries.filter((i) => i.status === "NEW").length;

  const filtered = inquiries.filter((inq) => {
    const matchesType = !filterType || inq.inquiryType === filterType;
    const matchesSubType =
      subTypeFilter === "ALL" || inq.inquirySubType === subTypeFilter;
    const matchesStatus =
      statusFilter === "ALL" || inq.status === statusFilter;

    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      inq.callerName.toLowerCase().includes(term) ||
      inq.callerPhone.includes(term) ||
      (inq.message ?? "").toLowerCase().includes(term) ||
      inq.property?.title.toLowerCase().includes(term);

    return matchesType && matchesSubType && matchesStatus && matchesSearch;
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (payload: {
      propertyId: string;
      callerName: string;
      callerPhone: string;
      message: string;
      inquiryType: string;
      inquirySubType: string;
    }) =>
      fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("فشل في إضافة الاستفسار");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      toast.success("تم إضافة الاستفسار بنجاح");
      setAddOpen(false);
      setAddForm({ propertyId: "", callerName: "", callerPhone: "", message: "", inquiryType: "", inquirySubType: "" });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => {
        if (!r.ok) throw new Error("فشل في تحديث الحالة");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      toast.success("تم تحديث الحالة بنجاح");
      setStatusPopoverId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/inquiries/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("فشل في حذف الاستفسار");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      toast.success("تم حذف الاستفسار بنجاح");
      setDetailInquiry(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.callerName.trim() || !addForm.callerPhone.trim()) {
      toast.error("يرجى تعبئة الحقول المطلوبة");
      return;
    }
    if (!addForm.inquiryType) {
      toast.error("يرجى اختيار نوع الاستفسار (طلب أو عرض)");
      return;
    }
    if (!addForm.inquirySubType) {
      toast.error("يرجى اختيار النوع الفرعي");
      return;
    }
    addMutation.mutate({
      propertyId: addForm.propertyId,
      propertyType: addForm.propertyType,
      agentId: currentAgentId || null,
      callerName: addForm.callerName,
      callerPhone: addForm.callerPhone,
      message: addForm.message,
      inquiryType: addForm.inquiryType,
      inquirySubType: addForm.inquirySubType,
    });
  };

  const handleStatusChange = (id: string, status: InquiryStatus) => {
    statusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Helper to get inquiry type/subtype labels
  const getTypeLabel = (type: string) => {
    const t = type as InquiryType;
    return INQUIRY_TYPE_CONFIG[t]?.label || type;
  };

  const getTypeClass = (type: string) => {
    const t = type as InquiryType;
    return INQUIRY_TYPE_CONFIG[t]?.className || "";
  };

  const getSubTypeLabel = (subType: string) => {
    const s = subType as InquirySubType;
    return INQUIRY_SUBTYPE_CONFIG[s]?.label || subType;
  };

  const getSubTypeClass = (subType: string) => {
    const s = subType as InquirySubType;
    return INQUIRY_SUBTYPE_CONFIG[s]?.className || "";
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {filterType === "REQUEST" ? "الطلبات" : filterType === "OFFER" ? "العروض" : "الاستفسارات والمكالمات"}
            </h1>
            {newCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {newCount} استفسار جديد بحاجة لمتابعة
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          استفسار جديد
        </Button>
      </div>

      {/* ── Filter / Search Card ────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search-inquiries" className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                بحث
              </Label>
              <Input
                id="search-inquiries"
                placeholder="ابحث بالاسم، الهاتف، الرسالة، أو عنوان العقار…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {filterType ? "النوع" : "الحالة"}
              </Label>
              <Select
                value={filterType ? subTypeFilter : statusFilter}
                onValueChange={filterType ? setSubTypeFilter : setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  {filterType ? (
                    <>
                      <SelectItem value="SALE">بيع</SelectItem>
                      <SelectItem value="RENT">كراء</SelectItem>
                      <SelectItem value="MORTGAGE">رهن</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="NEW">جديد</SelectItem>
                      <SelectItem value="CONTACTED">تم التواصل</SelectItem>
                      <SelectItem value="FOLLOW_UP">متابعة</SelectItem>
                      <SelectItem value="CLOSED">مغلق</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {inquiriesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <MessageSquare className="h-10 w-10 opacity-40" />
              <p className="text-sm">لا توجد استفسارات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((inq) => {
                const sc = STATUS_CONFIG[inq.status];
                return (
                  <Card key={inq.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Top: Type badges + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={`text-xs font-medium ${getTypeClass(inq.inquiryType)}`}>
                            {getTypeLabel(inq.inquiryType)}
                          </Badge>
                          {inq.inquirySubType && (
                            <Badge variant="outline" className={`text-xs ${getSubTypeClass(inq.inquirySubType)}`}>
                              {inq.inquiryType === "REQUEST" ? `طلب ${getSubTypeLabel(inq.inquirySubType)}` : `عرض ${getSubTypeLabel(inq.inquirySubType)}`}
                            </Badge>
                          )}
                          {inq.propertyType && (
                            <Badge variant="secondary" className="text-xs">
                              {PROPERTY_TYPE_LABELS[inq.propertyType] || inq.propertyType}
                            </Badge>
                          )}
                        </div>
                        <Popover
                          open={statusPopoverId === inq.id}
                          onOpenChange={(open) => setStatusPopoverId(open ? inq.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 shrink-0 ${sc.className}`}
                            >
                              {sc.label}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="center" className="w-40 p-1">
                            {STATUS_LIST.map((s) => (
                              <button
                                key={s}
                                type="button"
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${s === inq.status ? "font-bold" : ""}`}
                                onClick={() => handleStatusChange(inq.id, s)}
                              >
                                <span className={`inline-block h-2.5 w-2.5 rounded-full ${s === "NEW" ? "bg-blue-500" : s === "CONTACTED" ? "bg-green-500" : s === "FOLLOW_UP" ? "bg-amber-500" : "bg-gray-400"}`} />
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Caller info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm">{inq.callerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span dir="ltr">{inq.callerPhone}</span>
                        </div>
                      </div>

                      {/* Message */}
                      {inq.message && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{inq.message}</p>
                      )}

                      {/* Property */}
                      {inq.property?.title && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {inq.property.title}
                        </div>
                      )}

                      {/* Bottom: date + agent + actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(inq.createdAt)}
                          </span>
                          {inq.agent?.name && (
                            <span className="text-xs text-primary font-medium">
                              {inq.agent.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-7" title="عرض التفاصيل" onClick={() => setDetailInquiry(inq)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" title="حذف" onClick={() => handleDelete(inq.id)}>
                            {deleteMutation.isPending && deleteMutation.variables === inq.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Inquiry Dialog ──────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              استفسار جديد
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 overflow-y-auto flex-1 px-1">
            {/* Inquiry Type */}
            <div className="space-y-2">
              <Label>
                نوع الاستفسار <span className="text-destructive">*</span>
              </Label>
              <Select
                value={addForm.inquiryType}
                onValueChange={(v) =>
                  setAddForm((prev) => ({ ...prev, inquiryType: v as InquiryType, inquirySubType: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الاستفسار…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REQUEST">
                    <div className="flex items-center gap-2">
                      <HandMetal className="h-4 w-4" />
                      طلب
                    </div>
                  </SelectItem>
                  <SelectItem value="OFFER">
                    <div className="flex items-center gap-2">
                      <ArrowDownUp className="h-4 w-4" />
                      عرض
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inquiry SubType */}
            {addForm.inquiryType && (
              <div className="space-y-2">
                <Label>
                  {addForm.inquiryType === "REQUEST"
                    ? "نوع الطلب"
                    : "نوع العرض"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={addForm.inquirySubType}
                  onValueChange={(v) =>
                    setAddForm((prev) => ({ ...prev, inquirySubType: v as InquirySubType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        addForm.inquiryType === "REQUEST"
                          ? "اختر نوع الطلب…"
                          : "اختر نوع العرض…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {addForm.inquiryType === "REQUEST" ? (
                      <>
                        <SelectItem value="SALE">طلب شراء</SelectItem>
                        <SelectItem value="RENT">طلب كراء</SelectItem>
                        <SelectItem value="MORTGAGE">طلب رهن</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="RENT">عرض كراء</SelectItem>
                        <SelectItem value="SALE">عرض بيع</SelectItem>
                        <SelectItem value="MORTGAGE">عرض رهن</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Property Type */}
            <div className="space-y-2">
              <Label>النوع <span className="text-destructive">*</span></Label>
              <Select
                value={addForm.propertyType}
                onValueChange={(v) =>
                  setAddForm((prev) => ({ ...prev, propertyType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع العقار…" />
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

            {/* Property select (optional) */}
            <div className="space-y-2">
              <Label>العقار (اختياري)</Label>
              <Select
                value={addForm.propertyId}
                onValueChange={(v) =>
                  setAddForm((prev) => ({ ...prev, propertyId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العقار…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caller name */}
            <div className="space-y-2">
              <Label htmlFor="add-caller-name">
                اسم المتصل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-caller-name"
                required
                placeholder="أدخل اسم المتصل"
                value={addForm.callerName}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    callerName: e.target.value,
                  }))
                }
              />
            </div>

            {/* Caller phone */}
            <div className="space-y-2">
              <Label htmlFor="add-caller-phone">
                رقم الهاتف <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-caller-phone"
                required
                placeholder="أدخل رقم الهاتف"
                dir="ltr"
                className="text-right"
                value={addForm.callerPhone}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    callerPhone: e.target.value,
                  }))
                }
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="add-message">الرسالة</Label>
              <Textarea
                id="add-message"
                placeholder="أدخل تفاصيل الرسالة…"
                rows={4}
                value={addForm.message}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, message: e.target.value }))
                }
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={!!detailInquiry}
        onOpenChange={(open) => !open && setDetailInquiry(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {detailInquiry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  تفاصيل الاستفسار
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {/* Inquiry Type Info */}
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    نوع الاستفسار
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${getTypeClass(detailInquiry.inquiryType)}`}
                    >
                      {getTypeLabel(detailInquiry.inquiryType)}
                    </Badge>
                    {detailInquiry.inquirySubType && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${getSubTypeClass(detailInquiry.inquirySubType)}`}
                      >
                        {detailInquiry.inquiryType === "REQUEST"
                          ? `طلب ${getSubTypeLabel(detailInquiry.inquirySubType)}`
                          : `عرض ${getSubTypeLabel(detailInquiry.inquirySubType)}`}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Property Type */}
                {detailInquiry.propertyType && (
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      نوع العقار
                    </div>
                    <Badge variant="secondary">
                      {PROPERTY_TYPE_LABELS[detailInquiry.propertyType] || detailInquiry.propertyType}
                    </Badge>
                  </div>
                )}

                {/* Property info */}
                {detailInquiry.property && (
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      معلومات العقار
                    </div>
                    <p className="font-semibold">
                      {detailInquiry.property?.title ?? "—"}
                    </p>
                  </div>
                )}

                {/* Caller info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">المتصل</p>
                    <div className="flex items-center gap-2 font-medium">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {detailInquiry.callerName}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">الهاتف</p>
                    <div className="flex items-center gap-2 font-medium" dir="ltr">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {detailInquiry.callerPhone}
                    </div>
                  </div>
                </div>

                {/* Status & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">الحالة</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[detailInquiry.status].className}`}
                    >
                      {STATUS_CONFIG[detailInquiry.status].label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">التاريخ</p>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatDate(detailInquiry.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Message */}
                {detailInquiry.message && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">الرسالة</p>
                    <p className="text-sm whitespace-pre-wrap rounded-lg border p-3 bg-muted/30">
                      {detailInquiry.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`tel:${detailInquiry.callerPhone}`}>
                    <PhoneCall className="h-4 w-4" />
                    اتصال
                  </a>
                </Button>

                {/* Status change */}
                <Select
                  value={detailInquiry.status}
                  onValueChange={(v) => {
                    const newStatus = v as InquiryStatus;
                    statusMutation.mutate(
                      { id: detailInquiry.id, status: newStatus },
                      {
                        onSuccess: () => {
                          setDetailInquiry((prev) =>
                            prev
                              ? { ...prev, status: newStatus }
                              : null
                          );
                        },
                      }
                    );
                  }}
                >
                  <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => handleDelete(detailInquiry.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  حذف
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}