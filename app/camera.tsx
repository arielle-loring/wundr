// app/index.tsx (or wherever your camera lives)
import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
// optional: haptics/keep-awake
// import * as Haptics from 'expo-haptics';
// import { useKeepAwake } from 'expo-keep-awake';

export default function ScanScreen() {
  const camRef = useRef<CameraView>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);

  // useKeepAwake(); // optional

  if (!perm) return <View />;
  if (!perm.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.msg}>We need camera access</Text>
        <TouchableOpacity onPress={requestPerm} style={styles.btn}>
          <Text style={styles.btnText}>Grant permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const onSnap = async () => {
    if (isCapturing) return;           // prevent double taps
    setIsCapturing(true);
    try {
      // await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const photo = await camRef.current?.takePictureAsync({
        base64: true,
        quality: 0.6,                  // lighter -> faster upload
        skipProcessing: false,
      });

      if (!photo?.base64 || !photo?.uri) throw new Error('No photo');

      // (optional) extra compress/resize to reduce latency
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1280 } }], // cap width; keeps aspect
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // navigate to results
      router.push({
        pathname: '/result',
        params: {
          uri: manipulated.uri ?? photo.uri,
          base64: manipulated.base64 ?? photo.base64,
        },
      });
    } catch (e) {
      console.warn('Capture failed', e);
      setIsCapturing(false); // let user try again
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={camRef} style={{ flex: 1 }} facing="back" />

      {/* Capture button */}
      <View style={styles.controls}>
        <TouchableOpacity disabled={isCapturing} onPress={onSnap} style={[styles.shutter, isCapturing && { opacity: 0.5 }]}>
          <Text style={styles.shutterText}>{isCapturing ? '...' : 'Snap'}</Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen loading overlay */}
      {isCapturing && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" />
            <Text style={styles.overlayText}>Analyzing…</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  msg: { fontSize: 16, marginBottom: 12 },
  btn: { backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: '600' },

  controls: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  shutter: { backgroundColor: '#111', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  shutterText: { color: 'white', fontWeight: '700', letterSpacing: 0.5 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: 'white',
    padding: 18,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
  },
  overlayText: { fontSize: 14, color: '#333', marginTop: 2 },
});
