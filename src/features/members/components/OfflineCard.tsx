import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Modal, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Profile } from '../../../store/useAuthStore';
import { payment } from '../../../core/payment';
import { haptics } from '../../../core/haptics';

const { width } = Dimensions.get('window');

interface OfflineCardProps {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
}

export const OfflineCard: React.FC<OfflineCardProps> = ({ visible, onClose, profile }) => {
    const viewShotRef = useRef<any>(null);
    const [isAdding, setIsAdding] = useState<'apple' | 'google' | null>(null);

    if (!profile) return null;

    const handleAddToWallet = async (type: 'apple' | 'google') => {
      try {
        setIsAdding(type);
        haptics.medium();


        // Capture the card as image
        const uri = await captureRef(viewShotRef.current, {
          format: 'png',
          quality: 1.0,
        });

      if (type === 'apple') {
        await payment.addToAppleWallet(profile, uri);
      } else {
        await payment.addToGoogleWallet(profile, uri);
      }
    } catch (error) {
      console.error('Wallet error:', error);
    } finally {
      setIsAdding(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
            <ViewShot ref={viewShotRef}>
              <LinearGradient
                colors={['#1A2138', '#0F121D']}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.brand}>BIBLIOTECH</Text>
                    <Text style={styles.cardType}>DIGITAL MEMBERSHIP</Text>
                  </View>
                  <Ionicons name="library" size={24} color="#3A75F2" />
                </View>

                <View style={styles.qrContainer}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={profile.id}
                      size={180}
                      color="#FFFFFF"
                      backgroundColor="transparent"
                    />
                  </View>
                  <Text style={styles.userId}>{profile.id.substring(0, 8).toUpperCase()}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.label}>MEMBER NAME</Text>
                    <Text style={styles.value}>{profile.fullName || 'Valued Reader'}</Text>
                  </View>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{profile.role}</Text>
                  </View>
                </View>

                <View style={styles.offlineIndicator}>
                  <Ionicons name="cloud-offline" size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.offlineText}>OFFLINE ACCESS ENABLED</Text>
                </View>
              </LinearGradient>
            </ViewShot>

            {/* Wallet Buttons */}
            <View style={styles.walletButtons}>
              <TouchableOpacity 
                style={[styles.walletBtn, styles.appleWalletBtn]}
                onPress={() => handleAddToWallet('apple')}
                disabled={!!isAdding}
              >
                {isAdding === 'apple' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={18} color="white" />
                    <Text style={styles.walletBtnText}>Add to Apple Wallet</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.walletBtn, styles.googleWalletBtn]}
                onPress={() => handleAddToWallet('google')}
                disabled={!!isAdding}
              >
                {isAdding === 'google' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <FontAwesome5 name="google-pay" size={18} color="white" />
                    <Text style={styles.walletBtnText}>Add to Google Wallet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close-circle" size={48} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: width * 0.85,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cardType: {
    color: '#3A75F2',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  userId: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    letterSpacing: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleBadge: {
    backgroundColor: 'rgba(58, 117, 242, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(58, 117, 242, 0.3)',
  },
  roleText: {
    color: '#3A75F2',
    fontSize: 11,
    fontWeight: '800',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
    opacity: 0.6,
  },
  offlineText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  closeBtn: {
    marginTop: 30,
  },
  walletButtons: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  appleWalletBtn: {
    backgroundColor: '#000000',
  },
  googleWalletBtn: {
    backgroundColor: '#000000',
    borderColor: '#3c4043',
  },
  walletBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
