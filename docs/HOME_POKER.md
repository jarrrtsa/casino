# Yhteinen kotipokeri – Chat A, vaihe 5 jatko

Kotivierailu pysyy maksuttomana. /api/home/poker (POST, {buyIn}, nykyinen hahmon käyttöavain) avaa tai liittyy kotilobbyn yhteiseen pokeripöytään. Ensimmäisen pöydän avaa vain kotilobbyn host; muut saavat 409:n kunnes host avaa pöydän. Kukin jäsen valitsee oman buy-inin, nykyiset $100–1000 rajat ja yksi pokeripöytä/hahmo säilyvät. Vierailupaikan environment määrää pöydän taustan.

Pöytä sidotaan kotilobbyn uuteen palvelimen satunnaiseen UUID-tunnisteeseen, ei pelkkään lyhyeen kutsukoodiin. Home-snapshotin id on uusi lisäkenttä; muut jäsenyysrajapinnat säilyvät. /api/join ei päästä ulkopuolista sidottuun pöytään ilman saman kotilobbyn jäsenyyttä. Room-snapshotin homeCode kertoo jaettavan kotikutsun; pokeripöydän kutsulinkki ohjaa tässä tilanteessa ?home=CODE-liittymiseen. Tavalliset yksityispöydät jatkavat ?room=CODE-linkillä.

Kotivalikon Shared poker buy-in / Enter shared poker table veloittaa vasta pelaajan painalluksesta. E-pokerivihje avaa kotilobbydialogin, jos pelaaja on kotijäsen, muuten nykyisen NPC-dialogin. Pöydästä poistuminen palauttaa merkit normaalisti ja säilyttää kotijäsenyyden. Tyhjä pöytä poistaa sidonnan; myöhemmin nykyinen kotihost voi avata uuden pöydän. Kotihostin ja pokeripöydän vetäjän tehtävät ovat erillisiä: avattua pokeripöytää koskevat nykyiset host-/readiness-säännöt.

Kotijäsenyyden poistuminen ei sulje käynnissä olevan jaon pokeripaikkaa tai siirrä merkkejä; vanha pokeri-istunto saa päättää jaon normaaleilla säännöillä. Uusi liittyminen vaatii kotijäsenyyden. Ei uusia pelisääntöjä, talouden rajoja tai NPC-strategioita.

Varmennus: koko testisarja 79/79 läpäisee. Uusi integraatiotesti varmentaa vieraan odotuksen, virheellisen buy-inin ilman veloitusta, yhteisen pöydän, eri buy-init, ulkopuolisen eston, kaksoisliittymisen eston, oikean pokerikäden, merkkien kokonaismäärän ja kotiutuksen sekä uuden pöydän luonnin vanhan tyhjennyttyä. Oikeassa selaimessa kahden erillisen hahmon koe varmisti hostin pöydänavauksen, vieraan odotuksen ja liittymisen samalla koodilla, oman buy-inin sekä readinessin ja jaon aloituksen. JavaScript-virheitä ei ollut. Testit käyttivät vain muistissa olevia tietokantoja ja erillisiä portteja.

B:n home-presence-malli pysyy erillisessä worktreessä. Server/home-lobby ja frontend ovat tässä A:n omistamia; B:n tiedostoja ja C:n assetteja ei muutettu. Ei pushia tai deployta.
