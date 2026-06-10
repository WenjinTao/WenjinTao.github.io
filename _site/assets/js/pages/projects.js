document.addEventListener('DOMContentLoaded', function() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  if (filterButtons.length > 0 && projectCards.length > 0) {
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const filterValue = button.getAttribute('data-filter');

        filterButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');

        projectCards.forEach((card) => {
          const matches = filterValue === 'all' || card.getAttribute('data-category') === filterValue;
          card.style.display = matches ? 'flex' : 'none';
        });
      });
    });
  }

  const galleryImages = document.querySelectorAll('.gallery-img');
  if (galleryImages.length === 0) {
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.setAttribute('hidden', 'hidden');
  modal.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-label="Image preview">
      <button type="button" class="close-modal" aria-label="Close image preview">&times;</button>
      <img src="" alt="">
      <p></p>
    </div>
  `;
  document.body.appendChild(modal);

  const modalImage = modal.querySelector('img');
  const modalCaption = modal.querySelector('p');
  const closeButton = modal.querySelector('.close-modal');

  const closeModal = () => {
    modal.setAttribute('hidden', 'hidden');
    modalImage.setAttribute('src', '');
    modalImage.setAttribute('alt', '');
    modalCaption.textContent = '';
    document.body.style.overflow = '';
  };

  galleryImages.forEach((img) => {
    img.addEventListener('click', () => {
      modalImage.setAttribute('src', img.getAttribute('src'));
      modalImage.setAttribute('alt', img.getAttribute('alt'));
      modalCaption.textContent = img.getAttribute('alt') || '';
      modal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      closeButton.focus();
    });
  });

  closeButton.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hasAttribute('hidden')) {
      closeModal();
    }
  });
});
