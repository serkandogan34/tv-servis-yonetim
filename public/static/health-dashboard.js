// Health Dashboard - Real-time System Monitoring
class HealthDashboard {
    constructor() {
        this.refreshInterval = 5000; // 5 saniye
        this.chartData = {
            responseTime: [],
            errorRate: [],
            requestCount: [],
            timestamps: []
        };
        this.maxDataPoints = 20; // Son 20 veri noktası
        
        this.init();
    }

    init() {
        this.createDashboard();
        this.startMonitoring();
    }

    createDashboard() {
        const dashboardHTML = `
            <div class="health-dashboard bg-gray-900 text-white min-h-screen p-6">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-4xl font-bold text-center mb-4">
                        🖥️ TV Servis Sistem Dashboard
                    </h1>
                    <div class="text-center">
                        <span class="status-indicator px-4 py-2 rounded-full text-lg font-semibold" id="system-status">
                            🔄 Kontrol ediliyor...
                        </span>
                    </div>
                </div>

                <!-- Ana Metrikler -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <!-- System Status -->
                    <div class="metric-card bg-gray-800 p-6 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Sistem Durumu</p>
                                <p class="text-2xl font-bold" id="status-text">-</p>
                            </div>
                            <div class="text-4xl" id="status-icon">⚪</div>
                        </div>
                    </div>

                    <!-- Response Time -->
                    <div class="metric-card bg-gray-800 p-6 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Yanıt Süresi</p>
                                <p class="text-2xl font-bold text-blue-400" id="response-time">-</p>
                            </div>
                            <div class="text-4xl">⚡</div>
                        </div>
                    </div>

                    <!-- Error Rate -->
                    <div class="metric-card bg-gray-800 p-6 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Hata Oranı</p>
                                <p class="text-2xl font-bold text-red-400" id="error-rate">-</p>
                            </div>
                            <div class="text-4xl">📊</div>
                        </div>
                    </div>

                    <!-- Database Status -->
                    <div class="metric-card bg-gray-800 p-6 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Veritabanı</p>
                                <p class="text-2xl font-bold text-green-400" id="db-status">-</p>
                            </div>
                            <div class="text-4xl" id="db-icon">💾</div>
                        </div>
                    </div>
                </div>

                <!-- Performance Charts -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-gray-800 p-6 rounded-lg">
                        <h3 class="text-xl font-semibold mb-4">📈 Yanıt Süresi Trendi</h3>
                        <canvas id="response-chart" width="400" height="200"></canvas>
                    </div>
                    
                    <div class="bg-gray-800 p-6 rounded-lg">
                        <h3 class="text-xl font-semibold mb-4">📊 İstek & Hata Sayısı</h3>
                        <canvas id="requests-chart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- Detailed Info -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <!-- System Info -->
                    <div class="bg-gray-800 p-6 rounded-lg">
                        <h3 class="text-xl font-semibold mb-4">🔧 Sistem Bilgileri</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Versiyon:</span>
                                <span id="version">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Çalışma Süresi:</span>
                                <span id="uptime">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Son Güncelleme:</span>
                                <span id="last-update">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- Performance Summary -->
                    <div class="bg-gray-800 p-6 rounded-lg">
                        <h3 class="text-xl font-semibold mb-4">⚡ Performans Özeti</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Ortalama Yanıt:</span>
                                <span id="avg-response">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Toplam İstek:</span>
                                <span id="total-requests">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Başarı Oranı:</span>
                                <span id="success-rate">-</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- System Alerts -->
                <div class="bg-gray-800 p-6 rounded-lg mb-8">
                    <h3 class="text-xl font-semibold mb-4">🚨 Sistem Uyarıları</h3>
                    <div id="alerts-container" class="space-y-2">
                        <div class="text-gray-400 text-center py-4">Uyarı bulunmuyor</div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="bg-gray-800 p-6 rounded-lg text-center">
                    <button onclick="healthDashboard.refreshNow()" 
                            class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg mr-4">
                        🔄 Şimdi Yenile
                    </button>
                    <button onclick="healthDashboard.toggleAutoRefresh()" 
                            class="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg mr-4" 
                            id="toggle-btn">
                        ⏸️ Otomatik Yenilemeyi Durdur
                    </button>
                    <span class="text-gray-400">
                        Sonraki güncelleme: <span id="next-update">-</span>
                    </span>
                </div>
            </div>
        `;

        document.body.innerHTML = dashboardHTML;
        this.initCharts();
    }

    initCharts() {
        // Response Time Chart
        const responseCtx = document.getElementById('response-chart').getContext('2d');
        this.responseChart = new Chart(responseCtx, {
            type: 'line',
            data: {
                labels: this.chartData.timestamps,
                datasets: [{
                    label: 'Yanıt Süresi (ms)',
                    data: this.chartData.responseTime,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#D1D5DB' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: '#374151' }
                    },
                    y: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: '#374151' }
                    }
                }
            }
        });

        // Requests Chart
        const requestsCtx = document.getElementById('requests-chart').getContext('2d');
        this.requestsChart = new Chart(requestsCtx, {
            type: 'bar',
            data: {
                labels: this.chartData.timestamps,
                datasets: [
                    {
                        label: 'İstekler',
                        data: this.chartData.requestCount,
                        backgroundColor: '#10B981'
                    },
                    {
                        label: 'Hatalar',
                        data: this.chartData.errorRate,
                        backgroundColor: '#EF4444'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#D1D5DB' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: '#374151' }
                    },
                    y: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: '#374151' }
                    }
                }
            }
        });
    }

    async fetchHealthData() {
        try {
            const startTime = Date.now();
            const response = await fetch('/health');
            const responseTime = Date.now() - startTime;
            const data = await response.json();
            
            return { ...data, responseTime };
        } catch (error) {
            console.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                responseTime: -1
            };
        }
    }

    updateDashboard(healthData) {
        // System Status
        const isHealthy = healthData.status === 'healthy';
        const statusEl = document.getElementById('system-status');
        const statusTextEl = document.getElementById('status-text');
        const statusIconEl = document.getElementById('status-icon');
        
        if (isHealthy) {
            statusEl.className = 'status-indicator px-4 py-2 rounded-full text-lg font-semibold bg-green-600';
            statusEl.textContent = '✅ Sistem Sağlıklı';
            statusTextEl.textContent = 'Sağlıklı';
            statusIconEl.textContent = '🟢';
        } else {
            statusEl.className = 'status-indicator px-4 py-2 rounded-full text-lg font-semibold bg-red-600';
            statusEl.textContent = '❌ Sistem Sorunu';
            statusTextEl.textContent = 'Sorunlu';
            statusIconEl.textContent = '🔴';
        }

        // Metrics
        document.getElementById('response-time').textContent = 
            healthData.responseTime >= 0 ? `${healthData.responseTime}ms` : 'Hata';
        
        document.getElementById('error-rate').textContent = 
            healthData.performance?.metrics?.errorRate + '%' || 'N/A';
            
        document.getElementById('db-status').textContent = 
            healthData.database || 'Unknown';
            
        document.getElementById('db-icon').textContent = 
            healthData.database === 'connected' ? '💚' : '💔';

        // System Info
        document.getElementById('version').textContent = healthData.version || 'N/A';
        document.getElementById('uptime').textContent = healthData.uptime || 'N/A';
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString('tr-TR');

        // Performance Summary
        if (healthData.performance?.summary) {
            const summary = healthData.performance.summary;
            document.getElementById('avg-response').textContent = 
                summary.api_duration?.avg ? `${summary.api_duration.avg.toFixed(1)}ms` : 'N/A';
            document.getElementById('total-requests').textContent = 
                healthData.performance.metrics?.requestCount || '0';
            
            const errorRate = parseFloat(healthData.performance.metrics?.errorRate || 0);
            const successRate = 100 - errorRate;
            document.getElementById('success-rate').textContent = `${successRate.toFixed(1)}%`;
        }

        // Update Charts
        this.updateCharts(healthData);

        // Update Alerts
        this.updateAlerts(healthData);
    }

    updateCharts(healthData) {
        const now = new Date().toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        // Add new data points
        this.chartData.timestamps.push(now);
        this.chartData.responseTime.push(healthData.responseTime || 0);
        this.chartData.requestCount.push(healthData.performance?.metrics?.requestCount || 0);
        this.chartData.errorRate.push(parseFloat(healthData.performance?.metrics?.errorRate || 0));

        // Remove old data points
        if (this.chartData.timestamps.length > this.maxDataPoints) {
            this.chartData.timestamps.shift();
            this.chartData.responseTime.shift();
            this.chartData.requestCount.shift();
            this.chartData.errorRate.shift();
        }

        // Update charts
        this.responseChart.update();
        this.requestsChart.update();
    }

    updateAlerts(healthData) {
        const alertsContainer = document.getElementById('alerts-container');
        const alerts = [];

        // Check for issues
        if (healthData.status !== 'healthy') {
            alerts.push({
                type: 'error',
                message: `Sistem durumu: ${healthData.status}`,
                icon: '🚨'
            });
        }

        if (healthData.responseTime > 1000) {
            alerts.push({
                type: 'warning', 
                message: `Yavaş yanıt süresi: ${healthData.responseTime}ms`,
                icon: '⚠️'
            });
        }

        if (parseFloat(healthData.performance?.metrics?.errorRate || 0) > 5) {
            alerts.push({
                type: 'warning',
                message: `Yüksek hata oranı: ${healthData.performance.metrics.errorRate}%`,
                icon: '⚠️'
            });
        }

        if (healthData.database !== 'connected') {
            alerts.push({
                type: 'error',
                message: 'Veritabanı bağlantı sorunu',
                icon: '💔'
            });
        }

        // Render alerts
        if (alerts.length === 0) {
            alertsContainer.innerHTML = '<div class="text-green-400 text-center py-4">✅ Tüm sistemler normal çalışıyor</div>';
        } else {
            alertsContainer.innerHTML = alerts.map(alert => `
                <div class="alert-item p-3 rounded ${alert.type === 'error' ? 'bg-red-900 border-red-600' : 'bg-yellow-900 border-yellow-600'} border-l-4">
                    <span class="text-2xl mr-3">${alert.icon}</span>
                    <span>${alert.message}</span>
                </div>
            `).join('');
        }
    }

    async refreshNow() {
        const healthData = await this.fetchHealthData();
        this.updateDashboard(healthData);
    }

    startMonitoring() {
        this.refreshNow(); // İlk yükleme
        
        this.intervalId = setInterval(async () => {
            await this.refreshNow();
            this.updateCountdown();
        }, this.refreshInterval);

        this.updateCountdown();
    }

    updateCountdown() {
        let seconds = this.refreshInterval / 1000;
        const countdownEl = document.getElementById('next-update');
        
        const countdownTimer = setInterval(() => {
            countdownEl.textContent = `${seconds}s`;
            seconds--;
            
            if (seconds < 0) {
                clearInterval(countdownTimer);
            }
        }, 1000);
    }

    toggleAutoRefresh() {
        const btn = document.getElementById('toggle-btn');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            btn.innerHTML = '▶️ Otomatik Yenilemeyi Başlat';
            btn.className = 'bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg mr-4';
        } else {
            this.startMonitoring();
            btn.innerHTML = '⏸️ Otomatik Yenilemeyi Durdur';
            btn.className = 'bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg mr-4';
        }
    }
}

// Dashboard başlatma
let healthDashboard;
document.addEventListener('DOMContentLoaded', () => {
    healthDashboard = new HealthDashboard();
});