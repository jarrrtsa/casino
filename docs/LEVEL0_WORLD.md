# Lvl 0 – ympäristön ensimmäinen pelintegraatio

Käyttäjä hyväksyi 14.10.2026 lvl 0 -assetit ja niiden kokeiluintegraation. Tämä ohittaa vanhan assettien integraatiokiellon vain tälle valmistuneelle ympäristölle. Chat C jatkaa lvl 1:tä ja myöhemmin uusia hahmoja erillään.

## Assetit ja esitys

Neljä muuttamatonta PNG-lähdetiedostoa kopioitiin visual-audio-assets-worktreen design-staging/four-layers/level-0-kansiosta public/assets/level-0-kansioon: background-far, background-close, focus-v01 (pelissä focus) ja foreground. Pokerikuva on hyväksytyn paketin LVL0_poker.png (pelissä poker.png). Alkuperäisiä staging-tiedostoja tai niiden inventaariota ei muutettu. Käyttäjän tämän vuoron hyväksyntä ohittaa staging-metadatan aiemman review-merkinnän lvl 0:n kokeilukäyttöön.

Pelikoordinaatisto on 3840 × 1080 ja näkyvä kamera 1920 × 1080. Neljän lähdekerroksen koko on 2172 × 724; ne sovitetaan CSS:llä sovittuun 32:9-maailmaan koko alpha-kanava säilyttäen. Tiedostoja ei generoitu tai editoitu uudelleen. Näkymä sovitetaan 16:9-kehykseen; eri kuvasuhteilla reunoille voi jäädä tilaa. Kerrosten kohdistus ja mittasuhteet ovat kokeiluvaiheen lähtökohta, eivät lopullinen art-pass.

Vaakasuuntaiset parallax-kertoimet: far 0.2, close 0.75, focus 1, foreground 1.12. Kohdistus on keskitetty kameran koko liikeradan ympärille. Nopeinta etualaa levennetään renderöinnissä sen lisäliikkeen verran, jotta molemmissa reunoissa säilyy peitto. Reduced motion tai järjestelmän vähennetyn liikkeen asetus käyttää kaikille kerroksille kerrointa 1; hahmo voi edelleen kävellä.

## Liikkuminen

WASD ja nuolinäppäimet liikuttavat nykyistä hahmoa vain sillan alusympäristön kotinäkymässä. Sama nykyinen SVG-hahmo säilyy, kunnes uudet hahmot valmistuvat. Hahmon jalkapisteen rajat ovat x = 10–90 % koko maailmasta ja y = 60–90 % kuvan korkeudesta. Tässä tulkinnassa alimman 40 %:n alueesta jätetään pois kuvan alin 10 %. Luvut ovat yhden kuvan prosenttiyksiköitä, eivät jäljelle jäävän alueen prosentteja.

A/D liikuttaa kameraa sivusuunnassa; kameran reunoissa hahmo jatkaa liikkumista ruudun sisällä. W/S muuttaa vain syvyyskoordinaattia, ei kameraa tai parallaxia. Diagonaalinen liike normalisoidaan, ja frame-aika rajataan pitkän tauon jälkeisen hypyn estämiseksi. Ikkunan fokuksen menetys, avoin dialogi ja lomakkeeseen kirjoittaminen estävät liikkumisen. Liike on paikallista eikä muuta taloutta. Multiplayerin vapaan liikkumisen synkronointi ei kuulu tähän versioon.

Kodin valikko voidaan piilottaa Hide menu -painikkeesta ja avata Show menu -painikkeesta. Näin myös oikea reuna ja hahmo näkyvät kävelykokeilussa. Tämä vaihe rajaa vain suorakulmion: teltta, pöytä ja muut esineet eivät vielä ole törmäysesteitä. Pöytään liittyminen tehdään nykyisistä Singleplayer/Multiplayer-valinnoista.

## Pokeri ja fallback

Sillan alusympäristön NPC- ja hostin multiplayer-pöydät käyttävät samaa erillistä poker.png-kuvaa. Vanha jakajakuva piilotetaan tässä ympäristössä ja yhteiset kortit/potti kohdistetaan puisen pöydän pintaan. Muut asumisympäristöt käyttävät aiempia kuviaan ja paikallaan olevaa kotinäkymää. XP, nettovarallisuuden rajat, NPC-strategiat ja talous säilyvät.

## Varmennus

Kolme uutta testiä kattavat liikerajat, diagonaalinopeuden, frame-aikarajan, syvyysliikkeen kameran, parallaxin reunapeiton ja uuden moduulin/CSS:n sekä viiden PNG:n tarjoamisen. Koko testisarja: 55/55 läpäisee myös lopullisen integraatioajon.

Erillinen oikea selain (1600 × 900) ja muistissa oleva testitietokanta varmensivat kaikkien kerrosten latautumisen, tavallisen hahmonluonnin, W/S:n ilman kameran muutosta, A/D:n kameravierityksen, kirjoittamisen ilman kävelyä, vasemman ja oikean liikerajan ja pokerikuvan. Selaimen JavaScript-virheitä ei ollut. Kuvista tarkistettiin molemmat maailman reunat ja pokerinäkymä. Varsinaista pelitietokantaa ei käytetty testaukseen.

Kotivalikon piilottaminen/avaaminen varmennettiin vielä erillisessä selainajossa. Molemmat reunaesikatselut ja pokeriesikatselu tallennettiin ignored screenshots/-kansioon. Commit-tunniste kirjataan kanoniseen työnjakoon.


## Kohdistuksen ja valikon korjaus käyttäjäpalautteesta

Kaikki layerit käyttävät samaa 3840 × 1080 -renderöintikokoa ja samaa lähtökohdistusta. Etualaa ei enää levennetä erikseen. Kamera käyttää 20–80 % ruudun levyistä liikkumavaraa: seuraaminen alkaa vasta hahmon lähestyessä reunaa. Parallax on hillitty (0.92 / 0.98 / 1 / 1.03), alkaa yhteisestä kohdistuksesta ja pysyy kuvan peittorajoissa. W/S ei muuta kameraa. Näkymä täyttää koko pelialueen cover-sovituksella myös muissa kuin 16:9-kuvasuhteissa; tällöin kuva rajautuu, eikä ylä-/alareunaan jää tyhjää palkkia.

Yläpalkki on 52 px ja läpinäkyvä. Kotivalikko vetäytyy oikealle jättäen 18 px reunan; hiiren vieminen reunaan tai näppäimistöfokus tuo sen esiin. Tausta ja vieritys kattavat koko valikon korkeuden. Hide menu -painike poistettiin. Kosketuslaitteelle jää 44 px reunakaista.

56 testiä läpäisee. Oikea selain varmisti yhtenäiset layerleveydet, liikkumisen ilman välitöntä kameraseurantaa, seuraamisen reunan lähellä, 1040 × 888 fullscreen-näkymän ilman tyhjää ylä-/alapalkkia, 52 px headerin sekä koko korkeuden reunavalikon. JavaScript-virheitä ei ollut.
