"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, MapPinned, Loader2, Search, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, VILLA_TYPE_LABELS, LOT_STATUS_LABELS, AVAILABILITY_LABELS } from "@/lib/format";
import type { LotT } from "@/lib/data-store";
import { useAuth } from "@/lib/auth-context";

const STATUS_COLORS: Record<string, string> = {
  EMPTY: "bg-slate-100 text-slate-700",
  SEMI_FINISHED: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
};

const AVAIL_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  RESERVED: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  SOLD: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
};

export function LotsView() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveId, setReserveId] = useState<string | null>(null);
  const [reserveForm, setReserveForm] = useState({ customerName: "", notes: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterAvail, setFilterAvail] = useState<string>("ALL");

  const emptyForm = {
    lotNumber: "", titleDeed: "", villaType: "CONNECTED" as LotT["villaType"],
    lotArea: "", gardenArea: "", groundFloorArea: "", totalBuiltArea: "",
    status: "EMPTY" as LotT["status"],
    priceEmpty: "", priceSemiFinished: "", priceReady: "",
  };
  const [form, setForm] = useState<any>(emptyForm);

  const { data, isLoading } = useQuery<{ lots: any[] }>({
    queryKey: ["lots"],
    queryFn: async () => (await fetch("/api/lots")).json(),
  });

  const lots = (data?.lots || []).filter(l => {
    if (search && !l.lotNumber.toLowerCase().includes(search.toLowerCase()) &&
        !(l.titleDeed || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
    if (filterAvail !== "ALL" && l.availability !== filterAvail) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editId) {
        const res = await fetch(`/api/lots/${editId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch("/api/lots", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
    },
    onSuccess: () => {
      toast.success(editId ? "تم التحديث" : "تمت الإضافة");
      setOpen(false); setEditId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["lots"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/lots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["lots"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(l: any) {
    setEditId(l.id);
    setForm({
      lotNumber: l.lotNumber,
      titleDeed: l.titleDeed || "",
      villaType: l.villaType,
      lotArea: l.lotArea, gardenArea: l.gardenArea,
      groundFloorArea: l.groundFloorArea, totalBuiltArea: l.totalBuiltArea,
      status: l.status,
      priceEmpty: l.priceEmpty, priceSemiFinished: l.priceSemiFinished, priceReady: l.priceReady,
    });
    setOpen(true);
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <MapPinned className="w-6 h-6 text-primary" /> البقع العقارية
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            السعر المعروض يُحسب تلقائياً حسب الحالة، والتوفّر محسوب من المبيعات
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 ml-2" /> بقعة جديدة
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم البقعة أو الرسم العقاري..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الحالات</SelectItem>
                <SelectItem value="EMPTY">فارغة</SelectItem>
                <SelectItem value="SEMI_FINISHED">شبه جاهزة</SelectItem>
                <SelectItem value="READY">جاهزة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAvail} onValueChange={setFilterAvail}>
              <SelectTrigger className="w-40"><SelectValue placeholder="التوفّر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                <SelectItem value="AVAILABLE">متوفرة</SelectItem>
                <SelectItem value="RESERVED">محجوزة</SelectItem>
                <SelectItem value="SOLD">مباعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم البقعة</TableHead>
                  <TableHead>الرسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المساحة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التوفّر</TableHead>
                  <TableHead>السعر الحالي</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : lots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد بقع
                    </TableCell>
                  </TableRow>
                ) : lots.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono font-semibold">{l.lotNumber}</TableCell>
                    <TableCell className="text-xs">{l.titleDeed || "—"}</TableCell>
                    <TableCell className="text-xs">{VILLA_TYPE_LABELS[l.villaType] || l.villaType}</TableCell>
                    <TableCell className="text-xs nums">{l.lotArea} م²</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_COLORS[l.status]}>
                        {LOT_STATUS_LABELS[l.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={AVAIL_COLORS[l.availability]}>
                        {AVAILABILITY_LABELS[l.availability] || l.availability}
                      </Badge>
                      {l.availability === "RESERVED" && l.reservedCustomerName && (
                        <div className="text-xs text-muted-foreground mt-0.5">{l.reservedCustomerName}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold nums text-primary">
                      {formatCurrency(l.currentPrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {l.availability === "AVAILABLE" && (
                          <Button variant="ghost" size="icon" title="حجز" className="text-amber-600" onClick={() => {
                            setReserveId(l.id); setReserveForm({ customerName: "", notes: "" }); setReserveOpen(true);
                          }}>
                            <Lock className="w-4 h-4" />
                          </Button>
                        )}
                        {l.availability === "RESERVED" && (
                          <Button variant="ghost" size="icon" title="إلغاء الحجز" className="text-amber-600" onClick={async () => {
                            try {
                              const res = await fetch(`/api/lots/${l.id}/reserve`, { method: "DELETE" });
                              if (!res.ok) throw new Error();
                              toast.success("تم إلغاء الحجز");
                              qc.invalidateQueries({ queryKey: ["lots"] });
                              qc.invalidateQueries({ queryKey: ["dashboard"] });
                            } catch { toast.error("خطأ"); }
                          }}>
                            <Unlock className="w-4 h-4" />
                          </Button>
                        )}
                        {l.availability !== "SOLD" && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => { if (confirm(`حذف البقعة "${l.lotNumber}"؟`)) deleteMutation.mutate(l.id); }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل بقعة" : "إضافة بقعة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>رقم البقعة *</Label>
                <Input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>رقم الرسم العقاري</Label>
                <Input value={form.titleDeed} onChange={(e) => setForm({ ...form, titleDeed: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نوع الفيلا</Label>
                <Select value={form.villaType} onValueChange={(v) => setForm({ ...form, villaType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONNECTED">متلاصقة</SelectItem>
                    <SelectItem value="SEMI_DETACHED">شبه مستقلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPTY">فارغة</SelectItem>
                    <SelectItem value="SEMI_FINISHED">شبه جاهزة</SelectItem>
                    <SelectItem value="READY">جاهزة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>مساحة البقعة (م²)</Label>
                <Input type="number" value={form.lotArea} onChange={(e) => setForm({ ...form, lotArea: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>مساحة الحديقة</Label>
                <Input type="number" value={form.gardenArea} onChange={(e) => setForm({ ...form, gardenArea: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>مساحة الطابق الأرضي</Label>
                <Input type="number" value={form.groundFloorArea} onChange={(e) => setForm({ ...form, groundFloorArea: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>إجمالي مساحة البناء</Label>
                <Input type="number" value={form.totalBuiltArea} onChange={(e) => setForm({ ...form, totalBuiltArea: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>سعر الفارغة</Label>
                <Input type="number" value={form.priceEmpty} onChange={(e) => setForm({ ...form, priceEmpty: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>سعر شبه الجاهزة</Label>
                <Input type="number" value={form.priceSemiFinished} onChange={(e) => setForm({ ...form, priceSemiFinished: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>سعر الجاهزة</Label>
                <Input type="number" value={form.priceReady} onChange={(e) => setForm({ ...form, priceReady: e.target.value })} />
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              سيتم عرض السعر تلقائياً حسب الحالة المختارة في الجدول
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.lotNumber || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>حجز بقعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>اسم الزبون *</Label>
              <Input value={reserveForm.customerName} onChange={(e) => setReserveForm({ ...reserveForm, customerName: e.target.value })} placeholder="اسم الزبون المحجوز له" />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input value={reserveForm.notes} onChange={(e) => setReserveForm({ ...reserveForm, notes: e.target.value })} placeholder="ملاحظات اختيارية" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveOpen(false)}>إلغاء</Button>
            <Button disabled={!reserveForm.customerName} onClick={async () => {
              try {
                const res = await fetch(`/api/lots/${reserveId}/reserve`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...reserveForm, reservedBy: user?.id, reservedByName: user?.name }),
                });
                if (!res.ok) throw new Error((await res.json()).error);
                toast.success("تم حجز البقعة");
                setReserveOpen(false);
                qc.invalidateQueries({ queryKey: ["lots"] });
                qc.invalidateQueries({ queryKey: ["dashboard"] });
              } catch (e: any) { toast.error(e.message || "خطأ"); }
            }}>حجز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
