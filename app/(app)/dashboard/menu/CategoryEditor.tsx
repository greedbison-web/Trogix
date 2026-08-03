"use client";

import { useState, useTransition } from "react";
import type { MenuCategory } from "@/lib/queries/menu";
import type { ActionResult } from "./types";
import { Drawer, Field, Toggle } from "./ui";

export function CategoryEditor({
  category,
  onClose,
  onSave,
  onDelete,
}: {
  category: MenuCategory | null;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<ActionResult>;
  onDelete: (formData: FormData) => Promise<ActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isActive, setActive] = useState(category?.isActive ?? true);

  function submit(formData: FormData) {
    formData.set("isActive", String(isActive));
    startTransition(async () => {
      const result = await onSave(formData);
      if (result.ok) onClose();
      else {
        setErrors(result.errors);
        setMessage(result.message);
      }
    });
  }

  function remove() {
    if (!category) return;
    const formData = new FormData();
    formData.set("id", category.id);
    startTransition(async () => {
      const result = await onDelete(formData);
      if (result.ok) onClose();
      else setMessage(result.message);
    });
  }

  return (
    <Drawer
      title={category ? "Edit category" : "New category"}
      onClose={onClose}
      footer={
        <>
          {category ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="mr-auto h-11 rounded-full px-4 text-caption font-medium text-[var(--color-state-late)] hover:bg-paper-sunken disabled:opacity-60"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full px-5 text-caption font-medium text-ink-700 hover:bg-paper-sunken"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="category-form"
            disabled={pending}
            className="h-11 rounded-full bg-ink px-6 text-caption font-medium text-paper disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="category-form" action={submit} className="space-y-5">
        {category ? <input type="hidden" name="id" value={category.id} /> : null}

        <Field
          label="Name"
          name="name"
          defaultValue={category?.name}
          placeholder="Small Plates"
          error={errors.name}
        />

        <div>
          <label htmlFor="description" className="text-micro font-medium text-ink-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={category?.description ?? ""}
            className="mt-2 w-full resize-y rounded-xl border border-paper-edge bg-paper-raised px-4 py-3 text-body text-ink outline-none focus:border-accent"
          />
        </div>

        <Toggle label="Visible to guests" checked={isActive} onChange={setActive} />

        {message ? (
          <p role="alert" className="text-caption text-[var(--color-state-late)]">
            {message}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}
