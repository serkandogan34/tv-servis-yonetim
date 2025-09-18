# SSL Kurulumu Rehberi - anindais.com

## Mevcut Durum
- TV Servis Sistemi: http://207.180.204.60:3000 (PM2 ile çalışıyor)
- N8N Pro: Caddy container ports 80/443 kullanıyor
- Domain: anindais.com

## Çözüm: Mevcut Caddy'ye Domain Ekleme

### 1. Caddy Konfigürasyonunu Güncelle

Sunucunuzda `/root/n8n-pro/Caddyfile` dosyasını düzenleyin:

```bash
# Mevcut dosyayı yedekle
sudo cp /root/n8n-pro/Caddyfile /root/n8n-pro/Caddyfile.backup

# Dosyayı düzenle
sudo nano /root/n8n-pro/Caddyfile
```

### 2. Yeni Caddyfile İçeriği

```caddy
# N8N Pro domain
n8n-pro.beyazyakaai.com {
    reverse_proxy n8n:5678
}

# Redis monitor domain  
redis.n8n-pro.beyazyakaai.com {
    reverse_proxy redis-monitor:8081
}

# TV Servis Sistemi - anindais.com
anindais.com {
    reverse_proxy localhost:3000
}

# www subdomain yönlendirmesi (opsiyonel)
www.anindais.com {
    redir https://anindais.com{uri} permanent
}
```

### 3. Domain DNS Ayarları

anindais.com domain'iniz için DNS A kayıtlarını sunucu IP'nize yönlendirin:
```
A    anindais.com     207.180.204.60
A    www.anindais.com 207.180.204.60
```

### 4. Caddy Container'ı Yeniden Başlat

```bash
# N8N Pro docker-compose dizinine git
cd /root/n8n-pro

# Sadece Caddy container'ını yeniden başlat
sudo docker-compose restart caddy

# Veya tüm servisleri yeniden başlat
sudo docker-compose down && sudo docker-compose up -d
```

### 5. SSL Sertifika Durumunu Kontrol Et

```bash
# Caddy loglarını kontrol et
sudo docker-compose logs caddy

# SSL sertifikası kontrol et
curl -I https://anindais.com

# Tarayıcıda test et
# https://anindais.com
```

### 6. Alternatif Çözüm: Docker Compose Güncellemesi

Eğer Caddyfile edit etmek yerine docker-compose.yml'i güncellemek istiyorsanız:

```yaml
version: '3.8'
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - n8n-network
    # Host network access for localhost:3000
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  caddy_data:
  caddy_config:

networks:
  n8n-network:
    external: true
```

Ve Caddyfile'da:
```caddy
anindais.com {
    reverse_proxy host.docker.internal:3000
}
```

### 7. Troubleshooting

**Problem**: SSL sertifikası alınamıyor
**Çözüm**: 
- DNS propagation kontrol edin (24 saat bekleyin)
- Domain'in doğru IP'ye point ettiğini doğrulayın
- Caddy logs kontrol edin: `sudo docker-compose logs caddy`

**Problem**: 502 Bad Gateway
**Çözüm**:
- TV servis PM2 status kontrol edin: `pm2 status`
- Port 3000 çalışıyor mu kontrol edin: `netstat -tlnp | grep 3000`

**Problem**: Container başlatma hatası
**Çözüm**:
- Docker status kontrol edin: `sudo systemctl status docker`
- Port conflicts kontrol edin: `sudo netstat -tlnp | grep :80`

### 8. Başarı Kontrol Listesi

- [ ] DNS A record ayarlandı
- [ ] Caddyfile güncellendi
- [ ] Caddy container restart edildi
- [ ] SSL sertifikası alındı
- [ ] https://anindais.com erişilebilir
- [ ] TV servis sistemi HTTPS üzerinden çalışıyor

## Sonuç

Bu yöntemle:
✅ Mevcut N8N Pro kurulumunuz etkilenmez
✅ anindais.com otomatik SSL sertifikası alır
✅ TV servis sisteminiz HTTPS üzerinden erişilebilir olur
✅ Let's Encrypt sertifikaları otomatik yenilenir

Kurulum tamamlandığında sisteminiz https://anindais.com adresinden erişilebilir olacak.