// AdminTasksScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const API_URL = 'http://localhost:8000/api';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web';

type Task = {
  id: number;
  title: string;
  status: 'pending' | 'completed';
  user_id: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  created_at?: string;
  updated_at?: string;
};

type User = {
  id: number;
  name: string;
  email: string;
};

export default function AdminTasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'pending' | 'completed'>('pending');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Estados para usuarios (solo para admin)
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadUserName();
    fetchTasks();
    fetchCurrentUser();
  }, []);

  // Agregar este useEffect para cuando currentUser cambie
  useEffect(() => {
    if (currentUser && !currentUser?.roles?.some((role: any) => role.name === 'admin')) {
      // Si no es admin, establecer por defecto su propio ID
      setSelectedUserId(currentUser.id?.toString() || '');
    }
  }, [currentUser]);

  // Función para cargar el nombre del usuario desde AsyncStorage
  const loadUserName = async () => {
    try {
      const storedUserName = await AsyncStorage.getItem('userName');
      if (storedUserName) {
        setUserName(storedUserName);
      }
    } catch (error) {
      console.error('Error al cargar el nombre del usuario:', error);
    }
  };

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (token) {
        await axios.post(`${API_URL}/logout`, {}, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
      }
    } catch (error) {
      console.log('Error al cerrar sesión en el servidor:', error);
    } finally {
      // Limpiar almacenamiento local y redirigir
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userName');
      router.replace('/login');
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const userData = await response.json();
      console.log('Current user data:', userData); // Debug
      setCurrentUser(userData);
      
      // Actualizar el nombre del usuario si no está en AsyncStorage
      if (userData.name && !userName) {
        setUserName(userData.name);
        await AsyncStorage.setItem('userName', userData.name);
      }
      
      // Si es admin, cargar usuarios
      if (userData.roles && userData.roles.some((role: any) => role.name === 'admin')) {
        console.log('Usuario es admin, cargando usuarios...'); // Debug
        fetchUsers();
      } else {
        console.log('Usuario NO es admin'); // Debug
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      console.log('Users response:', data); // Debug
      const usersArray = Array.isArray(data.data) ? data.data : [];
      console.log('Users array:', usersArray); // Debug
      setUsers(usersArray);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      const tasksData = Array.isArray(data) ? data : [];
      setTasks(tasksData);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la lista de tareas.');
      console.error('Fetch tasks error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar el estado de una tarea
  const handleToggleStatus = async (taskId: number) => {
    setToggleLoading(taskId);
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Token de autenticación no encontrado');
        return;
      }

      // Encontrar la tarea actual para obtener su estado
      const currentTask = tasks.find(task => task.id === taskId);
      if (!currentTask) return;

      const newStatus = currentTask.status === 'pending' ? 'completed' : 'pending';

      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentTask.title,
          status: newStatus,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId
              ? { ...task, status: newStatus }
              : task
          )
        );
        
        Alert.alert('Éxito', 'Estado de la tarea actualizado correctamente');
      } else {
        Alert.alert('Error', data.message || 'Error al actualizar el estado de la tarea');
      }
    } catch (error: any) {
      console.error('Toggle status error:', error);
      Alert.alert('Error', `No se pudo actualizar el estado: ${error.message}`);
    } finally {
      setToggleLoading(null);
    }
  };

  const resetForm = () => {
    setTitle('');
    setStatus('pending');
    
    const isAdmin = currentUser?.roles?.some((role: any) => role.name === 'admin');
    if (isAdmin) {
      setSelectedUserId('');
    } else {
      // Para usuarios normales, siempre asignar a sí mismos
      setSelectedUserId(currentUser?.id?.toString() || '');
    }
    
    setEditingTask(null);
  };

  // Función para manejar la edición de tareas
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setStatus(task.status);
    setSelectedUserId(task.user_id.toString());
    setModalVisible(true);
  };

  // Función que ejecuta la eliminación
  const handleDelete = async () => {
    if (!taskToDelete) return;

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Token de autenticación no encontrado');
        return;
      }

      const response = await fetch(`${API_URL}/tasks/${taskToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Éxito', 'Tarea eliminada con éxito');
        await fetchTasks();
      } else {
        Alert.alert('Error', data.message || 'Error al eliminar la tarea');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      Alert.alert('Error', `No se pudo eliminar la tarea: ${error.message}`);
    } finally {
      setLoading(false);
      setConfirmDeleteVisible(false);
      setTaskToDelete(null);
    }
  };

  // Función handleSaveTask corregida
  const handleSaveTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Token de autenticación no encontrado');
        return;
      }

      const requestBody: any = {
        title: title.trim(),
        status,
      };

      const isAdmin = currentUser?.roles?.some((role: any) => role.name === 'admin');
      
      if (isAdmin && selectedUserId) {
        // Admin puede asignar a cualquier usuario
        requestBody.user_id = parseInt(selectedUserId);
      } else if (!isAdmin && currentUser?.id) {
        // Usuario normal: asignar la tarea a sí mismo
        requestBody.user_id = currentUser.id;
      }

      console.log('Enviando datos:', requestBody); // Para debug

      const isEdit = !!editingTask;
      const url = isEdit ? `${API_URL}/tasks/${editingTask.id}` : `${API_URL}/tasks`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      console.log('Respuesta del servidor:', responseData); // Para debug

      if (!response.ok) {
        console.log('Error response:', response.status, responseData);
        const errorMessage = responseData.errors 
          ? Object.values(responseData.errors).flat().join('\n')
          : responseData.message || 'Error al guardar la tarea';
        Alert.alert('Error', errorMessage);
        return;
      }

      Alert.alert('Éxito', isEdit ? 'Tarea actualizada' : 'Tarea creada');
      setModalVisible(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      console.error('Save task error:', error);
      Alert.alert('Error', 'Error inesperado al guardar la tarea');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' ? '#4CAF50' : '#FF9800';
  };

  const getStatusText = (status: string) => {
    return status === 'completed' ? '✅ Completada' : '⏳ Pendiente';
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.card}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>

      <View style={styles.taskInfo}>
        <Text style={styles.userInfo}>
          👤 {item.user?.name || 'Usuario desconocido'}
        </Text>
        <Text style={styles.userEmail}>
          ✉️ {item.user?.email || 'Sin email'}
        </Text>
        {item.created_at && (
          <Text style={styles.dateInfo}>
            📅 {new Date(item.created_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.buttonText}>✏️ Editar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            item.status === 'completed' ? styles.pendingButton : styles.completeButton
          ]} 
          onPress={() => handleToggleStatus(item.id)}
          disabled={toggleLoading === item.id}
        >
          <Text style={styles.buttonText}>
            {toggleLoading === item.id 
              ? '⏳' 
              : item.status === 'completed' ? '🔄 Marcar Pendiente' : '✅ Completar'
            }
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => {
            setTaskToDelete(item.id);
            setConfirmDeleteVisible(true);
          }}
        >
          <Text style={styles.buttonText}>🗑️ Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando tareas...</Text>
      </View>
    );
  }

  const isAdmin = currentUser?.roles?.some((role: any) => role.name === 'admin');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            Gestión de Tareas ({tasks.length})
          </Text>
          <Text style={styles.welcomeText}>
            Bienvenido, {userName || 'Usuario'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Agregar Tarea</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => setMenuVisible(!menuVisible)}
          >
            <Text style={styles.menuButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menú desplegable */}
      {menuVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              handleLogout();
            }}
          >
            <Text style={styles.menuItemText}>🚪 Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay tareas disponibles</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTaskItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal para agregar/editar tarea */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrapper}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Editar Tarea' : 'Agregar Tarea'}
              </Text>
              
              <TextInput 
                placeholder="Título de la tarea" 
                style={styles.input} 
                value={title} 
                onChangeText={setTitle}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.pickerLabel}>Estado:</Text>
              <View style={styles.pickerContainer}>
                <Picker 
                  selectedValue={status} 
                  onValueChange={setStatus} 
                  style={styles.picker}
                >
                  <Picker.Item label="⏳ Pendiente" value="pending" />
                  <Picker.Item label="✅ Completada" value="completed" />
                </Picker>
              </View>

              {isAdmin && (
                <>
                  <Text style={styles.pickerLabel}>Asignar a usuario:</Text>
                  <Text style={styles.debugText}>Debug - isAdmin: {isAdmin ? 'true' : 'false'}</Text>
                  <Text style={styles.debugText}>Debug - users.length: {users.length}</Text>
                  <Text style={styles.debugText}>Debug - currentUser: {JSON.stringify(currentUser?.roles)}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker 
                      selectedValue={selectedUserId} 
                      onValueChange={setSelectedUserId} 
                      style={styles.picker}
                    >
                      <Picker.Item label="Seleccionar usuario (opcional)" value="" />
                      {users.map(user => (
                        <Picker.Item 
                          key={user.id} 
                          label={`${user.name} (${user.email})`} 
                          value={user.id.toString()} 
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={handleSaveTask}
                >
                  <Text style={styles.modalButtonText}>
                    {editingTask ? '✅ Actualizar' : '💾 Guardar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => { 
                    setModalVisible(false); 
                    resetForm(); 
                  }}
                >
                  <Text style={styles.modalButtonText}>❌ Cancelar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de confirmación para eliminar */}
      <Modal
        visible={confirmDeleteVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setConfirmDeleteVisible(false);
          setTaskToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: isWeb ? 300 : '85%' }]}>
            <Text style={styles.modalTitle}>¿Eliminar tarea?</Text>
            <Text style={styles.modalText}>
              Esta acción no se puede deshacer. ¿Estás seguro?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDelete}
                disabled={loading}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setConfirmDeleteVisible(false);
                  setTaskToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  menuButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  menuButtonText: {
    fontSize: 18,
    color: '#333',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  taskInfo: {
    marginBottom: 12,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  dateInfo: {
    fontSize: 12,
    color: '#888',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#FF9500',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  pendingButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: isWeb ? 400 : '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteConfirmButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});