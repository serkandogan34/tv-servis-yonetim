// ====================================
// Enhanced Event Tracking System
// GA4 & Facebook Pixel Advanced Analytics
// ====================================

class EnhancedEventTracker {
    constructor() {
        this.apiBaseUrl = '';
        this.isInitialized = false;
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.visitId = this.generateVisitId();
        this.pageStartTime = Date.now();
        this.scrollDepth = 0;
        this.maxScrollDepth = 0;
        this.eventQueue = [];
        this.isOnline = navigator.onLine;
        
        // Configuration
        this.config = {
            enableGA4: true,
            enableFacebookPixel: true,
            enableKVKVConsent: true,
            batchSize: 10,
            batchTimeout: 5000, // 5 seconds
            scrollThresholds: [25, 50, 75, 90, 100],
            timeThresholds: [10, 30, 60, 120, 300], // seconds
            enableDebugMode: false
        };
        
        this.consentSettings = {
            analytics: false,
            marketing: false
        };
        
        this.init();
    }
    
    // Initialize tracking system
    async init() {
        try {
            // Check KVKV consent status
            await this.checkConsentStatus();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up batch processing
            this.setupBatchProcessing();
            
            // Track page view
            this.trackPageView();
            
            // Set up page unload tracking
            this.setupUnloadTracking();
            
            this.isInitialized = true;
            this.debug('Enhanced Event Tracker initialized');
            
        } catch (error) {
            console.error('Enhanced Event Tracker initialization error:', error);
        }
    }
    
    // Check KVKV consent status
    async checkConsentStatus() {
        try {
            // Get consent from localStorage or API
            const storedConsent = localStorage.getItem('kvkv_consent_settings');
            if (storedConsent) {
                this.consentSettings = JSON.parse(storedConsent);
            }
            
            // Listen for consent updates
            window.addEventListener('kvkv-consent-updated', (e) => {
                this.consentSettings = e.detail;
                this.debug('Consent updated:', this.consentSettings);
            });
            
        } catch (error) {
            this.debug('Error checking consent status:', error);
        }
    }
    
    // Generate session ID
    generateSessionId() {
        const stored = sessionStorage.getItem('tracker_session_id');
        if (stored) return stored;
        
        const sessionId = 'ses_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        sessionStorage.setItem('tracker_session_id', sessionId);
        return sessionId;
    }
    
    // Get or generate user ID
    getUserId() {
        const stored = localStorage.getItem('tracker_user_id');
        if (stored) return stored;
        
        const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        localStorage.setItem('tracker_user_id', userId);
        return userId;
    }
    
    // Generate visit ID
    generateVisitId() {
        return 'vis_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Form submissions
        document.addEventListener('submit', (e) => this.handleFormSubmit(e), true);
        
        // Button and link clicks
        document.addEventListener('click', (e) => this.handleClick(e), true);
        
        // Scroll tracking
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.handleScroll(), 100);
        });
        
        // Visibility change (tab switching)
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        
        // Online/offline status
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
        
        // Page performance
        window.addEventListener('load', () => this.trackPagePerformance());
        
        // Video interactions
        this.setupVideoTracking();
        
        // File downloads
        this.setupDownloadTracking();
        
        // Error tracking
        window.addEventListener('error', (e) => this.trackError(e));
        
        // Resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.trackResize(), 250);
        });
    }
    
    // Handle form submissions
    handleFormSubmit(event) {
        const form = event.target;
        const formId = form.id || form.className || 'unknown_form';
        const formData = new FormData(form);
        const formObject = Object.fromEntries(formData.entries());
        
        let eventName = 'form_submit';
        let conversionValue = 0;
        
        // Determine specific event based on form
        if (formId.includes('service') || formId.includes('hizmet')) {
            eventName = 'service_request_submit';
            conversionValue = 50;
        } else if (formId.includes('newsletter') || formId.includes('email')) {
            eventName = 'newsletter_signup';
            conversionValue = 10;
        } else if (formId.includes('contact') || formId.includes('iletisim')) {
            eventName = 'contact_form_submit';
            conversionValue = 25;
        }
        
        this.trackEvent(eventName, {
            event_category: 'conversion',
            event_label: formId,
            event_value: conversionValue,
            element_id: form.id,
            element_class: form.className,
            form_data: formObject,
            is_conversion: true,
            conversion_type: eventName.replace('_submit', '').replace('_signup', ''),
            conversion_value: conversionValue
        });
        
        // Track GA4 enhanced event
        this.trackGA4Event(eventName === 'service_request_submit' ? 'generate_lead' : 
                          eventName === 'newsletter_signup' ? 'sign_up' : 'generate_lead', {
            service_type: formObject.serviceType || 'unknown',
            form_location: window.location.pathname,
            value: conversionValue,
            currency: 'TRY'
        });
        
        // Track Facebook Pixel event
        this.trackFacebookEvent(eventName === 'service_request_submit' ? 'Lead' :
                              eventName === 'newsletter_signup' ? 'Subscribe' : 'Contact', {
            content_category: eventName.replace('_submit', '').replace('_signup', ''),
            value: conversionValue,
            currency: 'TRY'
        });
    }
    
    // Handle clicks
    handleClick(event) {
        const element = event.target;
        const tagName = element.tagName.toLowerCase();
        const elementText = element.textContent?.trim().substring(0, 100) || '';
        const elementId = element.id || '';
        const elementClass = element.className || '';
        const href = element.href || element.closest('a')?.href || '';
        
        let eventName = 'click';
        let eventCategory = 'engagement';
        
        // Determine specific click type
        if (href.includes('tel:') || elementText.match(/\+90|0\d{3}/)) {
            eventName = 'phone_click';
        } else if (href.includes('whatsapp') || href.includes('wa.me') || elementText.toLowerCase().includes('whatsapp')) {
            eventName = 'whatsapp_click';
        } else if (elementClass.includes('cta') || elementClass.includes('btn-primary') || elementText.toLowerCase().includes('başvuru')) {
            eventName = 'cta_button_click';
        } else if (elementClass.includes('service') || elementText.toLowerCase().includes('hizmet')) {
            eventName = 'service_category_click';
        } else if (tagName === 'button' || tagName === 'a') {
            eventName = 'button_click';
        }
        
        // Track the click
        this.trackEvent(eventName, {
            event_category: eventCategory,
            event_label: elementText,
            element_id: elementId,
            element_class: elementClass,
            element_text: elementText,
            element_type: tagName,
            href: href,
            page_section: this.getPageSection(element)
        });
        
        // GA4 click tracking
        if (this.consentSettings.analytics) {
            this.trackGA4Event('click', {
                link_class: elementClass,
                link_text: elementText,
                link_url: href,
                outbound: this.isExternalLink(href)
            });
        }
        
        // Facebook Pixel click tracking
        if (this.consentSettings.marketing && (eventName === 'phone_click' || eventName === 'whatsapp_click')) {
            this.trackFacebookEvent('Contact', {
                content_category: eventName.replace('_click', '_interaction')
            });
        }
    }
    
    // Handle scroll tracking
    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);
        
        this.scrollDepth = scrollPercent;
        if (scrollPercent > this.maxScrollDepth) {
            this.maxScrollDepth = scrollPercent;
            
            // Track milestone scrolling
            for (const threshold of this.config.scrollThresholds) {
                if (scrollPercent >= threshold && !this.hasReachedScrollMilestone(threshold)) {
                    this.markScrollMilestone(threshold);
                    
                    this.trackEvent('scroll_milestone', {
                        event_category: 'engagement',
                        event_label: `${threshold}% scrolled`,
                        event_value: threshold,
                        scroll_depth: threshold
                    });
                    
                    // GA4 scroll tracking
                    if (this.consentSettings.analytics) {
                        this.trackGA4Event('scroll', {
                            percent_scrolled: threshold
                        });
                    }
                    
                    break; // Only track one milestone per scroll event
                }
            }
        }
    }
    
    // Check if scroll milestone was reached
    hasReachedScrollMilestone(threshold) {
        const reached = JSON.parse(sessionStorage.getItem('scroll_milestones') || '[]');
        return reached.includes(threshold);
    }
    
    // Mark scroll milestone as reached
    markScrollMilestone(threshold) {
        const reached = JSON.parse(sessionStorage.getItem('scroll_milestones') || '[]');
        reached.push(threshold);
        sessionStorage.setItem('scroll_milestones', JSON.stringify(reached));
    }
    
    // Setup video tracking
    setupVideoTracking() {
        // YouTube videos
        const checkYouTubeAPI = () => {
            if (window.YT && window.YT.Player) {
                this.setupYouTubeTracking();
            } else {
                setTimeout(checkYouTubeAPI, 500);
            }
        };
        checkYouTubeAPI();
        
        // HTML5 videos
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'VIDEO') {
                this.trackVideoEvent('video_play', e.target);
            }
        }, true);
        
        document.addEventListener('pause', (e) => {
            if (e.target.tagName === 'VIDEO') {
                this.trackVideoEvent('video_pause', e.target);
            }
        }, true);
    }
    
    // Setup download tracking
    setupDownloadTracking() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href) {
                const url = new URL(link.href, window.location.href);
                const fileExtension = url.pathname.split('.').pop()?.toLowerCase();
                const downloadExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'mp3', 'mp4', 'avi'];
                
                if (downloadExtensions.includes(fileExtension) || link.download) {
                    this.trackEvent('file_download', {
                        event_category: 'engagement',
                        event_label: url.pathname,
                        file_name: url.pathname.split('/').pop(),
                        file_type: fileExtension,
                        file_url: url.href
                    });
                    
                    // GA4 file download
                    if (this.consentSettings.analytics) {
                        this.trackGA4Event('file_download', {
                            file_name: url.pathname.split('/').pop(),
                            file_extension: fileExtension,
                            link_url: url.href
                        });
                    }
                }
            }
        }, true);
    }
    
    // Track page view
    trackPageView() {
        const pageData = {
            event_category: 'technical',
            event_label: document.title,
            page_url: window.location.href,
            page_title: document.title,
            page_referrer: document.referrer,
            user_agent: navigator.userAgent,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            screen_size: `${screen.width}x${screen.height}`,
            color_depth: screen.colorDepth,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        // Add UTM parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('utm_source')) {
            pageData.utm_source = urlParams.get('utm_source');
            pageData.utm_medium = urlParams.get('utm_medium');
            pageData.utm_campaign = urlParams.get('utm_campaign');
            pageData.utm_term = urlParams.get('utm_term');
            pageData.utm_content = urlParams.get('utm_content');
        }
        
        this.trackEvent('page_view', pageData);
        
        // GA4 page view (automatically sent, but we can enhance it)
        if (this.consentSettings.analytics && window.gtag) {
            gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href,
                custom_map: {
                    dimension1: this.sessionId,
                    dimension2: this.userId
                }
            });
        }
        
        // Facebook Pixel page view
        if (this.consentSettings.marketing && window.fbq) {
            fbq('track', 'PageView');
        }
    }
    
    // Track page performance
    trackPagePerformance() {
        if (!window.performance || !window.performance.timing) return;
        
        const perfData = window.performance.timing;
        const loadTime = perfData.loadEventEnd - perfData.navigationStart;
        const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
        const firstPaintTime = window.performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
        
        this.trackEvent('page_load_complete', {
            event_category: 'technical',
            event_value: loadTime,
            page_load_time: loadTime,
            dom_ready_time: domReadyTime,
            first_paint_time: firstPaintTime,
            connection_type: navigator.connection?.effectiveType || 'unknown'
        });
        
        // Track Core Web Vitals if available
        if (window.PerformanceObserver) {
            try {
                // Largest Contentful Paint
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackEvent('core_web_vital_lcp', {
                            event_category: 'technical',
                            event_value: entry.startTime,
                            metric_value: entry.startTime
                        });
                    }
                }).observe({ entryTypes: ['largest-contentful-paint'] });
                
                // First Input Delay
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackEvent('core_web_vital_fid', {
                            event_category: 'technical',
                            event_value: entry.processingStart - entry.startTime,
                            metric_value: entry.processingStart - entry.startTime
                        });
                    }
                }).observe({ entryTypes: ['first-input'] });
                
            } catch (error) {
                this.debug('Core Web Vitals tracking error:', error);
            }
        }
    }
    
    // Track custom event
    trackEvent(eventName, eventData = {}) {
        const event = {
            event_id: this.generateEventId(),
            event_name: eventName,
            event_category: eventData.event_category || 'custom',
            user_identifier: this.userId,
            session_id: this.sessionId,
            visitor_id: this.visitId,
            event_label: eventData.event_label || '',
            event_value: eventData.event_value || 0,
            event_data: JSON.stringify(eventData),
            page_url: window.location.href,
            page_title: document.title,
            page_referrer: document.referrer,
            element_id: eventData.element_id || '',
            element_class: eventData.element_class || '',
            element_text: eventData.element_text || '',
            element_type: eventData.element_type || '',
            user_agent: navigator.userAgent,
            page_load_time: this.getPageLoadTime(),
            time_on_page: Math.round((Date.now() - this.pageStartTime) / 1000),
            scroll_depth: this.scrollDepth,
            is_conversion: eventData.is_conversion || false,
            conversion_type: eventData.conversion_type || null,
            conversion_value: eventData.conversion_value || 0,
            utm_source: eventData.utm_source || null,
            utm_medium: eventData.utm_medium || null,
            utm_campaign: eventData.utm_campaign || null,
            utm_term: eventData.utm_term || null,
            utm_content: eventData.utm_content || null,
            client_timestamp: new Date().toISOString()
        };
        
        // Add to queue for batch sending
        this.eventQueue.push(event);
        
        this.debug('Event tracked:', eventName, event);
        
        // If queue is full, send immediately
        if (this.eventQueue.length >= this.config.batchSize) {
            this.sendEventBatch();
        }
    }
    
    // Track GA4 event
    trackGA4Event(eventName, parameters = {}) {
        if (!this.consentSettings.analytics || !window.gtag) return;
        
        gtag('event', eventName, {
            ...parameters,
            session_id: this.sessionId,
            user_id: this.userId
        });
        
        this.debug('GA4 event tracked:', eventName, parameters);
    }
    
    // Track Facebook Pixel event
    trackFacebookEvent(eventName, parameters = {}) {
        if (!this.consentSettings.marketing || !window.fbq) return;
        
        fbq('track', eventName, parameters);
        
        this.debug('Facebook event tracked:', eventName, parameters);
    }
    
    // Setup batch processing
    setupBatchProcessing() {
        // Send batch every X seconds
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.sendEventBatch();
            }
        }, this.config.batchTimeout);
    }
    
    // Send event batch to server
    async sendEventBatch() {
        if (!this.isOnline || this.eventQueue.length === 0) return;
        
        const batch = [...this.eventQueue];
        this.eventQueue = [];
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/events/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    events: batch,
                    meta: {
                        user_agent: navigator.userAgent,
                        timestamp: new Date().toISOString(),
                        batch_size: batch.length
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Batch send failed: ${response.status}`);
            }
            
            this.debug(`Event batch sent successfully: ${batch.length} events`);
            
        } catch (error) {
            this.debug('Error sending event batch:', error);
            
            // Re-queue failed events (max 3 attempts)
            batch.forEach(event => {
                event._retryCount = (event._retryCount || 0) + 1;
                if (event._retryCount <= 3) {
                    this.eventQueue.unshift(event);
                }
            });
        }
    }
    
    // Setup page unload tracking
    setupUnloadTracking() {
        const sendUnloadData = () => {
            // Send remaining events
            if (this.eventQueue.length > 0) {
                navigator.sendBeacon(`${this.apiBaseUrl}/api/events/beacon`, 
                    JSON.stringify({ events: this.eventQueue }));
            }
            
            // Track session end
            const sessionData = {
                event_name: 'session_end',
                session_id: this.sessionId,
                total_time: Math.round((Date.now() - this.pageStartTime) / 1000),
                max_scroll_depth: this.maxScrollDepth,
                page_url: window.location.href
            };
            
            navigator.sendBeacon(`${this.apiBaseUrl}/api/events/beacon`, 
                JSON.stringify({ events: [sessionData] }));
        };
        
        window.addEventListener('beforeunload', sendUnloadData);
        window.addEventListener('pagehide', sendUnloadData);
        
        // For mobile Safari
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                sendUnloadData();
            }
        });
    }
    
    // Utility methods
    generateEventId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    }
    
    getPageLoadTime() {
        if (!window.performance || !window.performance.timing) return 0;
        return window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
    }
    
    getPageSection(element) {
        const section = element.closest('section, header, main, footer, nav, aside');
        return section?.id || section?.className || 'unknown';
    }
    
    isExternalLink(href) {
        if (!href) return false;
        try {
            const url = new URL(href, window.location.href);
            return url.hostname !== window.location.hostname;
        } catch {
            return false;
        }
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            this.trackEvent('page_hidden', {
                event_category: 'engagement',
                time_on_page: Math.round((Date.now() - this.pageStartTime) / 1000)
            });
        } else {
            this.trackEvent('page_visible', {
                event_category: 'engagement'
            });
        }
    }
    
    handleConnectionChange(isOnline) {
        this.isOnline = isOnline;
        this.trackEvent(isOnline ? 'connection_restored' : 'connection_lost', {
            event_category: 'technical'
        });
    }
    
    trackVideoEvent(eventName, video) {
        this.trackEvent(eventName, {
            event_category: 'engagement',
            event_label: video.src || 'unknown_video',
            video_title: video.title || video.getAttribute('data-title') || 'Unknown',
            video_duration: video.duration || 0,
            video_current_time: video.currentTime || 0
        });
    }
    
    trackResize() {
        this.trackEvent('viewport_resize', {
            event_category: 'technical',
            viewport_size: `${window.innerWidth}x${window.innerHeight}`
        });
    }
    
    trackError(error) {
        this.trackEvent('error_occurred', {
            event_category: 'technical',
            event_label: error.message || 'Unknown error',
            error_message: error.message,
            error_filename: error.filename,
            error_lineno: error.lineno,
            error_colno: error.colno,
            error_stack: error.error?.stack
        });
    }
    
    debug(...args) {
        if (this.config.enableDebugMode) {
            console.log('[Enhanced Event Tracker]', ...args);
        }
    }
    
    // Public API methods
    track(eventName, eventData) {
        this.trackEvent(eventName, eventData);
    }
    
    identify(userId, traits = {}) {
        this.userId = userId;
        localStorage.setItem('tracker_user_id', userId);
        
        this.trackEvent('user_identified', {
            event_category: 'user',
            user_traits: JSON.stringify(traits)
        });
    }
    
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            visitId: this.visitId,
            timeOnPage: Math.round((Date.now() - this.pageStartTime) / 1000),
            scrollDepth: this.scrollDepth
        };
    }
}

// Initialize Enhanced Event Tracker
document.addEventListener('DOMContentLoaded', function() {
    // Check if tracking is not disabled
    if (!window.disableTracking) {
        window.enhancedTracker = new EnhancedEventTracker();
        
        // Global tracking function for manual events
        window.track = function(eventName, eventData) {
            if (window.enhancedTracker) {
                window.enhancedTracker.track(eventName, eventData);
            }
        };
        
        console.log('✅ Enhanced Event Tracker loaded successfully');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedEventTracker;
}