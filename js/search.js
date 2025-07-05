// Search functionality for Viewer Audit

class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.suggestionsContainer = document.getElementById('search-suggestions');
        this.recentList = document.getElementById('recent-list');
        this.currentPlatform = 'twitch';
        this.suggestions = [];
        this.searchTimeout = null; // For debouncing

        this.initializeElements();
        this.bindEvents();
        this.loadRecentSearches();
    }

    initializeElements() {
        // Set initial platform
        this.setPlatform('twitch');
    }

    bindEvents() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // Set new timeout for debounced search
            this.searchTimeout = setTimeout(() => {
                this.handleSearchInput(query);
            }, 300); // 300ms delay
        });

        this.searchInput.addEventListener('focus', () => {
            const query = this.searchInput.value.trim();
            if (query) {
                this.handleSearchInput(query);
            }
        });

        this.searchInput.addEventListener('blur', () => {
            // Delay hiding suggestions to allow for clicks
            setTimeout(() => {
                this.hideSuggestions();
            }, 200);
        });

        // Search button
        this.searchBtn.addEventListener('click', () => {
            this.performSearch();
        });

        // Platform toggle
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                this.setPlatform(platform);
                
                // Clear search and suggestions when switching platforms
                this.searchInput.value = '';
                this.hideSuggestions();
            });
        });

        // Enter key
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Escape key
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSuggestions();
                this.searchInput.blur();
            }
        });
    }

    setPlatform(platform) {
        this.currentPlatform = platform;
        
        // Update UI
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.platform === platform);
        });

        // Clear suggestions and search
        this.hideSuggestions();
        this.searchInput.value = '';
    }

    async handleSearchInput(query) {
        if (!query.trim()) {
            this.hideSuggestions();
            return;
        }

        // Check if it's a URL
        const platform = ViewerAuditUtils.URLUtils.detectPlatform(query);
        if (platform) {
            this.setPlatform(platform);
            const channelName = platform === 'twitch' 
                ? ViewerAuditUtils.URLUtils.parseTwitchUrl(query)
                : ViewerAuditUtils.URLUtils.parseKickUrl(query);
            
            if (channelName) {
                this.searchInput.value = channelName;
                this.performSearch();
                return;
            }
        }

        // Show loading state
        this.showSuggestions();
        this.suggestionsContainer.innerHTML = '<div class="suggestion-item">Searching...</div>';

        try {
            // Get suggestions from API
            const suggestions = await ViewerAuditAPI.searchChannels(this.currentPlatform, query, 5);
            this.suggestions = suggestions;
            this.renderSuggestions();
        } catch (error) {
            console.error('Error getting suggestions:', error);
            
            // For Kick, show some helpful suggestions even if API fails
            if (this.currentPlatform === 'kick') {
                this.suggestions = [
                    {
                        name: 'adinross',
                        login: 'adinross',
                        viewers: 0,
                        isLive: false,
                        platform: 'kick',
                        avatar: ''
                    },
                    {
                        name: 'trainwreckstv',
                        login: 'trainwreckstv',
                        viewers: 0,
                        isLive: false,
                        platform: 'kick',
                        avatar: ''
                    },
                    {
                        name: 'destiny',
                        login: 'destiny',
                        viewers: 0,
                        isLive: false,
                        platform: 'kick',
                        avatar: ''
                    }
                ].filter(channel => 
                    channel.name.toLowerCase().includes(query.toLowerCase())
                );
                this.renderSuggestions();
            } else {
                this.suggestionsContainer.innerHTML = '<div class="suggestion-item">Error loading suggestions</div>';
            }
        }
    }

    renderSuggestions() {
        if (!this.suggestions.length) {
            this.suggestionsContainer.innerHTML = '<div class="suggestion-item">No channels found</div>';
            return;
        }

        this.suggestionsContainer.innerHTML = this.suggestions.map(channel => `
            <div class="suggestion-item" data-channel="${channel.login}" data-platform="${channel.platform}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${channel.avatar}" alt="${channel.name}" style="width: 24px; height: 24px; border-radius: 50%;">
                    <div>
                        <div style="font-weight: 500;">${channel.name}</div>
                        <div style="font-size: 12px; color: #6b7280;">
                            ${channel.isLive ? '🔴 Live' : '⚫ Offline'} • ${ViewerAuditUtils.formatNumber(channel.viewers ?? 0)} viewers
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const channel = item.dataset.channel;
                const platform = item.dataset.platform;
                
                if (platform !== this.currentPlatform) {
                    this.setPlatform(platform);
                }
                
                this.searchInput.value = channel;
                this.performSearch();
            });
        });
    }

    showSuggestions() {
        this.suggestionsContainer.style.display = 'block';
    }

    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        
        if (!query) {
            ViewerAuditUtils.showNotification('Please enter a channel name', 'warning');
            return;
        }

        if (!ViewerAuditUtils.validateChannelName(query)) {
            ViewerAuditUtils.showNotification('Please enter a valid channel name', 'warning');
            return;
        }

        // Hide suggestions
        this.hideSuggestions();

        // Show loading with platform-specific message
        const loadingMessage = this.currentPlatform === 'kick' ? 'Analyzing Kick channel (this may take a moment)...' : 'Analyzing channel...';
        console.log('Showing loading for:', this.currentPlatform, 'with message:', loadingMessage);
        ViewerAuditUtils.showLoading(loadingMessage);

        try {
            console.log('Starting search for:', query, 'on platform:', this.currentPlatform);
            
            // Add to recent searches
            ViewerAuditUtils.RecentSearches.add({
                query: query,
                platform: this.currentPlatform
            });

            // Perform search with timeout
            console.log('Calling getChannelAnalysis...');
            const analysis = await Promise.race([
                ViewerAuditAPI.getChannelAnalysis(this.currentPlatform, query),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Search timeout - please try again')), 15000)
                )
            ]);
            console.log('Search completed successfully:', analysis);
            
            // Hide loading
            console.log('Hiding loading...');
            ViewerAuditUtils.hideLoading();

            // Display results
            this.displayResults(analysis);

            // Update recent searches
            this.loadRecentSearches();

        } catch (error) {
            console.error('Search error:', error);
            console.log('Hiding loading due to error...');
            ViewerAuditUtils.hideLoading();
            
            let errorMessage = 'Failed to analyze channel';
            if (error.message.includes('not found')) {
                errorMessage = 'Channel not found';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'Rate limit exceeded. Please try again later.';
            } else if (error.message.includes('API returned')) {
                errorMessage = 'Kick API temporarily unavailable. Please try again.';
            } else if (error.message.includes('timeout') || error.message.includes('Search timeout')) {
                errorMessage = this.currentPlatform === 'kick' ? 
                    'Kick search is taking too long. Please try again or check the channel name.' : 
                    'Search timeout - please try again';
            } else if (error.message.includes('Request timeout')) {
                errorMessage = 'Kick API is slow to respond. Please try again.';
            }
            
            ViewerAuditUtils.showNotification(errorMessage, 'error');
        }
    }

    displayResults(analysis) {
        const { channel, metrics, bottingAnalysis } = analysis;

        // Show results section
        document.getElementById('results-section').style.display = 'block';

        // Update channel info
        this.updateChannelInfo(channel);

        // Update metrics
        this.updateMetrics(metrics);

        // Update botting analysis
        this.updateBottingAnalysis(bottingAnalysis);

        // Update charts
        this.updateCharts(metrics);

        // Update action buttons
        this.updateActionButtons(channel);

        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    updateChannelInfo(channel) {
        const channelInfo = document.getElementById('channel-info');
        
        const statusClass = channel.isLive ? 'live' : 'offline';
        const statusText = channel.isLive ? '🔴 Live' : '⚫ Offline';
        
        channelInfo.innerHTML = `
            <img src="${channel.avatar}" alt="${channel.name}" class="channel-avatar">
            <div class="channel-details">
                <h4>${channel.name}</h4>
                <p>
                    <span class="status-indicator">
                        <span class="status-dot ${statusClass}"></span>
                        ${statusText}
                    </span>
                    ${channel.game ? ` • ${channel.game}` : ''}
                    ${channel.viewers > 0 ? ` • ${ViewerAuditUtils.formatNumber(channel.viewers)} viewers` : ''}
                </p>
                ${channel.title ? `<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">${channel.title}</p>` : ''}
            </div>
        `;
    }

    updateMetrics(metrics) {
        const metricsGrid = document.getElementById('metrics-grid');
        
        metricsGrid.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${ViewerAuditUtils.formatNumber(metrics.viewers)}</div>
                <div class="metric-label">Live Viewers</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${ViewerAuditUtils.formatNumber(metrics.chatters)}</div>
                <div class="metric-label">Active Chatters</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${ViewerAuditUtils.formatNumber(metrics.followers)}</div>
                <div class="metric-label">Followers</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.viewerToChatterRatio.toFixed(1)}:1</div>
                <div class="metric-label">Viewer/Chatter Ratio</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${ViewerAuditUtils.formatDuration(metrics.streamDuration)}</div>
                <div class="metric-label">Stream Duration</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(metrics.chatRate * 100).toFixed(1)}%</div>
                <div class="metric-label">Chat Rate</div>
            </div>
        `;
    }

    updateBottingAnalysis(bottingAnalysis) {
        const bottingSection = document.getElementById('botting-analysis');
        
        // Determine level based on score
        let level = 'low';
        if (bottingAnalysis.score >= 70) {
            level = 'high';
        } else if (bottingAnalysis.score >= 30) {
            level = 'medium';
        }
        
        const scoreClass = `score-${level}`;
        const scoreColor = level === 'low' ? '#10b981' : 
                          level === 'medium' ? '#f59e0b' : '#ef4444';
        const riskLabel = level.toUpperCase();
        const riskIcon = level === 'low' ? '🟢' : level === 'medium' ? '🟠' : '🔴';
        
        // Get confidence level and color
        const confidence = bottingAnalysis.confidence || 'medium';
        const confidenceColor = confidence === 'high' ? '#10b981' : 
                               confidence === 'medium' ? '#f59e0b' : '#ef4444';
        const confidenceIcon = confidence === 'high' ? '🟢' : 
                              confidence === 'medium' ? '🟠' : '🔴';
        
        // Get detailed metrics
        const details = bottingAnalysis.details || {};
        
        bottingSection.innerHTML = `
            <div class="botting-score-visual" style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; flex-direction: column; align-items: center; min-width: 90px;">
                    <div class="score-circle ${scoreClass}" style="background: ${scoreColor}; width: 70px; height: 70px; font-size: 1.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; font-weight: bold;">${bottingAnalysis.score}%</div>
                    <div style="font-size: 1rem; font-weight: 700; color: ${scoreColor}; text-align: center;">${riskIcon} ${riskLabel}</div>
                    <div style="font-size: 0.8rem; color: ${confidenceColor}; text-align: center; margin-top: 0.25rem;">${confidenceIcon} ${confidence.toUpperCase()} CONFIDENCE</div>
                </div>
                <div style="flex: 1;">
                    <div class="progress" style="width: 100%; height: 18px; background: #f3f4f6; border-radius: 9px; overflow: hidden; margin-bottom: 0.5rem;">
                        <div class="progress-bar" style="height: 100%; width: ${bottingAnalysis.score}%; background: ${scoreColor}; transition: width 0.5s;"></div>
                    </div>
                    <div style="font-size: 1.1rem; font-weight: 600; color: #222; margin-bottom: 0.25rem;">Botting Likelihood: <span style="color: ${scoreColor};">${riskLabel}</span></div>
                    <div style="font-size: 0.95rem; color: #6b7280;">Advanced AI analysis with ${confidence} confidence</div>
                </div>
            </div>
            
            <div class="botting-metrics" style="background: #f8fafc; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                <h5 style="font-size: 0.9rem; font-weight: 700; color: #374151; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Key Metrics:</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem;">
                    <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 3px solid #6366f1;">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">Engagement Rate</div>
                        <div style="font-size: 1rem; font-weight: 600; color: #374151;">${details.engagementRate || 'N/A'}</div>
                    </div>
                    <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 3px solid #8b5cf6;">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">Viewer/Follower Ratio</div>
                        <div style="font-size: 1rem; font-weight: 600; color: #374151;">${details.viewerToFollowerRatio || 'N/A'}</div>
                    </div>
                    <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 3px solid #10b981;">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">Chat Rate</div>
                        <div style="font-size: 1rem; font-weight: 600; color: #374151;">${details.chatRate || 'N/A'}</div>
                    </div>
                    <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 3px solid #f59e0b;">
                        <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem;">Viewers/Hour</div>
                        <div style="font-size: 1rem; font-weight: 600; color: #374151;">${details.viewersPerHour || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="botting-reasons" style="background: #fff; border-radius: 8px; padding: 1.25rem; margin-top: 0.5rem;">
                <h5 style="font-size: 1rem; font-weight: 700; color: #f59e0b; margin-bottom: 0.75rem;">Analysis Details:</h5>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${(bottingAnalysis.reasons || []).map(reason => `
                        <li style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: #374151; font-size: 1rem;">
                            <span style="font-size: 1.2em;">${riskIcon}</span> ${reason}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    updateCharts(metrics) {
        const chartsSection = document.getElementById('charts-section');
        
        // Create engagement chart
        const engagementData = [
            { label: 'Viewers', value: metrics.viewers },
            { label: 'Chatters', value: metrics.chatters },
            { label: 'Followers', value: metrics.followers }
        ];

        chartsSection.innerHTML = `
            <div class="chart-container">
                <div class="chart-title">Engagement Overview</div>
                <div id="engagement-chart"></div>
            </div>
        `;

        const chartContainer = document.getElementById('engagement-chart');
        ViewerAuditCharts.ChartFactory.createBarChart(chartContainer, engagementData, {
            width: chartContainer.offsetWidth || 600,
            height: 300,
            colors: ['#6366f1', '#8b5cf6', '#10b981']
        });
    }

    updateActionButtons(channel) {
        const shareBtn = document.getElementById('share-btn');
        // Remove heart button logic
        shareBtn.onclick = () => {
            this.showShareOptions(channel);
        };
    }

    showShareOptions(channel) {
        // Remove any existing share modal
        const existing = document.getElementById('share-modal');
        if (existing) existing.remove();

        // Get botting score and risk
        const bottingSection = document.getElementById('botting-analysis');
        let score = 0;
        let risk = '';
        const scoreCircle = bottingSection.querySelector('.score-circle');
        if (scoreCircle) {
            score = scoreCircle.textContent.replace('%', '');
        }
        const riskLabel = bottingSection.querySelector('div[style*="font-weight: 700"]');
        if (riskLabel) {
            risk = riskLabel.textContent.trim();
        }

        // Build share URL
        const url = channel.platform === 'twitch' 
            ? `https://twitch.tv/${channel.login}`
            : `https://kick.com/${channel.login}`;
        const text = `Check out ${channel.name} on ${channel.platform}!\nBotting Likelihood: ${score}% (${risk})\n${url}`;
        const tweet = encodeURIComponent(`Viewer Audit: ${channel.name} on ${channel.platform}\nBotting Likelihood: ${score}% (${risk})\n${url}`);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${tweet}`;

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.style.position = 'fixed';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.2)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '2000';

        modal.innerHTML = `
            <div style="background: #23263a; color: #f9fafb; border-radius: 16px; padding: 2rem; min-width: 260px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
                <div style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Share Channel</div>
                <button id="copy-link-btn" class="btn btn-primary" style="width: 100%;">Copy Link</button>
                <button id="share-twitter-btn" class="btn btn-secondary" style="width: 100%; background: #1da1f2; color: #fff;">Share to Twitter</button>
                <button id="close-share-modal" class="btn btn-danger" style="width: 100%;">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Copy Link
        modal.querySelector('#copy-link-btn').onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
                ViewerAuditUtils.showNotification('Link copied to clipboard!', 'success');
                modal.remove();
            });
        };
        // Share to Twitter
        modal.querySelector('#share-twitter-btn').onclick = () => {
            window.open(twitterUrl, '_blank');
            modal.remove();
        };
        // Close
        modal.querySelector('#close-share-modal').onclick = () => {
            modal.remove();
        };
        // Dismiss on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    shareResults(channel) {
        const url = channel.platform === 'twitch' 
            ? `https://twitch.tv/${channel.login}`
            : `https://kick.com/${channel.login}`;
        
        const text = `Check out ${channel.name} on ${channel.platform}! ${url}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Viewer Audit Results',
                text: text,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                ViewerAuditUtils.showNotification('Link copied to clipboard!', 'success');
            });
        }
    }

    loadRecentSearches() {
        const recentSearches = ViewerAuditUtils.RecentSearches.get();
        
        if (recentSearches.length === 0) {
            document.getElementById('recent-searches').style.display = 'none';
            return;
        }

        document.getElementById('recent-searches').style.display = 'block';
        
        this.recentList.innerHTML = recentSearches.map(search => `
            <div class="recent-item" data-query="${search.query}" data-platform="${search.platform}">
                ${search.query} (${search.platform})
            </div>
        `).join('');

        // Add click handlers
        this.recentList.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                const platform = item.dataset.platform;
                
                this.setPlatform(platform);
                this.searchInput.value = query;
                this.performSearch();
            });
        });
    }
}

// Initialize search manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.searchManager = new SearchManager();
}); 