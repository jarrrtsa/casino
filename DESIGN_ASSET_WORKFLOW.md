# Design- ja audioassetit: valmistelu ennen pelintegraatiota

Kanoninen ohje, 14.10.2026. Tämä toteuttaa käyttäjän toiveen: yksi assetti kerrallaan, kaikki sovitut assetit valmiiksi ennen peliin lisäämistä tai designin muuttamista.

## Työkansio ja rajat

Työ tehdään Chat C:n omassa visual-audio-assets-worktreessä. Kirjoita vain design-staging/-kansioon ja docs/DESIGN_ASSETS.md:hen. Älä muuta public/, koodia, grafiikan viittauksia, CSS:ää, ääniasetuksia, paketteja tai hostingia. Älä integroi edes valmista hyväksyttyä assettia. Älä deployaa. Käyttäjä käynnistää myöhemmin integraation erikseen, kun koko sovittu paketti on hyväksytty.

## Aloitus

1. Lue pääkansion VISION.md ja TECHNICAL_WORKPLAN.md; niiden ideat eivät ole kaikkien ominaisuuksien toteutuslupaus.
2. Keskustele käyttäjän kanssa ensimmäisen assettipaketin rajauksesta. Ehdota kodin visuaalista kokonaisuutta ensimmäiseksi; kasino ja laaja kosmetiikka voivat olla myöhempiä paketteja. Kirjaa, mitä 'kaikki assetit' tarkoittaa tässä paketissa, jotta kokonaisuus on aidosti valmistettavissa.
3. Sovi tyyli, kuvakulma, tavoitekoko ja kerrosjako ennen ensimmäistä lopullista assettia. Nykyinen SVG-tyyli ei sido uutta visiota. Voit aloittaa yhdestä tunnelmareferenssistä, mutta merkitse se referenssiksi, ei valmiiksi pelitaustaksi.
4. Kirjaa inventaario design-staging/manifest.json-tiedostoon. Yksi aktiivinen assetti kerrallaan.

## Assetin työkierto

Valitse inventaariosta yksi assetti → tarkenna sen sisältö → luo/generoi/piirrä → näytä tai soita esikatselu käyttäjälle → korjaa → odota käyttäjän nimenomainen hyväksyntä → merkitse hyväksytyksi → siirry seuraavaan.

Hiljaisuus ei tarkoita hyväksyntää. Älä generoi seuraavaa assettia ennen edellisen hyväksyntää. Säilytä hyväksytty versio ja variantit erillään. Älä ilmoita kuvaa, ääntä tai animaatiota valmiiksi, jos kyse on vain tekstipromptista. Käytä kuvan generointiin/muokkaamiseen imagegen-osaamista ja lue sen SKILL.md ennen käyttöä. Käytä muita sopivia työkaluja vektoreihin tai audioon; jos audioa ei voi tuottaa käytettävissä olevilla työkaluilla, kirjaa rajoitus ja toimita äänibriefi ilman väitettä valmiista äänitiedostosta.

## Käyttäjän asumisvisio – suunnittelureferenssi

Asumistaso on eri asia kuin XP-level. Tämä lista ei muuta pelin nykyisiä progression rajoja tai aloituskotia.

| Asumistaso | Ympäristö ja hahmon tunnelma | Ehdotetut erilliset efektit |
| --- | --- | --- |
| 0 | Silta, teltta, hämärä, kaukana kaupungin valot; tyytymätön hahmo | Sade ja tynnyrituli |
| 1 | Ränsistynyt luukku; tyytymätön mutta tilanteeseen sopeutuneempi hahmo | Heiluva kattolamppu ja pöly |
| 2 | Halpa pieni yksiö, pahvilaatikoita ja roskia; hieman parempi mieliala | Pöly ja katon vesitipat |
| 3 | Tavallinen, lähes tyhjä vuokrakaksio; neutraali hahmo; mahdollinen aloituskoti | Erikseen sovittavat pienet efektit |
| 4 | Sisustettu vuokrakaksio, sohva, TV ja taustan parveke; hieman tyytyväinen | TV:n staattinen kuva |
| 10 | Tyylikäs, puhdas omakotitalo; tyytyväinen hahmo | Valon heijastus viinipullossa |
| 15 | Kallis rantahuvila auringonlaskussa; iloinen hahmo | Meri ja tuulessa liikkuvat palmut |
| 20 | Moderni luksuskartano kukkuloilla, allas ja puutarha; omahyväinen virne | Allasvesi ja suihkulähde |

## Pelikäyttöä varten valmisteltavat osat

WASD-liikkuminen ja parallax tarvitsevat erillisiä kerroksia: kaukotausta, ympäristö/lattia, kuljettavien alueiden suunnitelma, huonekalut ja etuala. Hahmo, pokeripöytä ja tietokone eivät saa vahingossa jäädä kiinteäksi osaksi taustaa, jos niitä pitää liikuttaa tai käyttää erikseen. Efektien kuten tulen, veden ja lampun tulee olla omia assettejaan tai erikseen kuvattuja animaatiototeutuksia. Kaikkea ei tarvitse tehdä bitmap-kuvana.

Lukitse ensimmäisen hyväksytyn referenssin jälkeen sama perspektiivi, hahmojen mittakaava, paletti ja valaistuksen periaatteet. Sovi assettikohtainen PNG/WebP/SVG/WAV/OGG-muoto ja koko käyttötarkoituksen mukaan. Läpinäkyvää cutoutia varten käytä aitoa alpha-kanavaa. Merkitse ankkuripiste, kerrosjärjestys ja yhteensopivat assetit. Jos assetti on animaatio, merkitse ruutukoko, ruutumäärä, fps ja saumattoman loopin tarkistus; still-kuva ei ole valmis animaatio.

Audioinventaario voi sisältää myöhemmin sade-, tuli-, huone-, meri- ja kasinoambiencen sekä korttien, merkkien ja ilmoitusten tehosteet. Vältä puhetta tai musiikkia ennen tyylin sopimista. Tarkista loopin sauma, clipping, voimakkuus, kesto ja tiedoston toistuminen. Yksi ääni kerrallaan hyväksytään kuunneltavan esikatselun kautta.

## Inventaario ja luovutus

Jokaisella manifestin assetilla on vähintään id, kuvaus, tyyppi, tiedostopolku, formaatti, koko tai kesto, kerros/ankkuri tarvittaessa, tila (planned/draft/review/approved), versio, hyväksyntämerkintä ja riippuvuudet. Hyväksyntämerkintä perustuu käyttäjän viestiin. Kirjaa generoinnin/piirtämisen lähde ja mahdolliset käytetyt referenssit; käytä omia, käyttäjän antamia tai käyttöön oikeutettuja aineistoja.

Ennen luovutusta varmista, että jokainen sovitun paketin assetti on hyväksytty, tiedostot aukeavat ja esikatselut vastaavat lopullisia tiedostoja. Toimita inventaario, esikatselut, lähteet, hyväksytyt lopputiedostot ja integraatiomuistio. Puuttuvat assetit tai pelkät briefit estävät paketin merkitsemisen kokonaan valmiiksi. Peli pysyy koko valmistelun ajan ennallaan designin osalta.

## Tarkennus 14.10.2026: ensimmäinen paketti on asumistaso 0

Käyttäjä ja Chat C valmistavat parhaillaan sillan alusympäristöä. Ensimmäinen sovittu valmistelukokonaisuus on tämä ympäristö kerroksineen sekä saman paikan pokerinäkymä. Muita asumistasoja ei tarvitse aloittaa ennen tätä kokonaisuutta. Yksi assetti kerrallaan hyväksytään edelleen käyttäjän kanssa. Tämä ohje ei ota assetteja peliin eikä toteuta liikkumista.

### Maailman koko ja liikkuminen

- Ympäristö on suunniteltu kahden ruudun levyiseksi. Tarkka pikselikoko ja tavoitenäytön kuvasuhde sovitaan assettityössä; ruutu tarkoittaa pelin näkyvää aluetta, ei oletettua selaimen fyysistä leveyttä kaikilla laitteilla.
- A/D-liike siirtää hahmoa sivusuunnassa ja vierittää näkymää. Kerrokset liikkuvat eri nopeuksilla ja tuottavat parallax-vaikutelman.
- W/S-liike on rajattua liikkumista syvyyssuunnassa saman näkyvän alueen sisällä. Se ei aiheuta pystysuuntaista vieritystä eikä syvyysliikkeeseen sidottua parallaxia. Kameran pystyasema pysyy samana.
- Hahmon syvyysliikkeen sallittu alue merkitään suunnitteluun erikseen. Älä oleta koko kuvan olevan kuljettavaa lattiaa. Mahdollinen koon muuttuminen syvyyden mukaan ja täsmälliset liikerajat ovat vielä sovittavia asioita.

### Kerrosten luovutus myöhempää toteutusta varten

Kirjaa kerroksille yhteinen maailman koordinaatisto, näkymän koko/kuvasuhde, järjestys, kohdistuspisteet ja ehdotettu vain vaakasuuntainen parallax-kerroin. Tarkista yhdistelmän molemmat reunat ja keskikohta erillisessä esikatselussa. Kerrosten on peitettävä niille suunniteltu kameran liike ilman tyhjiä reunoja; eri syvyyskerrosten tiedostoleveyksien ei tarvitse olla identtisiä, jos kohdistus ja peitto on dokumentoitu.

Kirjaa hahmon spawn, rajattu kuljettava syvyyskaista, esteet ja pokeripöydän vuorovaikutusalue suhteessa yhteiseen koordinaatistoon. Näitä voi kuvata erillisessä suunnittelukuvassa tai metadatassa; niitä ei polteta näkyviin lopullisiin taustoihin. Tämä on valmistelumetadataa, ei pelin collision- tai WASD-toteutus.

### Sama sijainti pokerissa

Valmistetaan erillinen pokerinäkymä saman sillan aluspaikan pokeripöydästä. Paikan tunnistettavat rakenteet, pöytä, materiaalit, valaistus ja ympäristön yksityiskohdat pysyvät yhtenäisinä kotinäkymän kanssa. Pokerinäkymän rajaus/perspektiivi sovitaan erikseen; se voi käyttää samoja lähdeassetteja, mutta pelkkää kotikuvan automaattista cropia ei oleteta lopulliseksi ratkaisuksi.

Sama asumistason 0 pokerinäkymä palvelee NPC-yksinpeliä sekä kyseisessä ympäristössä hostattua yksityistä multiplayer-pöytää. Pelikortit, panokset, pelimerkkimäärät, nimet ja käyttöliittymä ovat myöhemmin erillisiä pelielementtejä; niitä ei piirretä pysyväksi osaksi taustaa. Merkitse pöydän, istumapaikkojen ja mahdollisen jakajan kohdistus niin, että pelielementit voidaan myöhemmin sijoittaa siihen.

Valmistumisjärjestys: sillan alusmaailma ja sen hyväksytyt layerit → saman sijainnin hyväksytty pokerinäkymä ja tarvittavat erilliset osat → koko sovitun paketin tarkistus → vasta käyttäjän erikseen käynnistämä pelintegraatio. Asumistaso 0 on designin nimi; tämä työ ei muuta nykyisen backendin XP-leveliä, alkukotia tai progression rajoja.

## Käyttäjän uusi integraatiolupa 14.10.2026

Lvl 0:n neljä layeria (far, close, focus, foreground) ja pokerinäkymä ovat käyttäjän hyväksymiä kokeiltavaksi pelissä. Chat A saa integroida tämän paketin ja tehdä WASD:n, vaakavierityksen ja parallaxin. Liikealueen jalkapiste: koko maailman x 10–90 %, kuvan y 60–90 %. Tämä korvaa vanhan integraatiokiellon vain lvl 0:n osalta. Chat C jatkaa lvl 1:n valmistelua ja myöhemmin uusia hahmoja edelleen irrallisina assetteina; niitä ei oteta peliin ilman seuraavaa käyttäjän lupaa. Lvl 0:n toteutus ja testit kuvataan docs/LEVEL0_WORLD.md:ssä.

## Vaihe 4: hahmot, animaatiot ja ääni

Chat C:n valmistelualue kattaa nyt myös hahmodesignin, modulaariset vaatteet/hiukset, ilmeet, NPC:t, sprite-animaatiot, ympäristöefektit ja audion. Käyttäjä valitsee seuraavan assetin ja paketin. Sama yhden assetin hyväksyntäkierto säilyy. Perushahmo ja sen mittakaava/perspektiivi/jalkapiste kannattaa lukita ennen siihen kohdistettavia osia. Säilytä alpha ja kirjaa yhteinen canvas, ankkuri, mahdollinen hitbox-suositus sekä animaation frame-jako, fps, loop ja suunta. Äänet hyväksytään kuuntelemalla, tiedoston tekniset tiedot ja loop kirjataan.

Aiemmat lvl 0/1 hyväksytyt loppukuvat on jo integroitu käyttäjän pyynnöstä. Niiden lähdetiedostoja ei korvata tai muuteta huomaamatta. Uudet assetit ja revisiot pysyvät stagingissa, kunnes sovittu paketti on hyväksytty ja käyttäjä pyytää integraatiota. Chat C ei muuta pelin lähdekoodia eikä pushaa tai deployaa.
