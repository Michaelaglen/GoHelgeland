# GoHelgeland

Mobiltilpasset GPX-navigasjon for lokal testing.

## Lokalt

```bash
npm install
npm run dev
```

## Arbeidsflyt Mac → iPhone

1. Importer én eller flere GPX-filer på Mac.
2. Bruk **Forhåndstest** for å kontrollere ruta.
3. Trykk **Eksporter alle** og lagre JSON-filen i iCloud Drive eller send den til deg selv.
4. Åpne GoHelgeland på iPhone og velg **Importer rutepakke**.
5. Velg JSON-filen og start ruta med GPS.

GPX- og rutepakkefilvelgeren bruker `accept="*/*"` fordi iOS ellers kan gråmarkere `.gpx`.

## Viktig

Rutene lagres i IndexedDB i den enkelte nettleseren. De synkroniseres ikke automatisk mellom enheter. Kartfliser krever normalt nettverk, selv om besøkte ressurser kan caches av service worker.
