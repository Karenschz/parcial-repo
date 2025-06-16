import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const REGISTER_URL = 'http://localhost:8000/api/register';
const LOGIN_URL = 'http://localhost:8000/api/login';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    try {
      await axios.post(REGISTER_URL, {
        name,
        email,
        password,
        password_confirmation: password,
      });

      const loginResponse = await axios.post(LOGIN_URL, {
        email,
        password,
      });

      const { token, user } = loginResponse.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userName', user.name);

      setError('');
      setSuccess('¡Registro exitoso!');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Error:', err.response ? err.response.data : err.message);
      setError('Verifica tus datos o si el correo ya está en uso.');
      setSuccess('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Crear cuenta</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre completo"
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#999"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </TouchableOpacity>

        <Link href="/login">
          <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </Link>
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
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
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
  },
  success: {
    color: '#28a745',
    marginBottom: 10,
    textAlign: 'center',
  },
  linkText: {
    color: '#007bff',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default RegisterScreen;