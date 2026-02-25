import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storageKeys';

export const authStorage = {
  async getToken() {
    return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  async setToken(token) {
    return AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },
  async getUser() {
    const userValue = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return userValue ? JSON.parse(userValue) : null;
  },
  async setUser(user) {
    return AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  },
  async clear() {
    await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.AUTH_USER]);
  }
};
