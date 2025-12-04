---
title: Optimal Power Quality Monitor Placement – CIRED D-A-CH 2025, Munich
date: 2025-12-01 08:00:00 +/-9999
categories: [research, conferences]
tags: [conference, power-quality, measurement-placement, optimization, graph-embedding]
image: 
  path: /assets/images/cired-dach.jpg
  alt: Presenting at CIRED D-A-CH 2025 conference, photograph by Patrick Mack
permalink: /posts/cired-d-a-ch-2025/
---
On December 1st and 2nd, 2025, the CIRED D-A-CH conference took place in Munich, Germany.
For this purpose, I created a tool that visualizes the algorithm developed in the CIRED 2025 main conference paper on optimal placement of power quality monitors in distribution grids, available [here](/posts/cired-2025/).

The tool and explanation below are in German, as the CIRED D-A-CH conference is held in German.

## Anleitung
1. Klicke auf einen Knoten, um ein Messgerät zu platzieren
2. Nachdem alle Messgeräte platziert wurden, wird das erste Messgerät beim nächsten Klick umplatziert
3. Lese den Score auf der Skala und den persönlichen High-Score darunter ab.

<script src="{{ '/assets/js/external-embed-consent.js' | relative_url }}" defer></script>
{% include external_embed.html
     url="/assets/slides/cired-d-a-ch-2025/pq-placement.html"
     title="Slides"
     ratio="115%"
%}

## Legende
- Platzierte Messgeräte werden mit einem Stern dargestellt
- **○** Knoten in Form von Kreisen sind auf der Niederspannungsseite
- **□** Knoten in Form von Quadraten sind auf der Mittelspannungsseite
- Rote Linien stellen Transformatoren dar


## Bedeutung
**Observability:** Die Beobachtbarkeit (Observability) gibt den Anteil der erkannten Spannungsqualitätprobleme an (0,85 bedeutet 85% der Fehlerausbreitung wurden durch die platzierten Messgeräte erkannt).

**Deckkraft:** Die Deckkraft der einzelnen Knoten zeigt den Anteil der erkannten Spannungsqualitätsprobleme für den Fall an, dass an diesem Knoten ein Fehler (z.B. eine Transiente oder ein Spannungseinbruch) auftritt.


## Credits
Diese Visualisierung wurde von Ahmad Bkira und Markus de Koster erstellt.
Für weitere Informationen zum Algorithmus, siehe den CIRED-Beitrag mit einem Paper und Poster [hier](/posts/cired-2025/).
