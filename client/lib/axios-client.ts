import axios from 'axios';

const options = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  withCredentials: true,
  timeout: 10000,
};

const API = axios.create(options);

export const APIRefresh = axios.create(options);
APIRefresh.interceptors.response.use(response => response);

API.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const { data, status } = error.response;
    // console.log(data, 'data');

    if (data.errorCode === 'AUTH_TOKEN_NOT_FOUND' && status === 401) {
      try {
        await APIRefresh.get('/auth/refresh');
      } catch (error) {
        console.log(
          'Refresh token expired or invalid. Redirecting to login.',
          error
        );
        window.location.href = '/';
      }
    }

    return Promise.reject({
      ...data,
    });
  }
);

export default API;
