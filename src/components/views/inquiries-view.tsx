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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type InquiryStatus = "NEW" | "CONTACTED" | "FOLLOW_UP" | "CLOSED";

interface Property {
  id: string;
  title: string;
  propertyType: string;
}

interface Inquiry {
  id: string;
  propertyId: string;
  callerName: string;
  callerPhone: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  property: Property;
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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("ar-DZ");

// ─── Component ───────────────────────────────────────────────────────────────

export default function InquiriesView() {
  const queryClient = useQueryClient();

  // ── Local state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    propertyId: "",
    callerName: "",
    callerPhone: "",
    message: "",
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

  const inquiries = inquiriesData?.inquiries ?? [];
  const properties = propertiesData?.properties ?? [];

  // ── Derived data ─────────────────────────────────────────────────────────
  const newCount = inquiries.filter((i) => i.status === "NEW").length;

  const filtered = inquiries.filter((inq) => {
    const matchesStatus =
      statusFilter === "ALL" || inq.status === statusFilter;

    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      inq.callerName.toLowerCase().includes(term) ||
      inq.callerPhone.includes(term) ||
      (inq.message ?? "").toLowerCase().includes(term) ||
      inq.property?.title.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (payload: {
      propertyId: string;
      callerName: string;
      callerPhone: string;
      message: string;
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
      setAddForm({ propertyId: "", callerName: "", callerPhone: "", message: "" });
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
    addMutation.mutate(addForm);
  };

  const handleStatusChange = (id: string, status: InquiryStatus) => {
    statusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
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
              الاستفسارات والمكالمات
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
                الحالة
              </Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  <SelectItem value="NEW">جديد</SelectItem>
                  <SelectItem value="CONTACTED">تم التواصل</SelectItem>
                  <SelectItem value="FOLLOW_UP">متابعة</SelectItem>
                  <SelectItem value="CLOSED">مغلق</SelectItem>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">العقار</TableHead>
                    <TableHead className="min-w-[120px]">المتصل</TableHead>
                    <TableHead className="min-w-[130px]">الهاتف</TableHead>
                    <TableHead className="min-w-[200px]">الرسالة</TableHead>
                    <TableHead className="min-w-[120px]">الحالة</TableHead>
                    <TableHead className="min-w-[110px]">التاريخ</TableHead>
                    <TableHead className="min-w-[140px] text-center">
                      إجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inq) => {
                    const sc = STATUS_CONFIG[inq.status];
                    return (
                      <TableRow key={inq.id}>
                        {/* Property */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              {inq.property?.title ?? "—"}
                            </span>
                            {inq.property?.propertyType && (
                              <Badge variant="secondary" className="w-fit text-xs">
                                <Building2 className="ml-1 h-3 w-3" />
                                {inq.property.propertyType}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Caller */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {inq.callerName}
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell dir="ltr" className="text-right">
                          {inq.callerPhone}
                        </TableCell>

                        {/* Message */}
                        <TableCell>
                          <p className="line-clamp-2 text-sm text-muted-foreground max-w-[260px]">
                            {inq.message || "—"}
                          </p>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Popover
                            open={statusPopoverId === inq.id}
                            onOpenChange={(open) =>
                              setStatusPopoverId(open ? inq.id : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${sc.className}`}
                              >
                                {sc.label}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="center"
                              className="w-40 p-1"
                            >
                              {STATUS_LIST.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                                    s === inq.status
                                      ? "font-bold"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleStatusChange(inq.id, s)
                                  }
                                >
                                  <span
                                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                                      s === "NEW"
                                        ? "bg-blue-500"
                                        : s === "CONTACTED"
                                        ? "bg-green-500"
                                        : s === "FOLLOW_UP"
                                        ? "bg-amber-500"
                                        : "bg-gray-400"
                                    }`}
                                  />
                                  {STATUS_CONFIG[s].label}
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(inq.createdAt)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="عرض التفاصيل"
                              onClick={() => setDetailInquiry(inq)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="حذف"
                              onClick={() => handleDelete(inq.id)}
                            >
                              {deleteMutation.isPending &&
                              deleteMutation.variables === inq.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Inquiry Dialog ──────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              استفسار جديد
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Property select */}
            <div className="space-y-2">
              <Label>اختر العقار</Label>
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
                {/* Property info */}
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    معلومات العقار
                  </div>
                  <p className="font-semibold">
                    {detailInquiry.property?.title ?? "—"}
                  </p>
                  {detailInquiry.property?.propertyType && (
                    <Badge variant="secondary" className="text-xs">
                      {detailInquiry.property.propertyType}
                    </Badge>
                  )}
                </div>

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