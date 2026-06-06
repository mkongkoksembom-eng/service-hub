import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
