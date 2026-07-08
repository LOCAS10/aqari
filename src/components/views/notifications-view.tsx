"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Bell, Trash2, Loader2, CheckCircle2, Info, Building2, PhoneCall, Eye } from "lucide-react";

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationItem {
  id: string;
  agentId: string;
  agentName: string | null;
  title: string;
  message: string | null;
  type: string;
  isRead: number;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
}

const TYPE_LABELS: Record<string, string> = {
  INFO: "معلومات",
  PROPERTY: "عقار",
  INQUIRY: "استفسار",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  INFO: Info,
  PROPERTY: Building2,
  INQUIRY: PhoneCall,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsView() {
  const queryClient = useQueryClient();

  // ---- State ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formAgentId, setFormAgentId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState("INFO");
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);

  // ---- Fetch notifications ----
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("فشل في تحميل التنبيهات");
      const json = await res.json();
      return json.notifications || [];
    },
  });

  // ---- Fetch agents for dropdown ----
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) return [];
      const json = await res.json();
      return json.agents || [];
    },
  });

  // ---- Create mutation ----
  const createMutation = useMutation({
    mutationFn: async (data: { agentId: string; title: string; message: string; type: string }) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل في إرسال التنبيه");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("تم إرسال التنبيه بنجاح");
      closeDialog();
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إرسال التنبيه");
    },
  });

  // ---- Mark as read mutation ----
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("فشل في تحديث التنبيه");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  // ---- Delete mutation ----
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في حذف التنبيه");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("تم حذف التنبيه بنجاح");
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف التنبيه");
    },
  });

  // ---- Helpers ----
  function openCreate() {
    setFormAgentId("");
    setFormTitle("");
    setFormMessage("");
    setFormType("INFO");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setFormAgentId("");
    setFormTitle("");
    setFormMessage("");
    setFormType("INFO");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formAgentId || !formTitle.trim()) {
      toast.error("يرجى اختيار الوكيل وإدخال العنوان");
      return;
    }
    createMutation.mutate({
      agentId: formAgentId,
      title: formTitle.trim(),
      message: formMessage.trim(),
      type: formType,
    });
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("ar-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleMarkRead(n: NotificationItem) {
    if (n.isRead === 1) return;
    markReadMutation.mutate(n.id);
  }

  // ---- Render ----
  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="size-5" />
            التنبيهات والمراسلات
          </CardTitle>
          <Button onClick={openCreate}>
            <Plus className="size-4 ml-2" />
            إرسال تنبيه
          </Button>
        </CardHeader>
      </Card>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Bell className="size-12" />
            <p className="text-lg font-medium">لا توجد تنبيهات</p>
            <p className="text-sm">يمكنك إرسال تنبيهات جديدة للوكلاء</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Info;
            const isUnread = n.isRead === 0;
            return (
              <Card
                key={n.id}
                className={`transition-colors cursor-pointer ${
                  isUnread
                    ? "border-r-4 border-r-primary bg-primary/5"
                    : "opacity-80"
                }`}
                onClick={() => handleMarkRead(n)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 rounded-full p-2 ${isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm font-semibold ${isUnread ? "" : "text-muted-foreground"}`}>
                            {n.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[n.type] || n.type}
                          </Badge>
                          {isUnread && (
                            <Badge variant="default" className="text-xs">
                              جديد
                            </Badge>
                          )}
                        </div>
                        {n.agentName && (
                          <p className="text-xs text-muted-foreground">
                            الوكيل: {n.agentName}
                          </p>
                        )}
                        {n.message && (
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(n.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleMarkRead(n)}
                          title="تحديد كمقروء"
                        >
                          <Eye className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(n)}
                        title="حذف"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إرسال تنبيه جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>الوكيل <span className="text-destructive">*</span></Label>
              <Select value={formAgentId} onValueChange={setFormAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوكيل" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-title">
                العنوان <span className="text-destructive">*</span>
              </Label>
              <Input
                id="notif-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="أدخل عنوان التنبيه"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-message">الرسالة</Label>
              <Textarea
                id="notif-message"
                rows={3}
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="أدخل نص الرسالة"
              />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">معلومات</SelectItem>
                  <SelectItem value="PROPERTY">عقار</SelectItem>
                  <SelectItem value="INQUIRY">استفسار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={createMutation.isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="size-4 ml-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4 ml-2" />
                )}
                إرسال
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
            هل أنت متأكد من حذف التنبيه{" "}
            <span className="font-semibold text-foreground">
              &quot;{deleteTarget?.title}&quot;
            </span>
            ؟
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