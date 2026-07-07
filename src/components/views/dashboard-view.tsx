"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  DollarSign,
  Phone,
  TrendingUp,
  Home,
  ArrowUpRight,
  Eye,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Property {
  id: string;
  title: string;
  type: "APARTMENT" | "VILLA" | "LAND";
  transaction: "SALE" | "RENT";
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "RENTED";
  price: number;
  createdAt: string;
}

interface Inquiry {
  id: string;
  callerName: string;
  phone: string;
  propertyTitle: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Label / color helpers                                              */
/* ------------------------------------------------------------------ */

const typeLabels: Record<Property["type"], string> = {
  APARTMENT: "شقة",
  VILLA: "فيلا",
  LAND: "أرض",
};

const typeColors: Record<Property["type"], string> = {
  APARTMENT: "bg-blue-100 text-blue-700",
  VILLA: "bg-emerald-100 text-emerald-700",
  LAND: "bg-amber-100 text-amber-700",
};

const transactionLabels: Record<Property["transaction"], string> = {
  SALE: "بيع",
  RENT: "كراء",
};

const transactionColors: Record<Property["transaction"], string> = {
  SALE: "bg-slate-100 text-slate-700",
  RENT: "bg-cyan-100 text-cyan-700",
};

const statusLabels: Record<Property["status"], string> = {
  AVAILABLE: "متاح",
  RESERVED: "محجوز",
  SOLD: "مباع",
  RENTED: "مؤجر",
};

const statusColors: Record<Property["status"], string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RESERVED: "bg-yellow-100 text-yellow-700",
  SOLD: "bg-red-100 text-red-700",
  RENTED: "bg-blue-100 text-blue-700",
};

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("ar-DZ").format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ar-DZ");

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  /* ---------- data fetching ---------- */

  const {
    data: propertiesData,
    isLoading: loadingProperties,
  } = useQuery<{ properties: Property[] }>({
    queryKey: ["properties"],
    queryFn: () => fetch("/api/properties").then((r) => r.json()),
  });

  const {
    data: inquiriesData,
    isLoading: loadingInquiries,
  } = useQuery<{ inquiries: Inquiry[] }>({
    queryKey: ["inquiries"],
    queryFn: () => fetch("/api/inquiries").then((r) => r.json()),
  });

  const properties = propertiesData?.properties ?? [];
  const inquiries = inquiriesData?.inquiries ?? [];

  /* ---------- derived stats ---------- */

  const totalProperties = properties.length;

  const apartments = properties.filter((p) => p.propertyType === "APARTMENT");
  const apartmentsForSale = apartments.filter((p) => p.transactionType === "SALE").length;
  const apartmentsForRent = apartments.filter((p) => p.transactionType === "RENT").length;

  const villas = properties.filter((p) => p.propertyType === "VILLA").length;
  const lands = properties.filter((p) => p.propertyType === "LAND").length;

  const totalInquiries = inquiries.length;

  const totalValue = properties.reduce((sum, p) => sum + p.price, 0);

  const recentProperties = [...properties]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const recentInquiries = [...inquiries]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  /* ---------- stat cards config ---------- */

  const statCards = [
    {
      title: "إجمالي العقارات",
      value: fmtPrice(totalProperties),
      icon: Building2,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "شقق للبيع / للكراء",
      value: `${fmtPrice(apartmentsForSale)} / ${fmtPrice(apartmentsForRent)}`,
      icon: Home,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "فلل",
      value: fmtPrice(villas),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "أراضي",
      value: fmtPrice(lands),
      icon: Building2,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "الاستفسارات",
      value: fmtPrice(totalInquiries),
      icon: Phone,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      title: "القيمة الإجمالية",
      value: `${fmtPrice(totalValue)} د.ج`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  /* ---------- render ---------- */

  const isLoading = loadingProperties || loadingInquiries;

  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* ===== Page heading ===== */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          لوحة التحكم
        </h1>
        <button
          onClick={() => onNavigate("properties")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
          تصفّح العقارات
        </button>
      </div>

      {/* ===== Stats grid ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bg}`}
                >
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 truncate">
                    {card.title}
                  </p>
                  <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">
                    {isLoading ? (
                      <span className="inline-block h-7 w-24 animate-pulse rounded bg-gray-200" />
                    ) : (
                      card.value
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ===== Recent Properties & Inquiries ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* -- Recent Properties -- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              آخر العقارات المضافة
            </CardTitle>
            <button
              onClick={() => onNavigate("properties")}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
            >
              عرض الكل
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-gray-100"
                  />
                ))}
              </div>
            ) : recentProperties.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                لا توجد عقارات بعد
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentProperties.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {p.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[p.propertyType]}`}
                        >
                          {typeLabels[p.propertyType]}
                        </span>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${transactionColors[p.transactionType]}`}
                        >
                          {transactionLabels[p.transactionType]}
                        </span>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}
                        >
                          {statusLabels[p.status]}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-left">
                      <span className="text-sm font-bold text-gray-900 tabular-nums">
                        {fmtPrice(p.price)} د.ج
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* -- Recent Inquiries -- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Phone className="h-5 w-5 text-rose-600" />
              آخر الاستفسارات
            </CardTitle>
            <button
              onClick={() => onNavigate("inquiries")}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
            >
              عرض الكل
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-gray-100"
                  />
                ))}
              </div>
            ) : recentInquiries.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                لا توجد استفسارات بعد
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentInquiries.map((inq) => (
                  <li
                    key={inq.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {/* Avatar circle */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 font-bold text-sm">
                      {inq.callerName.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {inq.callerName}
                      </p>
                      <p className="truncate text-xs text-gray-500 mt-0.5">
                        {inq.propertyTitle}
                      </p>
                    </div>

                    <div className="shrink-0 text-left space-y-1">
                      <a
                        href={`tel:${inq.phone}`}
                        dir="ltr"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        {inq.phone}
                      </a>
                      <p className="text-xs text-gray-400">
                        {fmtDate(inq.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Quick-action footer ===== */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onNavigate("properties")}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Eye className="h-4 w-4" />
          إدارة العقارات
        </button>
        <button
          onClick={() => onNavigate("inquiries")}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Phone className="h-4 w-4" />
          إدارة الاستفسارات
        </button>
      </div>
    </div>
  );
}