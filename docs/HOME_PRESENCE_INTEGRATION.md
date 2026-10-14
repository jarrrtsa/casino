# Kotilobbyn näkyvä liikesynkronointi – Chat A:n integraatio

B:n commitit 64322cf ja 772bbf1 tarkistettu ja yhdistetty. B:n malli säilyy muuttamattomana. Kotilobbyn vakaa UUID sovitetaan mallin lobbyId/code-kenttään: adapteri antaa code=home.id. Asiakas ei valitse huonetta, pelaajaa tai ympäristöä liikeviestissä.

home-lobby sisältää sivuvaikutuksettoman peek(id)-luvun sekä onChange-kytkennän. Create/join/remove/idle-expiry/palautus/poisto sovittavat presence-rosterin heti, ennen mahdollista saman hahmon uudelleenliittymistä. Suljetun lobbyn instanssi poistetaan rekisteristä. Callback ei päivitä muiden jäsenten heartbeatia. Hostin siirto ei vaihda lukittua ympäristöä. Rekisteri on rajattu olemassa oleviin kotilobbyihin.

POST /api/home/presence/view: {}, hahmon käyttöavain. POST /api/home/presence/move: {generation,seq,x,y,facing}, sama käyttöavain. Vastaus {home,presence}; jäsenyyden puuttuessa molemmat null, jolloin client tyhjentää ryhmän. Bridge/rental tuettu; loft/mansion palauttaa presence:null ilman esteettömän liikkeen lupausta. Liikkuminen pokeripöydästä estetään 409:llä. Autentikointi tarkistetaan myös rungon vastaanoton jälkeen.

Presence-pyynnöt käyttävät erillisiä rajoja: 360/hahmo/minuutti ja 2400/IP/minuutti, jotta 5 Hz liike ei kuluta talouden 120/minuutti rajaa. Rate-limitin vastauksessa Retry-After:60. Sama alkuperä ja JSON-rungon nykyinen 4096 merkin kokoraja säilyvät. Malli käyttää palvelimen performance.now-monotonic-kelloa; testissä presenceNow voidaan injektoida.

Selain lähettää peräkkäisen pyynnön noin 200 ms välein vain näkyvässä kotinäkymässä. Muuttunut sijainti/suunta lähettää moven; paikallaan view päivittää kaverit. Omalla paikallisella ennakoinnilla on 85 pikselin etäisyysraja viimeiseen palvelinpaikkaan. Palvelin vahvistaa nopeuden, esteet, seq:n ja generationin. Vastauksessa oma paikka sovitetaan palvelinpaikkaan; 400:n jälkeen haetaan uusi authoritative-snapshot. Pitkällä viiveellä hahmo voi hidastua tai korjaantua takaisin: tämä on ensimmäinen toimiva versio, ei interpoloitu lopullinen verkkoliike.

Kaverit piirretään nykyisillä SVG-hahmoilla julkisen kotirosterin nimellä/asulla. Koordinaatit ovat maailman koordinaatteja; kamera ja parallax ovat katsojakohtaisia. Etualan peittojärjestys säilyy. Samassa spawnissa hahmot voivat mennä päällekkäin; player-player-collisionia ei ole. Hahmojen uusiminen ja animaatiot odottavat C:n hyväksyttyjä assetteja. Sijaintitila tyhjennetään jäsenyyden tai identiteetin vaihtuessa. Vanhat pyynnöt eivät pääse palauttamaan aiemman lobbyn hahmoja.

Varmennus: koko testisarja 90/90 läpäisee. Uusi API-integraatiotesti kattaa autentikoinnin, adapterin UUID:n, kaksi jäsentä, liikkeen, toiston/väärän id-kentän, leave/rejoin-generationin sekä rahojen säilymisen. B:n kymmenen presence-testiä kattavat geometrian/nopeusbudjetin ja adapterin. Kahdessa erillisessä oikeassa testiselaimessa kaveri ilmestyi, sen liike välittyi ja poistuminen poisti hahmon. JavaScript-virheitä ei ollut. Testit käyttivät muistissa olevia tietokantoja ja tilapäisiä portteja.

Ei uusia assetteja, audioa, uusia pokerisääntöjä, pushia tai deployta. Paikallinen palvelin käynnistetään uudelleen uusilla reiteillä. Vanha 15 s kotirosteripollaus säilyy; presence hakee rinnalla julkisen rosterin omiin renderöintipäivityksiinsä.
