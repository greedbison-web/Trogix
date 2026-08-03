import { getPlatformSettings } from "@/lib/queries/admin";
import { requireAdmin, can } from "@/lib/admin/auth";
import { PageHeader } from "../ui";
import { SettingsEditor } from "./SettingsEditor";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const NAMESPACE_LABELS: Record<string, string> = {
  tax: "Taxes",
  branding: "Default branding",
  email: "Email templates",
  flags: "Feature flags",
  trial: "Trial",
};

export default async function SettingsPage() {
  const admin = await requireAdmin("restaurants.read");

  let settings: Awaited<ReturnType<typeof getPlatformSettings>> = [];
  try {
    settings = await getPlatformSettings();
  } catch {
    settings = [];
  }

  const grouped = new Map<string, typeof settings>();
  for (const setting of settings) {
    const list = grouped.get(setting.namespace) ?? [];
    list.push(setting);
    grouped.set(setting.namespace, list);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform settings"
        subtitle="Global defaults applied across Trogix. Values are stored as JSON."
      />

      {grouped.size === 0 ? (
        <p className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-12 text-center text-caption text-ink-500">
          No settings found. Run the platform migration to seed defaults.
        </p>
      ) : (
        [...grouped.entries()].map(([namespace, rows]) => (
          <SettingsEditor
            key={namespace}
            title={NAMESPACE_LABELS[namespace] ?? namespace}
            namespace={namespace}
            settings={rows.map((r) => ({
              key: r.key,
              value: JSON.stringify(r.value),
              description: r.description,
              updatedByEmail: r.updatedByEmail,
            }))}
            canEdit={can(admin.role, "settings.write")}
          />
        ))
      )}
    </div>
  );
}
