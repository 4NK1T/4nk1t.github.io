// Global variables
let allProjects = [];
let filteredProjects = [];
let currentPage = 1;
const projectsPerPage = 20;
let searchQuery = '';

// DOM elements - will be initialized after DOM loads
let projectsGrid, loading, noProjects, prevBtn, nextBtn, pageNumbers, pageInfo;
let totalProjectsSpan, latestDateSpan, modal, modalContent, closeModal;
let searchInput, clearSearch, searchResultsCount;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    projectsGrid = document.getElementById('projects-grid');
    loading = document.getElementById('loading');
    noProjects = document.getElementById('no-projects');
    prevBtn = document.getElementById('prev-btn');
    nextBtn = document.getElementById('next-btn');
    pageNumbers = document.getElementById('page-numbers');
    pageInfo = document.getElementById('page-info');
    totalProjectsSpan = document.getElementById('total-projects');
    latestDateSpan = document.getElementById('latest-date');
    modal = document.getElementById('project-modal');
    modalContent = document.getElementById('modal-content');
    closeModal = document.querySelector('.close');
    searchInput = document.getElementById('search-input');
    clearSearch = document.getElementById('clear-search');
    searchResultsCount = document.getElementById('search-results-count');
    
    loadProjects();
    setupModal();
    setupSearch();
    
    // Focus search input for better UX
    setTimeout(() => {
        searchInput.focus();
    }, 1000);
    
    // Event listeners for pagination buttons
    prevBtn.addEventListener('click', previousPage);
    nextBtn.addEventListener('click', nextPage);
    
    // Event delegation for page number buttons
    pageNumbers.addEventListener('click', function(e) {
        if (e.target.classList.contains('page-number')) {
            const pageNum = parseInt(e.target.textContent);
            console.log('Page number clicked via delegation:', pageNum);
            goToPage(pageNum);
        }
    });
});

// Load projects from JSON file
async function loadProjects() {
    try {
        showLoading(true);
        const response = await fetch('repos.json');
        if (!response.ok) {
            throw new Error('Failed to load projects');
        }
        
        allProjects = await response.json();
        
        // Sort projects by date (newest first)
        allProjects.sort((a, b) => new Date(b.date) - new Date(a.date));
        filteredProjects = [...allProjects];
        
        updateStats();
        renderProjects();
        setupPagination();
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading projects:', error);
        showError('Failed to load projects. Please try again later.');
        showLoading(false);
    }
}

// Setup search functionality
function setupSearch() {
    // Search input event listener
    searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value.toLowerCase().trim();
        performSearch();
    });
    
    // Clear search button
    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        searchQuery = '';
        performSearch();
    });
    
    // Keyboard shortcuts
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchQuery = '';
            performSearch();
        }
    });
}

// Perform search
function performSearch() {
    if (searchQuery === '') {
        filteredProjects = [...allProjects];
        clearSearch.style.display = 'none';
        searchResultsCount.textContent = 'All projects';
    } else {
        filteredProjects = allProjects.filter(project => {
            const name = project.name.toLowerCase();
            const description = project.description.toLowerCase();
            return name.includes(searchQuery) || description.includes(searchQuery);
        });
        clearSearch.style.display = 'block';
        searchResultsCount.textContent = `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} found`;
    }
    
    // Reset to first page when searching
    currentPage = 1;
    renderProjects();
    setupPagination();
}

// Update statistics
function updateStats() {
    totalProjectsSpan.textContent = allProjects.length.toLocaleString();
    
    if (allProjects.length > 0) {
        const latestDate = allProjects[0].date;
        latestDateSpan.textContent = formatDate(latestDate);
    }
}

// Render projects for current page
function renderProjects() {
    const startIndex = (currentPage - 1) * projectsPerPage;
    const endIndex = startIndex + projectsPerPage;
    const pageProjects = filteredProjects.slice(startIndex, endIndex);
    
    if (pageProjects.length === 0) {
        showNoProjects();
        return;
    }
    
    projectsGrid.innerHTML = pageProjects.map(project => createProjectCard(project)).join('');
    
    // Add click event listeners to project cards
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.project));
    });
}

// Create project card HTML
function createProjectCard(project) {
    const stars = project.stars ? parseInt(project.stars).toLocaleString() : '0';
    const description = project.description.length > 120 
        ? project.description.substring(0, 120) + '...' 
        : project.description;
    
    // Highlight search terms if there's a search query
    let highlightedName = project.name;
    let highlightedDescription = description;
    
    if (searchQuery) {
        const nameRegex = new RegExp(`(${searchQuery})`, 'gi');
        const descRegex = new RegExp(`(${searchQuery})`, 'gi');
        highlightedName = project.name.replace(nameRegex, '<mark>$1</mark>');
        highlightedDescription = description.replace(descRegex, '<mark>$1</mark>');
    }
    
    return `
        <div class="project-card" data-project='${JSON.stringify(project)}'>
            <a href="${project.url}" class="project-name" target="_blank" onclick="event.stopPropagation()">
                ${highlightedName}
            </a>
            <p class="project-description">${highlightedDescription}</p>
            <div class="project-meta">
                <div class="project-stars">
                    <i class="fas fa-star"></i>
                    <span>${stars}</span>
                </div>
                <div class="project-date">${formatDate(project.date)}</div>
            </div>
        </div>
    `;
}

// Setup pagination
function setupPagination() {
    const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
    
    // Update page info
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Update navigation buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Generate page numbers
    generatePageNumbers(currentPage, totalPages);
}

// Generate page number buttons
function generatePageNumbers(currentPage, totalPages) {
    console.log('Generating page numbers for currentPage:', currentPage, 'totalPages:', totalPages);
    console.log('pageNumbers element:', pageNumbers);
    
    pageNumbers.innerHTML = '';
    
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add first page if not visible
    if (startPage > 1) {
        addPageNumber(1);
        if (startPage > 2) {
            pageNumbers.innerHTML += '<span class="page-ellipsis">...</span>';
        }
    }
    
    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageNumber(i);
    }
    
    // Add last page if not visible
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers.innerHTML += '<span class="page-ellipsis">...</span>';
        }
        addPageNumber(totalPages);
    }
}

// Add page number button
function addPageNumber(pageNum) {
    const button = document.createElement('button');
    button.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
    button.textContent = pageNum;
    button.style.cursor = 'pointer'; // Ensure cursor shows it's clickable
    
    // Debug: Check if button is created properly
    console.log('Created button for page:', pageNum, button);
    
    pageNumbers.appendChild(button);
}

// Navigate to specific page
function goToPage(page) {
    console.log('Navigating to page:', page);
    currentPage = page;
    renderProjects();
    setupPagination();
    // Removed automatic scroll to top - let user stay where they are
}

// Previous page
function previousPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

// Next page
function nextPage() {
    const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// Setup modal functionality
function setupModal() {
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFunc();
        }
    });
    
    // Close modal with X button
    closeModal.addEventListener('click', closeModalFunc);
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModalFunc();
        }
    });
}

// Open project modal
function openModal(projectData) {
    const project = typeof projectData === 'string' ? JSON.parse(projectData) : projectData;
    
    modalContent.innerHTML = `
        <h2>${project.name}</h2>
        <p><strong>Description:</strong> ${project.description}</p>
        <p><strong>GitHub URL:</strong> <a href="${project.url}" class="project-url" target="_blank">${project.url}</a></p>
        <p><strong>Stars:</strong> ${parseInt(project.stars || 0).toLocaleString()}</p>
        <p><strong>Added:</strong> ${formatDate(project.date)}</p>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModalFunc() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Show loading state
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    projectsGrid.style.display = show ? 'none' : 'grid';
    noProjects.style.display = 'none';
}

// Show no projects message
function showNoProjects() {
    projectsGrid.innerHTML = '';
    projectsGrid.style.display = 'none';
    loading.style.display = 'none';
    noProjects.style.display = 'block';
    
    // Update message based on whether we're searching or not
    if (searchQuery) {
        noProjects.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>No projects found</h3>
            <p>No projects match "${searchQuery}". Try different keywords.</p>
        `;
    } else {
        noProjects.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>No projects found</h3>
            <p>Try adjusting your search criteria</p>
        `;
    }
}

// Show error message
function showError(message) {
    noProjects.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>${message}</p>
    `;
    showNoProjects();
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Add CSS for page ellipsis
const style = document.createElement('style');
style.textContent = `
    .page-ellipsis {
        color: #8B949E;
        padding: 10px 5px;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);
