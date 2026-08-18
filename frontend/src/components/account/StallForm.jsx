import { useState } from 'react'

/**
 * Reusable create/edit stall form used inside My Account tabs.
 */
export default function StallForm({
  initial = null,
  submitLabel = 'Save stall',
  onSubmit,
  onCancel = null,
  busy = false,
}) {
  const [form, setForm] = useState(() => ({
    brand_name: initial?.brand_name || '',
    seller_bio: initial?.seller_bio || '',
    ambition: initial?.ambition || '',
    pitch_number: initial?.pitch_number || '',
    pitch_location: initial?.pitch_location || '',
    member_since: initial?.member_since || '',
    status: initial?.status === 'published' ? 'published' : 'draft',
  }))

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onSubmit(form)
  }

  return (
    <form className="vm-panel vm-stall-form" onSubmit={handleSubmit}>
      <div className="vm-auth__grid">
        <label className="vm-field vm-field--span">
          Stall / brand name
          <input
            className="vm-input"
            name="brand_name"
            value={form.brand_name}
            onChange={onChange}
            placeholder="e.g. Olive & Oak"
          />
        </label>
        <label className="vm-field vm-field--span">
          Seller bio
          <textarea
            className="vm-input vm-textarea"
            name="seller_bio"
            rows={3}
            value={form.seller_bio}
            onChange={onChange}
            placeholder="Who you are and what you sell"
          />
        </label>
        <label className="vm-field vm-field--span">
          Ambition
          <textarea
            className="vm-input vm-textarea"
            name="ambition"
            rows={2}
            value={form.ambition}
            onChange={onChange}
            placeholder="What you’re building toward"
          />
        </label>
        <label className="vm-field">
          Pitch number (assigned automatically)
          <input
            className="vm-input"
            name="pitch_number"
            value={form.pitch_number}
            readOnly
            placeholder="VM2026A"
            title="Assigned automatically when you join"
          />
        </label>
        <label className="vm-field">
          Pitch location
          <input
            className="vm-input"
            name="pitch_location"
            value={form.pitch_location}
            onChange={onChange}
            placeholder="Market / aisle"
          />
        </label>
        <label className="vm-field">
          Member since
          <input
            className="vm-input"
            name="member_since"
            value={form.member_since}
            onChange={onChange}
            placeholder="21-5-2020"
          />
        </label>
        <label className="vm-field">
          Status
          <select className="vm-input" name="status" value={form.status} onChange={onChange}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      <div className="vm-toolbar">
        <button className="vm-btn vm-btn--primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button className="vm-btn vm-btn--ghost" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
