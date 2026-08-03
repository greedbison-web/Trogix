"use client";

import { useState, useTransition } from "react";
import type { MenuCategory, MenuItemRow } from "@/lib/queries/menu";
import { SPICE_LEVELS } from "@/lib/validation/menu";
import type { ActionResult } from "./types";
import { Drawer, Field, Toggle } from "./ui";

type DraftVariant = { name: string; priceDelta: string; isDefault: boolean };
type DraftAddon = { name: string; price: string };

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function ItemEditor({
  item,
  categoryId,
  categories,
  currency,
  onClose,
  onSave,
}: {
  item: MenuItemRow | null;
  categoryId: string;
  categories: MenuCategory[];
  currency: string;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<ActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const [isVegetarian, setVegetarian] = useState(item?.isVegetarian ?? false);
  const [isAvailable, setAvailable] = useState(item?.isAvailable ?? true);
  const [isRecommended, setRecommended] = useState(item?.isRecommended ?? false);
  const [isBestseller, setBestseller] = useState(item?.isBestseller ?? false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    item?.imageUrl ?? null,
  );
  const [addons, setAddons] = useState<DraftAddon[]>(
    item?.addons.map((a) => ({ name: a.name, price: (a.price / 100).toFixed(2) })) ?? [],
  );
  const [days, setDays] = useState<number>(item?.availableDays ?? 127);
  const [variants, setVariants] = useState<DraftVariant[]>(
    item?.variants.map((v) => ({
      name: v.name,
      priceDelta: (v.priceDelta / 100).toFixed(2),
      isDefault: v.isDefault,
    })) ?? [],
  );

  function submit(formData: FormData) {
    formData.set("isVegetarian", String(isVegetarian));
    formData.set("isAvailable", String(isAvailable));
    formData.set("isRecommended", String(isRecommended));
    formData.set("isBestseller", String(isBestseller));
    formData.set(
      "variants",
      JSON.stringify(
        variants
          .filter((v) => v.name.trim() !== "")
          .map((v) => ({
            name: v.name,
            priceDelta: v.priceDelta === "" ? "0" : v.priceDelta,
            isDefault: v.isDefault,
          })),
      ),
    );

    formData.set(
      "addons",
      JSON.stringify(
        addons
          .filter((a) => a.name.trim() !== "")
          .map((a) => ({ name: a.name, price: a.price === "" ? "0" : a.price })),
      ),
    );
    formData.set("availableDays", String(days));

    startTransition(async () => {
      const result = await onSave(formData);
      if (result.ok) {
        onClose();
      } else {
        setErrors(result.errors);
        setMessage(result.message);
      }
    });
  }

  return (
    <Drawer
      title={item ? "Edit item" : "New item"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full px-5 text-caption font-medium text-ink-700 hover:bg-paper-sunken"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="item-form"
            disabled={pending}
            className="h-11 rounded-full bg-ink px-6 text-caption font-medium text-paper disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save item"}
          </button>
        </>
      }
    >
      <form id="item-form" action={submit} className="space-y-5">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}

        <Field label="Name" name="name" defaultValue={item?.name} error={errors.name} />

        <div>
          <label htmlFor="categoryId" className="text-micro font-medium text-ink-700">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={item?.categoryId ?? categoryId}
            className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body text-ink outline-none focus:border-accent"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? (
            <p role="alert" className="mt-2 text-micro text-[var(--color-state-late)]">
              {errors.categoryId}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="description" className="text-micro font-medium text-ink-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={item?.description ?? ""}
            placeholder="Coconut cream, curry leaf oil"
            className="mt-2 w-full resize-y rounded-xl border border-paper-edge bg-paper-raised px-4 py-3 text-body text-ink outline-none placeholder:text-ink-300 focus:border-accent"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={`Price (${currency})`}
            name="price"
            inputMode="decimal"
            defaultValue={item ? (item.price / 100).toFixed(2) : ""}
            placeholder="620"
            error={errors.price}
          />
          <Field
            label="Prep time (minutes)"
            name="preparationMinutes"
            inputMode="numeric"
            defaultValue={item?.preparationMinutes?.toString() ?? ""}
            placeholder="15"
            error={errors.preparationMinutes}
          />
        </div>

        <div>
          <label htmlFor="spiceLevel" className="text-micro font-medium text-ink-700">
            Spice level
          </label>
          <select
            id="spiceLevel"
            name="spiceLevel"
            defaultValue={item?.spiceLevel ?? "none"}
            className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body text-ink outline-none focus:border-accent"
          >
            {SPICE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Vegetarian" checked={isVegetarian} onChange={setVegetarian} />
          <Toggle label="Available" checked={isAvailable} onChange={setAvailable} />
          <Toggle label="Recommended" checked={isRecommended} onChange={setRecommended} />
          <Toggle label="Bestseller" checked={isBestseller} onChange={setBestseller} />
        </div>

        {/* Image */}
        <div>
          <span className="text-micro font-medium text-ink-700">Image</span>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-paper-edge bg-paper">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-micro text-ink-300">None</span>
              )}
            </div>
            <label className="cursor-pointer rounded-full border border-paper-edge bg-paper-raised px-4 py-2.5 text-caption font-medium text-ink hover:border-ink-300">
              Choose image
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setImagePreview(file ? URL.createObjectURL(file) : item?.imageUrl ?? null);
                }}
              />
            </label>
          </div>
          {errors.image ? (
            <p role="alert" className="mt-2 text-micro text-[var(--color-state-late)]">
              {errors.image}
            </p>
          ) : null}
        </div>

        {/* Variants */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-micro font-medium text-ink-700">
              Variants (Half, Full, Regular…)
            </span>
            <button
              type="button"
              onClick={() =>
                setVariants((v) => [...v, { name: "", priceDelta: "0", isDefault: v.length === 0 }])
              }
              className="text-micro font-medium text-accent-deep hover:underline"
            >
              Add variant
            </button>
          </div>

          {variants.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {variants.map((variant, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    value={variant.name}
                    onChange={(e) =>
                      setVariants((list) =>
                        list.map((v, i) =>
                          i === index ? { ...v, name: e.target.value } : v,
                        ),
                      )
                    }
                    placeholder="Half"
                    aria-label={`Variant ${index + 1} name`}
                    className="h-11 flex-1 rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption outline-none focus:border-accent"
                  />
                  <input
                    value={variant.priceDelta}
                    onChange={(e) =>
                      setVariants((list) =>
                        list.map((v, i) =>
                          i === index ? { ...v, priceDelta: e.target.value } : v,
                        ),
                      )
                    }
                    inputMode="decimal"
                    placeholder="±0"
                    aria-label={`Variant ${index + 1} price difference`}
                    className="h-11 w-24 rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption tabular-nums outline-none focus:border-accent"
                  />
                  <label className="flex h-11 items-center gap-1.5 px-1 text-micro text-ink-500">
                    <input
                      type="radio"
                      name="defaultVariant"
                      checked={variant.isDefault}
                      onChange={() =>
                        setVariants((list) =>
                          list.map((v, i) => ({ ...v, isDefault: i === index })),
                        )
                      }
                      className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                    />
                    Default
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setVariants((list) => list.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove variant ${index + 1}`}
                    className="h-11 px-2 text-micro text-ink-300 hover:text-[var(--color-state-late)]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Add-ons */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-micro font-medium text-ink-700">
              Add-ons (extra cheese, side salad…)
            </span>
            <button
              type="button"
              onClick={() => setAddons((a) => [...a, { name: "", price: "0" }])}
              className="text-micro font-medium text-accent-deep hover:underline"
            >
              Add
            </button>
          </div>

          {addons.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {addons.map((addon, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    value={addon.name}
                    onChange={(e) =>
                      setAddons((list) =>
                        list.map((a, i) => (i === index ? { ...a, name: e.target.value } : a)),
                      )
                    }
                    placeholder="Extra cheese"
                    aria-label={`Add-on ${index + 1} name`}
                    className="h-11 flex-1 rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption outline-none focus:border-accent"
                  />
                  <input
                    value={addon.price}
                    onChange={(e) =>
                      setAddons((list) =>
                        list.map((a, i) => (i === index ? { ...a, price: e.target.value } : a)),
                      )
                    }
                    inputMode="decimal"
                    placeholder="80"
                    aria-label={`Add-on ${index + 1} price`}
                    className="h-11 w-24 rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption tabular-nums outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setAddons((list) => list.filter((_, i) => i !== index))}
                    aria-label={`Remove add-on ${index + 1}`}
                    className="h-11 px-2 text-micro text-ink-300 hover:text-[var(--color-state-late)]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Availability scheduler */}
        <div className="rounded-xl border border-paper-edge bg-paper p-4">
          <span className="text-micro font-medium text-ink-700">
            Availability schedule
          </span>
          <p className="mt-1 text-micro text-ink-500">
            Leave empty to offer this item whenever you are open.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {DAYS.map((label, index) => {
              const on = (days & (1 << index)) !== 0;
              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Day ${index}`}
                  onClick={() => setDays((d) => d ^ (1 << index))}
                  className={`h-9 w-9 rounded-full text-micro font-medium transition-colors ${
                    on
                      ? "bg-ink text-paper"
                      : "border border-paper-edge text-ink-300 hover:border-ink-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="time"
              name="availableFrom"
              defaultValue={item?.availableFrom ?? ""}
              aria-label="Available from"
              className="h-11 rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption tabular-nums outline-none focus:border-accent"
            />
            <span className="text-micro text-ink-300">to</span>
            <input
              type="time"
              name="availableUntil"
              defaultValue={item?.availableUntil ?? ""}
              aria-label="Available until"
              className="h-11 rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption tabular-nums outline-none focus:border-accent"
            />
          </div>
          {errors.availableFrom || errors.availableUntil ? (
            <p role="alert" className="mt-2 text-micro text-[var(--color-state-late)]">
              {errors.availableFrom ?? errors.availableUntil}
            </p>
          ) : null}
        </div>

        {message ? (
          <p role="alert" className="text-caption text-[var(--color-state-late)]">
            {message}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}
