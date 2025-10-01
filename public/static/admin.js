// Admin Dashboard JavaScript
let adminToken = localStorage.getItem('adminToken');
let currentUser = JSON.parse(localStorage.getItem('currentAdmin') || '{}');

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    if (adminToken) {
        showDashboard();
        loadDashboardStats();
        loadPendingPayments();
    } else {
        showLogin();
    }
});

function showLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    
    // Update user info
    document.getElementById('admin-name').textContent = currentUser.ad_soyad || 'Admin';
    document.getElementById('admin-username').textContent = currentUser.kullanici_adi || 'admin';
}

// Login function
async function adminLogin() {
    const kullanici_adi = document.getElementById('username').value;
    const sifre = document.getElementById('password').value;
    
    if (!kullanici_adi || !sifre) {
        showAlert('Kullanıcı adı ve şifre gerekli', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin; // Dynamic domain detection
        const response = await axios.post(`${baseURL}/api/admin/login`, {
            kullanici_adi,
            sifre
        });
        
        if (response.data.success) {
            adminToken = response.data.token;
            currentUser = response.data.admin;
            
            localStorage.setItem('adminToken', adminToken);
            localStorage.setItem('currentAdmin', JSON.stringify(currentUser));
            
            showDashboard();
            loadDashboardStats();
            loadPendingPayments();
            showAlert('Giriş başarılı', 'success');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.response?.data?.error || 'Giriş başarısız', 'error');
    }
}

// Logout function
function adminLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('currentAdmin');
    adminToken = null;
    currentUser = {};
    showLogin();
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const baseURL = window.location.origin;
        const response = await axios.get(`${baseURL}/api/admin/dashboard`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.success) {
            const stats = response.data.stats;
            document.getElementById('pending-payments-count').textContent = stats.bekleyen_odemeler;
            document.getElementById('total-credits').textContent = `₺${stats.toplam_kredi.toLocaleString()}`;
            document.getElementById('active-dealers').textContent = stats.aktif_bayiler;
            document.getElementById('monthly-payments').textContent = `${stats.aylik_odemeler.sayi} (₺${stats.aylik_odemeler.tutar.toLocaleString()})`;
        }
    } catch (error) {
        console.error('Dashboard stats error:', error);
        if (error.response?.status === 401) {
            adminLogout();
        }
    }
}

// Load pending payments
async function loadPendingPayments() {
    try {
        const baseURL = window.location.origin;
        const response = await axios.get(`${baseURL}/api/admin/payments/pending`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.success) {
            displayPendingPayments(response.data.transfers);
        }
    } catch (error) {
        console.error('Pending payments error:', error);
        if (error.response?.status === 401) {
            adminLogout();
        }
    }
}

// Display pending payments table
function displayPendingPayments(transfers) {
    const container = document.getElementById('pending-payments-list');
    
    if (transfers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p>Bekleyen transfer yok</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transfers.map(transfer => `
        <div class="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800">${transfer.firma_adi}</h3>
                    <p class="text-gray-600">${transfer.il_adi} - ${transfer.email}</p>
                    <p class="text-sm text-gray-500">Tel: ${transfer.telefon}</p>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-green-600">₺${transfer.tutar.toLocaleString()}</p>
                    <p class="text-sm text-gray-500">${formatDate(transfer.created_at)}</p>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded mb-4">
                <p class="text-sm"><strong>Referans No:</strong> ${transfer.referans_no}</p>
                ${transfer.aciklama ? `<p class="text-sm"><strong>Açıklama:</strong> ${transfer.aciklama}</p>` : ''}
            </div>
            
            <div class="flex gap-3">
                <button onclick="approvePayment(${transfer.id})" 
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-check"></i> Onayla
                </button>
                <button onclick="rejectPayment(${transfer.id})" 
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-times"></i> Reddet
                </button>
            </div>
        </div>
    `).join('');
}

// Approve payment with confirmation
async function approvePayment(paymentId) {
    const aciklama = prompt('Onay açıklaması (isteğe bağlı):');
    if (aciklama === null) return; // User cancelled
    
    if (confirm('Bu transferi onaylamak istediğinizden emin misiniz?')) {
        try {
            const baseURL = window.location.origin;
            const response = await axios.post(`${baseURL}/api/admin/payments/${paymentId}/approve`, {
                action: 'approve',
                aciklama: aciklama
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            if (response.data.success) {
                showAlert('Transfer başarıyla onaylandı', 'success');
                loadDashboardStats();
                loadPendingPayments();
            }
        } catch (error) {
            console.error('Approve payment error:', error);
            showAlert(error.response?.data?.error || 'Onaylama işlemi başarısız', 'error');
        }
    }
}

// Reject payment with confirmation
async function rejectPayment(paymentId) {
    const aciklama = prompt('Reddetme nedeni (zorunlu):');
    if (!aciklama || aciklama.trim() === '') {
        showAlert('Reddetme nedeni belirtmelisiniz', 'error');
        return;
    }
    
    if (confirm('Bu transferi reddetmek istediğinizden emin misiniz?')) {
        try {
            const baseURL = window.location.origin;
            const response = await axios.post(`${baseURL}/api/admin/payments/${paymentId}/approve`, {
                action: 'reject',
                aciklama: aciklama
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            
            if (response.data.success) {
                showAlert('Transfer reddedildi', 'success');
                loadDashboardStats();
                loadPendingPayments();
            }
        } catch (error) {
            console.error('Reject payment error:', error);
            showAlert(error.response?.data?.error || 'Reddetme işlemi başarısız', 'error');
        }
    }
}

// Show navigation sections
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-blue-700');
        item.classList.add('hover:bg-blue-700');
    });
    
    // Show selected section
    document.getElementById(`admin-${sectionName}-section`).classList.remove('hidden');
    
    // Mark nav item as active
    const activeNavItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('bg-blue-700');
        activeNavItem.classList.remove('hover:bg-blue-700');
    }
    
    // Load section data
    if (sectionName === 'dashboard') {
        loadDashboardStats();
        loadPendingPayments();
    } else if (sectionName === 'payments') {
        loadPaymentHistory();
    } else if (sectionName === 'digital-tracking') {
        loadDigitalTrackingStats();
        initializeTrafficChart();
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const baseURL = window.location.origin;
        const response = await axios.get(`${baseURL}/api/admin/payments/history`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.success) {
            displayPaymentHistory(response.data.payments);
        }
    } catch (error) {
        console.error('Payment history error:', error);
        if (error.response?.status === 401) {
            adminLogout();
        }
    }
}

// Display payment history table
function displayPaymentHistory(payments) {
    const container = document.getElementById('payment-history-list');
    
    if (payments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-receipt text-4xl mb-4"></i>
                <p>Ödeme kaydı bulunamadı</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white rounded-lg shadow">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bayi</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yöntem</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referans</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${payments.map(payment => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div class="text-sm font-medium text-gray-900">${payment.firma_adi}</div>
                                    <div class="text-sm text-gray-500">${payment.il_adi}</div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                ₺${payment.tutar.toLocaleString()}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${getPaymentMethodText(payment.odeme_yontemi)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                ${getPaymentStatusBadge(payment.durum)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${formatDate(payment.created_at)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${payment.referans_no || '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Helper functions
function getPaymentMethodText(method) {
    const methods = {
        'kredi_karti': 'Kredi Kartı',
        'banka_havale': 'Banka Havalesi',
        'paytr': 'PayTR'
    };
    return methods[method] || method;
}

function getPaymentStatusBadge(status) {
    const badges = {
        'beklemede': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Beklemede</span>',
        'tamamlandi': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Tamamlandı</span>',
        'iptal_edildi': '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">İptal</span>'
    };
    return badges[status] || `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">${status}</span>`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    alertDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// =============================================================================
// DIGITAL TRACKING & ANALYTICS FUNCTIONS
// =============================================================================

// Load digital tracking statistics
async function loadDigitalTrackingStats() {
    try {
        // Simulate loading analytics data (will be replaced with real API calls)
        const mockStats = {
            dailyVisitors: Math.floor(Math.random() * 500) + 800,
            conversionRate: (Math.random() * 3 + 6).toFixed(1),
            avgSession: generateRandomTime(),
            seoScore: Math.floor(Math.random() * 10) + 85
        };
        
        // Update stats in UI with animation
        animateCounter('daily-visitors', mockStats.dailyVisitors, 2000);
        document.getElementById('conversion-rate').textContent = mockStats.conversionRate + '%';
        document.getElementById('avg-session').textContent = mockStats.avgSession;
        animateCounter('seo-score', mockStats.seoScore, 1500, '/100');
        
    } catch (error) {
        console.error('Digital tracking stats error:', error);
        showAlert('Analytics verileri yüklenemedi', 'error');
    }
}

// Animate counter numbers
function animateCounter(elementId, targetValue, duration = 2000, suffix = '') {
    const element = document.getElementById(elementId);
    const startValue = 0;
    const increment = targetValue / (duration / 16); // 60 FPS
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        
        if (suffix === '/100') {
            element.textContent = Math.floor(currentValue) + suffix;
        } else if (suffix) {
            element.textContent = Math.floor(currentValue).toLocaleString() + suffix;
        } else {
            element.textContent = Math.floor(currentValue).toLocaleString();
        }
    }, 16);
}

// Generate random session time
function generateRandomTime() {
    const minutes = Math.floor(Math.random() * 5) + 2;
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

// Initialize traffic sources chart
function initializeTrafficChart() {
    const ctx = document.getElementById('traffic-sources-chart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Organik Arama', 'Sosyal Medya', 'Direkt Trafik', 'Referans', 'Email', 'Diğer'],
            datasets: [{
                data: [45.2, 18.7, 15.3, 12.8, 5.1, 2.9],
                backgroundColor: [
                    '#3B82F6', // Blue
                    '#10B981', // Green  
                    '#F59E0B', // Yellow
                    '#8B5CF6', // Purple
                    '#EF4444', // Red
                    '#6B7280'  // Gray
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
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
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// Analytics setup functions
async function setupGA4() {
    showAlert('Google Analytics 4 kurulum rehberi açılacak...', 'info');
    
    const modal = createSetupModal('Google Analytics 4 Kurulumu', `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 class="font-semibold text-blue-800 mb-2">1. Google Analytics Hesabı Oluştur</h4>
                <p class="text-sm text-blue-700">analytics.google.com adresinden yeni property oluşturun</p>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 class="font-semibold text-green-800 mb-2">2. Measurement ID'yi Alın</h4>
                <p class="text-sm text-green-700">G-XXXXXXXXXX formatında olan ID'yi kopyalayın</p>
            </div>
            
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Measurement ID:</label>
                <input type="text" id="ga4-measurement-id" placeholder="G-XXXXXXXXXX" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div class="flex gap-3">
                <button onclick="saveGA4Config()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Kaydet ve Aktifleştir
                </button>
                <button onclick="closeModal()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">
                    İptal
                </button>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
}

async function setupFacebookPixel() {
    showAlert('Facebook Pixel kurulum rehberi açılacak...', 'info');
    
    const modal = createSetupModal('Facebook Pixel Kurulumu', `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 class="font-semibold text-blue-800 mb-2">1. Facebook Business Manager</h4>
                <p class="text-sm text-blue-700">business.facebook.com'dan Events Manager'e gidin</p>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 class="font-semibold text-green-800 mb-2">2. Pixel ID'yi Bulun</h4>
                <p class="text-sm text-green-700">15-16 haneli sayısal ID'yi kopyalayın</p>
            </div>
            
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Facebook Pixel ID:</label>
                <input type="text" id="fb-pixel-id" placeholder="123456789012345" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div class="flex gap-3">
                <button onclick="saveFacebookPixelConfig()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Kaydet ve Aktifleştir
                </button>
                <button onclick="closeModal()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">
                    İptal
                </button>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
}

async function setupGTM() {
    showAlert('Google Tag Manager kurulum rehberi açılacak...', 'info');
    
    const modal = createSetupModal('Google Tag Manager Kurulumu', `
        <div class="space-y-4">
            <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 class="font-semibold text-orange-800 mb-2">1. GTM Hesabı Oluştur</h4>
                <p class="text-sm text-orange-700">tagmanager.google.com'dan yeni container oluşturun</p>
            </div>
            
            <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 class="font-semibold text-purple-800 mb-2">2. Container ID'yi Alın</h4>
                <p class="text-sm text-purple-700">GTM-XXXXXXX formatında olan ID'yi kopyalayın</p>
            </div>
            
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Container ID:</label>
                <input type="text" id="gtm-container-id" placeholder="GTM-XXXXXXX" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
            </div>
            
            <div class="flex gap-3">
                <button onclick="saveGTMConfig()" class="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">
                    Kaydet ve Aktifleştir
                </button>
                <button onclick="closeModal()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">
                    İptal
                </button>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
}

async function setupSchema() {
    showAlert('Schema.org structured data kurulacak...', 'info');
    
    // This would integrate with backend to add schema markup
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/seo/schema-setup`, {
            businessType: 'LocalBusiness',
            services: ['TV Repair', 'Appliance Repair', 'Electronics Service']
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.success) {
            showAlert('Schema.org markup başarıyla eklendi', 'success');
            loadDigitalTrackingStats();
        }
    } catch (error) {
        console.error('Schema setup error:', error);
        showAlert('Schema kurulumu henüz mevcut değil - Geliştirme aşamasında', 'info');
    }
}

async function setupCookieConsent() {
    showAlert('KVKV uyumlu cookie consent sistemi kurulacak...', 'info');
    
    // This would integrate with a cookie consent library
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/privacy/cookie-setup`, {
            gdprCompliant: true,
            turkishLaw: true,
            customization: {
                position: 'bottom',
                theme: 'light'
            }
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.success) {
            showAlert('Cookie consent sistemi aktifleştirildi', 'success');
            loadDigitalTrackingStats();
        }
    } catch (error) {
        console.error('Cookie consent setup error:', error);
        showAlert('Cookie consent kurulumu henüz mevcut değil - Geliştirme aşamasında', 'info');
    }
}

function viewPerformanceDetails() {
    window.open('/admin#system-monitoring', '_blank');
}

// SEO Functions
function refreshSEOData() {
    showAlert('SEO verileri güncelleniyor...', 'info');
    // Simulate data refresh
    setTimeout(() => {
        showAlert('SEO verileri başarıyla güncellendi', 'success');
        loadDigitalTrackingStats();
    }, 2000);
}

function exportSEOReport() {
    showAlert('SEO raporu PDF olarak indiriliyor...', 'info');
    
    // Simulate PDF generation and download
    setTimeout(() => {
        const link = document.createElement('a');
        link.href = '#'; // This would be a real PDF URL in production
        link.download = `garantor360-seo-report-${new Date().toISOString().split('T')[0]}.pdf`;
        // link.click(); // Uncomment in production
        
        showAlert('SEO raporu hazırlandı (Demo modunda)', 'success');
    }, 1500);
}

// Configuration save functions
function saveGA4Config() {
    const measurementId = document.getElementById('ga4-measurement-id').value;
    if (!measurementId || !measurementId.startsWith('G-')) {
        showAlert('Geçerli bir Measurement ID girin (G-XXXXXXXXXX)', 'error');
        return;
    }
    
    // Here you would save to backend/localStorage
    localStorage.setItem('ga4_measurement_id', measurementId);
    showAlert('Google Analytics 4 yapılandırması kaydedildi', 'success');
    closeModal();
    
    // Update UI status
    updateIntegrationStatus('ga4', 'active');
}

function saveFacebookPixelConfig() {
    const pixelId = document.getElementById('fb-pixel-id').value;
    if (!pixelId || pixelId.length < 10) {
        showAlert('Geçerli bir Facebook Pixel ID girin', 'error');
        return;
    }
    
    localStorage.setItem('fb_pixel_id', pixelId);
    showAlert('Facebook Pixel yapılandırması kaydedildi', 'success');
    closeModal();
    
    updateIntegrationStatus('facebook', 'active');
}

function saveGTMConfig() {
    const containerId = document.getElementById('gtm-container-id').value;
    if (!containerId || !containerId.startsWith('GTM-')) {
        showAlert('Geçerli bir Container ID girin (GTM-XXXXXXX)', 'error');
        return;
    }
    
    localStorage.setItem('gtm_container_id', containerId);
    showAlert('Google Tag Manager yapılandırması kaydedildi', 'success');
    closeModal();
    
    updateIntegrationStatus('gtm', 'active');
}

// Update integration status in UI
function updateIntegrationStatus(service, status) {
    // This would update the status indicators in the Digital Tracking panel
    console.log(`${service} integration status updated to: ${status}`);
}

// Modal utility functions
function createSetupModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.id = 'setup-modal';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
            </div>
            <div class="p-6">
                ${content}
            </div>
        </div>
    `;
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return modal;
}

function closeModal() {
    const modal = document.getElementById('setup-modal');
    if (modal) {
        modal.remove();
    }
}

// Enter key support for login
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !document.getElementById('admin-login').classList.contains('hidden')) {
        adminLogin();
    }
});

// =============================================================================
// Webhook & API Configuration Functions
// =============================================================================

// Tab navigation for Digital Tracking section
function showTrackingTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tracking-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tracking-tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab content
    document.getElementById(`tracking-tab-${tabName}`).classList.remove('hidden');
    
    // Mark selected tab as active
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-blue-500', 'text-blue-600');
}

// N8N Webhook Configuration
async function setupN8NWebhook() {
    const webhookUrl = document.getElementById('n8n-webhook-url').value;
    const enabled = document.getElementById('n8n-webhook-enabled').checked;
    
    if (!webhookUrl) {
        showAlert('Webhook URL gerekli', 'error');
        return;
    }
    
    if (!webhookUrl.startsWith('http')) {
        showAlert('Webhook URL https:// ile başlamalı', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/webhooks/n8n-setup`, {
            webhookUrl,
            enabled
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            showAlert('N8N Webhook başarıyla yapılandırıldı ve test edildi!', 'success');
            updateAPIStatus();
        } else {
            showAlert(response.data.error || 'N8N Webhook kurulumu başarısız', 'error');
        }
    } catch (error) {
        console.error('N8N webhook setup error:', error);
        showAlert(error.response?.data?.error || 'N8N Webhook kurulumu hatası', 'error');
    }
}

// OpenAI API Key Configuration
async function setupOpenAI() {
    const apiKey = document.getElementById('openai-api-key').value;
    const model = document.getElementById('openai-model').value;
    const enabled = document.getElementById('openai-enabled').checked;
    
    if (!apiKey) {
        showAlert('OpenAI API Key gerekli', 'error');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        showAlert('OpenAI API Key sk- ile başlamalı', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/ai/openai-setup`, {
            apiKey,
            model,
            enabled
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            showAlert('OpenAI API Key başarıyla yapılandırıldı ve test edildi!', 'success');
            // Clear the input for security
            document.getElementById('openai-api-key').value = '';
            updateAPIStatus();
        } else {
            showAlert(response.data.error || 'OpenAI kurulumu başarısız', 'error');
        }
    } catch (error) {
        console.error('OpenAI setup error:', error);
        showAlert(error.response?.data?.error || 'OpenAI kurulumu hatası', 'error');
    }
}

// SendGrid Email Service Configuration
async function setupSendGrid() {
    const apiKey = document.getElementById('sendgrid-api-key').value;
    const fromEmail = document.getElementById('sendgrid-from-email').value;
    const enabled = document.getElementById('sendgrid-enabled').checked;
    
    if (!apiKey) {
        showAlert('SendGrid API Key gerekli', 'error');
        return;
    }
    
    if (!apiKey.startsWith('SG.')) {
        showAlert('SendGrid API Key SG. ile başlamalı', 'error');
        return;
    }
    
    if (!fromEmail || !fromEmail.includes('@')) {
        showAlert('Geçerli bir gönderen email adresi gerekli', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/email/sendgrid-setup`, {
            apiKey,
            fromEmail,
            enabled
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            showAlert('SendGrid Email servis başarıyla yapılandırıldı!', 'success');
            // Clear the input for security
            document.getElementById('sendgrid-api-key').value = '';
            updateAPIStatus();
        } else {
            showAlert(response.data.error || 'SendGrid kurulumu başarısız', 'error');
        }
    } catch (error) {
        console.error('SendGrid setup error:', error);
        showAlert(error.response?.data?.error || 'SendGrid kurulumu hatası', 'error');
    }
}

// PayTR Payment Gateway Configuration
async function setupPayTR() {
    const merchantId = document.getElementById('paytr-merchant-id').value;
    const merchantKey = document.getElementById('paytr-merchant-key').value;
    const merchantSalt = document.getElementById('paytr-merchant-salt').value;
    const enabled = document.getElementById('paytr-enabled').checked;
    
    if (!merchantId || !merchantKey || !merchantSalt) {
        showAlert('PayTR Merchant ID, Key ve Salt alanları gerekli', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/payment/paytr-setup`, {
            merchantId,
            merchantKey,
            merchantSalt,
            enabled
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            showAlert('PayTR Payment Gateway başarıyla yapılandırıldı!', 'success');
            // Clear sensitive inputs
            document.getElementById('paytr-merchant-key').value = '';
            document.getElementById('paytr-merchant-salt').value = '';
            updateAPIStatus();
        } else {
            showAlert(response.data.error || 'PayTR kurulumu başarısız', 'error');
        }
    } catch (error) {
        console.error('PayTR setup error:', error);
        showAlert(error.response?.data?.error || 'PayTR kurulumu hatası', 'error');
    }
}

// Update API Status Dashboard
async function updateAPIStatus() {
    try {
        const baseURL = window.location.origin;
        const response = await axios.get(`${baseURL}/api/admin/analytics/tracking-config`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            const configs = response.data.data;
            
            // Update status dashboard
            const dashboard = document.getElementById('api-status-dashboard');
            if (dashboard) {
                const statusCards = [
                    {
                        name: 'N8N Webhook',
                        enabled: configs.webhooks?.n8n_webhook_enabled?.value === 'true',
                        configured: configs.webhooks?.n8n_webhook_url?.value && 
                                  configs.webhooks.n8n_webhook_url.value !== 'https://your-n8n-instance.com/webhook/garantor360'
                    },
                    {
                        name: 'OpenAI API',
                        enabled: configs.api_keys?.openai_enabled?.value === 'true',
                        configured: configs.api_keys?.openai_api_key?.value && 
                                  configs.api_keys.openai_api_key.value !== ''
                    },
                    {
                        name: 'SendGrid',
                        enabled: configs.email?.sendgrid_enabled?.value === 'true',
                        configured: configs.email?.sendgrid_api_key?.value && 
                                  configs.email.sendgrid_api_key.value !== ''
                    },
                    {
                        name: 'PayTR',
                        enabled: configs.payment?.paytr_enabled?.value === 'true',
                        configured: configs.payment?.paytr_merchant_id?.value && 
                                  configs.payment.paytr_merchant_id.value !== ''
                    }
                ];
                
                dashboard.innerHTML = statusCards.map(service => {
                    let statusClass, statusText;
                    if (service.enabled && service.configured) {
                        statusClass = 'bg-green-100 text-green-800';
                        statusText = 'ONLINE';
                    } else if (service.configured) {
                        statusClass = 'bg-yellow-100 text-yellow-800';
                        statusText = 'DISABLED';
                    } else {
                        statusClass = 'bg-gray-100 text-gray-800';
                        statusText = 'OFFLINE';
                    }
                    
                    return `
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <span class="text-sm font-medium text-gray-700">${service.name}</span>
                            <span class="px-2 py-1 text-xs font-semibold ${statusClass} rounded">${statusText}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Failed to update API status:', error);
    }
}

// Load API status when digital tracking section is shown
function loadDigitalTrackingData() {
    updateAPIStatus();
}

// Initialize tracking tab on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set default active tab
    setTimeout(() => {
        if (document.querySelector('.tracking-tab-btn')) {
            document.querySelector('.tracking-tab-btn').click();
        }
    }, 500);
});