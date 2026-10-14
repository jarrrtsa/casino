# NPC Hold'em – Chat B:n toteutus ja integraatio

Päivitetty 14.10.2026. Tila: valmis Chat A:n integraatiotarkistukseen.

Työkansio: `C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE`
Haara: `codex/npc-gameplay`. Lähtöcommit: `133353d`.
Toteutus ja testit: commit `0b61a49`.
Tämän raportin commit löytyy komennolla `git log -1 -- docs/NPC_GAMEPLAY.md`.

## Toteutus

Muutetut tiedostot ovat vain `bots.mjs`, uusi `npc-equity.mjs`, uusi `test/bots.test.mjs` ja tämä raportti. Palvelin, pokerisäännöt, hahmon palautus, talous, XP, käyttöliittymä, grafiikka ja audio säilyvät lähtöversion mukaisina.

Ennen floppia arvio huomioi parin arvon, korkeat kortit, saman maan kortit ja peräkkäiset arvot. Vastustajamäärä alentaa arviota. Flopin jälkeen 64 Monte Carlo -näytettä arvioi voitot ja tasapeliosuudet mahdollisilla loppupöydillä ja vastustajien mahdollisilla käsillä. Tunnetut kortit poistetaan erillisestä laskentapoolista, ja näytteet arvotaan ilman palautusta.

Botti lukee omat kortit, julkisen pöydän ja julkiset tiedot: stackit, panokset, sitoutuneet merkit, fold-tila sekä pokerimoottorin sallimat toiminnot. Se ei lue vastustajien cards/player-kenttiä, oikeaa hand.deck-pakkaa eikä tulevia kortteja. Simulaation kuvitteelliset vastustajakortit eivät ole pelin oikeita kortteja. Käden tila ei muutu päätöstä laskettaessa.

Maksun arvio vertaa voitto-osuusarviota pot oddseihin ja pelityylin riskilisään. Suuren osuuden sitominen jäljellä olevasta stackista kasvattaa riskilisää. Potin laskennasta rajataan pois yksittäisten pelaajien sellaiset sitoutuneet merkit, joita oman stackin kontribuutioraja ei voi voittaa; foldanneiden kuollut raha pysyy mukana.

Korotus huomioi minimin, oman maksimipanoksen, vastustajien mahdollisuuden maksaa, tyylin tavoitekoon ja stackista käytettävän osuuden. Lyhyt all-in on sallittu vain pokerimoottorin sallimassa muodossa. Ilmainen check ei vaihdu foldiksi. Julkisen pöydän royal flush maksetaan tai checkataan, koska sitä ei voi hävitä.

## Rajapinta

```js
botAction(hand, playerId);
botAction(hand, playerId, random);
botAction(hand, playerId, random, 'cautious');
botAction(hand, playerId, undefined, 'aggressive');
```

- Kolme alkuperäistä argumenttia säilyvät yhteensopivina. Oletustyyli on `balanced`.
- Neljäs argumentti on `cautious`, `balanced` tai `aggressive`. Tuntematon arvo käyttää tasapainoista tyyliä.
- Paluuarvo on `{ action: 'fold' | 'check' | 'call' }`, `{ action: 'raise', amount }` tai `null`, kun pelaajalla ei ole sallittua vuoroa.
- `amount` on tämän panostuskierroksen kokonaispanos, sama merkitys kuin pokerimoottorissa.
- Injektoitu `random()` palauttaa luvun väliltä `[0, 1)`. Väärä arvo aiheuttaa RangeErrorin; tuotannon oletus käyttää node:crypto-lähdettä.
- Sama käsi ja sama satunnaislukujono tuottavat saman päätöksen. Flopin jälkeen satunnaislähdettä käytetään myös arviointinäytteisiin, ei vain lopulliseen valintaan.
- `NPC_STYLES` on jäädytetty tyyliparametrien vienti. Rajapintaan ei tarvita uusia npm-riippuvuuksia.

| Tyyli | Käyttäytyminen |
| --- | --- |
| `cautious` / varovainen | Suurempi riskilisä, vahvempi käsi arvokorotukseen, pienemmät korotukset ja harvat bluffit. Tavallisen korotuksen budjetti 30 % stackista. |
| `balanced` / tasapainoinen | Maltillinen riskilisä, keskikokoiset arvokorotukset ja satunnaiset bluffit. Korotusbudjetti 55 %. |
| `aggressive` / aggressiivinen | Pienempi riskilisä, enemmän ja suurempia korotuksia sekä bluffeja. Korotusbudjetti voi käyttää koko stackin. |

Erittäin vahva arvio (vähintään 85 %) voi ylittää varovaisen tai tasapainoisen korotusbudjetin. Bluffi vaatii yhden vastustajan, jolla on vielä merkit, jonkin verran omaa voitto-osuutta sekä suhteellisen pienen nykyisen maksuvaatimuksen. Vastustajaa, joka on jo all-in, ei bluffata.

## Testit ja tulos

`npm test` tästä työkansiosta: **29 / 29 läpäisee**, 0 epäonnistumista. HTTP-testit käyttävät tilapäisiä portteja; tietokannat ovat muistissa tai erillisissä tilapäishakemistoissa. Oikeaa `data/casino.sqlite`-tiedostoa ei käytetty, eikä erillistä pysyvää palvelinta käynnistetty.

Uudet 10 NPC-testiä kattavat:

- Kolmen argumentin yhteensopivuuden, oletuksen, tuntemattoman tyylin ja vuorottoman null-paluuarvon.
- Kontrolloidun tilanteen, jossa varovainen foldaa, tasapainoinen maksaa ja aggressiivinen korottaa.
- Tyylien erot arvokorotuksen kynnyksessä, koossa ja bluffin yleisyydessä.
- Preflopin arvioinnin sekä postflopin kickerit, vedot, jaetun pöydän nutsit ja vastustajamäärän.
- Pot oddsin ja oman kontribuutiorajan vaikutuksen maksamiseen.
- Getter-ansat vastustajan kortteihin, player-kenttään ja todelliseen pakkaan sekä tilan muuttumattomuuden.
- Lyhyet all-init ja tilanteet, joissa korotus ei ole avautunut uudelleen.
- 60 toistettavaa kokonaista jakoa kolmella tyylillä, 2–6 pelaajalla ja eri stackeilla. Toiminnot ovat laillisia, jaot valmistuvat ja merkkien kokonaismäärä säilyy.

Myös alkuperäiset 19 pokeri-, talous- ja palvelintestiä läpäisevät uuden oletusbotin kanssa.

## Rajat ja seuraava askel

Tämä on ensimmäinen vahvuuteen ja hintaan perustuva heuristiikka, ei pokerisolventti tai todistus optimaalisesta strategiasta. Preflopin arvio on likimääräinen. Postflopin 64 näytteessä on vaihtelua. Vastustajan mahdolliset kädet oletetaan tasaisesti jakautuneiksi: botti ei opi pelaajaprofiilia tai päättele panostushistoriasta vastustajan käsirangea. Positiota ja tulevien panostuskierrosten odotusarvoa ei mallinneta erikseen.

Eri stackien sivupottien rahallinen rajaus huomioidaan, mutta jokaiselle sivupotille ei lasketa erillistä vastustajajoukkoa ja voitto-osuutta. Esimerkiksi usean all-in-pelaajan ja suuren erillisen sivupotin tilanteessa maksu voi siksi olla liian varovainen. Pokerimoottori ratkaisee varsinaiset sivupotit edelleen alkuperäisten sääntöjen mukaan. Täysi sivupottikohtainen odotusarvo on mahdollinen jatkokehitys.

Nykyisen palvelimen kutsu jatkaa tasapainoisena. Nimettyjen NPC-hahmojen pelityylit ja asumistason vaikutus vaikeuteen jätetään sovittuun integraatiovaiheeseen. Tyylivalintaa ei kytketty server.mjs:ään eikä clientiin.

Chat A tarkistaa NPC-commitin, yhdistää molemmat valmiit kokonaisuudet sovitussa vaiheessa ja ajaa koko testisarjan sekä yhteisen NPC-/hahmopalautuskokeilun. Tästä työhaarasta ei tehty mergeä, pushia tai deployta.
