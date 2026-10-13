# Ensimmäinen nettitesti: Render

Peli tarvitsee **Web Servicen**, joka ajaa Node.js-palvelinta. Selain ja API palvellaan samasta osoitteesta. GitHub Pages tai Render Static Site eivät yksin riitä pokeripalvelimelle.

## 1. Lähdekoodi GitHubiin

Tämän projektin lähdekoodi ja hosting-asetukset on lähetetty [jarrrtsa/casino-repositoryyn](https://github.com/jarrrtsa/casino), haaralle `master`. Repo voi pysyä privatenä; anna Renderille pääsy vain tähän repositoryyn.

Jos siirrät projektin myöhemmin eri repositoryyn, lisää tiedostot sen juureen niin, että `package.json`, `server.mjs` ja `render.yaml` näkyvät heti etusivulla. Myös `public/`, `test/` ja `.github/` kuuluvat mukaan. Älä lataa `.git/`-kansiota tai tulevia `.env`-tiedostoja.

## 2. Render-tili

Avaa https://dashboard.render.com/ ja luo tili. Liitä Renderille pääsy tähän GitHub-repositoryyn. Käyttäjä hoitaa kirjautumisen, palvelun ehdot ja GitHubin käyttöoikeuden myöntämisen.

## 3. Blueprint

Avaa [valmis Render-käyttöönotto](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fjarrrtsa%2Fcasino). Vaihtoehtoisesti valitse **New → Blueprint**, valitse `jarrrtsa/casino` ja ota käyttöön sen `render.yaml`. Tarkista ennen luontia, että palvelun plan on **Free**. Asetustiedosto ei luo maksullista tietokantaa, levyä tai muita palveluita.

Jos käytät manuaalista **New → Web Service** -tapaa, asetukset ovat:

| Asetus | Arvo |
| --- | --- |
| Runtime | Node |
| Region | Frankfurt |
| Instance type | Free |
| Build command | `npm test` |
| Start command | `npm start` |
| Health check | `/health` |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |

Render antaa `PORT`-muuttujan. Älä vaihda sitä käsin. Automaattiset deployt on kytketty pois Blueprintissä, jotta kesken peli-illan tehty GitHub-push ei nollaa lobbyä. Julkaise päivitykset pelien välissä.

## 4. Tarkista oikea nettipeli

1. Avaa Renderin antama HTTPS-osoite. `/health` vastaa `{"ok":true}`.
2. Luo lobby, paina **Kopioi kutsulinkki** ja lähetä linkki kaverille.
3. Kaveri avaa linkin eri laitteella. Huonekoodi on valmiiksi täytetty; hän antaa nimen ja painaa **Liity lobbyyn**.
4. Molemmat merkitsevät itsensä valmiiksi, host aloittaa Hold’emin.
5. Tarkistakaa call, raise, fold, seuraava jako ja sivun päivitys.
6. Katkaise toisen laitteen yhteys hetkeksi ja palauta se. Pelaaja palaa samaan jakoon; palvelin ohittaa myöhästyneen vuoron 60 sekunnissa.

Kutsulinkki sisältää vain huonekoodin, ei henkilökohtaista istuntotunnistetta. Sen saava voi liittyä lobbyyn, joten jaa linkki kaveriporukalle.

## Kokeiluversion rajat

- Käytä **yhtä palvelininstanssia**. Lobbyt ovat prosessin muistissa; monta instanssia vaatisi yhteisen tilan tallennuksen.
- Renderin Free-palvelu sammuu 15 minuutin käyttämättömyyden jälkeen ja käynnistyy uudelleen seuraavasta pyynnöstä. Käynnistyminen voi kestää noin minuutin. Palvelinrestart, deploy tai sammuminen hävittää tämän version lobbyt ja stackit.
- Ei vielä pysyvää hahmoa, lompakkoa tai velkoja. Pelissä käytetään vain virtuaalisia pelimerkkejä.
- Yhteyskatkolla on noin 2 minuutin paluuaika. Kesken jaon pelaajan paikka säilyy jaon loppuun; sen jälkeen poissa oleva istunto siivotaan. Hostin jäädessä pois hänen tehtävänsä siirtyy paikalla olevalle.
- Palvelin rajoittaa liittymisyrityksiä ja yhtäaikaisia yhteyksiä sekä siivoaa hylätyt lobbyt. Nämä ovat kaveriporukan kokeilun perussuojaukset, eivät laajan julkisen palvelun kapasiteetti- tai turva-auditointi.
- Ei tunneloida kotikonetta tai avata reitittimen portteja: Render ajaa palvelimen ja tarjoaa HTTPS:n.

## Virheen paikantaminen

- **Sivu aukeaa, pelaajat eivät päivity:** tarkista Renderin lokit ja `/health`. SSE-yhteyden tulee pysyä auki; sen vastaustyyppi on `text/event-stream`.
- **Build epäonnistuu:** `npm test` täytyy mennä läpi ja kaikki `public/`- sekä `test/`-tiedostot täytyy olla repositoryssä.
- **Lobby katosi:** palvelin on todennäköisesti käynnistynyt uudelleen. Luo uusi lobby. Pysyvä tallennus lisätään seuraavassa vaiheessa.

Ohjeet: [Render Web Services](https://render.com/docs/web-services), [Blueprint-asetukset](https://render.com/docs/blueprint-spec), [Free-palvelun rajat](https://render.com/docs/free).
