# Hahmon palautuksen käyttöliittymä – Chat B / vaihe 2

Päivitetty 14.10.2026. Tila: valmis Chat A:n integraatiotarkistukseen.

Työkansio: `C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE`
Haara: `codex/recovery-ui`. Pohja: `bc0247e`.
Toteutus ja testit: `c4775c5`.
Tämän raportin commit: `git log -1 -- docs/RECOVERY_UI.md`.

## Pelaajan toiminnot

Hahmovalikon **Create recovery key** avaa nykyisillä dialogi-, lomake- ja painikeluokilla toteutetun näkymän. Uuden avaimen luonnissa käyttäjä vahvistaa, että aiempi palautusavain lakkaa toimimasta. Avainta ei luoda automaattisesti hahmon luonnissa, sivun latauksessa tai dialogin avaamisessa.

Avain näkyy vain luontidialogin readonly-kentässä. **Copy recovery key** kopioi avaimen käyttäjän toiminnosta. Jos clipboard ei ole käytettävissä tai kopiointi hylätään, kenttä valitaan manuaalista kopiointia varten ja ohje kertoo Ctrl+C:n tai laitteen oman Copy-toiminnon. Sulkeminen ja pagehide tyhjentävät luonti- ja palautuskentät. Suljetun dialogin myöhäinen luontivastaus ei tuo avainta takaisin näkyviin.

**Recover character** näkyy hahmovalikossa myös ilman nykyistä hahmoa. Palautusavain syötetään password-kenttään. Jos selaimessa on nykyinen käyttöavain, käyttäjä vahvistaa sen korvaamisen ennen palautusta. Ohje kertoo, ettei aiempi hahmo poistu ja että sen palautusavain kannattaa tallentaa ensin. Vahvistus pyydetään myös, jos palautettava hahmo on sama, koska kohdetta ei tiedetä ennen palautusvastausta.

Nykyisen hahmon pöytävaraus tarkistetaan ennen vaihtoa: clientin aktiivinen huone ja /api/character-vastauksen inTable estävät vaihdon. Backend tarkistaa erikseen palautusavaimen kohdehahmon varauksen. API:n 409 ohjaa päättämään jaon ja palaamaan kotiin myös toisella laitteella. 401, 429, palveluvirhe ja verkkovirhe näytetään päällimmäisessä dialogissa. Virheellinen palautus ei vaihda nykyistä käyttöavainta.

Nykyisen autentikoidun hahmopyynnön 401 tyhjentää mitätöidyn käyttöavaimen ja avaa hahmovalikon, jossa ovat palautus ja uuden hahmon luonti. Jos profiilin lataaminen epäonnistuu palveluvirheeseen mutta käyttöavain on yhä tallessa, uuden hahmon luonti estetään vahingossa tapahtuvan korvaamisen välttämiseksi.

## Käyttöavain ja vanha tila

`public/character.js` sisältää myös selaimesta riippumattoman `createIdentityClient`-rajapinnan testeille. Uusia selainmoduuleja tai palvelimen static-reittejä **ei tarvita**.

Palautus käyttää docs/CHARACTER_RECOVERY.md:n sopimusta:

- POST /api/character/recovery-key nykyisellä käyttöavaimella.
- POST /api/character/recover ilman nykyisen hahmon Authorization-otsaketta; avain on ainoastaan JSON-rungossa.
- Uusi käyttöavain ja nimi tallennetaan casino-identity-v1-muodossa `{ token, name }`. Vanha creationKey poistuu.
- Palautusavainta ei tallenneta localStorageen, sessionStorageen, URL:iin, raporttiin, kuviin tai lokiin. Se on vain dialogin ja meneillään olevan pyynnön muistissa. Clipboard-kopio tehdään vain käyttäjän painalluksesta.
- localStoragen epäonnistuminen ei hukkaa onnistuneen palautuksen käyttöavainta: se jää nykyisen välilehden muistiin. Käyttäjää ohjataan pitämään välilehti auki ja säilyttämään palautusavain ennen sulkemista.

Palautuksen alussa muuttuva revision-tunniste rajaa vanhat pyynnöt pois. Vastausten tunnisteet muistetaan WeakMapissa myös myöhempää käsittelyä varten: jo palautunut saman hahmo-ID:n vanha profiili ei voi korvata uutta tilaa. Vanha onnistunut vastaus, 401 tai verkkovirhe sivuutetaan. Palautuksen epäonnistuessakin ennen sitä käynnistetyt vastaukset jäävät vanhentuneiksi, mutta nykyinen käyttöavain ja profiili säilyvät.

Onnistuneessa vaihdossa synkroninen onReplace-käsittelijä keskeyttää vanhan SSE-fetch/AbortController-yhteyden, tyhjentää session/currentRoomin ja casino-sessionin, poistaa vanhat pöytäelementit, luontijatkon sekä minipelin reitin/vastaukset ja palauttaa kodin. onChange päivittää uuden hahmon kotiin samassa JavaScript-vaihdossa. Sovellus käyttää fetch-streamia, ei EventSource-instanssia.

Pöydän POST-vastauksissa tarkistetaan sekä hahmon revision että istuntotunniste. SSE tarkistaa revision, istunnon ja abort-tilan myös fetchin ja reader.readin jälkeen sekä ennen jokaista peliviestiä. Väärälle hahmolle kuuluva vanha pöytä ei avaudu tallennetusta istunnosta. Alkuperäiset pokerin 409-virheilmoitukset säilyvät.

Saman alkuperän storage-tapahtuma ottaa toisessa välilehdessä tallennetun käyttöavaimen käyttöön ja lataa profiilin uudelleen. Myös vanhan vastauksen käsittely tarkistaa tallennetun avaimen: vanhan välilehden 401 ei voi kirjoittaa tyhjää identiteettiä juuri palautetun avaimen päälle. Tapaus, jossa vanha vastaus ehtii ennen storage-tapahtumaa, on oma UI-testi.

## Testit

Lopullinen `npm test`: **50/50 läpäisee**, 0 epäonnistumista. Uusia testejä on 17 (11 client/API-testiä ja 6 tuotantokäsittelijöitä ajavaa DOM/platform-testiä). Alkuperäiset 33 testiä säilyivät muuttamattomina.

Client/API-testit varmentavat puhtaan profiilin palautuksen, vahvistuksen, nykyisen ja kohdehahmon aktiiviset pöydät, 401/409/429/503:n, verkkovirheen, localStorage-virheen, käyttöavaimen tallennusmuodon, vanhan luontiavaimen poistumisen, rahojen ja ostetun asun säilymisen sekä vanhan käyttöavaimen hylkäämisen. Ne tarkistavat myös vanhat vastaukset, saman ID:n myöhäisen profiilin, pöytävastausten tunnisteet, kopioinnin varatavan ja välilehtien välisen kilpailutilanteen.

DOM/platform-testit ajavat oikeaa createCharacterManageria. Ne tarkistavat explicit avaimen luonnin, kuittauksen, avaimen näyttämisen ja manuaalisen kopioinnin valinnan, sulkemisen tyhjennyksen, suljetun ikkunan myöhäisen vastauksen, vaihtovahvistuksen, onnistumisen tilasiivouksen, päällimmäisen dialogin 409:n, vanhan creationKeyn poiston, uuden hahmon luonnin sekä storage-tapahtuman jälkeisen profiilin latauksen.

Selaintarkistus tehtiin erillisellä dynaamisella portilla ja muistissa olevalla tietokannalla. Tarkistettiin palautuksen löytyminen ilman hahmoa, dialogin nykyinen tyyli, virheellisen avaimen näkyvä ilmoitus, password-kentän tyhjentyminen suljettaessa, tavallinen hahmon luonti, avaimen luontidialogin korvaamisohje sekä nykyisen hahmon vaihtovahvistus. Selaimen error-loki oli tyhjä. Onnistunut salaisuuden vaihto ja clipboard-hylkäys varmistettiin automatisoiduilla API-/käsittelijätesteillä; niistä ei tehty salaisuuksia sisältävää ruututallennetta.

Ensimmäisessä koko testisarjan ajossa vanha hosting.test.mjs-työprosessi päättyi yleiseen 'test failed' -tulokseen ilman yksittäistä epäonnistunutta assertionia. Erillisajo läpäisi kaikki sen neljä testiä; tämän jälkeen kokonaiset uusinta-ajot läpäisivät, myös lopullinen 50 testin ajo. Syy jäi varmistamatta, eikä server.mjs:ää tai hosting-testejä muutettu. Integraatiossa tämä kannattaa huomioida, jos ilmiö toistuu.

## Rajat ja integraatio

Muuttuneet tiedostot: public/character.js, public/index.html, public/shell.js, public/app.js, test/recovery-client.test.mjs, test/recovery-client-ui.test.mjs sekä tämä raportti. Grafiikka, CSS, audio, talous, NPC-strategia, backend ja yhteiset ohjeet säilyivät.

Palautusavain ei ole kirjautumis- tai sähköpostipalvelu. Jos sekä käyttöavain että tallennettu palautusavain katoavat, hahmoa ei voi palauttaa. Backendin pysyvä tietokanta ja varmuuskopiointi ovat edelleen erillinen vaatimus. Samanaikaisissa eri laitteiden palautuksissa backendin viimeisin onnistunut käyttöavaimen vaihto ratkaisee; käyttöliittymä estää oman rinnakkaisen palautuksen ja suojaa saman selaimen vanhat vastaukset, mutta ei muuta tätä API-sopimusta.

Chat A yhdistää tämän kokonaisuuden NPC-palvelinintegraatioon sovitussa vaiheessa ja ajaa koko testisarjan sekä yhteisen NPC-/palautuskokeen. Uutta static-routea ei tarvita. Työhaarasta ei tehty mergeä, pushia tai deployta. Alusta asti untracked AGENTS.md jätettiin ennalleen ja commitien ulkopuolelle. Oikeaa data/casino.sqlite-tiedostoa ja porttia 3000 ei käytetty testauksessa.

## Chat A:n integraatiotarkistus 14.10.2026

Commitit c4775c5 ja d2557d4 katselmoitiin ja yhdistettiin nimettyjen NPC-profiilien integraatioon. Yhdistetyn version kaikki 52 testiä läpäisevät: Chat B:n 50 testiä ja Chat A:n kaksi NPC-integraatiotestiä. Mukana on kokonainen NPC-peli, varojen kotiuttaminen, palvelimen uudelleenkäynnistys ja saman hahmon palautus sekä clientin palautus oikeaa API:a vasten. Lisästatic-routea tai CSS-/assetti-/audiomuutoksia ei tarvittu. Tässä integraatiossa ei tehty uutta manuaalista selainkokeilua; Chat B:n aiempi selainkokeilu on kuvattu yllä. Ei pushia tai deployta.
