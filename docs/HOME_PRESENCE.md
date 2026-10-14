# Home presence – Vaihe 5 / Chat B

Valmis 14.10.2026. Haara `codex/home-presence`, lähtö `2c1ae4c`. Työkopio `C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE`. Toteutus ja testit: `64322cf`; raportin commit löytyy tämän tiedoston Git-lokista.

## Adapterisopimus

`home-presence.mjs` vie `createHomePresence({ lobbyId, getLobby, now = Date.now })` ja jäädytetyn `PRESENCE_LIMITS`-olion. Luo **yksi instanssi yhtä palvelimen omistamaa kotilobbya kohti**. Instanssi ei luo kotijäsenyyttä eikä autentikoi käyttöavainta.

- `lobbyId`: kotilobbyn vakaa code, ei asiakkaan valitsema uusi huone. Ei-tyhjä string, enintään 128 merkkiä.
- `getLobby()`: synkroninen luotettu palvelincallback. Palauttaa ajantasaisen `{ code, environment, players: [{ id }] }`-snapshotin tai `null`, jos huone on suljettu. Muut kentät sivuutetaan eikä callbackin oliota muuteta. Code on oltava lobbyId, environment `bridge` tai `rental`, jäsenet yksilöllisiä string-ID:itä (1–128 merkkiä) ja enintään kuusi. Väärä adapteridata hylätään 503:lla. Ensimmäinen ympäristö lukitaan: myöhempi vaihto hylätään 409:llä; hostin vaihto ei vaihda ympäristöä.
- `now()`: synkroninen, äärellisen ja ei-taantuvan millisekuntiluvun tuottava **palvelimen** kello. Voi injektoida monotonic-kellon, esimerkiksi `performance.now`. Date.now-oletuksen taantuessa malli sulkee liikkeen 503:lla, kunnes kello saavuttaa edellisen arvon. Clientin aikaa ei lueta.

Palautettu olio:

| Metodi | Käyttö |
| --- | --- |
| `view(authenticatedCharacterId)` | Sovittaa jäsenyyden ja palauttaa snapshotin vain jäsenelle. |
| `move(authenticatedCharacterId, message)` | Sovittaa jäsenyyden, tarkistaa liikkeen ja palauttaa päivitetyn snapshotin. |
| `reconcile()` | Vain palvelimen elinkaarityökalu: sovittaa rosterin, luo uudet spawnit ja poistaa lähteneet. Palauttaa snapshotin myös tyhjälle/suljetulle huoneelle. Ei suoraan julkinen reitti. |

Adapteri autentikoi käyttöavaimen ja johtaa characterId:n itse; älä ota move/view-metodien id:tä asiakkaan rungosta. Tarkista avain uudelleen asynkronisen rungonlukemisen jälkeen kuten nykyisissä kotireiteissä. Jäsenyys tulee callbackista jokaisella kutsulla, ei asiakkaan väitteestä.

**Kutsu reconcile heti jokaisen leave/remove/idle-expiry/palautus/poisto-tapahtuman jälkeen ennen mahdollista saman hahmon rejoinia.** Muuten rosterikuvista ei voi päätellä välissä tapahtunutta poistumista, jos samat ID:t ovat jo palanneet. Kutsu sovitusta myös liittymisen jälkeen, jotta spawnin aika ei ala vasta ensimmäisestä liikeviestistä. Viimeisen jäsenen poistuttua hävitä instanssi palvelinrekisteristä. Rajaa rekisteri nykyisen kotilobbymallin huonerajaan (100), jotta suljettuja instansseja ei jää muistiin.

Callbackin tulee lukea auktoritatiivinen rosteri joka kerta, ei pitkään vanhentunutta välimuistia. Suositus: Chat A lisää tarvittaessa kotilobbyadapteriin lukemisen ilman heartbeat-sivuvaikutusta. Nykyinen `homeLobbies.view(id)` päivittää valitun jäsenen aktiivisuusajan. Älä kutsu sitä mielivaltaiselle hostille jokaisesta vieraan liikeviestistä, sillä silloin vieras pitäisi hostin jäsenyyden elossa. Sovita mahdolliset cleanup-sivuvaikutukset ennen snapshotin palautusta. B ei muuttanut home-lobby.mjs:ää.

## Liike- ja snapshot-muoto

Clientin liikeviestin **ainoat** sallitut kentät:

```js
{ generation, seq, x, y, facing: 'left' /* tai 'right' */ }
```

`generation` kopioidaan oman hahmon nykyisestä snapshotista. Se on satunnainen jäsenyyskertainen tunniste, ei käyttöavain. Uusi spawn/jäsenyys saa uuden tunnisteen ja seq=0. `seq` on positiivinen safe integer, aidosti suurempi kuin viimeksi hyväksytty. Aukot sallitaan, jotta pudonneet viestit eivät estä etenemistä. Käytä peräkkäistä lähettämistä tai käsittele vanhojen viestien hylkäys; usea saman hahmon välilehti tarvitsee yhteisen sequence-käytännön. MAX_SAFE_INTEGERin jälkeen tarvitaan uusi jäsenyys. Väärä generation, toisto, vanha seq, NaN/Infinity, väärät tyypit/suunta ja ylimääräiset kentät (myös environment, id tai timestamp) hylätään 400:lla. Hylätty iso seq ei estä seuraavaa oikeaa viestiä.

Snapshot:

```js
{
  lobbyId, environment, revision,
  players: [{ id, x, y, facing, seq, generation, revision }]
}
```

Snapshot on irrotettu kopio. Ei nimeä, ulkonäköä, avaimia, saldoa, velkaa tai XP:tä. Ulkonäkö voidaan yhdistää erikseen nykyisen julkisen kotirosterin ID:n perusteella. Globaalirevision kasvaa jokaisesta hyväksytystä liikkeestä ja rosterimuutoksesta. Jäsenrevision on tämän jäsenen viimeisen spawnin/liikkeen revision; muiden liike ei muuta sitä. Suunnan päivitys paikallaan tarvitsee uuden seq:n ja kasvattaa revisionia.

## Liikkeen vahvistus

Spawn on `safePosition(DEFAULT_POSITION, environment)` nykyisestä read-only world-layout-moduulista. Kaikki jäsenet käyttävät samaa turvallista spawnia; hahmojen keskinäisiä törmäyksiä ei mallinneta. Jalkarajat x=384–3456, y=648–972 ja 12 px neliöpuskuri esteissä ovat samat kuin frontendissä. Ei duplikoitua esteaineistoa.

Liikkeen päätepisteen on oltava vapaa. Yhteinen moveFootpoint-pyyhkäisy ei saa leikata siirtymää, ja suora segmentti ei saa kulkea paisutetun esteen avoimen sisäosan läpi. Pelkkä vapaa päätepiste ei riitä. Kosketus/tangentti on sallittu. Suoran segmentin lisätarkistus on konservatiivinen: frontendin X-sitten-Y-reitin jotkut kulman kiertävät päätepisteet voidaan hylätä, jos niiden välinen suora leikkaa kulmaa. Lähetä lyhyet liikkeet ja sovita client palvelimen vahvistamaan sijaintiin; malli ei etsi reittiä eikä korjaa hylättyä liikettä automaattisesti.

Nopeusraja 430 maailmapikseliä/sekunti, Euclidean-etäisyys (diagonaali ei kiihdy). Jäsenkohtainen liikebudjetti kertyy vain palvelimen kuluneesta ajasta, enintään 250 ms / 107.5 px. Spawnissa budjetti on nolla. Hyväksytty liike kuluttaa etäisyytensä, joten samana kellonaikana toistuvat pyynnöt eivät anna lisää matkaa. Pitkä idle tai tekaistu client-aika ei salli teleportausta. Yli 250 ms viiveellä clientin tulee hyväksyä korjaus ja jatkaa lähempää; pyyntöä ei jaeta osiin palvelimella.

Hylätty viesti ei muuta sijaintia, suuntaa, seq:tä, julkisia revisioneja tai liikebudjettia. Metodin alun erillinen rosterisovitus voi silti heijastaa oikeaa liittymistä/poistumista, vaikka sen jälkeinen liike hylätään. Callback-/kellovirheitä ei nielaista. Jäsenyyden puute antaa 403. Verkkokerros lisää omat 401/429-käsittelynsä ja järkevän lähetysrajan; tämä moduuli ei tarjoa HTTP-, pollaus- tai SSE-toteutusta.

## Varmennus ja rajat

Koko `npm test`: **85/85 läpäisee**. Kymmenen uutta testiä kattavat molemmat ympäristöt, turvallisen spawnin, snapshotin tietorajat/kopioinnin, luvattomat jäsenet ja ympäristömuutokset, kuuden jäsenen katon, virheelliset koordinaatit/seq:t, rajat, seinään menemisen ja seinän ylityksen vapaiden päätepisteiden välillä, tangenttiliikkeen, nopeusbudjetin ja diagonaalin, kellon etenemisen/taantumisen, pitkän idlen, toistot, riippumattomat pelaajat, poiston ja uuden generationin. Lisäksi nykyisen createHomeLobbies-mallin kanssa testataan liittyminen, hostin siirto, poistuminen/rejoin ja huoneen sulkeutuminen. Ei oikeaa tietokantaa tai käynnissä olevaa pelipalvelinta testikäytössä.

Tämä on yhden prosessin muistimalli, ei vielä näkyvä multiplayer-liike. Ei pysyvää tallennusta, verkkoreittejä, client-renderöintiä/interpolaatiota, player-player-collisionia tai leveleiden loft/mansion-karttoja. Niitä ei hyväksytä hiljaisesti esteettömänä maailmana. Instanssit ja niiden revisionit alkavat alusta prosessin restartissa; generation estää aiempien liikeviestien hyväksynnän uuteen spawniin. Nykyinen maailman nopeus 430 on moduulin nimetty vakio, joka on pidettävä frontendin kanssa samana, jos sitä muutetaan myöhemmin.

Omistetut muutokset vain `home-presence.mjs`, `test/home-presence.test.mjs` ja tämä raportti. Server, home-lobby, public, talous ja assetit koskemattomina. Alkutilan untracked AGENTS.md ei kuulu committeihin. Ei mergeä, pushia tai deployta. Chat A tekee adapterin, elinkaarikytkennät, reitit ja frontend-integraation myöhemmin.
