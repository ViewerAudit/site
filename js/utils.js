// Utility functions for Viewer Audit

// Format numbers with appropriate suffixes (K, M, B)
function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Format duration in seconds to human readable format
function formatDuration(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

// Format date to relative time (e.g., "2 hours ago")
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

// Local storage utilities
const Storage = {
    // Get item from localStorage
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },

    // Set item in localStorage
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },

    // Remove item from localStorage
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    // Clear all localStorage
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// Recent searches management
const RecentSearches = {
    key: 'viewerAudit_recentSearches',
    maxItems: 10,

    get() {
        return Storage.get(this.key, []);
    },

    add(search) {
        const searches = this.get();
        const existingIndex = searches.findIndex(s => 
            s.query === search.query && s.platform === search.platform
        );

        if (existingIndex > -1) {
            searches.splice(existingIndex, 1);
        }

        searches.unshift({
            ...search,
            timestamp: Date.now()
        });

        if (searches.length > this.maxItems) {
            searches.splice(this.maxItems);
        }

        Storage.set(this.key, searches);
        return searches;
    },

    remove(query, platform) {
        const searches = this.get();
        const filtered = searches.filter(s => 
            !(s.query === query && s.platform === platform)
        );
        Storage.set(this.key, filtered);
        return filtered;
    },

    clear() {
        Storage.remove(this.key);
        return [];
    }
};

// Favorites management
const Favorites = {
    key: 'viewerAudit_favorites',

    get() {
        return Storage.get(this.key, []);
    },

    add(favorite) {
        const favorites = this.get();
        const existing = favorites.find(f => 
            f.channelId === favorite.channelId && f.platform === favorite.platform
        );

        if (!existing) {
            favorites.push({
                ...favorite,
                addedAt: Date.now()
            });
            Storage.set(this.key, favorites);
        }

        return favorites;
    },

    remove(channelId, platform) {
        const favorites = this.get();
        const filtered = favorites.filter(f => 
            !(f.channelId === channelId && f.platform === platform)
        );
        Storage.set(this.key, filtered);
        return filtered;
    },

    isFavorite(channelId, platform) {
        const favorites = this.get();
        return favorites.some(f => 
            f.channelId === channelId && f.platform === platform
        );
    },

    clear() {
        Storage.remove(this.key);
        return [];
    }
};

// Comparison management
const Comparison = {
    key: 'viewerAudit_comparison',
    maxItems: 4,

    get() {
        return Storage.get(this.key, []);
    },

    add(channel) {
        const comparison = this.get();
        const existing = comparison.find(c => 
            c.channelId === channel.channelId && c.platform === channel.platform
        );

        if (!existing) {
            if (comparison.length >= this.maxItems) {
                comparison.pop(); // Remove oldest
            }
            comparison.unshift({
                ...channel,
                addedAt: Date.now()
            });
            Storage.set(this.key, comparison);
        }

        return comparison;
    },

    remove(channelId, platform) {
        const comparison = this.get();
        const filtered = comparison.filter(c => 
            !(c.channelId === channelId && c.platform === platform)
        );
        Storage.set(this.key, filtered);
        return filtered;
    },

    clear() {
        Storage.remove(this.key);
        return [];
    }
};

// URL parsing utilities
const URLUtils = {
    // Extract channel name from Twitch URL
    parseTwitchUrl(url) {
        const match = url.match(/twitch\.tv\/([^\/\?]+)/);
        return match ? match[1] : null;
    },

    // Extract channel name from Kick URL
    parseKickUrl(url) {
        const match = url.match(/kick\.com\/([^\/\?]+)/);
        return match ? match[1] : null;
    },

    // Detect platform from URL
    detectPlatform(url) {
        if (url.includes('twitch.tv')) {
            return 'twitch';
        } else if (url.includes('kick.com')) {
            return 'kick';
        }
        return null;
    },

    // Clean channel name (remove @ symbol)
    cleanChannelName(name) {
        return name.replace(/^@/, '');
    }
};

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for API calls
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Show notification
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <h4 class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
            <button class="notification-close">&times;</button>
        </div>
        <p class="notification-message">${message}</p>
    `;

    document.body.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);

    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });

    return notification;
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = overlay.querySelector('p');
    messageEl.textContent = message;
    overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
}

// Validate channel name
function validateChannelName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    
    const cleanName = URLUtils.cleanChannelName(name.trim());
    
    // Basic validation for channel names
    if (cleanName.length < 3 || cleanName.length > 25) {
        return false;
    }
    
    // Allow letters, numbers, underscores, and hyphens
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(cleanName);
}

// Calculate botting score based on metrics with sophisticated real-world algorithms
function calculateBottingScore(metrics) {
    const viewers = metrics.viewers;
    const chatters = metrics.chatters;
    const followers = metrics.followers;
    const streamDuration = metrics.streamDuration || 0;
    const chatRate = metrics.chatRate || 0;
    
    if (!viewers || viewers === 0) {
        return { score: 0, reasons: ['No viewers'] };
    }

    // Initialize scoring components
    let totalScore = 0;
    const reasons = [];
    const weights = {
        engagement: 0.35,      // 35% weight for engagement metrics
        viewerPatterns: 0.25,  // 25% weight for viewer count patterns
        followerRatio: 0.20,   // 20% weight for follower relationships
        chatActivity: 0.15,    // 15% weight for chat activity
        streamMetrics: 0.05    // 5% weight for stream-specific metrics
    };

    // 1. ENGAGEMENT ANALYSIS (35% weight)
    const engagementRate = chatters / viewers;
    let engagementScore = 0;
    
    // Real-world engagement benchmarks based on actual streaming data
    if (engagementRate === 0) {
        engagementScore = 95;
        reasons.push('Zero engagement - highly suspicious for any viewer count');
    } else if (viewers < 100) {
        // Small streams: 15-25% engagement is normal
        if (engagementRate < 0.05) {
            engagementScore = 85;
            reasons.push('Very low engagement for small stream (< 5%)');
        } else if (engagementRate < 0.10) {
            engagementScore = 70;
            reasons.push('Below average engagement for small stream (< 10%)');
        } else if (engagementRate < 0.15) {
            engagementScore = 45;
            reasons.push('Moderate engagement for small stream (< 15%)');
        } else {
            engagementScore = Math.max(0, 30 - (engagementRate * 100));
        }
    } else if (viewers < 500) {
        // Medium-small streams: 8-15% engagement is normal
        if (engagementRate < 0.03) {
            engagementScore = 90;
            reasons.push('Extremely low engagement for medium stream (< 3%)');
        } else if (engagementRate < 0.05) {
            engagementScore = 80;
            reasons.push('Very low engagement for medium stream (< 5%)');
        } else if (engagementRate < 0.08) {
            engagementScore = 65;
            reasons.push('Below average engagement for medium stream (< 8%)');
        } else if (engagementRate < 0.12) {
            engagementScore = 40;
            reasons.push('Moderate engagement for medium stream (< 12%)');
        } else {
            engagementScore = Math.max(0, 25 - (engagementRate * 80));
        }
    } else if (viewers < 2000) {
        // Medium streams: 5-10% engagement is normal
        if (engagementRate < 0.02) {
            engagementScore = 92;
            reasons.push('Extremely low engagement for large stream (< 2%)');
        } else if (engagementRate < 0.03) {
            engagementScore = 85;
            reasons.push('Very low engagement for large stream (< 3%)');
        } else if (engagementRate < 0.05) {
            engagementScore = 75;
            reasons.push('Below average engagement for large stream (< 5%)');
        } else if (engagementRate < 0.08) {
            engagementScore = 55;
            reasons.push('Moderate engagement for large stream (< 8%)');
        } else {
            engagementScore = Math.max(0, 35 - (engagementRate * 60));
        }
    } else if (viewers < 10000) {
        // Large streams: 3-7% engagement is normal
        if (engagementRate < 0.01) {
            engagementScore = 95;
            reasons.push('Extremely low engagement for very large stream (< 1%)');
        } else if (engagementRate < 0.02) {
            engagementScore = 88;
            reasons.push('Very low engagement for very large stream (< 2%)');
        } else if (engagementRate < 0.03) {
            engagementScore = 80;
            reasons.push('Below average engagement for very large stream (< 3%)');
        } else if (engagementRate < 0.05) {
            engagementScore = 65;
            reasons.push('Moderate engagement for very large stream (< 5%)');
        } else {
            engagementScore = Math.max(0, 45 - (engagementRate * 50));
        }
    } else {
        // Massive streams: 1-4% engagement is normal
        if (engagementRate < 0.005) {
            engagementScore = 98;
            reasons.push('Extremely low engagement for massive stream (< 0.5%)');
        } else if (engagementRate < 0.01) {
            engagementScore = 92;
            reasons.push('Very low engagement for massive stream (< 1%)');
        } else if (engagementRate < 0.02) {
            engagementScore = 85;
            reasons.push('Below average engagement for massive stream (< 2%)');
        } else if (engagementRate < 0.03) {
            engagementScore = 70;
            reasons.push('Moderate engagement for massive stream (< 3%)');
        } else {
            engagementScore = Math.max(0, 50 - (engagementRate * 40));
        }
    }

    // 2. VIEWER PATTERN ANALYSIS (25% weight)
    let viewerPatternScore = 0;
    const viewerToFollowerRatio = viewers / (followers || 1);
    
    // Round number detection (common in viewbotting)
    if (viewers % 100 === 0 && viewers > 500) {
        viewerPatternScore += 25;
        reasons.push('Suspicious round viewer count (multiple of 100)');
    } else if (viewers % 50 === 0 && viewers > 200) {
        viewerPatternScore += 15;
        reasons.push('Suspicious round viewer count (multiple of 50)');
    }
    
    // Unrealistic viewer-to-follower ratios
    if (viewerToFollowerRatio > 2.0) {
        viewerPatternScore += 30;
        reasons.push('Extremely high viewer-to-follower ratio (> 200%)');
    } else if (viewerToFollowerRatio > 1.0) {
        viewerPatternScore += 20;
        reasons.push('Very high viewer-to-follower ratio (> 100%)');
    } else if (viewerToFollowerRatio > 0.5) {
        viewerPatternScore += 10;
        reasons.push('High viewer-to-follower ratio (> 50%)');
    }
    
    // Sudden viewer spikes (if stream duration available)
    if (streamDuration > 0) {
        const viewersPerHour = viewers / (streamDuration / 3600);
        if (viewersPerHour > 5000) {
            viewerPatternScore += 20;
            reasons.push('Unrealistic viewer growth rate (> 5000/hour)');
        } else if (viewersPerHour > 2000) {
            viewerPatternScore += 15;
            reasons.push('Very high viewer growth rate (> 2000/hour)');
        }
    }

    // 3. FOLLOWER RATIO ANALYSIS (20% weight)
    let followerRatioScore = 0;
    
    // New channels with high viewers
    if (followers < 100 && viewers > 1000) {
        followerRatioScore += 35;
        reasons.push('Very high viewers with very few followers');
    } else if (followers < 500 && viewers > 2000) {
        followerRatioScore += 25;
        reasons.push('High viewers with few followers');
    } else if (followers < 1000 && viewers > 5000) {
        followerRatioScore += 20;
        reasons.push('Massive viewers with low follower count');
    }
    
    // Follower engagement patterns
    const followerEngagement = (chatters / (followers || 1)) * 100;
    if (followerEngagement < 0.1 && viewers > 500) {
        followerRatioScore += 15;
        reasons.push('Extremely low follower engagement (< 0.1%)');
    }

    // 4. CHAT ACTIVITY ANALYSIS (15% weight)
    let chatActivityScore = 0;
    
    // Chat rate analysis
    if (chatRate > 0) {
        if (chatRate < 0.05) {
            chatActivityScore += 25;
            reasons.push('Extremely low chat activity (< 5% of viewers chatting)');
        } else if (chatRate < 0.1) {
            chatActivityScore += 20;
            reasons.push('Very low chat activity (< 10% of viewers chatting)');
        } else if (chatRate < 0.2) {
            chatActivityScore += 15;
            reasons.push('Low chat activity (< 20% of viewers chatting)');
        }
    }
    
    // Message frequency analysis
    const messagesPerChatter = metrics.messageCount / Math.max(chatters, 1);
    if (messagesPerChatter > 100) {
        chatActivityScore += 20;
        reasons.push('Suspiciously high messages per chatter (> 100)');
    } else if (messagesPerChatter > 50) {
        chatActivityScore += 15;
        reasons.push('Very high messages per chatter (> 50)');
    }

    // 5. STREAM METRICS ANALYSIS (5% weight)
    let streamMetricsScore = 0;
    
    // Stream duration vs viewer count patterns
    if (streamDuration > 0) {
        const viewersPerMinute = viewers / (streamDuration / 60);
        if (viewersPerMinute > 100 && streamDuration < 3600) {
            streamMetricsScore += 20;
            reasons.push('Unrealistic viewer count for stream duration');
        }
    }

    // Calculate weighted final score
    totalScore = (
        (engagementScore * weights.engagement) +
        (viewerPatternScore * weights.viewerPatterns) +
        (followerRatioScore * weights.followerRatio) +
        (chatActivityScore * weights.chatActivity) +
        (streamMetricsScore * weights.streamMetrics)
    );

    // Apply minimum thresholds for extreme cases
    if (engagementRate < 0.005) {
        totalScore = Math.max(totalScore, 85);
    }
    if (engagementRate < 0.01) {
        totalScore = Math.max(totalScore, 75);
    }
    if (chatters === 0 && viewers > 100) {
        totalScore = Math.max(totalScore, 90);
    }

    // Cap the final score
    const finalScore = Math.min(Math.round(totalScore), 98);

    // Determine confidence level
    let confidence = 'high';
    if (finalScore < 30) confidence = 'low';
    else if (finalScore < 60) confidence = 'medium';

    return {
        score: finalScore,
        reasons: reasons.slice(0, 6), // Top 6 reasons
        confidence: confidence,
        details: {
            engagementRate: (engagementRate * 100).toFixed(2) + '%',
            viewerToFollowerRatio: viewerToFollowerRatio.toFixed(2),
            chatRate: (chatRate * 100).toFixed(2) + '%',
            viewersPerHour: streamDuration > 0 ? Math.round(viewers / (streamDuration / 3600)) : 'N/A'
        }
    };
}

// Generate unique device ID for anonymous tracking
function generateDeviceId() {
    let deviceId = Storage.get('viewerAudit_deviceId');
    
    if (!deviceId) {
        // Generate a simple device fingerprint
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        const fingerprint = canvas.toDataURL();
        const hash = btoa(fingerprint).substring(0, 16);
        
        deviceId = `device_${hash}_${Date.now()}`;
        Storage.set('viewerAudit_deviceId', deviceId);
    }
    
    return deviceId;
}

// Export utilities for use in other modules
window.ViewerAuditUtils = {
    formatNumber,
    formatDuration,
    formatRelativeTime,
    Storage,
    RecentSearches,
    Favorites,
    Comparison,
    URLUtils,
    debounce,
    throttle,
    showNotification,
    showLoading,
    hideLoading,
    validateChannelName,
    calculateBottingScore,
    generateDeviceId
}; 