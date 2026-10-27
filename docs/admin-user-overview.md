# Benutzerverwaltung

Die bestehende Edge Function `popgo-admin` bietet `GET /members` und `POST /member` mit den Statuswerten `active`, `rejected` und `suspended`. Die Endpunkte prüfen aktive Administratorrechte serverseitig.

Geplant: Vollständige Übersicht aller Benutzer, Suche, Statusfilter, Registrierungsdatum, Aktivierung und Sperre; Administrator-Konten bleiben vor Änderungen geschützt. Die bestehende Schnittstelle listet derzeit nur Nicht-Administratoren (maximal 100).

Die Benutzeroberfläche ist noch nicht implementiert. Vor Freischaltung muss die Auflistung inklusive Administratoren, Pagination und Sicherheitsprüfung fertiggestellt werden.
