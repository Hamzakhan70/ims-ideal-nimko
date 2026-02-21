// src/api/api.js
import axios from "axios";
import { API_BASE_URL } from "../config/appConfig";

export const API_URL = API_BASE_URL;

export const getProducts = async (params = {}) => {
  const response = await axios.get(`${API_URL}/products`, { params });
  return response.data;
};

export const getProduct = async (id) => {
  const response = await axios.get(`${API_URL}/products/${id}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await axios.get(`${API_URL}/products/categories/list`);
  return response.data;
};

export const placeOrder = async (order) => {
  const response = await axios.post(`${API_URL}/orders`, order);
  return response.data;
};

export const getOrders = async () => {
  const response = await axios.get(`${API_URL}/orders`);
  return response.data;
};
