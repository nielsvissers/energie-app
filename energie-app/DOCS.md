# Energie App

Deze Home Assistant-app draait de bestaande Next.js-webapp in een Docker-container.

## Vereisten

- Home Assistant met ondersteuning voor apps
- een MariaDB/MySQL-database
- toegang tot Home Assistant API met een token
- een lokaal draaiend Home Assistant op hetzelfde netwerk of via een hostnaam

## Installatie

1. Voeg deze repository toe in Home Assistant via Settings → Apps → Repositories.
2. Kies de app "Energie App" uit de lijst.
3. Vul de app-configuratie in:
   - HOME_ASSISTANT_URL
   - HOME_ASSISTANT_TOKEN
   - CRON_SECRET
   - DB_HOST
   - DB_PORT
   - DB_USER
   - DB_PASSWORD
   - DB_NAME
   - DATABASE_URL
4. Start de app.
5. Open de webinterface via Home Assistant of via http://<host>:3000.

## Belangrijk

Zet geheime waarden never in de repository. Gebruik alleen de configuratie van de Home Assistant App en sla de geheimen op in de app-configuratie van Home Assistant.

## Database

De app gebruikt Prisma en MariaDB/MySQL. De connectiestring kan als `DATABASE_URL` worden doorgegeven of opgebouwd uit de individuele DB-variabelen.

## Cron sync

De app gebruikt een `CRON_SECRET` voor beveiligde cron-calls naar de Home Assistant sync-endpoint.
De sync kan ook handmatig gestart en geconfigureerd worden via **Instellingen → Statistics-sync uitvoeren**. Deze pagina voert de sync uit via een server action; de `CRON_SECRET` komt niet in de browser terecht. Omdat de app geen gebruikerslogin heeft, kan iedereen die de app kan bereiken deze sync starten. Beperk de app daarom tot een vertrouwd netwerk.

## Home Assistant long-term statistics

De statistics-sync gebruikt Home Assistant's WebSocket API (`/api/websocket`) en de Recorder-commando's `recorder/list_statistic_ids` en `recorder/statistics_during_period`. `HOME_ASSISTANT_URL` wordt automatisch omgezet naar `ws://` of `wss://`; stel optioneel `HOME_ASSISTANT_WS_URL` in als een aparte WebSocket-host nodig is. Er is een Node.js-runtime met ingebouwde WebSocket-ondersteuning nodig.

Voer Prisma-migraties uit voordat je de sync start:

```sh
npx prisma migrate deploy
npx prisma generate
```

De eerste historische import kan met:

```sh
curl -X POST http://localhost:3000/api/homeassistant/statistics-sync \
   -H "Authorization: Bearer $CRON_SECRET" \
   -H "Content-Type: application/json" \
   -d '{"mode":"historical"}'
```

Deze eerste import scant vanaf `1970-01-01` om de oudste beschikbare statistic automatisch te vinden en verwerkt maximaal 30 dagen per verzoek. Stel optioneel `HA_STATISTICS_EARLIEST_DATE` in als de recorderdata aantoonbaar niet ouder kan zijn; stel `HA_STATISTICS_CHUNK_DAYS` in op 1-30 en `HA_STATISTICS_BATCH_SIZE` op het gewenste aantal statistic IDs per request. Gebruik geen ondergrens die ouderdomsdata uitsluit die je wilt importeren.

Daarna haalt een vervolg-sync alleen data vanaf de individuele checkpoints op:

```sh
curl -X POST http://localhost:3000/api/homeassistant/statistics-sync \
   -H "Authorization: Bearer $CRON_SECRET" \
   -H "Content-Type: application/json" \
   -d '{"mode":"incremental"}'
```

Een specifieke Belgische kalenderdag kun je opnieuw ophalen om de HA-respons en opslag te testen. Deze testmodus gebruikt alleen ingestelde metertypes, werkt `statistic_values` en `dag_metingen` bij, maar verplaatst geen incrementeel checkpoint:

```sh
curl -X POST http://localhost:3000/api/homeassistant/statistics-sync \
   -H "Authorization: Bearer $CRON_SECRET" \
   -H "Content-Type: application/json" \
   -d '{"mode":"day","date":"2026-11-11"}'
```

Voor diagnose kun je dezelfde ruwe Home Assistant-statistieken read-only opvragen via `GET /api/homeassistant/statistics`. Geef `date` op en optioneel één ingestelde HA `statisticId`:

```sh
curl "http://localhost:3000/api/homeassistant/statistics?date=2026-11-11&statisticId=sensor.zp_productie_vandaag" \
   -H "Authorization: Bearer $CRON_SECRET"
```

Laat `statisticId` weg om alle ingestelde statistieksensoren van die dag terug te krijgen. Dit endpoint schrijft niet naar de database en geeft de ruwe `start`, `state`, `sum`-punten met metadata terug, inclusief het exacte punt op de volgende lokale middernacht als eindgrens.

Een voorbeeld cronregel voor elke nacht om 03:15:

```cron
15 3 * * * curl --fail --silent --show-error -X POST http://localhost:3000/api/homeassistant/statistics-sync -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"mode":"incremental"}'
```

Server-side Next.js-code kan de service ook rechtstreeks aanroepen:

```ts
import { syncIncrementalStatistics } from '@/lib/homeassistant/statistics-sync';

export async function refreshEnergyStatistics() {
   return syncIncrementalStatistics({ chunkDays: 30 });
}
```

De WebSocket-verbinding reconnect automatisch met exponential backoff. Alleen statistic IDs die exact overeenkomen met een ingestelde `MetingType.haEntityId` worden historisch opgevraagd. Uurpunten worden idempotent in `statistic_values` opgeslagen en per Belgische kalenderdag opnieuw geaggregeerd naar `dag_metingen`; dagtotalen worden daardoor niet overschreven met alleen de laatste chunk. Tijdvakken en individuele waarden worden gelogd; foutieve statistic IDs worden overgeslagen en krijgen geen verder checkpoint, zodat volgende runs ze veilig opnieuw kunnen proberen. Voer de unit-testvoorbeelden uit met `npm run test:ha-statistics`.
