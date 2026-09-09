// Initialize Lucide Icons
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    const toggleMenu = () => {
        const isClosed = mobileMenu.classList.contains('translate-x-full');
        if (isClosed) {
            mobileMenu.classList.remove('translate-x-full');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        } else {
            mobileMenu.classList.add('translate-x-full');
            document.body.style.overflow = '';
        }
    };

    mobileBtn.addEventListener('click', toggleMenu);
    closeBtn.addEventListener('click', toggleMenu);
    
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('translate-x-full');
            document.body.style.overflow = '';
        });
    });

    // --- Sticky Header & Back to Top ---
    const header = document.getElementById('main-header');
    const backToTopBtn = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }

        if (window.scrollY > 500) {
            backToTopBtn.classList.remove('translate-y-20', 'opacity-0');
            backToTopBtn.classList.add('translate-y-0', 'opacity-100');
        } else {
            backToTopBtn.classList.add('translate-y-20', 'opacity-0');
            backToTopBtn.classList.remove('translate-y-0', 'opacity-100');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Active Nav Link Highlighting ---
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const highlightActiveNav = () => {
        const scrollY = window.scrollY;
        
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 100; // Offset for header
            const sectionId = current.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if(link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', highlightActiveNav);

    // --- Scroll Animations (Intersection Observer) ---
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        scrollObserver.observe(el);
    });

    // --- Article Filtering & Searching ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    const articles = document.querySelectorAll('.article-card');
    const searchInput = document.getElementById('global-search');
    const mobileSearchInput = document.querySelector('#mobile-menu input[type="text"]');
    const noResultsMsg = document.getElementById('no-results');

    const filterArticles = () => {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        const searchTerm = (searchInput.value || mobileSearchInput.value).toLowerCase();
        let visibleCount = 0;

        articles.forEach(article => {
            const category = article.dataset.category;
            const textContent = article.textContent.toLowerCase();
            
            const matchesFilter = activeFilter === 'all' || category === activeFilter;
            const matchesSearch = textContent.includes(searchTerm);

            if (matchesFilter && matchesSearch) {
                article.style.display = 'block';
                // Small animation
                article.style.opacity = '0';
                setTimeout(() => {
                    article.style.transition = 'opacity 0.3s ease';
                    article.style.opacity = '1';
                }, 10);
                visibleCount++;
            } else {
                article.style.display = 'none';
            }
        });

        if (visibleCount === 0) {
            noResultsMsg.classList.remove('hidden');
        } else {
            noResultsMsg.classList.add('hidden');
        }
    };

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('bg-gold-600', 'text-dark-900');
                b.classList.add('bg-dark-800', 'text-slate-300');
                b.classList.remove('active');
            });
            
            btn.classList.add('active', 'bg-gold-600', 'text-dark-900');
            btn.classList.remove('bg-dark-800', 'text-slate-300');
            
            filterArticles();
        });
    });

    searchInput.addEventListener('input', filterArticles);
    mobileSearchInput.addEventListener('input', filterArticles);
    
    // Keyboard shortcut for search
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // --- File Upload UI ---
    const fileInput = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name-display');
    const dropZone = document.getElementById('drop-zone');

    const handleFiles = (files) => {
        if (files.length > 0) {
            const file = files[0];
            // Simple validation
            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
                if (file.size <= 25 * 1024 * 1024) { // 25MB
                    fileNameDisplay.textContent = file.name;
                    fileNameDisplay.classList.add('text-gold-400');
                    fileNameDisplay.classList.remove('text-slate-500');
                    document.getElementById('file-error').classList.add('hidden');
                } else {
                    fileNameDisplay.textContent = 'File too large (Max 25MB)';
                    fileInput.value = '';
                }
            } else {
                fileNameDisplay.textContent = 'Invalid file type (.pdf or .docx only)';
                fileInput.value = '';
            }
        }
    };

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files; // Assign to input
        handleFiles(files);
    }, false);

    // Click on dropzone to trigger input
    dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput && e.target.tagName !== 'LABEL') {
            fileInput.click();
        }
    });

    // --- Form Validation & Submission ---
    const form = document.getElementById('submission-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;
        
        // Custom validation logic
        const validateInput = (id) => {
            const el = document.getElementById(id);
            const errorMsg = el.nextElementSibling;
            if (!el.value.trim() || (el.type === 'checkbox' && !el.checked)) {
                errorMsg.classList.remove('hidden');
                el.classList.add('border-red-500');
                isValid = false;
            } else {
                errorMsg.classList.add('hidden');
                el.classList.remove('border-red-500');
            }
        };

        validateInput('author-name');
        
        const email = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim() || !emailRegex.test(email.value)) {
            email.nextElementSibling.classList.remove('hidden');
            email.classList.add('border-red-500');
            isValid = false;
        } else {
            email.nextElementSibling.classList.add('hidden');
            email.classList.remove('border-red-500');
        }

        validateInput('domain');
        validateInput('paper-title');
        validateInput('abstract');
        
        if (fileInput.files.length === 0) {
            document.getElementById('file-error').classList.remove('hidden');
            isValid = false;
        }

        validateInput('declaration');

        if (isValid) {
            // Simulate API call
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Uploading...';
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-75', 'cursor-not-allowed');

            setTimeout(() => {
                form.reset();
                fileNameDisplay.textContent = 'No file chosen';
                fileNameDisplay.classList.remove('text-gold-400');
                fileNameDisplay.classList.add('text-slate-500');
                
                document.getElementById('form-success').classList.remove('hidden');
                
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                
                setTimeout(() => {
                    document.getElementById('form-success').classList.add('hidden');
                }, 5000);
            }, 1500);
        }
    });

    // Hide error messages on input
    form.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => {
            const errorMsg = el.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-msg')) {
                errorMsg.classList.add('hidden');
                el.classList.remove('border-red-500');
            }
            if (el.id === 'declaration') {
                 el.parentElement.nextElementSibling.querySelector('.error-msg').classList.add('hidden');
            }
        });
    });

    // --- Citation Modal ---
    const modal = document.getElementById('citation-modal');
    const modalContent = document.getElementById('citation-modal-content');
    const closeModalBtn = document.getElementById('close-citation');
    const citeBtns = document.querySelectorAll('.cite-btn');
    const citeTabs = document.querySelectorAll('.cite-tab-btn');
    const citationText = document.getElementById('citation-text');
    const copyBtn = document.getElementById('copy-citation');
    const copyFeedback = document.getElementById('copy-feedback');
    
    let currentArticleData = {};

    const formatCitation = (format, data) => {
        switch(format) {
            case 'apa':
                return `${data.authors} (${data.year}). ${data.title}. <i>Shivraj 350: International Peer Reviewed Multidisciplinary Journal</i>, 1(1).`;
            case 'mla':
                return `${data.authors}. "${data.title}." <i>Shivraj 350: International Peer Reviewed Multidisciplinary Journal</i>, vol. 1, no. 1, ${data.year}.`;
            case 'chicago':
                return `${data.authors}. "${data.title}." <i>Shivraj 350: International Peer Reviewed Multidisciplinary Journal</i> 1, no. 1 (${data.year}).`;
            case 'bibtex':
                const id = data.authors.split(',')[0].trim().toLowerCase() + data.year;
                return `@article{${id},<br>&nbsp;&nbsp;title={${data.title}},<br>&nbsp;&nbsp;author={${data.authors}},<br>&nbsp;&nbsp;journal={Shivraj 350: International Peer Reviewed Multidisciplinary Journal},<br>&nbsp;&nbsp;volume={1},<br>&nbsp;&nbsp;number={1},<br>&nbsp;&nbsp;year={${data.year}}<br>}`;
            default:
                return '';
        }
    };

    const openModal = (data) => {
        currentArticleData = data;
        
        // Reset tabs to APA
        citeTabs.forEach(t => {
            t.classList.remove('active', 'text-gold-400', 'border-gold-500');
            t.classList.add('text-slate-400', 'border-transparent');
        });
        citeTabs[0].classList.add('active', 'text-gold-400', 'border-gold-500');
        citeTabs[0].classList.remove('text-slate-400', 'border-transparent');
        
        citationText.innerHTML = formatCitation('apa', data);
        
        modal.classList.remove('hidden');
        // Trigger reflow
        void modal.offsetWidth;
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    };

    citeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const data = {
                title: btn.dataset.title,
                authors: btn.dataset.authors,
                year: btn.dataset.year
            };
            openModal(data);
        });
    });

    closeModalBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Handle Esc key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    citeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            citeTabs.forEach(t => {
                t.classList.remove('active', 'text-gold-400', 'border-gold-500');
                t.classList.add('text-slate-400', 'border-transparent');
            });
            tab.classList.add('active', 'text-gold-400', 'border-gold-500');
            tab.classList.remove('text-slate-400', 'border-transparent');
            
            const format = tab.dataset.format;
            citationText.innerHTML = formatCitation(format, currentArticleData);
        });
    });

    copyBtn.addEventListener('click', () => {
        const textToCopy = citationText.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyFeedback.classList.remove('opacity-0');
            setTimeout(() => {
                copyFeedback.classList.add('opacity-0');
            }, 2000);
        });
    });

    // --- Workflow Portal Modal & Role Switcher ---
    const workflowModal = document.getElementById('workflow-modal');
    const workflowModalContent = document.getElementById('workflow-modal-content');
    const closeWorkflowBtn = document.getElementById('close-workflow-modal');
    const workflowLinks = document.querySelectorAll('.workflow-portal-link');
    const workflowTabs = document.querySelectorAll('.workflow-tab-btn');
    const workflowTitle = document.getElementById('workflow-modal-title');
    const workflowHeading = document.getElementById('workflow-role-heading');
    const workflowDesc = document.getElementById('workflow-role-desc');
    const workflowEmailInput = document.getElementById('workflow-login-email');
    const workflowNextJsLink = document.getElementById('workflow-nextjs-link');
    const workflowQuickForm = document.getElementById('workflow-quick-form');
    const workflowStatus = document.getElementById('workflow-login-status');

    const roleConfig = {
        author: {
            title: 'Author Dashboard Login',
            heading: 'Author Self-Service Dashboard',
            desc: 'Submit and track manuscripts, monitor peer-review milestones, upload camera-ready revisions, and download editorial decision letters.',
            placeholder: 'author@shivaji.du.ac.in',
            nextjsHref: '/login/?role=author',
            destination: '/dashboard/'
        },
        reviewer: {
            title: 'Reviewer Portal Access',
            heading: 'Double-Blind Reviewer Workspace',
            desc: 'Secure referee station for evaluating assigned manuscripts under strict double-blind protocols with structured scorecard rubrics.',
            placeholder: 'reviewer@shivaji.du.ac.in',
            nextjsHref: '/login/?role=reviewer',
            destination: '/reviewer/'
        },
        editor: {
            title: 'Editorial Board Access',
            heading: 'Chief & Managing Editor Console',
            desc: 'Manuscript intake triage, Conflict-of-Interest checked referee assignment, plagiarism evaluation, and formal publication decisions.',
            placeholder: 'editor@shivaji.du.ac.in',
            nextjsHref: '/login/?role=editor',
            destination: '/editor/'
        }
    };

    let currentRole = 'author';

    const setRole = (role) => {
        if (!roleConfig[role]) return;
        currentRole = role;
        
        workflowTabs.forEach(tab => {
            const isMatch = tab.dataset.role === role;
            tab.classList.toggle('text-gold-400', isMatch);
            tab.classList.toggle('bg-dark-800', isMatch);
            tab.classList.toggle('border', isMatch);
            tab.classList.toggle('border-gold-500/30', isMatch);
            tab.classList.toggle('text-slate-400', !isMatch);
        });

        const cfg = roleConfig[role];
        if (workflowTitle) workflowTitle.textContent = cfg.title;
        if (workflowHeading) workflowHeading.textContent = cfg.heading;
        if (workflowDesc) workflowDesc.textContent = cfg.desc;
        if (workflowEmailInput) workflowEmailInput.placeholder = cfg.placeholder;
        if (workflowNextJsLink) workflowNextJsLink.href = cfg.nextjsHref;
        if (workflowStatus) {
            workflowStatus.className = 'hidden text-xs text-center p-2 rounded';
            workflowStatus.textContent = '';
        }
    };

    const openWorkflowModal = (role = 'author') => {
        if (!workflowModal) return;
        setRole(role);
        workflowModal.classList.remove('hidden');
        setTimeout(() => {
            workflowModalContent.classList.remove('scale-95', 'opacity-0');
            workflowModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        document.body.style.overflow = 'hidden';
    };

    const closeWorkflowModal = () => {
        if (!workflowModal) return;
        workflowModalContent.classList.remove('scale-100', 'opacity-100');
        workflowModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            workflowModal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    };

    workflowLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                const role = link.dataset.role || 'author';
                openWorkflowModal(role);
            }
        });
    });

    workflowTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setRole(tab.dataset.role);
        });
    });

    if (closeWorkflowBtn) closeWorkflowBtn.addEventListener('click', closeWorkflowModal);

    if (workflowModal) {
        workflowModal.addEventListener('click', (e) => {
            if (e.target === workflowModal) closeWorkflowModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && workflowModal && !workflowModal.classList.contains('hidden')) {
            closeWorkflowModal();
        }
    });

    if (workflowQuickForm) {
        workflowQuickForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const cfg = roleConfig[currentRole];
            if (workflowStatus) {
                workflowStatus.className = 'text-xs text-center p-2.5 rounded bg-amber-900/30 border border-amber-700/50 text-amber-300 block';
                workflowStatus.innerHTML = `Redirecting to <strong>${cfg.title}</strong>...`;
            }
            setTimeout(() => {
                window.location.href = cfg.nextjsHref;
            }, 800);
        });
    }

});
