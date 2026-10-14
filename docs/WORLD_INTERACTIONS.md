# World interactions – Vaihe 4 / Chat B

Valmis 14.10.2026. Työkopio: `C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE`, haara `codex/world-interactions`, pohja `5de27c8`. Toteutus ja testit: `a2ec1a9`. Raportin commit löytyy haaran lokista tämän tiedoston kohdalta.

## Toteutus

`public/world-layout.mjs` sisältää jäädytetyn lvl 0 (`bridge`) / lvl 1 (`rental`) este- ja lähestymisaluemallin. Koordinaatit ovat alkuperäisen 3840×1080-maailman koordinaatteja, eivät viewport-prosentteja. Esteet ovat hyväksyttyjen focus-kuvien perusteella valittuja varovaisia ja alustavia lattiajalanjälkiä. Hahmon jalkapisteen ympärillä käytetään 12 px puolilevyistä neliöpuskuria. Koko hahmon tai esineen kuvasiluetti ei ole este. Kartta ei sisällä spritejen peittojärjestystä tai istumista.

Vientirajapinta: `WORLD_GEOMETRY`, `DEFAULT_POSITION`, `FOOT_RADIUS`, `WORLD_LAYOUTS`, `isWalkable(position, environment)`, `safePosition(position, environment)`, `moveFootpoint(position, dx, dy, environment)` ja `interactionAt(position, environment)`. Viimeinen palauttaa `poker`, `computer` tai `null`. Tuntemattomassa ympäristössä ei ole esteitä tai vuorovaikutuskohteita.

Liike pyyhkäistään ensin X-akselilla lähimpään törmäyspintaan ja sitten Y-akselilla. Näin iso siirtymä ei hyppää esteen läpi ja hahmo voi liukua reunaa pitkin. Esteen sisään joutunut lähtöpiste siirretään lähimpään vapaaseen pisteeseen esteiden pintojen ja maailman rajojen muodostamasta joukosta. Lähtöpiste ja rajat ovat vapaat. Reitit maailman molempiin päihin ja kumpaankin kohteeseen on todistettu erikseen kummassakin ympäristössä. Sillan alla pöydän edestä kulkee vapaa reitti noin y=928:ssa; vuokra-asunnossa huonekalujen yläpuolelta pääsee noin y=756–775:ssa.

`home-world.mjs`:n `movePosition` hyväksyy valinnaisen viidennen `environment`-argumentin. Nykyinen controller antaa sen aina. Vanha neljän argumentin käyttö säilyttää pelkät maailman reunat. Suunta normalisoidaan, samaan suuntaan osoittavat WASD-/nuolialiaset eivät kasvata akselin painoa, ruutuaika rajataan 0–50 ms:iin ja virheelliset ajat/vektorit eivät tuota NaN-sijaintia. Liikkumaton tai seinään pysähtynyt hahmo ei saa walking-luokkaa.

Maailman koko, jalkapisteen x=384–3456 / y=648–972, 20–80 % kameravara, cover-mitoitus ja pelkkä vaakaparallax säilyvät. W/S ei muuta kameraa eikä layerien transformaatioita. Nollakokoinen/piilotettu koti ei riko kameraa.

## E-tapahtuma ja vihje

Olemassa oleva `world-controls` näyttää `WASD / Arrow keys · Move` ja alueella lisäksi `E · Poker table` tai `E · Computer`. Elementillä on `role=status`, `aria-live=polite` ja kohteen kertova `data-target`. CSS:ää ei muutettu.

Tapahtuma lähetetään **home-elementistä**, kuplivana:

```js
new CustomEvent('home-interact', {
  bubbles: true,
  detail: { target: 'poker', environment: 'bridge' }
});
```

Sallitut target-arvot ovat `poker` ja `computer`, environment-arvot `bridge` ja `rental`. Chat A voi kuunnella `home.addEventListener('home-interact', handler)` ja kytkeä myöhemmin halutun dialogin. Tämä osuus ei avaa peliä, dialogia tai palvelinyhteyttä eikä kutsu `/api/home/*`-reittejä. E:n pitäminen pohjassa tai autorepeat ei tuota uusia tapahtumia ennen vapautusta.

Toiminnot edellyttävät aktiivista, näkyvää kotia, tunnistettua hahmoa ja tuettua ympäristöä. Avoin dialogi, input/textarea/select/form-button/contenteditable/textbox-fokus, lomakekohde, piilotettu dokumentti, blur sekä Ctrl/Alt/Meta estävät toiminnon. Pidetyt liikenäppäimet tyhjennetään estotilanteessa. Blurista, dialogista tai piilotuksesta palaava vanha autorepeat ei käynnistä liikettä: tarvitaan uusi painallus. Ympäristön/hahmon vaihto palauttaa turvallisen spawnin ja tyhjentää näppäintilan.

## Integraatiotarve Chat A:lle

**Lisää server.mjs:n sallittuihin static-tiedostoihin `/world-layout.mjs` → `public/world-layout.mjs`, MIME `text/javascript`, kuten home-world.mjs.** Selain tarvitsee tämän uuden importin; ennen static-reitin lisäämistä normaali palvelin vastaa siihen 404 ja frontend-moduulien alustus keskeytyy. Server.mjs ei kuulu B:n omistukseen, joten sitä ei muutettu.

Home-interact-tapahtuman kuluttaja, kotilobbyn käyttöliittymä, dialogisiirtymät ja moninpelin liikesynkronointi jäävät integraatioon tai myöhempään vaiheeseen. Estealueita voi tarkentaa samassa datamallissa käyttäjän kokeilun perusteella. Animaatioita, grafiikkaa, audioa, taloutta ja backendia ei muutettu.

## Varmennus

- Koko `npm test`: **68/68 läpäisee** (lähtötilassa 56). Uusia testejä 12: seitsemän layout-testiä ja viisi controller-testiä; neljä aiempaa world-testiä säilyvät.
- Jokaisen esteen sivut, tangentti/liukuminen, kulmat, valtavat siirtymät, virheelliset pisteet, esteestä poistuminen, maailman rajat, normalisoitu diagonaali, toistettavuus ja muuttumattomat syötteet.
- Molempien ympäristöjen flood-fill-reitit spawnista kumpaankin reunaan ja molempiin kohteisiin. Reitit toistetaan myös oikean movePosition-funktion enintään 50 ms askelilla.
- Varsinaisen controllerin DOM/RAF-fixture: kaikki neljä kohde/ympäristö-yhdistelmää, täsmällinen kupliva event-detail, E-lukitus, dialogit, lomakkeet, blur, näkyvyys, identiteetti, unsupported-ympäristö, modifierit, näppäinaliaset ja kameran/parallaxin säilyminen. Fixture torjuu kaikki API-kutsut.
- Paikallinen selainkoe erillisellä muistissa toimivalla testipalvelimella, satunnaisessa portissa 50310. Tilapäinen wrapper tarjosi uuden static-moduulin; lähdekoodin server.mjs:ää ei muutettu. Testihahmo käveli bridge-spawnista pöydälle ja läppärille; oikea E-vihje näkyi kummassakin. E ei avannut peliä/dialogia. Selaimessa nähty pöydän sijainti x≈1180, y≈957; kamera≈796. Rental ja tarkka tapahtumamäärä varmennettiin automaattisilla testeillä, ei erillisellä rental-selainkokeella.
- Selainkuva: `C:\Users\Teemu\.codex\visualizations\2026\10\13\01a135ab-9ec9-7c20-8f27-42b4e87299a6\world-interactions.png` (paikallinen testitodiste, ei pelin assetti).

Varsinaista data/casino.sqlite-tiedostoa tai portissa 3000 olevaa peliä ei käytetty testidatana eikä muutettu. Chat C:n staging ja alkutilan untracked AGENTS.md säilyivät koskemattomina. Muutos rajoittuu neljään toteutus-/testitiedostoon ja tähän raporttiin. Ei mergeä, pushia tai deployta. Chat A yhdistää valmiin kokonaisuuden ja ajaa yhteiset testit static-reitin lisäämisen jälkeen.
