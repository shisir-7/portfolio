/**
 * Shisir Acharya — Personal Portfolio Application Engine
 * Pure Vanilla JavaScript (Zero External Dependencies)
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  initNavigation();
  initProjects();
  initCaseStudyModal();
  initInquiryForm();
  initClipboard();
  initCustomCursor();
  initScrollSpy();
});

/* --------------------------------------------------------------------------
   1. Theme Management (Editorial Warm Linen vs Obsidian Dark)
   -------------------------------------------------------------------------- */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  
  // Check stored preference or system preference
  const savedTheme = localStorage.getItem('sa-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  setTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('sa-theme', newTheme);
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#10100F' : '#F7F5F0');
    }
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      themeToggleBtn.innerHTML = theme === 'dark' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }
}

/* --------------------------------------------------------------------------
   2. Live Kapilvastu Local Time (Asia/Kathmandu: UTC+5:45)
   -------------------------------------------------------------------------- */
function initLiveClock() {
  const clockEl = document.getElementById('live-time');
  const footerClockEl = document.getElementById('footer-live-time');

  function updateTime() {
    const options = {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    try {
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const timeString = formatter.format(new Date());
      const label = `${timeString} NPT [UTC+5:45]`;
      if (clockEl) clockEl.textContent = label;
      if (footerClockEl) footerClockEl.textContent = label;
    } catch (e) {
      if (clockEl) clockEl.textContent = "KAPILVASTU (UTC+5:45)";
    }
  }

  updateTime();
  setInterval(updateTime, 1000);
}

/* --------------------------------------------------------------------------
   3. Responsive Navigation & Mobile Drawer
   -------------------------------------------------------------------------- */
function initNavigation() {
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-nav-drawer__link');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileToggle.classList.toggle('open');
      mobileDrawer.classList.toggle('open', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('open');
        mobileDrawer.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }
}

/* --------------------------------------------------------------------------
   4. Selected Work Gallery & Filtering
   -------------------------------------------------------------------------- */
function initProjects() {
  const grid = document.getElementById('projects-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const counterEl = document.getElementById('work-counter');
  const searchForm = document.getElementById('project-search-form');
  const searchInput = document.getElementById('project-search-input');
  const suggestions = document.getElementById('project-search-suggestions');

  if (!grid || !window.PORTFOLIO_PROJECTS) return;

  let activeCategory = 'all';
  let searchQuery = '';

  function normalizeSearchText(value) {
    return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function isTypingSearch(query) {
    const normalized = normalizeSearchText(query);
    const words = normalized.split(/\s+/).filter(Boolean);
    return words.some(word => word === 'typing' || (word.length >= 3 && 'typing'.startsWith(word)))
      || words.some(word => word === 'monkeytype' || (word.length >= 3 && 'monkeytype'.startsWith(word)))
      || words.some(word => word === 'wpm' || (word.length >= 2 && 'wpm'.startsWith(word)))
      || (normalized.length >= 5 && 'words per minute'.startsWith(normalized))
      || (words.includes('speed') && words.includes('test'));
  }

  function matchesProject(project, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    if (project.id === 'typing-speed-test') return isTypingSearch(normalizedQuery);

    const searchableText = normalizeSearchText([
      project.title,
      project.discipline,
      project.badge,
      project.headline,
      project.summary,
      ...(project.searchKeywords || [])
    ].join(' '));

    return searchableText.includes(normalizedQuery)
      || normalizedQuery.split(' ').every(term => searchableText.includes(term));
  }

  function getRecommendations(query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    const typingSearch = isTypingSearch(normalizedQuery);
    return window.PORTFOLIO_PROJECTS
      .filter(project => matchesProject(project, normalizedQuery))
      .sort((a, b) => {
        const typingPriority = project => typingSearch && project.id === 'typing-speed-test' ? 0 : 1;
        if (typingPriority(a) !== typingPriority(b)) return typingPriority(a) - typingPriority(b);
        return window.PORTFOLIO_PROJECTS.indexOf(a) - window.PORTFOLIO_PROJECTS.indexOf(b);
      })
      .slice(0, 5);
  }

  function renderSuggestions(query) {
    if (!suggestions || !searchInput) return;

    const recommendations = getRecommendations(query);
    suggestions.hidden = !query.trim();
    suggestions.innerHTML = '';
    searchInput.setAttribute('aria-expanded', String(!suggestions.hidden));

    if (suggestions.hidden) return;

    if (!recommendations.length) {
      suggestions.innerHTML = '<p class="project-search__empty">No matching projects yet.</p>';
      return;
    }

    suggestions.innerHTML = recommendations.map(project => `
      <a
        class="project-search__suggestion"
        href="${project.projectUrl || '#work'}"
        role="option"
        aria-label="${project.title}: ${project.searchDescription || project.summary}"
        ${project.projectUrl ? '' : `data-project-id="${project.id}"`}
      >
        <img src="${project.image}" alt="" loading="lazy" />
        <span class="project-search__suggestion-copy">
          <span class="project-search__suggestion-title">${project.title}</span>
          <span class="project-search__suggestion-description">${project.searchDescription || project.summary}</span>
        </span>
        <span class="project-search__suggestion-arrow" aria-hidden="true">↗</span>
      </a>
    `).join('');
  }

  function renderProjects(category = activeCategory, query = searchQuery) {
    const categoryMatches = category === 'all' || isTypingSearch(query)
      ? window.PORTFOLIO_PROJECTS 
      : window.PORTFOLIO_PROJECTS.filter(p => p.category === category);
    const filtered = categoryMatches.filter(project => matchesProject(project, query));

    grid.innerHTML = filtered.map(project => {
      const cardElement = project.projectUrl ? 'a' : 'article';
      const cardAttributes = project.projectUrl
        ? `href="${project.projectUrl}" aria-label="Open ${project.title}"`
        : `data-project-id="${project.id}" tabindex="0" role="button" aria-label="View case study for ${project.title}"`;
      const actionLabel = project.projectUrl ? 'Open Project' : 'Case Study';

      return `
      <${cardElement} class="project-card" ${cardAttributes}>
        <div class="project-card__media">
          <img class="project-card__image" src="${project.image}" alt="${project.imageAlt}" loading="lazy" />
          <span class="project-card__badge">${project.discipline}</span>
        </div>
        <div class="project-card__body">
          <div class="project-card__meta">
            <span class="project-card__number">[${project.number}]</span>
            <span class="project-card__year">${project.year}</span>
          </div>
          <h3 class="project-card__title">${project.title}</h3>
          <p class="project-card__summary">${project.summary}</p>
          <div class="project-card__footer">
            <span class="tech-tag">${project.badge}</span>
            <span class="project-card__action">
              ${actionLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
          </div>
        </div>
      </${cardElement}>
    `;
    }).join('');

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="project-search__no-projects">No projects match this search. Try another keyword.</p>';
    }

    if (counterEl) {
      counterEl.textContent = `SHOWING ${filtered.length} OF ${window.PORTFOLIO_PROJECTS.length} WORKS`;
    }

    // Attach click and enter key handlers to cards
    const cards = grid.querySelectorAll('.project-card');
    cards.forEach(card => {
      if (card.tagName === 'A') return;

      const openModal = () => {
        const id = card.getAttribute('data-project-id');
        window.openCaseStudy(id);
      };
      card.addEventListener('click', openModal);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      });
    });
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', event => {
      event.preventDefault();
      const firstSuggestion = suggestions && suggestions.querySelector('.project-search__suggestion');
      if (firstSuggestion) firstSuggestion.click();
    });

    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      renderSuggestions(searchQuery);
      renderProjects();
    });

    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Escape' && suggestions && !suggestions.hidden) {
        suggestions.hidden = true;
        searchInput.setAttribute('aria-expanded', 'false');
      } else if (event.key === 'ArrowDown' && suggestions && !suggestions.hidden) {
        const firstSuggestion = suggestions.querySelector('.project-search__suggestion');
        if (firstSuggestion) {
          event.preventDefault();
          firstSuggestion.focus();
        }
      }
    });

    if (suggestions) {
      suggestions.addEventListener('click', event => {
        const suggestion = event.target.closest('.project-search__suggestion[data-project-id]');
        if (!suggestion) return;
        event.preventDefault();
        suggestions.hidden = true;
        searchInput.setAttribute('aria-expanded', 'false');
        window.openCaseStudy(suggestion.dataset.projectId);
      });
    }

    document.addEventListener('click', event => {
      if (suggestions && !searchForm.contains(event.target)) {
        suggestions.hidden = true;
        searchInput.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Filter tab events
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter');
      renderProjects();
    });
  });

  // Initial render
  renderProjects('all');
}

/* --------------------------------------------------------------------------
   5. Case Study Modal Engine & Dynamic CTAs
   -------------------------------------------------------------------------- */
function initCaseStudyModal() {
  const modalOverlay = document.getElementById('case-study-modal');
  const modalDrawer = document.getElementById('modal-drawer');
  const closeBtn = document.getElementById('modal-close-btn');

  if (!modalOverlay || !modalDrawer) return;

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
      closeModal();
    }
  });

  // Global trigger function
  window.openCaseStudy = function(projectId) {
    const project = window.PORTFOLIO_PROJECTS.find(p => p.id === projectId);
    if (!project) return;

    // Fill Modal Content
    document.getElementById('modal-num').textContent = `[ PROJECT ${project.number} ]`;
    document.getElementById('modal-title').textContent = project.title;
    document.getElementById('modal-headline').textContent = project.headline;

    document.getElementById('modal-meta-role').textContent = project.role;
    document.getElementById('modal-meta-year').textContent = project.year;
    document.getElementById('modal-meta-discipline').textContent = project.discipline;
    document.getElementById('modal-meta-badge').textContent = project.badge;

    const modalImg = document.getElementById('modal-img');
    modalImg.src = project.image;
    modalImg.alt = project.imageAlt;

    // Dynamic Project Links CTAs (View Live Prototype & Source Code)
    const linksContainer = document.getElementById('modal-project-links');
    if (linksContainer) {
      let buttonsHtml = '';
      
      if (project.demoUrl) {
        buttonsHtml += `
          <a href="${project.demoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn--demo">
            View Live Prototype
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </a>
        `;
      }

      if (project.repoUrl) {
        buttonsHtml += `
          <a href="${project.repoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn--repo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            Source Code
          </a>
        `;
      }

      // Only display the container if at least one URL is provided
      if (buttonsHtml.trim() !== '') {
        linksContainer.innerHTML = buttonsHtml;
        linksContainer.style.display = 'flex';
      } else {
        linksContainer.innerHTML = '';
        linksContainer.style.display = 'none';
      }
    }

    document.getElementById('modal-challenge').textContent = project.caseStudy.challenge;
    document.getElementById('modal-audience').textContent = project.caseStudy.targetAudience;
    document.getElementById('modal-approach').textContent = project.caseStudy.approach;

    const interfaceList = document.getElementById('modal-interface-decisions');
    interfaceList.innerHTML = project.caseStudy.interfaceDecisions
      .map(item => `<li>${item}</li>`)
      .join('');

    const deliverablesList = document.getElementById('modal-deliverables');
    deliverablesList.innerHTML = project.caseStudy.deliverables
      .map(item => `<li>${item}</li>`)
      .join('');

    const toolsCloud = document.getElementById('modal-tools');
    toolsCloud.innerHTML = project.caseStudy.tools
      .map(tool => `<span class="tool-tag">${tool}</span>`)
      .join('');

    // Open modal
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    modalDrawer.scrollTop = 0;
  };
}

/* --------------------------------------------------------------------------
   6. Inquiry Form Submission & 3-Second Feedback
   -------------------------------------------------------------------------- */
function initInquiryForm() {
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const service = document.getElementById('form-service').value;
    const message = document.getElementById('form-message').value.trim();

    if (!name || !email || !message) {
      alert('Please fill in your name, email, and project message.');
      return;
    }

    // Feedback state: Disable button and update text for 3 seconds
    if (submitBtn) {
      const originalContent = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Opening Mail Client...
      `;

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
      }, 3000);
    }

    const recipient = 'acharyashiru939@gmail.com';
    const subject = encodeURIComponent(`Project Inquiry: ${service} — ${name}`);
    const bodyContent = `Hello Shisir,\n\nName: ${name}\nEmail: ${email}\nDiscipline / Interest: ${service}\n\nProject Details:\n${message}\n\nSent from your portfolio website inquiry system.`;
    const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${encodeURIComponent(bodyContent)}`;

    // Open visitor's default email client
    window.location.href = mailtoUrl;
  });
}

/* --------------------------------------------------------------------------
   7. Email Address Copy to Clipboard
   -------------------------------------------------------------------------- */
function initClipboard() {
  const copyBtn = document.getElementById('copy-email-btn');
  const emailText = 'acharyashiru939@gmail.com';

  if (!copyBtn) return;

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(emailText).then(() => {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BD3A1B" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Copied to Clipboard!
      `;
      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
      }, 2500);
    }).catch(() => {
      // Fallback
      alert(`Email: ${emailText}`);
    });
  });
}

/* --------------------------------------------------------------------------
   8. Subtle Custom Cursor (Desktop Mouse Only)
   -------------------------------------------------------------------------- */
function initCustomCursor() {
  // If reduced motion is preferred or device is touch only, exit
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  const cursor = document.getElementById('custom-cursor');
  const follower = document.getElementById('custom-cursor-follower');

  if (!cursor || !follower) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let followerX = mouseX;
  let followerY = mouseY;
  const followStrength = 0.015;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
  });

  function animateFollower() {
    followerX += (mouseX - followerX) * followStrength;
    followerY += (mouseY - followerY) * followStrength;

    follower.style.left = `${followerX}px`;
    follower.style.top = `${followerY}px`;

    requestAnimationFrame(animateFollower);
  }

  requestAnimationFrame(animateFollower);

  // Expand cursor over interactive elements
  const hoverElements = document.querySelectorAll('a, button, .project-card, input, select, textarea');
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', () => follower.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => follower.classList.remove('cursor-hover'));
  });
}

/* --------------------------------------------------------------------------
   9. Active Navigation Spy & Back to Top
   -------------------------------------------------------------------------- */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.site-nav__link');
  const backToTopBtn = document.getElementById('back-to-top');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
