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
