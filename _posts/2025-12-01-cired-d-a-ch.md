---
title: Optimal Power Quality Monitor Placement - CIRED D-A-CH 2025
date: 2025-11-29 12:00:00 +/-9999
categories: [research, conferences]
tags: [conference, power-quality, measurement-placement, optimization, graph-embedding]
permalink: /posts/cired-d-a-ch-2025/
---
## Anleitung
1. Klicke auf einen Knoten, um ein Messgerät zu platzieren
2. Nachdem alle Messgeräte platziert wurden, wird das erste Messgerät beim nächsten Klick umplatziert
3. Lese den Score auf der Skala und den persönlichen High-Score darunter ab.


<iframe src="/assets/slides/cired-d-a-ch-2025/pq-placement.html" width="100%" height="1000px"></iframe>

## Legende
- Platzierte Messgeräte werden mit einem Stern dargestellt
- **○** Knoten in Form von Kreisen sind auf der Niederspannungsseite
- **□** Knoten in Form von Quadraten sind auf der Mittelspannungsseite
- Rote Linien stellen Transformatoren dar


## Bedeutung
**Observability:** Die Beobachtbarkeit (Observability) gibt den Anteil der erkannten Spannungsqualitätprobleme an (0,85 bedeutet 85% der Fehlerausbreitung wurden durch die platzierten Messgeräte erkannt).

**Persönlicher High-Score:** Der beste bisher erreichte Score für das gewählte Netz.

**Deckkraft:** Die Deckkraft der einzelnen Knoten zeigt den Anteil der erkannten Spannungsqualitätsprobleme für den Fall an, dass an diesem Knoten ein Fehler (z.B. eine Transiente oder ein Spannungseinbruch) auftritt.


## Credits
This visualisation was created by Ahmad Bkira and Markus de Koster.
For full information on the algorithm, check out the CIRED Post containing a paper and poster [here](/posts/cired-2025/).
