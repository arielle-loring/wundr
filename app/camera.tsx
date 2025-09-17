import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';

export default function CameraScreen() {
  const camRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);

  // First render before permissions load
  if (!permission) {
    return <View style={styles.center}><Text>Checking camera permission…</Text></View>;
  }

  // Ask for permission
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>We need camera access.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Allow</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={camRef}
        style={{ flex: 1 }}
        facing="back"
        onCameraReady={() => setReady(true)}
      />
      <View style={styles.bottomBar}>
        <TouchableOpacity
          disabled={!ready}
          onPress={async () => {
            const photo = await camRef.current?.takePictureAsync({ quality: 0.5, base64: true });
            if (!photo?.base64) return;
            router.push({ pathname: '/result', params: { uri: photo.uri, base64: photo.base64 } });
          }}
          style={[styles.shutter, { opacity: ready ? 1 : 0.5 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#111', borderRadius: 12 },
  btnText: { color: 'white' },
  bottomBar: { position: 'absolute', bottom: 24, width: '100%', alignItems: 'center' },
  shutter: { width: 68, height: 68, borderRadius: 999, backgroundColor: '#fff' }
});
