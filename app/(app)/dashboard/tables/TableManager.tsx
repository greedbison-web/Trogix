"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import type { TableRow } from "@/lib/queries/tables";
import { Drawer, Field } from "../menu/ui";
import {
  saveTable,
  createTablesInBulk,
  deleteTable,
  regenerateQr,
  regenerateManyQr,
} from "./actions";

export function TableManager({
  tables,
  menuBaseUrl,
}: {
  tables: TableRow[];
  menuBaseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<TableRow | null | "new">(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [qrFor, setQrFor] = useState<TableRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<"tent" | "sticker" | "poster">("tent");

  const selectedIds = [...selected];
  const pdfHref = `/dashboard/tables/pdf?layout=${layout}${
    selectedIds.length > 0 ? `&tables=${selectedIds.join(",")}` : ""
  }`;

  const tableUrl = (token: string) => `${menuBaseUrl}?t=${token}`;

  function run(fn: () => Promise<{ ok: boolean; message: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.ok ? null : result.message);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper active:scale-[0.97]"
        >
          Add table
        </button>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="h-11 rounded-full border border-paper-edge bg-paper-raised px-5 text-caption font-medium text-ink hover:border-ink-300"
        >
          Add many
        </button>
        {tables.length > 0 ? (
          <>
            <label className="flex h-11 items-center gap-2 rounded-full border border-paper-edge bg-paper-raised px-4">
              <span className="text-micro text-ink-500">Layout</span>
              <select
                value={layout}
                onChange={(e) =>
                  setLayout(e.target.value as "tent" | "sticker" | "poster")
                }
                aria-label="PDF layout"
                className="bg-transparent text-caption font-medium text-ink outline-none"
              >
                <option value="tent">Table tents · 6 per page</option>
                <option value="sticker">Stickers · 12 per page</option>
                <option value="poster">Posters · 1 per page</option>
              </select>
            </label>
            <a
              href={pdfHref}
              className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-caption font-medium text-paper"
            >
              Download PDF
              {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </a>
            <a
              href="/dashboard/tables/print"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full border border-paper-edge bg-paper-raised px-5 text-caption font-medium text-ink hover:border-ink-300"
            >
              Print sheet
            </a>
          </>
        ) : null}
      </div>

      {selected.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-full border border-paper-edge bg-paper-raised px-4 py-2.5">
          <span className="text-micro font-medium text-ink">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => run(() => regenerateManyQr(selectedIds))}
            className="h-8 rounded-full border border-paper-edge px-3 text-micro font-medium text-ink-700 hover:border-ink-300"
          >
            Regenerate codes
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

      {notice ? (
        <p role="alert" className="mt-4 text-caption text-[var(--color-state-late)]">
          {notice}
        </p>
      ) : null}

      {tables.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-paper-edge bg-paper-raised px-6 py-16 text-center">
          <p className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
            No tables yet
          </p>
          <p className="mx-auto mt-3 max-w-[320px] text-caption leading-relaxed text-ink-500">
            Add your tables and Trogix generates a unique QR code for each one.
            A guest scans it and your menu opens on their phone.
          </p>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="mt-7 h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper"
          >
            Add your tables
          </button>
        </div>
      ) : (
        <ul
          className={`mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${pending ? "opacity-60" : ""}`}
        >
          {tables.map((table) => (
            <li
              key={table.id}
              className="rounded-2xl border border-paper-edge bg-paper-raised p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(table.id)}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (next.has(table.id)) next.delete(table.id);
                        else next.add(table.id);
                        return next;
                      })
                    }
                    aria-label={`Select table ${table.label}`}
                    className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                  />
                  <div className="min-w-0">
                  <p className="font-serif text-[1.75rem] leading-none tracking-[-0.02em]">
                    {table.label}
                  </p>
                  <p className="mt-2 text-micro text-ink-500">
                    {table.seats} {table.seats === 1 ? "seat" : "seats"}
                    {table.section ? ` · ${table.section}` : ""}
                  </p>
                  </div>
                </div>
                <span className="rounded-full bg-paper-sunken px-2.5 py-1 text-[11px] font-medium capitalize text-ink-500">
                  {table.status}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setQrFor(table)}
                  className="h-9 rounded-full bg-ink px-3.5 text-micro font-medium text-paper"
                >
                  QR code
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(table)}
                  className="h-9 rounded-full border border-paper-edge px-3.5 text-micro font-medium text-ink-700 hover:border-ink-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const formData = new FormData();
                    formData.set("id", table.id);
                    run(() => deleteTable(formData));
                  }}
                  className="h-9 rounded-full px-3 text-micro font-medium text-[var(--color-state-late)] hover:bg-paper-sunken"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <TableEditor
          table={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {bulkOpen ? <BulkEditor onClose={() => setBulkOpen(false)} /> : null}

      {qrFor ? (
        <QrDialog
          table={qrFor}
          url={tableUrl(qrFor.qrToken)}
          onClose={() => setQrFor(null)}
          onRegenerate={() => {
            const formData = new FormData();
            formData.set("id", qrFor.id);
            run(() => regenerateQr(formData));
            setQrFor(null);
          }}
        />
      ) : null}
    </div>
  );
}

function TableEditor({
  table,
  onClose,
}: {
  table: TableRow | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Drawer
      title={table ? "Edit table" : "New table"}
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
            form="table-form"
            disabled={pending}
            className="h-11 rounded-full bg-ink px-6 text-caption font-medium text-paper disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="table-form"
        action={(formData) =>
          startTransition(async () => {
            const result = await saveTable(formData);
            if (result.ok) onClose();
            else {
              setErrors(result.errors);
              setMessage(result.message);
            }
          })
        }
        className="space-y-5"
      >
        {table ? <input type="hidden" name="id" value={table.id} /> : null}
        <Field
          label="Table name"
          name="label"
          defaultValue={table?.label}
          placeholder="12"
          error={errors.label}
        />
        <Field
          label="Section"
          name="section"
          defaultValue={table?.section ?? ""}
          placeholder="Terrace"
        />
        <Field
          label="Seats"
          name="seats"
          inputMode="numeric"
          defaultValue={String(table?.seats ?? 2)}
          error={errors.seats}
        />
        {message ? (
          <p role="alert" className="text-caption text-[var(--color-state-late)]">
            {message}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}

function BulkEditor({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Drawer
      title="Add many tables"
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
            form="bulk-form"
            disabled={pending}
            className="h-11 rounded-full bg-ink px-6 text-caption font-medium text-paper disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create tables"}
          </button>
        </>
      }
    >
      <form
        id="bulk-form"
        action={(formData) =>
          startTransition(async () => {
            const result = await createTablesInBulk(formData);
            if (result.ok) onClose();
            else setMessage(result.message);
          })
        }
        className="space-y-5"
      >
        <Field label="How many" name="count" inputMode="numeric" defaultValue="10" />
        <Field label="Name prefix" name="prefix" placeholder="T" defaultValue="" />
        <Field label="Start numbering at" name="startAt" inputMode="numeric" defaultValue="1" />
        <Field label="Seats each" name="seats" inputMode="numeric" defaultValue="2" />
        <p className="text-micro text-ink-500">
          With prefix “T” starting at 1 you get T1, T2, T3 and so on. Names that
          already exist are skipped.
        </p>
        {message ? (
          <p role="alert" className="text-caption text-[var(--color-state-late)]">
            {message}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}

function QrDialog({
  table,
  url,
  onClose,
  onRegenerate,
}: {
  table: TableRow;
  url: string;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  if (dataUrl === null) {
    QRCode.toDataURL(url, {
      width: 640,
      margin: 1,
      color: { dark: "#111111", light: "#F4F1EA" },
    }).then(setDataUrl);
  }

  return (
    <Drawer
      title={`Table ${table.label}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onRegenerate}
            className="mr-auto h-11 rounded-full px-4 text-caption font-medium text-ink-700 hover:bg-paper-sunken"
          >
            Regenerate
          </button>
          {dataUrl ? (
            <a
              href={dataUrl}
              download={`trogix-table-${table.label}.png`}
              className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-caption font-medium text-paper"
            >
              Download PNG
            </a>
          ) : null}
        </>
      }
    >
      <div className="text-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR code for table ${table.label}`}
            className="mx-auto h-64 w-64 rounded-2xl border border-paper-edge"
          />
        ) : (
          <div className="mx-auto h-64 w-64 rounded-2xl border border-paper-edge bg-paper-sunken" />
        )}
        <p className="mt-6 break-all text-micro text-ink-500">{url}</p>
        <p className="mt-4 text-caption text-ink-500">
          Regenerating invalidates the old code. Reprint before you do it.
        </p>
      </div>
    </Drawer>
  );
}
