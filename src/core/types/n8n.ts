/**
 * N8N Integration Data Types
 * TV Servis Yönetim Sistemi için N8N webhook veri yapıları
 */

// ============================================================================
// N8N WEBHOOK DATA STRUCTURES
// ============================================================================

export interface N8NWebhookPayload {
  // Webhook metadata
  webhook_id: string;
  workflow_id: string;
  execution_id: string;
  timestamp: string; // ISO 8601
  source: N8NDataSource;
  
  // Event type
  event_type: N8NEventType;
  
  // Main data
  data: N8NJobRequest | N8NCustomerUpdate | N8NSystemNotification;
  
  // Authentication
  api_key?: string;
  signature?: string; // HMAC signature for verification
}

export enum N8NDataSource {
  WEBSITE_FORM = 'website_form',           // Web sitesi iletişim formu
  PHONE_SYSTEM = 'phone_system',           // Telefon sistemi entegrasyonu
  WHATSAPP = 'whatsapp',                   // WhatsApp Business API
  EMAIL = 'email',                         // E-posta işleme
  SOCIAL_MEDIA = 'social_media',          // Sosyal medya (Facebook, Instagram)
  MOBILE_APP = 'mobile_app',              // Mobil uygulama
  THIRD_PARTY_API = 'third_party_api',    // Üçüncü parti API'ler
  MANUAL_ENTRY = 'manual_entry'           // Manual veri girişi
}

export enum N8NEventType {
  JOB_REQUEST_CREATED = 'job_request_created',       // Yeni iş talebi
  CUSTOMER_INQUIRY = 'customer_inquiry',             // Müşteri sorgusu
  URGENT_REQUEST = 'urgent_request',                 // Acil talep
  CALLBACK_REQUEST = 'callback_request',             // Geri arama talebi
  QUOTE_REQUEST = 'quote_request',                   // Fiyat talebi
  CUSTOMER_COMPLAINT = 'customer_complaint',         // Müşteri şikayeti
  FOLLOW_UP_REMINDER = 'follow_up_reminder',         // Takip hatırlatması
  SYSTEM_ALERT = 'system_alert'                      // Sistem uyarısı
}

// ============================================================================
// JOB REQUEST DATA (Ana veri yapısı)
// ============================================================================
export interface N8NJobRequest {
  // Customer Information
  customer: {
    name: string;                    // Müşteri adı soyadı
    phone: string;                   // Telefon numarası (zorunlu)
    email?: string;                  // E-posta (opsiyonel)
    address: {
      full_address: string;          // Tam adres
      city?: string;                 // İl
      district?: string;             // İlçe  
      neighborhood?: string;         // Mahalle
      postal_code?: string;          // Posta kodu
      coordinates?: {                // GPS koordinatları
        latitude: number;
        longitude: number;
      };
    };
    customer_type?: 'individual' | 'corporate'; // Müşteri tipi
    tax_number?: string;             // Vergi numarası (kurumsal için)
    previous_customer?: boolean;     // Daha önce hizmet alımı var mı?
  };

  // Service Request Details
  service: {
    type: string;                    // Servis tipi (TV Tamiri, Klima Servisi, etc.)
    category?: string;               // Kategori (Elektronik, Beyaz Eşya, etc.)
    brand?: string;                  // Marka (Samsung, LG, Sony, etc.)
    model?: string;                  // Model
    serial_number?: string;          // Seri numarası
    purchase_date?: string;          // Satın alma tarihi
    warranty_status?: 'active' | 'expired' | 'unknown'; // Garanti durumu
    
    // Problem Description
    problem_description: string;     // Problem açıklaması (zorunlu)
    problem_category?: string;       // Problem kategorisi (elektrik, mekanik, yazılım)
    urgency_level?: 'low' | 'normal' | 'high' | 'critical'; // Aciliyet seviyesi
    
    // Technical Details
    device_age?: number;             // Cihaz yaşı (yıl)
    previous_repairs?: boolean;      // Daha önce tamir edilmiş mi?
    error_codes?: string[];          // Hata kodları
    symptoms?: string[];             // Belirtiler
  };

  // Scheduling Preferences
  scheduling?: {
    preferred_date?: string;         // Tercih edilen tarih (YYYY-MM-DD)
    preferred_time?: {
      start: string;                 // Başlangıç saati (HH:MM)
      end: string;                   // Bitiş saati (HH:MM)
    };
    flexible_timing?: boolean;       // Esnek saat?
    weekend_available?: boolean;     // Hafta sonu müsait mi?
    emergency_service?: boolean;     // Acil servis gerekli mi?
  };

  // Budget & Pricing
  budget?: {
    estimated_cost?: number;         // Tahmini maliyet
    max_budget?: number;             // Maksimum bütçe
    payment_method_preference?: string; // Tercih edilen ödeme yöntemi
  };

  // Additional Information
  additional_info?: {
    attachments?: N8NAttachment[];   // Fotoğraflar, belgeler
    special_requests?: string;       // Özel istekler
    access_instructions?: string;    // Erişim talimatları
    contact_restrictions?: {         // İletişim kısıtlamaları
      preferred_contact_method: 'phone' | 'email' | 'sms' | 'whatsapp';
      available_hours?: {
        start: string;
        end: string;
      };
      no_call_times?: string[];      // Aranmak istenmeyen saatler
    };
  };

  // Source Metadata
  source_metadata: {
    referrer?: string;               // Nereden geldi? (Google, Facebook, etc.)
    campaign_id?: string;            // Kampanya ID
    utm_parameters?: {               // UTM parametreleri
      source: string;
      medium: string;
      campaign: string;
      term?: string;
      content?: string;
    };
    user_agent?: string;             // Kullanıcı tarayıcısı
    ip_address?: string;             // IP adresi
    session_id?: string;             // Oturum ID
  };
}

// ============================================================================
// ATTACHMENT STRUCTURE
// ============================================================================
export interface N8NAttachment {
  id: string;
  filename: string;
  url: string;                       // Temporary download URL
  content_type: string;              // image/jpeg, application/pdf, etc.
  size: number;                      // Bytes
  description?: string;              // Açıklama
  category?: 'problem_photo' | 'device_photo' | 'warranty' | 'receipt' | 'other';
}

// ============================================================================
// OTHER EVENT TYPES
// ============================================================================

// Customer Update (Müşteri bilgi güncellemesi)
export interface N8NCustomerUpdate {
  customer_id?: number;              // Mevcut müşteri ID (varsa)
  phone: string;                     // Telefon numarası (anahtar)
  updates: {
    name?: string;
    email?: string;
    address?: string;
    preferences?: any;
  };
  update_reason: string;             // Güncelleme nedeni
}

// System Notification (Sistem bildirimi)
export interface N8NSystemNotification {
  notification_type: 'alert' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  target_users?: string[];           // Hedef kullanıcılar
  priority: 'low' | 'normal' | 'high';
  expires_at?: string;               // Geçerlilik süresi
  action_required?: boolean;         // Aksiyon gerekli mi?
  related_job_id?: number;          // İlgili iş ID'si
}

// ============================================================================
// N8N RESPONSE STRUCTURES
// ============================================================================

// API Response to N8N
export interface N8NWebhookResponse {
  success: boolean;
  message: string;
  data?: {
    job_id?: number;                 // Oluşturulan iş ID'si
    customer_id?: number;            // Müşteri ID'si
    tracking_code?: string;          // Takip kodu
    estimated_response_time?: string; // Tahmini yanıt süresi
    next_steps?: string[];           // Sonraki adımlar
  };
  errors?: string[];
  warnings?: string[];
  processing_time_ms?: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// N8N webhook validation rules
export const N8NValidationSchemas = {
  jobRequest: {
    'customer.name': { 
      required: true, 
      type: 'string', 
      minLength: 2,
      maxLength: 100 
    },
    'customer.phone': { 
      required: true, 
      type: 'string',
      pattern: '^[0-9+\\-\\s()]{10,15}$' 
    },
    'customer.email': { 
      required: false, 
      type: 'email' 
    },
    'customer.address.full_address': { 
      required: true, 
      type: 'string',
      minLength: 10,
      maxLength: 500 
    },
    'service.type': { 
      required: true, 
      type: 'string',
      minLength: 3,
      maxLength: 100 
    },
    'service.problem_description': { 
      required: true, 
      type: 'string',
      minLength: 10,
      maxLength: 2000 
    },
    'service.urgency_level': { 
      required: false,
      enum: ['low', 'normal', 'high', 'critical'] 
    },
    event_type: { 
      required: true,
      enum: Object.values(N8NEventType) 
    },
    source: { 
      required: true,
      enum: Object.values(N8NDataSource) 
    }
  }
};

// ============================================================================
// N8N DATA PROCESSING UTILITIES
// ============================================================================

export class N8NDataProcessor {
  
  // Normalize phone number
  static normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Handle Turkish phone numbers
    if (normalized.startsWith('0')) {
      normalized = '+90' + normalized.substring(1);
    } else if (normalized.startsWith('90') && !normalized.startsWith('+90')) {
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+')) {
      normalized = '+90' + normalized;
    }
    
    return normalized;
  }

  // Extract city from address
  static extractCityFromAddress(address: string): string | null {
    const turkishCities = [
      'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Şanlıurfa',
      'Gaziantep', 'Kocaeli', 'Mersin', 'Diyarbakır', 'Hatay', 'Manisa', 'Kayseri',
      // Add more cities as needed
    ];
    
    const upperAddress = address.toUpperCase();
    
    for (const city of turkishCities) {
      if (upperAddress.includes(city.toUpperCase())) {
        return city;
      }
    }
    
    return null;
  }

  // Determine service priority based on keywords
  static determineServicePriority(description: string, urgencyLevel?: string): 'low' | 'normal' | 'high' | 'urgent' {
    if (urgencyLevel) {
      return urgencyLevel as any;
    }
    
    const urgentKeywords = ['acil', 'urgent', 'çalışmıyor', 'bozuk', 'arızalı', 'yanıyor'];
    const highKeywords = ['bugün', 'today', 'hemen', 'immediately', 'asap'];
    
    const lowerDescription = description.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerDescription.includes(keyword))) {
      return 'urgent';
    }
    
    if (highKeywords.some(keyword => lowerDescription.includes(keyword))) {
      return 'high';
    }
    
    return 'normal';
  }

  // Calculate estimated price based on service type and problem
  static estimateServicePrice(serviceType: string, problemDescription: string): number {
    // Base prices by service type
    const basePrices: Record<string, number> = {
      'TV Tamiri': 150,
      'TV Ekran Değişimi': 800,
      'Klima Servisi': 200,
      'Klima Montajı': 300,
      'Bulaşık Makinesi Tamiri': 180,
      'Çamaşır Makinesi Tamiri': 160,
      'Buzdolabı Tamiri': 170,
      'Fırın Tamiri': 140,
      // Add more service types
    };
    
    let basePrice = basePrices[serviceType] || 150; // Default price
    
    // Adjust price based on problem complexity
    const complexKeywords = ['ekran', 'anakart', 'kompresör', 'motor'];
    const simpleKeywords = ['temizlik', 'ayar', 'kontrol'];
    
    const lowerProblem = problemDescription.toLowerCase();
    
    if (complexKeywords.some(keyword => lowerProblem.includes(keyword))) {
      basePrice *= 1.5; // %50 increase for complex problems
    } else if (simpleKeywords.some(keyword => lowerProblem.includes(keyword))) {
      basePrice *= 0.8; // %20 decrease for simple problems
    }
    
    return Math.round(basePrice);
  }
}

// ============================================================================
// N8N WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

export class N8NWebhookSecurity {
  
  // Verify webhook signature (HMAC-SHA256)
  static async verifySignature(
    payload: string, 
    signature: string, 
    secret: string
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  // Validate API key
  static validateApiKey(apiKey: string, validKeys: string[]): boolean {
    return validKeys.includes(apiKey);
  }
}

// ============================================================================
// EXAMPLE N8N PAYLOADS
// ============================================================================

export const N8NExamplePayloads = {
  // Web form job request
  webFormRequest: {
    webhook_id: 'wh_1234567890',
    workflow_id: 'wf_tv_service_intake',
    execution_id: 'exec_20250918_001',
    timestamp: '2025-09-18T14:30:00.000Z',
    source: N8NDataSource.WEBSITE_FORM,
    event_type: N8NEventType.JOB_REQUEST_CREATED,
    data: {
      customer: {
        name: 'Ahmet Yılmaz',
        phone: '05321234567',
        email: 'ahmet@example.com',
        address: {
          full_address: 'Barbaros Mah. Atatürk Cad. No:123 Daire:5 Beşiktaş/İstanbul',
          city: 'İstanbul',
          district: 'Beşiktaş',
          neighborhood: 'Barbaros',
          postal_code: '34353'
        },
        customer_type: 'individual',
        previous_customer: false
      },
      service: {
        type: 'TV Tamiri',
        category: 'Elektronik',
        brand: 'Samsung',
        model: 'QE55Q80A',
        problem_description: 'TV açılıyor ama ekran siyah kalıyor. Ses geliyor ama görüntü yok.',
        problem_category: 'elektrik',
        urgency_level: 'normal',
        warranty_status: 'expired',
        device_age: 2
      },
      scheduling: {
        preferred_date: '2025-09-20',
        preferred_time: {
          start: '14:00',
          end: '18:00'
        },
        flexible_timing: true,
        weekend_available: true
      },
      budget: {
        max_budget: 500
      },
      source_metadata: {
        referrer: 'google.com',
        utm_parameters: {
          source: 'google',
          medium: 'cpc',
          campaign: 'tv_repair_istanbul'
        }
      }
    } as N8NJobRequest
  } as N8NWebhookPayload,

  // WhatsApp urgent request
  whatsappUrgentRequest: {
    webhook_id: 'wh_1234567891',
    workflow_id: 'wf_whatsapp_urgent',
    execution_id: 'exec_20250918_002',
    timestamp: '2025-09-18T09:15:00.000Z',
    source: N8NDataSource.WHATSAPP,
    event_type: N8NEventType.URGENT_REQUEST,
    data: {
      customer: {
        name: 'Fatma Özkan',
        phone: '05559876543',
        address: {
          full_address: 'Çankaya Ankara'
        },
        previous_customer: true
      },
      service: {
        type: 'Klima Servisi',
        problem_description: 'Klima hiç çalışmıyor, elektrik kesiliyor. Acil bakım gerekli.',
        urgency_level: 'critical'
      },
      scheduling: {
        emergency_service: true
      }
    } as N8NJobRequest
  } as N8NWebhookPayload
};

// ============================================================================
// EXPORTS
// ============================================================================
export type {
  N8NWebhookPayload,
  N8NJobRequest,
  N8NCustomerUpdate,
  N8NSystemNotification,
  N8NWebhookResponse,
  N8NAttachment
};

export {
  N8NDataSource,
  N8NEventType,
  N8NValidationSchemas,
  N8NDataProcessor,
  N8NWebhookSecurity,
  N8NExamplePayloads
};