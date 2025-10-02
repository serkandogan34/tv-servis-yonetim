// ====================================
// KVKV Admin Dashboard
// Cookie Consent Management Interface
// ====================================

class KVKVAdminDashboard {
    constructor() {
        this.apiBaseUrl = '';
        this.dashboardData = null;
        this.refreshInterval = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadDashboardData();
            this.setupEventListeners();
            this.startAutoRefresh();
            
            console.log('KVKV Admin Dashboard initialized');
        } catch (error) {
            console.error('KVKV Admin Dashboard initialization error:', error);
        }
    }
    
    // Load dashboard data
    async loadDashboardData() {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Admin token not found');
            }
            
            const response = await fetch(`${this.apiBaseUrl}/api/admin/kvkv/consent-dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load dashboard data');
            }
            
            const data = await response.json();
            if (data.success) {
                this.dashboardData = data;
                this.updateDashboardUI();
            }
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Dashboard verisi yüklenemedi');
        }
    }
    
    // Update dashboard UI
    updateDashboardUI() {
        if (!this.dashboardData) return;
        
        const stats = this.dashboardData.statistics;
        
        // Update statistics cards
        this.updateStatCard('total-consents', stats.total_consents, 'Toplam Rıza');
        this.updateStatCard('analytics-acceptance', 
            Math.round((stats.analytics_accepted / stats.total_consents) * 100), 
            'Analitik Kabul %');
        this.updateStatCard('marketing-acceptance', 
            Math.round((stats.marketing_accepted / stats.total_consents) * 100), 
            'Pazarlama Kabul %');
        this.updateStatCard('withdrawn-consents', stats.withdrawn_consents, 'Geri Çekilen');
        
        // Update recent consents table
        this.updateRecentConsents();
        
        // Update compliance logs
        this.updateComplianceLogs();
        
        // Update charts
        this.updateConsentChart();
        
        // Update last refresh time
        document.getElementById('last-refresh-time').textContent = 
            new Date().toLocaleTimeString('tr-TR');
    }
    
    // Update stat card
    updateStatCard(id, value, label) {
        const card = document.getElementById(id);
        if (card) {
            const valueEl = card.querySelector('.stat-value');
            const labelEl = card.querySelector('.stat-label');
            
            if (valueEl) valueEl.textContent = value || '0';
            if (labelEl) labelEl.textContent = label;
        }
    }
    
    // Update recent consents table
    updateRecentConsents() {
        const tbody = document.getElementById('recent-consents-tbody');
        if (!tbody || !this.dashboardData.recentConsents) return;
        
        tbody.innerHTML = this.dashboardData.recentConsents.map(consent => {
            const date = new Date(consent.consent_date);
            const consentCategories = [];
            if (consent.analytics_cookies) consentCategories.push('Analitik');
            if (consent.marketing_cookies) consentCategories.push('Pazarlama');
            if (consent.functional_cookies) consentCategories.push('İşlevsel');
            
            return `
                <tr>
                    <td>
                        <span class="user-id">${consent.user_identifier.substring(0, 12)}...</span>
                        <small class="ip-address">${consent.ip_address}</small>
                    </td>
                    <td>
                        <div class="consent-categories">
                            ${consentCategories.map(cat => 
                                `<span class="consent-badge consent-badge-accepted">${cat}</span>`
                            ).join('')}
                            ${consentCategories.length === 0 ? 
                                '<span class="consent-badge consent-badge-rejected">Sadece Zorunlu</span>' : ''
                            }
                        </div>
                    </td>
                    <td>
                        <div class="consent-method">
                            <i class="fas fa-${this.getMethodIcon(consent.consent_method)}"></i>
                            ${this.getMethodLabel(consent.consent_method)}
                        </div>
                    </td>
                    <td>
                        <div class="consent-date">
                            <div>${date.toLocaleDateString('tr-TR')}</div>
                            <small>${date.toLocaleTimeString('tr-TR')}</small>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="window.kvkvAdmin.viewConsentDetails('${consent.user_identifier}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Update compliance logs
    updateComplianceLogs() {
        const tbody = document.getElementById('compliance-logs-tbody');
        if (!tbody || !this.dashboardData.complianceLogs) return;
        
        tbody.innerHTML = this.dashboardData.complianceLogs.map(log => {
            const date = new Date(log.created_at);
            
            return `
                <tr>
                    <td>
                        <div class="log-event">
                            <i class="fas fa-${this.getEventIcon(log.event_type)}"></i>
                            <span>${this.getEventLabel(log.event_type)}</span>
                        </div>
                    </td>
                    <td>
                        <div class="log-description">${log.event_description}</div>
                    </td>
                    <td>
                        <span class="compliance-status compliance-status-${log.compliance_status}">
                            ${log.compliance_status}
                        </span>
                    </td>
                    <td>
                        <div class="log-date">
                            <div>${date.toLocaleDateString('tr-TR')}</div>
                            <small>${date.toLocaleTimeString('tr-TR')}</small>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Update consent chart
    updateConsentChart() {
        if (!this.dashboardData || !window.Chart) return;
        
        const stats = this.dashboardData.statistics;
        const ctx = document.getElementById('consent-chart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (window.consentChart) {
            window.consentChart.destroy();
        }
        
        window.consentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Analitik Kabul', 'Pazarlama Kabul', 'Sadece Zorunlu'],
                datasets: [{
                    data: [
                        stats.analytics_accepted,
                        stats.marketing_accepted, 
                        stats.total_consents - Math.max(stats.analytics_accepted, stats.marketing_accepted)
                    ],
                    backgroundColor: [
                        '#8b5cf6', // Purple for analytics
                        '#f59e0b', // Orange for marketing
                        '#6b7280'  // Gray for essential only
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // View consent details
    async viewConsentDetails(userIdentifier) {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBaseUrl}/api/kvkv/consent-status/${userIdentifier}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.hasConsent) {
                this.showConsentModal(userIdentifier, data);
            } else {
                this.showError('Rıza detayları bulunamadı');
            }
            
        } catch (error) {
            console.error('Error fetching consent details:', error);
            this.showError('Rıza detayları getirilemedi');
        }
    }
    
    // Show consent modal
    showConsentModal(userIdentifier, consentData) {
        const modal = document.createElement('div');
        modal.className = 'kvkv-modal';
        modal.innerHTML = `
            <div class="kvkv-modal-content">
                <div class="kvkv-modal-header">
                    <h3>Kullanıcı Rıza Detayları</h3>
                    <button class="modal-close" onclick="this.closest('.kvkv-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="kvkv-modal-body">
                    <div class="consent-details">
                        <div class="detail-group">
                            <label>Kullanıcı ID:</label>
                            <span class="user-id-full">${userIdentifier}</span>
                        </div>
                        
                        <div class="detail-group">
                            <label>Rıza Tarihi:</label>
                            <span>${new Date(consentData.consentDate).toLocaleString('tr-TR')}</span>
                        </div>
                        
                        <div class="detail-group">
                            <label>Rıza Yöntemi:</label>
                            <span>${this.getMethodLabel(consentData.consentMethod)}</span>
                        </div>
                        
                        <div class="detail-group">
                            <label>Versiyon:</label>
                            <span>${consentData.consentVersion}</span>
                        </div>
                        
                        <div class="consent-categories-detail">
                            <label>Kategori Tercihleri:</label>
                            <div class="categories-grid">
                                <div class="category-item ${consentData.settings.necessary ? 'enabled' : 'disabled'}">
                                    <i class="fas fa-shield-alt"></i>
                                    <span>Zorunlu Çerezler</span>
                                    <div class="status">${consentData.settings.necessary ? 'Kabul' : 'Red'}</div>
                                </div>
                                <div class="category-item ${consentData.settings.functional ? 'enabled' : 'disabled'}">
                                    <i class="fas fa-cog"></i>
                                    <span>İşlevsel Çerezler</span>
                                    <div class="status">${consentData.settings.functional ? 'Kabul' : 'Red'}</div>
                                </div>
                                <div class="category-item ${consentData.settings.analytics ? 'enabled' : 'disabled'}">
                                    <i class="fas fa-chart-bar"></i>
                                    <span>Analitik Çerezler</span>
                                    <div class="status">${consentData.settings.analytics ? 'Kabul' : 'Red'}</div>
                                </div>
                                <div class="category-item ${consentData.settings.marketing ? 'enabled' : 'disabled'}">
                                    <i class="fas fa-bullhorn"></i>
                                    <span>Pazarlama Çerezleri</span>
                                    <div class="status">${consentData.settings.marketing ? 'Kabul' : 'Red'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="kvkv-modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.kvkv-modal').remove()">
                        Kapat
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
    }
    
    // Export consent data
    async exportConsentData() {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${this.apiBaseUrl}/api/admin/kvkv/export-consent-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kvkv-consent-data-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Rıza verileri dışa aktarıldı');
            }
            
        } catch (error) {
            console.error('Error exporting consent data:', error);
            this.showError('Veri dışa aktarımında hata oluştu');
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }
        
        // Export button
        const exportBtn = document.getElementById('export-consent-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportConsentData());
        }
        
        // Auto refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }
    }
    
    // Start auto refresh
    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear existing interval
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000); // Refresh every 30 seconds
    }
    
    // Stop auto refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    // Helper methods
    getMethodIcon(method) {
        const icons = {
            'banner': 'desktop',
            'settings': 'cog', 
            'accept_all': 'check-circle',
            'reject_all': 'times-circle',
            'custom': 'sliders-h'
        };
        return icons[method] || 'question';
    }
    
    getMethodLabel(method) {
        const labels = {
            'banner': 'Banner',
            'settings': 'Ayarlar',
            'accept_all': 'Tümünü Kabul',
            'reject_all': 'Tümünü Reddet',
            'custom': 'Özel'
        };
        return labels[method] || method;
    }
    
    getEventIcon(eventType) {
        const icons = {
            'consent_request': 'hand-paper',
            'consent_withdrawal': 'hand-rock',
            'policy_update': 'file-alt',
            'data_access': 'eye',
            'data_deletion': 'trash'
        };
        return icons[eventType] || 'info-circle';
    }
    
    getEventLabel(eventType) {
        const labels = {
            'consent_request': 'Rıza Talebi',
            'consent_withdrawal': 'Rıza Geri Çekme',
            'policy_update': 'Politika Güncelleme',
            'data_access': 'Veri Erişimi',
            'data_deletion': 'Veri Silme'
        };
        return labels[eventType] || eventType;
    }
    
    // Notification methods
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('kvkv-dashboard')) {
        window.kvkvAdmin = new KVKVAdminDashboard();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KVKVAdminDashboard;
}