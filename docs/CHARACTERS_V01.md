# Modulaariset hahmot v01 – integraatio

Lähteet: Chat C:n CHARACTERS-modular-v01 ja CHARACTERS-seated-v01, design-staging/handoff. Käyttäjä hyväksyi molempien käyttöönoton 15.10.2026. Aiempia rasteriluonnoksia ei käytetä.

## Piirto ja lähteet

public/assets/characters-v01/{standing,seated}/ sisältää muuttamattomat parts-data.json-, HANDOFF.md-, manifest.json- ja hashes.json-kopiot. Kopioiden SHA256 tarkistettiin lähteitä vasten. Browserin character-*-data.mjs-tiedostot ovat näiden JSON-tietojen suoria moduulivientejä. Ei uusia generoituja grafiikoita.

character-renderer.mjs kokoaa vain hyväksytyt SVG-fragmentit. Vartalon leveys sovittaa vartalon, alaosan, yläosan sekä body-asusteet. Pään kerroin sovittaa kasvot, hiukset/hatut ja head-asusteet. Skaalaus x50:n ympäri, Y ei muutu. Järjestys: body → bottom → face/neck → top → seated hands → head → accessory. ViewBox 100×200, alpha säilyy. Renderer ei kokoa käyttäjän antamaa SVG-tekstiä.

Kotimaailman jalkapiste y195 kohdistuu nykyiseen liikkumisankkuriin; hitbox ja nopeus ennallaan. Omat hahmot ja kotivieraat käyttävät seisomapakettia, pokerihahmot istumapakettia. Istumisen y120-ankkuri vastaa 60 % canvasin korkeudesta; sen alapuoli rajataan pöydän peittoon. Tuoli-/pelaajapaikat ovat yhteiset pokeriympäristöille; korttipaikkoja ei muutettu. Edestä nähty still on käytössä myös sivupaikoilla; sivu-/takakuvia ja kävelyanimaatioita ei ole.

## Omistus ja progressio

Ulkoasu {body,top,bottom,head,accessory} tallentuu palvelimen hahmotietoihin, palautuu talteen ja välittyy pokeri- sekä kotilobbyn julkisessa appearance-kentässä. Viisi vartalopohjaa ovat valittavissa ilman vaateostoa. Oletus top1/bottom1/head1/accessory0 toimii heti.

cosmeticCatalog.level on XP-avausraja, ownedParts erillinen omistuslista. Palvelin tarkistaa avausrajan, rahat ja omistuksen transaktiossa; idempotentti toiminto ei veloita uudelleen. Uusien lisäosien rajat/hinnat ovat null, joten niitä ei voi ostaa tai pukea vielä. Editorissa ne näkyvät Coming later. Tarkat rajat/hinnat sovitaan käyttäjän kanssa myöhemmin.

Vanhojen hahmojen ostokset säilyvät: cap → head4, beanie → head5, coat → top5. Vanhan API:n ostoehdot säilyvät yhteensopivuuden vuoksi; uusi editori ei esittele vanhoja kokonaisasuja. Omistetut vaihtoehdot eivät maksa uudelleen. NPC-kokoonpanot eivät käytä pelaajan ostorajoituksia; samat 3750 yhdistelmää ovat piirrettävissä molemmissa asennoissa.

## Varmennus

Kaikki 3750 valintaa kummassakin asennossa (7500 piirtoa) tarkistetaan automaattisesti: osat, äärelliset sovitukset ja kerrosjärjestys, mukaan lukien istuvan hahmon kädet. Taloustesti tarkistaa oletukset, vartalon tallennuksen, idempotenssin, pending-ostojen eston, väärät tunnisteet ja vanhan ostoksen säilymisen. Hahmon luontia koskeva UI-testi päivitetty modulaariselle valinnalle.

Paikallisessa selaimessa tarkistettu hahmoeditori, kaikki viisi valikkoryhmää, vanhan lippiksen säilyminen ja seisomahahmo kotimaailmassa. Erillisessä muistissa toimivassa testipelissä tarkistettu vartalopohjan tallennus, kävely pöytään sekä NPC-istumahahmot taustan tuoleissa/pöydän peitossa. Kaikkia yhdistelmiä ei ole visuaalisesti tarkistettu kaikissa istumapaikoissa.

Ei pushia tai deployta. Ei animaatioita, uusia kuvakulmia tai audioa.
`n## Update 16 October 2026`nThe pending-price section above is superseded: all modular items now have initial level requirements (1–5) and prices ($50–$350). English names are maintained in appearance.mjs without altering the approved source SVG data. XP eligibility remains separate from ownership, and the editor shows the total cost before purchase. Existing ownership remains valid.
