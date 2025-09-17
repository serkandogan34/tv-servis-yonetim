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
    const job = currentJobs.find(j => j.id == jobId);
    if (!job) {
        showError('İş bulunamadı');
        return;
    }
    
    const confirmMessage = `Bu işi ${job.is_fiyati} ₺ kredi ile satın almak istediğinizden emin misiniz?\n\nİş: ${job.talep_kodu}\nServis: ${job.servis_turu}\nMüşteri: ${job.musteri_adi}`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        console.log('İş satın alınıyor...', jobId);
        
        const response = await makeAuthRequest(`/api/bayi/buy-job/${jobId}`, {
            method: 'POST'
        });
        
        if (response.data.success) {
            showSuccess(response.data.message);
            
            // Bakiye güncelle
            if (bayiInfo) {
                bayiInfo.kredi_bakiye = response.data.yeni_bakiye;
                localStorage.setItem('bayiInfo', JSON.stringify(bayiInfo));
                updateBayiInfo();
            }
            
            // İş listesini yenile
            await loadBayiJobs();
            await loadBayiMyJobs();
            await loadBayiDashboard();
            
            // Başarılı satın alma detayları göster
            const jobDetails = response.data.job;
            setTimeout(() => {
                alert(`✅ İş Başarıyla Satın Alındı!\n\n` +
                      `İş Kodu: ${jobDetails.talep_kodu}\n` +
                      `Müşteri: ${jobDetails.musteri_bilgileri.ad_soyad}\n` +
                      `Telefon: ${jobDetails.musteri_bilgileri.telefon}\n` +
                      `Adres: ${jobDetails.musteri_bilgileri.adres}\n\n` +
                      `Ödenen Tutar: ${jobDetails.satin_alma_fiyati} ₺\n` +
                      `Yeni Bakiye: ${response.data.yeni_bakiye} ₺\n\n` +
                      `Artık müşteri ile iletişime geçebilirsiniz!`);
            }, 1000);
        }
    } catch (error) {
        console.error('Purchase job error:', error);
        const errorMessage = error.response?.data?.error || 'İş satın alınamadı';
        showError(errorMessage);
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
    // Create modal HTML
    const modalHTML = `
        <div id="creditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">
                        <i class="fas fa-credit-card mr-2"></i> Kredi Yükle
                    </h3>
                    <button onclick="closeCreditModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">Mevcut Bakiye:</p>
                    <p class="text-2xl font-bold text-green-600">${(krediBilgileri.kredi_bakiye || 0)} ₺</p>
                </div>
                
                <form id="creditForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Yüklenecek Tutar (TL)
                        </label>
                        <div class="flex space-x-2 mb-3">
                            <button type="button" onclick="setCreditAmount(100)" class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 px-3 rounded text-sm">
                                100 ₺
                            </button>
                            <button type="button" onclick="setCreditAmount(250)" class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 px-3 rounded text-sm">
                                250 ₺
                            </button>
                            <button type="button" onclick="setCreditAmount(500)" class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 px-3 rounded text-sm">
                                500 ₺
                            </button>
                            <button type="button" onclick="setCreditAmount(1000)" class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 px-3 rounded text-sm">
                                1000 ₺
                            </button>
                        </div>
                        <input 
                            type="number" 
                            id="creditAmount" 
                            name="amount" 
                            min="100" 
                            max="10000" 
                            step="10"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Tutar girin (min: 100 ₺)"
                        />
                        <p class="text-xs text-gray-500 mt-1">Minimum: 100 ₺ - Maksimum: 10.000 ₺</p>
                    </div>
                    
                    <div class="bg-blue-50 p-3 rounded">
                        <div class="flex items-start space-x-2">
                            <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
                            <div class="text-sm text-blue-700">
                                <p class="font-medium">PayTR Güvenli Ödeme</p>
                                <p>Kredi kartınız ile güvenli ödeme yapabilirsiniz. Ödeme sonrası bakiyeniz otomatik güncellenecektir.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button type="button" onclick="closeCreditModal()" class="flex-1 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded">
                            İptal
                        </button>
                        <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded" id="payBtn">
                            <i class="fas fa-credit-card mr-1"></i> Ödeme Yap
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submit handler
    document.getElementById('creditForm').addEventListener('submit', handleCreditPayment);
}

// Close credit modal
function closeCreditModal() {
    const modal = document.getElementById('creditModal');
    if (modal) {
        modal.remove();
    }
}

// Set credit amount
function setCreditAmount(amount) {
    document.getElementById('creditAmount').value = amount;
}

// Handle credit payment
async function handleCreditPayment(e) {
    e.preventDefault();
    
    const amount = parseInt(document.getElementById('creditAmount').value);
    const payBtn = document.getElementById('payBtn');
    
    if (!amount || amount < 100) {
        alert('Lütfen geçerli bir tutar girin (minimum 100 ₺)');
        return;
    }
    
    if (amount > 10000) {
        alert('Maksimum kredi yükleme tutarı 10.000 ₺');
        return;
    }
    
    try {
        // Loading state
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Ödeme Hazırlanıyor...';
        payBtn.disabled = true;
        
        console.log('PayTR ödeme başlatılıyor...', amount);
        
        const response = await makeAuthRequest('/api/payment/paytr/init', {
            method: 'POST',
            data: { amount: amount }
        });
        
        if (response.data.success) {
            // Close modal
            closeCreditModal();
            
            // Show payment info
            showSuccess(`${amount} ₺ kredi yükleme işlemi başlatıldı. PayTR ödeme sayfasına yönlendiriliyorsunuz...`);
            
            // Test mode - Show payment details
            if (response.data.paytr_request) {
                console.log('PayTR Test Request:', response.data.paytr_request);
                
                // Test için ödeme simülasyonu
                const confirmPayment = confirm(
                    `TEST MODE: PayTR Ödeme Simülasyonu\\n\\n` +
                    `Tutar: ${amount} ₺\\n` +
                    `Merchant OID: ${response.data.merchant_oid}\\n\\n` +
                    `Bu test ödemesini başarılı olarak işaretlemek istiyor musunuz?`
                );
                
                if (confirmPayment) {
                    // Test callback simülasyonu
                    await simulatePayTRCallback(response.data.merchant_oid, amount);
                } else {
                    showError('Test ödemesi iptal edildi');
                }
            } else {
                // Production mode - Redirect to PayTR
                window.open(response.data.payment_url, '_blank', 'width=800,height=600');
                
                // Refresh data after payment (user will manually refresh)
                setTimeout(() => {
                    loadBayiDashboard();
                    loadBayiCredits();
                }, 5000);
            }
        }
    } catch (error) {
        console.error('Credit payment error:', error);
        const errorMessage = error.response?.data?.error || 'Ödeme işlemi başlatılamadı';
        showError(errorMessage);
    } finally {
        // Reset button
        if (payBtn) {
            payBtn.innerHTML = '<i class="fas fa-credit-card mr-1"></i> Ödeme Yap';
            payBtn.disabled = false;
        }
    }
}

// Test için PayTR callback simülasyonu
async function simulatePayTRCallback(merchantOid, amount) {
    try {
        console.log('Test PayTR callback simülasyonu başlatılıyor...');
        
        // Simulated callback data
        const callbackData = new FormData();
        callbackData.append('merchant_oid', merchantOid);
        callbackData.append('status', 'success');
        callbackData.append('total_amount', (amount * 100).toString()); // Kuruş cinsinden
        callbackData.append('hash', 'test_hash_simulation'); // Test hash
        
        // Call callback endpoint
        const response = await fetch('/api/payment/paytr/callback', {
            method: 'POST',
            body: callbackData
        });
        
        if (response.ok) {
            showSuccess(`Test ödemesi başarılı! ${amount} ₺ kredi yüklendi.`);
            
            // Refresh data
            await loadBayiDashboard();
            await loadBayiCredits();
            await loadBayiProfile();
        } else {
            showError('Test callback başarısız');
        }
    } catch (error) {
        console.error('Test callback error:', error);
        showError('Test callback hatası');
    }
}

// Request transfer
function requestTransfer() {
    // Get bank account info first
    showBankAccountInfo();
}

// Show bank account info and transfer form
function showBankAccountInfo() {
    const modalHTML = `
        <div id="transferModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">
                        <i class="fas fa-university mr-2"></i> Havale ile Kredi Yükleme
                    </h3>
                    <button onclick="closeTransferModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <!-- Bank Account Info -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 class="font-semibold text-blue-800 mb-3">
                        <i class="fas fa-info-circle mr-1"></i> Havale Bilgileri
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Hesap Sahibi:</span>
                            <span class="font-medium">TV Servis Yönetim A.Ş.</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">IBAN:</span>
                            <span class="font-mono font-medium">TR123456789012345678901234</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Hesap No:</span>
                            <span class="font-mono font-medium">1234567890</span>
                        </div>
                    </div>
                    
                    <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <p class="font-medium text-yellow-800 mb-1">
                            <i class="fas fa-exclamation-triangle mr-1"></i> Önemli Not:
                        </p>
                        <p class="text-yellow-700">
                            Havale açıklamasına mutlaka "<strong>${bayiInfo?.bayi_kodu || bayiInfo?.id}</strong>" bayi kodunuzu yazın.
                        </p>
                    </div>
                </div>
                
                <!-- Transfer Notification Form -->
                <div class="border-t pt-4">
                    <h4 class="font-semibold mb-3">Havale Bildirimi</h4>
                    <p class="text-sm text-gray-600 mb-4">
                        Havaleyi yaptıktan sonra aşağıdaki formu doldurarak bize bildirin. 
                        Admin onayından sonra kredi bakiyeniz güncellenecektir.
                    </p>
                    
                    <form id="transferForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Havale Tutarı (TL) <span class="text-red-500">*</span>
                            </label>
                            <input 
                                type="number" 
                                id="transferAmount" 
                                name="amount" 
                                min="100" 
                                step="1"
                                required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Örnek: 500"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Havale Tarihi <span class="text-red-500">*</span>
                            </label>
                            <input 
                                type="date" 
                                id="transferDate" 
                                name="transfer_date" 
                                required
                                max="${new Date().toISOString().split('T')[0]}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Referans Numarası / İşlem No <span class="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="transferReference" 
                                name="reference" 
                                required
                                maxlength="50"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Bankadan aldığınız referans/işlem numarası"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Açıklama (İsteğe bağlı)
                            </label>
                            <textarea 
                                id="transferDescription" 
                                name="description" 
                                rows="3"
                                maxlength="200"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ek bilgiler (varsa)"
                            ></textarea>
                        </div>
                        
                        <div class="flex space-x-3">
                            <button type="button" onclick="closeTransferModal()" class="flex-1 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded">
                                İptal
                            </button>
                            <button type="submit" class="flex-1 bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded" id="transferBtn">
                                <i class="fas fa-paper-plane mr-1"></i> Bildirimi Gönder
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set today as default date
    document.getElementById('transferDate').value = new Date().toISOString().split('T')[0];
    
    // Add form submit handler
    document.getElementById('transferForm').addEventListener('submit', handleTransferNotification);
}

// Close transfer modal
function closeTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) {
        modal.remove();
    }
}

// Handle transfer notification
async function handleTransferNotification(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const transferDate = document.getElementById('transferDate').value;
    const reference = document.getElementById('transferReference').value.trim();
    const description = document.getElementById('transferDescription').value.trim();
    const transferBtn = document.getElementById('transferBtn');
    
    // Validations
    if (!amount || amount < 100) {
        alert('Minimum havale tutarı 100 TL olmalıdır');
        return;
    }
    
    if (!transferDate) {
        alert('Havale tarihini seçin');
        return;
    }
    
    if (!reference) {
        alert('Referans numarasını girin');
        return;
    }
    
    try {
        // Loading state
        transferBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Bildiriliyor...';
        transferBtn.disabled = true;
        
        console.log('Havale bildirimi gönderiliyor...', { amount, reference });
        
        const response = await makeAuthRequest('/api/payment/transfer/notify', {
            method: 'POST',
            data: {
                amount: amount,
                reference: reference,
                description: description,
                transfer_date: transferDate
            }
        });
        
        if (response.data.success) {
            closeTransferModal();
            
            showSuccess(response.data.message);
            
            // Show notification details
            setTimeout(() => {
                alert(`✅ Havale Bildirimi Alındı!\\n\\n` +
                      `Referans: ${response.data.reference}\\n` +
                      `Tutar: ${response.data.amount} ₺\\n` +
                      `Durum: ${response.data.status}\\n\\n` +
                      `Admin onayından sonra kredi bakiyeniz güncellenecektir.`);
            }, 1000);
            
            // Refresh data
            await loadBayiCredits();
        }
    } catch (error) {
        console.error('Transfer notification error:', error);
        const errorMessage = error.response?.data?.error || 'Havale bildirimi gönderilemedi';
        showError(errorMessage);
    } finally {
        // Reset button
        if (transferBtn) {
            transferBtn.innerHTML = '<i class="fas fa-paper-plane mr-1"></i> Bildirimi Gönder';
            transferBtn.disabled = false;
        }
    }
}

// Check transfer status
async function checkTransferStatus(reference) {
    try {
        const response = await makeAuthRequest(`/api/payment/transfer/status/${reference}`);
        
        const transfer = response.data;
        alert(`Havale Durumu\\n\\n` +
              `Referans: ${transfer.reference}\\n` +
              `Tutar: ${transfer.amount} ₺\\n` +
              `Durum: ${transfer.status_text}\\n` +
              `Tarih: ${new Date(transfer.created_at).toLocaleString('tr-TR')}`);
              
    } catch (error) {
        console.error('Transfer status error:', error);
        const errorMessage = error.response?.data?.error || 'Havale durumu sorgulanamadı';
        showError(errorMessage);
    }
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
window.closeCreditModal = closeCreditModal;
window.setCreditAmount = setCreditAmount;
window.requestTransfer = requestTransfer;
window.closeTransferModal = closeTransferModal;
window.checkTransferStatus = checkTransferStatus;
window.logout = logout;