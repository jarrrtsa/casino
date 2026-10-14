# Lvl 1 – hyväksyttyjen tausta-assettien integraatio

Lähde: C:\Users\Teemu\.codex\worktrees\visual-audio-assets\CASINO ROYALE\design-staging\handoff\LVL_1. HANDOFF.md luettu. Käyttäjän toimittamat viisi PNG:tä kopioitiin muuttamattomina public/assets/level-1/-kansioon. Kaikkien kopioiden SHA-256 vastaa lähdetiedostoa.

layer1 → background-far, layer2 → background-close, layer3 → focus, layer4 → foreground, LVL_1_poker → poker. Layerit 3840 × 1080 RGBA, pokeri 1920 × 1080. Alpha säilyy; kuvien läpinäkyviä osia ei täytetty tai editoitu. Canvas-pohja peittää taustan mahdolliset läpinäkyvät reunat, mutta ikkunan takana far-taso on peittävä.

Designin lvl 1 käyttää nykyistä rental-asumistasoa, joka avautuu nykyisillä level 2 / $1000 nettovarallisuuden ehdoilla. Taloutta, XP:tä tai progression rajoja ei muutettu. Home-world on nyt yhteinen bridge- ja rental-ympäristöille: samat liikerajat, sivukameran liikkumavara ja hillityt parallax-kertoimet .92 / .98 / 1 / 1.03. Kaikki kerrokset jakavat lähtökohdistuksen ja renderöintikoon. Valmis lähdecanvas sijoittaa ulkotalot ikkunan taakse ilman ylimääräistä offsetia tai skaalausta. W/S ei vieritä kameraa.

Pokerin tausta vaihtuu /assets/level-1/poker.png-kuvaan sekä NPC-pelissä että rental-kodista hostatussa private lobbyssa. Lvl 0 ja lvl 1 jakavat saman kuvasovituksen ja CSS-ankkurit. Korttien, potin, pelaajien tai oman käden levelkohtaisia siirtoja ei lisätty. Myös vanha jakajakuva on piilossa kummassakin kuten lvl 0:ssa.

Varmennus: kaikki 56 testiä läpäisevät. Static-testit tarkistavat kummankin ympäristön kaikkien PNG:iden tarjoamisen, mitat ja layerien RGBA-värityypin. Oikeassa selaimessa käytettiin erillistä testihahmoa ja tilapäistä SQLitea: oikea/keski/vasen kameranäkymä tarkistettiin, ikkunan peitto ja ulkotasojen kohdistus nähtiin esikatseluissa. Lvl 0:n ja lvl 1:n pokerin table-center-, seat- ja your-hand-elementtien bounding boxit olivat identtiset samalla viewportilla. NPC- ja private lobby -polut latasivat lvl 1:n pokeritaustan. JavaScript-virheitä ei ollut. Testihahmoa ei lisätty käyttäjän tietokantaan.

Nykyiset hahmot ja suorakulmainen kävelyalue säilyvät. Esinekohtainen törmäys, animaatiot ja audio ovat myöhempää työtä. Muut asumistasot käyttävät entisiä taustoja. Ei pushia tai deployta. Paikallinen palvelin käynnistetään uudelleen uusien static-reittien käyttöönottoa varten.
