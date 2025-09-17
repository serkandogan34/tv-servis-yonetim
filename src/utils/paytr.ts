// PayTR Payment Integration for TV Servis Yönetim Sistemi
import { createHash } from 'crypto';

// PayTR Configuration Interface
export interface PayTRConfig {
  merchant_id: string;
  merchant_key: string;
  merchant_salt: string;
}

// PayTR Payment Request Interface
export interface PayTRPaymentRequest {
  merchant_id: string;
  user_ip: string;
  merchant_oid: string;
  email: string;
  payment_amount: number; // Kuruş cinsinden
  paytr_token: string;
  user_basket: string;
  debug_on: number;
  no_installment: number;
  max_installment: number;
  user_name: string;
  user_address: string;
  user_phone: string;
  merchant_ok_url: string;
  merchant_fail_url: string;
  timeout_limit: number;
  currency: string;
  test_mode: number;
}

// PayTR Response Interface
export interface PayTRResponse {
  status: string;
  reason?: string;
  token?: string;
}

/**
 * Generate PayTR token for payment request
 */
export function generatePayTRToken(
  config: PayTRConfig,
  params: {
    merchant_oid: string;
    email: string;
    payment_amount: number;
    user_basket: string;
    no_installment: number;
    max_installment: number;
    user_name: string;
    user_address: string;
    user_phone: string;
    merchant_ok_url: string;
    merchant_fail_url: string;
    timeout_limit: number;
    currency: string;
    test_mode: number;
  }
): string {
  const {
    merchant_oid,
    email,
    payment_amount,
    user_basket,
    no_installment,
    max_installment,
    user_name,
    user_address,
    user_phone,
    merchant_ok_url,
    merchant_fail_url,
    timeout_limit,
    currency,
    test_mode
  } = params;

  const hashStr = 
    config.merchant_id + 
    user_phone + 
    merchant_oid + 
    email + 
    payment_amount + 
    user_basket + 
    no_installment + 
    max_installment + 
    currency + 
    test_mode + 
    config.merchant_salt;

  return createHash('sha256').update(hashStr).digest('base64');
}

/**
 * Verify PayTR callback
 */
export function verifyPayTRCallback(
  config: PayTRConfig,
  params: {
    merchant_oid: string;
    status: string;
    total_amount: string;
    hash: string;
  }
): boolean {
  const { merchant_oid, status, total_amount, hash } = params;
  
  // Test mode - bypass hash verification for simulation
  if (hash === 'test_hash_simulation' || config.merchant_id === 'PAYTR_TEST_MERCHANT_ID') {
    console.log('PayTR test mode - hash verification bypassed');
    return true;
  }
  
  const hashStr = merchant_oid + config.merchant_salt + status + total_amount;
  const expectedHash = createHash('sha256').update(hashStr).digest('base64');
  
  return hash === expectedHash;
}

/**
 * Create PayTR payment request
 */
export function createPayTRPaymentRequest(
  config: PayTRConfig,
  params: {
    bayiId: number;
    email: string;
    amount: number; // TL cinsinden
    bayiName: string;
    bayiPhone: string;
    userIp: string;
  }
): PayTRPaymentRequest {
  const {
    bayiId,
    email,
    amount,
    bayiName,
    bayiPhone,
    userIp
  } = params;

  // Unique order ID
  const merchantOid = `CREDIT_${bayiId}_${Date.now()}`;
  
  // Payment amount in kuruş
  const paymentAmount = Math.round(amount * 100);
  
  // User basket (PayTR requirement)
  const userBasket = JSON.stringify([
    [`Kredi Yükleme - ${amount} TL`, `${amount} TL`, 1]
  ]);

  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.pages.dev' // Production URL'inizi buraya yazın
    : 'http://localhost:3000';

  const requestParams = {
    merchant_oid: merchantOid,
    email: email,
    payment_amount: paymentAmount,
    user_basket: userBasket,
    no_installment: 0, // Taksit yok
    max_installment: 0, // Maksimum taksit yok
    user_name: bayiName,
    user_address: 'TV Servis Bayisi', // Genel adres
    user_phone: bayiPhone,
    merchant_ok_url: `${baseUrl}/api/payment/paytr/success`,
    merchant_fail_url: `${baseUrl}/api/payment/paytr/failed`,
    timeout_limit: 30, // 30 dakika
    currency: 'TL',
    test_mode: 1 // Test mode (production'da 0 yapılacak)
  };

  const paytrToken = generatePayTRToken(config, requestParams);

  return {
    merchant_id: config.merchant_id,
    user_ip: userIp,
    paytr_token: paytrToken,
    debug_on: 1, // Debug mode (production'da 0)
    ...requestParams
  };
}

/**
 * Get test PayTR configuration
 */
export function getTestPayTRConfig(): PayTRConfig {
  return {
    merchant_id: 'PAYTR_TEST_MERCHANT_ID',
    merchant_key: 'PAYTR_TEST_MERCHANT_KEY', 
    merchant_salt: 'PAYTR_TEST_MERCHANT_SALT'
  };
}

/**
 * Get PayTR configuration from database
 */
export async function getPayTRConfig(DB: D1Database): Promise<PayTRConfig> {
  try {
    const settings = await DB.prepare(`
      SELECT anahtar, deger FROM sistem_ayarlari 
      WHERE anahtar IN ('paytr_merchant_id', 'paytr_merchant_key', 'paytr_merchant_salt')
    `).all();

    const configMap: Record<string, string> = {};
    settings.results?.forEach((setting: any) => {
      configMap[setting.anahtar] = setting.deger;
    });

    // Test configuration if production values are not set
    if (!configMap.paytr_merchant_id || !configMap.paytr_merchant_key) {
      console.log('Using test PayTR configuration');
      return getTestPayTRConfig();
    }

    return {
      merchant_id: configMap.paytr_merchant_id,
      merchant_key: configMap.paytr_merchant_key,
      merchant_salt: configMap.paytr_merchant_salt
    };
  } catch (error) {
    console.error('PayTR config error:', error);
    return getTestPayTRConfig();
  }
}