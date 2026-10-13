# Casino Royale

Selainpohjainen casino-RPG: yhteinen hahmo ja pelirahaa käyttävä lompakko NPC-Hold’emille ja kaverien 2–6 pelaajan online-pöydille. Ei oikeaa rahaa tai palkintoja. Käyttöliittymä on englanniksi.

## Käynnistys

Node.js **24 tai uudempi**, ei ulkoisia npm-riippuvuuksia.

```powershell
npm run dev
```

Avaa http://localhost:3000. Luo hahmo, valitse Singleplayer tai Multiplayer. NPC-pöydässä Mara ja Jules ovat valmiina: paina Start Hold’em. Multiplayerissa host luo lobbyn ja jakaa kutsulinkin; osallistujat valitsevat Ready ennen hostin aloitusta. Jokainen pelaaja tarvitsee eri selainprofiilin, incognito-istunnon tai laitteen. Saman selainprofiilin välilehdet käyttävät samaa hahmoa ja palauttavat saman pöytäistunnon.

## Pelattavat ominaisuudet

- Hahmo aloittaa $1,000 käteisellä, levelillä 1 ja sillan alla. Nimi, vaatetusväri, omistetut asut, velka, XP, kädet ja voitot tallentuvat palvelimelle.
- Yksi pöytä kerrallaan. Buy-in $100–$1,000 siirtyy lompakosta pöytään. Pöydästä poistuminen palauttaa jäljellä olevat merkit. Poistuminen onnistuu oman jaon päätyttyä.
- No-limit Hold’em, $5/$10 blindit: fold/check/call/raise/all-in, sivupotit, tasapelit, jakajan kierto ja 60 sekunnin vuoroaika. NPC:t käyttävät vain omia korttejaan ja yhteistä pöytää.
- Pelattu käsi antaa 15 XP; voittava käsi lisäksi 25 XP. Jokainen 100 XP nostaa leveliä. Kosmetiikka ostetaan pelirahalla ja avautuu leveleittäin.
- Pankista voi ottaa yhden $500 lainan, kun käteistä on enintään $100. Uutta lainaa saa vasta velan maksettua kokonaan. Osittaiset takaisinmaksut onnistuvat.
- Delivery route -muistiminipeli: toista neljän pysähdyksen reitti ja ansaitse $30. Seuraava toimitus on saatavilla 15 sekunnin jälkeen.
- Kodit: silta → vuokra-asunto (level 2 / $1,000) → loft (level 5 / $10,000) → kartano (level 10 / $100,000). Varallisuus = käteinen + pöytään sidotut merkit − velka. Koti valitaan aina nykyisten ehtojen mukaan; se voi myös laskea. Multiplayerin ympäristö valitaan hostin kodista lobbya luotaessa.
- Hahmon poistaminen vaatii nimen kirjoittamisen. Se poistaa pysyvästi hahmon talouden, historian, XP:n ja kosmetiikan.

Summat, XP-rajat ja NPC-strategia ovat ensimmäinen tasapainotusversio. Blackjack, ruletti, slots, osakemarkkina, lisää minipelejä, hiustyylit ja tasosta riippuvat blindit/NPC-vaikeus tulevat myöhemmin. Singleplayer tarvitsee tässä versiossa palvelinyhteyden; offline-tilaa ei ole.

## Tallennus ja hosting

SQLite-tietokanta on oletuksena `data/casino.sqlite` (gitignore). `CASINO_DB_PATH` voi osoittaa eri levyyn. Pysäytä palvelin ennen tietokannan varmuuskopiointia; älä poista `data/`-hakemistoa, jos haluat säilyttää hahmot. Selain säilyttää hahmon salaisen käyttöavaimen localStoragessa. Selaindatan poistaminen menettää pääsyn hahmoon: kirjautumista, laitteiden välistä palautusta tai salasanan palautusta ei vielä ole.

Lobbyt ovat yhä prosessin muistissa. Kun sama tietokanta avataan uudelleenkäynnistyksen jälkeen, pöytään sidotut merkit palautetaan kerran lompakkoon. Kesken jäänyt käsi palauttaa kunkin oman jäljellä olevan stackin ja sitoutuneet panokset. Pelaa yhdellä palvelinprosessilla; tietokantaa ei saa jakaa samanaikaisesti usean prosessin kesken.

**Renderin nykyinen Free-palvelu ei takaa SQLite-tiedoston pysyvyyttä deployn tai palvelimen korvaamisen yli.** Tämä versio on ensin paikalliseen testaukseen. Ennen nettipäivitystä tarvitaan pysyvä levy tai ulkoinen tietokanta sekä hahmon palautusmenetelmä. Katso [DEPLOYMENT.md](DEPLOYMENT.md). Blueprintin automaattinen deploy on pois käytöstä.

## Grafiikka ja rakenne

Omat SVG-kuvat käyttävät kerroksittaisia siluetteja, rajattua väripalettia ja pehmeää lämmintä valoa. Referenssikuvia ei sisällytetä peliin. `public/assets/bridge.svg`, `home.svg`, `loft.svg`, `mansion.svg` ovat kodit; `table-*.svg` niiden pokeriversiot. `characters.svg` sisältää kokovartalohahmot, `dealer.svg` jakajan. Alkuperäinen kellarikuvitus on säilytetty myöhempää käyttöä varten.

`public/character.js` hoitaa hahmon, pankin ja minipelin käyttöliittymän, `shell.js` navigoinnin ja `app.js` pokerin. `rpg.css` sisältää uuden ilmeen. `economy.mjs` hoitaa SQLite-tapahtumat ja pöytävaraukset; `bots.mjs` NPC-päätökset. Palvelin tarkistaa kaikki rahamuutokset. Lainat, ostot, takaisinmaksut ja jaon XP käyttävät uusintapyyntöjä kestäviä tapahtumatunnisteita.

## Testaus

```powershell
npm test
```

Testit kattavat pokerisäännöt, pelimerkkien säilymisen, online-lobbyn käyttöoikeudet ja katkokset, NPC-käsien etenemisen, jaetun hahmolompakon, lainat, kosmetiikan levelrajat, palkkioiden uusintapyynnöt, XP:n ja tallennuksen palautumisen. Sivun päivitys palauttaa aktiivisen pöytäistunnon. Paikallisen selaintarkistuksen lisäksi nettiversio tarvitsee oman monilaitekokeilun ennen julkaisua.
