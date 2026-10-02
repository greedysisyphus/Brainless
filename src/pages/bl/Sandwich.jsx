import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { ToolPage } from '../../components/bl/shared'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import zhtw from '../../locales/zh-TW'
import { calculateSandwichPlan, normalizeThickSettings, normalizeThickValues } from '../../services/sandwichCalculator'
import { db } from '../../utils/firebase'
import '../../styles/bl-sandwich.css'

// 儲存位置跟舊版厚片計算器完全相同（localStorage 的 key、Firestore 的 settings/sandwich_{店}），
// 兩版並存期間在哪一版輸入，另一版都看得到。
const DEFAULT_SETTINGS = { slicesPerLoaf: 10, targetSignature: 60, targetDark: 30, targetLight: 30 }
const DEFAULT_VALUES = { existingSignature: '', existingDark: '', existingLight: '', packMode: 'up', distribution: 'even' }
const TYPES = [
  ['Signature', '招牌'],
  ['Dark', '深焙'],
  ['Light', '淺焙'],
]
const STORES = [
  ['central', zhtw.sandwich.storeCentral],
  ['d7', zhtw.sandwich.storeD7],
  ['d13', zhtw.sandwich.storeD13],
]
const DISTRIBUTIONS = [
  ['even', zhtw.sandwich.distributionEven],
  ['signature', zhtw.sandwich.distributionSignature],
  ['dark', zhtw.sandwich.distributionDark],
  ['light', zhtw.sandwich.distributionLight],
]
const SETTING_FIELDS = [
  ['slicesPerLoaf', zhtw.settings.slicesPerLoaf, 1],
  ['targetSignature', zhtw.settings.targetSignature, 0],
  ['targetDark', zhtw.settings.targetDark, 0],
  ['targetLight', zhtw.settings.targetLight, 0],
]

const Icon = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

function Chips({ label, options, value, onChange }) {
  return (
    <div className="choice">
      <span className="label">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {options.map(([key, text, disabled]) => (
          <button key={key} type="button" aria-pressed={key === value} disabled={disabled} onClick={() => onChange(key)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 一家店的計算器。由外層用 key={store} 重掛，所以 localStorage 的 key 在這裡是固定的。 */
function Calculator({ store }) {
  const [rawValues, setValues] = useLocalStorage(`sandwich_values_${store}`, DEFAULT_VALUES)
  const [rawSettings, setSettings] = useLocalStorage(`sandwich_settings_${store}`, DEFAULT_SETTINGS)
  const values = normalizeThickValues(rawValues, DEFAULT_VALUES)
  const settings = normalizeThickSettings(rawSettings, DEFAULT_SETTINGS)
  const [syncNote, setSyncNote] = useState('')
  const [draft, setDraft] = useState(null) // 展開「調整」時的設定草稿

  // 目標量由雲端同步；連不上就沿用這台裝置上次的設定
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', `sandwich_${store}`),
      (snapshot) => {
        if (snapshot.exists()) setSettings(normalizeThickSettings(snapshot.data(), DEFAULT_SETTINGS))
        setSyncNote('')
      },
      () => setSyncNote('連不上雲端，先用這台裝置上次的目標量。')
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSettings 每次 render 都是同一個 setter
  }, [store])

  const plan = calculateSandwichPlan(values, settings)
  const total = plan.totalSignatureNeeded + plan.totalDarkNeeded + plan.totalLightNeeded
  const set = (patch) => setValues({ ...values, ...patch })

  // 無法少做時自動回到多做
  useEffect(() => {
    if (values.packMode === 'down' && !plan.canPackDown) set({ packMode: 'up' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只看這兩個條件
  }, [values.packMode, plan.canPackDown])

  const saveSettings = async () => {
    const next = normalizeThickSettings(draft, DEFAULT_SETTINGS)
    setSettings(next)
    setDraft(null)
    try {
      await setDoc(doc(db, 'settings', `sandwich_${store}`), next)
    } catch {
      setSyncNote('目標量存到這台裝置了，但沒同步到雲端。')
    }
  }

  return (
    <>
      <div className="split">
        <form onSubmit={(e) => e.preventDefault()}>
          {syncNote ? <p className="sync" role="status">{syncNote}</p> : null}
          {TYPES.map(([key, name], k) => {
            const field = `existing${key}`
            const have = Math.max(0, parseInt(values[field], 10) || 0)
            return (
              <div className="field" key={key} style={{ '--k': k }}>
                <label htmlFor={`bl-${field}`}>{name}厚片</label>
                <small id={`bl-${field}-hint`}>現有幾片？目標 {settings[`target${key}`]}</small>
                <div className="step">
                  <button type="button" aria-label={`${name}減一`} onClick={() => set({ [field]: String(Math.max(0, have - 1)) })}>
                    <Icon d="M6 12h12" />
                  </button>
                  <input
                    id={`bl-${field}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    aria-describedby={`bl-${field}-hint`}
                    value={values[field]}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => set({ [field]: e.target.value })}
                  />
                  <button type="button" aria-label={`${name}加一`} onClick={() => set({ [field]: String(have + 1) })}>
                    <Icon d="M6 12h12M12 6v12" />
                  </button>
                </div>
              </div>
            )
          })}

          <Chips
            label={zhtw.sandwich.packModeLabel}
            value={values.packMode}
            onChange={(packMode) => set({ packMode })}
            options={[
              ['up', `${zhtw.sandwich.packModeUp}（${plan.packUpSlices} 片／${plan.bagsCeil} 條）`],
              ['down', `${zhtw.sandwich.packModeDown}（${plan.packDownSlices} 片／${plan.bagsFloor} 條）`, !plan.canPackDown],
            ]}
          />
          <Chips label="多出來的給誰" value={values.distribution} onChange={(distribution) => set({ distribution })} options={DISTRIBUTIONS} />

          <details open={Boolean(draft)} onToggle={(e) => setDraft(e.currentTarget.open ? draft || settings : null)}>
            <summary>
              <span>
                目標 招牌 {settings.targetSignature}・深焙 {settings.targetDark}・淺焙 {settings.targetLight}，一條 {settings.slicesPerLoaf} 片
              </span>
              <u>調整</u>
            </summary>
            {draft ? (
              <>
                <div className="sets">
                  {SETTING_FIELDS.map(([key, label, min]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={min}
                        value={draft[key]}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <button type="button" className="save" onClick={saveSettings}>
                  {zhtw.settings.done}（三家店的同事都會看到）
                </button>
              </>
            ) : null}
          </details>
          <button type="button" className="reset" onClick={() => setValues(DEFAULT_VALUES)}>
            {zhtw.sandwich.reset}
          </button>
        </form>

        <section className="result" aria-live="polite" aria-label={zhtw.sandwich.resultsTitle}>
          <span className="label">需要的吐司</span>
          <div className="hero">
            <b>{plan.bagsNeeded}</b>
            <span>條</span>
            <p>
              共 <b>{total}</b> 片
              <br />
              {plan.bagsNeeded} 條 × {settings.slicesPerLoaf} 片
            </p>
          </div>
          {TYPES.map(([key, name]) => {
            const target = settings[`target${key}`]
            const have = Math.max(0, parseInt(values[`existing${key}`], 10) || 0)
            const make = plan[`total${key}Needed`]
            const extra = plan[`extra${key}`]
            const scale = Math.max(target, have + make, 1)
            return (
              <div className="line" key={key}>
                <h3>{name}</h3>
                <div className="bar" role="img" aria-label={`${name}：現有 ${have} 片，這次做 ${make} 片，目標 ${target} 片`}>
                  <i className="have" style={{ flexBasis: `${(have / scale) * 100}%` }} />
                  <i className="todo" style={{ flexBasis: `${(make / scale) * 100}%` }} />
                </div>
                <div className="make">
                  {make}
                  <i>片</i>
                </div>
                <small>
                  現有 {have}　目標 {target}
                  {extra ? `　多做 ${extra}` : ''}
                  {have + make < target ? `　還差 ${target - have - make}` : ''}
                </small>
              </div>
            )
          })}
          <p className={`verdict${plan.shortfall > 0 ? ' warn' : ''}`}>
            {plan.baseTotalNeeded === 0 ? (
              '現有的已經夠了，今天不用做。'
            ) : plan.shortfall > 0 ? (
              <>
                少做會不足 <b>{plan.shortfall}</b> 片。
              </>
            ) : plan.extraSlices > 0 ? (
              <>
                整條開下去會多出 <b>{plan.extraSlices}</b> 片。
              </>
            ) : (
              '剛好整條用完。'
            )}
          </p>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--plum)' }} />
              現有
            </span>
            <span>
              <i style={{ background: 'var(--wash)' }} />
              這次要做
            </span>
          </div>
        </section>
      </div>
      <div className="dock" aria-hidden="true">
        <span>需要吐司</span>
        <b>{plan.bagsNeeded}</b>
        <span>條</span>
        <span>共 {total} 片</span>
      </div>
    </>
  )
}

export default function Sandwich() {
  const [store, setStore] = useState('central')
  return (
    <ToolPage className="bl-sandwich" path="/sandwich" section="門市營運" title={zhtw.sandwich.title}>
      <div className="stores" role="group" aria-label={zhtw.sandwich.selectStore}>
        {STORES.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={key === store} onClick={() => setStore(key)}>
            {label}
          </button>
        ))}
      </div>
      <Calculator key={store} store={store} />
    </ToolPage>
  )
}
