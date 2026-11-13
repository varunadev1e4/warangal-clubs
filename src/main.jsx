import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Home from './Home'
import Admin from './Admin'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/noto-sans-telugu'
import './index.css'

// Visitor counts come from Vercel Analytics (cookie-free). Your own admin visits are not counted.
const skipAdmin = event => (new URL(event.url).pathname.startsWith('/admin') ? null : event)

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
    <Analytics beforeSend={skipAdmin} />
  </BrowserRouter>
)
