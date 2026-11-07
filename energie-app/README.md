# Energie App

Welkom bij Energie App. Deze app helpt je om je energiegebruik overzichtelijk bij te houden in Home Assistant.

Je kunt hiermee onder andere:

- je contracten en tarieven beheren
- facturen en energiekosten volgen
- verbruik per dag bekijken
- metingen uit Home Assistant synchroniseren
- een overzicht krijgen van je energiegegevens in één omgeving

De app is gemaakt voor gebruikers die hun energiegegevens willen beheren zonder alles handmatig in Excel of een apart systeem bij te houden.

## Wat heb je nodig?

Voordat je de app installeert, heb je het volgende nodig:

- een werkende Home Assistant-installatie
- toegang tot je Home Assistant-instance
- een MariaDB of MySQL database
- een Home Assistant-toegangstoken voor de koppeling
- een veilige geheime code voor de synchronisatie

## Hoe installeer je de app?

1. Voeg de repository toe in Home Assistant.
2. Zoek naar Energie App in de beschikbare apps.
3. Kies Installeren.
4. Vul de vereiste instellingen in wanneer Home Assistant hierom vraagt.
5. Start de app en controleer of de gegevens correct worden geladen.

## Welke waardes moet ik invullen?

Bij installatie worden de volgende waarden gevraagd:

### Home Assistant

- Home Assistant URL
  - Bijvoorbeeld: `http://homeassistant.local:8123`
- Home Assistant token
  - Een lange-lived access token uit je Home Assistant-account
- Cron secret
  - Een geheime code die gebruikt wordt voor veilige synchronisatie

### Database

- Database host
- Database poort
- Gebruikersnaam
- Wachtwoord
- Databasenaam

Voorbeeld:

```text
DB_HOST=192.168.1.50
DB_PORT=3306
DB_USER=energie_app
DB_PASSWORD=veilige_wachtwoord
DB_NAME=energie_db
```

> De echte waarden worden normaal ingevuld in de configuratie van de app in Home Assistant. Deze worden niet in de repository opgeslagen.

## Waar voer ik de geheimen in?

De voorkeur is om de echte waarden in de Home Assistant-configuratie van de app in te voeren tijdens het toevoegen of aanpassen van de app.

Niet in de repository, niet in een hardcoded bestand en niet in de code zelf.

Dus:

- lokaal testen: `.env` gebruiken
- in Home Assistant: de app-configuratie gebruiken
- in productie: echte waarden alleen in de runtimeomgeving van Home Assistant invoeren

## Hoe werkt de synchronisatie?

De app kan metingen uit Home Assistant ophalen en opslaan in de database. Hiervoor wordt een beveiligde synchronisatie gebruikt.

De synchronisatie kan worden gestart via een veilige API-call. De app controleert dan of de juiste geheime code is meegegeven.

## Veiligheid

Zorg ervoor dat je:

- een sterk wachtwoord of sterke geheime code gebruikt
- geen echte databasegegevens in de repository zet
- alleen de minimale toegang geeft die nodig is
- de Home Assistant-token niet deelt met anderen

## Veelgestelde vragen

### Hoe weet ik welke URL ik moet invullen?

Gebruik de URL van je Home Assistant-webinterface, bijvoorbeeld:

```text
http://homeassistant.local:8123
```

of als je een externe toegang hebt:

```text
https://huisnaam.duckdns.org
```

### Welke database heb ik nodig?

Je hebt een MariaDB of MySQL database nodig. De app slaat er metingen, contractgegevens en factuurinformatie in op.

### Werkt dit alleen in Home Assistant?

De app is bedoeld voor Home Assistant-gebruik, maar kan ook lokaal worden ontwikkeld en getest. De echte waarden voor productie worden echter meestal via Home Assistant zelf ingevoerd.

### Waarom zie ik geen data?

Controleer dan het volgende:

- Home Assistant URL is juist
- token is geldig
- databasegegevens kloppen
- cron geheim is ingevuld
- de app is opnieuw gestart na het wijzigen van de instellingen

### Mijn app start niet goed

Controleer of alle verplichte velden zijn ingevuld. Als een waarde ontbreekt, kan de app niet correct starten.

## Support en feedback

Als je een probleem tegenkomt, een fout ziet of een verbetering wilt voorstellen, kun je dit melden via de repository of de projectdocumentatie.

Deze app is bedoeld om praktisch en eenvoudig te gebruiken in een Home Assistant-omgeving. Als je tijdens de installatie iets niet direct begrijpt, controleer eerst de instellingen hierboven en vul de waardes precies in zoals je Home Assistant deze gebruikt.

## Samenvatting

Kort gezegd:

- installeer de app via Home Assistant
- vul je Home Assistant-URL, token en databasegegevens in
- gebruik een veilige cron code
- controleer of alles goed is ingesteld na de eerste start

Als je de app goed configureert, kun je je energiegegevens eenvoudig volgen zonder handmatige administratie.
