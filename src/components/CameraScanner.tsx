import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface CameraScannerProps {
  onScan: (data: string, type: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraScanner({ onScan, onClose, title }: CameraScannerProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('messages.camera_permission_denied')}</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>{t('common.grant_permission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data, type);
    // Auto reset after 2 seconds to allow consecutive scans if needed
    setTimeout(() => setScanned(false), 2000);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "code128"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>{title || t('common.scan')}</Text>
            <View style={{ width: 30 }} />
          </View>

          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {scanned && <View style={styles.scanSuccessLine} />}
            </View>
          </View>

          <Text style={styles.hint}>{t('librarian.scan_hint')}</Text>
        </View>
      </CameraView>
    </View>
  );
}

const { width } = Dimensions.get('window');
const scanSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 10,
  },
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: scanSize,
    height: scanSize,
    borderWidth: 0,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#4F8EF7',
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: {
    color: '#8B8FA3',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 40,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4F8EF7',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
  scanSuccessLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  }
});
