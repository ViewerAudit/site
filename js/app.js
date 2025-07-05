// Main application for Viewer Audit

class ViewerAuditApp {
    constructor() {
        this.currentPage = 'home';
        this.initializeApp();
        this.bindEvents();
        this.loadInitialData();
    }

    initializeApp() {
        // Initialize navigation
        this.initializeNavigation();
        // Remove FAB and quick actions
        // Set up real-time updates
        this.initializeRealTimeUpdates();
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
            });
        });
    }

    navigateToPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
        // Hide all pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
        }
        // Handle page-specific initialization
        switch (page) {
            case 'home':
                this.loadRecentSearches();
                break;
            case 'about':
                break;
            case 'faq':
                break;
        }
    }

    loadRecentSearches() {
        if (window.searchManager) {
            window.searchManager.loadRecentSearches();
        }
    }

    loadInitialData() {
        // No favorites to load
    }

    initializeRealTimeUpdates() {
        setInterval(() => {
            this.updateLiveData();
        }, 30000);
    }

    async updateLiveData() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection.style.display === 'block') {
            if (window.searchManager && window.searchManager.searchInput.value) {
                try {
                    const analysis = await ViewerAuditAPI.getChannelAnalysis(
                        window.searchManager.currentPlatform,
                        window.searchManager.searchInput.value
                    );
                    window.searchManager.displayResults(analysis);
                } catch (error) {
                    console.warn('Failed to update live data:', error);
                }
            }
        }
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        if (window.searchManager) {
                            window.searchManager.searchInput.focus();
                        }
                        break;
                }
            }
        });
        window.addEventListener('resize', ViewerAuditUtils.debounce(() => {
            this.handleResize();
        }, 250));
    }

    handleResize() {
        const engagementChart = document.getElementById('engagement-chart');
        if (engagementChart && engagementChart.children.length > 0) {
            const container = engagementChart.parentElement;
            const width = container.offsetWidth;
            if (width > 0) {
                engagementChart.innerHTML = '';
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ViewerAuditApp();
    
    // Add global error handler
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        ViewerAuditUtils.showNotification('An unexpected error occurred', 'error');
    });
    
    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        ViewerAuditUtils.showNotification('An unexpected error occurred', 'error');
    });
});

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 