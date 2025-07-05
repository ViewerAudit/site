// API handling for Viewer Audit

// API Configuration
const API_CONFIG = {
    twitch: {
        clientId: 'm3y8neekuu7dcjzb9tluw4zwwmxcuj',
        clientSecret: '355k5929537n9hal9gbnz2sjzvjwt3',
        baseUrl: 'https://api.twitch.tv/helix',
        authUrl: 'https://id.twitch.tv/oauth2/token'
    },
    kick: {
        clientId: '01JVJNAY16ZC1ZPSE511C7EJFY',
        clientSecret: 'f4f97e275e9a4a85b51101ed3986d723f0486d33abc7ed982790688f4b2086b2',
        baseUrl: 'https://kick.com/api/v1'
    }
};

// Timeout wrapper for API calls
async function withTimeout(promise, timeoutMs = 10000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
}

// Token management
let twitchToken = null;
let twitchTokenExpiry = null;

// Get Twitch access token
async function getTwitchToken() {
    if (twitchToken && twitchTokenExpiry && Date.now() < twitchTokenExpiry) {
        return twitchToken;
    }

    try {
        const response = await fetch(API_CONFIG.twitch.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: API_CONFIG.twitch.clientId,
                client_secret: API_CONFIG.twitch.clientSecret,
                grant_type: 'client_credentials'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get Twitch token');
        }

        const data = await response.json();
        twitchToken = data.access_token;
        twitchTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

        return twitchToken;
    } catch (error) {
        console.error('Error getting Twitch token:', error);
        throw error;
    }
}

// Generic API request function
async function apiRequest(url, options = {}) {
    try {
        console.log('Making API request to:', url);
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Non-JSON response received:', responseText.substring(0, 500));
            throw new Error(`Expected JSON response but got: ${contentType}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API request error:', error);
        console.error('Request URL:', url);
        console.error('Request options:', options);
        throw error;
    }
}

// Twitch API functions
const TwitchAPI = {
    // Search for channels
    async searchChannels(query, limit = 10) {
        const token = await getTwitchToken();
        const url = `${API_CONFIG.twitch.baseUrl}/search/channels?query=${encodeURIComponent(query)}&first=${limit}`;
        
        const data = await apiRequest(url, {
            headers: {
                'Client-ID': API_CONFIG.twitch.clientId,
                'Authorization': `Bearer ${token}`
            }
        });

        // Get logins of live channels
        const liveLogins = data.data.filter(channel => channel.is_live).map(channel => channel.broadcaster_login);
        let liveViewersMap = {};
        if (liveLogins.length > 0) {
            // Fetch viewer counts for all live channels in one call (up to 100)
            const streamsUrl = `${API_CONFIG.twitch.baseUrl}/streams?user_login=${liveLogins.map(encodeURIComponent).join('&user_login=')}`;
            const streamsData = await apiRequest(streamsUrl, {
                headers: {
                    'Client-ID': API_CONFIG.twitch.clientId,
                    'Authorization': `Bearer ${token}`
                }
            });
            // Map login to viewer_count
            streamsData.data.forEach(stream => {
                liveViewersMap[stream.user_login.toLowerCase()] = stream.viewer_count;
            });
        }

        return data.data.map(channel => ({
            id: channel.id,
            name: channel.display_name,
            login: channel.broadcaster_login,
            title: channel.title,
            game: channel.game_name,
            viewers: channel.is_live ? (liveViewersMap[channel.broadcaster_login.toLowerCase()] ?? 0) : 0,
            followers: 0, // Will be fetched separately
            avatar: channel.thumbnail_url,
            isLive: channel.is_live,
            startedAt: channel.started_at,
            platform: 'twitch'
        }));
    },

    // Get channel information
    async getChannel(login) {
        const token = await getTwitchToken();
        const url = `${API_CONFIG.twitch.baseUrl}/users?login=${login}`;
        
        const data = await apiRequest(url, {
            headers: {
                'Client-ID': API_CONFIG.twitch.clientId,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!data.data.length) {
            throw new Error('Channel not found');
        }

        const user = data.data[0];
        
        // Get stream information
        let streamData = null;
        try {
            const streamUrl = `${API_CONFIG.twitch.baseUrl}/streams?user_login=${login}`;
            const streamResponse = await apiRequest(streamUrl, {
                headers: {
                    'Client-ID': API_CONFIG.twitch.clientId,
                    'Authorization': `Bearer ${token}`
                }
            });
            streamData = streamResponse.data[0] || null;
        } catch (error) {
            console.warn('Could not fetch stream data:', error);
        }

        // Get follower count
        let followerCount = 0;
        try {
            // Updated endpoint for follower count
            const followersUrl = `${API_CONFIG.twitch.baseUrl}/channels/followers?broadcaster_id=${user.id}`;
            const followersResponse = await apiRequest(followersUrl, {
                headers: {
                    'Client-ID': API_CONFIG.twitch.clientId,
                    'Authorization': `Bearer ${token}`
                }
            });
            followerCount = followersResponse.total;
        } catch (error) {
            console.warn('Could not fetch follower count:', error);
        }

        return {
            id: user.id,
            name: user.display_name,
            login: user.login,
            title: streamData?.title || user.description || '',
            game: streamData?.game_name || '',
            viewers: streamData?.viewer_count || 0,
            followers: followerCount,
            avatar: user.profile_image_url,
            isLive: !!streamData,
            startedAt: streamData?.started_at || null,
            platform: 'twitch',
            description: user.description,
            createdAt: user.created_at
        };
    },

    // Get chat data (simulated since Twitch doesn't provide chat API)
    async getChatData(login) {
        // This would require WebSocket connection to Twitch chat
        // For now, we'll simulate based on viewer count
        const channel = await this.getChannel(login);
        
        // Estimate chatters based on viewer count (typical ratio is 1-5%)
        const estimatedChatters = Math.floor(channel.viewers * (0.01 + Math.random() * 0.04));
        
        return {
            chatters: estimatedChatters,
            chatRate: estimatedChatters / Math.max(channel.viewers, 1),
            messageCount: estimatedChatters * (10 + Math.random() * 20) // Random message count
        };
    }
};

// Kick API functions
const KickAPI = {
    // Search for channels - bypass CORS issues
    async searchChannels(query, limit = 10) {
        try {
            // Try direct search first (most reliable) with timeout
            const url = `${API_CONFIG.kick.baseUrl}/channels?search=${encodeURIComponent(query)}&limit=${limit}`;
            console.log('Kick direct search URL:', url);
            
            const response = await withTimeout(fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }), 5000); // 5 second timeout for direct search
            
            if (response.ok) {
                const data = await response.json();
                console.log('Kick direct search response:', data);

                if (data.data && Array.isArray(data.data)) {
                    return data.data.map(channel => ({
                        id: channel.id?.toString() || '',
                        name: channel.user?.username || channel.username || '',
                        login: channel.user?.username || channel.username || '',
                        title: channel.user_details?.bio || channel.bio || channel.livestream?.session_title || '',
                        game: channel.categories?.[0]?.name || channel.livestream?.categories?.[0]?.name || '',
                        viewers: channel.livestream?.viewer_count || channel.viewers_count || channel.viewers || 0,
                        followers: channel.followersCount || channel.followers_count || channel.followers || 0,
                        avatar: channel.user?.profile_pic || channel.user?.avatar?.url || channel.avatar?.url || channel.avatar || '',
                        isLive: channel.livestream?.is_live || channel.is_live || false,
                        startedAt: channel.livestream?.created_at || channel.created_at || null,
                        platform: 'kick'
                    }));
                }
            }
            
            // If direct search fails, try proxy
            console.log('Direct search failed, trying proxy...');
            return await this.searchChannelsProxy(query, limit);
            
        } catch (error) {
            console.error('Kick direct search error:', error);
            return await this.searchChannelsProxy(query, limit);
        }
    },

    // Proxy search method
    async searchChannelsProxy(query, limit = 10) {
        try {
            const kickUrl = `${API_CONFIG.kick.baseUrl}/channels?search=${encodeURIComponent(query)}&limit=${limit}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kickUrl)}`;
            
            console.log('Kick search URL (via proxy):', proxyUrl);
            
            const response = await withTimeout(fetch(proxyUrl), 8000); // 8 second timeout for proxy
            
            if (!response.ok) {
                console.warn('Kick search proxy failed, trying fallback');
                return await this.searchChannelsFallback(query, limit);
            }
            
            const data = await response.json();
            console.log('Kick search proxy response:', data);

            if (!data.data || !Array.isArray(data.data)) {
                console.warn('Kick API returned unexpected data structure:', data);
                return await this.searchChannelsFallback(query, limit);
            }

            return data.data.map(channel => ({
                id: channel.id?.toString() || '',
                name: channel.user?.username || channel.username || '',
                login: channel.user?.username || channel.username || '',
                title: channel.user_details?.bio || channel.bio || channel.livestream?.session_title || '',
                game: channel.categories?.[0]?.name || channel.livestream?.categories?.[0]?.name || '',
                viewers: channel.livestream?.viewer_count || channel.viewers_count || channel.viewers || 0,
                followers: channel.followersCount || channel.followers_count || channel.followers || 0,
                avatar: channel.user?.profile_pic || channel.user?.avatar?.url || channel.avatar?.url || channel.avatar || '',
                isLive: channel.livestream?.is_live || channel.is_live || false,
                startedAt: channel.livestream?.created_at || channel.created_at || null,
                platform: 'kick'
            }));
        } catch (error) {
            console.error('Kick search proxy error:', error);
            return await this.searchChannelsFallback(query, limit);
        }
    },

    // Fallback search method - try to get live channels and filter
    async searchChannelsFallback(query, limit = 10) {
        console.warn('Using fallback search for Kick - getting live channels');
        
        try {
            // Try to get all live channels and filter them
            const url = `${API_CONFIG.kick.baseUrl}/channels?limit=100`;
            const response = await withTimeout(fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }), 6000); // 6 second timeout for fallback
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.data && Array.isArray(data.data)) {
                    // Filter channels that match the query
                    const matching = data.data.filter(channel => {
                        const username = channel.user?.username || channel.username || '';
                        return username.toLowerCase().includes(query.toLowerCase());
                    }).slice(0, limit);
                    
                    return matching.map(channel => ({
                        id: channel.id?.toString() || '',
                        name: channel.user?.username || channel.username || '',
                        login: channel.user?.username || channel.username || '',
                        title: channel.user_details?.bio || channel.bio || channel.livestream?.session_title || '',
                        game: channel.categories?.[0]?.name || channel.livestream?.categories?.[0]?.name || '',
                        viewers: channel.livestream?.viewer_count || channel.viewers_count || channel.viewers || 0,
                        followers: channel.followersCount || channel.followers_count || channel.followers || 0,
                        avatar: channel.user?.profile_pic || channel.user?.avatar?.url || channel.avatar?.url || channel.avatar || '',
                        isLive: channel.livestream?.is_live || channel.is_live || false,
                        startedAt: channel.livestream?.created_at || channel.created_at || null,
                        platform: 'kick'
                    }));
                }
            }
        } catch (error) {
            console.error('Kick fallback search error:', error);
        }
        
        // If all else fails, return popular channels that match
        return await this.searchChannelsPopular(query, limit);
    },

    // Popular channels fallback
    async searchChannelsPopular(query, limit = 10) {
        console.warn('Using popular channels fallback for Kick');
        
        const popularChannels = [
            'adinross', 'trainwreckstv', 'destiny', 'hasanabi', 'pokelawls',
            'adinfinitum', 'xqc', 'shroud', 'ninja', 'pokimane', 'ludwig',
            'mizkif', 'esfand', 'asmongold', 'reckful', 'sodapoppin',
            'lirik', 'summit1g', 'pokimane', 'valkyrae', 'sykkuno',
            'corpse', 'disguisedtoast', 'fuslie', 'peterparktv', 'masayoshi',
            'ludwig', 'qtcinderella', 'maya', 'connoreatspants', 'sodapoppin',
            'reckful', 'lirik', 'summit1g', 'pokimane', 'valkyrae',
            'sykkuno', 'corpse', 'disguisedtoast', 'fuslie', 'peterparktv'
        ];
        
        const matching = popularChannels.filter(channel => 
            channel.toLowerCase().includes(query.toLowerCase()) ||
            query.toLowerCase().includes(channel.toLowerCase())
        ).slice(0, limit);
        
        if (matching.length === 0) {
            const similar = popularChannels.filter(channel => {
                const channelLower = channel.toLowerCase();
                const queryLower = query.toLowerCase();
                const queryParts = queryLower.split(/\s+/);
                return queryParts.some(part => 
                    part.length > 2 && channelLower.includes(part)
                );
            }).slice(0, limit);
            
            if (similar.length > 0) {
                matching.push(...similar);
            }
        }
        
        const uniqueMatches = [...new Set(matching)].slice(0, limit);
        
        const results = [];
        for (const channelName of uniqueMatches) {
            try {
                const channelData = await this.getChannel(channelName);
                results.push(channelData);
            } catch (error) {
                console.warn(`Could not fetch data for ${channelName}:`, error);
            }
        }
        
        return results;
    },

    // Get channel information - use multiple approaches
    async getChannel(username) {
        try {
            // Try proxy first
            const kickUrl = `${API_CONFIG.kick.baseUrl}/channels/${username}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kickUrl)}`;
            
            console.log('Kick channel URL (via proxy):', proxyUrl);
            
            const response = await withTimeout(fetch(proxyUrl), 8000); // 8 second timeout for proxy
            
            if (!response.ok) {
                console.warn('Kick channel proxy failed, trying direct');
                return await this.getChannelDirect(username);
            }
            
            const data = await response.json();
            console.log('Kick channel response data:', data);

            return this.formatChannelData(data);
        } catch (error) {
            console.error('Kick channel proxy error:', error);
            return await this.getChannelDirect(username);
        }
    },

    // Direct channel fetch
    async getChannelDirect(username) {
        try {
            const url = `${API_CONFIG.kick.baseUrl}/channels/${username}`;
            console.log('Kick direct channel URL:', url);
            
            const response = await withTimeout(fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }), 8000); // 8 second timeout for direct channel fetch
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Kick direct channel response:', data);

            return this.formatChannelData(data);
        } catch (error) {
            console.error('Kick direct channel error:', error);
            throw new Error(`Channel not found: ${username}`);
        }
    },

    // Format channel data consistently
    formatChannelData(data) {
        return {
            id: data.id?.toString() || '',
            name: data.user?.username || data.username || '',
            login: data.user?.username || data.username || '',
            title: data.user_details?.bio || data.bio || data.livestream?.session_title || '',
            game: data.categories?.[0]?.name || data.livestream?.categories?.[0]?.name || '',
            viewers: data.livestream?.viewer_count || data.viewers_count || data.viewers || 0,
            followers: data.followersCount || data.followers_count || data.followers || 0,
            avatar: data.user?.profile_pic || data.user?.avatar?.url || data.avatar?.url || data.avatar || '',
            isLive: data.livestream?.is_live || data.is_live || false,
            startedAt: data.livestream?.created_at || data.created_at || null,
            platform: 'kick',
            description: data.user_details?.bio || data.bio || '',
            createdAt: data.user?.created_at || data.created_at
        };
    },

    // Get chat data for Kick
    async getChatData(username) {
        const channel = await this.getChannel(username);
        
        const viewers = channel.viewers;
        const chatters = (() => {
            if (viewers < 500) {
                return Math.floor(viewers * 0.15);
            } else if (viewers < 2000) {
                return Math.floor(viewers * 0.10);
            } else if (viewers < 10000) {
                return Math.floor(viewers * 0.05);
            } else {
                return Math.floor(viewers * 0.03);
            }
        })();
        
        return {
            chatters: chatters,
            chatRate: chatters / Math.max(viewers, 1),
            messageCount: chatters * (15 + Math.random() * 25)
        };
    }
};

// Combined API interface
const API = {
    // Search channels on specified platform
    async searchChannels(platform, query, limit = 10) {
        try {
            if (platform === 'twitch') {
                return await TwitchAPI.searchChannels(query, limit);
            } else if (platform === 'kick') {
                return await KickAPI.searchChannels(query, limit);
            } else {
                throw new Error('Invalid platform');
            }
        } catch (error) {
            console.error(`Error searching ${platform} channels:`, error);
            throw error;
        }
    },

    // Get channel data from specified platform
    async getChannel(platform, identifier) {
        try {
            if (platform === 'twitch') {
                return await TwitchAPI.getChannel(identifier);
            } else if (platform === 'kick') {
                return await KickAPI.getChannel(identifier);
            } else {
                throw new Error('Invalid platform');
            }
        } catch (error) {
            console.error(`Error getting ${platform} channel:`, error);
            throw error;
        }
    },

    // Get chat data from specified platform
    async getChatData(platform, identifier) {
        try {
            if (platform === 'twitch') {
                return await TwitchAPI.getChatData(identifier);
            } else if (platform === 'kick') {
                return await KickAPI.getChatData(identifier);
            } else {
                throw new Error('Invalid platform');
            }
        } catch (error) {
            console.error(`Error getting ${platform} chat data:`, error);
            throw error;
        }
    },

    // Get complete channel analysis
    async getChannelAnalysis(platform, identifier) {
        try {
            const [channel, chatData] = await Promise.all([
                this.getChannel(platform, identifier),
                this.getChatData(platform, identifier)
            ]);

            // Calculate additional metrics
            const streamDuration = channel.startedAt ? 
                Math.floor((Date.now() - new Date(channel.startedAt).getTime()) / 1000) : 0;

            const metrics = {
                viewers: channel.viewers,
                chatters: chatData.chatters,
                followers: channel.followers,
                chatRate: chatData.chatRate,
                messageCount: chatData.messageCount,
                streamDuration,
                viewerToChatterRatio: channel.viewers > 0 ? channel.viewers / Math.max(chatData.chatters, 1) : 0,
                followerToViewerRatio: channel.viewers > 0 ? channel.followers / channel.viewers : 0
            };

            // Calculate botting score
            const bottingAnalysis = ViewerAuditUtils.calculateBottingScore(metrics);

            return {
                channel,
                metrics,
                bottingAnalysis,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`Error analyzing ${platform} channel:`, error);
            throw error;
        }
    },

    // Search across both platforms
    async searchAllPlatforms(query, limit = 5) {
        try {
            const [twitchResults, kickResults] = await Promise.allSettled([
                this.searchChannels('twitch', query, limit),
                this.searchChannels('kick', query, limit)
            ]);

            const results = [];
            
            if (twitchResults.status === 'fulfilled') {
                results.push(...twitchResults.value);
            }
            
            if (kickResults.status === 'fulfilled') {
                results.push(...kickResults.value);
            }

            return results;
        } catch (error) {
            console.error('Error searching all platforms:', error);
            throw error;
        }
    },

    // Get trending channels (simulated)
    async getTrendingChannels(platform, limit = 10) {
        try {
            // For now, we'll return some popular channels as trending
            const popularChannels = {
                twitch: ['pokimane', 'xqc', 'shroud', 'ninja', 'timthetatman'],
                kick: ['trainwreckstv', 'adinfinitum', 'destiny', 'hasanabi', 'pokelawls']
            };

            const channels = popularChannels[platform] || [];
            const results = [];

            for (const channel of channels.slice(0, limit)) {
                try {
                    const channelData = await this.getChannel(platform, channel);
                    results.push(channelData);
                } catch (error) {
                    console.warn(`Could not fetch trending channel ${channel}:`, error);
                }
            }

            return results;
        } catch (error) {
            console.error(`Error getting trending ${platform} channels:`, error);
            throw error;
        }
    }
};

// Export API for use in other modules
window.ViewerAuditAPI = API; 