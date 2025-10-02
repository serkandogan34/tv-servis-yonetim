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

async function saveFacebookPixelConfig() {
    const pixelId = document.getElementById('fb-pixel-id').value;
    const accessToken = document.getElementById('fb-access-token').value;
    const enableConversions = document.getElementById('fb-enable-conversions').checked;
    const enableAudiences = document.getElementById('fb-enable-audiences').checked;
    
    if (!pixelId || pixelId.length < 10) {
        showAlert('Geçerli bir Facebook Pixel ID girin', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const adminToken = localStorage.getItem('admin_token');
        
        const response = await axios.post(`${baseURL}/api/admin/tracking/facebook-pixel`, {
            pixelId: pixelId,
            accessToken: accessToken,
            enableConversions: enableConversions,
            enableAudiences: enableAudiences,
            testMode: false
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.success) {
            showAlert('Facebook Pixel yapılandırması başarıyla kaydedildi', 'success');
            closeModal();
            updateIntegrationStatus('facebook', 'active');
            loadDigitalTrackingStats();
        }
    } catch (error) {
        console.error('Facebook Pixel config error:', error);
        showAlert('Yapılandırma kaydedilemedi: ' + (error.response?.data?.message || error.message), 'error');
    }
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

// Facebook Pixel Configuration
async function setupFacebookPixel() {
    const pixelId = document.getElementById('facebook-pixel-id').value;
    const accessToken = document.getElementById('facebook-access-token').value;
    const conversionApiEnabled = document.getElementById('facebook-conversion-api-enabled').checked;
    const enabled = document.getElementById('facebook-pixel-enabled').checked;
    
    if (!pixelId) {
        showAlert('Facebook Pixel ID gerekli', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/facebook-pixel/config`, {
            pixelId,
            accessToken,
            conversionApiEnabled,
            enabled,
            customEventMappings: {
                service_request: 'ServiceRequestSubmitted',
                contact_interaction: 'ContactInitiated',
                ai_chat: 'AIChatStarted'
            },
            audienceSettings: {
                lookalike_countries: ['TR'],
                retention_days: 30,
                high_intent_threshold: 80
            },
            optimizationGoals: {
                primary: 'conversions',
                secondary: 'lead_generation',
                value_optimization: true
            }
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            showAlert('Facebook Pixel başarıyla yapılandırıldı!', 'success');
            // Clear sensitive inputs
            document.getElementById('facebook-access-token').value = '';
            updateAPIStatus();
            
            // Show pixel tracking preview
            showFacebookPixelPreview(pixelId);
        } else {
            showAlert(response.data.error || 'Facebook Pixel kurulumu başarısız', 'error');
        }
    } catch (error) {
        console.error('Facebook Pixel setup error:', error);
        showAlert(error.response?.data?.error || 'Facebook Pixel kurulumu hatası', 'error');
    }
}

// Show Facebook Pixel Preview
function showFacebookPixelPreview(pixelId) {
    const previewContainer = document.getElementById('facebook-pixel-preview');
    if (previewContainer) {
        previewContainer.innerHTML = `
            <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="font-semibold text-blue-800 mb-2">✅ Facebook Pixel Aktif</h4>
                <div class="text-sm text-blue-700 space-y-1">
                    <p><strong>Pixel ID:</strong> ${pixelId}</p>
                    <p><strong>Enhanced Events:</strong> Service Requests, Contact Interactions, AI Chat</p>
                    <p><strong>Conversion Tracking:</strong> Lead Generation, Service Bookings</p>
                    <p><strong>Audience Building:</strong> High-Intent Users, Service Explorers</p>
                    <p><strong>Optimization:</strong> Value-based conversions, Funnel tracking</p>
                </div>
                
                <div class="mt-3 text-xs text-blue-600">
                    <p>🎯 Event Tracking: Form submissions, button clicks, scroll depth</p>
                    <p>📊 Conversion Value: Service-based value optimization</p>
                    <p>👥 Audiences: Segmentation for retargeting campaigns</p>
                </div>
            </div>
        `;
    }
}

// Load Facebook Pixel Analytics
async function loadFacebookPixelAnalytics() {
    try {
        const baseURL = window.location.origin;
        const response = await axios.get(`${baseURL}/api/admin/analytics/facebook-pixel`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            const data = response.data.data;
            
            // Update Facebook Pixel dashboard
            const dashboard = document.getElementById('facebook-pixel-analytics');
            if (dashboard) {
                dashboard.innerHTML = `
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Total Pixel Events</h4>
                            <p class="text-2xl font-bold text-blue-600">${data.totalPixelEvents || 0}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Total Conversion Value</h4>
                            <p class="text-2xl font-bold text-green-600">₺${(data.totalConversionValue || 0).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Funnel Progression (Son 7 gün)</h4>
                            <div class="space-y-2">
                                ${(data.funnelAnalytics || []).map(stage => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span class="text-sm capitalize">${stage.funnel_stage}</span>
                                        <div class="text-right">
                                            <span class="text-sm font-medium">${stage.stage_count} events</span>
                                            ${stage.stage_value > 0 ? `<span class="text-xs text-green-600 block">₺${stage.stage_value.toLocaleString('tr-TR')}</span>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Top Event Types</h4>
                            <div class="space-y-2">
                                ${(data.pixelEventsSummary || []).slice(0, 5).map(event => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span class="text-sm">${event.pixel_event_type}</span>
                                        <div class="text-right">
                                            <span class="text-sm font-medium">${event.event_count} events</span>
                                            ${event.total_value > 0 ? `<span class="text-xs text-green-600 block">₺${event.total_value.toLocaleString('tr-TR')}</span>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load Facebook Pixel analytics:', error);
    }
}

// Google Tag Manager Container Configuration
async function setupGTMContainer() {
    const containerId = document.getElementById('gtm-container-id').value;
    const containerName = document.getElementById('gtm-container-name').value;
    const enabled = document.getElementById('gtm-enabled').checked;
    const enhancedEcommerce = document.getElementById('gtm-enhanced-ecommerce').checked;
    const customEvents = document.getElementById('gtm-custom-events').checked;
    const engagementTracking = document.getElementById('gtm-engagement-tracking').checked;
    
    if (!containerId) {
        showAlert('GTM Container ID gerekli', 'error');
        return;
    }
    
    if (!containerId.startsWith('GTM-')) {
        showAlert('GTM Container ID GTM- ile başlamalı', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/gtm/config`, {
            containerId,
            containerName: containerName || 'GARANTOR360 Container',
            enabled,
            tagSettings: {
                ga4_config: true,
                facebook_pixel: true,
                custom_html: true,
                enhanced_ecommerce: enhancedEcommerce
            },
            triggerSettings: {
                page_view: true,
                form_submit: true,
                click_tracking: true,
                scroll_tracking: true,
                custom_events: customEvents
            },
            variableSettings: {
                datalayer_variables: true,
                custom_javascript: true,
                constants: true,
                engagement_tracking: engagementTracking
            }
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            showAlert('GTM Container başarıyla yapılandırıldı!', 'success');
            updateAPIStatus();
            
            // Show GTM preview
            showGTMPreview(containerId, containerName);
            
            // Load GTM analytics
            loadGTMAnalytics();
        } else {
            showAlert(response.data.error || 'GTM kurulumu başarısız', 'error');
        }
    } catch (error) {
        console.error('GTM setup error:', error);
        showAlert(error.response?.data?.error || 'GTM kurulumu hatası', 'error');
    }
}

// Show GTM Configuration Preview
function showGTMPreview(containerId, containerName) {
    const previewContainer = document.getElementById('gtm-preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = `
            <div class="mt-6 bg-white rounded-lg shadow">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800">✅ GTM Container Active</h3>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="font-medium text-gray-700">Container ID:</span>
                                <span class="text-blue-600 font-mono">${containerId}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium text-gray-700">Container Name:</span>
                                <span class="text-gray-800">${containerName}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium text-gray-700">DataLayer Events:</span>
                                <span class="text-green-600">15+ Custom Events</span>
                            </div>
                        </div>
                        
                        <div class="space-y-2">
                            <h4 class="font-semibold text-gray-800">Active Event Tracking:</h4>
                            <div class="text-sm text-gray-600 space-y-1">
                                <p>🎯 Service Request Submissions</p>
                                <p>📞 Contact Interactions (Phone/WhatsApp/Email)</p>
                                <p>🤖 AI Chat Engagements</p>
                                <p>📊 Page Engagement & Scroll Depth</p>
                                <p>🛒 Enhanced E-commerce Events</p>
                                <p>👤 User Journey Progression</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 class="font-semibold text-orange-800 mb-2">Next Steps:</h4>
                        <div class="text-sm text-orange-700 space-y-1">
                            <p>1. GTM Container'ınızda GA4 ve Facebook Pixel tag'lerini yapılandırın</p>
                            <p>2. DataLayer variables'ları kullanarak custom triggers oluşturun</p>
                            <p>3. Enhanced E-commerce events için item parameters'ları ayarlayın</p>
                            <p>4. GTM Preview Mode'da test edin ve publish yapın</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Load GTM Analytics Dashboard
async function loadGTMAnalytics() {
    try {
        const baseURL = window.location.origin;
        const response = await axios.get(`${baseURL}/api/admin/analytics/gtm`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            const data = response.data.data;
            
            // Update GTM analytics dashboard
            const dashboard = document.getElementById('gtm-analytics-dashboard');
            if (dashboard) {
                dashboard.innerHTML = `
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Total GTM Events</h4>
                            <p class="text-2xl font-bold text-orange-600">${data.totalGTMEvents || 0}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Unique Users</h4>
                            <p class="text-2xl font-bold text-indigo-600">${data.uniqueUsers || 0}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Event Categories (Son 7 gün)</h4>
                            <div class="space-y-2">
                                ${(data.eventCategories || []).map(category => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span class="text-sm">${category.category}</span>
                                        <div class="text-right">
                                            <span class="text-sm font-medium">${category.category_count} events</span>
                                            <span class="text-xs text-indigo-600 block">${category.unique_category_events} unique</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">User Journey Progression</h4>
                            <div class="space-y-2">
                                ${(data.journeyAnalytics || []).map(stage => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span class="text-sm capitalize">${stage.journey_stage}</span>
                                        <div class="text-right">
                                            <span class="text-sm font-medium">${stage.stage_count} progressions</span>
                                            <span class="text-xs text-green-600 block">${stage.unique_users} users</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Top Performing Events</h4>
                            <div class="space-y-2">
                                ${(data.topEvents || []).slice(0, 5).map(event => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span class="text-sm">${event.event_name}</span>
                                        <div class="text-right">
                                            <span class="text-sm font-medium">${event.total_events} events</span>
                                            ${event.avg_engagement_score > 0 ? `<span class="text-xs text-purple-600 block">Score: ${Math.round(event.avg_engagement_score)}</span>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load GTM analytics:', error);
    }
}

// KVKV Configuration Setup
async function setupKVKVConfig() {
    const companyName = document.getElementById('kvkv-company-name').value;
    const contactEmail = document.getElementById('kvkv-contact-email').value;
    const cookieRetention = document.getElementById('kvkv-cookie-retention').value;
    const privacyPolicyUrl = document.getElementById('kvkv-privacy-policy-url').value;
    const cookiePolicyUrl = document.getElementById('kvkv-cookie-policy-url').value;
    
    if (!companyName || !contactEmail) {
        showAlert('Şirket adı ve KVKV iletişim e-postası gerekli', 'error');
        return;
    }
    
    if (!contactEmail.includes('@')) {
        showAlert('Geçerli bir e-posta adresi girin', 'error');
        return;
    }
    
    try {
        const baseURL = window.location.origin;
        const response = await axios.post(`${baseURL}/api/admin/privacy/kvkv-config`, {
            companyName,
            contactEmail,
            dataControllerDetails: {
                name: companyName,
                address: 'Türkiye',
                phone: '+90 500 123 45 67',
                email: contactEmail
            },
            cookieRetentionDays: parseInt(cookieRetention),
            consentBannerSettings: {
                position: document.getElementById('cookie-banner-position').value,
                theme: document.getElementById('cookie-banner-theme').value,
                showDetailedSettings: document.getElementById('cookie-detailed-settings').checked,
                autoShow: document.getElementById('cookie-auto-show').checked
            },
            privacyPolicyUrl,
            cookiePolicyUrl
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            showAlert('KVKV konfigürasyonu başarıyla kaydedildi!', 'success');
            updateAPIStatus();
            loadKVKVAnalytics();
        } else {
            showAlert(response.data.error || 'KVKV konfigürasyonu başarısız', 'error');
        }
    } catch (error) {
        console.error('KVKV config error:', error);
        showAlert(error.response?.data?.error || 'KVKV konfigürasyon hatası', 'error');
    }
}

// Test Cookie Consent Banner
function testCookieBanner() {
    // Clear existing consent for testing
    localStorage.removeItem('kvkv_cookie_consent');
    
    // Show test message
    showAlert('Cookie consent banner test edildi! Sayfayı yenilediğinizde banner görünecek.', 'info');
    
    // Reload page after 2 seconds to show banner
    setTimeout(() => {
        window.location.reload();
    }, 2000);
}

// Load KVKV Analytics Dashboard
async function loadKVKVAnalytics() {
    try {
        const baseURL = window.location.origin;
        const response = await axios.get(`${baseURL}/api/admin/analytics/kvkv`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.data.success) {
            const data = response.data.data;
            
            // Update KVKV analytics dashboard
            const dashboard = document.getElementById('kvkv-analytics-dashboard');
            if (dashboard) {
                dashboard.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg text-center">
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Total Cookie Consents</h4>
                            <p class="text-3xl font-bold text-green-600">${data.totalConsents || 0}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg text-center">
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Analytics Acceptance</h4>
                            <p class="text-3xl font-bold text-blue-600">${Math.round(((data.overallConsent.analytics_percentage || 0) / Math.max(data.overallConsent.total_users, 1)) * 100)}%</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg text-center">
                            <h4 class="text-sm font-semibold text-gray-700 mb-2">Data Subject Requests</h4>
                            <p class="text-3xl font-bold text-orange-600">${data.totalDSRRequests || 0}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 mb-3">Cookie Consent Trends (Son 30 gün)</h4>
                            <div class="space-y-2 max-h-48 overflow-y-auto">
                                ${(data.consentStats || []).slice(0, 10).map(stat => `
                                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                        <span>${stat.consent_date}</span>
                                        <div class="text-right">
                                            <span class="font-medium">${stat.total_consents} consents</span>
                                            <div class="text-xs text-gray-500">
                                                Analytics: ${stat.analytics_accepted}, Marketing: ${stat.marketing_accepted}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 mb-3">Consent Categories Breakdown</h4>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm">Gerekli Çerezler (Necessary)</span>
                                    <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">100%</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm">Analitik Çerezler (Analytics)</span>
                                    <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                        ${Math.round(((data.overallConsent.analytics_percentage || 0) / Math.max(data.overallConsent.total_users, 1)) * 100)}%
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm">Pazarlama Çerezleri (Marketing)</span>
                                    <span class="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                        ${Math.round(((data.overallConsent.marketing_percentage || 0) / Math.max(data.overallConsent.total_users, 1)) * 100)}%
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm">Fonksiyonel Çerezler (Functional)</span>
                                    <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                        ${Math.round(((data.overallConsent.functional_percentage || 0) / Math.max(data.overallConsent.total_users, 1)) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 class="font-semibold text-blue-800 mb-2">KVKV Compliance Status</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                            <div>• Cookie consent logging: Active</div>
                            <div>• Data subject rights: Available</div>
                            <div>• Consent withdrawal: Enabled</div>
                            <div>• Privacy policy: Linked</div>
                            <div>• Data processing logs: Active</div>
                            <div>• Breach reporting: Configured</div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load KVKV analytics:', error);
    }
}

// Show Cookie Settings (for frontend integration)
window.showKVKVSettings = function() {
    if (typeof window.KVKVCookieConsent !== 'undefined') {
        window.KVKVCookieConsent.showDetailedConsent();
    } else {
        showAlert('Cookie consent sistemi henüz yüklenmedi', 'warning');
    }
};

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
                    },
                    {
                        name: 'Facebook Pixel',
                        enabled: configs.facebook?.facebook_pixel_enabled?.value === 'true',
                        configured: configs.facebook?.facebook_pixel_id?.value && 
                                  configs.facebook.facebook_pixel_id.value !== 'YOUR_PIXEL_ID_HERE'
                    },
                    {
                        name: 'GA4 Analytics',
                        enabled: configs.analytics?.ga4_enabled?.value === 'true',
                        configured: configs.analytics?.ga4_measurement_id?.value && 
                                  configs.analytics.ga4_measurement_id.value !== 'G-XXXXXXXXXX'
                    },
                    {
                        name: 'Google Tag Manager',
                        enabled: configs.gtm?.gtm_enabled?.value === 'true',
                        configured: configs.gtm?.gtm_container_id?.value && 
                                  configs.gtm.gtm_container_id.value !== 'GTM-XXXXXXX'
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