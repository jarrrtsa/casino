# Kotilobby – Chat A, vaihe 4

Tila: backend valmis 14.10.2026 haarassa codex/home-lobby. Nykyinen multiplayer-pokerin käyttöliittymä säilyy; tämä uusi kotivierailu-API kytketään käyttöliittymään myöhemmässä integraatiossa. Chat B:n world-/vuorovaikutustiedostoihin ei koskettu.

## Toiminta

Kotilobby on maksuton sosiaalinen ryhmä. Se ei luo pokeripöytää, varaa merkkejä, anna alkusaldoa tai muuta rahaa, velkaa, XP:tä tai historiaa. Kotilobbyn ja pokeripöydän jäsenyys ovat erillisiä. Kotijäsen voi myöhemmin liittyä nykyiseen pokeripöytään sen omalla buy-inillä; automaattista yhteistä pöytään siirtymistä ei vielä ole.

Enintään 6 hahmoa/kotilobby, yksi kotilobby/hahmo, enintään 100 kotilobbya/prosessi. Kotiympäristö lukitaan alkuperäisen hostin hahmosta luontihetkellä. Host-tehtävä voidaan luovuttaa jäsenelle; hostin poistuessa tai vanhentuessa vetovastuu siirtyy ensimmäiselle jäljellä olevalle jäsenelle liittymisjärjestyksessä. Ryhmä jää samaan alkuperäiseen kotiin, eikä ympäristö vaihdu automaattisesti uuden hostin kodiksi. Tämä erottaa ryhmän vetäjän ja vierailupaikan omistajan. Viimeisen jäsenen poistuminen tuhoaa lobbyn ja kutsukoodin.

Vierailun luonti/liittyminen estetään aktiivisessa pokeripöydässä, mutta olemassa oleva jäsenyys voidaan lukea ja siitä poistua myös pöydässä. Kotilobbysta poistuminen ei poista pokeripaikkaa eikä liikuta varoja. Saman lobbyn create/join-uusinta palauttaa nykyisen jäsenyyden. Toiseen kotilobbyyn pitää poistua ensin.

## API-sopimus

Kaikki reitit ovat POST, Content-Type application/json. Hahmon käyttöavain Authorization: Bearer <token> tai X-Character-Token. Query-parametri ei ole käyttöavain. Julkaistu palvelu tarvitsee HTTPS:n.

| Reitti | Runko | Vastaus |
| --- | --- | --- |
| /api/home/create | {} | { home } |
| /api/home/join | { code } | { home } |
| /api/home/view | {} | { home }, tai { home: null } jos ei jäsenyyttä |
| /api/home/leave | {} | { ok: true, left: boolean } |
| /api/home/transfer | { characterId } | { home }; vain nykyinen host voi käyttää |

home-muoto: { code, hostId, homeOwnerId, environment, capacity, players }.
players: [{ id, name, appearance: { outfit, color }, host }]. Hahmotunnisteet ovat character-ID:itä, eivät pokeripaikan ID:itä. Vieraille ei paljasteta saldoa, velkaa, käyttö-/palautusavaimia, minipelivastauksia, XP:tä tai rahahistoriaa. Nimi ja asu luetaan nykyisestä hahmosta jokaisessa snapshotissa. environment on palvelimen valitsema; clientin home/host-/rahakentät sivuutetaan.

401: puuttuva/vanhentunut käyttöavain. 403: toisen jäsenen host-tehtävän luvaton siirto. 404: kutsukoodi puuttuu/virheellinen/vanhentunut tai home-toiminto tuntematon. 409: täysi lobby, jäsenyys toisessa lobbyssa tai pöytä estää uuden vierailun. 400: siirron kohde ei ole jäsen. 503: palvelimen kotilobbyraja. 429 ja Retry-After: 60: hahmon tai liittymisten yritysraja.

Kotireitit käyttävät samaa hahmon 120 pyynnön/minuutti rajaa muiden hahmotoimintojen kanssa. Create/join on lisäksi oletuksena 30/IP/minuutti; palvelimen yleinen 600/IP/minuutti raja ja olemassa oleva saman alkuperän POST-suojaus säilyvät. Käyttöavain tarkistetaan uudelleen rungon vastaanoton jälkeen, joten palautuksen aikana kesken oleva vanhan avaimen kotipyyntö ei luo jäsenyyttä.

## Elinkaari, palautus ja yhteys

Tämä versio luetaan /api/home/view-pyynnöllä, ei uudella SSE-streamilla. Myöhemmän frontendin suositeltu heartbeat on noin 15–30 sekuntia vain kotilobbyn ollessa käytössä. View/create/saman lobbyn join/host-transfer päivittää vain pyynnön lähettäjän aktiivisuusajan. Muu jäsen ei voi pitää poissaolevaa pelaajaa aktiivisena.

Jäsen vanhenee 10 minuutin kotilobbyinaktiivisuuden jälkeen. Siivous tapahtuu housekeepingissa ja ennen kotitoimintoja. Aktiivinen pokerivaraus suojaa kotijäsenyyttä aikakatkaisulta; pöydästä palatessa view kannattaa kutsua heti. Jäsenyyden menettäminen ei muuta taloutta. Online-/connected-statusta ei tässä versiossa väitetä; jäsenlista ei tarkoita jatkuvaa socket-yhteyttä.

Onnistunut hahmon palautus poistaa sen vanhan kotijäsenyyden ja siirtää host-tehtävän tarvittaessa. Uusi käyttöavain voi luoda/liittyä uudestaan. Palautuksen estyessä aktiivisen pokerivarauksen vuoksi kotijäsenyys säilyy. Vain onnistunut hahmon poisto poistaa myös kotijäsenyyden; väärä poistovahvistus ei tee sitä. Alkuperäisen omistajan lähtö/poisto ei muuta muiden vierailupaikkaa, joten homeOwnerId voi viitata historialliseen omistajaan jäljellä olevan ryhmän ajan.

Kotilobbyt ovat prosessin muistissa ja katoavat restartissa. Pysyvät hahmot/varat ovat edelleen tietokannassa. Yksi palvelinprosessi kuten nykyisessä pokeritoteutuksessa. Ei kotimaailman sijaintien synkronointia, kutsulinkki-UI:ta, kasinoreissua tai koti–pöytäsiirtymien frontendia vielä.

## Testit ja luovutus

Seitsemän uutta testiä kattavat vierailun rahattomuuden, julkisen rosterin rajat, vieraan host-ympäristön, yksittäisen jäsenyyden, turvalliset uusinnat, kapasiteetin, hostin luvallisen/luvattoman siirron, poistumisen, kutsukoodin sulkeutumisen, idle-jäsenet, aktiivisen pokeripöydän, hahmon palautuksen/poiston, yritysrajan ja palautuksen aikana viivästyneen pyynnön. Koko npm test: 63/63 läpäisee. Käytettiin vain muistissa olevia testitietokantoja ja dynaamisia testipalvelinportteja; käyttäjän data/casino.sqlite ei ollut testikäytössä.

Muuttuneet tiedostot: server.mjs, home-lobby.mjs, test/home-lobby.test.mjs ja tämä raportti sekä kanonisen työnjaon oma tilamerkintä. Ei muutoksia assetteihin, audioon tai B:n omistamiin tiedostoihin. Ei mergeä B:n kanssa, pushia tai deployta. Paikallisen käynnissä olevan pelipalvelimen päivitys tehdään myöhemmän frontend-integraation yhteydessä, ettei kesken oleva peli katkea tarpeettomasti. Commit-tunniste lisätään kanoniseen TECHNICAL_WORKPLAN.md:hen.
