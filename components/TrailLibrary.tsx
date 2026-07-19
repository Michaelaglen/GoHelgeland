"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { Trail } from "@/lib/types";
import { listTrails, removeTrail, saveTrail } from "@/lib/trailStorage";
import { parseGpx } from "@/lib/gpx";
import { createRoutePack, parseRoutePack } from "@/lib/trailTransfer";
import Navigation from "./Navigation";

export default function TrailLibrary() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [active, setActive] = useState<Trail | null>(null);
  const [mode, setMode] = useState<"gps" | "preview">("gps");
  const [message, setMessage] = useState("");
  const gpxInput = useRef<HTMLInputElement | null>(null);
  const packInput = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    setTrails((await listTrails()).sort((a, b) => a.name.localeCompare(b.name, "nb")));
  }

  useEffect(() => {
    refresh().catch(() => setMessage("Kunne ikke åpne lokal lagring."));
  }, []);

  async function importGpxFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    let imported = 0;
    const errors: string[] = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".gpx")) {
        errors.push(`${file.name}: ikke en GPX-fil`);
        continue;
      }
      try {
        await saveTrail(parseGpx(await file.text(), file.name));
        imported += 1;
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : "kunne ikke leses"}`);
      }
    }

    await refresh();
    setMessage(imported ? `${imported} ${imported === 1 ? "rute" : "ruter"} lagret lokalt.${errors.length ? ` ${errors.length} fil(er) ble hoppet over.` : ""}` : errors[0] ?? "Ingen filer ble importert.");
    event.target.value = "";
  }

  async function importPack(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseRoutePack(await file.text());
      for (const trail of imported) await saveTrail(trail);
      await refresh();
      setMessage(`${imported.length} ruter ble importert fra rutepakken.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rutepakken kunne ikke importeres.");
    } finally {
      event.target.value = "";
    }
  }

  function exportPack() {
    if (!trails.length) return;
    const blob = new Blob([createRoutePack(trails)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gohelgeland-ruter-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Rutepakken er lastet ned. Send eller lagre filen i iCloud Drive, og importer den på iPhone.");
  }

  function start(trail: Trail, nextMode: "gps" | "preview") {
    setMode(nextMode);
    setActive(trail);
  }

  if (active) return <Navigation trail={active} mode={mode} onClose={() => setActive(null)} />;

  return (
    <main className="app-shell">
      <header className="mobile-header">
        <div><span className="eyebrow">GPX-NAVIGASJON</span><h1>GoHelgeland</h1></div>
        <button className="import-button" onClick={() => gpxInput.current?.click()}>+ GPX</button>
      </header>

      <input ref={gpxInput} className="visually-hidden" type="file" accept="*/*" multiple onChange={importGpxFiles} />
      <input ref={packInput} className="visually-hidden" type="file" accept="*/*" onChange={importPack} />

      <section className="intro-card">
        <div className="compass-icon">↑</div>
        <div><h2>Forbered på Mac. Test på mobil.</h2><p>Importer flere GPX-filer, test dem i nettleseren og flytt alle rutene til iPhone som én rutepakke.</p></div>
      </section>

      <section className="transfer-card">
        <div><strong>Flytt rutene mellom enheter</strong><span>Rutene lagres lokalt og synkroniseres ikke automatisk.</span></div>
        <div className="transfer-actions">
          <button className="button secondary" onClick={() => packInput.current?.click()}>Importer rutepakke</button>
          <button className="button secondary" disabled={!trails.length} onClick={exportPack}>Eksporter alle</button>
        </div>
      </section>

      {message && <div className="status-message" role="status">{message}</div>}

      {trails.length === 0 ? (
        <section className="empty-state">
          <div className="empty-icon">⌁</div><h2>Ingen ruter lagret</h2>
          <p>Velg én eller flere GPX-filer. På iPhone kan du velge dem fra Filer eller iCloud Drive.</p>
          <button className="button large" onClick={() => gpxInput.current?.click()}>Velg GPX-filer</button>
        </section>
      ) : (
        <section className="trail-list">
          <h2>Mine ruter <span>{trails.length}</span></h2>
          {trails.map((trail) => (
            <article className="trail-item" key={trail.slug}>
              <div className="trail-title">
                <div><span className="difficulty">{trail.difficulty}</span><h3>{trail.name}</h3></div>
                <button className="icon-button" aria-label={`Slett ${trail.name}`} onClick={async () => { if (confirm(`Slette ${trail.name}?`)) { await removeTrail(trail.slug); await refresh(); } }}>×</button>
              </div>
              <div className="trail-stats"><span><strong>{trail.distanceKm}</strong> km</span><span><strong>{trail.durationMinutes}</strong> min</span><span><strong>{trail.elevationGainM}</strong> høydemeter</span><span><strong>{trail.coordinates.length}</strong> punkter</span></div>
              <div className="action-row"><button className="button secondary" onClick={() => start(trail, "preview")}>Forhåndstest</button><button className="button" onClick={() => start(trail, "gps")}>Start med GPS</button></div>
            </article>
          ))}
        </section>
      )}
      <p className="privacy-note">Rutene ligger i nettleserens lokale database. Behold originale GPX-filer og en eksportert rutepakke som sikkerhetskopi.</p>
    </main>
  );
}
