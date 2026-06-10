# taowenjin.com

Personal portfolio website for Wenjin Tao - Staff Product Manager at Bright Machines, working at the intersection of AI, Robotics, and Manufacturing.

## Tech Stack

- **Astro** - Static site generator
- **React** - Interactive components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Three Fiber** + **Drei** - 3D hero scene
- **Framer Motion** - Animations
- **MDX/Markdown** - Content collections for blog, projects, publications

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs at `http://localhost:4321`.

## Project Structure

```
src/
  components/     # Reusable Astro and React components
  content/        # Markdown content collections
    blog/         # Blog posts
    projects/     # Project pages
    publications/ # Publication entries
  layouts/        # Page layouts
  pages/          # Route pages
  styles/         # Global CSS
public/           # Static assets
```

## Content Editing

### Add a Blog Post

Create a new `.md` file in `src/content/blog/`:

```markdown
---
title: "Your Post Title"
description: "A brief description"
date: "2025-01-15"
tags: ["Tag1", "Tag2"]
featured: false
---

Your content here...
```

### Add a Project

Create a new `.md` file in `src/content/projects/`:

```markdown
---
title: "Project Name"
description: "Brief description"
tags: ["Tag1", "Tag2"]
icon: "&#129302;"
featured: true
---

Project details here...
```

### Add a Publication

Create a new `.md` file in `src/content/publications/`:

```markdown
---
title: "Paper Title"
authors: "Author Names"
venue: "Journal/Conference Name"
year: 2024
link: "https://doi.org/..."
---

Optional abstract text here.
```

## Deployment

This site is configured for **GitHub Pages** deployment via GitHub Actions.

1. Push to the `main` branch
2. GitHub Actions will automatically build and deploy
3. Go to **Settings > Pages** in your GitHub repo and set source to **GitHub Actions**

### Custom Domain

To use `taowenjin.com`:

1. Add a `CNAME` file in `public/` with your domain
2. Configure DNS with your domain provider:
   - Add an `A` record pointing to GitHub Pages IPs
   - Or add a `CNAME` record pointing to `<username>.github.io`
3. Enable "Enforce HTTPS" in GitHub Pages settings

## Customization

- **Colors**: Edit `tailwind.config.mjs` to change the color palette
- **Social links**: Edit `src/components/Footer.astro` and `src/pages/contact.astro`
- **Navigation**: Edit `src/components/Navbar.astro`
- **Homepage particle text**: Edit `src/components/ParticleText.tsx` (WebGL) and the `<ParticleText text="..." />` call in `src/components/ChatInterface.tsx`
- **Contact form**: Replace `PLACEHOLDER` in `src/pages/contact.astro` with your Formspree endpoint, and the Google Scholar `user=PLACEHOLDER` link with your real ID
