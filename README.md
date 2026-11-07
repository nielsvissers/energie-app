# Energie App

Energie App is een Next.js-webapplicatie voor het beheren, monitoren en analyseren van energiegegevens, contracten, facturen, verbruik en Home Assistant-integraties. De applicatie is bedoeld om lokaal te draaien en, afhankelijk van de omgeving, ook als Home Assistant-app te worden ingezet in een Docker-container.

## Overzicht

Deze repository bevat de broncode van een energie-applicatie met een webinterface voor:

- overzicht van energieverbruik en metingen
- beheer van contracten en tarieven
- factuuroverzicht en -analyse
- koppeling met Home Assistant
- synchronisatie van dagmetingen via API
- database-gestuurde opslag met Prisma en MariaDB/MySQL

De applicatie is gebouwd met Next.js, React, Prisma en een MariaDB/MySQL-compatibele database. Voor productie- en Home Assistant-omgevingen is containerisatie en expliciete configuratie van omgevingvariabelen essentieel.

## Functionaliteiten

De huidige applicatie ondersteunt onder meer:

- dashboard met energiegerelateerde inzichten
- overzicht en beheer van contracten
- beheer van tarieftypes en kostenstructuren
- factuurregistratie en factuurlijnen
- datasets per dag met metingstypes
- synchronisatie van data vanuit Home Assistant
- API-endpoint voor cron-achtige synchronisatie
- lokaal en containerized draaien met environment-based configuratie

## Architectuur

De applicatie maakt gebruik van:

- Next.js 16 App Router
- React 19
- Prisma ORM
- MariaDB/MySQL als databasetype
- Docker voor containerisatie
- Home Assistant-compatibele env-configuratie

## Installatie

### Vereisten

- Node.js 20 of hoger
- npm
- MariaDB of MySQL-database (voor lokaal gebruik)
- toegang tot een Home Assistant-instance (indien gebruikt voor synchronisatie)
- Docker (optioneel, voor containerized deployment)

### Lokale installatie

1. Clone de repository:

```bash
git clone <repository-url>
cd energie-app
```

2. Installeer afhankelijkheden:

```bash
npm install
```

3. Maak een lokaal environment-bestand aan op basis van je eigen waarden:

```bash
cp .env.example .env
```

4. Vul de vereiste variabelen in. Zie de sectie "Omgevingsvariabelen" hieronder.

5. Genereer Prisma Client:

```bash
npx prisma generate
```

6. Start de applicatie in ontwikkelmodus:

```bash
npm run dev
```

7. Open de app in de browser op:

```text
http://localhost:3000
```

### Productie-build

```bash
npm run build
npm run start
```

### Docker-installatie

De repository bevat een container-structuur voor Home Assistant-apps / Docker-gebaseerde deployment. Gebruik deze alleen als de benodigde environment-variabelen expliciet zijn ingesteld in je runtimeomgeving.

```bash
docker build -t energie-app .
docker run --rm -p 3000:3000 --env-file .env energie-app
```

## Configuratie

### Environment-based configuratie

De applicatie vertrouwt op omgevingvariabelen in plaats van hardcoded secrets in de broncode. Configureer deze waarden in je lokale `.env` of in de runtimeomgeving van je host, afhankelijk van de deploystrategie.

Belangrijk:

- zet geheimen nooit hardcoded in de repository
- gebruik lokale `.env`-bestanden alleen voor ontwikkeling
- gebruik vaste runtime-secretwaarden in productie of Home Assistant-opdrachten
- validateer altijd dat alle vereiste variabelen aanwezig zijn voordat de app start

### Home Assistant-app configuratie

Voor Home Assistant Apps geldt dat configuratie via de app-config gebeurt, niet via bestanden in de repository. De app verwacht waarden zoals:

- `HOME_ASSISTANT_URL`
- `HOME_ASSISTANT_TOKEN`
- `CRON_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DATABASE_URL`

De exacte waarden moeten worden ingevuld in de Home Assistant-app configuratie van de geïnstalleerde app. De repository zelf mag geen werkelijke secrets bevatten.

## Omgevingsvariabelen

De volgende variabelen worden verwacht in een lokale ontwikkelomgeving of runtime-omgeving:

```env
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=your_token_here
CRON_SECRET=your_secure_random_secret

DB_HOST=192.168.1.252
DB_PORT=3306
DB_USER=energydb
DB_PASSWORD=your_database_password
DB_NAME=energie_db
DATABASE_URL=mysql://energydb:your_database_password@192.168.1.252:3306/energie_db
```

### Opmerking

De app verwerkt deze variabelen via `process.env.*`. Als een vereiste waarde ontbreekt, zal de app expliciet een fout geven in plaats van stil te werken.

## Gebruik

### Starten van de lokale applicatie

```bash
npm run dev
```

### Bouwen voor productie

```bash
npm run build
npm run start
```

### API-synchronisatie

De app bevat een endpoint voor synchronisatie van Home Assistant-data. De route verwacht op een POST-request een optionele datum. Voorbeeld:

```bash
curl -X POST http://localhost:3000/api/ha-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"datum":"2026-11-06"}'
```

Mogelijke velden voor de body:

- `datum`
- `date`
- `targetDatum`

Als geen datum wordt meegegeven, valt de app terug op het standaardgedrag (gisteren).

## API-integraties

### Home Assistant

De app kan gegevens ophalen uit Home Assistant via een Bearer-token. Dit wordt gebruikt om historie- of meetdata te synchroniseren.

Belangrijk voor beveiliging:

- gebruik een apart token met minimale rechten
- beperk toegang tot het netwerk waar mogelijk
- controleer altijd dat de `HOME_ASSISTANT_URL` correct is
- gebruik een sterke `CRON_SECRET` voor gecodeerde synchronisatiecalls

### Prisma / database

De app maakt gebruik van Prisma voor database-interactie. De databaseconnectie moet expliciet worden configuréérd via `DATABASE_URL` of via de losse DB-variabelen.

## Ontwikkeling

### Projectstructuur

Een overzicht van de hoofdmap:

- `src/` – applicatielogica, components en routes
- `prisma/` – Prisma schema en migraties
- `public/` – statische assets
- `app-source/` – kopie van de broncode die als app-source in de Home Assistant-app-structuur kan worden gebruikt
- `energie-app/` – Home Assistant-app metadata, Dockerfile en docs
- `Dockerfile` – containerbuild voor de applicatie
- `docker-compose.yml` – lokaal compose-voorbeeld

### Aanbevolen workflow

1. zet lokale env-waarden op
2. voer `npm install` uit
3. voer `npx prisma generate` uit
4. ontwikkel lokaal met `npm run dev`
5. controleer met `npm run build` voordat je deployt

### Testen en validatie

De repository bevat geen expliciete test-suite in de huidige staat. Voor productiedepoyments wordt aanbevolen om:

- integratietests voor API-endpoints te toevoegen
- validatie van databaseconnectiviteit te automatiseren
- runtime-checks voor ontbrekende env-vars te testen

## Veelvoorkomende problemen

### 1. Prisma-client niet gevonden

Veelvoorkomend probleem:

- `npx prisma generate` is niet uitgevoerd
- `.env` ontbreekt of `DATABASE_URL` is niet beschikbaar
- Prisma-config wordt geladen zonder `dotenv`

Oplossing:

```bash
npm install --save-dev dotenv
npx prisma generate
```

### 2. Home Assistant-variabelen ontbreken

Als `HOME_ASSISTANT_URL` of `HOME_ASSISTANT_TOKEN` ontbreken, zal de app niet correct synchroniseren.

Controleer:

- de app-config in Home Assistant
- env-variabelen in de runtimeomgeving
- de `Authorization`-header voor synchronisatiecalls

### 3. Tijds-/datumproblemen

De app gebruikt `Date`-objecten en databasevelden type `Date`. Bij tijdzones kan een datum per ongeluk terugvallen op de vorige dag als deze niet expliciet lokaal worden berekend.

Gebruik vaste lokale-datumlogica voor `@db.Date`-velden en controleer op timezone-effects in productie.

### 4. Docker / container issues

Controleer of:

- `PORT` aanwezig is
- `HOSTNAME` correct is ingesteld
- env-variabelen zijn doorgegeven aan de container
- de juiste Dockerfile en app-map gebruikt worden

## AI-ondersteunde ontwikkeling

Tijdens de ontwikkeling van deze applicatie is AI gebruikt voor ondersteuning bij:

- ontwerp en architectuurideeën
- codegeneratie en refactoring
- debugging en foutanalyse
- documentatie-ondersteuning
- optimalisatie van code en ontwikkelworkflow

AI is gebruikt als hulpmiddel om ontwikkeling te versnellen en kwaliteit te verbeteren. Alle functionele keuzes, configuratie, validatie en eindverantwoordelijkheid liggen bij de ontwikkelaar. Gebruikers worden aangemoedigd om fouten, onvolledigheden of discrepanties te melden zodat de applicatie en documentatie kunnen worden verbeterd.

## Licentie

De licentie van deze repository is momenteel niet expliciet vermeld in deze documentatie. Voor productiegebruik is het raadzaam om een passende open-source licentie toe te voegen, bijvoorbeeld MIT of GPL, afhankelijk van de beoogde gebruiks- en distributievoorwaarden.

## Aanbevolen vervolgstappen voor productiegebruik

- maak een expliciete, veilige `README` voor de productieomgeving met echte host- en beveiligingsrichtlijnen
- voeg een `LICENSE`-bestand toe
- voeg testcoverage en CI-validatie toe
- documenteer alle Home Assistant-configuratievariabelen exact per deploymentomgeving
- controleer en herhaal security review voor tokens, database credentials en cron-endpoints
- valideer de app met een echte productie-database en echte Home Assistant-configuratie
- documenteer je deployflow en rollbackprocedures

## Openstaande punten en vragen

De huidige documentatie bevat nog enkele open punten die voor een volledig productiegerichte README duidelijk moeten worden gemaakt:

- welke specifieke licentie geldt voor deze repository?
- welke database wordt in productie gebruikt (MariaDB/MySQL, host, versie)?
- welke exacte Home Assistant-tokenrechten zijn vereist?
- welke Home Assistant-entity IDs of sensorbenamingen worden verwacht?
- welke beveiligingsmaatregelen gelden voor de cron-endpoint?
- is er een vaste deployomgeving of alleen lokaal gebruik?

Gebruikers en ontwikkelaars kunnen deze punten melden of aanvullen zodat de documentatie verder kan worden verbeterd.

## Contact en meldingen

Bij fouten, onduidelijkheden of gewenste verbeteringen kan de ontwikkelaar worden benaderd via de repository of de projectdocumentatie. Eventuele opmerkingen over onvolledigheden in deze README zijn welkom.
