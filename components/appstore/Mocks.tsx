import type { ReactNode } from "react";

/* -------------------------------------------------------------------------
   Screenshots

   The store never shows marketing copy in this shelf — it shows the product.
   These are the three surfaces a restaurant actually looks at, drawn to
   scale inside a phone bezel.
   ------------------------------------------------------------------------- */

function Phone({ children, label }: { children: ReactNode; label: string }) {
  return (
    <figure className="shelf-item w-[214px] pr-3 last:pr-5">
      <div className="overflow-hidden rounded-[26px] border border-as-separator/60 bg-as-card as-card-shadow">
        <div className="relative h-[440px] w-full bg-white text-black">
          <div className="absolute left-1/2 top-2 z-10 h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-black/85" />
          {children}
        </div>
      </div>
      <figcaption className="mt-2 px-1 text-as-foot text-as-label-2">{label}</figcaption>
    </figure>
  );
}

export function ShotGuestMenu() {
  return (
    <Phone label="Guest menu — on your brand">
      <div className="flex h-full flex-col pt-8">
        <div className="px-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/40">
            Table 12 · Dine in
          </p>
          <p className="mt-0.5 text-[17px] font-bold">Bombay Canteen</p>
          <div className="mt-2 flex gap-1.5">
            {["All", "Small plates", "Mains", "Bar"].map((c, i) => (
              <span
                key={c}
                className={`rounded-full px-2 py-[3px] text-[9px] font-medium ${
                  i === 0 ? "bg-black text-white" : "bg-black/[0.06] text-black/60"
                }`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex-1 space-y-2 overflow-hidden px-3.5">
          {[
            ["Kejriwal toast", "₹340", "#ffd8a8"],
            ["Bhuna gosht", "₹520", "#ffc9c9"],
            ["Pao with butter", "₹120", "#d8f5a2"],
            ["Cold coffee", "₹260", "#c5f6fa"],
          ].map(([name, price, swatch]) => (
            <div key={name} className="flex items-center gap-2.5">
              <span
                className="h-9 w-9 shrink-0 rounded-[9px]"
                style={{ backgroundColor: swatch }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">{name}</span>
                <span className="block text-[9.5px] text-black/45">Chef&apos;s pick</span>
              </span>
              <span className="text-[10.5px] font-semibold">{price}</span>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-black text-[12px] font-bold leading-none text-white">
                +
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-black/10 p-3">
          <div className="flex h-8 items-center justify-center rounded-full bg-[#0071e3] text-[11px] font-semibold text-white">
            Place order · ₹1,240
          </div>
        </div>
      </div>
    </Phone>
  );
}

export function ShotKitchen() {
  return (
    <Phone label="Kitchen display — the pass">
      <div className="flex h-full flex-col bg-[#0d0d0f] pt-8 text-white">
        <div className="flex items-center justify-between px-3.5 pb-2">
          <p className="text-[11px] font-bold">Kitchen</p>
          <p className="text-[9px] text-white/50">4 open · 1 late</p>
        </div>
        <div className="flex-1 space-y-2 px-3">
          {[
            ["T12", "2m", "#34c759", ["Kejriwal toast ×2", "Pao ×1"]],
            ["T04", "6m", "#ffd60a", ["Bhuna gosht ×1", "Rice ×2"]],
            ["T09", "14m", "#ff453a", ["Cold coffee ×3"]],
          ].map(([table, age, colour, items]) => (
            <div key={table as string} className="rounded-[10px] bg-white/[0.07] p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">{table as string}</span>
                <span
                  className="rounded-full px-1.5 py-[1px] text-[9px] font-bold text-black"
                  style={{ backgroundColor: colour as string }}
                >
                  {age as string}
                </span>
              </div>
              <ul className="mt-1.5 space-y-1">
                {(items as string[]).map((it) => (
                  <li key={it} className="text-[10px] text-white/75">
                    {it}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex h-6 items-center justify-center rounded-full bg-white/15 text-[9.5px] font-semibold">
                Bump
              </div>
            </div>
          ))}
        </div>
      </div>
    </Phone>
  );
}

export function ShotDashboard() {
  return (
    <Phone label="Tonight — live covers and revenue">
      <div className="flex h-full flex-col pt-8">
        <div className="px-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/40">
            Saturday
          </p>
          <p className="text-[17px] font-bold">₹1,84,600</p>
          <p className="text-[9.5px] text-[#0f9d58]">▲ 18% vs last Saturday</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 px-3.5">
          {[
            ["Covers", "212"],
            ["Avg ticket", "₹871"],
            ["Tables live", "18"],
            ["Prep time", "9m"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[11px] bg-black/[0.04] p-2.5">
              <p className="text-[9px] text-black/45">{k}</p>
              <p className="text-[14px] font-bold">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-1 items-end gap-1.5 px-3.5 pb-4">
          {[38, 52, 44, 70, 96, 120, 108, 86, 64, 48].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-[3px] bg-[#0071e3]"
              style={{ height: h, opacity: 0.35 + i * 0.06 }}
            />
          ))}
        </div>
      </div>
    </Phone>
  );
}

export function Screenshots() {
  return (
    <div className="shelf -mx-5 px-5 sm:-mx-6 sm:px-6">
      <ShotGuestMenu />
      <ShotKitchen />
      <ShotDashboard />
    </div>
  );
}
