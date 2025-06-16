import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { CustomToast } from '@/components/CustomToast'; // Asegúrate que la ruta es correcta

export default function Layout() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');

      const inAuthGroup = segments[0] !== '(tabs)'; // si no estamos en las rutas protegidas

      if (!token && !inAuthGroup) {
        router.replace('/login'); // No hay token, manda al login
      }

      if (token && inAuthGroup) {
        router.replace('/(tabs)'); // Ya está logueado, pero está en login → manda al home
      }

      setLoading(false);
    };

    checkToken();
  }, [segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Aquí envuelves el Slot con el Toast
  return (
    <>
      <Slot />
      <Toast
        config={{
          custom: (props) => <CustomToast {...props} />,
        }}
      />
    </>
  );
}