# Kotilobbyn käyttöliittymä – vaihe 5 / Chat A

B:n vaihe 4 commitit a2ec1a9 ja 825ba18 katselmoitiin ja yhdistettiin. Puuttuva world-layout.mjs-static-reitti lisättiin commitissa 2c1ae4c. Yhteinen lähtötila läpäisi 75 testiä (B:n 68 + A:n 7 kotilobbytestiä).

Home lobby -kotivalinta avaa erillisen kotivierailudialogin. Host a home lobby luo maksuttoman vierailun; Join home liittyy kotikoodilla. Dialogi näyttää jäsenet, hostin, kutsukoodin, kutsulinkin kopioinnin/manuaalisen varatavan, hostin siirron ja poistumisen. /?home=CODE-linkki avaa dialogin ja täyttää kotikoodin; hahmo luodaan tai palautetaan normaalisti. Linkki ei liity automaattisesti tai veloita buy-iniä.

home-social.mjs käyttää nykyistä hahmon identity-clientia. Vanhat identity-vastaukset hylätään, ja jäsenyyden sukupolvitunniste estää vanhaa pollia korvaamasta uutta lobbyä. Viimeisin päällekkäinen poll voittaa. Identity-vaihto tyhjentää kotilobbyn, epäonnistunut mutaatio säilyttää jäsenyyden. Palautuksen ja poiston palvelinlogiikka säilyy aiemman kotilobby-sopimuksen mukaisena.

Jäsenet päivittyvät 15 sekunnin välein ja dialogin avatessa. Piilotetussa dokumentissa ei pollata. Vierailun aikana maailman ympäristö valitaan kotilobbysta, pelaajan oma saldo/XP säilyvät. Poistuminen palauttaa oman ympäristön. Muiden jäsenten varoja tai avaimia ei näytetä. Muiden liikkuvia hahmoja ei renderöidä vielä; Chat B tekee erillistä liikesynkronoinnin palvelinmallia.

Multiplayer-pokeri säilyy erillisenä toimintona omalla koodillaan ja buy-inillä. Kotiporukan yhteiseen pöytään siirtyminen tulee myöhemmin; dialogi kertoo erosta. E-pokeri avaa nykyisen singleplayer-buy-in-dialogin ja E-computer Coming soon -näkymän. Uutta kasinopeliä ei tehty.

Omistus: shell.js, character.js (homeRequest), app.js (home-kutsulinkki), index.html, home-social.mjs, server.mjs (static-route), test/home-social.test.mjs ja raportti. B:n world-moduuleja ei muutettu yhdistämisen jälkeen. C:n assetteja ei muutettu.

Varmennus: 78/78 testiä läpäisee. Kolme uutta client-testiä kattavat vanhan pollin/identityn, uudemman pollin, virheiden vaikutuksen jäsenyyteen ja reitit. Kahdella erillisellä selaimella sekä muistissa olevalla testitietokannalla tarkistettiin luonti, liittyminen, jäsenlista, linkki, hostin siirto ja poistuminen. Molempien saldo pysyi $1000:ssa. Selainkokeessa löytynyt status-elementin poistuminen korjattiin poistamalla siltä tilapäisten dialog-error-elementtien luokka; lopullinen ajokerta oli virheetön.

Ei pushia tai deployta. Paikallinen palvelin käynnistetään uudelleen uusien moduulireittien vuoksi. E-dialogikytkennän viimeinen selainkokeilu kirjataan alle.
Lopullinen selainajo varmisti myös kuplivien home-interact-tapahtumien pokeri- ja computer-dialogit ilman JavaScript-virheitä.
