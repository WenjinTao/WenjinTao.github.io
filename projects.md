---
layout: custom
title: "Projects"
description: "Selected robotics, computer vision, analytics, and digital workflow projects by Wenjin Tao."
body_class: projects-page
custom_css:
  - /assets/css/pages/projects.css
custom_js:
  - /assets/js/pages/projects.js
---

{% include navigation.html %}

<section class="page-intro">
  <p class="section-kicker">Selected Work</p>
  <h1 class="page-title">Projects across robotics, industrial vision, and factory software</h1>
  <p class="page-lead">
    These projects sit close to operations. They are the kind of systems where product
    definition, hardware constraints, software execution, and user adoption all matter.
  </p>
</section>

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
    <div class="project-card" data-category="robotics" id="field-robotics">
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
    <div class="project-card" data-category="computer-vision" id="industrial-vision-inspection">
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
    <div class="project-card" data-category="workflow" id="folo-work-instructions">
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
    <div class="project-card" data-category="analytics" id="optimo-analytics">
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
          <a href="https://doi.org/10.1016/j.engappai.2018.09.006" class="project-link" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-file-alt"></i> Paper
          </a>
          <a href="https://github.com/WenjinTao/ASLA-Leap" class="project-link" target="_blank" rel="noopener noreferrer">
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
          <a href="https://ieeexplore.ieee.org/document/7790182" class="project-link" target="_blank" rel="noopener noreferrer">
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

