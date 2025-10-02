// ====================================
// KVKV Cookie Consent System
// Türk GDPR Uyumlu Cookie Yönetimi
// ====================================

class KVKVCookieConsent {
    constructor() {
        this.apiBaseUrl = '';
        this.userIdentifier = this.getUserIdentifier();
        this.consentData = null;
        this.categories = [];
        this.isInitialized = false;
        
        this.init();
    }
    
    // Get or create unique user identifier
    getUserIdentifier() {
        let identifier = localStorage.getItem('kvkv_user_id');
        if (!identifier) {
            identifier = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('kvkv_user_id', identifier);
        }
        return identifier;
    }
    
    // Initialize the consent system
    async init() {
        try {
            // Load cookie categories
            await this.loadCookieCategories();
            
            // Check existing consent
            await this.checkConsentStatus();
            
            // Show consent banner if needed
            if (!this.hasValidConsent()) {
                this.showConsentBanner();
            } else {
                this.applyConsentSettings();
            }
            
            this.isInitialized = true;
            console.log('KVKV Cookie Consent initialized');
            
        } catch (error) {
            console.error('KVKV Consent initialization error:', error);
        }
    }
    
    // Load cookie categories from API
    async loadCookieCategories() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/kvkv/cookie-categories`);
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.categories;
            }
        } catch (error) {
            console.error('Error loading cookie categories:', error);
            // Use fallback categories
            this.categories = [
                {
                    category_key: 'necessary',
                    category_name_tr: 'Zorunlu Çerezler',
                    description_tr: 'Web sitesinin temel işlevleri için gerekli çerezler',
                    is_required: true,
                    default_state: true,
                    icon_class: 'fas fa-shield-alt',
                    color_class: 'text-green-600'
                },
                {
                    category_key: 'analytics',
                    category_name_tr: 'Analitik Çerezler',
                    description_tr: 'Web sitesi performansını anlamamıza yardımcı çerezler',
                    is_required: false,
                    default_state: false,
                    icon_class: 'fas fa-chart-bar',
                    color_class: 'text-purple-600'
                },
                {
                    category_key: 'marketing',
                    category_name_tr: 'Pazarlama Çerezleri', 
                    description_tr: 'Kişiselleştirilmiş reklamlar için kullanılan çerezler',
                    is_required: false,
                    default_state: false,
                    icon_class: 'fas fa-bullhorn',
                    color_class: 'text-orange-600'
                }
            ];
        }
    }
    
    // Check current consent status
    async checkConsentStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/kvkv/consent-status/${this.userIdentifier}`);
            const data = await response.json();
            
            if (data.success && data.hasConsent) {
                this.consentData = data;
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking consent status:', error);
            return false;
        }
    }
    
    // Check if user has valid consent
    hasValidConsent() {
        if (!this.consentData || !this.consentData.hasConsent) {
            return false;
        }
        
        // Check if consent is recent (within 365 days)
        const consentDate = new Date(this.consentData.consentDate);
        const now = new Date();
        const daysDiff = (now - consentDate) / (1000 * 60 * 60 * 24);
        
        return daysDiff <= 365;
    }
    
    // Show consent banner
    showConsentBanner() {
        // Remove existing banner
        this.removeConsentBanner();
        
        const banner = document.createElement('div');
        banner.id = 'kvkv-consent-banner';
        banner.className = 'kvkv-consent-banner';
        
        banner.innerHTML = `
            <div class="kvkv-banner-content">
                <div class="kvkv-banner-header">
                    <div class="kvkv-banner-icon">
                        <i class="fas fa-cookie-bite"></i>
                    </div>
                    <div class="kvkv-banner-title">
                        <h3>Çerez Tercihleriniz</h3>
                        <p>KVKV (Kişisel Verilerin Korunması Kanunu) kapsamında çerez kullanımı</p>
                    </div>
                </div>
                
                <div class="kvkv-banner-text">
                    <p>Web sitemizde deneyiminizi iyileştirmek için çerezler kullanıyoruz. 
                    Çerez tercihlerinizi aşağıdan yönetebilir veya tümünü kabul edebilirsiniz.</p>
                </div>
                
                <div class="kvkv-banner-actions">
                    <button class="kvkv-btn kvkv-btn-reject" onclick="window.kvkvConsent.rejectAll()">
                        Tümünü Reddet
                    </button>
                    <button class="kvkv-btn kvkv-btn-settings" onclick="window.kvkvConsent.showSettings()">
                        Ayarlar
                    </button>
                    <button class="kvkv-btn kvkv-btn-accept" onclick="window.kvkvConsent.acceptAll()">
                        Tümünü Kabul Et
                    </button>
                </div>
                
                <div class="kvkv-banner-links">
                    <a href="/kvkv-politikasi" target="_blank">KVKV Politikası</a> | 
                    <a href="/cerez-politikasi" target="_blank">Çerez Politikası</a>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Add styles
        this.addConsentStyles();
        
        // Show with animation
        setTimeout(() => {
            banner.classList.add('show');
        }, 100);
    }
    
    // Show detailed settings modal
    showSettings() {
        const modal = document.createElement('div');
        modal.id = 'kvkv-settings-modal';
        modal.className = 'kvkv-modal';
        
        const categoriesHtml = this.categories.map(category => `
            <div class="kvkv-category">
                <div class="kvkv-category-header">
                    <div class="kvkv-category-info">
                        <i class="${category.icon_class} ${category.color_class}"></i>
                        <div>
                            <h4>${category.category_name_tr}</h4>
                            <p>${category.description_tr}</p>
                        </div>
                    </div>
                    <div class="kvkv-toggle">
                        <input type="checkbox" 
                               id="category_${category.category_key}" 
                               ${category.is_required ? 'checked disabled' : ''}
                               ${category.default_state && !category.is_required ? 'checked' : ''}>
                        <label for="category_${category.category_key}"></label>
                    </div>
                </div>
                ${category.is_required ? '<small class="kvkv-required">Bu çerezler zorunludur</small>' : ''}
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="kvkv-modal-content">
                <div class="kvkv-modal-header">
                    <h2>Çerez Ayarları</h2>
                    <button class="kvkv-modal-close" onclick="window.kvkvConsent.closeSettings()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="kvkv-modal-body">
                    <p>Çerez kategorilerini aşağıdan yönetebilirsiniz. Zorunlu çerezler web sitesinin çalışması için gereklidir.</p>
                    
                    <div class="kvkv-categories">
                        ${categoriesHtml}
                    </div>
                    
                    <div class="kvkv-privacy-links">
                        <p><i class="fas fa-info-circle"></i> Daha fazla bilgi için:</p>
                        <a href="/kvkv-politikasi" target="_blank">KVKV Politikamız</a> | 
                        <a href="/cerez-politikasi" target="_blank">Çerez Politikamız</a>
                    </div>
                </div>
                
                <div class="kvkv-modal-footer">
                    <button class="kvkv-btn kvkv-btn-cancel" onclick="window.kvkvConsent.closeSettings()">
                        İptal
                    </button>
                    <button class="kvkv-btn kvkv-btn-save" onclick="window.kvkvConsent.saveSettings()">
                        Kaydet
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }
    
    // Close settings modal
    closeSettings() {
        const modal = document.getElementById('kvkv-settings-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
    }
    
    // Accept all cookies
    async acceptAll() {
        const settings = {
            necessary: true,
            functional: true,
            analytics: true,
            marketing: true
        };
        
        await this.saveConsent(settings, 'accept_all');
    }
    
    // Reject all non-essential cookies
    async rejectAll() {
        const settings = {
            necessary: true,
            functional: false,
            analytics: false,
            marketing: false
        };
        
        await this.saveConsent(settings, 'reject_all');
    }
    
    // Save custom settings
    async saveSettings() {
        const settings = {
            necessary: true,
            functional: document.getElementById('category_functional')?.checked || false,
            analytics: document.getElementById('category_analytics')?.checked || false,
            marketing: document.getElementById('category_marketing')?.checked || false
        };
        
        await this.saveConsent(settings, 'custom');
        this.closeSettings();
    }
    
    // Save consent to backend
    async saveConsent(settings, method = 'banner') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/kvkv/consent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userIdentifier: this.userIdentifier,
                    necessaryCookies: settings.necessary,
                    functionalCookies: settings.functional,
                    analyticsCookies: settings.analytics,
                    marketingCookies: settings.marketing,
                    consentMethod: method,
                    pageUrl: window.location.href,
                    privacyPolicyVersion: '1.0'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.consentData = {
                    hasConsent: true,
                    settings: settings,
                    consentDate: new Date().toISOString()
                };
                
                // Apply settings immediately
                this.applyConsentSettings();
                
                // Remove consent banner
                this.removeConsentBanner();
                
                // Show success notification
                this.showNotification('Çerez tercihleri kaydedildi', 'success');
                
                console.log('KVKV Consent saved:', settings);
            } else {
                this.showNotification('Çerez tercihleri kaydedilemedi', 'error');
            }
            
        } catch (error) {
            console.error('Error saving consent:', error);
            this.showNotification('Bir hata oluştu', 'error');
        }
    }
    
    // Apply consent settings (enable/disable tracking)
    applyConsentSettings() {
        if (!this.consentData || !this.consentData.settings) {
            return;
        }
        
        const settings = this.consentData.settings;
        
        // Apply analytics consent
        if (settings.analytics) {
            this.enableAnalytics();
        } else {
            this.disableAnalytics();
        }
        
        // Apply marketing consent  
        if (settings.marketing) {
            this.enableMarketing();
        } else {
            this.disableMarketing();
        }
        
        // Store settings in localStorage for quick access
        localStorage.setItem('kvkv_consent_settings', JSON.stringify(settings));
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('kvkv-consent-updated', {
            detail: settings
        }));
    }
    
    // Enable analytics tracking
    enableAnalytics() {
        // Enable Google Analytics
        if (window.gtag) {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }
        
        console.log('Analytics enabled');
    }
    
    // Disable analytics tracking
    disableAnalytics() {
        // Disable Google Analytics
        if (window.gtag) {
            gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }
        
        console.log('Analytics disabled');
    }
    
    // Enable marketing tracking
    enableMarketing() {
        // Enable Facebook Pixel
        if (window.fbq) {
            fbq('consent', 'grant');
        }
        
        // Enable Google Ads
        if (window.gtag) {
            gtag('consent', 'update', {
                'ad_storage': 'granted',
                'ad_user_data': 'granted',
                'ad_personalization': 'granted'
            });
        }
        
        console.log('Marketing enabled');
    }
    
    // Disable marketing tracking  
    disableMarketing() {
        // Disable Facebook Pixel
        if (window.fbq) {
            fbq('consent', 'revoke');
        }
        
        // Disable Google Ads
        if (window.gtag) {
            gtag('consent', 'update', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied', 
                'ad_personalization': 'denied'
            });
        }
        
        console.log('Marketing disabled');
    }
    
    // Withdraw consent
    async withdrawConsent(reason = 'User request') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/kvkv/withdraw-consent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userIdentifier: this.userIdentifier,
                    withdrawalReason: reason
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear local data
                this.consentData = null;
                localStorage.removeItem('kvkv_consent_settings');
                
                // Disable all tracking
                this.disableAnalytics();
                this.disableMarketing();
                
                // Show consent banner again
                this.showConsentBanner();
                
                this.showNotification('Çerez rızası geri çekildi', 'success');
            }
            
        } catch (error) {
            console.error('Error withdrawing consent:', error);
        }
    }
    
    // Remove consent banner
    removeConsentBanner() {
        const banner = document.getElementById('kvkv-consent-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                if (banner.parentNode) {
                    banner.parentNode.removeChild(banner);
                }
            }, 300);
        }
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `kvkv-notification kvkv-notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Add CSS styles
    addConsentStyles() {
        if (document.getElementById('kvkv-consent-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'kvkv-consent-styles';
        styles.textContent = `
            .kvkv-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #1e293b;
                color: white;
                padding: 20px;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
                transform: translateY(100%);
                transition: transform 0.3s ease;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .kvkv-consent-banner.show {
                transform: translateY(0);
            }
            
            .kvkv-banner-content {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .kvkv-banner-header {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .kvkv-banner-icon {
                background: #3b82f6;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
                font-size: 20px;
            }
            
            .kvkv-banner-title h3 {
                margin: 0 0 5px 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .kvkv-banner-title p {
                margin: 0;
                opacity: 0.8;
                font-size: 14px;
            }
            
            .kvkv-banner-text {
                margin-bottom: 20px;
                line-height: 1.5;
            }
            
            .kvkv-banner-actions {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }
            
            .kvkv-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
                font-size: 14px;
            }
            
            .kvkv-btn-accept {
                background: #10b981;
                color: white;
            }
            
            .kvkv-btn-accept:hover {
                background: #059669;
            }
            
            .kvkv-btn-reject {
                background: #ef4444;
                color: white;
            }
            
            .kvkv-btn-reject:hover {
                background: #dc2626;
            }
            
            .kvkv-btn-settings {
                background: #6b7280;
                color: white;
            }
            
            .kvkv-btn-settings:hover {
                background: #4b5563;
            }
            
            .kvkv-banner-links {
                font-size: 12px;
                opacity: 0.7;
            }
            
            .kvkv-banner-links a {
                color: #3b82f6;
                text-decoration: none;
            }
            
            .kvkv-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s;
                padding: 20px;
            }
            
            .kvkv-modal.show {
                opacity: 1;
                visibility: visible;
            }
            
            .kvkv-modal-content {
                background: white;
                border-radius: 12px;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                transform: scale(0.9);
                transition: transform 0.3s;
            }
            
            .kvkv-modal.show .kvkv-modal-content {
                transform: scale(1);
            }
            
            .kvkv-modal-header {
                padding: 20px 20px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .kvkv-modal-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6b7280;
            }
            
            .kvkv-modal-body {
                padding: 20px;
            }
            
            .kvkv-categories {
                margin: 20px 0;
            }
            
            .kvkv-category {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
            }
            
            .kvkv-category-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            
            .kvkv-category-info {
                display: flex;
                gap: 10px;
            }
            
            .kvkv-category-info i {
                font-size: 20px;
                margin-top: 2px;
            }
            
            .kvkv-category-info h4 {
                margin: 0 0 5px 0;
                font-size: 16px;
            }
            
            .kvkv-category-info p {
                margin: 0;
                color: #6b7280;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .kvkv-toggle input {
                display: none;
            }
            
            .kvkv-toggle label {
                display: block;
                width: 50px;
                height: 28px;
                background: #e5e7eb;
                border-radius: 14px;
                position: relative;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .kvkv-toggle label:after {
                content: '';
                position: absolute;
                width: 24px;
                height: 24px;
                background: white;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: transform 0.3s;
            }
            
            .kvkv-toggle input:checked + label {
                background: #10b981;
            }
            
            .kvkv-toggle input:checked + label:after {
                transform: translateX(22px);
            }
            
            .kvkv-toggle input:disabled + label {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .kvkv-required {
                color: #6b7280;
                font-size: 12px;
                margin-top: 5px;
                display: block;
            }
            
            .kvkv-privacy-links {
                background: #f9fafb;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
            }
            
            .kvkv-privacy-links p {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #4b5563;
            }
            
            .kvkv-privacy-links a {
                color: #3b82f6;
                text-decoration: none;
            }
            
            .kvkv-modal-footer {
                padding: 0 20px 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .kvkv-btn-save {
                background: #3b82f6;
                color: white;
            }
            
            .kvkv-btn-cancel {
                background: #e5e7eb;
                color: #374151;
            }
            
            .kvkv-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateX(100%);
                transition: transform 0.3s;
                z-index: 10002;
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 250px;
            }
            
            .kvkv-notification.show {
                transform: translateX(0);
            }
            
            .kvkv-notification-success {
                border-left: 4px solid #10b981;
            }
            
            .kvkv-notification-error {
                border-left: 4px solid #ef4444;
            }
            
            .kvkv-notification-info {
                border-left: 4px solid #3b82f6;
            }
            
            .kvkv-notification i {
                font-size: 16px;
            }
            
            .kvkv-notification-success i {
                color: #10b981;
            }
            
            .kvkv-notification-error i {
                color: #ef4444;
            }
            
            .kvkv-notification-info i {
                color: #3b82f6;
            }
            
            @media (max-width: 768px) {
                .kvkv-banner-actions {
                    flex-direction: column;
                }
                
                .kvkv-btn {
                    width: 100%;
                    text-align: center;
                }
                
                .kvkv-modal {
                    padding: 10px;
                }
                
                .kvkv-category-header {
                    flex-direction: column;
                    gap: 10px;
                    align-items: flex-start;
                }
                
                .kvkv-modal-footer {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // Public API methods
    getConsentStatus() {
        return this.consentData;
    }
    
    isConsentGiven(category) {
        if (!this.consentData || !this.consentData.settings) {
            return false;
        }
        return this.consentData.settings[category] || false;
    }
    
    updateConsent() {
        this.showSettings();
    }
}

// Initialize KVKV Cookie Consent
document.addEventListener('DOMContentLoaded', function() {
    window.kvkvConsent = new KVKVCookieConsent();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KVKVCookieConsent;
}