import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, checkAdminStatus } from '../../utils/firebase'

// 管理員相關的邏輯：登入、權限檢查、登出。Club 版和新版的畫面共用。

export function useAdminLogin({ onLoginSuccess, onLoginError } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('請輸入信箱和密碼')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const isAdmin = await checkAdminStatus(userCredential.user.uid)

      if (!isAdmin) {
        const { signOut } = await import('firebase/auth')
        await signOut(auth)
        setError('此帳號沒有管理員權限')
        onLoginError?.('此帳號沒有管理員權限')
        return
      }

      setEmail('')
      setPassword('')
      onLoginSuccess?.(userCredential.user)
    } catch (err) {
      console.error('登入失敗:', err)
      let errorMessage = '登入失敗'
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = '找不到此帳號'
          break
        case 'auth/wrong-password':
          errorMessage = '密碼錯誤'
          break
        case 'auth/invalid-email':
          errorMessage = '信箱格式錯誤'
          break
        case 'auth/too-many-requests':
          errorMessage = '登入次數過多，請稍後再試'
          break
        case 'auth/network-request-failed':
          errorMessage = '網路連線失敗，請檢查網路連線'
          break
        default:
          errorMessage = '登入失敗：' + (err.message || '未知錯誤')
      }
      setError(errorMessage)
      onLoginError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  return { email, setEmail, password, setPassword, showPassword, setShowPassword, isLoading, error, handleLogin }
}

export function useAdminGate() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const adminStatus = await checkAdminStatus(user.uid)
          setIsAdmin(adminStatus)
          if (!adminStatus) {
            setTimeout(() => navigate('/'), 3000)
          }
        } catch {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
      setIsLoading(false)
    })

    return unsubscribe
  }, [navigate])

  const handleAdminLogout = async () => {
    try {
      setIsLoading(true)
      const { signOut } = await import('firebase/auth')
      await signOut(auth)
      navigate('/')
    } catch {
      setIsLoading(false)
    }
  }
  return { isAdmin, isLoading, handleAdminLogout }
}

/** 目前登入的人是不是管理員（電子菜單用來決定能不能改） */
export function useCanEdit() {
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setCanEdit(false)
        return
      }
      try {
        setCanEdit(await checkAdminStatus(user.uid))
      } catch {
        setCanEdit(false)
      }
    })

    return unsubscribe
  }, [])
  return { canEdit }
}
