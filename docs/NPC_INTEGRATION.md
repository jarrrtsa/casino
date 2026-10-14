# Nimettyjen NPC-hahmojen palvelinintegraatio – Chat A, vaihe 2

Tila 14.10.2026: valmis. Haara codex/npc-integration; yhteinen lähtöcommit bc0247e.

## Tarkistettu edellinen työ

Chat B:n commitit 0b61a49 ja cc2f7fe sisälsivät vain sovitut bots.mjs-, npc-equity.mjs-, test/bots.test.mjs- ja docs/NPC_GAMEPLAY.md-muutokset. Katselmoin rajapinnan yhteensopivuuden, näkyvän tiedon käytön, panostusrajat ja testit. Getter-ansat kattavat oikean pakan ja vastustajan piilokortit. Kolme tyyliä ja 64 näytteen postflop-arvio toimivat nykyisen pokerimoottorin kanssa. Heuristiikka ei mallinna erillistä voitto-osuutta jokaiselle sivupotille eikä opi vastustajien käsirangeja; nämä on kirjattu NPC_GAMEPLAY.md:n rajoiksi.

Työt yhdistettiin commitissa bc0247e. Kaikki 33 silloista testiä läpäisivät yhteisessä versiossa.

## Toteutus

npc-roster.mjs sisältää jäädytetyn NPC-profiililuettelon. Mara käyttää cautious-tyyliä ja Jules aggressive-tyyliä. Nimet ja nykyiset asut/värit säilyvät. Profiilit ovat pysyviä, mutta jokainen pöytä saa omat satunnaiset pelaajatunnisteet, stackit ja erilliset ulkonäköoliot.

server.mjs luo NPC-paikat profiililuettelosta ja valitsee botActionin neljännen argumentin palvelimella profiilitunnisteen perusteella. Clientin lähettämät style, npcProfileId tai bots eivät muuta rosteria. Puuttuva/tuntematon sisäinen profiili käyttää balanced-oletusta. botActionin strategiaa, pokerisääntöjä tai talouden lukuja ei muutettu.

Julkisen room.players-taulukon lisäkenttä:

- NPC: `npc: { id: 'mara' | 'jules', style: 'cautious' | 'aggressive' }`.
- Tavallinen pelaaja: `npc: null`.
- Tuntematon sisäinen NPC: `npc: { id: null, style: 'balanced' }`.

Tämä on taaksepäin yhteensopiva lisäkenttä. Nykyinen frontend jatkaa ennallaan; tyylin näkyvää esittämistä ei lisätty. Vastaukseen ei lisätä piilokortteja, simulaation näytteitä, oikeaa pakkaa tai arvioitua equityä. Profiilit eivät vielä vaihdu asumistason mukaan.

## Varmennus

Kaikki 35 testiä läpäisevät. Kaksi uutta testiä varmentavat jäädytetyt profiilit, erilliset pöytäkohtaiset tunnisteet ja tilan, fallbackin, clientin rosteriyritysten ohittamisen sekä kokonaisen NPC-pelin etenemisen.

Yhteinen integraatiotesti pelaa NPC-jaon, tarkistaa korttien yksityisyyden, merkkien kokonaismäärän ja XP:n, poistuu pöydästä, käynnistää palvelimen uudelleen samalla erillisellä testitietokannalla ja palauttaa hahmon. Rahat, historia ja XP säilyvät, vanhat käyttö- ja pöytäavaimet hylätään, ja palautettu hahmo voi liittyä uuteen NPC-pöytään ja poistua siitä ilman uutta alkusaldoa.

Todellista pelitietokantaa ei käytetty. Ei design-, audio-, frontend-, push- tai deploymuutoksia.

## Seuraava integraatio

Chat B rakentaa palautuksen käyttöliittymän haarassa codex/recovery-ui samasta yhdistetystä pohjasta. Kun se valmistuu, Chat A tarkistaa identiteetin vaihdon, vanhojen vastausten/yhteyksien käsittelyn, mahdollisen uuden selainmoduulin static-routen ja yhdistää tekniset muutokset. Koko testisarja ja käytännön selainpalautus tarkistetaan silloin.

Chat C:n assettien valmistelu on erillinen. Assetteja ei yhdistetä tai oteta peliin tämän teknisen integraation mukana. Commit-tunniste kirjataan kanoniseen TECHNICAL_WORKPLAN.md:hen tallennuksen jälkeen.
