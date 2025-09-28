---
layout: page
title: Research
icon: fas fa-graduation-cap
order: 3
---
# Publications
{% assign pubs = site.data.publications | sort: "date_start" | reverse %}
{% assign last_year = "" %}

{% for p in pubs %}
  {% assign y = p.date_start | date: "%Y" %}

  {% if y != last_year %}
### {{ y }}
  {% assign last_year = y %}
  {% endif %}

  {% comment %} icon by type {% endcomment %}
  {% case p.type %}
    {% when 'conference' %}{% assign _icon='fa-solid fa-person-chalkboard' %}
    {% when 'journal'    %}{% assign _icon='fas fa-book-open' %}
    {% when 'thesis'     %}{% assign _icon='fas fa-graduation-cap' %}
    {% else              %}{% assign _icon='fas fa-shapes' %}
  {% endcase %}

<article class="card my-3 shadow-sm">
  <div class="card-body">
    <div class="row align-items-start">
      <!-- LEFT: icon only -->
      <div class="col-md-1 d-flex align-items-center mb-2 mb-md-0">
        <i class="{{ _icon }} fa-2x mr-2" aria-hidden="true"></i>
      </div>
      <!-- MIDDLE: core content -->
      <div class="col-md-8">
        <h3 class="h5 mb-1">{{ p.title }}</h3>
        <div class="small mb-1">{{ p.authors | join: ", " }}</div>
        <div class="small d-flex align-items-center flex-wrap">
          <div class="d-flex align-items-center flex-wrap">
            {% if p.venue %}
              <span class="mr-3"><i class="fas fa-landmark" aria-hidden="true"></i> {{ p.venue }} </span> 
            {% endif %}
            {% if p.date_start and p.date_end %}
              <span>
                <i class="fas fa-calendar-alt m-lg-1" aria-hidden="true"></i> 
                {{ p.date_start | date: "%b %-d, %Y" }} – {{ p.date_end | date: "%b %-d, %Y" }}
              </span>
            {% elsif p.date_start %}
              <span>
                <i class="fas fa-calendar-alt m-lg-1" aria-hidden="true"></i> 
                {{ p.date_start | date: "%b %-d, %Y" }}
              </span>
            {% endif %}
          </div>
        </div>
        {% if p.abstract %}
          <details class="mt-2"><summary>Abstract</summary>{{ p.abstract }}</details>
        {% endif %}
      </div>
      <!-- RIGHT: reserved column (thumb if present) + Open project -->
      <div class="col-md-3">
        {% if p.thumb %}
          {% if p.internal_url %}
            <a href="{{ p.internal_url }}" class="d-block mb-2" aria-label="Open project page">
              <img src="{{ p.thumb }}" class="img-fluid rounded" alt="Preview: {{ p.title }}">
            </a>
          {% else %}
            <img src="{{ p.thumb }}" class="img-fluid rounded mb-2" alt="Preview: {{ p.title }}">
          {% endif %}
        {% else %}
          <div class="mb-2"></div>
        {% endif %}
        {% if p.internal_url %}
          <a class="btn btn-sm btn-outline-dark btn-block" href="{{ p.internal_url }}">
            <i class="fas fa-file-alt mr-1" aria-hidden="true"></i> Open project
          </a>
        {% endif %}
      </div>
    </div>
    <!-- LINKS ROW: non-external assets -->
    <div class="ml-auto d-flex align-items-center">
      {% if p.doi %}
        <a class="btn btn-sm btn-outline-secondary mr-2 mb-2" href="https://doi.org/{{ p.doi }}" target="_blank" rel="noopener">
          <i class="fa-solid fa-circle-info mr-1" aria-hidden="true"></i> DOI
        </a>
      {% endif %}
      {% if p.url %}
        <a class="btn btn-sm btn-outline-secondary mr-2 mb-2" href="{{ p.url }}" target="_blank" rel="noopener">
          <i class="fas fa-external-link-alt mr-1" aria-hidden="true"></i> Publisher
        </a>
      {% endif %}
      {% if p.pdf %}
        <a class="btn btn-sm btn-outline-secondary mr-2 mb-2" href="{{ p.pdf }}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf mr-1" aria-hidden="true"></i> PDF
        </a>
      {% endif %}
      {% if p.code %}
        <a class="btn btn-sm btn-outline-secondary mr-2 mb-2" href="{{ p.code }}" target="_blank" rel="noopener">
          <i class="fas fa-code mr-1" aria-hidden="true"></i> Code
        </a>
      {% endif %}
      {% if p.data %}
        <a class="btn btn-sm btn-outline-secondary mr-2 mb-2" href="{{ p.data }}" target="_blank" rel="noopener">
          <i class="fas fa-database mr-1" aria-hidden="true"></i> Data
        </a>
      {% endif %}
      {% if p.slides %}
        <a class="btn btn-sm btn-outline-secondary mr-2 mb-2" href="{{ p.slides }}" target="_blank" rel="noopener">
          <i class="fas fa-file-powerpoint mr-1" aria-hidden="true"></i> Slides
        </a>
      {% endif %}
    </div>
  </div>
</article>

{% endfor %}
