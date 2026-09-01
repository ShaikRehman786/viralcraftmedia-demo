import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CRMGlobalLoader from '../components/shared/CRMGlobalLoader.jsx';

const LoadingContext = createContext({
  isLoading: false,
  showLoader: () => {},
  hideLoader: () => {}
});

export function LoadingProvider({ children }) {
  const [activeRequests, setActiveRequests] = useState(0);
  const [manualLoading, setManualLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(null);
  const [loadingSubMessage, setLoadingSubMessage] = useState(null);
  const [visible, setVisible] = useState(false);

  const timerRef = useRef(null);

  const showLoader = (message = null, subMessage = null) => {
    setLoadingMessage(message);
    setLoadingSubMessage(subMessage);
    setManualLoading(true);
    setVisible(true);
  };

  const hideLoader = () => {
    setManualLoading(false);
    setLoadingMessage(null);
    setLoadingSubMessage(null);
    if (activeRequests <= 0) {
      setVisible(false);
    }
  };

  // Axios interceptor setup for API calls taking > 150ms
  useEffect(() => {
    let pendingCount = 0;

    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Skip background silent requests if marked with silent: true
        if (config?.silent) return config;

        pendingCount++;
        setActiveRequests(pendingCount);

        if (!timerRef.current && pendingCount === 1) {
          timerRef.current = setTimeout(() => {
            setVisible(true);
          }, 150);
        }
        return config;
      },
      (error) => {
        pendingCount = Math.max(0, pendingCount - 1);
        setActiveRequests(pendingCount);
        if (pendingCount === 0) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          if (!manualLoading) setVisible(false);
        }
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        pendingCount = Math.max(0, pendingCount - 1);
        setActiveRequests(pendingCount);
        if (pendingCount === 0) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          if (!manualLoading) setVisible(false);
        }
        return response;
      },
      (error) => {
        pendingCount = Math.max(0, pendingCount - 1);
        setActiveRequests(pendingCount);
        if (pendingCount === 0) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          if (!manualLoading) setVisible(false);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [manualLoading]);

  const isShow = visible || manualLoading;

  return (
    <LoadingContext.Provider value={{ isLoading: isShow, showLoader, hideLoader }}>
      {children}
      {isShow && (
        <CRMGlobalLoader
          fullScreen={true}
          message={loadingMessage}
          subMessage={loadingSubMessage}
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
