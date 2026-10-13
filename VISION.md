# Casino Royale – pelin suunta

Casino Royale on selaimessa pelattava singleplayer casino-RPG, josta voi lähteä omalla hahmolla ja sen pelirahalla online-pöytiin kavereiden kanssa. Käyttöliittymä, ympäristöt ja animaatiot tuntuvat videopeliltä. Tämä dokumentti tallentaa 13.10.2026 tarkennetun vision; lopullista design languagea ei vielä ole lukittu.

## Pelin kulku

Päävalikko → hahmo → koti → toiminta → takaisin kotiin.

Päävalikossa ovat yksinpeli, moninpeli, hahmo ja asetukset. Ensimmäisellä kerralla luodaan hahmo. Hahmon koti on yksinpelin keskus: siellä valitaan casino-pöytä, avataan tai etsitään multiplayer-lobby, muokataan hahmoa ja hoidetaan taloutta, sivutehtäviä ja minipelejä. Multiplayer ei ole erillinen hahmo tai talous.

## Hahmo ja talous

- Hahmolla on pysyvä identiteetti, saldo, velka, tilastot, omistetut kosmetiikat ja progression taso.
- Pöydissä pelataan samalla valuutalla, jolla ostetaan kosmetiikkaa, sijoitetaan ja hoidetaan pankkiasioita.
- Laina kasvattaa käytettävää saldoa ja velkaa. Käytettävä saldo ja velka näkyvät erillisinä; velka ei katoa saldon loppuessa. Voitoista voi maksaa lainaa takaisin.
- Keksitty osakemarkkina, minipelit ja sivutehtävät tuovat rahalle muita käyttötapoja ja pieniä tulonlähteitä. Tarkat mekanismit ja talouden tasapaino suunnitellaan myöhemmin.
- Tilastojen nollaus ja uuden hahmon aloittaminen ovat eri toimintoja. Tilastojen nollaus ei anna lisää rahaa tai poista velkaa. Tarkka asetusten toiminta päätetään ennen toteutusta.
- Alustava alkusaldo on $1 000; lopullisia progression rajoja tai pöytäsummia ei vielä lukita.

## Progressio ja multiplayer

Ensimmäinen casino on hämärä, savuinen kellari. Eteneminen avaa hienompia ympäristöjä sekä erilaiset buy-init, blindit ja NPC-vaikeustasot. Hostin valitsema, hänen progressionsa sallima ympäristö määrittää multiplayer-lobbyn paikan ja pöydän asetukset. Kaverit saavat liittyä myös eri progression vaiheesta; sisäänpääsy- ja rahavaatimukset suunnitellaan erikseen.

## Esitystapa

- 2D-vektorigrafiikka, jossa perspektiivi, kerrokset, varjot ja valo antavat tilan tuntua.
- Pelimaailma täyttää selaimen koko näkyvän alueen; lisäksi voi käyttää selaimen fullscreen-tilaa.
- Lobby, käsi, panostus ja tapahtumat ovat pelimaailman päällä olevia HUD-elementtejä. Lobby on piilotettavissa. Toimintopainikkeet eivät katoa kesken oman vuoron.
- Kotinäkymässä toiminnot kiinnittyvät huoneen esineisiin; suuri korttiruudukko ei korvaa huonetta.
- Hahmot ovat alustavia; hiukset, vaatteet ja muut osat erotellaan myöhemmin muokattaviksi.
- Reduced motion, ympäristöefektit ja äänten asetukset kuuluvat yhteiseen pelikuoreen. Online-peli jatkuu valikon ollessa auki.

## Tekniset periaatteet

Nykyinen multiplayer-palvelin ja Hold’em-moottori säilytetään. Yksinpeli voi käyttää samaa pokerisääntömoottoria NPC-ohjaimella. Offline-yksinpeli ei ole vielä luvattu ominaisuus.

Yhteisen talouden pysyvä totuus on palvelimella tietokannassa. Selaimen localStorage ei voi päättää multiplayeriin siirtyvää saldoa. Rahatapahtumat kirjataan tapahtumina: buy-in siirtää rahaa lompakosta pöytään ja poistuminen siirtää jäljellä olevat merkit takaisin. Siirrot tehdään atomisesti, eivätkä uusitut pyynnöt tai useat välilehdet saa monistaa rahaa. Myös laina, takaisinmaksu, ostot ja NPC-pöytien tulokset tarkistetaan palvelimella. Usean pöydän, katkosten ja palvelimen uudelleenkäynnistysten käsittely tarvitaan ennen yhteisen saldon julkaisua.

## Toteutusjärjestys

1. Päävalikko, alustava nimetty hahmo, koti ja fullscreen-pelikuori. Multiplayer säilyy pelattavana. Tulevat toiminnot merkitään selvästi.
2. Hold’emin lopullinen peliasettelu, selkeys, animaatioiden rytmi ja ääni-ilme; design language lukitaan palautteen jälkeen.
3. Pysyvä hahmo ja tapahtumiin perustuva talous, sitten NPC-Hold’em samalla hahmolla. Molemmat käyttävät samaa saldoa.
4. Pankki, tilastot, kosmetiikka ja progression ympäristöt.
5. Muut casino-pelit, keksitty osakemarkkina, minipelit ja sivutehtävät.

Nykyinen toteutus on vaihe 1. Hahmon nimi ja asetukset muistetaan selaimessa. NPC-pelaajia, yhteistä pysyvää saldoa, pankkia, kauppaa tai progression ehtoja ei vielä ole. Multiplayerin $1 000 on yhä lobbyn testistack; sitä ei esitetä hahmon pysyvänä lompakkona.
