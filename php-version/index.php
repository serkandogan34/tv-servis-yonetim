<?php
session_start();

// Database configuration
$host = 'localhost';
$dbname = 'tv_servis_db';
$username = 'your_db_username';
$password = 'your_db_password';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    $db_error = "Database connection failed: " . $e->getMessage();
}
?>

<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TV Servis Yönetim Sistemi</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-tv mr-2 text-blue-600"></i>
                    TV Servis Yönetim
                </h1>
                <p class="text-gray-600">Türkiye geneli TV ekran servisi yönetim sistemi</p>
                
                <?php if (isset($db_error)): ?>
                <div class="mt-4 p-4 bg-red-100 border border-red-400 rounded">
                    <p class="text-sm text-red-700">
                        <i class="fas fa-exclamation-triangle mr-1"></i>
                        <?= htmlspecialchars($db_error) ?>
                    </p>
                    <p class="text-xs mt-2">Lütfen veritabanı ayarlarını config.php dosyasında yapılandırın</p>
                </div>
                <?php else: ?>
                <div class="mt-4 p-4 bg-green-100 border border-green-400 rounded">
                    <p class="text-sm text-green-700">
                        <i class="fas fa-check-circle mr-1"></i>
                        Sistem hazır - Database bağlantısı başarılı
                    </p>
                </div>
                <?php endif; ?>
            </div>
            
            <div class="space-y-4">
                <a href="bayi/login.php" class="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                    <i class="fas fa-user-tie mr-2"></i>
                    Bayi Girişi
                </a>
                
                <a href="admin/login.php" class="block w-full bg-red-600 text-white text-center py-3 rounded-lg hover:bg-red-700 transition duration-300">
                    <i class="fas fa-user-shield mr-2"></i>
                    Admin Girişi
                </a>
                
                <a href="dashboard.php" class="block w-full bg-green-600 text-white text-center py-3 rounded-lg hover:bg-green-700 transition duration-300">
                    <i class="fas fa-chart-line mr-2"></i>
                    Sistem Durumu
                </a>
                
                <div class="border-t pt-4 mt-6">
                    <p class="text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-book mr-2"></i>Kullanım Kılavuzları
                    </p>
                    
                    <div class="space-y-2">
                        <a href="docs/TV-Servis-Kullanici-Kilavuzu.pdf" target="_blank" class="block w-full bg-purple-600 text-white text-center py-2 rounded-lg hover:bg-purple-700 transition duration-300 text-sm">
                            <i class="fas fa-file-pdf mr-2"></i>
                            Kullanıcı Kılavuzu (PDF)
                        </a>
                        
                        <a href="docs/TV-Servis-Teknik-Kilavuz.pdf" target="_blank" class="block w-full bg-orange-600 text-white text-center py-2 rounded-lg hover:bg-orange-700 transition duration-300 text-sm">
                            <i class="fas fa-code mr-2"></i>
                            Teknik Kılavuz (PHP Version)
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="mt-8 text-center text-sm text-gray-500">
                <p>Güvenli ve hızlı servis yönetimi</p>
                <p class="mt-2 text-xs">PHP + MySQL Version</p>
            </div>
        </div>
    </div>
</body>
</html>