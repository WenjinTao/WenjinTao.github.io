---
layout: custom
title: "Gallery"
description: "Image gallery for selected work and project photography."
body_class: gallery-page
custom_css:
  - /assets/css/pages/gallery.css
---

{% include navigation.html %}

<section id="gallery">
  <h1 class="page-title">Gallery</h1>
  <div class="gallery-groups">
    {% assign gallery_images = site.static_files | where_exp: "file", "file.path contains '/assets/gallery/'" %}
    {% assign groups = "" | split: "|" %}
    {% for image in gallery_images %}
      {% assign parts = image.path | split: '/' %}
      {% assign group = parts[3] %}
      {% unless groups contains group %}
        {% assign groups = groups | push: group %}
      {% endunless %}
    {% endfor %}
    {% for group in groups %}
      <div class="gallery-group">
        <h2>{{ group | capitalize }}</h2>
        <div class="gallery-grid">
          {% for image in gallery_images %}
            {% assign parts = image.path | split: '/' %}
            {% assign ext = image.extname | downcase %}
            {% if parts[3] == group %}
              {% if ext == '.jpg' or ext == '.jpeg' or ext == '.png' or ext == '.gif' %}
                <div class="gallery-item surface-card">
                  <a href="{{ image.path }}" target="_blank" rel="noopener noreferrer">
                    <img src="{{ image.path }}" alt="Gallery image">
                  </a>
                </div>
              {% endif %}
            {% endif %}
          {% endfor %}
        </div>
      </div>
    {% endfor %}
  </div>
</section>
