import { createEvent } from "../../actions";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Majlis Baharu</h1>
      <form action={createEvent} className="card space-y-4">
        <div>
          <label className="label" htmlFor="title">Nama majlis / program *</label>
          <input id="title" name="title" className="input" required
            placeholder="cth. Bengkel Pengurusan Data Sekolah 2026" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="event_date">Tarikh</label>
            <input id="event_date" name="event_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="location">Tempat</label>
            <input id="location" name="location" className="input" placeholder="cth. PPD Manjung" />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Selepas dicipta, anda boleh menyesuaikan medan borang kehadiran dan memilih templat sijil.
        </p>
        <button type="submit" className="btn-primary w-full">Cipta Majlis</button>
      </form>
    </div>
  );
}
