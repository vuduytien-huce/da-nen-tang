import * as CryptoJS from 'crypto-js';

// SECRETS should ideally be in .env
const SYSTEM_HMAC_SECRET = 'library_system_secure_secret_2026';

export const generateVietQR = (
  bankId: string,
  accountNo: string,
  amount: number,
  description: string,
  accountName: string = 'LIBRARY SYSTEM'
): string => {
  const encodedName = encodeURIComponent(accountName);
  const encodedDesc = encodeURIComponent(description);
  
  // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.jpg?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.jpg?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodedName}`;
};

/**
 * Generates an HMAC signature to verify payment requests internally
 */
export const signPaymentRequest = (data: object): string => {
  const message = JSON.stringify(data);
  return CryptoJS.HmacSHA256(message, SYSTEM_HMAC_SECRET).toString();
};

/**
 * Verifies an HMAC signature
 */
export const verifyPaymentSignature = (data: object, signature: string): boolean => {
  const expectedSignature = signPaymentRequest(data);
  return expectedSignature === signature;
};
