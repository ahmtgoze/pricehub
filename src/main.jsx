import React from 'react'
import ReactDOM from 'react-dom/client'
import { vurguRenginiBaslat } from '@/lib/useVurguRengi'
import App from '@/App.jsx'
import '@/index.css'

// Kayitli vurgu rengini ilk boyamadan once uygula (renk atlamasi olmasin)
vurguRenginiBaslat()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
