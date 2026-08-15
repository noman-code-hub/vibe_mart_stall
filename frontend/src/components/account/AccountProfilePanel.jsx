import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import DashboardTraderMenu from './DashboardTraderMenu.jsx'
import accountArt from '../../assets/ACCOUNT PAGE .png'
import './AccountProfilePanel.css'

const INITIAL = {
  first_name: '',
  last_name: '',
  display_name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  password_confirm: '',
  date_of_birth: '',
  over_17: false,
  town: '',
  county: '',
  country: '',
  terms_accepted: false,
  selling_rules_accepted: false,
  privacy_accepted: false,
}

export default function AccountProfilePanel() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      display_name: user.display_name || user.username || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      password_confirm: '',
      date_of_birth: user.date_of_birth || '',
      over_17: Boolean(user.over_17),
      town: user.town || '',
      county: user.county || '',
      country: user.country || '',
      terms_accepted: Boolean(user.terms_accepted),
      selling_rules_accepted: Boolean(user.selling_rules_accepted),
      privacy_accepted: Boolean(user.privacy_accepted),
    })
  }, [user])

  const onChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (error) setError('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First name and last name are required.')
      return
    }
    if (!form.display_name.trim()) {
      setError('Display name is required.')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }
    if (!form.phone.trim()) {
      setError('Mobile number is required.')
      return
    }
    if (!form.date_of_birth) {
      setError('Date of birth is required.')
      return
    }
    if (!form.over_17) {
      setError('Please confirm you are over 17.')
      return
    }
    if (!form.town.trim() || !form.county.trim() || !form.country.trim()) {
      setError('Town, county, and country are required.')
      return
    }
    if (!form.terms_accepted || !form.selling_rules_accepted || !form.privacy_accepted) {
      setError('Please accept all terms to continue.')
      return
    }
    if (form.password || form.password_confirm) {
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (form.password !== form.password_confirm) {
        setError('Passwords do not match.')
        return
      }
    }

    setBusy(true)
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        display_name: form.display_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth,
        over_17: form.over_17,
        town: form.town.trim(),
        county: form.county.trim(),
        country: form.country.trim(),
        terms_accepted: form.terms_accepted,
        selling_rules_accepted: form.selling_rules_accepted,
        privacy_accepted: form.privacy_accepted,
        profile_complete: true,
      }
      if (form.password) payload.password = form.password
      await updateProfile(payload)
      navigate('/my-account?tab=create', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not save profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="vm-account-profile" aria-label="My Account profile">
      {user?.profile_complete ? <DashboardTraderMenu variant="profile" /> : null}
      <form className="vm-account-profile__stage" onSubmit={onSubmit} noValidate>
        <img
          className="vm-account-profile__art"
          src={accountArt}
          alt=""
          draggable={false}
        />

        <div className="vm-account-profile__fields">
          <h1 className="vm-account-profile__sr">My Account</h1>

          <input
            className="vm-account-profile__input vm-account-profile__input--first"
            name="first_name"
            value={form.first_name}
            onChange={onChange}
            required
            autoComplete="given-name"
            aria-label="First name"
            placeholder="First name"
          />
          <input
            className="vm-account-profile__input vm-account-profile__input--last"
            name="last_name"
            value={form.last_name}
            onChange={onChange}
            required
            autoComplete="family-name"
            aria-label="Last name"
            placeholder="Last name"
          />
          <input
            className="vm-account-profile__input vm-account-profile__input--display"
            name="display_name"
            value={form.display_name}
            onChange={onChange}
            required
            autoComplete="nickname"
            aria-label="Display name shown on stall"
            placeholder="Display name"
          />
          <input
            className="vm-account-profile__input vm-account-profile__input--username"
            name="username"
            value={form.username}
            readOnly
            aria-label="Username"
            placeholder="Username"
          />
          <input
            className="vm-account-profile__input vm-account-profile__input--email"
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            autoComplete="email"
            aria-label="Email address"
            placeholder="Email"
          />
          <input
            className="vm-account-profile__input vm-account-profile__input--phone"
            name="phone"
            value={form.phone}
            onChange={onChange}
            required
            autoComplete="tel"
            aria-label="Mobile number"
            placeholder="Mobile number"
          />
          <div className="vm-account-profile__pass-wrap vm-account-profile__input--password">
            <input
              className="vm-account-profile__input"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
              aria-label="Password optional"
              placeholder="Password (optional)"
            />
            <button
              type="button"
              className="vm-account-profile__pass-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            className="vm-account-profile__input vm-account-profile__input--password-confirm"
            type={showPassword ? 'text' : 'password'}
            name="password_confirm"
            value={form.password_confirm}
            onChange={onChange}
            autoComplete="new-password"
            aria-label="Confirm password"
            placeholder="Confirm password"
          />

          <input
            className="vm-account-profile__input vm-account-profile__input--dob"
            type="date"
            name="date_of_birth"
            value={form.date_of_birth}
            onChange={onChange}
            required
            aria-label="Date of birth"
          />
          <label className="vm-account-profile__check vm-account-profile__check--over17">
            <input
              type="checkbox"
              name="over_17"
              checked={form.over_17}
              onChange={onChange}
              required
            />
            <span className="vm-account-profile__sr">I am over 17</span>
          </label>

          <input
            className="vm-account-profile__input vm-account-profile__input--town"
            name="town"
            value={form.town}
            onChange={onChange}
            required
            aria-label="Town or city"
            placeholder="Town / City"
          />
          <input
            className="vm-account-profile__input vm-account-profile__input--county"
            name="county"
            value={form.county}
            onChange={onChange}
            required
            aria-label="County"
            placeholder="County"
          />
          <input
            className="vm-account-profile__input vm-account-profile__input--country"
            name="country"
            value={form.country}
            onChange={onChange}
            required
            aria-label="Country"
            placeholder="Country"
          />

          <label className="vm-account-profile__check vm-account-profile__check--terms">
            <input
              type="checkbox"
              name="terms_accepted"
              checked={form.terms_accepted}
              onChange={onChange}
              required
            />
            <span className="vm-account-profile__sr">I agree to the Terms &amp; Conditions</span>
          </label>
          <label className="vm-account-profile__check vm-account-profile__check--rules">
            <input
              type="checkbox"
              name="selling_rules_accepted"
              checked={form.selling_rules_accepted}
              onChange={onChange}
              required
            />
            <span className="vm-account-profile__sr">I agree to the Marketplace Selling Rules</span>
          </label>
          <label className="vm-account-profile__check vm-account-profile__check--privacy">
            <input
              type="checkbox"
              name="privacy_accepted"
              checked={form.privacy_accepted}
              onChange={onChange}
              required
            />
            <span className="vm-account-profile__sr">I agree to the Privacy Policy</span>
          </label>

          {error ? (
            <p className="vm-account-profile__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="vm-account-profile__stall"
            disabled={busy}
            aria-label={busy ? 'Saving profile' : 'Create my free stall'}
          />
        </div>
      </form>
    </section>
  )
}
