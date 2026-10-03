import { ToolPage } from '../../components/bl/shared'
import { MONTH_OPTIONS, STORE_OPTIONS, getDaysInMonth, getStoreTemplateName, getStoreZipPrefix, useDailyReportGenerator } from '../useDailyReportGenerator'
import '../../styles/bl-tools.css'

// 新版報表生成器（/home/daily-reports）。下載和打包都是舊版那一份邏輯，這裡只換畫面。
export default function Reports() {
  const m = useDailyReportGenerator()
  const { selectedStore, selectedMonth, customTarget, customMonth, customYear, templateSource, uploadedTemplate, customStatus } = m
  const prefix = getStoreZipPrefix(selectedStore)
  const year = parseInt(customYear, 10)
  const days = Number.isFinite(year) ? getDaysInMonth(year, parseInt(customMonth, 10)) : null

  return (
    <ToolPage className="bl-x bl-reports" path="/daily-reports" section="庫存與報表" title="報表生成器">
      <div className="tabs" role="group" aria-label="分店">
        {STORE_OPTIONS.map((s) => (
          <button key={s.value} type="button" aria-pressed={selectedStore === s.value} onClick={() => m.setSelectedStore(s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="split even">
        <section className="card">
          <div className="hd">
            <h2>下載現成的</h2>
            <small>一個月一包，裡面每天一份日結表</small>
          </div>
          <div className="months" role="group" aria-label="月份">
            {MONTH_OPTIONS.map((o) => (
              <button key={o.value} type="button" aria-pressed={selectedMonth === o.value} onClick={() => m.setSelectedMonth(o.value)}>
                <b>{o.value}</b>月
              </button>
            ))}
          </div>
          <button type="button" className="go" disabled={!selectedMonth} onClick={m.handleDownload}>
            {selectedMonth ? `下載${m.selectedStoreLabel} ${m.selectedMonthLabel}` : '先選月份'}
          </button>
          <p className="file">{selectedMonth ? `${prefix}_${selectedMonth}_Month.zip` : ' '}</p>
        </section>

        <section className="card">
          <div className="hd">
            <h2>自己打包</h2>
            <small>換年份或換樣板時用，在這台裝置上產生</small>
          </div>
          <div className="field">
            <span>範圍</span>
            <div className="pills">
              <button type="button" aria-pressed={customTarget === 'month'} onClick={() => m.setCustomTarget('month')}>
                單月
              </button>
              <button type="button" aria-pressed={customTarget === 'year'} onClick={() => m.setCustomTarget('year')}>
                整年
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="rp-year">年份</label>
            <input id="rp-year" type="number" inputMode="numeric" min="2000" max="2100" value={customYear} onChange={(e) => m.setCustomYear(e.target.value)} />
            {customTarget === 'month' ? (
              <>
                <label htmlFor="rp-month">月份</label>
                <select id="rp-month" value={customMonth} onChange={(e) => m.setCustomMonth(e.target.value)}>
                  {MONTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
          <div className="field">
            <span>樣板</span>
            <div className="pills">
              <button type="button" aria-pressed={templateSource === 'default'} onClick={() => m.setTemplateSource('default')}>
                預設
              </button>
              <button type="button" aria-pressed={templateSource === 'upload'} onClick={() => m.setTemplateSource('upload')}>
                自己上傳
              </button>
            </div>
          </div>
          {templateSource === 'upload' ? (
            <label className="upload">
              <input type="file" accept=".numbers,application/zip" onChange={(e) => m.setUploadedTemplate(e.target.files?.[0] || null)} />
              <b>{uploadedTemplate ? uploadedTemplate.name : '選一個 .numbers 檔'}</b>
              <span>{uploadedTemplate ? '換一個' : '瀏覽'}</span>
            </label>
          ) : (
            <p className="file">{getStoreTemplateName(selectedStore)}</p>
          )}
          <button type="button" className="go" disabled={m.isCustomPacking} onClick={m.handlePackCustom}>
            {m.isCustomPacking ? '打包中…' : customTarget === 'year' ? `打包 ${customYear} 整年` : `打包 ${customYear} 年 ${customMonth} 月`}
          </button>
          <p className={`file ${customStatus.type}`} role="status">
            {customStatus.message || (customTarget === 'year' ? `${prefix}_${customYear}_Year_Package.zip，12 包` : `${prefix}_${customMonth}_Month.zip${days ? `，${days} 份` : ''}`)}
          </p>
        </section>
      </div>
    </ToolPage>
  )
}
