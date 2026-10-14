# Hahmon palautus – Chat A

Tila 14.10.2026: backend-toteutus valmis; kaikki 23 testiä läpäisevät. Käyttöliittymää ei muutettu.

## API-sopimus

Kaikki pyynnöt ovat POST-pyyntöjä samalle palvelimelle. HTTPS tarvitaan julkaistussa versiossa. Vastaukset eivät ole välimuistitettavia. Salaisuuksia ei lähetetä URL:ssa.

- `/api/character/recovery-key`: nykyinen käyttöavain `Authorization: Bearer <token>` tai `X-Character-Token` -otsakkeessa. Runko `{}`. Vastaus `{ recoveryKey }`. Avain on 32 satunnaista tavua heksamuodossa. Uusi avain korvaa aiemman. Avaimen voi luoda vain kotona, ilman pöytävarausta. Kopioi ja säilytä se ennen selainmuistin tyhjentämistä. Palvelin säilyttää vain SHA-256-tiivisteen, ei palautettavaa kopiota.
- `/api/character/recover`: ei vaadi nykyistä käyttöavainta. Runko `{ recoveryKey }`. Vastaus `{ token, character }`. Korvaa laitteen nykyinen käyttöavain vastauksen tokenilla. Hahmon ID, rahat, velat, XP, kosmetiikka, tilastot ja rahahistoria säilyvät.
- Virheellinen palautusavain: `401`, sama `Invalid recovery key.` myös tuntemattomille avaimille. Pöytävaraus: `409`; palautus ei silloin vaihda käyttöavainta tai varoja. Odota jaon päättymistä ja poistu pöydästä. Jos vanhaan laitteeseen ei pääse, pöytä poistuu normaalin katkos-/vuoroaikakäsittelyn kautta; pysyvän tietokannan palvelinrestart palauttaa varaukset nykyisen talousmallin mukaisesti.
- Palautusyritykset: oletuksena 10/IP/minuutti, `429` ja `Retry-After: 60`. Myös olemassa oleva yleinen pyyntöraja ja saman alkuperän tarkistus ovat käytössä. Palautusavaimen luontiin sovelletaan hahmon pyyntörajaa.

Palautusavain säilyy käytettävänä palautuksen jälkeen, mutta jokainen onnistunut palautus luo uuden satunnaisen käyttöavaimen ja mitätöi edellisen. Jos vastaus katoaa, saman palautusavaimen voi lähettää uudelleen. Samanaikaisista palautuksista viimeisen onnistuneen vastauksen käyttöavain jää voimaan. Palautusavaimen uusiminen mitätöi vanhan palautusavaimen; avaimen luonnin kadonnut vastaus voidaan korvata uudella luonnilla nykyisellä käyttöavaimella.

## Istunnot ja migraatio

Palautus sallitaan vain ilman pöytävarausta. Näin kesken jaon ei siirretä hallintaa tai palauteta panoksia ennen lopputulosta. Mahdolliset jäljelle jääneet pöytäistunnot ja minipelitehtävät mitätöidään onnistuneessa palautuksessa. Vanhaa avainta käyttävän hahmopyynnön valtuutus tarkistetaan uudelleen rungon vastaanoton jälkeen; sama tarkistus koskee pöytään liittymistä.

SQLite lisää recovery_keys- ja creation_tokens-taulut vanhaan tietokantaan. Nykyiset hahmot ja käyttöavaimet säilyvät. Vanhoille hahmoille luodaan palautusavain nykyisellä käyttöavaimella; kadonnutta hahmoa ilman etukäteen tallennettua palautusavainta ei voida palauttaa tällä toiminnolla.

Alkuperäiset hahmonluontitunnisteet muistetaan tiivisteinä. Käyttöavaimen vaihdon tai hahmon poiston jälkeen vanha luontipyyntö ei avaa vanhaa käyttöavainta eikä anna uutta alkusaldoa. Hahmon poisto poistaa palautusavaimen; luontitunnisteesta jää estävä merkintä. Normaali hahmonluonnin uusintapyyntö toimii ennen avaimen vaihtoa entiseen tapaan.

## Rajat ja seuraava vaihe

Tämä on palautuksen backend, ei kirjautumis- tai sähköpostipalvelu. Salaisen palautusavaimen haltija voi ottaa hahmon hallintaan. Avainta ei saa näyttää lobbyssa, välittää chatissa tai kirjata lokiin. Jos sekä käyttöavain että palautusavain katoavat, palautusta ei ole. Pysyvä tallennus ja varmuuskopiot ovat edelleen julkaisun edellytys. Palvelin toimii nykyiseen tapaan yhtenä prosessina.

Seuraava vaihe: erikseen sovittava käyttöliittymä avaimen tallentamiseen ja hahmon palautukseen. Chat B:n NPC-muutokset yhdistetään vasta molempien osien valmistuttua.

## Varmennus

Neljä uutta palautustestiä kattavat tietojen säilymisen (rahat, velka, XP ja kosmetiikka), tietokannan uudelleenkäynnistyksen, vanhan skeeman migraation, avainten mitätöinnin ja korvaamisen, luontipyynnön uusinnan eston, hahmon poiston, pöytävarauksen, HTTP-valtuutukset, yritysrajan, minipelityön mitätöinnin sekä palautuksen aikana kesken olevan vanhan avaimen pyynnön. Koko npm test: 23/23 läpäisee. Commit-tunniste kirjataan kanoniseen työnjakoon commitin jälkeen.

