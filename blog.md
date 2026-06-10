---
layout: custom
title: "Blog"
description: "Writing by Wenjin Tao on manufacturing, AI, product thinking, and adjacent topics."
body_class: blog-page
custom_css:
  - /assets/css/pages/blog.css
---

{% include navigation.html %}

# Blog

<section id="blog-posts">
  <div class="blog-list">
    {% for post in site.posts %}
      <div class="blog-post-preview">
        <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
        <p class="date">{{ post.date | date: "%B %d, %Y" }}</p>
        <p>{{ post.excerpt | strip_html | truncatewords: 40 }}</p>
        <a href="{{ post.url }}" class="read-more">Read More -></a>
      </div>
    {% endfor %}
  </div>
</section>
