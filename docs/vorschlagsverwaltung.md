# Pop & Go – Intelligente Vorschlagserfassung (Testbetrieb)

Stand: 26.10.2026 · Entwicklungsstand, keine Produktivfreigabe.

## Bestandteile

- `vorschlagen.html`: iPhone-Eingabe, vorhandene iPhone-Diktierfunktion über Tastatur, Anmeldung/Registrierung, Suchtreffer und Administrator-Bearbeitung.
- `suggestions.js`: Supabase Auth, Einreichung, eigener Status, private Admin-Prüfung und Mitgliederfreigabe.
- `popgo-place-search`: Supabase Edge Function. Nur für angemeldete und freigegebene Mitglieder. Explizite Nominatim-Suchabfrage, bis fünf Treffer, serverseitige gemeinsame Begrenzung auf maximal eine Anfrage in zwei Sekunden und 120 externe Anfragen am Tag. Ergebnisse werden sieben Tage gecacht.
- `popgo-admin`: Supabase Edge Function. Prüft Auth-Token und den Datenbankstatus des Administrators. Bearbeitet Freigaben/Ablehnungen atomar über `admin_review_suggestion` und verwaltet Mitglieder.
- `public.suggestions`: Eingereichte Quelldaten bleiben unverändert; Änderungen werden in eigenen `edited_*`-Feldern aufbewahrt. Audit-Einträge bei Freigabe und Ablehnung.

## Grenzen

1. Es existiert noch kein Benutzerkonto / kein Administrator im Projekt. Daher noch **kein erfolgreicher E2E-Test** des vollständigen Freigabeablaufs.
2. Bei der Ortsrecherche können Telefonnummer, E-Mail oder Website fehlen. Niemals Vollständigkeit behaupten. Der Administrator ergänzt vor der Freigabe.
3. Der öffentliche OSM-Nominatim-Dienst ist kapazitätsbegrenzt und erlaubt weder automatische Vorschlagssuche bei jeder Eingabe noch systematische Massenabfragen. Quelle: https://operations.osmfoundation.org/policies/nominatim/
4. Die bestehenden 43 Freizeitideen bleiben unverändert. Vorschläge werden erst nach Administratorfreigabe öffentlich.
5. Keine Änderungen an der bestehenden öffentlichen Google-Apps-Script-App.

## Ersteinrichtung / Test

1. Mit einem eigenen E-Mail-Konto auf https://5dbp6h96ch-droid.github.io/pop-and-go/vorschlagen.html registrieren. Passwort nicht im Chat teilen. E-Mail gegebenenfalls bestätigen.
2. Nach Registrierung muss **genau dieses verifizierte Konto** einmalig durch den Betreiber als aktiver Administrator markiert werden. Nicht automatisch irgendein neu registriertes Konto hochstufen.
3. Separates Testkonto registrieren. Administrator gibt es frei.
4. Testkonto sucht Ort, wählt Treffer aus, ergänzt und reicht Vorschlag ein.
5. Administrator sieht die Quelldaten, ergänzt und gibt frei. Zweite Freigabe muss verweigert werden. Teste auch Ablehnung und Duplikate.
6. Prüfen: öffentlicher Ort erscheint exakt einmal; Audit wird geschrieben; keine fremden Vorschläge bei Nichtadministratoren sichtbar.

## Sicherheitsprüfung

Stand 26.10.2026: keine kritischen oder Warn-Befunde des Supabase Security Advisors. Drei rein informative Hinweise betreffen Tabellen ohne öffentliche RLS-Policies (Audit sowie Rate-Limit und Cache), absichtlich nur für serverseitigen Zugriff. Der temporäre direkte Administrator-RPC wurde für die Rolle `authenticated` deaktiviert; die neue Freigabefunktion ist nur `service_role` zugänglich.
