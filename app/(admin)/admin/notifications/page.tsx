import { getNotifications, listRestaurants } from "@/lib/queries/admin";
import { requireAdmin, can } from "@/lib/admin/auth";
import { PageHeader } from "../ui";
import { NotificationCenter } from "./NotificationCenter";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const admin = await requireAdmin("restaurants.read");

  let notifications: Awaited<ReturnType<typeof getNotifications>> = [];
  let restaurants: Awaited<ReturnType<typeof listRestaurants>> = [];
  try {
    [notifications, restaurants] = await Promise.all([
      getNotifications(),
      listRestaurants({ limit: 200 }),
    ]);
  } catch {
    notifications = [];
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notification centre"
        subtitle="Message one restaurant or every restaurant, and raise the maintenance banner."
      />

      <NotificationCenter
        notifications={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          level: n.level,
          isMaintenanceBanner: n.isMaintenanceBanner,
          target: n.businessName ?? "All restaurants",
          publishedAt: n.publishedAt.toISOString(),
          expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
          createdByEmail: n.createdByEmail,
        }))}
        restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
        canSend={can(admin.role, "notifications.send")}
      />
    </div>
  );
}
