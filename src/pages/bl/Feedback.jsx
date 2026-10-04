import { Skel, ToolPage } from '../../components/bl/shared'
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from '../../services/feedbackService'
import { CAN_ENTER_SEND, STORE_OPTIONS, bodyWithoutTitle, formatTime, submitOnEnter, useComposer, useFeedbackCenter, usePhotoField, useThread } from '../useFeedback'
import '../../styles/bl-feedback.css'

// 新版回饋（/home/feedback）。訂閱、投票、發文、留言與管理員操作都在 useFeedback（跟 Club 版共用），這裡只有畫面。

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const UP = 'M6 15l6-6 6 6'
const CLOSE = 'M6 6l12 12M18 6L6 18'

const Status = ({ status }) => <em className={`st ${FEEDBACK_STATUSES[status] ? status : 'reviewing'}`}>{(FEEDBACK_STATUSES[status] || FEEDBACK_STATUSES.reviewing).label}</em>

function Vote({ feedback, clientId, busy, onVote }) {
  const voted = Array.isArray(feedback.voterIds) && feedback.voterIds.includes(clientId)
  return (
    <button
      type="button"
      className="vote"
      disabled={busy}
      aria-pressed={voted}
      aria-label={voted ? '取消我也需要' : '我也需要'}
      onClick={(e) => {
        e.stopPropagation()
        onVote(feedback.id)
      }}
    >
      <Icon d={UP} size={16} />
      <b>{Number(feedback.voteCount) || 0}</b>
    </button>
  )
}

function Identity({ identity, onChange }) {
  return (
    <div className="ident">
      <label>
        <span>你的暱稱</span>
        <input value={identity.name} onChange={(e) => onChange({ ...identity, name: e.target.value })} maxLength={30} autoComplete="nickname" placeholder="暱稱" />
      </label>
      <label>
        <span>分店</span>
        <select value={identity.store} onChange={(e) => onChange({ ...identity, store: e.target.value })}>
          <option value="">請選擇</option>
          {STORE_OPTIONS.map((store) => (
            <option key={store} value={store}>
              {store}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function PhotoField({ photo, onChange, disabled }) {
  const { inputRef, error, busy, preview, pick, clear } = usePhotoField({ photo, onChange })
  return (
    <div className="photo">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      {preview ? (
        <span>
          <img src={preview} alt="待上傳的照片預覽" />
          <button type="button" onClick={clear} disabled={disabled} aria-label="移除照片">
            <Icon d={CLOSE} size={14} />
          </button>
        </span>
      ) : (
        <button type="button" className="btn" onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
          {busy ? '處理中…' : '加照片'}
        </button>
      )}
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const Photo = ({ url }) =>
  url ? (
    <a className="shot" href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="附加照片" loading="lazy" />
    </a>
  ) : null

function Composer({ open, onClose, onCreated, identity, setIdentity, clientId }) {
  const { form, setForm, photo, setPhoto, error, saving, panelRef, submit } = useComposer({ open, onClose, onCreated, identity, clientId })
  if (!open) return null
  return (
    <div className="sheet-layer">
      <button type="button" className="veil" aria-label="關閉新增回饋" onClick={onClose} />
      <section ref={panelRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="fb-new-title">
        <header>
          <h2 id="fb-new-title">新增回饋</h2>
          <button type="button" className="round" onClick={onClose} aria-label="關閉">
            <Icon d={CLOSE} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="body">
            <fieldset>
              <legend>回饋類型</legend>
              <div className="pills">
                {Object.entries(FEEDBACK_CATEGORIES).map(([key, value]) => (
                  <button key={key} type="button" aria-pressed={form.category === key} onClick={() => setForm({ ...form, category: key })}>
                    {value.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              <span>標題（選填）</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} placeholder="留空就自動抓內文第一行" />
            </label>
            <label>
              <span>
                詳細說明 <i>{form.body.length}/2000</i>
              </span>
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={2000} rows={7} placeholder="你原本想完成什麼？目前發生什麼？如果是功能許願，希望它怎麼運作？" />
            </label>
            <div className="lab">
              <span>照片（選填）</span>
              <PhotoField photo={photo} onChange={setPhoto} disabled={saving} />
            </div>
            <Identity identity={identity} onChange={setIdentity} />
            {error ? (
              <p className="err" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <footer>
            <button type="button" className="btn ghost" onClick={onClose}>
              稍後再說
            </button>
            <button type="submit" className="btn pri" disabled={saving}>
              {saving ? '送出中…' : '送出回饋'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function Thread({ feedback, comments, commentsLoading, identity, setIdentity, clientId, isAdmin, onBack, onDeleted, onVote, voteBusy }) {
  const t = useThread({ feedback, identity, clientId, isAdmin, onDeleted })
  if (!feedback) return null
  const category = FEEDBACK_CATEGORIES[feedback.category] || FEEDBACK_CATEGORIES.discussion
  const body = bodyWithoutTitle(feedback)
  return (
    <article className="thread">
      <button type="button" className="back" onClick={onBack}>
        ← 返回列表
      </button>
      <div className="head">
        <Vote feedback={feedback} clientId={clientId} busy={voteBusy} onVote={onVote} />
        <div>
          <p className="kind">
            {category.label}
            <Status status={feedback.status} />
          </p>
          <h2>{feedback.title}</h2>
          <p className="meta">
            {feedback.author?.name || '匿名'}・{feedback.author?.store || '未提供分店'}・{formatTime(feedback.createdAt)}
          </p>
        </div>
      </div>
      {body ? <p className="text">{body}</p> : null}
      <Photo url={feedback.photoUrl} />
      {isAdmin ? (
        <div className="admin">
          <label>
            <span>管理員：處理狀態</span>
            <select value={feedback.status || 'reviewing'} disabled={t.statusBusy || t.deletingFeedback} onChange={t.changeStatus}>
              {Object.entries(FEEDBACK_STATUSES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn danger" disabled={t.deletingFeedback} onClick={t.removeFeedback}>
            {t.deletingFeedback ? '刪除中…' : '刪除這則回饋'}
          </button>
        </div>
      ) : null}

      <h3>
        討論串 <small>{comments.length} 則留言</small>
      </h3>
      {commentsLoading ? (
        <Skel lines={3} label="留言讀取中" />
      ) : comments.length === 0 ? (
        <p className="quiet">還沒有人留言。補充使用情境，或告訴大家你也遇到了。</p>
      ) : (
        <div className="talk">
          {comments.map((item) => (
            <div key={item.id} className={item.authorClientId === clientId ? 'mine' : ''}>
              <p className="who">
                <b>{item.author?.name || '匿名'}</b>
                {item.author?.store || '未提供分店'}・{formatTime(item.createdAt)}
                {isAdmin ? (
                  <button type="button" disabled={t.deletingCommentId === item.id} onClick={() => t.removeComment(item)} aria-label={`刪除 ${item.author?.name || '匿名'} 的留言`}>
                    {t.deletingCommentId === item.id ? '刪除中…' : '刪除'}
                  </button>
                ) : null}
              </p>
              {item.body ? <p className="text">{item.body}</p> : null}
              <Photo url={item.photoUrl} />
            </div>
          ))}
        </div>
      )}

      <form className="reply" onSubmit={t.submitComment}>
        <Identity identity={identity} onChange={setIdentity} />
        <label>
          <span>{isAdmin ? '以管理員身分回覆' : '加入討論'}</span>
          <textarea value={t.comment} onChange={(e) => t.setComment(e.target.value)} onKeyDown={submitOnEnter} maxLength={1000} rows={3} placeholder="寫下補充、使用情境或建議…" />
        </label>
        {t.error ? (
          <p className="err" role="alert">
            {t.error}
          </p>
        ) : null}
        <div className="send">
          <PhotoField photo={t.commentPhoto} onChange={t.setCommentPhoto} disabled={t.sending} />
          {CAN_ENTER_SEND ? <small>Enter 送出・Shift+Enter 換行</small> : null}
          <button type="submit" className="btn pri" disabled={t.sending}>
            {t.sending ? '送出中…' : '送出留言'}
          </button>
        </div>
      </form>
    </article>
  )
}

export default function Feedback() {
  const m = useFeedbackCenter()
  const { selected, visibleItems, feedbackItems } = m
  return (
    <ToolPage
      className="bl-feedback"
      path="/feedback"
      section="系統"
      title="回饋"
      titleExtra={
        <button type="button" className="btn pri new" onClick={() => m.setComposerOpen(true)}>
          ＋ 新增回饋
        </button>
      }
    >
      <div className={`fb${selected ? ' has-sel' : ''}`}>
        <section className="list" aria-label="回饋列表">
          <div className="tabs" role="group" aria-label="回饋類型">
            {[['all', '全部'], ...Object.entries(FEEDBACK_CATEGORIES).map(([key, value]) => [key, value.shortLabel])].map(([key, label]) => (
              <button key={key} type="button" aria-pressed={m.category === key} onClick={() => m.setCategory(key)}>
                {label}
              </button>
            ))}
            {m.isAdmin ? <em className="st completed">管理員模式</em> : null}
          </div>
          <div className="bar">
            <input type="search" aria-label="搜尋回饋" placeholder="搜尋回饋…" value={m.search} onChange={(e) => m.setSearch(e.target.value)} />
            <select aria-label="排序" value={m.sort} onChange={(e) => m.setSort(e.target.value)}>
              <option value="newest">最新</option>
              <option value="votes">最多人需要</option>
              <option value="active">最多討論</option>
            </select>
          </div>
          {m.loadError ? (
            <p className="err" role="alert">
              {m.loadError}
            </p>
          ) : null}
          {m.loading && !m.loadingSlow ? (
            <Skel lines={6} label="回饋讀取中" />
          ) : m.loading ? (
            <p className="quiet">
              連線比較慢，還在試…
              <button type="button" className="btn retry" onClick={m.retryLoad}>
                重試
              </button>
            </p>
          ) : visibleItems.length === 0 ? (
            <div className="quiet">
              <b>{feedbackItems.length === 0 ? '第一則回饋，就從你開始' : '找不到符合的回饋'}</b>
              {feedbackItems.length === 0 ? '提出你希望改善的地方，其他人就能加入討論。' : '換個關鍵字或清除篩選條件再看看。'}
            </div>
          ) : (
            <ul className="bl-stagger">
              {visibleItems.map((item) => {
                const body = bodyWithoutTitle(item)
                return (
                  <li key={item.id} className={m.selectedId === item.id ? 'on' : ''}>
                    <Vote feedback={item} clientId={m.clientId} busy={m.voteBusy.has(item.id)} onVote={m.handleVote} />
                    <button type="button" className="open" onClick={() => m.setSelectedId(item.id)} aria-label={`查看回饋：${item.title}`}>
                      <span className="kind">
                        {(FEEDBACK_CATEGORIES[item.category] || FEEDBACK_CATEGORIES.discussion).label}
                        <Status status={item.status} />
                      </span>
                      <b>{item.title}</b>
                      {body ? <span className="snip">{body}</span> : null}
                      <span className="meta">
                        {item.author?.name || '匿名'}・{item.author?.store || '未提供分店'}・{Number(item.commentCount) || 0} 則留言{item.photoUrl ? '・有照片' : ''}・{formatTime(item.createdAt)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="detail" aria-label="回饋內容">
          {selected ? (
            <Thread
              feedback={selected}
              comments={m.comments}
              commentsLoading={m.commentsLoading}
              identity={m.identity}
              setIdentity={m.setIdentity}
              clientId={m.clientId}
              isAdmin={m.isAdmin}
              onBack={() => m.setSelectedId(null)}
              onDeleted={() => m.setSelectedId(null)}
              onVote={m.handleVote}
              voteBusy={m.voteBusy.has(selected.id)}
            />
          ) : (
            <div className="pick">
              <b>選一則回饋加入討論</b>
              看看其他門市遇到的情況，按「我也需要」或補充你的使用經驗。
            </div>
          )}
        </section>
      </div>
      <Composer open={m.composerOpen} onClose={() => m.setComposerOpen(false)} onCreated={m.setSelectedId} identity={m.identity} setIdentity={m.setIdentity} clientId={m.clientId} />
    </ToolPage>
  )
}
