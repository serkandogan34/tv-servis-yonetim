// Static app.js - Live Notifications System
console.log('Static app.js loaded successfully');

// Live notifications system - Main functionality
window.appReady = true;

// LIVE FEED FUNCTIONS
console.log('FORCING NOTIFICATION START NOW!');

window.addJobToFeed = function() {
    // console.log('Starting job feed...');
    const feedContainer = document.getElementById('job-feed');
    if (!feedContainer) {
        // console.log('job-feed container not found on this page, skipping...');
        return;
    }
    console.log('Found job-feed container, starting...');
    
    const jobs = [
        {
            category: 'Televizyon Tamiri',
            location: 'Kadıköy, İstanbul',
            urgency: 'Acil',
            price: 'TL400-600',
            customer: 'Ahmet B.',
            icon: 'fas fa-tv',
            color: 'blue',
            time: 'Şimdi'
        },
        {
            category: 'Beyaz Eşya',
            location: 'Çankaya, Ankara', 
            urgency: 'Normal',
            price: 'TL300-500',
            customer: 'Zeynep K.',
            icon: 'fas fa-washing-machine',
            color: 'green',
            time: '2dk önce'
        },
        {
            category: 'Bilgisayar Tamiri',
            location: 'Bornova, İzmir',
            urgency: 'Bugün',
            price: 'TL250-400',
            customer: 'Mehmet D.',
            icon: 'fas fa-laptop',
            color: 'purple',
            time: '5dk önce'
        }
    ];
    
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const urgencyClass = job.urgency === 'Acil' ? 'bg-red-500' : job.urgency === 'Bugün' ? 'bg-orange-500' : 'bg-green-500';
    
    const jobElement = document.createElement('div');
    jobElement.className = 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2 mb-1 opacity-0 transform translate-y-2 transition-all duration-300';
    
    jobElement.innerHTML = 
        '<div class="flex items-center justify-between">' +
            '<div class="flex items-center space-x-2">' +
                '<div class="w-6 h-6 bg-' + job.color + '-500 rounded-md flex items-center justify-center">' +
                    '<i class="' + job.icon + ' text-white text-xs"></i>' +
                '</div>' +
                '<div class="flex-1">' +
                    '<div class="text-white text-xs font-medium">' + job.category + '</div>' +
                    '<div class="text-gray-300 text-xs">' + job.customer + ' • ' + job.location + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="text-right">' +
                '<div class="' + urgencyClass + ' text-white px-1 py-0.5 rounded text-xs font-medium mb-0.5">' + job.urgency + '</div>' +
                '<div class="text-gray-300 text-xs">' + job.price + '</div>' +
                '<div class="text-gray-400 text-xs">' + job.time + '</div>' +
            '</div>' +
        '</div>';
    
    feedContainer.insertBefore(jobElement, feedContainer.firstChild);
    
    setTimeout(function() {
        jobElement.classList.remove('opacity-0', 'translate-y-2');
    }, 100);
    
    while (feedContainer.children.length > 6) {
        feedContainer.removeChild(feedContainer.lastChild);
    }
    
    console.log('Job added to feed!');
};

window.initializeJobFeed = function() {
    console.log('Initializing live job feed...');
    window.addJobToFeed();
    setTimeout(function() { window.addJobToFeed(); }, 1000);
    setTimeout(function() { window.addJobToFeed(); }, 2000);
};

// Start automatically when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        console.log('Auto-starting job feed...');
        window.initializeJobFeed();
        
        // Continue adding jobs every 8 seconds
        setInterval(function() {
            window.addJobToFeed();
        }, 8000);
    }, 2000);
});

// =============================================================================
// GARANTOR360 - GA4 Enhanced Event Tracking System
// =============================================================================

console.log('🎯 Loading GA4 Enhanced Event Tracking...');

// GA4 Event Tracking Helper Functions
window.GA4_EVENTS = {
    
    // Form Submission Tracking
    trackFormSubmission: function(formType, formData, eventLabel = '') {
        if (typeof gtag === 'undefined') {
            console.warn('GA4 gtag not available');
            return;
        }
        
        console.log('📝 GA4 Form Submit:', formType, formData);
        
        gtag('event', 'form_submit', {
            event_category: 'form_interaction',
            event_label: eventLabel || formType,
            form_type: formType,
            form_fields_filled: Object.keys(formData).length,
            value: 1,
            custom_parameters: {
                service_category: formData.serviceCategory || 'unknown',
                location: formData.customerCity || 'unknown',
                urgency: formData.urgency || 'normal'
            }
        });
        
        // Facebook Pixel Event
        if (typeof fbq !== 'undefined') {
            fbq('trackCustom', 'ServiceRequestSubmit', {
                form_type: formType,
                service_category: formData.serviceCategory || 'unknown',
                location: formData.customerCity || 'unknown'
            });
        }
        
        // Send to our analytics API
        this.sendEventToAPI('form_submission', {
            form_type: formType,
            form_fields_filled: Object.keys(formData).length,
            service_category: formData.serviceCategory || 'unknown',
            location: formData.customerCity || 'unknown',
            urgency: formData.urgency || 'normal',
            event_label: eventLabel
        });
    },
    
    // Button Click Tracking
    trackButtonClick: function(buttonText, buttonType, targetAction = '') {
        if (typeof gtag === 'undefined') return;
        
        console.log('🔘 GA4 Button Click:', buttonText, buttonType);
        
        gtag('event', 'click', {
            event_category: 'button_interaction',
            event_label: buttonText,
            button_type: buttonType,
            target_action: targetAction,
            value: 1
        });
        
        // Facebook Pixel Event
        if (typeof fbq !== 'undefined') {
            fbq('trackCustom', 'ButtonClick', {
                button_text: buttonText,
                button_type: buttonType,
                target_action: targetAction
            });
        }
        
        // Send to Analytics API
        this.sendEventToAPI('button_click', {
            button_text: buttonText,
            button_type: buttonType,
            target_action: targetAction
        });
    },
    
    // Phone/WhatsApp Click Tracking
    trackContactInteraction: function(contactType, phoneNumber = '') {
        if (typeof gtag === 'undefined') return;
        
        console.log('📞 GA4 Contact Interaction:', contactType);
        
        gtag('event', 'contact_interaction', {
            event_category: 'contact',
            event_label: contactType,
            contact_method: contactType,
            value: 1
        });
        
        // Facebook Pixel Lead Event
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead', {
                contact_method: contactType,
                content_category: 'home_services'
            });
        }
        
        // Send to Analytics API
        this.sendEventToAPI('contact_interaction', {
            contact_method: contactType,
            phone_number: phoneNumber ? 'MASKED' : '' // Don't store actual phone numbers
        });
    },
    
    // Service Category Selection Tracking
    trackServiceSelection: function(serviceCategory, serviceName = '') {
        if (typeof gtag === 'undefined') return;
        
        console.log('🛠️ GA4 Service Selection:', serviceCategory);
        
        gtag('event', 'service_selection', {
            event_category: 'service_interaction',
            event_label: serviceCategory,
            service_category: serviceCategory,
            service_name: serviceName,
            value: 1
        });
        
        // Facebook Pixel Custom Event
        if (typeof fbq !== 'undefined') {
            fbq('trackCustom', 'ServiceInterest', {
                service_category: serviceCategory,
                service_name: serviceName
            });
        }
    },
    
    // Scroll Depth Tracking
    trackScrollDepth: function(percentage, pagePath = window.location.pathname) {
        if (typeof gtag === 'undefined') return;
        
        // Only track at specific milestones to avoid spam
        const milestones = [25, 50, 75, 90, 100];
        if (!milestones.includes(percentage)) return;
        
        console.log('📊 GA4 Scroll Depth:', percentage + '%');
        
        gtag('event', 'scroll', {
            event_category: 'engagement',
            event_label: percentage + '%',
            scroll_depth: percentage,
            page_path: pagePath,
            value: percentage
        });
    },
    
    // Page Engagement Tracking
    trackPageEngagement: function(engagementType, details = {}) {
        if (typeof gtag === 'undefined') return;
        
        console.log('💡 GA4 Page Engagement:', engagementType, details);
        
        gtag('event', 'page_engagement', {
            event_category: 'engagement',
            event_label: engagementType,
            engagement_type: engagementType,
            ...details,
            value: 1
        });
    },
    
    // Send Event to Analytics API
    sendEventToAPI: function(eventType, eventData) {
        // Async API call to track events in database
        fetch('/api/analytics/track-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventType: eventType,
                eventData: eventData,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                page_url: window.location.href,
                page_title: document.title
            })
        }).then(response => {
            if (response.ok) {
                console.log('📊 Event sent to analytics API:', eventType);
            }
        }).catch(error => {
            console.warn('📊 Failed to send event to API:', error);
        });
    },
    
    // User Journey Tracking
    trackUserJourney: function(stepName, stepNumber, totalSteps = 4) {
        if (typeof gtag === 'undefined') return;
        
        console.log('🗺️ GA4 User Journey:', stepName, stepNumber);
        
        gtag('event', 'user_journey_step', {
            event_category: 'user_journey',
            event_label: stepName,
            step_name: stepName,
            step_number: stepNumber,
            total_steps: totalSteps,
            progress_percentage: Math.round((stepNumber / totalSteps) * 100),
            value: stepNumber
        });
    }
};

// Auto-attach Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing GA4 Event Tracking Listeners...');
    
    // 1. Form Submission Tracking
    const serviceForm = document.getElementById('serviceRequestForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', function(e) {
            const formData = new FormData(serviceForm);
            const formObject = {};
            for (let [key, value] of formData.entries()) {
                formObject[key] = value;
            }
            window.GA4_EVENTS.trackFormSubmission('service_request', formObject, 'main_service_form');
        });
    }
    
    // 2. Button Click Tracking - CTA Buttons
    const ctaButtons = document.querySelectorAll('button, a[href*="tel:"], a[href*="whatsapp"], a[href*="mailto:"]');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const buttonText = this.innerText.trim() || this.title || 'Unknown Button';
            const href = this.href || '';
            
            let buttonType = 'general';
            let targetAction = '';
            
            // Determine button type
            if (href.includes('tel:')) {
                buttonType = 'phone_call';
                targetAction = 'call';
                window.GA4_EVENTS.trackContactInteraction('phone', href.replace('tel:', ''));
            } else if (href.includes('whatsapp') || href.includes('wa.me')) {
                buttonType = 'whatsapp';
                targetAction = 'whatsapp_message';
                window.GA4_EVENTS.trackContactInteraction('whatsapp');
            } else if (href.includes('mailto:')) {
                buttonType = 'email';
                targetAction = 'email';
                window.GA4_EVENTS.trackContactInteraction('email');
            } else if (buttonText.toLowerCase().includes('hizmet') || buttonText.toLowerCase().includes('talep')) {
                buttonType = 'service_request';
                targetAction = 'service_form';
            } else if (buttonText.toLowerCase().includes('iletişim') || buttonText.toLowerCase().includes('ara')) {
                buttonType = 'contact';
                targetAction = 'contact_info';
            }
            
            window.GA4_EVENTS.trackButtonClick(buttonText, buttonType, targetAction);
        });
    });
    
    // 3. Service Category Selection Tracking
    const serviceSelect = document.getElementById('serviceCategory');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const serviceCategory = selectedOption.value;
            const serviceName = selectedOption.text;
            window.GA4_EVENTS.trackServiceSelection(serviceCategory, serviceName);
        });
    }
    
    // 4. Scroll Depth Tracking
    let scrollDepthTracked = new Set();
    window.addEventListener('scroll', function() {
        const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        const milestones = [25, 50, 75, 90, 100];
        milestones.forEach(milestone => {
            if (scrollPercentage >= milestone && !scrollDepthTracked.has(milestone)) {
                scrollDepthTracked.add(milestone);
                window.GA4_EVENTS.trackScrollDepth(milestone);
            }
        });
    });
    
    // 5. AI Chat Interaction Tracking
    const aiChatButton = document.getElementById('aiChatButton');
    if (aiChatButton) {
        aiChatButton.addEventListener('click', function() {
            window.GA4_EVENTS.trackPageEngagement('ai_chat_open', {
                engagement_method: 'chat_button',
                chat_type: 'ai_assistant'
            });
        });
    }
    
    // 6. Form Progress Tracking (Multi-step form)
    const formSteps = document.querySelectorAll('.form-step');
    if (formSteps.length > 0) {
        // Track when user focuses on form fields in each step
        formSteps.forEach((step, index) => {
            const inputs = step.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                let stepTracked = false;
                input.addEventListener('focus', function() {
                    if (!stepTracked) {
                        stepTracked = true;
                        const stepName = step.dataset.step ? `step_${step.dataset.step}` : `form_step_${index + 1}`;
                        window.GA4_EVENTS.trackUserJourney(stepName, index + 1, formSteps.length);
                    }
                });
            });
        });
    }
    
    // 7. Page Visibility Tracking
    let pageVisibleTime = Date.now();
    let pageEngagementTracked = false;
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            const timeSpent = Math.round((Date.now() - pageVisibleTime) / 1000);
            if (timeSpent > 30 && !pageEngagementTracked) {
                pageEngagementTracked = true;
                window.GA4_EVENTS.trackPageEngagement('engaged_session', {
                    time_spent_seconds: timeSpent,
                    engagement_threshold: '30_seconds'
                });
            }
        } else {
            pageVisibleTime = Date.now();
        }
    });
    
    console.log('✅ GA4 Enhanced Event Tracking initialized successfully!');
});

// Manual Event Triggers (for inline onclick handlers)
window.trackServiceRequest = function() {
    window.GA4_EVENTS.trackButtonClick('Hizmet Talep Et', 'service_request', 'scroll_to_form');
};

window.trackPhoneCall = function(phoneNumber = '') {
    window.GA4_EVENTS.trackContactInteraction('phone', phoneNumber);
};

window.trackWhatsAppClick = function() {
    window.GA4_EVENTS.trackContactInteraction('whatsapp');
};

window.trackScrollToServices = function() {
    window.GA4_EVENTS.trackButtonClick('Hizmetleri Gör', 'navigation', 'scroll_to_services');
};

console.log('🎯 GA4 Enhanced Event Tracking System loaded successfully!');

// =============================================================================
// GARANTOR360 - Facebook Pixel Enhanced Event Tracking System
// =============================================================================

console.log('📘 Loading Facebook Pixel Enhanced Event Tracking...');

// Facebook Pixel Advanced Event Helper Functions
window.FB_PIXEL_EVENTS = {
    
    // Enhanced Service Request Conversion Events
    trackServiceRequestConversion: function(serviceData, conversionValue = 0) {
        if (typeof fbq === 'undefined') {
            console.warn('Facebook Pixel not available');
            return;
        }
        
        console.log('🎯 FB Pixel Service Request Conversion:', serviceData);
        
        // Standard Lead Event with enhanced parameters
        fbq('track', 'Lead', {
            content_name: `Service Request: ${serviceData.serviceCategory}`,
            content_category: 'home_services',
            content_ids: [serviceData.serviceCategory],
            value: conversionValue,
            currency: 'TRY',
            predicted_ltv: conversionValue * 2.5, // Customer lifetime value prediction
            custom_data: {
                service_category: serviceData.serviceCategory,
                location: serviceData.customerCity || 'unknown',
                urgency: serviceData.urgency || 'normal',
                request_source: 'website_form',
                form_completion_rate: 100
            }
        });
        
        // Custom Event for Service Request
        fbq('trackCustom', 'ServiceRequestSubmitted', {
            service_type: serviceData.serviceCategory,
            customer_location: serviceData.customerCity,
            urgency_level: serviceData.urgency,
            contact_method_preferred: serviceData.contactMethod || 'phone',
            form_source: serviceData.formSource || 'main_form',
            value: conversionValue,
            currency: 'TRY'
        });
        
        // Audience Building Event
        fbq('trackCustom', 'ServiceInterestAudience', {
            interest_category: serviceData.serviceCategory,
            location_preference: serviceData.customerCity,
            engagement_level: 'high_intent',
            funnel_stage: 'conversion'
        });
    },
    
    // Enhanced Contact Interaction Events
    trackContactConversion: function(contactMethod, contactData = {}) {
        if (typeof fbq === 'undefined') return;
        
        console.log('📞 FB Pixel Contact Conversion:', contactMethod, contactData);
        
        // Standard Lead Event for Contact
        fbq('track', 'Lead', {
            content_name: `Contact via ${contactMethod}`,
            content_category: 'lead_generation',
            value: 50, // Estimated lead value
            currency: 'TRY',
            custom_data: {
                contact_method: contactMethod,
                lead_source: 'direct_contact',
                interaction_type: 'immediate'
            }
        });
        
        // Custom Contact Events based on method
        switch (contactMethod) {
            case 'phone':
                fbq('trackCustom', 'PhoneCallInitiated', {
                    call_source: 'website_button',
                    urgency_indicator: contactData.urgency || 'normal',
                    page_context: window.location.pathname
                });
                break;
                
            case 'whatsapp':
                fbq('trackCustom', 'WhatsAppMessageInitiated', {
                    message_source: 'website_button',
                    platform_preference: 'whatsapp',
                    contact_intent: 'service_inquiry'
                });
                break;
                
            case 'email':
                fbq('trackCustom', 'EmailContactInitiated', {
                    email_source: 'website_form',
                    communication_preference: 'email'
                });
                break;
        }
        
        // Retargeting Audience Event
        fbq('trackCustom', 'ContactIntentAudience', {
            contact_method: contactMethod,
            engagement_level: 'high',
            retargeting_segment: 'contact_initiators'
        });
    },
    
    // Service Category Interest Tracking
    trackServiceInterest: function(serviceCategory, interactionDepth = 1) {
        if (typeof fbq === 'undefined') return;
        
        console.log('🛠️ FB Pixel Service Interest:', serviceCategory);
        
        // Standard ViewContent Event
        fbq('track', 'ViewContent', {
            content_type: 'service_category',
            content_ids: [serviceCategory],
            content_name: `Service Category: ${serviceCategory}`,
            content_category: 'home_services',
            value: 25, // Interest value
            currency: 'TRY'
        });
        
        // Custom Service Interest Event
        fbq('trackCustom', 'ServiceCategoryInterest', {
            service_category: serviceCategory,
            interaction_depth: interactionDepth,
            interest_level: interactionDepth > 2 ? 'high' : 'medium',
            browsing_context: 'service_exploration'
        });
        
        // Lookalike Audience Building
        fbq('trackCustom', 'ServiceLookalikeAudience', {
            service_preference: serviceCategory,
            engagement_type: 'category_selection',
            lookalike_source: 'service_interest'
        });
    },
    
    // Advanced Page Engagement Events
    trackPageEngagement: function(engagementType, engagementData = {}) {
        if (typeof fbq === 'undefined') return;
        
        console.log('💡 FB Pixel Page Engagement:', engagementType);
        
        // Enhanced engagement tracking based on type
        switch (engagementType) {
            case 'scroll_depth_75':
                fbq('trackCustom', 'HighEngagementUser', {
                    engagement_type: 'deep_scroll',
                    scroll_percentage: engagementData.scrollDepth || 75,
                    page_type: 'service_page',
                    engagement_quality: 'high'
                });
                break;
                
            case 'time_on_page_60s':
                fbq('trackCustom', 'EngagedVisitor', {
                    engagement_type: 'time_spent',
                    time_spent_seconds: engagementData.timeSpent || 60,
                    engagement_quality: 'medium_to_high',
                    page_value: 'informational'
                });
                break;
                
            case 'multiple_service_views':
                fbq('trackCustom', 'ServiceExplorer', {
                    engagement_type: 'service_browsing',
                    services_viewed: engagementData.servicesViewed || 1,
                    exploration_depth: 'high',
                    shopping_intent: 'comparison'
                });
                break;
        }
        
        // General engagement audience
        fbq('trackCustom', 'EngagementAudience', {
            engagement_category: engagementType,
            engagement_score: this.calculateEngagementScore(engagementData),
            retargeting_priority: engagementData.highValue ? 'high' : 'medium'
        });
    },
    
    // AI Chat Interaction Events
    trackAIChatEngagement: function(chatAction, chatData = {}) {
        if (typeof fbq === 'undefined') return;
        
        console.log('🤖 FB Pixel AI Chat Engagement:', chatAction);
        
        // Base chat interaction
        fbq('trackCustom', 'AIChatInteraction', {
            chat_action: chatAction,
            chat_stage: chatData.stage || 'initial',
            user_intent: chatData.intent || 'service_inquiry',
            engagement_level: 'interactive'
        });
        
        // Specific chat actions
        switch (chatAction) {
            case 'chat_initiated':
                fbq('trackCustom', 'AIChatStarted', {
                    initiation_source: 'website_button',
                    user_type: 'potential_customer',
                    automation_engagement: 'true'
                });
                break;
                
            case 'service_recommendation_received':
                fbq('trackCustom', 'ServiceRecommendationViewed', {
                    recommendation_type: 'ai_generated',
                    service_match: chatData.serviceMatch || 'unknown',
                    recommendation_confidence: chatData.confidence || 'medium'
                });
                break;
                
            case 'quote_requested_via_chat':
                fbq('track', 'Lead', {
                    content_name: 'AI Chat Quote Request',
                    content_category: 'automated_lead',
                    value: 75, // Higher value for AI-assisted leads
                    currency: 'TRY',
                    custom_data: {
                        lead_source: 'ai_chat',
                        automation_assisted: true,
                        qualification_level: 'pre_qualified'
                    }
                });
                break;
        }
    },
    
    // Conversion Funnel Tracking
    trackFunnelProgress: function(funnelStep, stepData = {}) {
        if (typeof fbq === 'undefined') return;
        
        console.log('📊 FB Pixel Funnel Progress:', funnelStep);
        
        const funnelSteps = {
            'awareness': { value: 5, stage: 'top_funnel' },
            'interest': { value: 15, stage: 'middle_funnel' },
            'consideration': { value: 35, stage: 'middle_funnel' },
            'intent': { value: 60, stage: 'bottom_funnel' },
            'conversion': { value: 100, stage: 'conversion' }
        };
        
        const stepInfo = funnelSteps[funnelStep] || { value: 10, stage: 'unknown' };
        
        // Funnel progression event
        fbq('trackCustom', 'FunnelProgression', {
            funnel_step: funnelStep,
            funnel_stage: stepInfo.stage,
            step_value: stepInfo.value,
            progression_source: stepData.source || 'organic',
            user_segment: this.getUserSegment(stepData)
        });
        
        // Value-based events for optimization
        if (stepInfo.value >= 35) {
            fbq('trackCustom', 'HighValueProspect', {
                prospect_score: stepInfo.value,
                funnel_position: stepInfo.stage,
                conversion_likelihood: stepInfo.value > 60 ? 'high' : 'medium'
            });
        }
    },
    
    // Dynamic Audience Segmentation
    trackAudienceSegment: function(segmentType, segmentData = {}) {
        if (typeof fbq === 'undefined') return;
        
        console.log('👥 FB Pixel Audience Segment:', segmentType);
        
        // Core audience segmentation
        fbq('trackCustom', 'AudienceSegmentation', {
            segment_type: segmentType,
            segment_criteria: segmentData.criteria || 'behavioral',
            segment_value: segmentData.value || 'medium',
            targeting_priority: segmentData.priority || 'normal'
        });
        
        // Specific segment events
        const segmentEvents = {
            'high_intent_users': () => {
                fbq('trackCustom', 'HighIntentAudience', {
                    intent_indicators: segmentData.indicators || [],
                    confidence_score: segmentData.confidence || 80,
                    retargeting_value: 'premium'
                });
            },
            'repeat_visitors': () => {
                fbq('trackCustom', 'RepeatVisitorAudience', {
                    visit_frequency: segmentData.visitCount || 1,
                    engagement_pattern: 'returning',
                    loyalty_indicator: 'true'
                });
            },
            'service_specific_audience': () => {
                fbq('trackCustom', 'ServiceSpecificAudience', {
                    primary_service_interest: segmentData.serviceCategory,
                    specialization_level: 'focused',
                    targeting_precision: 'high'
                });
            }
        };
        
        if (segmentEvents[segmentType]) {
            segmentEvents[segmentType]();
        }
    },
    
    // Helper Functions
    calculateEngagementScore: function(engagementData) {
        let score = 0;
        score += (engagementData.timeSpent || 0) / 10; // 1 point per 10 seconds
        score += (engagementData.scrollDepth || 0) / 10; // 1 point per 10% scroll
        score += (engagementData.interactions || 0) * 5; // 5 points per interaction
        score += (engagementData.pageViews || 1) * 2; // 2 points per page view
        return Math.min(Math.round(score), 100);
    },
    
    getUserSegment: function(userData) {
        if (userData.returnVisitor) return 'returning_visitor';
        if (userData.highEngagement) return 'high_engagement';
        if (userData.multipleServices) return 'service_explorer';
        return 'new_visitor';
    },
    
    // Conversion Value Optimization
    trackConversionValue: function(conversionType, value, currency = 'TRY') {
        if (typeof fbq === 'undefined') return;
        
        console.log('💰 FB Pixel Conversion Value:', conversionType, value);
        
        // Standard purchase-like event for value optimization
        fbq('track', 'Purchase', {
            content_type: 'service',
            content_name: `Service Conversion: ${conversionType}`,
            value: value,
            currency: currency,
            custom_data: {
                conversion_type: conversionType,
                optimization_target: 'service_revenue',
                attribution_window: '7_days'
            }
        });
        
        // Value-based custom event
        fbq('trackCustom', 'ValueBasedConversion', {
            conversion_category: conversionType,
            monetary_value: value,
            currency: currency,
            value_tier: value > 500 ? 'high_value' : value > 200 ? 'medium_value' : 'standard_value'
        });
    }
};

// Enhanced Auto-Event Listeners for Facebook Pixel
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Facebook Pixel Enhanced Event Tracking...');
    
    // Enhanced form tracking with conversion values
    const serviceForm = document.getElementById('serviceRequestForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', function(e) {
            const formData = new FormData(serviceForm);
            const formObject = {};
            for (let [key, value] of formData.entries()) {
                formObject[key] = value;
            }
            
            // Calculate estimated conversion value based on service type
            const serviceValueMap = {
                'televizyon_tamiri': 300,
                'bilgisayar_tamiri': 250,
                'beyaz_esya_tamiri': 400,
                'klima_tamiri': 350,
                'elektronik_tamiri': 200
            };
            
            const conversionValue = serviceValueMap[formObject.serviceCategory] || 250;
            
            // Track enhanced service request conversion
            window.FB_PIXEL_EVENTS.trackServiceRequestConversion(formObject, conversionValue);
            
            // Track funnel progression to conversion
            window.FB_PIXEL_EVENTS.trackFunnelProgress('conversion', {
                source: 'form_submission',
                serviceType: formObject.serviceCategory,
                value: conversionValue
            });
        });
    }
    
    // Enhanced contact tracking with lead scoring
    const contactButtons = document.querySelectorAll('a[href*="tel:"], a[href*="whatsapp"], a[href*="mailto:"]');
    contactButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const href = this.href || '';
            let contactMethod = '';
            
            if (href.includes('tel:')) {
                contactMethod = 'phone';
            } else if (href.includes('whatsapp') || href.includes('wa.me')) {
                contactMethod = 'whatsapp';
            } else if (href.includes('mailto:')) {
                contactMethod = 'email';
            }
            
            if (contactMethod) {
                window.FB_PIXEL_EVENTS.trackContactConversion(contactMethod, {
                    urgency: this.dataset.urgency || 'normal',
                    source: 'direct_button'
                });
                
                // Track funnel progression to intent
                window.FB_PIXEL_EVENTS.trackFunnelProgress('intent', {
                    source: 'contact_interaction',
                    method: contactMethod
                });
            }
        });
    });
    
    // Enhanced service selection with interest depth tracking
    const serviceSelect = document.getElementById('serviceCategory');
    let serviceSelectionCount = 0;
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            serviceSelectionCount++;
            const selectedOption = this.options[this.selectedIndex];
            const serviceCategory = selectedOption.value;
            
            window.FB_PIXEL_EVENTS.trackServiceInterest(serviceCategory, serviceSelectionCount);
            
            // Track funnel progression to consideration
            window.FB_PIXEL_EVENTS.trackFunnelProgress('consideration', {
                source: 'service_selection',
                serviceCategory: serviceCategory,
                selectionDepth: serviceSelectionCount
            });
            
            // Dynamic audience segmentation
            if (serviceSelectionCount > 1) {
                window.FB_PIXEL_EVENTS.trackAudienceSegment('service_specific_audience', {
                    serviceCategory: serviceCategory,
                    criteria: 'multiple_selections',
                    priority: 'high'
                });
            }
        });
    }
    
    // Enhanced scroll tracking with engagement scoring
    let scrollMilestones = new Set();
    let scrollEngagementTracked = false;
    
    window.addEventListener('scroll', function() {
        const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        // Track high engagement at 75% scroll
        if (scrollPercentage >= 75 && !scrollMilestones.has(75)) {
            scrollMilestones.add(75);
            window.FB_PIXEL_EVENTS.trackPageEngagement('scroll_depth_75', {
                scrollDepth: scrollPercentage,
                highValue: true
            });
            
            // Track funnel progression to interest
            window.FB_PIXEL_EVENTS.trackFunnelProgress('interest', {
                source: 'deep_scroll',
                engagement: 'high'
            });
        }
        
        // Track complete scroll
        if (scrollPercentage >= 95 && !scrollEngagementTracked) {
            scrollEngagementTracked = true;
            window.FB_PIXEL_EVENTS.trackAudienceSegment('high_intent_users', {
                indicators: ['complete_scroll', 'page_completion'],
                confidence: 90,
                priority: 'high'
            });
        }
    });
    
    // Enhanced time-based engagement tracking
    let timeTrackingIntervals = [30, 60, 120]; // seconds
    let pageLoadTime = Date.now();
    
    timeTrackingIntervals.forEach(interval => {
        setTimeout(() => {
            const timeSpent = Math.round((Date.now() - pageLoadTime) / 1000);
            
            if (timeSpent >= interval) {
                window.FB_PIXEL_EVENTS.trackPageEngagement(`time_on_page_${interval}s`, {
                    timeSpent: timeSpent,
                    engagementLevel: interval >= 60 ? 'high' : 'medium'
                });
                
                // Track repeat visitor patterns
                if (localStorage.getItem('fb_pixel_return_visitor')) {
                    window.FB_PIXEL_EVENTS.trackAudienceSegment('repeat_visitors', {
                        visitCount: parseInt(localStorage.getItem('fb_pixel_visit_count') || '1'),
                        criteria: 'returning_visitor',
                        value: 'high'
                    });
                } else {
                    localStorage.setItem('fb_pixel_return_visitor', 'true');
                    localStorage.setItem('fb_pixel_visit_count', '1');
                }
            }
        }, interval * 1000);
    });
    
    // AI Chat enhanced tracking
    const aiChatButton = document.getElementById('aiChatButton');
    if (aiChatButton) {
        aiChatButton.addEventListener('click', function() {
            window.FB_PIXEL_EVENTS.trackAIChatEngagement('chat_initiated', {
                stage: 'initial',
                intent: 'service_inquiry'
            });
            
            // Track funnel progression to interest
            window.FB_PIXEL_EVENTS.trackFunnelProgress('interest', {
                source: 'ai_chat_interaction',
                automation: true
            });
        });
    }
    
    // Initialize visitor tracking
    const visitCount = parseInt(localStorage.getItem('fb_pixel_visit_count') || '0') + 1;
    localStorage.setItem('fb_pixel_visit_count', visitCount.toString());
    
    // Track awareness funnel for new page loads
    window.FB_PIXEL_EVENTS.trackFunnelProgress('awareness', {
        source: 'page_load',
        visitNumber: visitCount,
        newVisitor: visitCount === 1
    });
    
    console.log('✅ Facebook Pixel Enhanced Event Tracking initialized successfully!');
});

// Manual Event Triggers for Enhanced Facebook Pixel
window.trackFBServiceQuote = function(serviceCategory, estimatedValue) {
    window.FB_PIXEL_EVENTS.trackConversionValue('service_quote', estimatedValue);
    window.FB_PIXEL_EVENTS.trackFunnelProgress('intent', {
        source: 'quote_request',
        serviceCategory: serviceCategory,
        value: estimatedValue
    });
};

window.trackFBServiceBooking = function(serviceCategory, bookingValue) {
    window.FB_PIXEL_EVENTS.trackConversionValue('service_booking', bookingValue);
    window.FB_PIXEL_EVENTS.trackFunnelProgress('conversion', {
        source: 'direct_booking',
        serviceCategory: serviceCategory,
        value: bookingValue
    });
};

window.trackFBAIChatRecommendation = function(serviceMatch, confidence) {
    window.FB_PIXEL_EVENTS.trackAIChatEngagement('service_recommendation_received', {
        serviceMatch: serviceMatch,
        confidence: confidence,
        stage: 'recommendation'
    });
};

window.trackFBAIChatQuoteRequest = function(serviceCategory) {
    window.FB_PIXEL_EVENTS.trackAIChatEngagement('quote_requested_via_chat', {
        serviceCategory: serviceCategory,
        stage: 'conversion_intent'
    });
};

console.log('📘 Facebook Pixel Enhanced Event Tracking System loaded successfully!');

// =============================================================================
// GARANTOR360 - Google Tag Manager Enhanced Integration System
// =============================================================================

console.log('🏷️ Loading Google Tag Manager Enhanced Integration...');

// Initialize GTM dataLayer if not exists
window.dataLayer = window.dataLayer || [];

// GTM Enhanced Event Helper Functions
window.GTM_EVENTS = {
    
    // Enhanced dataLayer Push with GARANTOR360 context
    pushToDataLayer: function(eventName, eventData = {}) {
        const enhancedEventData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            page_url: window.location.href,
            page_title: document.title,
            page_path: window.location.pathname,
            user_type: 'visitor',
            business_type: 'home_services',
            platform: 'website',
            device_type: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            traffic_source: document.referrer || 'direct',
            ...eventData
        };
        
        window.dataLayer.push(enhancedEventData);
        console.log('🏷️ GTM Event Pushed:', eventName, enhancedEventData);
        return enhancedEventData;
    },
    
    // Service Request Enhanced Event
    trackServiceRequest: function(serviceData, formSource = 'main_form') {
        return this.pushToDataLayer('service_request_submit', {
            event_category: 'lead_generation',
            event_label: 'service_request_form',
            service_category: serviceData.serviceCategory || 'unknown',
            customer_name: serviceData.customerName || '',
            customer_phone: 'MASKED', // Don't send actual phone numbers
            customer_city: serviceData.customerCity || 'unknown',
            urgency_level: serviceData.urgency || 'normal',
            problem_description: serviceData.problemDescription ? 'provided' : 'not_provided',
            form_source: formSource,
            form_completion_rate: 100,
            conversion_value: this.calculateServiceValue(serviceData.serviceCategory),
            currency: 'TRY',
            lead_score: this.calculateLeadScore(serviceData),
            gtm_event_id: 'srv_req_' + Date.now()
        });
    },
    
    // Contact Interaction Enhanced Event  
    trackContactInteraction: function(contactMethod, contactData = {}) {
        return this.pushToDataLayer('contact_interaction', {
            event_category: 'engagement',
            event_label: `contact_${contactMethod}`,
            contact_method: contactMethod,
            contact_intent: 'service_inquiry',
            urgency_indicator: contactData.urgency || 'normal',
            page_context: window.location.pathname,
            interaction_type: 'immediate',
            conversion_value: 50, // Estimated contact value
            currency: 'TRY',
            lead_quality: contactMethod === 'phone' ? 'high' : 'medium',
            gtm_event_id: 'contact_' + Date.now()
        });
    },
    
    // Page Engagement Enhanced Tracking
    trackPageEngagement: function(engagementType, engagementData = {}) {
        return this.pushToDataLayer('page_engagement', {
            event_category: 'user_engagement',
            event_label: engagementType,
            engagement_type: engagementType,
            engagement_score: this.calculateEngagementScore(engagementData),
            scroll_depth: engagementData.scrollDepth || 0,
            time_on_page: engagementData.timeSpent || 0,
            interactions_count: engagementData.interactions || 0,
            content_group: 'home_services',
            engagement_level: this.getEngagementLevel(engagementData),
            gtm_event_id: 'engage_' + Date.now()
        });
    },
    
    // Service Category Selection Tracking
    trackServiceSelection: function(serviceCategory, selectionDepth = 1) {
        return this.pushToDataLayer('service_category_selection', {
            event_category: 'product_interaction',
            event_label: serviceCategory,
            service_category: serviceCategory,
            selection_depth: selectionDepth,
            browsing_pattern: selectionDepth > 1 ? 'exploring' : 'focused',
            interest_level: selectionDepth > 2 ? 'high' : 'medium',
            content_group: 'service_categories',
            conversion_likelihood: this.calculateConversionLikelihood(serviceCategory, selectionDepth),
            gtm_event_id: 'svc_sel_' + Date.now()
        });
    },
    
    // AI Chat Enhanced Integration
    trackAIChatInteraction: function(chatAction, chatData = {}) {
        return this.pushToDataLayer('ai_chat_interaction', {
            event_category: 'ai_engagement',
            event_label: chatAction,
            chat_action: chatAction,
            chat_stage: chatData.stage || 'initial',
            user_intent: chatData.intent || 'service_inquiry',
            automation_level: 'ai_assisted',
            interaction_quality: chatData.quality || 'standard',
            chat_duration: chatData.duration || 0,
            messages_exchanged: chatData.messageCount || 1,
            conversion_indicator: chatAction.includes('quote') ? 'high' : 'medium',
            gtm_event_id: 'ai_chat_' + Date.now()
        });
    },
    
    // E-commerce Enhanced Events (for GTM Enhanced E-commerce)
    trackServicePurchase: function(serviceData, purchaseValue) {
        return this.pushToDataLayer('purchase', {
            event_category: 'ecommerce',
            transaction_id: 'srv_' + Date.now(),
            value: purchaseValue,
            currency: 'TRY',
            items: [{
                item_id: serviceData.serviceCategory,
                item_name: this.getServiceName(serviceData.serviceCategory),
                item_category: 'home_services',
                item_category2: serviceData.serviceCategory,
                item_variant: serviceData.urgency || 'standard',
                quantity: 1,
                price: purchaseValue
            }],
            service_type: serviceData.serviceCategory,
            customer_segment: 'direct_customer',
            purchase_method: 'service_booking',
            gtm_event_id: 'purchase_' + Date.now()
        });
    },
    
    // Custom Conversion Events
    trackCustomConversion: function(conversionType, conversionData = {}) {
        return this.pushToDataLayer('custom_conversion', {
            event_category: 'conversion',
            event_label: conversionType,
            conversion_type: conversionType,
            conversion_value: conversionData.value || 0,
            currency: 'TRY',
            conversion_stage: conversionData.stage || 'unknown',
            attribution_source: conversionData.source || 'website',
            customer_journey_stage: conversionData.journeyStage || 'conversion',
            gtm_event_id: 'conv_' + Date.now()
        });
    },
    
    // Advanced User Journey Tracking
    trackUserJourney: function(journeyStage, journeyData = {}) {
        return this.pushToDataLayer('user_journey_progress', {
            event_category: 'user_journey',
            event_label: journeyStage,
            journey_stage: journeyStage,
            stage_number: journeyData.stageNumber || 1,
            total_stages: journeyData.totalStages || 5,
            progress_percentage: Math.round((journeyData.stageNumber || 1) / (journeyData.totalStages || 5) * 100),
            journey_source: journeyData.source || 'organic',
            time_in_stage: journeyData.timeInStage || 0,
            stage_completion: journeyData.completed || false,
            gtm_event_id: 'journey_' + Date.now()
        });
    },
    
    // Scroll Depth Enhanced Tracking
    trackScrollDepth: function(percentage, contentType = 'page') {
        if (![25, 50, 75, 90, 100].includes(percentage)) return;
        
        return this.pushToDataLayer('scroll_depth', {
            event_category: 'user_engagement',
            event_label: `scroll_${percentage}_percent`,
            scroll_depth_threshold: percentage,
            content_type: contentType,
            page_height: document.documentElement.scrollHeight,
            viewport_height: window.innerHeight,
            engagement_indicator: percentage >= 75 ? 'high' : percentage >= 50 ? 'medium' : 'low',
            gtm_event_id: 'scroll_' + Date.now()
        });
    },
    
    // Form Progress Enhanced Tracking
    trackFormProgress: function(formStep, formData = {}) {
        return this.pushToDataLayer('form_progress', {
            event_category: 'form_interaction',
            event_label: `form_step_${formStep}`,
            form_step: formStep,
            form_type: formData.formType || 'service_request',
            fields_completed: formData.fieldsCompleted || 0,
            total_fields: formData.totalFields || 1,
            completion_rate: Math.round((formData.fieldsCompleted || 0) / (formData.totalFields || 1) * 100),
            form_errors: formData.errors || 0,
            time_spent: formData.timeSpent || 0,
            gtm_event_id: 'form_prog_' + Date.now()
        });
    },
    
    // Helper Functions
    calculateServiceValue: function(serviceCategory) {
        const serviceValues = {
            'televizyon_tamiri': 300,
            'bilgisayar_tamiri': 250,
            'beyaz_esya_tamiri': 400,
            'klima_tamiri': 350,
            'elektronik_tamiri': 200,
            'ev_elektrigi': 180,
            'su_tesisati': 160
        };
        return serviceValues[serviceCategory] || 250;
    },
    
    calculateLeadScore: function(serviceData) {
        let score = 50; // Base score
        
        // Add points for urgency
        if (serviceData.urgency === 'acil') score += 30;
        else if (serviceData.urgency === 'bugun') score += 20;
        else if (serviceData.urgency === 'bu_hafta') score += 10;
        
        // Add points for problem description
        if (serviceData.problemDescription && serviceData.problemDescription.length > 20) score += 15;
        
        // Add points for complete contact info
        if (serviceData.customerName && serviceData.customerPhone) score += 10;
        if (serviceData.customerCity) score += 5;
        
        return Math.min(score, 100);
    },
    
    calculateEngagementScore: function(engagementData) {
        let score = 0;
        score += (engagementData.timeSpent || 0) / 10; // 1 point per 10 seconds
        score += (engagementData.scrollDepth || 0) / 10; // 1 point per 10% scroll
        score += (engagementData.interactions || 0) * 5; // 5 points per interaction
        score += (engagementData.pageViews || 1) * 2; // 2 points per page view
        return Math.min(Math.round(score), 100);
    },
    
    getEngagementLevel: function(engagementData) {
        const score = this.calculateEngagementScore(engagementData);
        if (score >= 80) return 'very_high';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        if (score >= 20) return 'low';
        return 'very_low';
    },
    
    calculateConversionLikelihood: function(serviceCategory, selectionDepth) {
        let likelihood = 30; // Base likelihood
        
        // High-demand services have higher likelihood
        const highDemandServices = ['televizyon_tamiri', 'klima_tamiri', 'beyaz_esya_tamiri'];
        if (highDemandServices.includes(serviceCategory)) likelihood += 20;
        
        // Multiple selections indicate higher intent
        likelihood += Math.min(selectionDepth * 10, 30);
        
        return Math.min(likelihood, 90);
    },
    
    getServiceName: function(serviceCategory) {
        const serviceNames = {
            'televizyon_tamiri': 'Televizyon Tamiri',
            'bilgisayar_tamiri': 'Bilgisayar Tamiri',
            'beyaz_esya_tamiri': 'Beyaz Eşya Tamiri',
            'klima_tamiri': 'Klima Tamiri',
            'elektronik_tamiri': 'Elektronik Tamiri',
            'ev_elektrigi': 'Ev Elektriği',
            'su_tesisati': 'Su Tesisatı'
        };
        return serviceNames[serviceCategory] || 'Genel Servis';
    }
};

// Enhanced Auto-Event Listeners for GTM Integration
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing GTM Enhanced Event Tracking...');
    
    // Enhanced form tracking with detailed progress
    const serviceForm = document.getElementById('serviceRequestForm');
    if (serviceForm) {
        // Track form start
        let formStarted = false;
        const formInputs = serviceForm.querySelectorAll('input, select, textarea');
        
        formInputs.forEach((input, index) => {
            input.addEventListener('focus', function() {
                if (!formStarted) {
                    formStarted = true;
                    window.GTM_EVENTS.trackFormProgress('form_start', {
                        formType: 'service_request',
                        totalFields: formInputs.length
                    });
                }
            });
            
            input.addEventListener('blur', function() {
                const completedFields = Array.from(formInputs).filter(inp => inp.value.trim() !== '').length;
                window.GTM_EVENTS.trackFormProgress('field_complete', {
                    formType: 'service_request',
                    fieldsCompleted: completedFields,
                    totalFields: formInputs.length,
                    currentField: input.name || 'unknown'
                });
            });
        });
        
        // Track form submission
        serviceForm.addEventListener('submit', function(e) {
            const formData = new FormData(serviceForm);
            const formObject = {};
            for (let [key, value] of formData.entries()) {
                formObject[key] = value;
            }
            
            // Track service request with enhanced data
            window.GTM_EVENTS.trackServiceRequest(formObject, 'main_form');
            
            // Track as custom conversion
            window.GTM_EVENTS.trackCustomConversion('service_request_submit', {
                value: window.GTM_EVENTS.calculateServiceValue(formObject.serviceCategory),
                stage: 'form_completion',
                source: 'website_form'
            });
            
            // Track user journey progression
            window.GTM_EVENTS.trackUserJourney('conversion', {
                stageNumber: 5,
                totalStages: 5,
                completed: true,
                source: 'form_submission'
            });
        });
    }
    
    // Enhanced contact button tracking
    const contactButtons = document.querySelectorAll('a[href*="tel:"], a[href*="whatsapp"], a[href*="mailto:"]');
    contactButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const href = this.href || '';
            let contactMethod = '';
            
            if (href.includes('tel:')) {
                contactMethod = 'phone';
            } else if (href.includes('whatsapp') || href.includes('wa.me')) {
                contactMethod = 'whatsapp';
            } else if (href.includes('mailto:')) {
                contactMethod = 'email';
            }
            
            if (contactMethod) {
                window.GTM_EVENTS.trackContactInteraction(contactMethod, {
                    urgency: this.dataset.urgency || 'normal',
                    source: 'contact_button'
                });
                
                // Track user journey progression
                window.GTM_EVENTS.trackUserJourney('intent', {
                    stageNumber: 4,
                    totalStages: 5,
                    source: 'contact_interaction'
                });
            }
        });
    });
    
    // Enhanced service selection tracking
    const serviceSelect = document.getElementById('serviceCategory');
    let serviceSelectionCount = 0;
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            serviceSelectionCount++;
            const selectedOption = this.options[this.selectedIndex];
            const serviceCategory = selectedOption.value;
            
            window.GTM_EVENTS.trackServiceSelection(serviceCategory, serviceSelectionCount);
            
            // Track user journey progression
            window.GTM_EVENTS.trackUserJourney('consideration', {
                stageNumber: 3,
                totalStages: 5,
                source: 'service_selection'
            });
        });
    }
    
    // Enhanced scroll depth tracking
    let scrollMilestones = new Set();
    window.addEventListener('scroll', function() {
        const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        const milestones = [25, 50, 75, 90, 100];
        milestones.forEach(milestone => {
            if (scrollPercentage >= milestone && !scrollMilestones.has(milestone)) {
                scrollMilestones.add(milestone);
                window.GTM_EVENTS.trackScrollDepth(milestone, 'service_page');
                
                // Track page engagement
                if (milestone >= 75) {
                    window.GTM_EVENTS.trackPageEngagement('deep_scroll', {
                        scrollDepth: milestone,
                        highValue: true
                    });
                }
            }
        });
    });
    
    // Enhanced time-based engagement tracking
    let timeTrackingIntervals = [30, 60, 120, 300]; // seconds
    let pageLoadTime = Date.now();
    
    timeTrackingIntervals.forEach(interval => {
        setTimeout(() => {
            const timeSpent = Math.round((Date.now() - pageLoadTime) / 1000);
            
            if (timeSpent >= interval) {
                window.GTM_EVENTS.trackPageEngagement('time_engagement', {
                    timeSpent: timeSpent,
                    engagementThreshold: interval,
                    interactions: document.querySelectorAll('*:focus').length
                });
                
                // Track user journey progression for engaged users
                if (interval >= 60) {
                    window.GTM_EVENTS.trackUserJourney('interest', {
                        stageNumber: 2,
                        totalStages: 5,
                        source: 'time_engagement',
                        timeInStage: timeSpent
                    });
                }
            }
        }, interval * 1000);
    });
    
    // AI Chat enhanced tracking
    const aiChatButton = document.getElementById('aiChatButton');
    if (aiChatButton) {
        aiChatButton.addEventListener('click', function() {
            window.GTM_EVENTS.trackAIChatInteraction('chat_initiated', {
                stage: 'initial',
                intent: 'service_inquiry'
            });
            
            // Track user journey progression
            window.GTM_EVENTS.trackUserJourney('interest', {
                stageNumber: 2,
                totalStages: 5,
                source: 'ai_chat_interaction'
            });
        });
    }
    
    // Initialize page view tracking
    window.GTM_EVENTS.trackUserJourney('awareness', {
        stageNumber: 1,
        totalStages: 5,
        source: 'page_load'
    });
    
    console.log('✅ GTM Enhanced Event Tracking initialized successfully!');
});

// Manual GTM Event Triggers
window.trackGTMServiceQuote = function(serviceCategory, estimatedValue) {
    window.GTM_EVENTS.trackCustomConversion('service_quote_request', {
        value: estimatedValue,
        stage: 'quote_request',
        source: 'manual_trigger'
    });
};

window.trackGTMServiceBooking = function(serviceCategory, bookingValue) {
    window.GTM_EVENTS.trackServicePurchase({
        serviceCategory: serviceCategory
    }, bookingValue);
};

window.trackGTMAIChatRecommendation = function(serviceMatch, confidence) {
    window.GTM_EVENTS.trackAIChatInteraction('service_recommendation_received', {
        serviceMatch: serviceMatch,
        confidence: confidence,
        stage: 'recommendation'
    });
};

console.log('🏷️ Google Tag Manager Enhanced Integration System loaded successfully!');

// =============================================================================
// GARANTOR360 - KVKV Compliant Cookie Consent Management System
// =============================================================================

console.log('🔒 Loading KVKV Compliant Cookie Consent System...');

// KVKV Cookie Consent Manager
window.KVKVCookieConsent = {
    
    // Configuration
    config: {
        cookieName: 'kvkv_cookie_consent',
        consentDuration: 365, // days
        showBanner: true,
        position: 'bottom',
        theme: 'light',
        language: 'tr',
        companyName: 'GARANTOR360',
        contactEmail: 'kvkv@garantor360.com',
        privacyPolicyUrl: '/kvkv-politikasi',
        cookiePolicyUrl: '/cerez-politikasi'
    },
    
    // Cookie categories according to KVKV
    categories: {
        necessary: {
            name: 'Gerekli Çerezler',
            description: 'Websitesinin temel işlevlerini sağlayan zorunlu çerezler',
            required: true,
            enabled: true,
            cookies: ['session_id', 'csrf_token', 'kvkv_cookie_consent']
        },
        analytics: {
            name: 'Analitik Çerezler', 
            description: 'Website kullanımını anlamak için kullanılan çerezler (Google Analytics)',
            required: false,
            enabled: false,
            cookies: ['_ga', '_ga_*', '_gid', '_gat', 'gtag']
        },
        marketing: {
            name: 'Pazarlama Çerezler',
            description: 'Kişiselleştirilmiş reklamlar ve sosyal medya için kullanılan çerezler',
            required: false,
            enabled: false,
            cookies: ['_fbp', '_fbc', 'fbq', 'fr', 'sb', 'datr']
        },
        functional: {
            name: 'Fonksiyonel Çerezler',
            description: 'Kullanıcı deneyimini iyileştiren tercihler ve ayarlar',
            required: false,
            enabled: false,
            cookies: ['preferences', 'language', 'theme', 'location']
        }
    },
    
    // Get current consent status
    getConsent: function() {
        const consent = localStorage.getItem(this.config.cookieName);
        if (!consent) return null;
        
        try {
            const parsed = JSON.parse(consent);
            // Check if consent is still valid (not expired)
            if (new Date(parsed.expires) < new Date()) {
                this.clearConsent();
                return null;
            }
            return parsed;
        } catch (e) {
            return null;
        }
    },
    
    // Save consent preferences
    saveConsent: function(preferences) {
        const consent = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            expires: new Date(Date.now() + (this.config.consentDuration * 24 * 60 * 60 * 1000)).toISOString(),
            preferences: preferences,
            userAgent: navigator.userAgent,
            ip: 'masked_for_privacy' // Will be logged server-side
        };
        
        localStorage.setItem(this.config.cookieName, JSON.stringify(consent));
        
        // Send consent to server for KVKV compliance logging
        this.logConsentToServer(consent);
        
        // Apply consent preferences
        this.applyConsent(preferences);
        
        console.log('🔒 KVKV Cookie Consent saved:', preferences);
        return consent;
    },
    
    // Clear consent (for testing or withdrawal)
    clearConsent: function() {
        localStorage.removeItem(this.config.cookieName);
        
        // Clear all non-necessary cookies
        this.clearNonNecessaryCookies();
        
        console.log('🔒 KVKV Cookie Consent cleared');
    },
    
    // Apply consent preferences to tracking systems
    applyConsent: function(preferences) {
        // Apply to GA4
        if (preferences.analytics && typeof gtag !== 'undefined') {
            // Enable GA4 tracking
            gtag('consent', 'update', {
                'analytics_storage': 'granted',
                'ad_storage': preferences.marketing ? 'granted' : 'denied'
            });
            console.log('📊 GA4 consent updated: analytics=' + preferences.analytics);
        } else if (typeof gtag !== 'undefined') {
            // Disable GA4 tracking
            gtag('consent', 'update', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied'
            });
        }
        
        // Apply to Facebook Pixel
        if (preferences.marketing && typeof fbq !== 'undefined') {
            // Enable Facebook Pixel
            fbq('consent', 'grant');
            console.log('📘 Facebook Pixel consent granted');
        } else if (typeof fbq !== 'undefined') {
            // Revoke Facebook Pixel consent
            fbq('consent', 'revoke');
        }
        
        // Apply to GTM
        if (typeof window.dataLayer !== 'undefined') {
            window.dataLayer.push({
                event: 'cookie_consent_update',
                consent_analytics: preferences.analytics,
                consent_marketing: preferences.marketing,
                consent_functional: preferences.functional,
                consent_version: '1.0',
                consent_timestamp: new Date().toISOString()
            });
        }
        
        // Update tracking system states
        this.updateTrackingSystems(preferences);
    },
    
    // Update tracking systems based on consent
    updateTrackingSystems: function(preferences) {
        // Disable/enable tracking functions based on consent
        if (!preferences.analytics) {
            // Disable GA4 events
            window.GA4_EVENTS = window.GA4_EVENTS || {};
            const originalFunctions = window.GA4_EVENTS;
            for (const key in originalFunctions) {
                if (typeof originalFunctions[key] === 'function') {
                    window.GA4_EVENTS[key] = function() {
                        console.log('⚠️ GA4 tracking disabled by cookie consent:', key);
                    };
                }
            }
        }
        
        if (!preferences.marketing) {
            // Disable Facebook Pixel events
            window.FB_PIXEL_EVENTS = window.FB_PIXEL_EVENTS || {};
            const originalFBFunctions = window.FB_PIXEL_EVENTS;
            for (const key in originalFBFunctions) {
                if (typeof originalFBFunctions[key] === 'function') {
                    window.FB_PIXEL_EVENTS[key] = function() {
                        console.log('⚠️ Facebook Pixel tracking disabled by cookie consent:', key);
                    };
                }
            }
        }
        
        if (!preferences.functional) {
            // Clear functional cookies
            ['preferences', 'language', 'theme', 'location'].forEach(cookie => {
                this.deleteCookie(cookie);
            });
        }
    },
    
    // Clear non-necessary cookies
    clearNonNecessaryCookies: function() {
        const allCookies = document.cookie.split(';');
        
        allCookies.forEach(cookie => {
            const cookieName = cookie.split('=')[0].trim();
            
            // Check if cookie is necessary
            let isNecessary = false;
            for (const category in this.categories) {
                if (this.categories[category].required && 
                    this.categories[category].cookies.some(c => 
                        c === cookieName || (c.endsWith('*') && cookieName.startsWith(c.slice(0, -1)))
                    )) {
                    isNecessary = true;
                    break;
                }
            }
            
            if (!isNecessary) {
                this.deleteCookie(cookieName);
            }
        });
    },
    
    // Delete specific cookie
    deleteCookie: function(name) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname + ';';
    },
    
    // Show cookie consent banner
    showConsentBanner: function() {
        if (document.getElementById('kvkv-consent-banner')) {
            return; // Banner already exists
        }
        
        const banner = document.createElement('div');
        banner.id = 'kvkv-consent-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1f2937;
            color: white;
            padding: 20px;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        banner.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 15px;">
                <div style="flex: 1; min-width: 300px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                        🔒 Gizlilik ve Çerez Politikası
                    </h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.4; opacity: 0.9;">
                        KVKV kapsamında kişisel verilerinizi korumak için çerezleri kullanıyoruz. 
                        Websitemizi kullanmaya devam ederek çerez politikamızı kabul ettiğinizi beyan etmiş olursunuz.
                    </p>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="KVKVCookieConsent.showDetailedConsent()" 
                            style="background: transparent; border: 1px solid #6b7280; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        ⚙️ Ayarlar
                    </button>
                    <button onclick="KVKVCookieConsent.acceptAll()" 
                            style="background: #10b981; border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">
                        ✓ Kabul Et
                    </button>
                    <button onclick="KVKVCookieConsent.rejectAll()" 
                            style="background: #ef4444; border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">
                        ✗ Reddet
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Add slide-up animation
        setTimeout(() => {
            banner.style.transform = 'translateY(0)';
            banner.style.transition = 'transform 0.3s ease-out';
        }, 100);
    },
    
    // Show detailed consent modal
    showDetailedConsent: function() {
        if (document.getElementById('kvkv-consent-modal')) {
            return; // Modal already exists
        }
        
        const modal = document.createElement('div');
        modal.id = 'kvkv-consent-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const currentConsent = this.getConsent();
        const preferences = currentConsent ? currentConsent.preferences : {
            necessary: true,
            analytics: false,
            marketing: false,
            functional: false
        };
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: between; align-items: center;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #1f2937;">
                            🔒 Gizlilik Tercihleri
                        </h2>
                        <button onclick="KVKVCookieConsent.closeModal()" 
                                style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; margin-left: auto;">
                            ×
                        </button>
                    </div>
                    <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 14px;">
                        KVKV kapsamında hangi çerez kategorilerini kabul ettiğinizi seçin.
                    </p>
                </div>
                
                <div style="padding: 24px;">
                    ${Object.entries(this.categories).map(([key, category]) => `
                        <div style="margin-bottom: 20px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="flex: 1;">
                                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                                        ${category.name}
                                        ${category.required ? '<span style="color: #ef4444; font-size: 12px;">(Zorunlu)</span>' : ''}
                                    </h3>
                                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
                                        ${category.description}
                                    </p>
                                </div>
                                <label style="margin-left: 16px; display: flex; align-items: center; cursor: ${category.required ? 'not-allowed' : 'pointer'};">
                                    <input type="checkbox" 
                                           id="consent-${key}" 
                                           ${preferences[key] || category.required ? 'checked' : ''}
                                           ${category.required ? 'disabled' : ''}
                                           style="width: 18px; height: 18px; cursor: ${category.required ? 'not-allowed' : 'pointer'};">
                                </label>
                            </div>
                            <div style="font-size: 12px; color: #9ca3af;">
                                <strong>Çerezler:</strong> ${category.cookies.join(', ')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button onclick="KVKVCookieConsent.saveDetailedConsent()" 
                                    style="background: #10b981; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                Tercihleri Kaydet
                            </button>
                            <button onclick="KVKVCookieConsent.closeModal()" 
                                    style="background: #6b7280; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                                İptal
                            </button>
                        </div>
                        
                        <div style="margin-top: 16px; text-align: center;">
                            <a href="${this.config.privacyPolicyUrl}" target="_blank" 
                               style="color: #3b82f6; text-decoration: none; font-size: 14px; margin-right: 16px;">
                                KVKV Politikası
                            </a>
                            <a href="${this.config.cookiePolicyUrl}" target="_blank" 
                               style="color: #3b82f6; text-decoration: none; font-size: 14px;">
                                Çerez Politikası
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // Accept all cookies
    acceptAll: function() {
        const preferences = {
            necessary: true,
            analytics: true,
            marketing: true,
            functional: true
        };
        
        this.saveConsent(preferences);
        this.hideBanner();
        
        // Track consent acceptance
        if (typeof window.GTM_EVENTS !== 'undefined') {
            window.GTM_EVENTS.pushToDataLayer('cookie_consent_accepted', {
                consent_type: 'accept_all',
                categories_accepted: Object.keys(preferences).filter(k => preferences[k])
            });
        }
    },
    
    // Reject all non-necessary cookies
    rejectAll: function() {
        const preferences = {
            necessary: true,
            analytics: false,
            marketing: false,
            functional: false
        };
        
        this.saveConsent(preferences);
        this.hideBanner();
        
        // Track consent rejection
        if (typeof window.GTM_EVENTS !== 'undefined') {
            window.GTM_EVENTS.pushToDataLayer('cookie_consent_rejected', {
                consent_type: 'reject_all',
                categories_accepted: ['necessary']
            });
        }
    },
    
    // Save detailed consent from modal
    saveDetailedConsent: function() {
        const preferences = {
            necessary: true, // Always true
            analytics: document.getElementById('consent-analytics').checked,
            marketing: document.getElementById('consent-marketing').checked,
            functional: document.getElementById('consent-functional').checked
        };
        
        this.saveConsent(preferences);
        this.closeModal();
        this.hideBanner();
        
        // Track detailed consent
        if (typeof window.GTM_EVENTS !== 'undefined') {
            window.GTM_EVENTS.pushToDataLayer('cookie_consent_detailed', {
                consent_type: 'detailed_selection',
                categories_accepted: Object.keys(preferences).filter(k => preferences[k])
            });
        }
    },
    
    // Close consent modal
    closeModal: function() {
        const modal = document.getElementById('kvkv-consent-modal');
        if (modal) {
            modal.remove();
        }
    },
    
    // Hide consent banner
    hideBanner: function() {
        const banner = document.getElementById('kvkv-consent-banner');
        if (banner) {
            banner.style.transform = 'translateY(100%)';
            setTimeout(() => banner.remove(), 300);
        }
    },
    
    // Log consent to server for KVKV compliance
    logConsentToServer: function(consent) {
        fetch('/api/privacy/kvkv-consent-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                consentData: consent,
                pageUrl: window.location.href,
                timestamp: new Date().toISOString()
            })
        }).then(response => {
            if (response.ok) {
                console.log('📝 KVKV consent logged to server');
            }
        }).catch(error => {
            console.warn('⚠️ Failed to log KVKV consent:', error);
        });
    },
    
    // Initialize consent system
    init: function() {
        console.log('🚀 Initializing KVKV Cookie Consent System...');
        
        const consent = this.getConsent();
        
        if (consent) {
            // Apply existing consent
            console.log('📝 Existing KVKV consent found, applying preferences...');
            this.applyConsent(consent.preferences);
        } else {
            // Show consent banner for new users
            console.log('📢 No KVKV consent found, showing banner...');
            
            // Initialize with default consent (necessary only)
            gtag('consent', 'default', {
                'ad_storage': 'denied',
                'analytics_storage': 'denied',
                'functionality_storage': 'denied',
                'personalization_storage': 'denied',
                'security_storage': 'granted',
                'wait_for_update': 500
            });
            
            setTimeout(() => {
                if (this.config.showBanner) {
                    this.showConsentBanner();
                }
            }, 1000); // Show after page load
        }
    },
    
    // Withdraw consent (for KVKV compliance)
    withdrawConsent: function() {
        this.clearConsent();
        this.showDetailedConsent();
        
        // Track consent withdrawal
        if (typeof window.GTM_EVENTS !== 'undefined') {
            window.GTM_EVENTS.pushToDataLayer('cookie_consent_withdrawn', {
                withdrawal_timestamp: new Date().toISOString()
            });
        }
        
        console.log('📋 KVKV consent withdrawn by user');
    }
};

// Initialize KVKV Cookie Consent when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other systems to load
    setTimeout(() => {
        window.KVKVCookieConsent.init();
    }, 500);
});

// Global functions for easier access
window.showCookieSettings = function() {
    window.KVKVCookieConsent.showDetailedConsent();
};

window.withdrawCookieConsent = function() {
    window.KVKVCookieConsent.withdrawConsent();
};

console.log('🔒 KVKV Cookie Consent Management System loaded successfully!');

// =============================================================================
// GARANTOR360 - Advanced Bot Protection & Fraud Detection System
// =============================================================================

console.log('🛡️ Loading Advanced Bot Protection System...');

// Advanced Bot Protection & Google Ads Fraud Prevention
window.BotProtection = {
    
    // Configuration
    config: {
        enabled: true,
        humanScoreThreshold: 30,
        maxClicksPerMinute: 10,
        maxPageViewsPerMinute: 20,
        blockDurationMinutes: 15,
        challengeThreshold: 50
    },
    
    // Behavioral tracking data
    behaviorData: {
        pageLoadTime: Date.now(),
        mouseMovements: [],
        clicks: [],
        scrollEvents: [],
        keystrokes: [],
        focusEvents: [],
        deviceMotion: false,
        touchEvents: false,
        resizeEvents: 0
    },
    
    // Suspicious patterns detection
    suspiciousPatterns: {
        rapidClicking: { threshold: 10, window: 30000 },
        noMouseMovement: { threshold: 5000 }, // 5 seconds without mouse
        perfectTiming: { variance: 50 }, // Too consistent click timing
        linearMouseMovement: { threshold: 0.95 }, // Too straight mouse paths
        noScrolling: { threshold: 10000 }, // 10 seconds without scroll
        rapidFormFilling: { threshold: 1000 }, // Form filled too quickly
        automationSignatures: [
            'webdriver', 'phantom', 'selenium', 'puppeteer', 
            'headless', 'chrome-lighthouse', 'bot', 'crawler'
        ]
    },
    
    // Initialize bot protection
    init: function() {
        if (!this.config.enabled) return;
        
        console.log('🚀 Initializing Advanced Bot Protection...');
        
        this.setupBehaviorTracking();
        this.detectEnvironment();
        this.startPeriodicValidation();
        
        // Check if user is already flagged
        this.checkExistingFlags();
        
        console.log('✅ Bot Protection System active');
    },
    
    // Setup comprehensive behavior tracking
    setupBehaviorTracking: function() {
        const self = this;
        
        // Mouse movement tracking with path analysis
        document.addEventListener('mousemove', function(e) {
            const now = Date.now();
            self.behaviorData.mouseMovements.push({
                x: e.clientX,
                y: e.clientY,
                timestamp: now,
                pressure: e.pressure || 0.5
            });
            
            // Keep only last 50 movements for performance
            if (self.behaviorData.mouseMovements.length > 50) {
                self.behaviorData.mouseMovements.shift();
            }
        });
        
        // Click tracking with timing analysis
        document.addEventListener('click', function(e) {
            const now = Date.now();
            self.behaviorData.clicks.push({
                x: e.clientX,
                y: e.clientY,
                timestamp: now,
                target: e.target.tagName,
                button: e.button
            });
            
            // Check for rapid clicking
            self.checkRapidClicking();
        });
        
        // Scroll tracking
        window.addEventListener('scroll', function(e) {
            self.behaviorData.scrollEvents.push({
                scrollY: window.scrollY,
                timestamp: Date.now()
            });
        });
        
        // Keyboard tracking
        document.addEventListener('keydown', function(e) {
            self.behaviorData.keystrokes.push({
                key: e.key,
                timestamp: Date.now(),
                ctrlKey: e.ctrlKey,
                altKey: e.altKey
            });
        });
        
        // Focus events tracking
        document.addEventListener('focusin', function(e) {
            self.behaviorData.focusEvents.push({
                target: e.target.tagName,
                timestamp: Date.now()
            });
        });
        
        // Touch events (mobile detection)
        document.addEventListener('touchstart', function(e) {
            self.behaviorData.touchEvents = true;
        });
        
        // Device motion (mobile users)
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', function(e) {
                self.behaviorData.deviceMotion = true;
            });
        }
        
        // Window resize events
        window.addEventListener('resize', function() {
            self.behaviorData.resizeEvents++;
        });
    },
    
    // Detect automation environment
    detectEnvironment: function() {
        const flags = [];
        
        // Check for webdriver
        if (navigator.webdriver) flags.push('webdriver_detected');
        
        // Check for automation frameworks
        if (window.phantom || window._phantom) flags.push('phantomjs_detected');
        if (window.Buffer) flags.push('nodejs_detected');
        if (window.emit) flags.push('puppeteer_detected');
        if (window.scrollByLines) flags.push('headless_detected');
        
        // Check user agent for bot signatures
        const userAgent = navigator.userAgent.toLowerCase();
        this.suspiciousPatterns.automationSignatures.forEach(signature => {
            if (userAgent.includes(signature)) {
                flags.push(`ua_${signature}_detected`);
            }
        });
        
        // Check for missing features (headless browsers)
        if (!navigator.plugins || navigator.plugins.length === 0) flags.push('no_plugins');
        if (!navigator.languages || navigator.languages.length === 0) flags.push('no_languages');
        
        // Check screen properties
        if (screen.width === 0 || screen.height === 0) flags.push('invalid_screen');
        
        // Check for consistent properties (virtual displays)
        if (screen.width === 1024 && screen.height === 768) flags.push('common_virtual_display');
        
        if (flags.length > 0) {
            console.warn('⚠️ Environment flags detected:', flags);
            this.logSuspiciousActivity('environment_detection', { flags: flags });
        }
        
        return flags;
    },
    
    // Calculate comprehensive human score
    calculateHumanScore: function() {
        let score = 0;
        const now = Date.now();
        const timeOnPage = now - this.behaviorData.pageLoadTime;
        
        // Mouse movement analysis (0-25 points)
        if (this.behaviorData.mouseMovements.length > 0) {
            const movements = this.behaviorData.mouseMovements;
            
            // Natural movement patterns
            if (movements.length > 10) score += 15;
            
            // Mouse path variation (curved vs straight lines)
            const pathVariation = this.calculatePathVariation(movements);
            score += Math.min(pathVariation * 10, 10);
        }
        
        // Click behavior analysis (0-20 points)
        if (this.behaviorData.clicks.length > 0) {
            const clicks = this.behaviorData.clicks;
            
            // Click timing variation (humans have irregular timing)
            const timingVariation = this.calculateTimingVariation(clicks);
            score += Math.min(timingVariation / 100, 15);
            
            // Click position variation
            const positionVariation = this.calculatePositionVariation(clicks);
            score += Math.min(positionVariation / 50, 5);
        }
        
        // Scroll behavior (0-15 points)
        if (this.behaviorData.scrollEvents.length > 0) {
            score += Math.min(this.behaviorData.scrollEvents.length * 2, 15);
        }
        
        // Keyboard interaction (0-15 points)
        if (this.behaviorData.keystrokes.length > 0) {
            score += Math.min(this.behaviorData.keystrokes.length * 3, 15);
        }
        
        // Mobile device indicators (0-10 points)
        if (this.behaviorData.touchEvents) score += 5;
        if (this.behaviorData.deviceMotion) score += 5;
        
        // Time spent on page (0-10 points)
        if (timeOnPage > 5000) score += 5; // More than 5 seconds
        if (timeOnPage > 30000) score += 5; // More than 30 seconds
        
        // Focus events (form interactions) (0-5 points)
        if (this.behaviorData.focusEvents.length > 0) {
            score += Math.min(this.behaviorData.focusEvents.length * 2, 5);
        }
        
        return Math.min(Math.round(score), 100);
    },
    
    // Calculate mouse path variation (natural vs robotic)
    calculatePathVariation: function(movements) {
        if (movements.length < 3) return 0;
        
        let totalCurvature = 0;
        for (let i = 1; i < movements.length - 1; i++) {
            const p1 = movements[i - 1];
            const p2 = movements[i];
            const p3 = movements[i + 1];
            
            // Calculate angle deviation
            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
            const deviation = Math.abs(angle2 - angle1);
            
            totalCurvature += deviation;
        }
        
        return totalCurvature / (movements.length - 2);
    },
    
    // Calculate click timing variation
    calculateTimingVariation: function(clicks) {
        if (clicks.length < 2) return 0;
        
        const intervals = [];
        for (let i = 1; i < clicks.length; i++) {
            intervals.push(clicks[i].timestamp - clicks[i - 1].timestamp);
        }
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        
        return Math.sqrt(variance);
    },
    
    // Calculate click position variation
    calculatePositionVariation: function(clicks) {
        if (clicks.length < 2) return 0;
        
        let totalDistance = 0;
        for (let i = 1; i < clicks.length; i++) {
            const dx = clicks[i].x - clicks[i - 1].x;
            const dy = clicks[i].y - clicks[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }
        
        return totalDistance / (clicks.length - 1);
    },
    
    // Check for rapid clicking patterns
    checkRapidClicking: function() {
        const now = Date.now();
        const recent = this.behaviorData.clicks.filter(click => 
            now - click.timestamp < this.suspiciousPatterns.rapidClicking.window
        );
        
        if (recent.length > this.suspiciousPatterns.rapidClicking.threshold) {
            this.logSuspiciousActivity('rapid_clicking', {
                clickCount: recent.length,
                timeWindow: this.suspiciousPatterns.rapidClicking.window
            });
            return true;
        }
        
        return false;
    },
    
    // Comprehensive bot detection analysis
    detectBot: function() {
        const humanScore = this.calculateHumanScore();
        const environmentFlags = this.detectEnvironment();
        const timeOnPage = Date.now() - this.behaviorData.pageLoadTime;
        
        const analysis = {
            humanScore: humanScore,
            environmentFlags: environmentFlags,
            timeOnPage: timeOnPage,
            isBot: false,
            confidence: 0,
            reasons: [],
            recommendation: 'allow'
        };
        
        // Scoring criteria
        if (humanScore < this.config.humanScoreThreshold) {
            analysis.reasons.push(`Low human score: ${humanScore}`);
            analysis.confidence += 30;
        }
        
        if (environmentFlags.length > 0) {
            analysis.reasons.push(`Environment flags: ${environmentFlags.join(', ')}`);
            analysis.confidence += environmentFlags.length * 20;
        }
        
        if (timeOnPage < 2000 && this.behaviorData.clicks.length > 2) {
            analysis.reasons.push('Rapid interaction without sufficient time');
            analysis.confidence += 25;
        }
        
        if (this.behaviorData.mouseMovements.length === 0 && timeOnPage > 5000) {
            analysis.reasons.push('No mouse movement detected');
            analysis.confidence += 20;
        }
        
        if (this.checkRapidClicking()) {
            analysis.reasons.push('Rapid clicking pattern detected');
            analysis.confidence += 35;
        }
        
        // Decision logic
        if (analysis.confidence >= 80) {
            analysis.isBot = true;
            analysis.recommendation = 'block';
        } else if (analysis.confidence >= 50) {
            analysis.recommendation = 'challenge';
        } else {
            analysis.recommendation = 'allow';
        }
        
        return analysis;
    },
    
    // Google Ads click fraud prevention
    validateAdClick: function(gclid, keyword, adData = {}) {
        const analysis = this.detectBot();
        
        const clickValidation = {
            gclid: gclid,
            keyword: keyword,
            timestamp: Date.now(),
            humanScore: analysis.humanScore,
            isValid: analysis.recommendation === 'allow',
            fraudRisk: analysis.confidence,
            reasons: analysis.reasons,
            deviceInfo: {
                userAgent: navigator.userAgent,
                screen: `${screen.width}x${screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language
            }
        };
        
        // Log to server for analysis
        this.logAdClickValidation(clickValidation);
        
        // If high fraud risk, don't track conversion
        if (clickValidation.fraudRisk >= 70) {
            console.warn('🚨 High fraud risk ad click detected:', clickValidation);
            return false;
        }
        
        console.log('✅ Valid ad click confirmed:', clickValidation);
        return true;
    },
    
    // Log suspicious activity
    logSuspiciousActivity: function(activityType, details) {
        const logData = {
            activityType: activityType,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            pageUrl: window.location.href,
            humanScore: this.calculateHumanScore()
        };
        
        // Send to backend
        fetch('/api/security/suspicious-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        }).catch(error => {
            console.warn('Failed to log suspicious activity:', error);
        });
    },
    
    // Log ad click validation
    logAdClickValidation: function(validation) {
        fetch('/api/security/ad-click-validation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validation)
        }).catch(error => {
            console.warn('Failed to log ad click validation:', error);
        });
    },
    
    // Check existing flags for this session/IP
    checkExistingFlags: function() {
        const sessionFlag = sessionStorage.getItem('bot_protection_flag');
        if (sessionFlag) {
            const flag = JSON.parse(sessionFlag);
            if (flag.blocked && Date.now() < flag.expires) {
                this.showBlockedMessage(flag.reason);
                return true;
            }
        }
        return false;
    },
    
    // Show blocked message
    showBlockedMessage: function(reason) {
        const message = document.createElement('div');
        message.id = 'bot-protection-block';
        message.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            color: white;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;
        
        message.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2>🛡️ Erişim Geçici Olarak Kısıtlandı</h2>
                <p>Güvenlik nedeniyle erişiminiz geçici olarak kısıtlanmıştır.</p>
                <p><strong>Sebep:</strong> ${reason}</p>
                <p>Lütfen daha sonra tekrar deneyiniz.</p>
                <small>Problem devam ederse: info@garantor360.com</small>
            </div>
        `;
        
        document.body.appendChild(message);
    },
    
    // Start periodic validation
    startPeriodicValidation: function() {
        setInterval(() => {
            const analysis = this.detectBot();
            if (analysis.isBot && analysis.confidence >= 90) {
                console.warn('🚨 Bot behavior detected during session:', analysis);
                this.logSuspiciousActivity('periodic_validation', analysis);
            }
        }, 30000); // Check every 30 seconds
    }
};

// Auto-initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.BotProtection.init();
    }, 1000);
});

// Global functions for easy access
window.validateAdClick = function(gclid, keyword, adData) {
    return window.BotProtection.validateAdClick(gclid, keyword, adData);
};

window.checkBotStatus = function() {
    return window.BotProtection.detectBot();
};

console.log('🛡️ Advanced Bot Protection & Fraud Detection System loaded successfully!');

// =============================================================================
// GARANTOR360 - Schema.org Structured Data SEO System
// =============================================================================

console.log('🌐 Loading Schema.org Structured Data SEO System...');

// Schema.org Structured Data Generator
window.SchemaGenerator = {
    
    // Base business information
    businessInfo: {
        name: 'GARANTOR360',
        legalName: 'GARANTOR360 Teknik Servis Hizmetleri',
        description: 'Profesyonel televizyon tamiri, beyaz eşya servisi, klima bakımı ve bilgisayar tamiri hizmetleri. Türkiye geneli 7/24 acil servis desteği.',
        url: window.location.origin,
        telephone: '+90-500-123-45-67',
        email: 'info@garantor360.com',
        foundingDate: '2020-01-01',
        address: {
            streetAddress: 'İstanbul, Türkiye',
            addressLocality: 'İstanbul',
            addressRegion: 'İstanbul',
            postalCode: '34000',
            addressCountry: 'TR'
        },
        geo: {
            latitude: 41.0082,
            longitude: 28.9784
        },
        openingHours: [
            'Mo-Su 08:00-22:00'
        ],
        priceRange: '$$',
        currenciesAccepted: 'TRY',
        paymentAccepted: ['Cash', 'CreditCard', 'BankTransfer']
    },
    
    // Service definitions
    services: {
        televizyon_tamiri: {
            name: 'Televizyon Tamiri',
            description: 'Profesyonel televizyon tamiri hizmeti. Tüm marka ve modellerde uzman servis desteği.',
            serviceType: 'TelevisionRepair',
            category: 'Elektronik Tamiri',
            areaServed: 'Türkiye',
            availableLanguage: 'Turkish',
            hoursAvailable: 'Mo-Su 08:00-22:00',
            offers: {
                priceRange: '200-800 TRY',
                priceCurrency: 'TRY',
                availability: 'InStock',
                validFrom: '2024-01-01',
                validThrough: '2024-12-31'
            }
        },
        beyaz_esya_tamiri: {
            name: 'Beyaz Eşya Tamiri',
            description: 'Buzdolabı, çamaşır makinesi, bulaşık makinesi tamiri. Tüm markalar için profesyonel servis.',
            serviceType: 'ApplianceRepair',
            category: 'Ev Aletleri Tamiri',
            areaServed: 'Türkiye',
            availableLanguage: 'Turkish',
            hoursAvailable: 'Mo-Su 08:00-22:00',
            offers: {
                priceRange: '300-1200 TRY',
                priceCurrency: 'TRY',
                availability: 'InStock',
                validFrom: '2024-01-01',
                validThrough: '2024-12-31'
            }
        },
        klima_servisi: {
            name: 'Klima Servisi ve Bakımı',
            description: 'Klima temizliği, bakımı, tamiri ve montaj hizmetleri. Enerji verimliliği için profesyonel bakım.',
            serviceType: 'AirConditioningService',
            category: 'HVAC Servisi',
            areaServed: 'Türkiye',
            availableLanguage: 'Turkish',
            hoursAvailable: 'Mo-Su 08:00-22:00',
            offers: {
                priceRange: '150-600 TRY',
                priceCurrency: 'TRY',
                availability: 'InStock',
                validFrom: '2024-01-01',
                validThrough: '2024-12-31'
            }
        },
        bilgisayar_tamiri: {
            name: 'Bilgisayar Tamiri',
            description: 'Masaüstü ve dizüstü bilgisayar tamiri, format, donanım değişimi ve performans optimizasyonu.',
            serviceType: 'ComputerRepair',
            category: 'Bilgisayar Servisi',
            areaServed: 'Türkiye',
            availableLanguage: 'Turkish',
            hoursAvailable: 'Mo-Su 08:00-22:00',
            offers: {
                priceRange: '150-500 TRY',
                priceCurrency: 'TRY',
                availability: 'InStock',
                validFrom: '2024-01-01',
                validThrough: '2024-12-31'
            }
        }
    },
    
    // Generate LocalBusiness schema
    generateLocalBusinessSchema: function() {
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            '@id': `${this.businessInfo.url}#LocalBusiness`,
            name: this.businessInfo.name,
            legalName: this.businessInfo.legalName,
            description: this.businessInfo.description,
            url: this.businessInfo.url,
            telephone: this.businessInfo.telephone,
            email: this.businessInfo.email,
            foundingDate: this.businessInfo.foundingDate,
            priceRange: this.businessInfo.priceRange,
            currenciesAccepted: this.businessInfo.currenciesAccepted,
            paymentAccepted: this.businessInfo.paymentAccepted,
            
            address: {
                '@type': 'PostalAddress',
                streetAddress: this.businessInfo.address.streetAddress,
                addressLocality: this.businessInfo.address.addressLocality,
                addressRegion: this.businessInfo.address.addressRegion,
                postalCode: this.businessInfo.address.postalCode,
                addressCountry: this.businessInfo.address.addressCountry
            },
            
            geo: {
                '@type': 'GeoCoordinates',
                latitude: this.businessInfo.geo.latitude,
                longitude: this.businessInfo.geo.longitude
            },
            
            openingHoursSpecification: this.businessInfo.openingHours.map(hours => ({
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: hours.includes('Mo-Su') ? 
                    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] :
                    [hours.split(' ')[0]],
                opens: hours.split(' ')[1].split('-')[0],
                closes: hours.split(' ')[1].split('-')[1]
            })),
            
            sameAs: [
                'https://www.facebook.com/garantor360',
                'https://www.instagram.com/garantor360',
                'https://www.linkedin.com/company/garantor360',
                'https://twitter.com/garantor360'
            ],
            
            hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: 'GARANTOR360 Servis Kataloğu',
                itemListElement: Object.values(this.services).map((service, index) => ({
                    '@type': 'Offer',
                    itemOffered: {
                        '@type': 'Service',
                        name: service.name,
                        description: service.description,
                        serviceType: service.serviceType,
                        category: service.category,
                        areaServed: service.areaServed,
                        availableLanguage: service.availableLanguage,
                        hoursAvailable: service.hoursAvailable
                    },
                    priceRange: service.offers.priceRange,
                    priceCurrency: service.offers.priceCurrency,
                    availability: service.offers.availability,
                    validFrom: service.offers.validFrom,
                    validThrough: service.offers.validThrough
                }))
            },
            
            contactPoint: {
                '@type': 'ContactPoint',
                telephone: this.businessInfo.telephone,
                contactType: 'customer service',
                availableLanguage: 'Turkish',
                hoursAvailable: 'Mo-Su 08:00-22:00',
                areaServed: 'TR'
            }
        };
        
        return schema;
    },
    
    // Generate Service schema for specific service
    generateServiceSchema: function(serviceKey) {
        const service = this.services[serviceKey];
        if (!service) return null;
        
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Service',
            '@id': `${this.businessInfo.url}/hizmetler/${serviceKey}#Service`,
            name: service.name,
            description: service.description,
            serviceType: service.serviceType,
            category: service.category,
            
            provider: {
                '@type': 'LocalBusiness',
                '@id': `${this.businessInfo.url}#LocalBusiness`,
                name: this.businessInfo.name,
                telephone: this.businessInfo.telephone,
                email: this.businessInfo.email,
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: this.businessInfo.address.addressLocality,
                    addressRegion: this.businessInfo.address.addressRegion,
                    addressCountry: this.businessInfo.address.addressCountry
                }
            },
            
            areaServed: {
                '@type': 'Country',
                name: service.areaServed
            },
            
            availableLanguage: service.availableLanguage,
            hoursAvailable: service.hoursAvailable,
            
            offers: {
                '@type': 'Offer',
                priceRange: service.offers.priceRange,
                priceCurrency: service.offers.priceCurrency,
                availability: service.offers.availability,
                validFrom: service.offers.validFrom,
                validThrough: service.offers.validThrough,
                seller: {
                    '@id': `${this.businessInfo.url}#LocalBusiness`
                }
            }
        };
        
        return schema;
    },
    
    // Generate FAQ schema
    generateFAQSchema: function() {
        const faqs = [
            {
                question: 'Televizyon tamiri kaç para?',
                answer: 'Televizyon tamiri fiyatları arıza türüne göre değişir. Genel olarak 200-800 TL arasında değişmektedir. Kesin fiyat ücretsiz keşif sonrası belirlenir.'
            },
            {
                question: 'Acil servis var mı?',
                answer: 'Evet, 7/24 acil servis hizmeti sunuyoruz. Acil durumlar için +90 500 123 45 67 numarasından ulaşabilirsiniz.'
            },
            {
                question: 'Hangi markalara servis veriyorsunuz?',
                answer: 'Samsung, LG, Sony, Philips, Vestel, Arçelik, Bosch, Siemens başta olmak üzere tüm markalara profesyonel servis hizmeti veriyoruz.'
            },
            {
                question: 'Garanti süresi ne kadar?',
                answer: 'Tüm işçiliğimize 6 ay garanti veriyoruz. Değiştirilen parçalar için üretici garantisi geçerlidir.'
            },
            {
                question: 'Evde servis hizmeti var mı?',
                answer: 'Evet, evde servis hizmeti sunuyoruz. Cihazınızı evden almaya gelir, tamirini gerçekleştirip tekrar teslim ederiz.'
            }
        ];
        
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': `${this.businessInfo.url}#FAQ`,
            mainEntity: faqs.map(faq => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: faq.answer
                }
            }))
        };
        
        return schema;
    },
    
    // Generate BreadcrumbList schema
    generateBreadcrumbSchema: function(breadcrumbs) {
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            '@id': `${window.location.href}#BreadcrumbList`,
            itemListElement: breadcrumbs.map((crumb, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: crumb.name,
                item: crumb.url
            }))
        };
        
        return schema;
    },
    
    // Generate Organization schema
    generateOrganizationSchema: function() {
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${this.businessInfo.url}#Organization`,
            name: this.businessInfo.name,
            legalName: this.businessInfo.legalName,
            description: this.businessInfo.description,
            url: this.businessInfo.url,
            logo: `${this.businessInfo.url}/static/logo.png`,
            foundingDate: this.businessInfo.foundingDate,
            
            contactPoint: [
                {
                    '@type': 'ContactPoint',
                    telephone: this.businessInfo.telephone,
                    contactType: 'customer service',
                    availableLanguage: 'Turkish',
                    hoursAvailable: 'Mo-Su 08:00-22:00'
                },
                {
                    '@type': 'ContactPoint',
                    email: this.businessInfo.email,
                    contactType: 'customer support',
                    availableLanguage: 'Turkish'
                }
            ],
            
            address: {
                '@type': 'PostalAddress',
                addressLocality: this.businessInfo.address.addressLocality,
                addressRegion: this.businessInfo.address.addressRegion,
                addressCountry: this.businessInfo.address.addressCountry
            },
            
            sameAs: [
                'https://www.facebook.com/garantor360',
                'https://www.instagram.com/garantor360',
                'https://www.linkedin.com/company/garantor360'
            ]
        };
        
        return schema;
    },
    
    // Generate WebSite schema
    generateWebSiteSchema: function() {
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${this.businessInfo.url}#WebSite`,
            name: this.businessInfo.name,
            url: this.businessInfo.url,
            description: this.businessInfo.description,
            inLanguage: 'tr',
            
            publisher: {
                '@id': `${this.businessInfo.url}#Organization`
            },
            
            potentialAction: {
                '@type': 'SearchAction',
                target: `${this.businessInfo.url}/arama?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
            }
        };
        
        return schema;
    },
    
    // Inject schema into page head
    injectSchema: function(schema, id) {
        // Remove existing schema with same ID
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        
        // Create new schema script
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        script.textContent = JSON.stringify(schema, null, 2);
        
        document.head.appendChild(script);
        
        console.log(`🌐 Schema.org ${id} injected:`, schema);
    },
    
    // Initialize all schemas for homepage
    initializeHomepageSchemas: function() {
        console.log('🚀 Initializing Schema.org structured data...');
        
        // Inject all main schemas
        this.injectSchema(this.generateLocalBusinessSchema(), 'schema-local-business');
        this.injectSchema(this.generateOrganizationSchema(), 'schema-organization');
        this.injectSchema(this.generateWebSiteSchema(), 'schema-website');
        this.injectSchema(this.generateFAQSchema(), 'schema-faq');
        
        // Inject breadcrumb for homepage
        const homeBreadcrumb = [
            { name: 'Ana Sayfa', url: this.businessInfo.url }
        ];
        this.injectSchema(this.generateBreadcrumbSchema(homeBreadcrumb), 'schema-breadcrumb');
        
        console.log('✅ All homepage schemas initialized successfully!');
    },
    
    // Initialize service page schemas
    initializeServiceSchema: function(serviceKey) {
        console.log(`🚀 Initializing service schema for: ${serviceKey}`);
        
        // Inject service-specific schema
        const serviceSchema = this.generateServiceSchema(serviceKey);
        if (serviceSchema) {
            this.injectSchema(serviceSchema, `schema-service-${serviceKey}`);
        }
        
        // Service page breadcrumb
        const serviceBreadcrumb = [
            { name: 'Ana Sayfa', url: this.businessInfo.url },
            { name: 'Hizmetler', url: `${this.businessInfo.url}/hizmetler` },
            { name: this.services[serviceKey]?.name, url: `${this.businessInfo.url}/hizmetler/${serviceKey}` }
        ];
        this.injectSchema(this.generateBreadcrumbSchema(serviceBreadcrumb), 'schema-breadcrumb');
        
        console.log(`✅ Service schema for ${serviceKey} initialized!`);
    },
    
    // Update schemas with dynamic data
    updateSchemaData: function(updates) {
        Object.assign(this.businessInfo, updates.businessInfo || {});
        Object.assign(this.services, updates.services || {});
        
        // Re-initialize schemas with updated data
        this.initializeHomepageSchemas();
        
        console.log('✅ Schema data updated and re-initialized!');
    },
    
    // Validate schema markup
    validateSchemas: function() {
        const schemas = document.querySelectorAll('script[type="application/ld+json"]');
        const validation = {
            total: schemas.length,
            valid: 0,
            errors: []
        };
        
        schemas.forEach((schema, index) => {
            try {
                const data = JSON.parse(schema.textContent);
                if (data['@context'] && data['@type']) {
                    validation.valid++;
                } else {
                    validation.errors.push(`Schema ${index}: Missing @context or @type`);
                }
            } catch (error) {
                validation.errors.push(`Schema ${index}: Invalid JSON - ${error.message}`);
            }
        });
        
        console.log('🔍 Schema validation results:', validation);
        return validation;
    }
};

// Auto-initialize schemas when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        // Initialize homepage schemas by default
        window.SchemaGenerator.initializeHomepageSchemas();
        
        // Validate all schemas
        window.SchemaGenerator.validateSchemas();
    }, 500);
});

// Global functions for easy access
window.initializeServiceSchema = function(serviceKey) {
    window.SchemaGenerator.initializeServiceSchema(serviceKey);
};

window.updateSchemaData = function(updates) {
    window.SchemaGenerator.updateSchemaData(updates);
};

console.log('🌐 Schema.org Structured Data SEO System loaded successfully!');

// =============================================================================
// GARANTOR360 - Admin Security Dashboard Integration - Task 6 Frontend
// =============================================================================

console.log('🔐 Loading Admin Security Dashboard Integration...');

// Admin Security Dashboard Integration
window.AdminSecurity = {
    
    // API endpoints
    endpoints: {
        securityDashboard: '/api/admin/security/dashboard',
        securityConfig: '/api/admin/security/config',
        ipStatus: '/api/security/ip-status',
        suspiciousActivity: '/api/security/suspicious-activity',
        adClickValidation: '/api/security/ad-click-validation'
    },
    
    // Authentication token (would be stored securely in real app)
    authToken: localStorage.getItem('adminToken') || 'test-token-123',
    
    // Initialize dashboard
    init: function() {
        console.log('🚀 Initializing Admin Security Dashboard...');
        
        if (this.isAdminPage()) {
            this.loadSecurityDashboard();
            this.startRealTimeMonitoring();
            this.bindEventHandlers();
            console.log('✅ Admin Security Dashboard initialized!');
        }
    },
    
    // Check if current page is admin
    isAdminPage: function() {
        return window.location.pathname.includes('/admin') || 
               document.getElementById('admin-security-dashboard') !== null;
    },
    
    // Make authenticated API request
    apiRequest: async function(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`,
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(endpoint, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    },
    
    // Load security dashboard data
    loadSecurityDashboard: async function() {
        try {
            console.log('📊 Loading security dashboard data...');
            
            const dashboardData = await this.apiRequest(this.endpoints.securityDashboard);
            
            if (dashboardData.success) {
                this.updateDashboardUI(dashboardData.stats);
                console.log('✅ Security dashboard data loaded:', dashboardData.stats);
            }
        } catch (error) {
            console.error('❌ Failed to load security dashboard:', error);
            this.showError('Failed to load security dashboard data');
        }
    },
    
    // Update dashboard UI with real data
    updateDashboardUI: function(stats) {
        // Update blocked IPs count
        const blockedIpsEl = document.getElementById('blocked-ips-count');
        if (blockedIpsEl) {
            blockedIpsEl.textContent = stats.blockedIps || 0;
        }
        
        // Update today's detections
        const detectionsEl = document.getElementById('today-detections-count');
        if (detectionsEl) {
            detectionsEl.textContent = stats.todayDetections || 0;
        }
        
        // Update high threat IPs
        const threatIpsEl = document.getElementById('high-threat-ips-count');
        if (threatIpsEl) {
            threatIpsEl.textContent = stats.highThreatIps || 0;
        }
        
        // Update detection types chart
        if (stats.topDetectionTypes) {
            this.updateDetectionTypesChart(stats.topDetectionTypes);
        }
        
        // Update request trend chart
        if (stats.requestTrend) {
            this.updateRequestTrendChart(stats.requestTrend);
        }
    },
    
    // Update detection types chart
    updateDetectionTypesChart: function(detectionTypes) {
        const chartContainer = document.getElementById('detection-types-chart');
        if (!chartContainer) return;
        
        chartContainer.innerHTML = '';
        
        detectionTypes.forEach((type, index) => {
            const percentage = (type.count / detectionTypes[0].count * 100).toFixed(1);
            const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500'];
            
            const typeEl = document.createElement('div');
            typeEl.className = 'flex items-center justify-between p-2 bg-gray-800 rounded mb-2';
            typeEl.innerHTML = `
                <div class="flex items-center">
                    <div class="w-3 h-3 ${colors[index % colors.length]} rounded mr-2"></div>
                    <span class="text-white text-sm">${type.detection_type}</span>
                </div>
                <div class="text-white text-sm font-medium">${type.count} (${percentage}%)</div>
            `;
            
            chartContainer.appendChild(typeEl);
        });
    },
    
    // Update request trend chart
    updateRequestTrendChart: function(trendData) {
        const chartContainer = document.getElementById('request-trend-chart');
        if (!chartContainer) return;
        
        chartContainer.innerHTML = '';
        
        trendData.slice(0, 7).forEach(day => {
            const suspiciousRate = day.total_requests > 0 ? 
                (day.suspicious_requests / day.total_requests * 100).toFixed(1) : 0;
            
            const dayEl = document.createElement('div');
            dayEl.className = 'text-center p-2 bg-gray-800 rounded mb-2';
            dayEl.innerHTML = `
                <div class="text-white text-xs">${new Date(day.date).toLocaleDateString('tr-TR', {month: 'short', day: 'numeric'})}</div>
                <div class="text-blue-400 text-sm font-medium">${day.total_requests}</div>
                <div class="text-red-400 text-xs">${day.suspicious_requests} (${suspiciousRate}%)</div>
            `;
            
            chartContainer.appendChild(dayEl);
        });
    },
    
    // Start real-time monitoring
    startRealTimeMonitoring: function() {
        console.log('⏰ Starting real-time security monitoring...');
        
        // Update every 30 seconds
        setInterval(() => {
            if (this.isAdminPage()) {
                this.loadSecurityDashboard();
            }
        }, 30000);
        
        // Listen for security events from the bot protection system
        document.addEventListener('securityEvent', (event) => {
            this.handleSecurityEvent(event.detail);
        });
    },
    
    // Handle security events
    handleSecurityEvent: function(eventData) {
        console.log('🚨 Security event detected:', eventData);
        
        // Show real-time notification
        this.showSecurityAlert(eventData);
        
        // Send to backend
        this.reportSecurityEvent(eventData);
    },
    
    // Show security alert
    showSecurityAlert: function(eventData) {
        const alertContainer = document.getElementById('security-alerts');
        if (!alertContainer) return;
        
        const alert = document.createElement('div');
        alert.className = 'bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded mb-2 text-sm';
        alert.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <strong>${eventData.type}</strong> - Confidence: ${eventData.confidence}%
                    <div class="text-xs opacity-75">${new Date().toLocaleTimeString()} - IP: ${eventData.ip}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-red-400 hover:text-red-300">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        alertContainer.insertBefore(alert, alertContainer.firstChild);
        
        // Keep only last 10 alerts
        while (alertContainer.children.length > 10) {
            alertContainer.removeChild(alertContainer.lastChild);
        }
    },
    
    // Report security event to backend
    reportSecurityEvent: async function(eventData) {
        try {
            await this.apiRequest(this.endpoints.suspiciousActivity, {
                method: 'POST',
                body: JSON.stringify({
                    activityType: eventData.type,
                    confidence: eventData.confidence,
                    indicators: eventData.indicators,
                    userAgent: navigator.userAgent,
                    behavioralData: eventData.behavioralData
                })
            });
        } catch (error) {
            console.error('Failed to report security event:', error);
        }
    },
    
    // Check IP status
    checkIPStatus: async function(ip) {
        try {
            const response = await this.apiRequest(`${this.endpoints.ipStatus}/${ip}`);
            return response;
        } catch (error) {
            console.error(`Failed to check IP status for ${ip}:`, error);
            return null;
        }
    },
    
    // Manual threat assessment
    assessThreat: async function(ip) {
        const status = await this.checkIPStatus(ip);
        if (status && status.exists) {
            console.log(`🔍 IP ${ip} threat level: ${status.ipInfo.threat_level}`);
            return status;
        }
        return null;
    },
    
    // Bind event handlers
    bindEventHandlers: function() {
        // Block IP button
        const blockIpBtn = document.getElementById('block-ip-btn');
        if (blockIpBtn) {
            blockIpBtn.addEventListener('click', () => {
                const ip = document.getElementById('block-ip-input')?.value;
                if (ip) {
                    this.blockIP(ip);
                }
            });
        }
        
        // Refresh dashboard button
        const refreshBtn = document.getElementById('refresh-dashboard-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadSecurityDashboard();
            });
        }
        
        // Export security report button
        const exportBtn = document.getElementById('export-report-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSecurityReport();
            });
        }
    },
    
    // Block IP manually
    blockIP: async function(ip) {
        try {
            const response = await this.apiRequest(this.endpoints.suspiciousActivity, {
                method: 'POST',
                body: JSON.stringify({
                    activityType: 'manual_block',
                    confidence: 100,
                    indicators: ['admin_manual_block'],
                    userAgent: 'Admin Manual Block',
                    behavioralData: { manualBlock: true, ip: ip }
                })
            });
            
            if (response.success) {
                this.showSuccess(`IP ${ip} has been blocked successfully`);
                this.loadSecurityDashboard(); // Refresh data
            }
        } catch (error) {
            this.showError(`Failed to block IP ${ip}: ${error.message}`);
        }
    },
    
    // Export security report
    exportSecurityReport: async function() {
        try {
            const dashboardData = await this.apiRequest(this.endpoints.securityDashboard);
            
            const report = {
                timestamp: new Date().toISOString(),
                summary: dashboardData.stats,
                exportedBy: 'Admin',
                periodCovered: 'Last 7 days'
            };
            
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            this.showSuccess('Security report exported successfully');
        } catch (error) {
            this.showError(`Failed to export report: ${error.message}`);
        }
    },
    
    // Show success message
    showSuccess: function(message) {
        console.log(`✅ ${message}`);
        // Could integrate with toast notification system
    },
    
    // Show error message
    showError: function(message) {
        console.error(`❌ ${message}`);
        // Could integrate with toast notification system
    }
};

// Integration with existing bot protection system
if (window.BotProtection) {
    // Override bot detection to send events to admin dashboard
    const originalDetectBot = window.BotProtection.detectBot;
    window.BotProtection.detectBot = function() {
        const result = originalDetectBot.call(this);
        
        // Send security event to admin dashboard if high confidence
        if (result.confidence > 70) {
            const event = new CustomEvent('securityEvent', {
                detail: {
                    type: 'bot_detection',
                    confidence: result.confidence,
                    indicators: result.indicators,
                    ip: 'current_user', // Would be actual IP in production
                    behavioralData: this.behavioralData
                }
            });
            document.dispatchEvent(event);
        }
        
        return result;
    };
    
    // Override ad click validation
    const originalValidateAdClick = window.BotProtection.validateAdClick;
    window.BotProtection.validateAdClick = function(gclid, keyword, adData) {
        const result = originalValidateAdClick.call(this, gclid, keyword, adData);
        
        // Send to backend API
        fetch('/api/security/ad-click-validation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gclid,
                keyword,
                adData,
                behavioralScore: this.calculateHumanScore(),
                validationTests: {
                    mouseMovement: this.behavioralData.mouseMovements > 10,
                    humanTiming: this.behavioralData.timingPatterns.avgClickInterval > 1000,
                    jsEnabled: true
                }
            })
        }).then(response => response.json())
          .then(data => {
              console.log('🔍 Ad click validation result:', data);
              
              if (!data.valid) {
                  const event = new CustomEvent('securityEvent', {
                      detail: {
                          type: 'ad_fraud',
                          confidence: data.fraudConfidence,
                          indicators: data.indicators,
                          ip: 'current_user',
                          behavioralData: { gclid, keyword }
                      }
                  });
                  document.dispatchEvent(event);
              }
          })
          .catch(error => console.error('Ad click validation error:', error));
        
        return result;
    };
}

// Auto-initialize admin dashboard when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.AdminSecurity.init();
    }, 1000);
});

// Global functions for easy access
window.loadSecurityDashboard = function() {
    window.AdminSecurity.loadSecurityDashboard();
};

window.checkIPThreat = function(ip) {
    return window.AdminSecurity.assessThreat(ip);
};

window.blockIPAddress = function(ip) {
    return window.AdminSecurity.blockIP(ip);
};

console.log('🔐 Admin Security Dashboard Integration loaded successfully!');
console.log('🎯 Task 6: Bot Protection & Schema.org System - FULLY COMPLETED! ✅');