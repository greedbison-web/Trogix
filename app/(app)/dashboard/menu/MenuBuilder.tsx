"use client";

import { useMemo, useState, useTransition } from "react";
import type { MenuCategory, MenuItemRow } from "@/lib/queries/menu";
import {
  saveCategory,
  deleteCategory,
  reorderCategories,
  saveMenuItem,
  reorderMenuItems,
  setItemsAvailability,
  deleteMenuItems,
} from "./actions";
import { ItemEditor } from "./ItemEditor";
import { CategoryEditor } from "./CategoryEditor";
import { MenuPreview } from "./MenuPreview";
import { formatMoney } from "@/lib/format";

type Filter = "all" | "available" | "unavailable" | "veg" | "nonveg" | "recommended";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
  { value: "veg", label: "Veg" },
  { value: "nonveg", label: "Non-veg" },
  { value: "recommended", label: "Recommended" },
];

export function MenuBuilder({
  categories,
  currency,
  businessName,
}: {
  categories: MenuCategory[];
  currency: string;
  businessName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<
    { item: MenuItemRow | null; categoryId: string } | null
  >(null);
  const [editingCategory, setEditingCategory] = useState<
    MenuCategory | null | "new"
  >(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [dragCategory, setDragCategory] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<{ id: string; categoryId: string } | null>(
    null,
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        if (q && !`${item.name} ${item.description ?? ""}`.toLowerCase().includes(q)) {
          return false;
        }
        switch (filter) {
          case "available":
            return item.isAvailable;
          case "unavailable":
            return !item.isAvailable;
          case "veg":
            return item.isVegetarian;
          case "nonveg":
            return !item.isVegetarian;
          case "recommended":
            return item.isRecommended;
          default:
            return true;
        }
      }),
    }));
  }, [categories, query, filter]);

  const matchCount = visible.reduce((n, c) => n + c.items.length, 0);
  const filtering = query.trim() !== "" || filter !== "all";

  function run(fn: () => Promise<{ ok: boolean; message: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.ok ? null : result.message);
      if (result.ok) setSelected(new Set());
    });
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* -------------------------------------------------- category drag/drop */

  function onCategoryDrop(targetId: string) {
    if (!dragCategory || dragCategory === targetId) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(dragCategory);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragCategory(null);
    run(() => reorderCategories(ids));
  }

  /* ------------------------------------------------------ item drag/drop */

  function onItemDrop(categoryId: string, targetId: string | null) {
    if (!dragItem) return;
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    const ids = category.items
      .map((i) => i.id)
      .filter((id) => id !== dragItem.id);
    const insertAt = targetId ? ids.indexOf(targetId) : ids.length;
    ids.splice(insertAt < 0 ? ids.length : insertAt, 0, dragItem.id);

    setDragItem(null);
    run(() => reorderMenuItems(categoryId, ids));
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu items"
              aria-label="Search menu items"
              className="h-11 w-full rounded-full border border-paper-edge bg-paper-raised pl-4 pr-4 text-caption text-ink outline-none transition-colors duration-200 placeholder:text-ink-300 focus:border-accent"
            />
          </div>
          <button
            type="button"
            onClick={() => setEditingCategory("new")}
            className="h-11 shrink-0 rounded-full border border-paper-edge bg-paper-raised px-5 text-caption font-medium text-ink transition-colors duration-200 hover:border-ink-300"
          >
            Add category
          </button>
          <button
            type="button"
            disabled={categories.length === 0}
            onClick={() =>
              setEditingItem({ item: null, categoryId: categories[0]?.id ?? "" })
            }
            className="h-11 shrink-0 rounded-full bg-ink px-5 text-caption font-medium text-paper transition-all duration-300 active:scale-[0.97] disabled:opacity-40"
          >
            Add item
          </button>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`h-8 rounded-full px-3.5 text-micro font-medium transition-colors duration-200 ${
                filter === option.value
                  ? "bg-ink text-paper"
                  : "border border-paper-edge bg-paper-raised text-ink-500 hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
          {filtering ? (
            <span className="flex h-8 items-center text-micro text-ink-300">
              {matchCount} {matchCount === 1 ? "match" : "matches"}
            </span>
          ) : null}
        </div>

        {notice ? (
          <p role="alert" className="mt-4 text-caption text-[var(--color-state-late)]">
            {notice}
          </p>
        ) : null}

        {/* Bulk bar */}
        {selected.size > 0 ? (
          <div className="sticky top-[76px] z-20 mt-4 flex flex-wrap items-center gap-3 rounded-full border border-paper-edge bg-paper-raised/90 px-4 py-2.5 shadow-lift backdrop-blur-xl">
            <span className="text-micro font-medium text-ink">
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={() => run(() => setItemsAvailability([...selected], true))}
              className="h-8 rounded-full border border-paper-edge px-3 text-micro font-medium text-ink-700 hover:border-ink-300"
            >
              Mark available
            </button>
            <button
              type="button"
              onClick={() => run(() => setItemsAvailability([...selected], false))}
              className="h-8 rounded-full border border-paper-edge px-3 text-micro font-medium text-ink-700 hover:border-ink-300"
            >
              Mark unavailable
            </button>
            <button
              type="button"
              onClick={() => run(() => deleteMenuItems([...selected]))}
              className="h-8 rounded-full px-3 text-micro font-medium text-[var(--color-state-late)] hover:bg-paper-sunken"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-micro text-ink-500 hover:text-ink"
            >
              Clear
            </button>
          </div>
        ) : null}

        {/* Categories */}
        <div className={`mt-6 space-y-6 ${pending ? "opacity-60" : ""}`}>
          {categories.length === 0 ? (
            <EmptyMenu onAdd={() => setEditingCategory("new")} />
          ) : (
            visible.map((category) => (
              <section
                key={category.id}
                draggable
                onDragStart={() => setDragCategory(category.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onCategoryDrop(category.id)}
                className={`rounded-2xl border bg-paper-raised transition-colors duration-200 ${
                  dragCategory === category.id
                    ? "border-accent"
                    : "border-paper-edge"
                }`}
              >
                <header className="flex items-center gap-3 border-b border-paper-edge px-5 py-4">
                  <span
                    aria-hidden="true"
                    className="cursor-grab text-ink-300 active:cursor-grabbing"
                  >
                    ⠿
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
                      {category.name}
                    </h2>
                    <p className="mt-1.5 text-micro text-ink-500">
                      {category.items.length}{" "}
                      {category.items.length === 1 ? "item" : "items"}
                      {category.isActive ? "" : " · hidden from guests"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(category)}
                    className="h-8 rounded-full border border-paper-edge px-3 text-micro font-medium text-ink-700 hover:border-ink-300"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ item: null, categoryId: category.id })}
                    className="h-8 rounded-full bg-ink px-3 text-micro font-medium text-paper"
                  >
                    Add item
                  </button>
                </header>

                {category.items.length === 0 ? (
                  <p
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onItemDrop(category.id, null)}
                    className="px-5 py-8 text-center text-caption text-ink-300"
                  >
                    {filtering ? "No items match." : "No items yet."}
                  </p>
                ) : (
                  <ul
                    className="divide-y divide-paper-edge"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onItemDrop(category.id, null)}
                  >
                    {category.items.map((item) => (
                      <li
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDragItem({ id: item.id, categoryId: category.id });
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.stopPropagation();
                          onItemDrop(category.id, item.id);
                        }}
                        className={`flex items-center gap-3 px-5 py-3 ${
                          dragItem?.id === item.id ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                        />
                        <span aria-hidden="true" className="cursor-grab text-ink-300">
                          ⠿
                        </span>

                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg border border-paper-edge object-cover"
                          />
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            setEditingItem({ item, categoryId: category.id })
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex items-center gap-2">
                            <VegMark veg={item.isVegetarian} />
                            <span className="truncate text-caption text-ink">
                              {item.name}
                            </span>
                            {item.isBestseller ? <Tag>Bestseller</Tag> : null}
                            {item.isRecommended ? <Tag>Recommended</Tag> : null}
                          </span>
                          {item.description ? (
                            <span className="mt-0.5 block truncate text-micro text-ink-500">
                              {item.description}
                            </span>
                          ) : null}
                        </button>

                        <span className="shrink-0 text-caption tabular-nums text-ink-700">
                          {formatMoney(item.price, currency)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            run(() => setItemsAvailability([item.id], !item.isAvailable))
                          }
                          aria-pressed={item.isAvailable}
                          aria-label={`${item.isAvailable ? "Mark unavailable" : "Mark available"}: ${item.name}`}
                          className={`h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
                            item.isAvailable
                              ? "border-accent bg-accent"
                              : "border-paper-edge bg-paper-sunken"
                          }`}
                        >
                          <span
                            className={`block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                              item.isAvailable ? "translate-x-[26px]" : "translate-x-[3px]"
                            }`}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>
      </div>

      {/* Instant preview */}
      <div className="xl:sticky xl:top-24 xl:self-start">
        <MenuPreview
          categories={visible}
          currency={currency}
          businessName={businessName}
        />
      </div>

      {editingItem ? (
        <ItemEditor
          item={editingItem.item}
          categoryId={editingItem.categoryId}
          categories={categories}
          currency={currency}
          onClose={() => setEditingItem(null)}
          onSave={saveMenuItem}
        />
      ) : null}

      {editingCategory ? (
        <CategoryEditor
          category={editingCategory === "new" ? null : editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={saveCategory}
          onDelete={deleteCategory}
        />
      ) : null}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-paper-sunken px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-500">
      {children}
    </span>
  );
}

export function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
        veg ? "border-[#3E8E5A]" : "border-[#B4462F]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-[#3E8E5A]" : "bg-[#B4462F]"}`}
      />
    </span>
  );
}

function EmptyMenu({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-paper-edge bg-paper-raised px-6 py-16 text-center">
      <p className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
        Your menu is empty
      </p>
      <p className="mx-auto mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
        Start with a category — Small Plates, Mains, Wine — then add the dishes
        that belong to it.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-7 h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper"
      >
        Add your first category
      </button>
    </div>
  );
}
