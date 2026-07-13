import React from 'react'
import ReactDOM from 'react-dom/client'
import EmployeeApp from '../src/EmployeeApp'
import { LanguageProvider } from '../src/contexts/LanguageContext'
import '../src/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <EmployeeApp />
    </LanguageProvider>
  </React.StrictMode>,
)
