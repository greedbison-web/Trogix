export const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export type HoursRow = {
  weekday: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

/** What each restaurant role may do. Rendered in Settings → Roles. */
export const ROLE_PERMISSIONS = {
  owner: ["Everything, including billing and team"],
  manager: ["Menu", "Tables & QR", "Orders", "Analytics", "Team"],
  cashier: ["Orders", "Payments", "Tables"],
  waiter: ["Orders", "Tables"],
  kitchen: ["Kitchen display", "Order status"],
} as const;
