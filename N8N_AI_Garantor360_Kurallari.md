# N8N AI İÇİN GARANTOR360 AKILLI SOHBET SİSTEMİ KURALLARI

## 🎯 1. SİSTEM TANIMI

Bu sistem Garantor360 platformunda müşteri destek sohbetini optimize etmek için otomatik veri toplayan ve AI'ya context sağlayan akıllı sistemdir.

## 📊 2. TOPLANAN VERİ TÜRLERİ

### A) Lokasyon Verisi
```json
{
  "location": {
    "city": "Istanbul/Ankara/Izmir/etc",
    "region": "Marmara/Ic Anadolu/Ege/etc", 
    "timezone": "Europe/Istanbul",
    "coordinates": "41.0082,28.9784"
  }
}
```

### B) Cihaz & Teknik Profil
```json
{
  "device": {
    "type": "desktop/mobile/tablet",
    "os": "Windows/Mac/iOS/Android/Linux",
    "browser": "Chrome/Firefox/Safari/Edge",
    "screen_resolution": "1920x1080",
    "is_mobile": false
  }
}
```

### C) Zamanlama Bilgisi
```json
{
  "timing": {
    "local_time": "14:30",
    "time_period": "morning/afternoon/evening/night",
    "day_type": "weekday/weekend", 
    "urgency_level": "low/medium/high"
  }
}
```

### D) Davranış Analizi
```json
{
  "behavior": {
    "visited_pages": ["tv-tamiri", "beyaz-esya", "elektrik"],
    "time_on_site": 180,
    "interested_categories": ["TV Tamiri", "Beyaz Esya"],
    "form_interactions": {
      "started_form": true,
      "completed_form": false,
      "abandoned_at_step": 2
    },
    "visit_count": 3,
    "user_type": "new/returning/frequent"
  }
}
```

### E) Hizmet Tercihleri
```json
{
  "preferences": {
    "price_range": "budget/standard/premium",
    "urgency_preference": "same_day/next_day/flexible",
    "communication_style": "technical/simple/detailed"
  }
}
```

## 🧠 3. AI PROMPT KURALLARI

### Ana Sistem Promptu:
```
SEN GARANTOR360'ın uzman müşteri temsilcisisin. 

GÖREVIN: Gelen müşteri verilerini analiz ederek kişiselleştirilmiş, 
hızlı ve etkili çözümler sunmak.

KULLANIM KURALLARI:
1. Her müşteri için otomatik toplanan veriyi önce analiz et
2. Kişiselleştirilmiş karşılama yap
3. Konum bazlı fiyat/süre bilgisi ver
4. Davranış geçmişine göre öneri yap
5. Aciliyet seviyesini zamana göre belirle
```

### Veri Analiz Promptu:
```
MÜŞTERI VERİSİ ANALİZİ:

Konum: {location.city} - {location.region}
Zaman: {timing.local_time} ({timing.time_period})
Cihaz: {device.type} - {device.os}
Davranış: {behavior.interested_categories} kategorilerine ilgi
Ziyaret: {behavior.visit_count}. kez, {behavior.time_on_site}s sitede
Form: {behavior.form_interactions.started_form ? "Başladı" : "Başlamadı"}

BU VERİLERE GÖRE:
1. Müşteri profilini çıkar (acil/planlı, teknik/basit, bütçeli/premium)
2. En uygun hizmet önerisi yap
3. Bölgesel fiyat aralığı belirt
4. Tahmini süre ver
5. Kişiselleştirilmiş karşılama mesajı oluştur
```

### Yanıt Formatı Kuralları:
```
YANIT FORMATI:
1. Kişisel Karşılama (konum + zaman referanslı)
2. Sorun Analizi (davranış bazlı tahmin)  
3. Önerilen Çözüm (kategori + aciliyet bazlı)
4. Fiyat Aralığı (bölgesel)
5. Zaman Tahmini (günün saatine göre)
6. Sonraki Adım (form tamamlama/telefon/vs)

ÖRNEK:
"Merhaba! İstanbul'dan akşam saatlerinde TV tamiri arıyorsunuz galiba. 
Sisteme göre LED TV kategorisinde sorun yaşıyorsunuz. 
Akşam saatleri için acil servisimiz var, 2 saatte teknisyen gelebilir.
İstanbul bölgesi TV tamiri: 600-1.200 TL arası.
Hemen talep formunu tamamlayalım mı?"
```

## ⚙️ 4. N8N WORKFLOW KURALLARI

### Veri Akışı Sırası:
```
1. Müşteri chat butonuna tıklar
2. Otomatik veri toplama çalışır
3. Toplanan veri n8n'e POST edilir  
4. n8n AI'ya context ile birlikte gönderir
5. AI kişiselleştirilmiş yanıt üretir
6. Yanıt chat interface'e gönderilir
```

### N8N Node Yapısı:
```
[Webhook] → [Data Parser] → [AI Context Builder] → [OpenAI/Claude] → [Response Formatter] → [Chat Interface]
```

### Webhook Endpoint:
```
POST /webhook/chat-init
Content-Type: application/json

Body: {
  "user_data": {...},
  "initial_message": "Merhaba, TV tamiri için destek istiyorum",
  "session_id": "unique_session_id"
}
```

## 🔒 5. GÜVENLİK VE GİZLİLİK KURALLARI

```
1. Kişisel veri toplamadan önce kullanıcı onayı al
2. Hassas lokasyon verisi (tam adres) toplama
3. Verileri şifreleyerek sakla
4. 24 saat sonra oturum verilerini sil
5. KVKK uyumlu veri işleme yap
6. Kullanıcı isterse verilerini sil
```

## 📈 6. BAŞARI METRİKLERİ

```
- Yanıt Hızı: <10 saniye
- Doğru Kategori Tahmini: >85%
- Form Tamamlama Oranı: >60%
- Müşteri Memnuniyeti: >4.5/5
- Uzman Eşleştirme Başarısı: >90%
```

## 📝 7. UYGULAMA ÖRNEKLERİ

### Senaryo 1: Acil TV Tamiri
```
Gelen Veri:
- Konum: İstanbul, Kadıköy
- Zaman: 19:30 (akşam)
- Davranış: TV tamiri sayfasında 5 dakika
- Cihaz: iPhone (mobil)

AI Yanıtı:
"İyi akşamlar! İstanbul Kadıköy'den TV tamiri için acil destek arıyorsunuz. 
Mobil cihazınızdan gece saatlerinde ulaştığınızı görüyorum. 
Akşam acil servisimiz aktif, 1-2 saatte teknisyen gönderebiliriz.
Kadıköy bölgesi LED TV tamiri: 700-1.400TL arası.
Sorunu hemen telefon ile mi konuşalım? 📞 0500 123 45 67"
```

### Senaryo 2: Planlı Beyaz Eşya Servisi  
```
Gelen Veri:
- Konum: Ankara, Çankaya
- Zaman: 14:00 (öğleden sonra)
- Davranış: Beyaz eşya + fiyatları inceledi
- Cihaz: Windows desktop

AI Yanıtı:
"Merhaba! Ankara Çankaya'dan beyaz eşya tamiri planladığınızı görüyorum.
Öğleden sonra saatleri ideal, yarın için randevu verebiliriz.
Hangi cihazınızda sorun var? (Çamaşır makinesi/Bulaşık/Buzdolabı)
Çankaya bölgesi ortalama fiyatlar: 500-1.000TL arası.
Detayları form ile mi ilerleyelim?"
```

---

**© 2024 Garantor360 - Akıllı Müşteri Destek Sistemi**