// TV Servis Bayi Dashboard - Frontend JavaScript

// Global state
let bayiInfo = null;
let bayiToken = null;
let currentJobs = [];
let myJobs = [];
let krediBilgileri = {};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bayi Dashboard başlatılıyor...');
    
    // Check authentication
    checkBayiAuth();
});

// Authentication check
function checkBayiAuth() {
    bayiToken = localStorage.getItem('bayiToken');
    const bayiInfoStr = localStorage.getItem('bayiInfo');
    
    if (!bayiToken || !bayiInfoStr) {
        // Redirect to login if no auth
        window.location.href = '/bayi/login';
        return;
    }
    
    try {
        bayiInfo = JSON.parse(bayiInfoStr);
        updateBayiInfo();
        loadBayiDashboard();
        showBayiSection('dashboard');
    } catch (error) {
        console.error('Auth parse error:', error);
        logout();
    }
}

// Update bayi info in header
function updateBayiInfo() {
    const bayiInfoElement = document.getElementById('bayiInfo');
    if (bayiInfo && bayiInfoElement) {
        bayiInfoElement.innerHTML = `
            <i class="fas fa-user mr-1"></i>
            ${bayiInfo.firma_adi} | Bakiye: ${bayiInfo.kredi_bakiye} ₺
        `;
    }
}

// Load bayi dashboard data
async function loadBayiDashboard() {
    try {
        console.log('Dashboard verileri yükleniyor...');
        
        // Get fresh profile data
        await loadBayiProfile();
        
        // Load available jobs count
        const jobsResponse = await makeAuthRequest('/api/bayi/jobs');
        currentJobs = jobsResponse.data || [];
        
        // Load my jobs count  
        const myJobsResponse = await makeAuthRequest('/api/bayi/my-jobs');
        myJobs = myJobsResponse.data || [];
        
        // Load credit info
        const creditsResponse = await makeAuthRequest('/api/bayi/credits');
        krediBilgileri = creditsResponse.data || {};
        
        // Update dashboard stats
        updateDashboardStats();
        
        console.log('Dashboard verileri güncellendi');
    } catch (error) {
        console.error('Dashboard load error:', error);
        showError('Dashboard verileri yüklenemedi');
    }
}

// Load bayi profile
async function loadBayiProfile() {
    try {
        const response = await makeAuthRequest('/api/bayi/profile');
        bayiInfo = response.data;
        updateBayiInfo();
        localStorage.setItem('bayiInfo', JSON.stringify(bayiInfo));
    } catch (error) {
        console.error('Profile load error:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    document.getElementById('kredi-bakiye').textContent = (krediBilgileri.kredi_bakiye || 0) + ' ₺';
    document.getElementById('mevcut-isler').textContent = currentJobs.length;
    document.getElementById('aldigim-isler').textContent = myJobs.length;
    document.getElementById('bayi-rating').textContent = bayiInfo?.rating || '5.0';
}

// Navigation functions
function showBayiSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Show selected section
    const targetSection = document.getElementById('bayi-' + sectionName + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                loadBayiDashboard();
                break;
            case 'jobs':
                loadBayiJobs();
                break;
            case 'my-jobs':
                loadBayiMyJobs();
                break;
            case 'credits':
                loadBayiCredits();
                break;
        }
    }
}

// Load available jobs for bayi
async function loadBayiJobs() {
    try {
        console.log('Mevcut işler yükleniyor...');
        
        const response = await makeAuthRequest('/api/bayi/jobs');
        currentJobs = response.data || [];
        
        displayBayiJobs(currentJobs);
        console.log(`${currentJobs.length} mevcut iş yüklendi`);
    } catch (error) {
        console.error('Jobs load error:', error);
        showError('İşler yüklenemedi');
    }
}

// Display available jobs
function displayBayiJobs(jobsList) {
    const container = document.getElementById('bayi-jobs-list');
    
    if (!jobsList || jobsList.length === 0) {
        container.innerHTML = `
            <div class=\"bg-white p-8 rounded-lg shadow text-center text-gray-500\">
                <i class=\"fas fa-inbox text-4xl mb-4\"></i>
                <p>İlinizde şu anda müsait iş bulunmamaktadır</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    jobsList.forEach(job => {
        const priorityColor = {
            'yüksek': 'bg-red-100 text-red-800 border-red-200',
            'normal': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'düşük': 'bg-green-100 text-green-800 border-green-200'
        }[job.oncelik] || 'bg-gray-100 text-gray-800 border-gray-200';
        
        const statusColor = {
            'yeni': 'bg-blue-100 text-blue-800',
            'atandı': 'bg-orange-100 text-orange-800'
        }[job.durum] || 'bg-gray-100 text-gray-800';
        
        const canPurchase = !job.satin_alan_bayi_id;
        const isMyJob = job.satin_alan_bayi_id == bayiInfo.id;
        
        html += `
            <div class=\"bg-white border rounded-lg p-6 hover:shadow-md transition-shadow\">
                <div class=\"flex justify-between items-start mb-4\">
                    <div class=\"flex items-center space-x-3\">
                        <h3 class=\"font-semibold text-lg\">${job.talep_kodu}</h3>
                        <span class=\"px-3 py-1 rounded-full text-xs font-medium ${priorityColor} border\">
                            ${job.oncelik} öncelik
                        </span>
                        <span class=\"px-3 py-1 rounded-full text-xs font-medium ${statusColor}\">
                            ${job.durum}
                        </span>
                        ${isMyJob ? '<span class=\"px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800\">Size Ait</span>' : ''}
                    </div>
                    <div class=\"text-right\">
                        <span class=\"text-lg font-bold text-green-600\">${job.is_fiyati} ₺</span>
                        <br>
                        <span class=\"text-xs text-gray-500\">${new Date(job.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                </div>
                
                <div class=\"grid grid-cols-1 md:grid-cols-2 gap-4 mb-4\">
                    <div>
                        <p class=\"text-sm text-gray-600 mb-1\">Müşteri Bilgileri</p>
                        <p class=\"font-medium\">${job.musteri_adi}</p>
                        <p class=\"text-sm text-gray-600\">${job.telefon}</p>
                        <p class=\"text-sm text-gray-600\">${job.adres_bilgi}</p>
                    </div>
                    
                    <div>
                        <p class=\"text-sm text-gray-600 mb-1\">Servis Detayları</p>
                        <p class=\"font-medium\">${job.servis_turu}</p>
                        <p class=\"text-sm text-gray-600\">Marka: ${job.tv_marka || 'Belirtilmemiş'}</p>
                        <p class=\"text-sm text-gray-600\">Model: ${job.tv_model || 'Belirtilmemiş'}</p>
                    </div>
                </div>
                
                <div class=\"mb-4\">
                    <p class=\"text-sm text-gray-600 mb-1\">Açıklama</p>
                    <p class=\"text-sm\">${job.aciklama}</p>
                </div>
                
                <div class=\"flex justify-between items-center\">
                    ${canPurchase ? `
                        <button onclick=\"purchaseJob(${job.id})\" class=\"bg-green-500 hover:bg-green-700 text-white px-6 py-2 rounded font-medium\">
                            <i class=\"fas fa-shopping-cart mr-1\"></i> İşi Satın Al (${job.is_fiyati} ₺)
                        </button>
                    ` : `
                        <span class=\"text-gray-500 italic\">
                            ${isMyJob ? 'Bu iş sizin - tam bilgilere erişebilirsiniz' : 'Bu iş başka bir bayi tarafından satın alındı'}
                        </span>
                    `}
                    
                    ${isMyJob ? `
                        <button onclick=\"viewJobDetails(${job.id})\" class=\"bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded\">
                            <i class=\"fas fa-eye mr-1\"></i> Detayları Gör
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load my purchased jobs
async function loadBayiMyJobs() {
    try {
        console.log('Satın alınan işler yükleniyor...');
        
        const response = await makeAuthRequest('/api/bayi/my-jobs');
        myJobs = response.data || [];
        
        displayBayiMyJobs(myJobs);
        console.log(`${myJobs.length} satın alınan iş yüklendi`);
    } catch (error) {
        console.error('My jobs load error:', error);
        showError('Satın alınan işler yüklenemedi');
    }
}

// Display purchased jobs
function displayBayiMyJobs(jobsList) {
    const container = document.getElementById('bayi-my-jobs-list');
    
    if (!jobsList || jobsList.length === 0) {
        container.innerHTML = `
            <div class=\"bg-white p-8 rounded-lg shadow text-center text-gray-500\">
                <i class=\"fas fa-handshake text-4xl mb-4\"></i>
                <p>Henüz satın aldığınız iş bulunmamaktadır</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    jobsList.forEach(job => {
        const priorityColor = {
            'yüksek': 'bg-red-100 text-red-800 border-red-200',
            'normal': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'düşük': 'bg-green-100 text-green-800 border-green-200'
        }[job.oncelik] || 'bg-gray-100 text-gray-800 border-gray-200';
        
        html += `
            <div class=\"bg-white border rounded-lg p-6 hover:shadow-md transition-shadow\">
                <div class=\"flex justify-between items-start mb-4\">
                    <div class=\"flex items-center space-x-3\">
                        <h3 class=\"font-semibold text-lg\">${job.talep_kodu}</h3>
                        <span class=\"px-3 py-1 rounded-full text-xs font-medium ${priorityColor} border\">
                            ${job.oncelik} öncelik
                        </span>
                        <span class=\"px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800\">
                            ${job.satin_alma_fiyati} ₺ ile satın alındı
                        </span>
                    </div>
                    <span class=\"text-xs text-gray-500\">
                        Satın alındı: ${new Date(job.satin_alma_tarihi).toLocaleDateString('tr-TR')}
                    </span>
                </div>
                
                <div class=\"grid grid-cols-1 md:grid-cols-2 gap-4 mb-4\">
                    <div class=\"bg-blue-50 p-4 rounded\">
                        <p class=\"text-sm font-medium text-blue-800 mb-2\">
                            <i class=\"fas fa-user mr-1\"></i> Müşteri Bilgileri (Tam Erişim)
                        </p>
                        <p class=\"font-medium\">${job.musteri_adi}</p>
                        <p class=\"text-sm\"><i class=\"fas fa-phone mr-1\"></i> ${job.telefon}</p>
                        ${job.email ? `<p class=\"text-sm\"><i class=\"fas fa-envelope mr-1\"></i> ${job.email}</p>` : ''}
                        <p class=\"text-sm\"><i class=\"fas fa-map-marker-alt mr-1\"></i> ${job.adres}</p>
                        <p class=\"text-sm text-blue-600\">${job.il_adi}${job.ilce_adi ? ' / ' + job.ilce_adi : ''}</p>
                    </div>
                    
                    <div>
                        <p class=\"text-sm text-gray-600 mb-1\">Servis Detayları</p>
                        <p class=\"font-medium\">${job.servis_turu}</p>
                        <p class=\"text-sm text-gray-600\">Marka: ${job.tv_marka || 'Belirtilmemiş'}</p>
                        <p class=\"text-sm text-gray-600\">Model: ${job.tv_model || 'Belirtilmemiş'}</p>
                        <p class=\"text-sm text-gray-600\">Durum: <span class=\"font-medium\">${job.durum}</span></p>
                    </div>
                </div>
                
                <div class=\"mb-4\">
                    <p class=\"text-sm text-gray-600 mb-1\">Problem Açıklaması</p>
                    <p class=\"text-sm\">${job.sorun_aciklama || job.aciklama}</p>
                </div>
                
                <div class=\"flex space-x-2\">
                    <a href=\"tel:${job.telefon}\" class=\"bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded text-sm\">
                        <i class=\"fas fa-phone mr-1\"></i> Ara
                    </a>
                    ${job.email ? `
                        <a href=\"mailto:${job.email}\" class=\"bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm\">
                            <i class=\"fas fa-envelope mr-1\"></i> Email
                        </a>
                    ` : ''}
                    <button onclick=\"updateJobStatus(${job.id})\" class=\"bg-orange-500 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm\">
                        <i class=\"fas fa-edit mr-1\"></i> Durumu Güncelle
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load credit information
async function loadBayiCredits() {
    try {
        console.log('Kredi bilgileri yükleniyor...');
        
        const response = await makeAuthRequest('/api/bayi/credits');
        krediBilgileri = response.data || {};
        
        displayBayiCredits();
        console.log('Kredi bilgileri güncellendi');
    } catch (error) {
        console.error('Credits load error:', error);
        showError('Kredi bilgileri yüklenemedi');
    }
}

// Display credit information
function displayBayiCredits() {
    const container = document.getElementById('bayi-credits-content');
    
    let html = `
        <div class=\"bg-white rounded-lg shadow p-6 mb-6\">
            <div class=\"flex justify-between items-center mb-6\">
                <h3 class=\"text-xl font-semibold\">
                    <i class=\"fas fa-coins mr-2\"></i> Kredi Bakiyesi
                </h3>
                <div class=\"text-right\">
                    <p class=\"text-3xl font-bold text-green-600\">${krediBilgileri.kredi_bakiye || 0} ₺</p>
                </div>
            </div>
            
            <div class=\"flex space-x-4\">
                <button onclick=\"openCreditModal()\" class=\"bg-blue-500 hover:bg-blue-700 text-white px-6 py-3 rounded font-medium\">
                    <i class=\"fas fa-credit-card mr-2\"></i> Kredi Yükle
                </button>
                <button onclick=\"requestTransfer()\" class=\"bg-green-500 hover:bg-green-700 text-white px-6 py-3 rounded font-medium\">
                    <i class=\"fas fa-university mr-2\"></i> Havale Bildirimi
                </button>
            </div>
        </div>
        
        <div class=\"bg-white rounded-lg shadow p-6\">
            <h3 class=\"text-xl font-semibold mb-4\">
                <i class=\"fas fa-history mr-2\"></i> Kredi Hareketleri
            </h3>
    `;
    
    if (krediBilgileri.hareketler && krediBilgileri.hareketler.length > 0) {
        html += '<div class=\"space-y-3\">';
        krediBilgileri.hareketler.forEach(hareket => {
            const isPositive = hareket.hareket_turu === 'yükleme';
            const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
            const iconClass = isPositive ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
            
            html += `
                <div class=\"flex justify-between items-center p-3 border-b border-gray-100\">
                    <div class=\"flex items-center space-x-3\">
                        <i class=\"${iconClass} ${colorClass}\"></i>
                        <div>
                            <p class=\"font-medium\">${hareket.aciklama || hareket.hareket_turu}</p>
                            <p class=\"text-xs text-gray-500\">${new Date(hareket.created_at).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                    <div class=\"text-right\">
                        <p class=\"font-semibold ${colorClass}\">${isPositive ? '+' : '-'}${hareket.tutar} ₺</p>
                        <p class=\"text-xs text-gray-500\">Bakiye: ${hareket.yeni_bakiye} ₺</p>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<p class=\"text-gray-500 text-center py-8\">Henüz kredi hareketi bulunmamaktadır</p>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Purchase job function
async function purchaseJob(jobId) {
    if (!confirm('Bu işi satın almak istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        // TODO: İş satın alma API'si implementasyonu
        // Şimdilik alert göster
        alert('İş satın alma özelliği Faz 3\'te implementasyona eklenecek. Job ID: ' + jobId);
    } catch (error) {
        console.error('Purchase job error:', error);
        showError('İş satın alınamadı');
    }
}

// View job details
function viewJobDetails(jobId) {
    // TODO: İş detayları modal implementasyonu
    alert('İş detayları modalı geliştirilecek. Job ID: ' + jobId);
}

// Update job status
function updateJobStatus(jobId) {
    // TODO: İş durumu güncelleme modalı
    alert('İş durumu güncelleme özelliği geliştirilecek. Job ID: ' + jobId);
}

// Open credit modal
function openCreditModal() {
    // TODO: Kredi yükleme modalı (PayTR entegrasyonu)
    alert('Kredi yükleme özelliği Faz 3\'te PayTR ile implementasyona eklenecek');
}

// Request transfer
function requestTransfer() {
    // TODO: Havale bildirimi modalı
    alert('Havale bildirimi özelliği geliştirilecek');
}

// Make authenticated request
async function makeAuthRequest(url, options = {}) {
    const token = localStorage.getItem('bayiToken');
    if (!token) {
        throw new Error('No auth token');
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const response = await axios({
        url,
        method: options.method || 'GET',
        headers,
        data: options.data
    });
    
    return response;
}

// Logout function
async function logout() {
    try {
        const token = localStorage.getItem('bayiToken');
        if (token) {
            await makeAuthRequest('/api/bayi/logout', { method: 'POST' });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('bayiToken');
    localStorage.removeItem('bayiInfo');
    window.location.href = '/bayi/login';
}

// Utility functions
function showError(message) {
    // Simple error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
    errorDiv.innerHTML = `
        <span class=\"block sm:inline\">${message}</span>
        <span class=\"absolute top-0 bottom-0 right-0 px-4 py-3\" onclick=\"this.parentElement.remove()\">
            <i class=\"fas fa-times cursor-pointer\"></i>
        </span>
    `;
    document.body.appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function showSuccess(message) {
    // Simple success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
    successDiv.innerHTML = `
        <span class=\"block sm:inline\">${message}</span>
        <span class=\"absolute top-0 bottom-0 right-0 px-4 py-3\" onclick=\"this.parentElement.remove()\">
            <i class=\"fas fa-times cursor-pointer\"></i>
        </span>
    `;
    document.body.appendChild(successDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Export functions for global access
window.showBayiSection = showBayiSection;
window.purchaseJob = purchaseJob;
window.viewJobDetails = viewJobDetails;
window.updateJobStatus = updateJobStatus;
window.openCreditModal = openCreditModal;
window.requestTransfer = requestTransfer;
window.logout = logout;