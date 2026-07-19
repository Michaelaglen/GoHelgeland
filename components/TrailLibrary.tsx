"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Trail } from "@/lib/types";
import { listTrails, removeTrail, saveTrail } from "@/lib/trailStorage";
import { parseGpx } from "@/lib/gpx";
import Navigation from "./Navigation";

export default function TrailLibrary() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [active, setActive] = useState<Trail | null>(null);
  const [mode, setMode] = useState<"gps" | "preview">("gps");
  const [message, setMessage] = useState("");

  async function refresh() { setTrails((await listTrails()).sort((a, b) => a.name.localeCompare(b.name))); }
  useEffect(() => { refresh().catch(() => setMessage("Kunne ikke åpne lokal lagring.")); }, []);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const trail = parseGpx(await file.text(), file.name);
      await saveTrail(trail);
      await refresh();
      setMessage(`${trail.name} er lagret på denne enheten.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke lese GPX-filen.");
    } finally { event.target.value = ""; }
  }

  function start(trail: Trail, nextMode: "gps" | "preview") { setMode(nextMode); setActive(trail); }

  if (active) return <Navigation trail={active} mode={mode} onClose={() => setActive(null)} />;

  return (
    <main className="app-shell">
      <header className="mobile-header">
        <div><span className="eyebrow">LOKAL TURTESTER</span><h1>Turpilot</h1></div>
        <label className="import-button">+ Importer GPX<input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={importFile} /></label>
      </header>

      <section className="intro-card">
        <div className="compass-icon">↗</div>
        <div><h2>Test egne turspor</h2><p>GPX-filene lagres bare i denne nettleseren. Ingen konto eller opplasting til server.</p></div>
      </section>

      {message && <div className="status-message">{message}</div>}

      {trails.length === 0 ? (
        <section className="empty-state">
          <div className="empty-icon">⌁</div><h2>Ingen ruter lagret</h2>
          <p>Importer en GPX-fil fra telefonen eller datamaskinen. Deretter kan du forhåndsteste ruta eller starte GPS-navigasjon i felt.</p>
          <label className="button large">Velg GPX-fil<input hidden type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={importFile} /></label>
        </section>
      ) : (
        <section className="trail-list">
          <h2>Mine ruter <span>{trails.length}</span></h2>
          {trails.map((trail) => (
            <article className="trail-item" key={trail.slug}>
              <div className="trail-title"><div><span className="difficulty">{trail.difficulty}</span><h3>{trail.name}</h3></div><button className="icon-button" aria-label="Slett rute" onClick={async () => { if (confirm(`Slette ${trail.name}?`)) { await removeTrail(trail.slug); refresh(); } }}>×</button></div>
              <div className="trail-stats"><span><strong>{trail.distanceKm}</strong> km</span><span><strong>{trail.durationMinutes}</strong> min</span><span><strong>{trail.elevationGainM}</strong> høydemeter</span><span><strong>{trail.coordinates.length}</strong> punkter</span></div>
              <div className="action-row"><button className="button secondary" onClick={() => start(trail, "preview")}>Forhåndstest</button><button className="button" onClick={() => start(trail, "gps")}>Start med GPS</button></div>
            </article>
          ))}
        </section>
      )}
      <p className="privacy-note">Lokale data kan forsvinne dersom du sletter nettleserdata. GPX-filen bør også beholdes separat.</p>
    </main>
  );
}
