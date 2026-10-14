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
