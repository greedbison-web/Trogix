/**
 * The demo restaurant used by preview mode.
 *
 * One cafe, fully populated: a menu with three sections, twelve tables, live
 * orders at different ages so the pass shows every colour, a fortnight of
 * trading for analytics, and a team. Every value is shaped to the type the
 * real query returns, so no screen can tell the difference.
 */

import type { Business, BusinessSettings } from "@/lib/db/schema/businesses";
import type { MenuCategory } from "@/lib/queries/menu";
import type { OrderRow, TimelineEntry } from "@/lib/queries/orders";
import type { TableRow } from "@/lib/queries/tables";
import type { PaymentAccountView } from "@/lib/queries/payment-account";
import type { DashboardData } from "@/lib/queries/dashboard";
import type { Analytics } from "@/lib/queries/analytics";
import type { HoursRow } from "@/lib/settings-constants";

export const PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";
export const PREVIEW_BUSINESS_ID = "00000000-0000-4000-8000-000000000002";
export const PREVIEW_EMAIL = "owner@kettleandco.example";

/** Money is stored in minor units everywhere in the app, so fixtures are too. */
const rupees = (amount: number) => amount * 100;

const now = () => new Date();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

/* -------------------------------------------------------------------------
   Business
   ------------------------------------------------------------------------- */

export const previewBusiness: Business = {
  id: PREVIEW_BUSINESS_ID,
  ownerId: PREVIEW_USER_ID,
  name: "Kettle & Co",
  slug: "kettle-and-co",
  type: "cafe",
  ownerName: "Preview Owner",
  phone: "9876500000",
  gst: "27AABCK1234M1ZP",
  addressLine: "18 Chapel Road",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400050",
  logoUrl: null,
  timezone: "Asia/Kolkata",
  currency: "INR",
  createdAt: daysAgo(96),
  updatedAt: daysAgo(1),
  deletedAt: null,
};

export const previewSettings: BusinessSettings = {
  id: "00000000-0000-4000-8000-000000000003",
  businessId: PREVIEW_BUSINESS_ID,
  logoUrl: null,
  primaryColor: "#111111",
  secondaryColor: "#449EB9",
  currency: "INR",
  timezone: "Asia/Kolkata",
  paymentMode: "upi",
  upiId: "kettleandco@okhdfcbank",
  razorpayAccountId: null,
  gstNumber: "27AABCK1234M1ZP",
  serviceCharge: 500,
  taxEnabled: true,
  receiptFooter: "Thank you — see you next time.",
  contactEmail: PREVIEW_EMAIL,
  contactPhone: "9876500000",
  website: "https://kettleandco.example",
  subscriptionPlan: "growth",
  businessStatus: "active",
  trialEndsAt: null,
  planStartedAt: daysAgo(90),
  planExpiresAt: daysAgo(-275),
  couponCode: null,
  submittedForReviewAt: daysAgo(95),
  reviewedAt: daysAgo(94),
  reviewedByEmail: "team@trogix.co.in",
  reviewNote: null,
  createdAt: daysAgo(96),
  updatedAt: daysAgo(1),
};

export const previewRecord = {
  business: previewBusiness,
  settings: previewSettings,
};

/* -------------------------------------------------------------------------
   Menu
   ------------------------------------------------------------------------- */

type Item = MenuCategory["items"][number];

function item(
  id: string,
  categoryId: string,
  name: string,
  description: string,
  price: number,
  sortOrder: number,
  extra: Partial<Item> = {},
): Item {
  return {
    id,
    categoryId,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    description,
    price: rupees(price),
    imageUrl: null,
    isVegetarian: true,
    isAvailable: true,
    isRecommended: false,
    isBestseller: false,
    spiceLevel: "none",
    preparationMinutes: 8,
    sortOrder,
    availableFrom: null,
    availableUntil: null,
    availableDays: null,
    variants: [],
    addons: [],
    ...extra,
  };
}

const COFFEE = "10000000-0000-4000-8000-000000000001";
const PLATES = "10000000-0000-4000-8000-000000000002";
const BAKERY = "10000000-0000-4000-8000-000000000003";

export const previewMenu: MenuCategory[] = [
  {
    id: COFFEE,
    name: "Coffee",
    slug: "coffee",
    description: "Roasted in Coorg, ground to order",
    isActive: true,
    sortOrder: 0,
    items: [
      item(`${COFFEE}-1`, COFFEE, "Filter Coffee", "Chicory blend, served hot", 140, 0, {
        isBestseller: true,
        preparationMinutes: 4,
        variants: [
          { id: "v1", name: "Regular", priceDelta: 0, isDefault: true, isAvailable: true },
          { id: "v2", name: "Large", priceDelta: 4_000, isDefault: false, isAvailable: true },
        ],
      }),
      item(`${COFFEE}-2`, COFFEE, "Cold Brew", "18-hour steep, orange peel", 260, 1, {
        isRecommended: true,
        preparationMinutes: 3,
      }),
      item(`${COFFEE}-3`, COFFEE, "Cortado", "Double shot, warm milk", 220, 2),
      item(`${COFFEE}-4`, COFFEE, "Masala Chai", "Ginger, green cardamom", 120, 3, {
        addons: [{ id: "a1", name: "Extra ginger", price: 2_000, isAvailable: true }],
      }),
    ],
  },
  {
    id: PLATES,
    name: "All-day plates",
    slug: "all-day-plates",
    description: "Served until close",
    isActive: true,
    sortOrder: 1,
    items: [
      item(`${PLATES}-1`, PLATES, "Kejriwal Toast", "Fried egg, green chilli, amul cheese", 340, 0, {
        isVegetarian: false,
        isBestseller: true,
        spiceLevel: "mild",
        preparationMinutes: 12,
      }),
      item(`${PLATES}-2`, PLATES, "Bombay Sandwich", "Beetroot, potato, chutney", 260, 1, {
        spiceLevel: "mild",
      }),
      item(`${PLATES}-3`, PLATES, "Akuri on Pao", "Soft scramble, coriander", 320, 2, {
        isVegetarian: false,
        spiceLevel: "medium",
        preparationMinutes: 14,
      }),
      item(`${PLATES}-4`, PLATES, "Seasonal Salad", "Whatever the market had", 290, 3, {
        isAvailable: false,
      }),
    ],
  },
  {
    id: BAKERY,
    name: "Bakery",
    slug: "bakery",
    description: "Baked at 5am, gone by 3pm",
    isActive: true,
    sortOrder: 2,
    items: [
      item(`${BAKERY}-1`, BAKERY, "Butter Croissant", "Two-day lamination", 180, 0, {
        preparationMinutes: 2,
      }),
      item(`${BAKERY}-2`, BAKERY, "Banana Bread", "Walnut, brown butter", 160, 1, {
        preparationMinutes: 2,
      }),
      item(`${BAKERY}-3`, BAKERY, "Cardamom Bun", "Pearl sugar", 200, 2, {
        isRecommended: true,
        preparationMinutes: 2,
      }),
    ],
  },
];

/* -------------------------------------------------------------------------
   Tables
   ------------------------------------------------------------------------- */

export const previewTables: TableRow[] = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const seated = [1, 4, 7, 9].includes(n);
  const billed = n === 3;
  return {
    id: `20000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
    // Numeric throughout: the kitchen pass renders a label as "T" + label,
    // so a word here reads as "TTerrace 1".
    label: String(n),
    section: n <= 8 ? "Main room" : "Terrace",
    seats: n % 3 === 0 ? 4 : 2,
    status: billed ? "billed" : seated ? "seated" : "available",
    qrToken: `preview-table-${n}`,
  };
});

/* -------------------------------------------------------------------------
   Orders — ages chosen so the pass shows fresh, working and late tickets
   ------------------------------------------------------------------------- */

function line(
  id: string,
  name: string,
  quantity: number,
  unitPrice: number,
  notes: string | null = null,
): OrderRow["items"][number] {
  return {
    id,
    nameSnapshot: name,
    variantSnapshot: null,
    quantity,
    unitPrice: rupees(unitPrice),
    lineTotal: rupees(unitPrice) * quantity,
    notes,
    status: "pending",
  };
}

function order(
  n: number,
  status: OrderRow["status"],
  tableLabel: string | null,
  ageMinutes: number,
  items: OrderRow["items"],
  extra: Partial<OrderRow> = {},
): OrderRow {
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const serviceChargeAmount = Math.round(subtotal * 0.05);
  const taxAmount = Math.round((subtotal + serviceChargeAmount) * 0.05);
  return {
    id: `30000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
    orderNumber: 1040 + n,
    status,
    type: "dine_in",
    tableLabel,
    guestName: null,
    guestPhone: null,
    notes: null,
    kitchenNote: null,
    subtotal,
    taxAmount,
    serviceChargeAmount,
    total: subtotal + serviceChargeAmount + taxAmount,
    placedAt: minutesAgo(ageMinutes),
    completedAt: null,
    paymentStatus: null,
    items,
    ...extra,
  };
}

export const previewActiveOrders: OrderRow[] = [
  order(1, "preparing", "9", 19, [
    line("l1", "Akuri on Pao", 2, 320, "One without chilli"),
    line("l2", "Filter Coffee", 2, 140),
  ], { kitchenNote: "Guest is in a hurry" }),
  order(2, "preparing", "4", 11, [
    line("l3", "Kejriwal Toast", 1, 340),
    line("l4", "Cold Brew", 1, 260),
  ]),
  order(3, "accepted", "11", 6, [
    line("l5", "Bombay Sandwich", 2, 260),
    line("l6", "Masala Chai", 3, 120),
  ]),
  order(4, "placed", "7", 2, [
    line("l7", "Cardamom Bun", 2, 200),
    line("l8", "Cortado", 2, 220),
  ]),
  order(5, "ready", "1", 24, [line("l9", "Butter Croissant", 1, 180), line("l10", "Filter Coffee", 1, 140)]),
];

export const previewOrders: OrderRow[] = [
  ...previewActiveOrders,
  order(6, "completed", "3", 58, [line("l11", "Banana Bread", 2, 160)], {
    completedAt: minutesAgo(41),
    paymentStatus: "succeeded",
  }),
  order(7, "completed", "5", 92, [
    line("l12", "Kejriwal Toast", 2, 340),
    line("l13", "Cold Brew", 2, 260),
  ], { completedAt: minutesAgo(76), paymentStatus: "succeeded" }),
  order(8, "cancelled", "6", 130, [line("l14", "Seasonal Salad", 1, 290)], {
    paymentStatus: null,
  }),
];

export function previewTimelines(): Map<string, TimelineEntry[]> {
  const map = new Map<string, TimelineEntry[]>();
  for (const o of previewOrders) {
    map.set(o.id, [
      {
        id: `${o.id}-e1`,
        type: "status",
        fromStatus: null,
        toStatus: "placed",
        note: "Placed from the table",
        createdAt: o.placedAt ?? now(),
      },
      {
        id: `${o.id}-e2`,
        type: "status",
        fromStatus: "placed",
        toStatus: o.status,
        note: null,
        createdAt: o.completedAt ?? now(),
      },
    ]);
  }
  return map;
}

/* -------------------------------------------------------------------------
   Dashboard and analytics
   ------------------------------------------------------------------------- */

export const previewDashboard: DashboardData = {
  counts: {
    categories: previewMenu.length,
    menuItems: previewMenu.reduce((n, c) => n + c.items.length, 0),
    tables: previewTables.length,
    todaysOrders: 46,
    pendingOrders: previewActiveOrders.length,
  },
  recentOrders: previewOrders.slice(0, 6).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    type: o.type,
    total: o.total,
    placedAt: o.placedAt,
    createdAt: o.placedAt ?? now(),
    tableLabel: o.tableLabel,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
  })),
  menu: {
    published: previewMenu.reduce(
      (n, c) => n + c.items.filter((i) => i.isAvailable).length,
      0,
    ),
    draft: previewMenu.reduce(
      (n, c) => n + c.items.filter((i) => !i.isAvailable).length,
      0,
    ),
    lastUpdated: daysAgo(1),
  },
};

export function previewAnalytics(days = 14): Analytics {
  const series = Array.from({ length: days }, (_, i) => {
    const date = daysAgo(days - 1 - i);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const orders = (weekend ? 62 : 38) + ((i * 7) % 11);
    return {
      day: date.toISOString().slice(0, 10),
      orders,
      revenue: rupees(orders * (weekend ? 690 : 610)),
    };
  });

  const periodOrders = series.reduce((n, d) => n + d.orders, 0);
  const periodRevenue = series.reduce((n, d) => n + d.revenue, 0);

  return {
    peakHours: [8, 9, 10, 11, 12, 13, 17, 18, 19, 20, 21].map((hour) => ({
      hour,
      orders: hour === 9 || hour === 19 ? 84 : 30 + ((hour * 5) % 27),
      revenue: (hour === 9 || hour === 19 ? 84 : 30 + ((hour * 5) % 27)) * 64_000,
    })),
    repeat: { guests: 418, repeatGuests: 149, totalVisits: 655 },
    tableUse: previewTables.map((t, i) => ({
      label: t.label,
      orders: 74 - i * 4,
      revenue: (74 - i * 4) * 64_000,
    })),
    today: { orders: 46, revenue: rupees(29_480) },
    period: {
      orders: periodOrders,
      revenue: periodRevenue,
      average: Math.round(periodRevenue / periodOrders),
    },
    series,
    topItems: [
      { name: "Filter Coffee", quantity: 312, revenue: rupees(43_680) },
      { name: "Kejriwal Toast", quantity: 188, revenue: rupees(63_920) },
      { name: "Cold Brew", quantity: 164, revenue: rupees(42_640) },
      { name: "Butter Croissant", quantity: 151, revenue: rupees(27_180) },
      { name: "Masala Chai", quantity: 143, revenue: rupees(17_160) },
      { name: "Cardamom Bun", quantity: 96, revenue: rupees(19_200) },
      { name: "Bombay Sandwich", quantity: 88, revenue: rupees(22_880) },
      { name: "Cortado", quantity: 71, revenue: rupees(15_620) },
    ],
    byType: [
      { type: "dine_in" as const, orders: Math.round(periodOrders * 0.78), revenue: Math.round(periodRevenue * 0.8) },
      { type: "takeaway" as const, orders: Math.round(periodOrders * 0.22), revenue: Math.round(periodRevenue * 0.2) },
    ],
    days,
  };
}

/* -------------------------------------------------------------------------
   Settings, team, payments
   ------------------------------------------------------------------------- */

export const previewHours: HoursRow[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  isOpen: weekday !== 1,
  opensAt: weekday === 0 || weekday === 6 ? "08:00" : "08:30",
  closesAt: weekday === 0 || weekday === 6 ? "23:30" : "22:30",
}));

export const previewStaff = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    name: "Preview Owner",
    email: PREVIEW_EMAIL,
    phone: "9876500000",
    role: "owner" as const,
    status: "active" as const,
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    name: "Ritu Shah",
    email: "ritu@kettleandco.example",
    phone: "9876500001",
    role: "manager" as const,
    status: "active" as const,
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    name: "Imran Qureshi",
    email: "imran@kettleandco.example",
    phone: "9876500002",
    role: "kitchen" as const,
    status: "active" as const,
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    name: "Neha Rao",
    email: "neha@kettleandco.example",
    phone: null,
    role: "waiter" as const,
    status: "invited" as const,
  },
];

export const previewPaymentAccount: PaymentAccountView = {
  status: "disconnected",
  accountId: null,
  accountName: null,
  accountEmail: null,
  liveMode: false,
  connectedAt: null,
  lastError: null,
};
