---
layout: custom
title: "Blog"
---

{% include navigation.html %}

# Blog
<section id="blog-posts">
  <div class="blog-list">
    {% for post in site.posts %}
      <div class="blog-post-preview">
        <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
        <p class="date">{{ post.date | date: "%B %d, %Y" }}</p>
        <!-- <p>{{ post.excerpt | strip_html | truncatewords: 40 }}</p> -->
        <a href="{{ post.url }}" class="read-more">Read More -></a>
      </div>
    {% endfor %}
  </div>
  <!-- <div class="add-post-link" style="margin-top:2.5rem; text-align:center;">
    <a href="/2025/06/06/smart-factory-ai.html" class="button">How to Build a Smart Factory with AI</a>
  </div> -->
</section>

<style>
#blog-posts {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
#blog-posts h1 {
  font-size: 2.2rem;
  margin-bottom: 2rem;
  color: var(--dark-text);
  border-bottom: 2px solid var(--accent-color);
  padding-bottom: 0.5rem;
}
.blog-list {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}
.blog-post-preview {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #eee;
}
.blog-post-preview:last-child {
  border-bottom: none;
}
.blog-post-preview h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.4rem;
  color: var(--dark-text);
}
.blog-post-preview h2 a {
  color: var(--dark-text);
  text-decoration: none;
  transition: color 0.2s;
}
.blog-post-preview h2 a:hover {
  color: var(--secondary-color);
}
.blog-post-preview .date {
  color: var(--light-text);
  font-size: 0.95rem;
  margin-bottom: 0.7rem;
}
.read-more {
  display: inline-block;
  margin-top: 0.7rem;
  color: var(--secondary-color);
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}
.read-more:hover {
  color: var(--accent-color);
}
.add-post-link {
  margin-top: 2.5rem;
  text-align: center;
}
.add-post-link .button {
  display: inline-block;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  color: #fff;
  background-color: var(--accent-color);
  border-radius: 3px;
  text-decoration: none;
  transition: background-color 0.2s;
}
.add-post-link .button:hover {
  background-color: var(--secondary-color);
}
</style>

