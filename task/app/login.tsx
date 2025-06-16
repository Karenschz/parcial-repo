import axios from 'axios';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';

const API_URL = 'http://127.0.0.1:8000/api/login'; 

const LoginScreen = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // Validaciones básicas
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Configuración de axios con timeout y headers apropiados
      const response = await axios.post(API_URL, {
        email: email.trim().toLowerCase(),
        password: password
      }, {
        timeout: 10000, // 10 segundos de timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      console.log('Respuesta de la API:', response.data);

      // Verificar que la respuesta sea exitosa
      if (response.status === 200 && response.data) {
        const accessToken = response.data.access_token || response.data.token;
        const userName = response.data.user?.name;

        console.log('Token recibido:', accessToken);
        console.log('Nombre de usuario:', userName);

        if (accessToken) {
          try {
            // Guardar datos en AsyncStorage
            await AsyncStorage.multiSet([
              ['token', accessToken],
              ['userName', userName || 'Usuario'],
              ['user', JSON.stringify(response.data.user || {})]
            ]);

            console.log('Datos guardados en AsyncStorage');
            
            // Navegar inmediatamente sin Alert
            router.replace('/(tabs)');
            
            // Opcional: Mostrar mensaje de éxito sin bloquear la navegación
            setTimeout(() => {
              console.log('Login exitoso - Usuario redirigido');
            }, 100);
          } catch (storageError) {
            console.error('Error guardando en AsyncStorage:', storageError);
            setError('Error al guardar datos localmente');
          }
        } else {
          console.error('No se recibió token en la respuesta');
          setError('Error: No se recibió token de autenticación');
        }
      }
    } catch (err) {
      console.error('Error completo:', err);
      
      let errorMessage = 'Error de conexión';
      
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // El servidor respondió con un error
          const status = err.response.status;
          const data = err.response.data;
          
          console.error('Error del servidor:', status, data);
          
          switch (status) {
            case 401:
              errorMessage = 'Credenciales inválidas';
              break;
            case 422:
              errorMessage = data.message || 'Datos inválidos';
              break;
            case 500:
              errorMessage = 'Error interno del servidor';
              break;
            default:
              errorMessage = data.message || `Error del servidor (${status})`;
          }
        } else if (err.request) {
          // La petición se hizo pero no hubo respuesta
          console.error('Sin respuesta del servidor:', err.request);
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        } else {
          // Error al configurar la petición
          console.error('Error de configuración:', err.message);
          errorMessage = 'Error al configurar la petición';
        }
      } else {
        // Error no relacionado con axios
        console.error('Error no-axios:', err);
        errorMessage = err.message || 'Error desconocido';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar el error cuando el usuario empiece a escribir
  const handleEmailChange = (text) => {
    setEmail(text);
    if (error) setError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (error) setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar Sesión</Text>

        <TextInput
          value={email}
          onChangeText={handleEmailChange}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, error && styles.inputError]}
          editable={!loading}
        />
        
        <TextInput
          value={password}
          onChangeText={handlePasswordChange}
          placeholder="Contraseña"
          secureTextEntry
          style={[styles.input, error && styles.inputError]}
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        {!loading && (
          <Link href="/register">
            <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
          </Link>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF4C4C',
    backgroundColor: '#FFF5F5',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: '#FF4C4C',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 8,
  },
  linkText: {
    color: '#007bff',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
  },
});

export default LoginScreen;