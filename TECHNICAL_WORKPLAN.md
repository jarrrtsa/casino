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

## Vaiheen 2 integraatio ja design-tarkennus 14.10.2026

Chat B valmistui: c4775c5 (toteutus ja testit), d2557d4 (raportti). Chat A katselmoi identity-rajan, vahvistuksen, avaimen käsittelyn, vanhat vastaukset/yhteydet sekä raportin. Sovitut tiedostorajat toteutuivat; uutta static-routea ei tarvittu. Chat B:n oma versio läpäisi 50 testiä; yhdistetty versio sisältää lisäksi Chat A:n kaksi NPC-integraatiotestiä ja läpäisee 52/52. Raportissa mainittu aiempi hosting-testiprosessin epäonnistuminen ei toistunut tässä yhteisessä testiajossa. Chat A:n ja Chat B:n tekninen vaihe 2 on nyt yhdistetty paikalliseen codex/npc-integration-haaraan. Ei pushia tai deployta.

Chat C:n työ jatkuu erillisessä assetti-worktreessä. Käyttäjän tämänhetkinen paketti on asumistason 0 sillan alusympäristö, sen layerit ja saman sijainnin pokerinäkymä. Maailma on kahden ruudun levyinen: A/D vierittää vaakasuunnassa ja käyttää parallaxia; W/S sallii rajatun syvyysliikkeen ilman pystysuuntaista vieritystä tai parallaxia. Pokerinäkymää käytetään myöhemmin sekä NPC-pelissä että tällä asumistasolla hostatussa multiplayer-lobbyssa. Tarkennettu luovutusohje on kanonisen DESIGN_ASSET_WORKFLOW.md:n viimeisessä osiossa.

Assetteja ei siirretä public/-kansioon, oteta peliin eikä design-haaraa yhdistetä nyt. Liikkumista, kameraa tai collisionia ei toteuteta tämän integraation yhteydessä. Käyttäjä ja Chat C viimeistelevät ensin sillan alusmaailman kerroksineen ja sen pokerinäkymän, yksi hyväksyttävä assetti kerrallaan.
14.10.2026 / Chat A: Palautuskäyttöliittymän ja NPC-integraation yhdistävä commit on adc4fe8. Molemmat tekniset osuudet ovat valmiit; Chat C:n erillinen assettityö jatkuu.

## Vaihe 3: käyttäjän hyväksymä lvl 0 -koeintegraatio

Käyttäjä hyväksyi 14.10.2026 neljän sillan aluslayerin ja saman paikan pokerinäkymän kokeilun peliin sekä WASD-liikkumisen ja vaakaparallaxin. Tämä korvaa aiemman integraatiokiellon vain lvl 0:n osalta. Chat A omistaa tämän integraation public/shell.js-, public/index.html-, uuden home-world-moduulin ja CSS:n sekä niiden static-reittien ja testien osalta. Chat C jatkaa lvl 1:n ja myöhemmin hahmojen valmistelua erillisessä worktreessä; sen staging-tiedostoja ei muuteta. Kävelyn jalkapisteen rajat: x 10–90 % koko maailmakuvasta, y 60–90 %. W/S ei liikuta kameraa. Nykyiset hahmot ja talouden progression rajat säilyvät.
14.10.2026 / Chat A / vaihe 3: Lvl 0 -kokeilu toteutettu. Neljä layeria ja pokerikuva otettu käyttöön, WASD sekä nuolinäppäimet, kameran vaakavieritys ja vain vaakasuuntainen parallax lisätty. Liikerajat ovat kuvan x 10–90 %, y 60–90 %. Nykyiset hahmot säilyvät. docs/LEVEL0_WORLD.md sisältää lähteet, rajat ja varmennuksen. Chat C:n staging-tiedostoja ei muutettu.
14.10.2026 / Chat A / vaihe 3: Toteutuksen commit eed6ed7. Lopullinen testisarja 55/55; kaksi paikallista selainajoa läpäisevät. Paikallinen peli käynnistetty osoitteeseen http://localhost:3000. Ei pushia tai deployta.
Chat A: käyttäjäpalautteen jälkeen lvl 0:n layerit kohdistettu samaan kokoon, cover-fullscreen, kameran 20–80 % liikkumavara ja hillitty parallax, 52 px yläpalkki ja automaattinen oikean reunan kotivalikko. Varmennettu paikallisessa selaimessa. Chat C:n lähdeassetteja ei muutettu.
Chat A: lvl 0:n väärät luonnoslähteet korvattu approved/level-0/user-final-kansion käyttäjän skaalaamilla loppukuvilla; kaikkien viiden kopion hash tarkistettu. Kotivalikon koko tausta tummennettu ja piilossa näkyy vain tekstittömän taustan reunakaista. Varmennettu selaimessa.
Chat A: käyttäjä hyväksyi LVL_1-handoffin integraation, omistus frontend/world/static-reitit ja testit. Designin lvl 1 kytketään nykyiseen rental-asumistasoon; talouden tai XP:n rajoja ei muuteta. Alpha ja lvl 0:n pokeriankkurit säilyvät. Ei audioa, animaatioita, pushia tai deployta.
Chat A: LVL_1-handoff integroitu rental-asumistasoon. Kuvat kopioitu muuttamattomina hash-varmennuksella. Kävely/world ja pokeriankkurit yhteiset lvl 0:n kanssa. Ikkunan taustat ja kamerareunat katsottu, NPC/private-taustat sekä identtiset pokeriankkurit varmennettu selaimessa; 56/56 testiä läpäisee. Raportti docs/LEVEL1_WORLD.md. Ei animaatioita, audioa, pushia tai deployta.

# Vaihe 4 – aktiivinen työnjako, 14.10.2026

Tämä osio korvaa aiempien vaiheiden aktiiviset vastuut. Tekninen lähtöcommit 5de27c8: palautus, NPC:t ja hyväksytyt lvl 0/1 ympäristöt yhdistetty; 56 testiä läpäisee. C:n aktiivista assetti-worktreetä ei resetöidä tai päivitetä koodihaaraan.

## Chat A – kodin sosiaalinen lobby, palvelin

Työkansio: C:\Users\Teemu\Documents\ChatGPT\CASINO ROYALE
Haara: codex/home-lobby

Tavoite: erottaa maksuton kaverien kotivierailu pokeripöydän buy-inistä. Toteuta lisäominaisuus nykyisten pokerireittien rinnalle. Hahmo voi luoda kodin lobbyn tai liittyä siihen ilman saldo-/velka-/XP-muutosta. Kotiympäristö valitaan hostin hahmosta. Lobbyyn kuuluu host, kutsukoodi ja jäsenlista; yksi kotilobby/hahmo, rajattu jäsenmäärä, hostin siirto ja poistuminen määritellään. Ei vielä maailman liikkeen synkronointia tai kasinoa. Palautuksen ja hahmon poiston vaikutus kotilobbyjäsenyyteen käsitellään. Pöydät ja rahavarausten logiikka toimivat kuten aiemmin.

Omistus: server.mjs, uusi home-lobby.mjs ja mahdolliset home-lobby-*.mjs, test/home-lobby*.test.mjs, docs/HOME_LOBBY.md. Älä muuta B:n world-moduuleja, CSS:ää, kuvia tai audioa. API on uusi /api/home/*-kokonaisuus, hahmo autentikoidaan nykyisellä käyttöavaimella. Kirjaa tarkka sopimus omaan raporttiin ennen frontend-integraatiota. Ei kodin ja pokerin UI-siirtymien rakentamista samanaikaisesti B:n world-työn kanssa.

Valmis kun: saldo ei muutu vierailusta, vieraan ympäristö määräytyy hostista, luvattomat liittymis-/host-toiminnot estetään, jäsenmäärä/yksi jäsenyys/poistuminen/hostin siirto sekä hahmon palautus/poisto testataan, ja nykyinen pokeri läpäisee testit. Tämä on palvelinpohja; kodin lobbyn näkyvä käyttöliittymä on seuraava integraatiovaihe.

## Chat B – kodin liikkumisalueet ja vuorovaikutuspohja

Työkansio: C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE
Haara: codex/world-interactions
Pohja: 5de27c8. Aloita käyttäjän promptista.

Tavoite: lisätä lvl 0/1 kotimaailmoihin datavetoinen este- ja vuorovaikutusmalli. Säilytä maailman 3840x1080, jalkapisteen x 10–90 %, y 60–90 %, kameran 20–80 % liikkumavara, vain vaakaparallax ja hyväksytyt lähdekuvat. Esteet perustuvat jalkapisteen kulkuun lattialla, eivät koko esineen kuvasiluettiin. Valitse varovaiset estealueet teltan/pöydän/tavaroiden ympärille, varmista spawn ja reitti maailman puolten välillä. Tarvittaessa dokumentoi esteiden alustavuus eikä sulje koko käytävää.

Lisää pokeripöydän ja läppärin lähestymisalueet sekä E-toiminnon pohja. Tuota vain paikallinen CustomEvent 'home-interact', detail { target: 'poker' | 'computer', environment: 'bridge' | 'rental' }. Älä kutsu uusia /api/home/*-reittejä tai aloita peliä automaattisesti. Chat A kytkee tapahtuman myöhemmin olemassa oleviin dialogeihin. Saman painalluksen autorepeat ei saa lähettää useita tapahtumia. Avoin dialogi, piilotettu koti, lomakefokus ja fokuskatkos estävät liikkumisen/vuorovaikutuksen. Ei multiplayer-liikesynkronointia.

Omistus: public/home-world.mjs, public/home-world.css (vain vihjeen nykyiseen tyyliin sopiva toiminnallinen muutos), uusi public/world-layout.mjs, test/home-world.test.mjs, test/world-layout*.test.mjs, docs/WORLD_INTERACTIONS.md. Älä muuta shell.js:ää, app.js:ää, character.js:ää, index.html:ää, server.mjs:ää, taloutta tai assetteja. Käytä olemassa olevaa world-controls-elementtiä E-vihjeeseen. Uuden world-layout.mjs-moduulin static-route on Chat A:n lisättävä integraatiossa: kirjaa tarve raporttiin. Selainkokeessa voit käyttää omaa tilapäistä testipalvelinta, joka tarjoaa moduulin, ilman server.mjs-muutosta.

Valmis kun: diagonaaliliike ei kiihdy, iso frame-aika ei läpäise estettä, hahmo ei jää esteeseen, reunat sekä törmäyksen reunaa pitkin liukuminen toimivat ja kotikuvan molemmat puolet ovat saavutettavissa. Vuorovaikutus toimii vain alueella ja oikeassa tilassa. Testaa esteet ja E-toiminnon ehdot, dokumentoi rajat ja tee rajatut commitit. Ei design-uudistusta tai hahmoanimaatiota.

## Chat C – hahmot, grafiikat, animaatiot ja audio

Työkansio: C:\Users\Teemu\.codex\worktrees\visual-audio-assets\CASINO ROYALE
Haara: codex/visual-audio-assets (säilytä nykyinen työ).

Käyttäjä voi jatkaa C:n kanssa hahmodesignia, vaatetus-/hiusosia, ilmeitä, NPC-hahmoja, ympäristöjä, animaatioita, tehosteita ja ääniä haluamassaan järjestyksessä. Ensimmäiseksi voi valita perushahmon. Lue kanoninen DESIGN_ASSET_WORKFLOW.md sekä käyttäjän viimeisimmät päätökset. Yksi assetti kerrallaan esikatsellaan, korjataan ja hyväksytään. Hahmolle sovitaan mittakaava, perspektiivi, läpinäkyvyys ja jalkojen ankkuri; vaatteiden/hiusten osat kohdistetaan yhteiseen runkoon. Animaatioille sovitaan idle/walk/sit ja suuntien tarve ennen ruutujen tekemistä. Still, animaatiobriefi tai äänibriefi ei ole valmis animaatio/ääni.

Omistus: oman worktreen design-staging/ ja docs/DESIGN_ASSETS.md. Älä muuta public/, koodia, taloutta, asetuksia tai aiemmin luovutettuja hyväksyttyjä tiedostoja. Uudet revisiot omilla versionimillä. Luovuta sovittu hyväksytty kokonaisuus handoff-kansiossa PNG/SVG/spritesheet/äänitiedostoineen ja HANDOFF.md-, manifesti- ja hash-tietoineen. Käyttäjän skaalaamat/loppukuvat ovat ensisijaiset: luonnoksia ei toimiteta niiden sijaan. Säilytä alpha. Integraatio tehdään käyttäjän pyynnöstä Chat A:ssa, ei automaattisesti C:n valmistelun aikana.

## Yhteiset rajat

Jokainen lukee aktiivisen Vaihe 4:n kanonisesta pääkansiosta. B:n tekninen työkopio päivitetään yhteiseen pohjaan; C:n aktiiviset assetit säilytetään ennallaan. Ei samanaikaisia muutoksia toisen omistamiin tiedostoihin. Omat raportit sisältävät commitit, testit, rajat ja integraatiotarpeet. Chat A yhdistää tekniset osuudet vasta niiden valmistuttua ja lisää tarvittavat static-reitit. Ei pushia tai deployta. Ei uusia kasinopelejä, progression muutoksia tai assettien käyttöönottoa tämän teknisen työn sivutuotteena.
Chat A / vaihe 4: Kotilobbyn backend valmis. Maksuton jäsenyys, kutsukoodit, hostin siirto, yksi jäsenyys/hahmo, kapasiteetti ja idle-siivous toteutettu. Hahmon palautus/poisto käsittelevät kotijäsenyyden; pokerin varaukset ja raha säilyvät erillisinä. API-sopimus ja rajat docs/HOME_LOBBY.md. Kaikki 63 testiä läpäisevät. Ei B:n tiedostojen muutoksia, assetteja, pushia tai deployta.
Chat A / vaihe 4: Toteutuksen commit 37c2125 haarassa codex/home-lobby. Oma palvelinosuus valmis seuraavaan integraatioon, kun B valmistuu.

# Vaihe 5 – aktiivinen työnjako

B:n vaihe 4 (a2ec1a9, 825ba18) yhdistetty Chat A:n kotilobbyyn. /world-layout.mjs-static-reitti lisätty. Yhteinen tekninen pohja: 2c1ae4c.

Chat A jatkaa kotilobbyn käyttöliittymää: maksuton luonti/liittyminen, jäsenlista, kutsulinkki, hostin siirto, poistuminen, pollaus ja hostin kotiympäristön näyttäminen. Omistus public/shell.js, public/character.js, public/app.js, public/index.html, uusi public/home-social.mjs, toiminnallinen CSS ja server.mjs-static-reitit, test/home-social*.test.mjs sekä docs/HOME_SOCIAL_UI.md. B:n world-layout/home-world-moduuleja ei muokata samanaikaisesti; mahdollinen world-ympäristön päivitys tehdään niiden olemassa olevalla rajapinnalla. Pokerin E avaa nykyisen NPC-dialogin; läppärin E näyttää nykyisen Coming soon -dialogin ilman uutta kasinopeliä. Kotilobby ja vanha pokerilobby ovat erilliset toiminnot tässä vaiheessa; yhteinen kotipokeripöytä tehdään seuraavaksi.

## Chat B: hahmojen palvelinpuolen liikesynkronoinnin pohja

Kansio C:\Users\Teemu\.codex\worktrees\npc-gameplay\CASINO ROYALE
Haara codex/home-presence, pohja 2c1ae4c.

Toteuta erillinen home-presence.mjs, test/home-presence*.test.mjs ja docs/HOME_PRESENCE.md. Älä muuta server.mjs:ää, home-lobby.mjs:ää, public/-tiedostoja tai taloutta. Integrointi Chat A:ssa myöhemmin. Voi käyttää public/world-layout.mjs:n puhtaita geometriafunktioita read-onlyna.

Mallinna yhden kotilobbyn jäsenten spawn, sijainti, facing ja revision. Kotilobbyn jäsenyys annetaan luotetulla server-adapterin callbackilla; client ei saa luoda jäseniä tai valita home-ympäristöä. Hyväksy vain äärelliset koordinaatit, oikea jäsenyys, sallittu liikealue ja nopeusraja palvelimen kellosta. Käytä samaa este-/jalkapistemallia; älä hyväksy teleportausta tai seinän läpi kulkevaa siirtymää. Hylätty liike ei muuta tilaa. Viestien sequence-id estää vanhat/toistetut siirrot. Älä käytä clientin kellonaikaa nopeusrajan totuutena. Jäsenen poistuessa siivoa tila, rajaa jäsenmäärä nykyiseen kapasiteettiin. Snapshot ei paljasta käyttö-/palautusavaimia tai taloutta. Ei uusia verkkoreittejä, SSE:tä tai frontend-hahmojen renderöintiä tässä osuudessa.

Raportoi tarkka adapterisopimus, parametrit ja rajoitukset. Testaa väärä jäsenyys, luvaton ympäristön vaihto, NaN/Infinity, liikerajat, esteen läpäisy, nopeusraja, vanha sequence, eri pelaajien riippumattomuus, poisto ja ajan eteneminen. Koko npm test läpäisee. Tee rajatut commitit. Ei mergeä, pushia tai deployta.

Chat C jatkaa hahmodesignia ja muita assetteja ennallaan omassa worktreessään. Ei assettien automaattista integraatiota.
Chat A / vaihe 5: Kotilobbyn käyttöliittymä, kotikutsulinkit, jäsenlista, hostin siirto ja poistuminen sekä E-dialogikytkennät valmiit. B:n world-layout static-route lisätty. 78/78 testiä ja kahden erillisen testiselaimen maksuttoman vierailun koe läpäisevät. Raportti docs/HOME_SOCIAL_UI.md. B:n codex/home-presence-työhaara on valmis pohjasta 2c1ae4c; C:n assettityö ennallaan.
