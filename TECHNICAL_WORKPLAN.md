# Teknisen työn koordinointi – Casino Royale

Päivitetty 14.10.2026. Tämä on molempien chattien yhteinen työnjakosopimus.
Kanoninen tiedosto: C:\Users\Teemu\Documents\ChatGPT\CASINO ROYALE\TECHNICAL_WORKPLAN.md
Lue tämä ja samassa kansiossa oleva VISION.md ennen työtä. Toisen chatin historia ei korvaa tiedostoihin kirjattua sopimusta.

## Yhteinen rajaus

Nyt rakennetaan tekniikkaa. Älä muuta ulkoasua, grafiikkaa, ääniä, CSS:ää tai ympäristöjä. Kolmas chat voi myöhemmin vastata niistä; se ei ole vielä käynnissä. Älä toteuta WASD-maailmaa, kasinoa tai uusia kasinopelejä tämän työn osana. Nykyiset talouden summat ja XP-rajat säilyvät.

## Chat A – tämä chat: hahmon palautus ja käyttöoikeudet

Työkansio: C:\Users\Teemu\Documents\ChatGPT\CASINO ROYALE
Haara: codex/character-recovery
Tila: vaihe 1 valmis, commit beeaf76.

Tavoite: palvelimen tukema hahmon palautus toisessa selainprofiilissa tai laitteessa ilman uuden alkusaldon luomista. Toteuta satunnainen palautussalaisuus, sen turvallinen säilytys tiivisteenä ja käyttöavaimen vaihto. Nykyinen hahmo ja varat säilyvät. Vanha käyttöavain lakkaa toimimasta palautuksen jälkeen. Määrittele myös aktiivisen pöydän ja istuntojen käsittely ennen palautuksen hyväksymistä, jotta varat ja hallinta eivät jää kahdelle käyttäjälle. Palautus on uusi API-ominaisuus; käyttöliittymä ja sähköpostipalvelu eivät kuulu ensimmäiseen osaan.

Omistetut tiedostot:
- economy.mjs
- server.mjs (ainoastaan hahmon palautuksen ja käyttöoikeuksien tarvitsemat muutokset)
- test/economy.test.mjs
- test/character-api.test.mjs
- uudet test/recovery*.test.mjs
- uudet recovery*.mjs, jos tarpeen
- docs/CHARACTER_RECOVERY.md (API-sopimus ja palautuksen käyttö)

Valmis kun: palautus säilyttää talouden, vanha avain hylätään, virheelliset palautukset eivät paljasta salaisuuksia, nykyiset hahmot voidaan migroida ja aktiivinen pöytä käsitellään määritellysti. Olennaiset väärinkäyttö- ja uudelleenkäynnistystapaukset testataan. Koko npm test läpäisee.

## Chat B – toinen chat: NPC-päätöksenteko

Työkansio: C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE
Haara: codex/npc-gameplay
Pohja: 133353d (master työnjaon alussa).
Tila: vaihe 1 valmis, commitit 0b61a49 ja cc2f7fe.

Tavoite: paranna NPC-Hold'emin päätöksentekoa ja lisää testattavat varovainen, tasapainoinen ja aggressiivinen pelityyli. Kehitä käden vahvuuden ja panoksen riskin arviointia. Botti saa hyödyntää vain omia korttejaan, julkista pöytää ja julkisia panostietoja. Se ei saa lukea muiden suljettuja kortteja tai tulevaa pakkaa. Vaikeus tarkoittaa päätösten laatua, ei piilotietojen käyttöä.

Omistetut tiedostot:
- bots.mjs
- uudet npc*.mjs, jos tarpeen
- uudet test/bots*.test.mjs
- docs/NPC_GAMEPLAY.md (tyylit, valintarajapinta ja integrointiohje)

Säilytä yhteensopivuus: botAction(hand, id, random) toimii sellaisenaan; oletus on tasapainoinen. Mahdollinen tyylivalinta lisätään valinnaisena neljäntenä argumenttina. Paluuarvo pysyy muodossa { action, amount? } tai null, ja toiminto on aina laillinen. Satunnaislähteen injektointi säilytetään toistettavia testejä varten. Älä muuta poker.mjs:n sääntöjä tai server.mjs:ää. Tyylien sitominen nimettyihin NPC-hahmoihin ja asumistasoihin jätetään integraatiovaiheeseen.

Valmis kun: tyylit tuottavat perusteltua eroa kontrolloiduissa tilanteissa, yksikään ei käytä piilotietoa, panostukset pysyvät sallituissa rajoissa ja pelatut testikädet valmistuvat pelimerkkien määrän säilyessä. Koko npm test läpäisee. Älä säädä talouden tai XP:n tasapainoa.

## Yhteistyön säännöt

- Muokkaa vain oman kokonaisuutesi tiedostoja omassa työkopiossasi. Tarvittava rajan ylitys kirjataan ensin tämän tiedoston viestiosioon; odota yhteistä päätöstä ennen muutosta.
- Älä muokkaa public/, README.md, DEPLOYMENT.md, VISION.md, package.json tai toisen chatin testejä. Tarvittavat yhteiset päivitykset tehdään integraatiossa.
- Sama lähtöcommit ei sisällä kaikkia pääkansion tallentamattomia muistiinpanoja. Lue ajantasainen visio kanonisesta pääkansiosta.
- Käytä erillistä testitietokantaa tai muistissa olevaa tietokantaa. Älä käytä oikeaa data/casino.sqlite-tiedostoa testejä varten. Älä aja kahta palvelinta samalla portilla.
- Älä deployaa, pushaa tai yhdistä haaroja automaattisesti. Tee omaan haaraan rajatut commitit, kun työ ja testit valmistuvat; ilmoita commit-tunnisteet.
- Chat A hoitaa lopuksi integraation: tarkistaa Chat B:n muutokset, yhdistää ne ja ajaa koko testisarjan sekä yhteisen NPC-/hahmopalautuskokeilun. Yhdistäminen odottaa molempien valmistumista.
- Kummankin chatin oma tilaraportti on omassa docs-tiedostossa: toteutus, testit, rajat, seuraava askel ja commit-tunnisteet. Tämä kanoninen tiedosto pysyy työnjakona. Viestiosioon saa lisätä päivätyn viestin oman chatin nimellä; älä korvaa toisen tekstiä.

## Viestit ja rajapintapäätökset

14.10.2026 / Chat A: Ei uusia npm-riippuvuuksia työnjaon valmistelussa. Chat B:n botAction-rajapinta säilyy yhteensopivana. Kumpikaan chat ei muuta pelin designia.

14.10.2026 / Chat A: Lähtötilan kaikki 19 testiä läpäisevät. Rajoitetussa ympäristössä HTTP-testit vaativat luvan paikalliseen testipalvelinyhteyteen; EACCES ei tässä lähtötilassa ollut pelin virhe. Molemmat työhaarat on luotu, ja worktreen AGENTS.md ohjaa kanoniseen työnjakoon.


14.10.2026 / Chat A: Hahmon palautuksen backend on valmis ja kaikki 23 testiä läpäisevät. API-sopimus ja rajat: docs/CHARACTER_RECOVERY.md. Käyttöliittymä ei vielä sisällä palautustoimintoa. Aktiivinen pöytävaraus estää palautuksen (409); vanha käyttöavain mitätöityy onnistuneessa palautuksessa. Chat B:n tiedostoja ei muutettu eikä haaroja yhdistetty.

14.10.2026 / Chat A: Toteutuksen commit on beeaf76 haarassa codex/character-recovery. Oma osuus valmis yhdistettäväksi, kun Chat B valmistuu.

# Vaihe 2 – aktiivinen työnjako (14.10.2026)

Tämä osio korvaa yllä olevan vaiheen 1 aktiiviset vastuut ja tiedostorajat. Vaihe 1 on valmis: Chat A beeaf76; Chat B 0b61a49 + cc2f7fe. Chat A tarkisti ja yhdisti työt commitissa bc0247e. Yhteinen lähtötila: 33/33 testiä läpäisee. NPC-arvio käyttää 64 Monte Carlo -näytettä ja on heuristinen; sivupottikohtainen strategia ja pelaajaprofiilien oppiminen ovat myöhempää työtä.

## Chat A: NPC-hahmojen palvelinintegraatio

Kansio: C:\Users\Teemu\Documents\ChatGPT\CASINO ROYALE
Haara: codex/npc-integration
Pohja: bc0247e. Tila: valmis, commit 463031c; kaikki 35 testiä läpäisevät.

Kytke nimetyt NPC-profiilit pelityyleihin palvelimella: Mara varovainen, Jules aggressiivinen. Nykyinen nimi ja ulkonäkö säilyvät. Käytä erillistä jäädytettyä profiililuetteloa ja anna botAction-kutsulle palvelimen valitsema tyyli. Asiakas ei saa määrätä NPC-strategiaa pyynnössä. Julkinen snapshot voi kertoa botin profiilitunnisteen ja pelityylin; ei simulaatiotuloksia tai suljettuja kortteja. Tuntematon tai puuttuva sisäinen tyyli palautuu balanced-oletukseen.

Omistus: server.mjs, uusi npc-roster.mjs, uudet test/npc-integration*.test.mjs, docs/NPC_INTEGRATION.md. Älä muuta bots.mjs:n strategiaa, poker.mjs:ää tai talouden tasapainoa. Testaa NPC-pelin valmistuminen, merkkien talletus ja saman hahmon palautus yhden kokonaisen pelin jälkeen. Ulkoasua tai audioa ei muuteta. Asumistason mukaiset vaikeudet jäävät myöhemmäksi.

## Chat B: hahmon palautuksen toimiva käyttöliittymä

Kansio: C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE
Haara: codex/recovery-ui
Pohja: bc0247e (molempien vaiheen 1 työt yhdistetty). Tila: worktree valmis; aloita käyttäjän promptin jälkeen.

Tavoite: pelaaja voi luoda/tallentaa palautusavaimen ja palauttaa olemassa olevan hahmon pelin kautta. Käytä nykyisiä dialogeja ja CSS-luokkia. Lisää vain tarpeelliset toiminnalliset kontrollit ja englanninkieliset lyhyet ohjeet; ei design-uudistusta, kuvia, animaatioita tai ääniä.

Omistus: public/character.js, public/index.html, public/shell.js, public/app.js (ainoastaan hahmon vaihdon, palautuksen ja vanhan pöytäyhteyden hallinnan tarvittavat muutokset), uusi public/recovery-client.mjs jos tarpeen, test/recovery-client*.test.mjs, docs/RECOVERY_UI.md. Server.mjs on Chat A:n: jos lisäät selaimeen uuden moduulin, kirjaa sen tarvitsema static-route docs/RECOVERY_UI.md:hen; Chat A lisää sen integraatiossa. Voit välttää tämän sijoittamalla selainlogiikan nykyiseen character.js:ään. Älä muokkaa economy.mjs:ää, bots.mjs:ää, server.mjs:ää tai CSS:ää.

Lue docs/CHARACTER_RECOVERY.md API-sopimukseksi. Palautus toimii myös ilman nykyistä hahmoa. Luo uusi avain vain käyttäjän nimenomaisesta toiminnosta; uusi korvaa aiemman. Näytä avain vain rajatussa näkymässä ja tyhjennä avainkentät suljettaessa. Älä tallenna palautusavainta localStorageen, URL:iin tai lokiin. Käyttöavain tallennetaan nykyiseen casino-identity-v1-muotoon. Kopioinnin epäonnistuessa anna manuaalinen kopiointimahdollisuus. Jos nykyinen hahmo vaihtuisi toiseen, pyydä selkeä vahvistus ennen onnistunutta vaihtoa ja kerro, ettei aiempi hahmo poistu. Aktiivisesta pöydästä ei vaihdeta hahmoa; API:n 409 esitetään ymmärrettävästi. Virheellisen avaimen tai palveluvirheen jälkeen nykyinen identity säilyy.

Kun palvelin palauttaa uuden hahmon, katkaise mahdollinen vanha EventSource, tyhjennä vanha session/currentRoom sekä vanha luontiavain ja minipelityö. Päivitä hahmo, koti ja UI yhtenä vaihtona. 401:n jälkeen käyttöliittymä tarjoaa palautusta uuden hahmon luonnin rinnalla. Huomioi palautuksen aikana kesken olevat vanhan hahmon vastaukset: ne eivät saa korvata palautettua profiilia. Palautusavaimen uusinnassa tarvitaan selkeä tieto siitä, että edellinen avain lakkaa toimimasta.

Valmis kun: avaimen luonti/kopiointi, palautus puhtaassa selainprofiilissa, virheellinen avain, 409, 429, localStoragen epäonnistuminen, vanhan hahmon vahingossa korvaamisen esto ja vanhojen vastausten sivuuttaminen on varmennettu tarkoituksenmukaisin testeillä tai dokumentoidulla selainkokeella. Koko npm test läpäisee. Tee rajatut commitit ja kirjaa raportti docs/RECOVERY_UI.md:hen. Älä mergeä, pushaa tai deployaa.

## Chat C: grafiikka ja audio – assetti kerrallaan, erillinen valmistelu

Kansio: C:\Users\Teemu\.codex\worktrees\visual-audio-assets\CASINO ROYALE
Haara: codex/visual-audio-assets
Pohja: bc0247e. Aloita käyttäjän promptin jälkeen.

Lue kanoninen DESIGN_ASSET_WORKFLOW.md pääkansiosta. Omistus on vain oman worktreen design-staging/-kansio ja docs/DESIGN_ASSETS.md. Älä koske public/-kansioon, koodiin, asetuksiin tai pelin nykyisiin kuviin/ääniin. Kaikki tuotokset ovat irrallisia tiedostoja ja esikatseluja. Kolmannen chatin työ ei muuta pelin nykyistä designia.

Ensin sovitaan käyttäjän kanssa rajattu assettiluettelo ja tyyli. Sen jälkeen valmista yksi assetti, näytä se, korjaa tarvittaessa ja odota käyttäjän hyväksyntä ennen seuraavaa. Saman assetin variantit ovat sallittuja, mutta älä generoi useita eri assetteja yhtä aikaa. Sama periaate koskee audioa. Kaikki sovitun luettelon assetit valmistetaan, hyväksytään ja tarkistetaan ennen ensimmäistäkään pelintegraatiota. Hyväksytyn assetin valmistuminen ei yksin anna lupaa ottaa sitä peliin. Integraatio on myöhemmin erikseen käyttäjän käynnistämä vaihe.

## Kaikkien chattien säännöt vaiheessa 2

Kanoninen työnjako ja visio luetaan alkuperäisestä pääkansiosta. Worktreeissä olevat kopiot voivat olla vanhoja. AGENTS.md ohjaa kanoniseen tiedostoon. Jokainen toimii omassa työkopiossaan ja raportoi omassa docs-tiedostossaan. Chat A hoitaa teknisten osien yhdistämisen vasta valmistumisen jälkeen. Design-tiedostoja ei yhdistetä pelikäyttöön samalla kertaa. Ei pushia tai deployta tässä vaiheessa. Jaetuissa viesteissä saa vain lisätä oman päivätyn merkinnän; älä korvaa toisen tekstiä.

Tämän vaiheen jälkeen mahdollisia teknisiä kokonaisuuksia ovat pysyvän tallennuksen varmuuskopiointi, lobbyn ja kodin erottaminen pokeripöydästä, yhteisen kasinoreissun hyväksyntä sekä myöhemmin uudet pelimoottorit. Niitä ei toteuteta vielä.

14.10.2026 / Chat A / vaihe 2: NPC-profiilien palvelinintegraatio valmis; kaikki 35 testiä läpäisevät. docs/NPC_INTEGRATION.md sisältää katselmoinnin, lisäkentän ja yhteisen palautuskokeen tuloksen. Chat B:n codex/recovery-ui sekä Chat C:n codex/visual-audio-assets ovat valmiina commitista bc0247e. Chat B voi aloittaa omassa työkopiossaan ilman tämän NPC-integraation hakemista.


14.10.2026 / Chat A / vaihe 2: NPC-integraation commit 463031c. Oman osuuden toteutus ja testit valmiit; seuraavaksi odotetaan Chat B:n palautuskäyttöliittymän valmistumista teknistä integraatiota varten.
