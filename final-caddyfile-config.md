# Final Caddyfile Konfigürasyonu - anındais.com

## 🎯 Doğru Domain Formatları
- **Türkçe**: `anındais.com` (tarayıcıda görünen)
- **Punycode**: `xn--anndais-sfb.com` (DNS'de kullanılan)

## 📝 Güncellenmiş Caddyfile

### Contabo sunucunuzda şu komutu çalıştırın:

```bash
# Backup alın
cd /root/n8n-pro
sudo cp Caddyfile Caddyfile.backup

# Yeni Caddyfile oluşturun
sudo tee Caddyfile << 'EOF'
# N8N Pro domains
n8n-pro.beyazyakaai.com {
    reverse_proxy n8n:5678
}

redis.n8n-pro.beyazyakaai.com {
    reverse_proxy redis-monitor:8081
}

# TV Servis - Türkçe domain (Unicode format)
anındais.com {
    reverse_proxy localhost:3000
}

# TV Servis - Punycode format (DNS uyumluluğu için)
xn--anndais-sfb.com {
    reverse_proxy localhost:3000
}

# www subdomains
www.anındais.com {
    redir https://anındais.com{uri} permanent
}

www.xn--anndais-sfb.com {
    redir https://anındais.com{uri} permanent
}
EOF
```

## 🔄 Container Restart

```bash
# Caddy container'ı restart edin
cd /root/n8n-pro
sudo docker-compose restart caddy

# Logs kontrol edin
sudo docker-compose logs caddy | tail -20
```

## 🌐 Cloudflare DNS Kontrolü

Cloudflare Dashboard'da kontrol edin:

### Mevcut DNS Records:
```
Type: A
Name: @ (veya anındais.com)  
Content: 207.180.204.60
Proxy: ☁️ Gray Cloud (DNS Only)

Type: A  
Name: www
Content: 207.180.204.60
Proxy: ☁️ Gray Cloud (DNS Only)
```

**NOT**: Cloudflare genellikle Türkçe domain'leri otomatik olarak Punycode'a çevirir, bu normal!

## 🧪 Test Komutları

### 1. DNS Test
```bash
# Türkçe format
nslookup anındais.com

# Punycode format  
nslookup xn--anndais-sfb.com

# İkisi de 207.180.204.60 göstermeli
```

### 2. HTTP Test
```bash
# HTTP erişim
curl -I http://anındais.com
curl -I http://xn--anndais-sfb.com

# Her ikisi de TV servis sayfasını döndürmeli
```

### 3. SSL Test (birkaç dakika sonra)
```bash
# HTTPS erişim
curl -I https://anındais.com
curl -I https://xn--anndais-sfb.com

# SSL sertifikaları otomatik alınacak
```

## 📋 Başarı Kontrolü

### ✅ DNS çalışıyor:
```bash
$ nslookup anındais.com
Name: anındais.com
Address: 207.180.204.60
```

### ✅ HTTP çalışıyor:
```bash
$ curl -I http://anındais.com  
HTTP/1.1 200 OK
```

### ✅ SSL çalışıyor:
```bash
$ curl -I https://anındais.com
HTTP/2 200
```

### ✅ Tarayıcıda erişim:
- https://anındais.com ✅
- https://www.anındais.com → redirect ✅

## 🎯 Beklenen Sonuç

5-15 dakika sonra:
- **DNS propagation** tamamlanır
- **Let's Encrypt SSL** otomatik alınır  
- **TV Servis Sistemi** HTTPS üzerinden erişilebilir olur

**Son URL**: https://anındais.com 🚀

## 🔧 Troubleshooting

### Problem: DNS hala eski IP gösteriyor
**Çözüm**: 
```bash
# DNS cache temizle
sudo systemctl flush-dns
# 15 dakika daha bekle
```

### Problem: SSL alınamıyor
**Çözüm**:
```bash
# Caddy logs kontrol
sudo docker-compose logs caddy | grep -i ssl
sudo docker-compose logs caddy | grep -i error
```

### Problem: 502 Bad Gateway  
**Çözüm**:
```bash
# TV servis durumu
pm2 status
pm2 logs webapp --nostream

# Port kontrol
netstat -tlnp | grep 3000
```

Bu konfigürasyonla hem Unicode hem Punycode formatında erişim sağlanır ve SSL sertifikaları otomatik alınır! 🎯