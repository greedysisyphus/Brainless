import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAdminStatus } from '../utils/firebase';

// 管理員權限檢查 Hook（帶快取）
const adminCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 檢查管理員狀態（帶快取）
  const checkAdminStatusCached = useCallback(async (uid) => {
    const cacheKey = `admin_${uid}`;
    const cached = adminCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.isAdmin;
    }

    try {
      const isAdmin = await checkAdminStatus(uid);
      adminCache.set(cacheKey, {
        isAdmin,
        timestamp: Date.now()
      });
      return isAdmin;
    } catch (error) {
      console.error('檢查管理員狀態失敗:', error);
      return false;
    }
  }, []);

  // 清除快取
  const clearCache = useCallback(() => {
    adminCache.clear();
  }, []);

  // 檢查權限
  const checkAuth = useCallback(async (user) => {
    if (!user) {
      setIsAdmin(false);
      setError('請先登入');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    try {
      const adminStatus = await checkAdminStatusCached(user.uid);
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setError('您沒有管理員權限');
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError('');
      }
    } catch (error) {
      setError('檢查權限時發生錯誤');
      console.error('權限檢查失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminStatusCached, navigate]);

  return {
    isAdmin,
    isLoading,
    error,
    checkAuth,
    clearCache
  };
};
