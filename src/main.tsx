import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ConfirmProvider } from './components/ui/confirm'
import { Toaster } from './components/ui/sonner'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Point de montage de Pani introuvable.')

createRoot(root).render(
  <StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
    <Toaster />
  </StrictMode>,
)
