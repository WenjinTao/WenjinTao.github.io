---
layout: custom
title: "Projects"
---

{% include navigation.html %}

<!-- <div class="hero-section">
  <h1>Projects</h1>
  <p class="subtitle">AI-Powered Solutions for Smart Manufacturing</p>
  <p>Explore my work in bringing artificial intelligence to physical systems and manufacturing processes.</p>
</div> -->

<section id="project-categories">
  <h2>Project Categories</h2>
  <div class="category-filters">
    <button class="filter-btn active" data-filter="all">All Projects</button>
    <button class="filter-btn" data-filter="robotics">Robotics</button>
    <button class="filter-btn" data-filter="computer-vision">Computer Vision</button>
    <button class="filter-btn" data-filter="healthcare">Healthcare</button>
    <button class="filter-btn" data-filter="workflow">Digital Workflow</button>
    <button class="filter-btn" data-filter="analytics">AI Analytics</button>
    <button class="filter-btn" data-filter="research">Research</button>
  </div>
</section>

<section id="projects-showcase">
  <div class="project-grid">
    <!-- Field Robotics -->
    <div class="project-card" data-category="robotics">
      <div class="project-image">
        <img src="./assets/img/robotics_01.jpg" alt="Autonomous Robot Platform" class="project-thumbnail">
        <div class="project-category">Robotics</div>
      </div>      <div class="project-card-content">
        <h3>Field Robotics</h3>
        <p>
          A modular, zero-emission robot platform with self-driving capabilities and tool attachments such as lawn mowers, snow plows, and weed controllers. Designed for cost-effective, sustainable outdoor labor.
        </p>
        <div class="project-details">
          <h3>Key Features</h3>
          <ul>
            <li>Self-driving technology powered by advanced sensors and AI algorithms</li>
            <li>Modular design supporting multiple tool attachments</li>
            <li>Zero-emission operation for reduced environmental impact</li>
            <li>Rugged construction for all-weather operation</li>
          </ul>
          <!-- <h3>Technologies Used</h3>
          <div class="tech-tags">
            <span class="tech-tag">Jetson Nano</span>
            <span class="tech-tag">ArduPilot</span>
            <span class="tech-tag">ROS</span>
            <span class="tech-tag">Computer Vision</span>
          </div> -->
          <div class="project-gallery">
            <img src="./assets/img/robotics_03.jpg" alt="Field Robot in operation" class="gallery-img">
            <img src="./assets/img/robotics_05.jpg" alt="Field Robot design" class="gallery-img">
            <img src="./assets/img/robotics_07.jpg" alt="Field Robot components" class="gallery-img">
          </div>
        </div>
      </div>
    </div>
    <!-- Low-Cost Ventilator -->
    <div class="project-card" data-category="healthcare">
      <div class="project-image">
        <img src="./assets/img/ventilator_03.jpg" alt="Open-Source Ventilator" class="project-thumbnail">
        <div class="project-category">Healthcare</div>
      </div>      <div class="project-card-content">
        <h3>Low-Cost Ventilator Prototype</h3>
        <p>
          Designed to be built with off-the-shelf and 3D-printed parts, this ventilator supports emergency medical needs while demonstrating the team's rapid-response engineering and future AI integration potential.
        </p>
        <div class="project-details">
          <h3>Key Features</h3>
          <ul>
            <li>Built with readily available components</li>
            <li>3D-printed custom parts for easy replication</li>
            <li>Full control loop for pressure and volume regulation</li>
            <li>Low-cost design for emergency deployment</li>
          </ul>
          <!-- <h3>Technologies Used</h3>
          <div class="tech-tags">
            <span class="tech-tag">Arduino</span>
            <span class="tech-tag">3D Printing</span>
            <span class="tech-tag">Control Systems</span>
            <span class="tech-tag">Medical Electronics</span>
          </div> -->
          <div class="project-gallery">
            <img src="./assets/img/ventilator_01.jpg" alt="Ventilator prototype" class="gallery-img">
            <img src="./assets/img/ventilator_04.jpg" alt="Ventilator components" class="gallery-img">
          </div>
        </div>
      </div>
    </div>
    <!-- Mask Defect Detection -->
    <div class="project-card" data-category="computer-vision">
      <div class="project-image">
        <img src="./assets/img/mask_production_machine_vision_01.jpg" alt="AI Defect Detection System" class="project-thumbnail">
        <div class="project-category">Computer Vision</div>
      </div>      <div class="project-card-content">
        <h3>Mask Defect Detection System</h3>
        <p>
          Uses image processing and machine learning to detect manufacturing defects in face masks and automatically sort them, improving quality assurance and traceability.
        </p>
        <div class="project-details">
          <h3>Key Features</h3>
          <ul>
            <li>Real-time defect detection on production lines</li>
            <li>93% classification accuracy</li>
            <li>Automated sorting mechanism</li>
            <li>Production data logging for quality traceability</li>
          </ul>
          <!-- <h3>Technologies Used</h3>
          <div class="tech-tags">
            <span class="tech-tag">OpenCV</span>
            <span class="tech-tag">TensorFlow</span>
            <span class="tech-tag">PyTorch</span>
            <span class="tech-tag">Industrial Cameras</span>
          </div> -->
        </div>
      </div>
    </div>
    <!-- Pin Defect Detection -->
    <div class="project-card" data-category="computer-vision">
      <div class="project-image">
        <img src="./assets/img/machine_vision_01.jpg" alt="Pin Defect Detection" class="project-thumbnail">
        <div class="project-category">Machine Vision</div>
      </div>      <div class="project-card-content">
        <h3>Pin Defect Detection System</h3>
        <p>
          Automatically identifies bent or damaged pins in dense electronic components using AI, helping quality teams detect issues early and improve yield.
        </p>
        <div class="project-details">
          <h3>Key Features</h3>
          <ul>
            <li>High-resolution imaging of dense component pin arrays</li>
            <li>Detection algorithm specialized for small defects</li>
            <li>Real-time quality alerts</li>
            <li>Integration with factory quality systems</li>
          </ul>
          <!-- <h3>Technologies Used</h3>
          <div class="tech-tags">
            <span class="tech-tag">Deep Learning</span>
            <span class="tech-tag">Image Processing</span>
            <span class="tech-tag">NVIDIA Hardware</span>
            <span class="tech-tag">MES Integration</span>
          </div> -->
        </div>
      </div>
    </div>
    <!-- FOLO -->
    <div class="project-card" data-category="workflow">
      <div class="project-image">
        <img src="./assets/img/folo_01.jpg" alt="FOLO Work Instruction System" class="project-thumbnail">
        <div class="project-category">Digital Workflow</div>
      </div>      <div class="project-card-content">
        <h3>FOLO: Smart Work Instruction System</h3>
        <p>
          Engineers build digital SOPs via drag-and-drop, while operators follow guided workflows. FOLO records production data and supports hardware integration.
        </p>
        <div class="project-details">
          <h3>Key Features</h3>
          <ul>
            <li>Drag-and-drop SOP editor for engineers</li>
            <li>Step-by-step guided workflows for operators</li>
            <li>Production data capture and analysis</li>
            <li>Hardware integration capabilities</li>
          </ul>
          <!-- <h3>Technologies Used</h3>
          <div class="tech-tags">
            <span class="tech-tag">React.js</span>
            <span class="tech-tag">Node.js</span>
            <span class="tech-tag">MongoDB</span>
            <span class="tech-tag">REST APIs</span>
          </div>           -->
          <div class="project-gallery">
            <img src="./assets/img/folo_03.jpg" alt="FOLO interface" class="gallery-img">
            <img src="./assets/img/folo_02.jpg" alt="FOLO in use" class="gallery-img">
          </div>
        </div>
      </div>
    </div>   
    <!-- OPTIMO -->
    <div class="project-card" data-category="analytics">
      <div class="project-image">
        <img src="./assets/img/optimo_04.jpg" alt="OPTIMO Analytics Platform" class="project-thumbnail">
        <div class="project-category">AI Analytics</div>
      </div>      <div class="project-card-content">
        <h3>OPTIMO: AI-Driven Human Operation Analytics</h3>
        <p>
          Streams and analyzes IP camera feeds for time-motion analysis and AI training. Features dashboards for performance insights and industrial process optimization.
        </p>
        <div class="project-details">
          <h3>Key Features</h3>
          <ul>
            <li>IP camera integration and video streaming</li>
            <li>Time-motion analysis algorithms</li>
            <li>Real-time performance dashboards</li>
            <li>AI model training from captured data</li>
          </ul>  
          <!-- <h3>Technologies Used</h3>
          <div class="tech-tags">
            <span class="tech-tag">Computer Vision</span>
            <span class="tech-tag">TensorFlow</span>
            <span class="tech-tag">Flask</span>
            <span class="tech-tag">WebRTC</span>
          </div> -->
          <div class="project-gallery">
            <img src="./assets/img/optimo_03.jpg" alt="OPTIMO dashboard" class="gallery-img">
            <img src="./assets/img/optimo_05.jpg" alt="OPTIMO analytics" class="gallery-img">
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<hr>

<section id="more-projects">
  <h2>Research Projects</h2>
  
  <div class="project-grid">
    <!-- ASL Recognition -->
    <div class="project-card" data-category="research">
      <div class="project-image">
        <img src="./assets/img/paper_asl/paper.jpg" alt="ASL Recognition Project" class="project-thumbnail">
        <div class="project-category">Research</div>
      </div>      <div class="project-card-content">
        <h3>Multi-View Recognition of Complex Hand Gesture</h3>
        <p>
          Development of a novel multi-view augmentation strategy for American Sign Language (ASL) alphabet recognition using convolutional neural networks.
        </p>
        <div class="project-links">
          <a href="https://doi.org/10.1016/j.engappai.2018.09.006" class="project-link" target="_blank">
            <i class="fas fa-file-alt"></i> Paper
          </a>
          <a href="https://github.com/WenjinTao/ASLA-Leap" class="project-link" target="_blank">
            <i class="fab fa-github"></i> Dataset
          </a>
          <!-- <a href="/papers/American-sign-language-alphabet-recognition-using-leap-motion-controller.html" class="project-link">
            <i class="fas fa-play-circle"></i> Demo
          </a> -->
        </div>
      </div>
    </div>
    <!-- Lattice Structure -->
    <div class="project-card" data-category="research">
      <div class="project-image">
        <img src="./assets/img/lattice_1.png" alt="Lattice Structure Project" class="project-thumbnail">
        <div class="project-category">Research</div>
      </div>      <div class="project-card-content">
        <h3>Design of Lattice Structure for Additive Manufacturing</h3>
        <p>
          Research on the design and optimization of lattice structures for additive manufacturing, focusing on variable density distribution and mechanical properties.
        </p>
        <div class="project-links">
          <a href="https://ieeexplore.ieee.org/document/7790182" class="project-link" target="_blank">
            <i class="fas fa-file-alt"></i> Paper
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<hr>

<!-- <section id="contact">
  <h2>Get In Touch</h2>
  
  <p>I'm open to collaboration, speaking invitations, and nerdy conversations about AI in manufacturing.</p>
  
  <div class="contact-container">
    <div class="contact-links">
      <a href="mailto:your@email.com" class="contact-link"><i class="fas fa-envelope"></i> Email Me</a>
      <a href="https://www.linkedin.com/in/yourprofile" class="contact-link"><i class="fab fa-linkedin"></i> LinkedIn</a>
      <a href="/assets/Wenjin_Tao_Resume.pdf" class="contact-link"><i class="fas fa-file-pdf"></i> Resume PDF</a>
    </div>
    
    <p class="contact-note">Based in Milwaukee, WI — available for remote collaboration and speaking opportunities.</p>
  </div>
</section> -->

<style>  /* Common styles are inherited from the main CSS */
  :root {
    --primary-color: #333333;
    --secondary-color: #1a1a1a;
    --accent-color: #666666;
    --light-bg: #f5f5f5;
    --dark-text: #222222;
    --light-text: #777777;
    --border-radius: 5px;
    --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  }
  
  /* Hero Section */
  .hero-section {
    margin-bottom: 3rem;
    text-align: center;
    padding: 2.5rem 1rem;
    background: linear-gradient(to right, var(--light-bg), white);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
  }
    .hero-section h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: var(--dark-text);
  }
  
  .subtitle {
    font-size: 1.2rem;
    margin: 0.6rem 0;
    color: var(--secondary-color);
    font-weight: 500;
  }
  
  /* Section Styling */
  section {
    margin: 3rem 0;
    padding: 0.5rem;
  }
    section h2 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    color: var(--dark-text);
    border-bottom: 2px solid var(--accent-color);
    padding-bottom: 0.5rem;
    display: inline-block;
  }
  
  .category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }
  .filter-btn {
    padding: 0.5rem 1rem;
    background-color: var(--light-bg);
    border: none;
    border-radius: var(--border-radius);
    color: var(--dark-text);
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.3s ease;
    margin-bottom: 0.5rem;
  }

  .filter-btn:hover {
    background-color: #e0e0e0;
  }
  
  .filter-btn.active {
    background-color: var(--primary-color);
    color: white;
    font-weight: 500;
  }
  /* Project Cards */
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.8rem;
  }
  
  .project-card {
    padding: 0;
    background-color: white;
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    transition: all 0.4s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.05);
  }
  
  .project-card:hover {
    transform: translateY(-7px);
    box-shadow: 0 15px 25px rgba(0, 0, 0, 0.12);
  }
  
  .project-card-content {
    padding: 1.2rem 1.5rem 1.5rem;
  }
  
  .project-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--accent-color);
  }
    .project-card h2 {
    margin-top: 0;
    margin-bottom: 0.7rem;
    color: var(--dark-text);
    font-size: 1.5rem;
    border-bottom: none;
    display: block;
    padding-bottom: 0;
  }
  
  .project-card h3 {
    margin-top: 0;
    margin-bottom: 0.7rem;
    color: var(--dark-text);
    font-size: 1.3rem;
  }
  
  .project-card p {
    margin-bottom: 0;
    color: var(--light-text);
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  .project-image {
    position: relative;
    overflow: hidden;
    border-radius: var(--border-radius);
    height: 200px;
    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  }
    .project-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease, opacity 0.5s;
    opacity: 0.9;
  }
  
  .project-card:hover .project-thumbnail {
    transform: scale(1.08);
    opacity: 1;
  }
  
  .project-image::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%);
    opacity: 0.7;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .project-card:hover .project-image::after {
    opacity: 0.4;
  }
  
  .project-category {
    position: absolute;
    top: 15px;
    right: 15px;
    background-color: rgba(0,0,0,0.6);
    color: white;
    padding: 4px 10px;
    font-size: 0.8rem;
    border-radius: 30px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  
  /* Project Details */
  .project-details {
    margin-top: 1.5rem;
    border-top: 1px solid #eee;
    padding-top: 1.5rem;
  }
    .project-details h3 {
    font-size: 1.1rem;
    margin: 1.2rem 0 0.7rem;
    color: var(--dark-text);
  }
  
  .project-details ul {
    padding-left: 1.2rem;
    margin-bottom: 1.5rem;
  }
  
  .project-details li {
    margin-bottom: 0.5rem;
    color: var(--light-text);
  }
  
  .tech-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }
    .tech-tag {
    background-color: rgba(51, 51, 51, 0.05);
    border: 1px solid rgba(51, 51, 51, 0.1);
    border-radius: 30px;
    padding: 0.3rem 0.8rem;
    font-size: 0.8rem;
    color: var(--dark-text);
  }
  
  /* Project Gallery */
  .project-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }
    .gallery-img {
    width: 100%;
    border-radius: 4px;
    transition: transform 0.3s ease, opacity 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    opacity: 0.9;
  }
  
  .gallery-img:hover {
    transform: scale(1.05);
    opacity: 1;
  }
    /* Project Links */
  .project-links {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
    .project-link {
    display: inline-flex;
    align-items: center;
    color: var(--dark-text);
    text-decoration: none;
    font-size: 0.9rem;
    gap: 0.3rem;
    transition: all 0.2s ease;
  }
  
  .project-link:hover {
    color: var(--secondary-color);
    transform: translateY(-2px);
  }
  
  /* Contact Section */
  .contact-container {
    margin-top: 1.5rem;
    background-color: var(--light-bg);
    padding: 1.5rem;
    border-radius: var(--border-radius);
  }

  .contact-links {
    margin-top: 1.5rem;
    display: flex;
    flex-wrap: wrap;
  }
    .contact-link {
    display: inline-block;
    margin-right: 1.5rem;
    margin-bottom: 0.8rem;
    text-decoration: none;
    color: var(--dark-text);
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .contact-link:hover {
    color: var(--secondary-color);
    transform: translateY(-2px);
  }
  
  .contact-note {
    margin-top: 1.5rem;
    font-style: italic;
    color: var(--light-text);
    border-top: 1px dashed #ddd;
    padding-top: 1rem;
  }
  
  /* Dividers */
  hr {
    border: none;
    border-top: 1px solid #eee;
    margin: 3rem 0;
  }
    /* Mobile Adjustments */
  @media (max-width: 768px) {
    .project-grid {
      grid-template-columns: 1fr;
    }
    
    .category-filters {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .filter-btn {
      margin-bottom: 0.5rem;
    }
    
    .hero-section h1 {
      font-size: 2rem;
    }
    
  }
</style>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get filter value
        const filterValue = button.getAttribute('data-filter');
        
        // Filter projects with animation
        projectCards.forEach(card => {
          if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
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
      });
    });
    
    // Initialize gallery image click handlers for larger view
    const galleryImages = document.querySelectorAll('.gallery-img');
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
  });
</script>

<style>
  /* Image Modal */
  .image-modal {
    display: flex;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    max-width: 90%;
    max-height: 90%;
    position: relative;
    text-align: center;
  }
  .modal-content img {
    max-width: 100%;
    max-height: 80vh;
    border-radius: 5px;
    opacity: 1;
  }
  
  .modal-content p {
    color: white;
    margin-top: 1rem;
  }
  
  .close-modal {
    position: absolute;
    top: -30px;
    right: -30px;
    color: white;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
  }
</style>
