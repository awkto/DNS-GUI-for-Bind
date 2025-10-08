import React, { useEffect, useMemo, useState } from "react";
import { CirclePlus, Edit3, Moon, Search, SunMedium, Trash2, UploadCloud, Download, Database, Globe2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

// Utility
const cn = (...c) => c.filter(Boolean).join(" ");

// UI primitives
function Button({ className, variant = "default", size = "md", children, ...props }) {
  const base = "inline-flex items-center gap-2 rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
    outline: "border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800",
    destructive: "bg-red-600 text-white hover:bg-red-500",
    ghost: "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800",
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5", icon: "p-2" };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100",
        className
      )}
      {...props}
    />
  );
}

function Select({ value, onChange, options, className }) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100",
        className
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Badge({ children, className }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}>{children}</span>;
}

function Sheet({ open, onOpenChange, side = "right", children }) {
  return open ? (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={() => onOpenChange(false)} />
      <div className={cn("absolute h-full w-full max-w-xl bg-white dark:bg-zinc-900 shadow-xl", side === "right" ? "right-0" : "left-0")}>{children}</div>
    </div>
  ) : null;
}

// Types & Mock Data
const MOCK_ZONES = [
  { value: "tux42.au", label: "tux42.au" },
  { value: "example.com", label: "example.com" },
  { value: "corp.local", label: "corp.local" },
];

const INITIAL_RECORDS = [
  { id: "1", name: "@", type: "A", content: "203.0.113.10", ttl: 3600 },
  { id: "2", name: "www", type: "CNAME", content: "@", ttl: 3600 },
  { id: "3", name: "api", type: "A", content: "198.51.100.42", ttl: 300 },
  { id: "4", name: "_acme-challenge", type: "TXT", content: "token-xyz", ttl: 120 },
  { id: "5", name: "mail", type: "MX", content: "mail.tux42.au. 10", ttl: 3600 },
  { id: "6", name: "ns1", type: "NS", content: "ns1.dns.tux42.au.", ttl: 3600 },
];

const ALL_TYPES = ["All", "A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA"];

export default function DnsManagerUI() {
  // Theme: start in LIGHT mode
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  // UI state
  const [zone, setZone] = useState(MOCK_ZONES[0].value);
  const [query, setQuery] = useState("");
  const [recordType, setRecordType] = useState("All");
  const [records, setRecords] = useState(INITIAL_RECORDS);

  const [openSheet, setOpenSheet] = useState(false);
  const [editing, setEditing] = useState(null);
  const [flash, setFlash] = useState(null);

  // Filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      const matchesQuery = !q || [r.name, r.type, r.content, String(r.ttl)].some((v) => String(v).toLowerCase().includes(q));
      const matchesType = recordType === "All" || r.type === recordType;
      return matchesQuery && matchesType;
    });
  }, [records, query, recordType]);

  // CRUD helpers
  const resetForm = () => setEditing({ id: "new", name: "", type: "A", content: "", ttl: 3600, notes: "" });

  function handleSave(rec) {
    if (!rec.content) return setFlash({ type: "error", text: "Content is required." });
    if (rec.name === undefined || rec.name === null || rec.name === "") rec.name = "@";
    setRecords((prev) => {
      const idx = prev.findIndex((p) => p.id === rec.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...rec };
        return next;
      }
      return [{ ...rec, id: String(Date.now()) }, ...prev];
    });
    setOpenSheet(false);
    setEditing(null);
    setFlash({ type: "success", text: "Record saved." });
  }

  function handleDelete(id) {
    setRecords((p) => p.filter((r) => r.id !== id));
    setFlash({ type: "success", text: "Record deleted." });
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white shadow">
                <Globe2 size={18} />
              </div>
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">DNS Manager</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Zones, records, and automation</p>
            </div>
          </div>
          <Button variant="outline" size="icon" title="Toggle theme" onClick={() => setDark((v) => !v)}>
            {dark ? <Moon size={16} /> : <SunMedium size={16} />}
          </Button>
        </div>
      </header>

      {/* Toolbar — put Search first (more left-aligned) */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6 order-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={16} />
              <Input
                placeholder="Filter by name, content, or type…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-3 order-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Zone</label>
            <Select value={zone} onChange={setZone} options={MOCK_ZONES} />
          </div>

          <div className="md:col-span-3 order-3">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Record Type</label>
            <Select value={recordType} onChange={setRecordType} options={ALL_TYPES.map((t) => ({ value: t, label: t }))} />
          </div>
        </div>

        {flash && (
          <div
            className={cn(
              "mt-4 rounded-2xl border p-3 text-sm",
              flash.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200"
            )}
          >
            {flash.text}
          </div>
        )}

        {/* Records Card */}
        <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={18} className="opacity-60" />
              <h2 className="text-sm font-semibold">Records</h2>
              <Badge className="ml-2 border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {filtered.length} shown
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setRecords([...INITIAL_RECORDS])}>
                <RefreshCw size={16} /> Reset demo
              </Button>
              <Button onClick={() => { setOpenSheet(true); resetForm(); }}>
                <CirclePlus size={16} /> Add record
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Content / Target</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">TTL</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium">{r.name || <span className="opacity-60">(unnamed)</span>}</td>
                    <td className="px-4 py-3"><Badge className="border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">{r.type}</Badge></td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{r.content}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{r.ttl}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" title="Edit" onClick={() => { setEditing(r); setOpenSheet(true); }}>
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="destructive" size="icon" title="Delete" onClick={() => handleDelete(r.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">No records match your filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-7xl text-center text-xs text-zinc-500 dark:text-zinc-400">Tip: Search filters instantly. Choose a record type from the dropdown to narrow further.</p>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-semibold">{editing?.id === "new" ? "Add DNS record" : `Edit ${editing?.name || "record"}`}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Zone: {zone}</p>
            </div>
            <Button variant="ghost" onClick={() => setOpenSheet(false)}>Close</Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {editing && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Name</label>
                  <Input placeholder="@ for root, or host label (e.g., api)" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</label>
                  <Select value={editing.type} onChange={(v) => setEditing({ ...editing, type: v })} options={["A","AAAA","CNAME","TXT","MX","NS","SRV","CAA"].map((t) => ({ value: t, label: t }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Content / Target</label>
                  <Input placeholder="IPv4, IPv6, FQDN, or text depending on type" value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">TTL (seconds)</label>
                  <Input type="number" min={0} value={editing.ttl} onChange={(e) => setEditing({ ...editing, ttl: Number(e.target.value) })} />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Changes apply to <strong>{zone}</strong></div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setOpenSheet(false)}>Cancel</Button>
                <Button onClick={() => editing && handleSave(editing)}>Save changes</Button>
              </div>
            </div>
          </div>
        </div>
      </Sheet>

      {/* Mobile CTA */}
      <div className="fixed bottom-5 right-5 md:hidden">
        <Button size="lg" className="shadow-lg" onClick={() => { setOpenSheet(true); resetForm(); }}>
          <CirclePlus size={18} /> Add record
        </Button>
      </div>
    </div>
  );
}
