"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Users, Phone, Building2, Bell } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agent {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
  unreadCount: number;
  propertyCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentsView() {
  const queryClient = useQueryClient();

  // ---- State ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");

  // ---- Fetch agents ----
  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `فشل في تحميل الوكلاء (${res.status})`);
      }
      const json = await res.json();
      return json.agents || [];
    },
  });

  // ---- Create/Update mutation ----
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      if (editTarget) {
        const res = await fetch(`/api/agents/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("فشل في تحديث الوكيل");
        return res.json();
      } else {
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "فشل في إضافة الوكيل");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(editTarget ? "تم تحديث الوكيل بنجاح" : "تم إضافة الوكيل بنجاح");
      closeDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message || (editTarget ? "حدث خطأ أثناء تحديث الوكيل" : "حدث خطأ أثناء إضافة الوكيل"));
    },
  });

  // ---- Delete mutation ----
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في حذف الوكيل");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("تم حذف الوكيل بنجاح");
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف الوكيل");
    },
  });

  // ---- Helpers ----
  function openCreate() {
    setEditTarget(null);
    setFormName("");
    setFormPhone("");
    setDialogOpen(true);
  }

  function openEdit(agent: Agent) {
    setEditTarget(agent);
    setFormName(agent.name);
    setFormPhone(agent.phone || "");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setFormName("");
    setFormPhone("");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("يرجى إدخال اسم الوكيل");
      return;
    }
    saveMutation.mutate({ name: formName.trim(), phone: formPhone.trim() });
  }

  // ---- Render ----
  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5" />
            إدارة الوكلاء
          </CardTitle>
          <Button onClick={openCreate}>
            <Plus className="size-4 ml-2" />
            إضافة وكيل
          </Button>
        </CardHeader>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Users className="size-12" />
          <p className="text-lg font-medium">لا يوجد وكلاء</p>
          <p className="text-sm">يمكنك إضافة وكلاء جدد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative group hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                {/* Name */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {agent.name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-base">{agent.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(agent)} title="تعديل">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(agent)} title="حذف">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Phone */}
                {agent.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-4 shrink-0" />
                    <span dir="ltr">{agent.phone}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="font-medium">{agent.propertyCount}</span>
                    <span className="text-muted-foreground">عقار</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Bell className="size-4 text-muted-foreground" />
                    {agent.unreadCount > 0 ? (
                      <Badge variant="destructive" className="text-xs">{agent.unreadCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0 تنبيه</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "تعديل الوكيل" : "إضافة وكيل جديد"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">
                الاسم <span className="text-destructive">*</span>
              </Label>
              <Input
                id="agent-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="أدخل اسم الوكيل"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-phone">الهاتف</Label>
              <Input
                id="agent-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="أدخل رقم الهاتف"
                dir="ltr"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={saveMutation.isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 ml-2 animate-spin" />
                ) : null}
                {editTarget ? "تحديث" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm leading-relaxed">
            هل أنت متأكد من حذف الوكيل{" "}
            <span className="font-semibold text-foreground">
              &quot;{deleteTarget?.name}&quot;
            </span>
            ؟ سيتم فصل العقارات المرتبطة به وحذف تنبيهاته.
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