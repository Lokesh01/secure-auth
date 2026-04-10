import axios from 'axios';

const options = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
};

const API = axios.create(options);
export const APIRefresh = axios.create(options);

APIRefresh.interceptors.response.use(response => response);

API.interceptors.response.use(
  response => response,
  async error => {
    if (!error.response) {
      console.error('Network error or no response received:', error.message);
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR',
      });
    }

    const { data, status } = error.response;
    const originalRequest = error.config;

    // timeout: 10000 without _retry:
    // 1. /session → 401 (instant response, no timeout)
    //        ↓
    // 2. interceptor fires → calls /refresh → 401 (instant)
    //        ↓
    // 3. interceptor fires → calls /refresh → 401 (instant)
    //        ↓
    // 4. interceptor fires → calls /refresh → 401 (instant)
    //        ↓
    // infinite loop ❌
    // timeout never triggers because each request
    // responds instantly with 401

    // With _retry flag:
    // 1. /session → 401
    //        ↓
    // 2. interceptor fires, _retry = undefined
    //    sets _retry = true
    //    calls /refresh → 401
    //        ↓
    // 3. interceptor fires, _retry = true
    //    condition fails → skip refresh
    //    redirect to login ✅
    //    loop stopped after 2 requests
    if (
      data.errorCode === 'AUTH_TOKEN_NOT_FOUND' &&
      status === 401 &&
      !originalRequest._retry // prevent infinite retry loop
    ) {
      originalRequest._retry = true;
      try {
        await APIRefresh.get('/auth/refresh');
        // retry original request with new token
        return API(originalRequest); // ← added this
      } catch (error) {
        console.log(
          'Refresh token expired or invalid. Redirecting to login.',
          error
        );
        window.location.href = '/';
        return Promise.reject(error);
      }
    }

    return Promise.reject({ ...data });
  }
);

export default API;
