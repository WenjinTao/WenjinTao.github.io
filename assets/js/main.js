document.addEventListener('DOMContentLoaded', function() {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Filter functionality
  const filterButtons = document.querySelectorAll('.filter-btn');
  const publicationSections = document.querySelectorAll('.publication-section');
  const projectCards = document.querySelectorAll('.project-card');
  
  if (filterButtons.length > 0) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        
        // Update active button
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter publications
        if (publicationSections.length > 0) {
          if (filter === 'all') {
            publicationSections.forEach(section => {
              section.style.display = 'block';
            });
          } else {
            publicationSections.forEach(section => {
              if (section.getAttribute('data-category') === filter) {
                section.style.display = 'block';
              } else {
                section.style.display = 'none';
              }
            });
          }
        }
        
        // Filter projects
        if (projectCards.length > 0) {
          if (filter === 'all') {
            projectCards.forEach(card => {
              card.style.opacity = '0';
              card.style.display = 'flex';
              setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease';
                card.style.opacity = '1';
              }, 50);
            });
          } else {
            projectCards.forEach(card => {
              if (card.getAttribute('data-category') === filter) {
                card.style.opacity = '0';
                card.style.display = 'flex';
                setTimeout(() => {
                  card.style.transition = 'opacity 0.5s ease';
                  card.style.opacity = '1';
                }, 50);
              } else {
                card.style.transition = 'opacity 0.3s ease';
                card.style.opacity = '0';
                setTimeout(() => {
                  card.style.display = 'none';
                }, 300);
              }
            });
          }
        }
      });
    });
  }
  
  // Citation functionality
  const citationButtons = document.querySelectorAll('.copy-citation-btn');
  
  if (citationButtons.length > 0) {
    citationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const citation = btn.getAttribute('data-citation');
        
        // Copy to clipboard
        navigator.clipboard.writeText(citation).then(() => {
          // Change button text temporarily
          const originalText = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-check"></i> Citation Copied!';
          
          // Revert button text after 2 seconds
          setTimeout(() => {
            btn.innerHTML = originalText;
          }, 2000);
        });
      });
    });
  }
  
  // Initialize gallery image click handlers for larger view
  const galleryImages = document.querySelectorAll('.gallery-img');
  
  if (galleryImages.length > 0) {
    galleryImages.forEach(img => {
      img.addEventListener('click', () => {
        const imgSrc = img.getAttribute('src');
        const imgAlt = img.getAttribute('alt');
        
        // Create modal for image preview
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <img src="${imgSrc}" alt="${imgAlt}">
            <p>${imgAlt}</p>
          </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
          modal.remove();
        });
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.remove();
          }
        });
      });
    });
  }
});
