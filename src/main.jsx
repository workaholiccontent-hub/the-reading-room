import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-body)',
              background: 'var(--ink)',
              color: 'var(--paper)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#c9a84c', secondary: '#1a1612' } },
            error:   { iconTheme: { primary: '#b85c38', secondary: '#faf7f2' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
