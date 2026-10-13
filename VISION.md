# Casino Royale – pelin suunta

Casino Royale on selaimessa pelattava singleplayer casino-RPG, josta voi lähteä omalla hahmolla ja sen pelirahalla online-pöytiin kavereiden kanssa. Käyttöliittymä, ympäristöt ja animaatiot tuntuvat videopeliltä. Tämä dokumentti tallentaa 13.10.2026 tarkennetun vision; lopullista design languagea ei vielä ole lukittu.

## Pelin kulku

Koti (landing screen ja päävalikko) → toiminta → takaisin kotiin.

Hahmon koti on pelin aloitusnäkymä ja päävalikko. Oikean reunan yhteisessä valikossa ovat yksinpeli, multiplayer, hahmon muokkaus, pankki, minipelit ja asetukset. Ensimmäisellä kerralla luodaan hahmo. Multiplayer ei ole erillinen hahmo tai talous. Singleplayerissä pelataan NPC-pelaajia vastaan Hold’emia, blackjackia, rulettia ja slotseja; pelit toteutetaan vaiheittain Hold’emista alkaen.

## Hahmo ja talous

- Hahmolla on pysyvä identiteetti, saldo, velka, tilastot, omistetut kosmetiikat ja progression taso.
- Pöydissä pelataan samalla valuutalla, jolla ostetaan kosmetiikkaa, sijoitetaan ja hoidetaan pankkiasioita.
- Laina kasvattaa käytettävää saldoa ja velkaa. Käytettävä saldo ja velka näkyvät erillisinä; velka ei katoa saldon loppuessa. Voitoista voi maksaa lainaa takaisin. Vain yksi laina voi olla aktiivinen kerrallaan. Uutta lainaa ei saa ennen kuin edellinen on kokonaan maksettu.
- Keksitty osakemarkkina, minipelit ja sivutehtävät tuovat rahalle muita käyttötapoja ja pieniä tulonlähteitä. Tarkat mekanismit ja talouden tasapaino suunnitellaan myöhemmin.
- Hahmon voi poistaa ja aloittaa uuden, jos ei halua ansaita minipeleillä rahaa lainan takaisinmaksuun. Poisto menettää hahmon tilastohistorian, XP:n, levelin ja unlockit. Uusi hahmo aloittaa alusta. Toteutukseen tulee selkeä vahvistus ennen poistoa. Tilastojen nollaus ei itsessään poista velkaa tai anna lisää rahaa.
- Alustava alkusaldo on $1 000; lopullisia progression rajoja tai pöytäsummia ei vielä lukita.

## Progressio ja multiplayer

Varallisuus ja XP/level ovat eri progression mittareita. Pelatuista ja voitetuista peleistä kertyy XP:tä. Level avaa uusia hahmon muokkausvaihtoehtoja. Kodin paremmat vaihtoehdot ovat aluksi lukittuja: päivitys vaatii sekä riittävän levelin että varallisuuden. Tarkat XP-määrät, levelrajat ja päivitysehdot päätetään myöhemmin.

Koti näyttää hahmon varallisuuden: negatiivinen saldo voi tarkoittaa asumista sillan alla, tuhannet halpaa vuokra-asuntoa ja sadat tuhannet luksuskartanoa. Summat ovat suuntaa antavia. Velan vaikutus varallisuuden laskentaan sekä saldon laskun vaikutus aiemmin avattuun kotiin määritellään ennen talouden toteutusta.

Multiplayer-pöytä voi sijaita hostin hahmon kodissa. Näin kaverit näkevät hänen varallisuutensa ympäristöstä. Nykyinen kellari säilyy placeholder-pöytänä. Eteneminen muuttaa myös buy-inejä, blindejä ja NPC-vaikeutta. Kaverien sisäänpääsy- ja rahavaatimukset suunnitellaan erikseen.

## Esitystapa

- 2D-vektorigrafiikka, jossa perspektiivi, kerrokset, varjot ja valo antavat tilan tuntua.
- Pelimaailma täyttää selaimen koko näkyvän alueen; lisäksi voi käyttää selaimen fullscreen-tilaa.
- Lobby, käsi, panostus ja tapahtumat ovat pelimaailman päällä olevia HUD-elementtejä. Lobby on piilotettavissa. Toimintopainikkeet eivät katoa kesken oman vuoron.
- Koti on landing screen: toiminnot ovat yhdessä oikean reunan valikossa, eivät erillisinä painikkeina ympäri huonetta.
- Omat kortit näkyvät selvästi luettavana pöydän etureunassa ilman erillistä laatikkoa. Saldo ja panostukset ovat samassa kevyessä alareunan ohjaimessa. Lobby säilyy avattavana/piilotettavana valikkona.
- Käyttöliittymän kieli on englanti. Tekstit ovat lyhyitä toiminnallisia nimiä ja tilailmoituksia; sloganeita ei käytetä.
- Hahmot ovat alustavia; hiukset, vaatteet ja muut osat erotellaan myöhemmin muokattaviksi.
- Reduced motion, ympäristöefektit ja äänten asetukset kuuluvat yhteiseen pelikuoreen. Online-peli jatkuu valikon ollessa auki.

## Tekniset periaatteet

Nykyinen multiplayer-palvelin ja Hold’em-moottori säilytetään. Yksinpeli voi käyttää samaa pokerisääntömoottoria NPC-ohjaimella. Offline-yksinpeli ei ole vielä luvattu ominaisuus.

Yhteisen talouden pysyvä totuus on palvelimella tietokannassa. Selaimen localStorage ei voi päättää multiplayeriin siirtyvää saldoa. Rahatapahtumat kirjataan tapahtumina: buy-in siirtää rahaa lompakosta pöytään ja poistuminen siirtää jäljellä olevat merkit takaisin. Siirrot tehdään atomisesti, eivätkä uusitut pyynnöt tai useat välilehdet saa monistaa rahaa. Myös laina, takaisinmaksu, ostot ja NPC-pöytien tulokset tarkistetaan palvelimella. Usean pöydän, katkosten ja palvelimen uudelleenkäynnistysten käsittely tarvitaan ennen yhteisen saldon julkaisua.

## Toteutusjärjestys

1. Koti aloitusnäkymäksi, yhteinen oikean reunan valikko, alustava nimetty hahmo ja fullscreen-pelikuori. Multiplayer säilyy pelattavana. Tulevat toiminnot merkitään selvästi.
2. Hold’emin lopullinen peliasettelu, selkeys, animaatioiden rytmi ja ääni-ilme; design language lukitaan palautteen jälkeen.
3. Pysyvä hahmo ja tapahtumiin perustuva talous, sitten NPC-Hold’em samalla hahmolla. Molemmat käyttävät samaa saldoa.
4. Pankki, tilastot, kosmetiikka ja progression ympäristöt.
5. Muut casino-pelit, keksitty osakemarkkina, minipelit ja sivutehtävät.

Nykyinen paikallinen toteutus kattaa vaiheen 3 ja vaiheen 4 ensimmäisen version: SQLite-hahmo, yhteinen lompakko, NPC-Hold’em, pankki, ostettavat asut, XP/level ja neljä kodin ympäristöä. Ensimmäinen toimitusmuistiminipeli on pelattava. Kodit määräytyvät nykyisen levelin ja nettovarallisuuden (käteinen + pöytämerkit − velka) perusteella ja voivat myös laskea. Ensimmäiset tasapainotusrajat ovat README.md:ssä. Sokkojen ja NPC-vaikeuden progressio, laajempi hahmon muokkaus ja muut casino-pelit odottavat seuraavaa vaihetta. Nettiversioon tarvitaan pysyvä hosting-tallennus ja hahmon palautus ennen uuden talouden julkaisua.
