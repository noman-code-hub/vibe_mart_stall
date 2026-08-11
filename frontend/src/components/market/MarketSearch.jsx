/**
 * Search-ready market filter control.
 * Parent owns query state / URL sync / API search params.
 */
export default function MarketSearch({ value, onChange, resultLabel = '' }) {
  return (
    <div className="vm-market-search">
      <label className="vm-market-search__label" htmlFor="market-search">
        Search the market
      </label>
      <input
        id="market-search"
        type="search"
        className="vm-input vm-market-search__input"
        placeholder="Search by stall name or bio…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
      {resultLabel ? <p className="vm-market-search__meta">{resultLabel}</p> : null}
    </div>
  )
}
