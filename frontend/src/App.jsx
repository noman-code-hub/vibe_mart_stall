import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import OurVibesPage from './pages/OurVibesPage.jsx'
import SellSmartPage from './pages/SellSmartPage.jsx'
import MyAccountPage from './pages/MyAccountPage.jsx'
import MarketPage from './pages/MarketPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ConfirmEmailPage from './pages/ConfirmEmailPage.jsx'
import MyTrolleyPage from './pages/MyTrolleyPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppSplash from './components/AppSplash.jsx'
import './App.css'
import './styles/marketplace.css'
import './styles/responsive.css'

function MarketStallRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/market?stall=${id}` : '/market'} replace />
}

export default function App() {
  return (
    <>
      <AppSplash />
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="our-vibes" element={<OurVibesPage />} />
          <Route path="sell-smart" element={<SellSmartPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="market/:id" element={<MarketStallRedirect />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="confirm-email" element={<ConfirmEmailPage />} />
          <Route path="my-trolley" element={<MyTrolleyPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route
            path="my-account"
            element={
              <ProtectedRoute>
                <MyAccountPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}
