"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  Armchair, CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound,
  Clock3, LayoutDashboard, MoreHorizontal, Plus, Search, Settings, Trash2, Users, UtensilsCrossed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type View = "service" | "reservations" | "floor" | "guests" | "settings";
type Status = "confirmed" | "arrived" | "seated" | "finished" | "cancelled" | "no-show";
type Reservation = {
  id: number; name: string; phone: string; email: string; date: string; time: string;
  party: number; table: string; status: Status; notes: string; occasion: string;
};
type Table = { id: string; seats: number; area: string };

const TABLES: Table[] = [
  { id: "T1", seats: 2, area: "Window" }, { id: "T2", seats: 2, area: "Window" },
  { id: "T3", seats: 4, area: "Dining room" }, { id: "T4", seats: 4, area: "Dining room" },
  { id: "T5", seats: 4, area: "Dining room" }, { id: "T6", seats: 6, area: "Dining room" },
  { id: "T7", seats: 6, area: "Garden" }, { id: "T8", seats: 8, area: "Garden" }
];

const SEED: Reservation[] = [
  { id: 1, name: "Elena Petrova", phone: "+359 88 412 0052", email: "elena@example.com", date: "2026-09-17", time: "18:00", party: 2, table: "T1", status: "confirmed", occasion: "Anniversary", notes: "Window table if possible." },
  { id: 2, name: "Martin Kolev", phone: "+359 89 655 1904", email: "martin@example.com", date: "2026-09-17", time: "18:30", party: 4, table: "T3", status: "arrived", occasion: "", notes: "" },
  { id: 3, name: "Sofia Ivanova", phone: "+359 87 311 4720", email: "sofia@example.com", date: "2026-09-17", time: "19:00", party: 6, table: "T6", status: "confirmed", occasion: "Birthday", notes: "Bringing a cake." },
  { id: 4, name: "Daniel Reed", phone: "+359 88 721 8401", email: "daniel@example.com", date: "2026-09-17", time: "19:30", party: 4, table: "T4", status: "seated", occasion: "", notes: "One vegetarian guest." },
  { id: 5, name: "Maya Chen", phone: "+359 88 930 1148", email: "maya@example.com", date: "2026-09-17", time: "20:00", party: 2, table: "T2", status: "confirmed", occasion: "", notes: "" },
  { id: 6, name: "Nikolai Dimitrov", phone: "+359 89 440 7230", email: "nikolai@example.com", date: "2026-09-17", time: "20:30", party: 8, table: "T8", status: "confirmed", occasion: "Team dinner", notes: "Invoice required." },
  { id: 7, name: "Amelia Stone", phone: "+359 88 104 6295", email: "amelia@example.com", date: "2026-09-18", time: "19:00", party: 4, table: "T5", status: "confirmed", occasion: "", notes: "" },
  { id: 8, name: "Georgi Stoyanov", phone: "+359 87 602 1900", email: "georgi@example.com", date: "2026-09-16", time: "20:00", party: 6, table: "T7", status: "finished", occasion: "", notes: "" }
];

const STORAGE = "tableau-demo-reservations-v1";
const initialDate = new Date(2026, 8, 17);

export default function RestaurantManager() {
  const [view, setView] = useState<View>("service");
  const [date, setDate] = useState(initialDate);
  const [reservations, setReservations] = useState<Reservation[]>(SEED);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) setReservations(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE, JSON.stringify(reservations));
  }, [reservations, hydrated]);

  useEffect(() => {
    const context = typeof document === "undefined" ? undefined : (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({
      name: "create_reservation",
      title: "Create reservation",
      description: "Create a restaurant reservation and show it in the reservation manager.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" }, date: { type: "string" }, time: { type: "string" },
          party: { type: "number" }, phone: { type: "string" }
        },
        required: ["name", "date", "time", "party"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        const value = input as Partial<Reservation>;
        if (!value.name || !value.date || !value.time || !Number.isInteger(value.party) || Number(value.party) < 1) throw new Error("Name, date, time, and a valid party size are required.");
        const table = TABLES.find((item) => item.seats >= Number(value.party))?.id ?? "Unassigned";
        const item: Reservation = {
          id: Date.now(), name: value.name, phone: value.phone ?? "", email: "", date: value.date,
          time: value.time, party: Number(value.party), table, status: "confirmed", notes: "", occasion: ""
        };
        setReservations((current) => [...current, item]);
        return { id: item.id, status: item.status, table: item.table };
      }
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const dateKey = format(date, "yyyy-MM-dd");
  const filtered = reservations.filter((item) =>
    (view !== "service" && view !== "floor" ? true : item.date === dateKey) &&
    (item.name + " " + item.phone + " " + item.table).toLowerCase().includes(query.toLowerCase())
  );
  const today = reservations.filter((item) => item.date === dateKey && item.status !== "cancelled" && item.status !== "no-show");
  const covers = today.reduce((sum, item) => sum + item.party, 0);
  const seated = today.filter((item) => item.status === "seated").reduce((sum, item) => sum + item.party, 0);
  const guests = useMemo(() => Array.from(new Map(reservations.map((item) => [item.email || item.phone, item])).values()), [reservations]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function saveReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");
    const item: Reservation = {
      id: editing?.id ?? Date.now(),
      name: value("name"), phone: value("phone"), email: value("email"), date: value("date"),
      time: value("time"), party: Number(value("party")), table: value("table"),
      status: (editing?.status ?? "confirmed") as Status, occasion: value("occasion"), notes: value("notes")
    };
    setReservations((current) => editing ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item]);
    setDialogOpen(false);
    setEditing(null);
    flash(editing ? "Reservation updated." : "Reservation added.");
  }

  function updateStatus(id: number, status: Status) {
    setReservations((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setSelected((item) => item?.id === id ? { ...item, status } : item);
    flash("Reservation marked " + status + ".");
  }

  function removeReservation(id: number) {
    if (!window.confirm("Delete this reservation?")) return;
    setReservations((current) => current.filter((item) => item.id !== id));
    setSelected(null);
    flash("Reservation deleted.");
  }

  function editReservation(item: Reservation) {
    setSelected(null);
    setEditing(item);
    setDialogOpen(true);
  }

  return (
    <main className="app-shell">
      <Sidebar view={view} setView={setView} />
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">TABLEAU · RESTAURANT OPERATIONS</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="top-actions">
            <label className="search"><Search /><Input aria-label="Search reservations" placeholder="Search guests or tables" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <Button className="primary-action" onClick={openNew}><Plus /> New reservation</Button>
          </div>
        </header>
        {notice && <output className="toast" aria-live="polite"><Check />{notice}</output>}

        {(view === "service" || view === "floor") && <DateBar date={date} setDate={setDate} />}
        {view === "service" && (
          <ServiceView reservations={filtered} covers={covers} seated={seated} date={date} select={setSelected} status={updateStatus} />
        )}
        {view === "reservations" && <ReservationsView reservations={filtered} select={setSelected} />}
        {view === "floor" && <FloorView tables={TABLES} reservations={today} select={setSelected} />}
        {view === "guests" && <GuestsView guests={guests} reservations={reservations} />}
        {view === "settings" && <SettingsView reset={() => {
          if (!window.confirm("Reset all demo reservations?")) return;
          setReservations(SEED);
          setDate(initialDate);
          flash("Demo data reset.");
        }} />}
      </section>

      <ReservationDialog open={dialogOpen} setOpen={setDialogOpen} editing={editing} date={dateKey} submit={saveReservation} />
      <ReservationDetails selected={selected} setSelected={setSelected} edit={editReservation} status={updateStatus} remove={removeReservation} />
    </main>
  );
}

function Sidebar({ view, setView }: { view: View; setView: (view: View) => void }) {
  const links: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "service", label: "Today’s service", icon: <LayoutDashboard /> },
    { id: "reservations", label: "Reservations", icon: <CalendarDays /> },
    { id: "floor", label: "Floor plan", icon: <Armchair /> },
    { id: "guests", label: "Guests", icon: <Users /> }
  ];
  return <aside className="sidebar">
    <div className="brand"><span><UtensilsCrossed /></span><div>TABLEAU<small>RESERVATIONS</small></div></div>
    <nav>{links.map((link) => <button key={link.id} className={view === link.id ? "active" : ""} onClick={() => setView(link.id)}>{link.icon}{link.label}</button>)}</nav>
    <div className="sidebar-bottom">
      <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Settings />Settings</button>
      <div className="profile"><b>DS</b><span>Dimitar Shopov<small>Floor manager</small></span></div>
    </div>
  </aside>;
}

function DateBar({ date, setDate }: { date: Date; setDate: (date: Date) => void }) {
  return <div className="datebar">
    <div><p>Service date</p><h2>{format(date, "EEEE, MMMM d")}</h2></div>
    <div><Button variant="outline" size="icon" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft /></Button><Button variant="outline" onClick={() => setDate(initialDate)}>Today</Button><Button variant="outline" size="icon" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}><ChevronRight /></Button></div>
  </div>;
}

function ServiceView({ reservations, covers, seated, date, select, status }: { reservations: Reservation[]; covers: number; seated: number; date: Date; select: (item: Reservation) => void; status: (id: number, status: Status) => void }) {
  const waiting = reservations.filter((item) => item.status === "arrived").length;
  return <>
    <div className="stats">
      <article><span>Reservations</span><strong>{reservations.length}</strong><small>{format(date, "MMM d")} bookings</small></article>
      <article><span>Expected covers</span><strong>{covers}</strong><small>Across all sittings</small></article>
      <article><span>Guests seated</span><strong>{seated}</strong><small>Currently dining</small></article>
      <article className={waiting ? "attention" : ""}><span>Waiting</span><strong>{waiting}</strong><small>{waiting ? "Ready to be seated" : "No guests waiting"}</small></article>
    </div>
    <section className="panel">
      <div className="panel-heading"><div><p>Service timeline</p><h2>Upcoming reservations</h2></div><span>{reservations.length} bookings</span></div>
      <div className="reservation-list">
        {reservations.length ? reservations.sort((a, b) => a.time.localeCompare(b.time)).map((item) =>
          <article key={item.id} className={"reservation-row " + item.status}>
            <time>{item.time}</time>
            <span className="guest-avatar">{initials(item.name)}</span>
            <div className="guest-main"><button onClick={() => select(item)}>{item.name}</button><small>{item.phone}</small></div>
            <div className="party"><Users />{item.party} guests</div>
            <div className="table-pill"><Armchair />{item.table}</div>
            <span className={"status " + item.status}>{item.status}</span>
            <div className="row-actions">
              {item.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => status(item.id, "arrived")}>Mark arrived</Button>}
              {item.status === "arrived" && <Button size="sm" onClick={() => status(item.id, "seated")}>Seat guests</Button>}
              {item.status === "seated" && <Button size="sm" variant="outline" onClick={() => status(item.id, "finished")}>Finish</Button>}
              <Button size="icon-sm" variant="ghost" aria-label={"Open " + item.name} onClick={() => select(item)}><MoreHorizontal /></Button>
            </div>
          </article>
        ) : <div className="empty-state"><CalendarDays /><h3>No reservations for this day</h3><p>Use New reservation to add the first booking.</p></div>}
      </div>
    </section>
  </>;
}

function ReservationsView({ reservations, select }: { reservations: Reservation[]; select: (item: Reservation) => void }) {
  const groups = useMemo(() => Array.from(new Set(reservations.map((item) => item.date))).sort(), [reservations]);
  return <section className="panel reservations-page">
    <div className="panel-heading"><div><p>Booking book</p><h2>All reservations</h2></div><span>{reservations.length} total</span></div>
    {groups.map((date) => <div className="date-group" key={date}>
      <h3>{format(parseISO(date), "EEEE, MMMM d")}</h3>
      {reservations.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time)).map((item) =>
        <button className="compact-booking" key={item.id} onClick={() => select(item)}>
          <time>{item.time}</time><span><b>{item.name}</b><small>{item.party} guests · {item.table}</small></span><i className={"status " + item.status}>{item.status}</i><ChevronRight />
        </button>
      )}
    </div>)}
  </section>;
}

function FloorView({ tables, reservations, select }: { tables: Table[]; reservations: Reservation[]; select: (item: Reservation) => void }) {
  return <section className="floor-layout">
    <div className="floor-head"><div><p>DINING ROOM · 36 SEATS</p><h2>Live floor plan</h2></div><div className="legend"><span><i className="free" />Available</span><span><i className="reserved" />Reserved</span><span><i className="occupied" />Occupied</span></div></div>
    <div className="floor-grid">
      {tables.map((table) => {
        const booking = reservations.find((item) => item.table === table.id && item.status !== "finished");
        const tone = booking?.status === "seated" ? "occupied" : booking ? "reserved" : "free";
        return <button key={table.id} className={"table-card " + tone} onClick={() => booking && select(booking)}>
          <span>{table.id}</span><Armchair /><strong>{table.seats} seats</strong><small>{booking ? booking.name + " · " + booking.time : table.area}</small>
        </button>;
      })}
    </div>
  </section>;
}

function GuestsView({ guests, reservations }: { guests: Reservation[]; reservations: Reservation[] }) {
  return <section className="panel">
    <div className="panel-heading"><div><p>Guest book</p><h2>Guest profiles</h2></div><span>{guests.length} guests</span></div>
    <div className="guest-list">{guests.map((guest) => {
      const visits = reservations.filter((item) => (item.email || item.phone) === (guest.email || guest.phone));
      const completed = visits.filter((item) => item.status === "finished").length;
      return <article key={guest.email || guest.phone}><span className="guest-avatar">{initials(guest.name)}</span><div><b>{guest.name}</b><small>{guest.email || guest.phone}</small></div><div><strong>{visits.length}</strong><small>reservations</small></div><div><strong>{completed}</strong><small>completed visits</small></div><span>{guest.occasion || "Regular guest"}</span></article>;
    })}</div>
  </section>;
}

function SettingsView({ reset }: { reset: () => void }) {
  return <section className="panel settings-page">
    <div className="panel-heading"><div><p>Restaurant</p><h2>Service settings</h2></div></div>
    <label>Restaurant name<Input defaultValue="Tableau Bistro" /></label>
    <div className="setting-row"><label>Opening time<Input type="time" defaultValue="17:00" /></label><label>Closing time<Input type="time" defaultValue="23:00" /></label></div>
    <label>Default reservation duration<Select defaultValue="120"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="90">90 minutes</SelectItem><SelectItem value="120">2 hours</SelectItem><SelectItem value="150">2.5 hours</SelectItem></SelectContent></Select></label>
    <p className="local-note">This portfolio demo stores changes in your browser, so every visitor gets separate sample data.</p>
    <div className="settings-actions"><Button onClick={() => window.alert("Settings saved.")}>Save settings</Button><Button variant="outline" onClick={reset}>Reset demo data</Button></div>
  </section>;
}

function ReservationDialog({ open, setOpen, editing, date, submit }: { open: boolean; setOpen: (open: boolean) => void; editing: Reservation | null; date: string; submit: (event: FormEvent<HTMLFormElement>) => void }) {
  const fallback = TABLES.find((table) => table.seats >= (editing?.party ?? 2))?.id ?? "T8";
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="reservation-dialog"><DialogHeader><DialogTitle>{editing ? "Edit reservation" : "New reservation"}</DialogTitle><DialogDescription>{editing ? "Update the guest and table details." : "Add a booking to the reservation book."}</DialogDescription></DialogHeader>
    <form key={editing?.id ?? "new"} onSubmit={submit} className="reservation-form">
      <label>Guest name<Input name="name" defaultValue={editing?.name} required /></label>
      <div className="form-row"><label>Phone<Input name="phone" defaultValue={editing?.phone} required /></label><label>Email<Input name="email" type="email" defaultValue={editing?.email} /></label></div>
      <div className="form-row three"><label>Date<Input name="date" type="date" defaultValue={editing?.date ?? date} required /></label><label>Time<Input name="time" type="time" defaultValue={editing?.time ?? "19:00"} required /></label><label>Party size<Input name="party" type="number" min="1" max="20" defaultValue={editing?.party ?? 2} required /></label></div>
      <div className="form-row"><label>Table<Select name="table" defaultValue={editing?.table ?? fallback}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TABLES.map((table) => <SelectItem key={table.id} value={table.id}>{table.id} · {table.seats} seats · {table.area}</SelectItem>)}</SelectContent></Select></label><label>Occasion<Input name="occasion" defaultValue={editing?.occasion} placeholder="Birthday, anniversary…" /></label></div>
      <label>Notes<textarea name="notes" defaultValue={editing?.notes} placeholder="Dietary needs, seating requests…" /></label>
      <Button type="submit">{editing ? "Save changes" : "Add reservation"}</Button>
    </form>
  </DialogContent></Dialog>;
}

function ReservationDetails({ selected, setSelected, edit, status, remove }: { selected: Reservation | null; setSelected: (item: Reservation | null) => void; edit: (item: Reservation) => void; status: (id: number, status: Status) => void; remove: (id: number) => void }) {
  return <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="details-dialog"><DialogHeader><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>{selected ? format(parseISO(selected.date), "EEEE, MMMM d") + " at " + selected.time : ""}</DialogDescription></DialogHeader>
    {selected && <div className="details-grid">
      <div><span>Party</span><strong>{selected.party} guests</strong></div><div><span>Table</span><strong>{selected.table}</strong></div>
      <div><span>Status</span><strong className={"status " + selected.status}>{selected.status}</strong></div><div><span>Phone</span><strong>{selected.phone}</strong></div>
      <div className="wide"><span>Occasion</span><strong>{selected.occasion || "None noted"}</strong></div><div className="wide"><span>Notes</span><strong>{selected.notes || "No notes"}</strong></div>
      <div className="detail-actions"><Button onClick={() => edit(selected)}>Edit reservation</Button>{selected.status === "confirmed" && <Button variant="outline" onClick={() => status(selected.id, "arrived")}>Mark arrived</Button>}{selected.status === "arrived" && <Button onClick={() => status(selected.id, "seated")}>Seat guests</Button>}<Button variant="outline" onClick={() => status(selected.id, "cancelled")}>Cancel</Button><Button variant="destructive" size="icon" aria-label="Delete reservation" onClick={() => remove(selected.id)}><Trash2 /></Button></div>
    </div>}
  </DialogContent></Dialog>;
}

function viewTitle(view: View) {
  return ({ service: "Today’s service", reservations: "Reservations", floor: "Floor plan", guests: "Guest book", settings: "Settings" })[view];
}
function initials(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2); }
