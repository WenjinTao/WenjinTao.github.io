---
layout: custom
title: "Gallery"
---

{% include navigation.html %}

<section id="gallery">
  <h1>Gallery</h1>
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
            {% if parts[3] == group and (ext == '.jpg' or ext == '.jpeg' or ext == '.png' or ext == '.gif') %}
              <div class="gallery-item">
                <a href="{{ image.path }}" target="_blank">
                  <img src="{{ image.path }}" alt="Gallery image">
                </a>
              </div>
            {% endif %}
          {% endfor %}
        </div>
      </div>
    {% endfor %}
  </div>
</section>

<style>
#gallery {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
#gallery h1 {
  font-size: 2.2rem;
  margin-bottom: 2rem;
  color: var(--dark-text);
  border-bottom: 2px solid var(--accent-color);
  padding-bottom: 0.5rem;
}
.gallery-group {
  margin-bottom: 2.5rem;
}
.gallery-group h2 {
  font-size: 1.3rem;
  color: var(--secondary-color);
  margin-bottom: 1.2rem;
  border-left: 4px solid var(--accent-color);
  padding-left: 0.7rem;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}
.gallery-item {
  background: #fff;
  border-radius: var(--border-radius);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}
.gallery-item:hover {
  transform: translateY(-7px) scale(1.03);
  box-shadow: 0 10px 24px rgba(0,0,0,0.13);
}
.gallery-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  filter: grayscale(10%);
  transition: filter 0.3s, opacity 0.3s;
  opacity: 0.95;
}
.gallery-item img:hover {
  filter: grayscale(0%);
  opacity: 1;
}
</style>
