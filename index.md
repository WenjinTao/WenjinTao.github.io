---
layout: custom
title: "Home"
description: "Wenjin Tao works on factory software, robotics, and applied AI."
body_class: home-page
custom_css:
  - /assets/css/pages/home.css
---

{% include navigation.html %}

<section class="home-hero surface-card">
  <p class="section-kicker">Factory Software, Robotics, and Applied AI</p>
  <h1>Hi, I'm Wenjin Tao.</h1>
  <p class="home-hero-subtitle">I work on factory software, robotics, and applied AI.</p>
  <p class="home-hero-summary">
    This site is mostly a place to collect a few projects, papers, and notes from work that
    sits between product strategy, systems integration, and intelligent manufacturing.
  </p>
  <div class="home-social-links">
    <a href="https://www.linkedin.com/in/wenjin-tao/" target="_blank" rel="noopener noreferrer">
      <i class="fab fa-linkedin"></i> LinkedIn
    </a>
    <a href="https://github.com/WenjinTao" target="_blank" rel="noopener noreferrer">
      <i class="fab fa-github"></i> GitHub
    </a>
    <a href="https://scholar.google.com/citations?user=jIQocKAAAAAJ&hl=en" target="_blank" rel="noopener noreferrer">
      <i class="fas fa-graduation-cap"></i> Google Scholar
    </a>
  </div>
</section>

<section class="page-section">
  <header class="section-header">
    <p class="section-kicker">A Few Projects</p>
    <h2>Some work I still find useful to point to</h2>
  </header>
  <div class="home-case-grid">
    <a class="home-case-card-link" href="/projects#field-robotics">
      <article class="home-case-card surface-card">
        <div class="home-case-media">
          <img src="/assets/img/robotics_10.jpg" alt="Field robotics platform">
        </div>
        <h3>Field Robotics</h3>
        <p>A modular self-driving platform for outdoor work with swappable tools.</p>
      </article>
    </a>

    <a class="home-case-card-link" href="/projects#industrial-vision-inspection">
      <article class="home-case-card surface-card">
        <div class="home-case-media">
          <img src="/assets/img/machine_vision_03.jpg" alt="Industrial pin defect inspection">
        </div>
        <h3>Industrial Vision Inspection</h3>
        <p>Inspection systems where data quality, hardware setup, and line integration all matter.</p>
      </article>
    </a>

    <a class="home-case-card-link" href="/projects#folo-work-instructions">
      <article class="home-case-card surface-card">
        <div class="home-case-media">
          <img src="/assets/img/folo_04.jpg" alt="Digital work instruction platform">
        </div>
        <h3>FOLO Work Instructions</h3>
        <p>A digital SOP platform for engineers and operators, with traceable execution data.</p>
      </article>
    </a>

    <a class="home-case-card-link" href="/projects#optimo-analytics">
      <article class="home-case-card surface-card">
        <div class="home-case-media">
          <img src="/assets/img/optimo_06.jpg" alt="Human operation analytics platform">
        </div>
        <h3>OPTIMO Analytics</h3>
        <p>Human-operation analytics built from video and factory data.</p>
      </article>
    </a>
  </div>
  <p class="section-lead home-case-archive">
    <a href="/projects">More projects are here.</a>
  </p>
</section>

{% if site.posts.size > 0 %}
<section class="page-section">
  <header class="section-header">
    <p class="section-kicker">A Few Notes</p>
    <h2>Some writing that came out of the work</h2>
  </header>
  <div class="home-writing-list surface-card">
    {% for post in site.posts limit:2 %}
    <a class="home-writing-link" href="{{ post.url }}">
      <span class="home-writing-date">{{ post.date | date: "%b %d, %Y" }}</span>
      <span class="home-writing-content">
        <strong>{{ post.title }}</strong>
        <span>{{ post.excerpt | strip_html | truncatewords: 24 }}</span>
      </span>
    </a>
    {% endfor %}
  </div>
</section>
{% endif %}

<section class="page-section">
  <header class="section-header">
    <p class="section-kicker">Bio</p>
    <h2>A bit more context</h2>
  </header>
  <div class="home-bio surface-card">
    <p>
      My background is a mix of research, product, and applied industrial systems. I earned a
      PhD in Mechanical Engineering from Missouri University of Science and Technology, where I
      worked on worker-centered intelligent manufacturing.
    </p>
    <p>
      If any of this overlaps with your work, feel free to reach out. I am always happy to
      compare notes on factory software, robotics systems, industrial vision, digital twins,
      and applied AI under real constraints.
    </p>
    <div class="button-row home-bio-actions">
      <a href="/about" class="button-link is-secondary">More Background</a>
      <a href="/publications" class="button-link is-secondary">Publications</a>
    </div>
  </div>
</section>
