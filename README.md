# Turpilot – testklar GPX-navigasjon

Mobiltilpasset Next.js-app for å importere og teste egne GPX-ruter. Det finnes ingen demo-ruter, konto eller serverlagring.

## Kjør lokalt

```bash
npm install
npm run dev
```

Åpne `http://localhost:3000`.

## Test i vanlig nettleser

1. Importer en GPX-fil.
2. Trykk **Forhåndstest**.
3. Flytt skyveknappen langs ruta for å simulere progresjon.

## Test på mobil i felt

GPS krever en sikker HTTPS-adresse på mobil. Den enkleste løsningen er å legge prosjektet på GitHub og importere det i Vercel. Åpne Vercel-adressen på mobilen, importer GPX-filen der og trykk **Start med GPS**.

GPX-rutene lagres lokalt i nettleserens IndexedDB. De synkroniseres ikke mellom PC og mobil. Importer derfor filene på hver enhet du tester med.

## Viktige begrensninger

- Kartfliser kommer fra OpenStreetMap og krever normalt internett. Allerede viste fliser kan være tilgjengelige i nettleserbufferen, men dette er ikke garantert offline-kart.
- GPS-avvik varsles først når posisjonen er tilstrekkelig nøyaktig og avstanden fra ruta overstiger en dynamisk terskel.
- Kontroller alltid GPX-spor fysisk før andre bruker dem.
- En nettapp kan bli begrenset når skjermen låses. Hold skjermen aktiv under tidlige felttester.
