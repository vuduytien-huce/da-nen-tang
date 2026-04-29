import * as CryptoJS from 'crypto-js';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { haptics } from './haptics';

const SYSTEM_HMAC_SECRET = 'library_system_secure_secret_2026';

/**
 * Wallet & Digital Pass integration
 */
export const payment = {
  // Existing payment logic
  generateVietQR: (bankId: string, accountNo: string, amount: number, description: string, accountName: string = 'LIBRARY SYSTEM') => {
    const encodedName = encodeURIComponent(accountName);
    const encodedDesc = encodeURIComponent(description);
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.jpg?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodedName}`;
  },

  signPaymentRequest: (data: object): string => {
    const message = JSON.stringify(data);
    return CryptoJS.HmacSHA256(message, SYSTEM_HMAC_SECRET).toString();
  },

  verifyPaymentSignature: (data: object, signature: string): boolean => {
    const expectedSignature = signPaymentRequest(data);
    return expectedSignature === signature;
  },

  // Wallet logic moved from membersService
  addToAppleWallet: async (profile: any, cardImageUri: string) => {
    if (Platform.OS !== 'ios') return Alert.alert('Thông báo', 'Chỉ khả dụng trên iOS');
    haptics.medium();
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(cardImageUri, { UTI: 'com.apple.pkpass', mimeType: 'application/vnd.apple.pkpass' });
        return true;
      }
    } catch (e) { return false; }
  },

  addToGoogleWallet: async (profile: any, cardImageUri: string) => {
    haptics.medium();
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(cardImageUri, { dialogTitle: 'Lưu thẻ vào Google Wallet' });
        return true;
      }
    } catch (e) { return false; }
  }
};
