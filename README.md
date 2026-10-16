# Hitster — webapp

Statische webapp (geen backend) voor het Hitster-spel: scan de QR-code op een kaart, het
nummer speelt af via Spotify zonder titel/artiest/jaar te laten zien. Draai de fysieke kaart om
voor het antwoord.

## Schermen

- **Start** — uitleg, inlogknop (eerste keer) of "Scan kaart", en "Instellingen".
- **Scanner** — camerabeeld (achtercamera), stopt automatisch na een geslaagde scan.
- **Speelt af** — alleen een afspeel-icoon, met *Pauze/Verder*, *Opnieuw* en *Volgende kaart*.
  Geen "Onthul"-knop: het board draait de kaart fysiek om.

## QR-inhoud

De kaarten bevatten Spotify-tracklinks, bv.:

```
https://open.spotify.com/track/5t6mxGSbrfKjocqUlsyAZH
```

Een kale Spotify-track-ID of een `spotify:track:...`-URI wordt ook herkend.

## Spotify instellen (eenmalig, per omgeving)

Deze app speelt af via de **Spotify Web Playback SDK**. Dat vereist een Spotify Premium-account
en een eigen "Developer-app" bij Spotify om een Client ID te krijgen. Er is geen backend en geen
client secret nodig (login gebeurt via Authorization Code + PKCE, volledig in de browser).

1. Ga naar <https://developer.spotify.com/dashboard> en log in met het Spotify-account dat gebruikt
   gaat worden om te spelen (moet **Premium** zijn).
2. Maak een nieuwe app aan (naam/omschrijving zijn vrij te kiezen).
3. Open de app-instellingen en voeg bij **Redirect URIs** de exacte URL toe waarop de webapp
   draait, bijvoorbeeld:
   - lokaal: `http://localhost:8000/` (of welke poort je gebruikt)
   - GitHub Pages: `https://<gebruikersnaam>.github.io/<repo-naam>/`

   De app toont de juiste waarde zelf onder **Instellingen** in het scherm ("Redirect-URI om te
   registreren") — kopieer die 1-op-1 over.
4. Kopieer de **Client ID** van het Spotify-dashboard.
5. Open de webapp, ga naar **Instellingen**, plak de Client ID en tik op **Opslaan**.
6. Tik op **Login met Spotify** en log in met het Premium-account. De sessie wordt onthouden in
   de browser (localStorage), dus dit is maar eenmalig per apparaat/browser nodig.

> Let op: dit account/app-aanmaken gebeurt bij Spotify zelf en is aan het board/de speler om te
> doen (het hoort bij een persoonlijk of gezamenlijk Spotify-account). De stappen hierboven zijn
> daarvoor bedoeld.

## Lokaal draaien

Camera-toegang vereist een secure context; `localhost` telt daarvoor mee, dus geen HTTPS-setup
nodig voor lokaal testen.

```bash
# vanuit de projectmap
python3 -m http.server 8000
# open http://localhost:8000 in de browser
```

(Of een andere statische server, zoals `npx serve .`.)

Vergeet niet de gebruikte `http://localhost:<poort>/` als redirect-URI bij Spotify te registreren
(zie boven).

## Deployen naar GitHub Pages

1. Push deze bestanden naar een GitHub-repo (root van de repo, geen build-stap nodig).
2. Ga naar **Settings → Pages** in de repo.
3. Kies als bron de branch (bv. `main`) en map `/ (root)`.
4. Na een paar minuten is de app bereikbaar op `https://<gebruikersnaam>.github.io/<repo-naam>/`.
5. Voeg die exacte URL toe als redirect-URI in het Spotify-dashboard (zie boven) en vul de Client
   ID in via **Instellingen** in de app.

## Bekende beperking: Spotify en spoilers

De app zelf toont nergens titel, artiest of jaar: niet in de UI, niet in de browsertab-titel, en
de eigen Media Session-metadata wordt neutraal gehouden ("Hitster — speelt af"). De Spotify Web
Playback SDK speelt audio echter af via een eigen, door Spotify beheerde component in de pagina.
Op sommige platformen/besturingssystemen kan het besturingssysteem (bv. lockscreen- of
notificatiebediening) daardoor toch Spotify's eigen now-playing-informatie laten zien — dat ligt
buiten de controle van deze app. Houd daar rekening mee als spoilervrij spelen cruciaal is (bv.
telefoon op "niet storen" of lockscreen-weergave uit tijdens het spel).

## Testinstructie voor de tester

1. Open de app op een telefoon (Android Chrome en iOS Safari) via de GitHub Pages-URL of een
   lokale server op het netwerk.
2. Stel bij **Instellingen** de Spotify Client ID in (vraag deze op bij de board/eigenaar van de
   Spotify Developer-app) en log in met het Premium-account.
3. Tik op **Scan kaart**, geef cameratoegang, en scan een Hitster-kaart (QR met Spotify-link).
   - Controleer: camera stopt zodra er een geldige code gescand is.
   - Controleer: er is nergens titel/artiest/jaar te zien, ook niet in de tabtitel.
4. Test de knoppen op het "Speelt af"-scherm: **Pauze/Verder**, **Opnieuw**, **Volgende kaart**
   (moet direct weer de scanner openen).
5. Test foutmeldingen:
   - Weiger camera-toegang → moet een Nederlandse melding geven.
   - Scan een QR-code die geen Spotify-link is → "Onbekende QR-code"-melding.
   - Zonder internet (vliegtuigmodus) → melding over geen internetverbinding.
   - Zonder Premium-account inloggen → melding dat Premium vereist is.
