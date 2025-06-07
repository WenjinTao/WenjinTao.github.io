---
layout: custom
title: "About Me"
---

{% include navigation.html %}

# About Me

<div class="about-header-flex">
  <div class="about-avatar-container">
    <img src="/assets/img/wt-square.png" alt="Wenjin Tao avatar" class="about-avatar">
  </div>
  <div class="about-intro-text">
    Hi, I’m Wenjin Tao — an engineer, researcher, and educator passionate about shaping the future of intelligent manufacturing. <br>
My work lives at the intersection of robotics, artificial intelligence, and manufacturing, where I build systems that blend intelligence with human-centered interaction.
  </div>
  
</div>

## What I’m Working On

Currently, I’m:

- Leading a tech team focused on solving manufacturing challenges with AI
- Exploring agentic AI and other emerging technologies in the manufacturing domain
- Working with OpenUSD and digital twin technologies to advance smart factory solutions

## Past Experience

In 2012, I co-founded MeoryTech, where we designed and built desktop 3D printers and supporting software applications.  
We provided tailored solutions for research institutes and top consulting firms, helping them boost their R&D and operational capabilities.

This early entrepreneurial experience deeply shaped my thinking about product design, scalability, and working across disciplines.


## Curious by Nature

Outside of work, I love exploring ideas that surprise and inspire me.  
Lately, I’ve been experimenting with music production in Logic Pro, and writing about unexpected cultural connections—like the surprising parallels between Henan luomo and Mexican tacos.

I believe innovation often grows where disciplines meet: when tech blends with art, and when stories and flavors spark new perspectives.


<!-- ## Let’s Connect
Feel free to check out my [Projects](/projects), read the [Blog](/blog), or connect with me on [LinkedIn](https://www.linkedin.com/in/wenjintao/). I'm always open to collaborating, brainstorming, or just talking about hand-pulled noodles. -->

---
<style>
.about-header-flex {
  display: flex;
  align-items: center;
  gap: 2.2rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}
.about-avatar-container {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}
.about-avatar {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 18px rgba(0,0,0,0.13);
  border: 4px solid var(--light-bg);
  background: #fff;
}
.about-intro-text {
  flex: 1 1 300px;
  font-size: 1.13rem;
  color: var(--dark-text);
  min-width: 220px;
  line-height: 1.7;
}
@media (max-width: 600px) {
  .about-header-flex {
    flex-direction: column !important;
    align-items: center;
    gap: 1.2rem;
  }
  .about-intro-text {
    text-align: center;
  }
}
</style>