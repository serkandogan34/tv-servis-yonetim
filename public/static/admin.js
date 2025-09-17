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
        const response = await axios.post('/api/admin/login', {
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
        const response = await axios.get('/api/admin/dashboard', {
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
        const response = await axios.get('/api/admin/payments/pending', {
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
            const response = await axios.post(`/api/admin/payments/${paymentId}/approve`, {
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
            const response = await axios.post(`/api/admin/payments/${paymentId}/approve`, {
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
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const response = await axios.get('/api/admin/payments/history', {
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

// Enter key support for login
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !document.getElementById('admin-login').classList.contains('hidden')) {
        adminLogin();
    }
});