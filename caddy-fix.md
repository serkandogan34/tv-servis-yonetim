# Caddy Configuration Fix - Admin Endpoint for Punycode Domain

## Problem
- Ana domain çalışıyor: https://anındais.com/admin ✅
- Punycode domain çalışmıyor: https://xn--anndais-sfb.com/admin ❌

## Çözüm: Contabo Sunucuda Caddyfile Güncelle

```bash
# Contabo sunucunuzda:
cd /root/n8n-pro
sudo nano Caddyfile
```

## Güncellenmiş Caddyfile:

```caddy
# N8N Pro domains
n8n-pro.beyazyakaai.com {
    reverse_proxy n8n:5678
}

redis.n8n-pro.beyazyakaai.com {
    reverse_proxy redis-monitor:8081
}

# TV Servis - Ana domain (Unicode format)
anındais.com {
    reverse_proxy 207.180.204.60:3000
}

# TV Servis - Punycode format (MISSING - BURASI EKLENMELİ!)
xn--anndais-sfb.com {
    reverse_proxy 207.180.204.60:3000
}

# www subdomains
www.anındais.com {
    redir https://anındais.com{uri} permanent
}

www.xn--anndais-sfb.com {
    redir https://anındais.com{uri} permanent
}
```

## Caddy Restart:

```bash
cd /root/n8n-pro
sudo docker-compose restart caddy
```

## Test:

```bash
# Her iki domain test
curl -I https://anındais.com/api/admin/test
curl -I https://xn--anndais-sfb.com/api/admin/test
```

Bu düzeltmeyle her iki domain de çalışmalı!