# Casino Royale

Paikallinen selainpeli, jossa on yhteinen 2–6 pelaajan lobby ja pelattava No-limit Texas Hold’em.

[Ota peli käyttöön Renderissä](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fjarrrtsa%2Fcasino). Valmis Blueprint käyttää Free-palvelua. Kirjaudu Renderiin ja yhdistä tämä repository; tarkat ohjeet ovat [DEPLOYMENT.md](DEPLOYMENT.md).

## Käynnistys

Node.js 20 tai uudempi. Ulkoisia npm-paketteja ei vielä tarvita.

```powershell
npm run dev
```

Avaa http://localhost:3000 kahdessa eri selainprofiilissa tai toisessa ikkunassa incognito-tilassa. Luo lobby, kopioi koodi ja liity toisesta ikkunasta. Molemmat painavat **Olen valmis**, sitten host painaa **Aloita Hold’em**. Aloitusstack on $1 000 ja blindit $5/$10. Pelaajalista ja pelitila päivittyvät palvelimen kautta. Sivun päivitys palauttaa saman istunnon.

Palvelin jakaa kortit, tarkistaa panostukset ja vuorot sekä ratkaisee parhaan viiden kortin käden seitsemästä. Fold, check, call, raise ja all-in sekä sivupotit ja tasapelit ovat mukana. Korotus tarkoittaa tämän panostuskierroksen kokonaispanosta. Jakajan paikka kiertää jakojen välillä. Vuoroaika on 60 sekuntia; ajan loppuessa palvelin tekee checkin tai foldin. Yhteyskatko ei poista pelaajaa kesken jaon.

## Tämän version rajat

- Lobbyt ja istunnot ovat palvelimen muistissa ja katoavat palvelimen uudelleenkäynnistyksessä.
- Ei vielä pysyviä hahmoja, saldoja, velkoja tai kirjautumista.
- Pelimerkit säilyvät lobbyssä jakojen välillä. Ne eivät ole vielä pysyvä lompakko. Nollaan päätynyt pelaaja seuraa peliä; uutta jakoa varten tarvitaan kaksi pelaajaa, joilla on pelimerkkejä.
- Kesken jaon liittynyt pelaaja odottaa seuraavaa jakoa. Pöydästä voi poistua oman jaon päätyttyä.
- Kehitystilassa palvelin kuuntelee vain omaa konetta. Tuotantotilassa se kuuntelee hostingin verkkorajapintaa ja `PORT`-muuttujaa.
- Hylätyt istunnot siivotaan noin kahden minuutin jälkeen, kesken jaon vasta sen päätyttyä. Vuoroaika suojaa peliä yhteyskatkoilta. Poissa olevan hostin tehtävä siirtyy toiselle pelaajalle.
- Kaveriporukan kokeiluversio: liittymisyritysten ja yhteyksien rajoitukset ovat mukana, pysyvä tallennus ja laajan julkisen palvelun suojaus eivät vielä.

## Seuraavat vaiheet

1. Hold’emin ulkoasun, animaatioiden ja käyttökokemuksen viimeistely kaveriporukan palautteella. Nettihostaus on käytössä; katso [DEPLOYMENT.md](DEPLOYMENT.md).
2. Pysyvät profiilit, rahaliikenteen tapahtumat, pankkivelat ja tilastot.
3. Botit, blackjack, ruletti ja progression ulkoasut.

## The Basement -ulkoasu

Ensimmäinen ympäristö on hämärä kellari: perspektiivipöytä, sikaria polttava jakaja ja pelkistetyt pelaajahahmot. Omat SVG-grafiikat ovat tiedostoissa `public/assets/cellar.svg` ja `public/assets/avatars.svg`. Ne ovat muokattavia vektoreita, eikä kuvageneraattoria tai ulkoisia kuvapankkeja ole käytetty. Pelaajan paikka kiertää näkymässä alareunaan. Hahmojen muokkaus ja ympäristöjen progression vaiheet tulevat myöhemmin.

Korttien ja pelimerkkien liike, savu, vuoroilmaisin ja voittavan viiden kortin korostus ovat CSS-animaatioita. Vähennetyn liikkeen käyttöjärjestelmäasetus poistaa animaatiot. Äänet voi kytkeä päälle yläpalkista; nykyiset lyhyet WebAudio-äänet ovat väliaikaisia ja korvattavissa omilla äänitiedostoilla. Korotuksen kokonaispanos ja stackista menevä lisäsumma näkyvät erikseen. Sivun päivitys säilyttää istunnon myös uuden käyttöliittymän kanssa.

## Testaus

`npm test` tarkistaa lobbyä ja pokerisääntöjä: käsien arvotus, heads-up-vuorot, sivupotit, palautukset, pienet all-init, tasapelit ja pelimerkkien säilyminen. Panostuksen uudelleen avautuminen seuraa [Poker TDA:n no-limit-sääntöä](https://www.pokertda.com/view-poker-tda-rules/).

Lobbyssä **Kopioi kutsulinkki** tekee liittymislinkin, jonka huonekoodi täyttyy automaattisesti. Henkilökohtainen istuntotunniste lähetetään palvelimelle HTTP-otsakkeessa, eikä sitä sisällytetä linkkeihin. Samassa selaimessa eri välilehdet voivat olla eri pelaajia.

Tämä riippuvuukseton JavaScript-runko varmistaa ensin lobby-yhteyden. Laajempaan pelimoottoriin siirryttäessä arvioidaan TypeScript/React/Colyseus-pohja.
