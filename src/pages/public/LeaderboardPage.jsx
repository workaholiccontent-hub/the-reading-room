import { useState } from 'react'
import { useLeaderboard } from '@/hooks/useStats'
import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router-dom'
import styles from './LeaderboardPage.module.css'

const CATEGORIES = [
  {
    key:   'books_read',
    label: 'Most books read',
    icon:  '📚',
    valueKey:   'books_finished',
    valueLabel: 'books finished',
    desc:  'Members ranked by the number of books they\'ve finished.',
  },
  {
    key:   'reviewers',
    label: 'Top reviewers',
    icon:  '✍️',
    valueKey:   'review_count',
    valueLabel: 'reviews written',
    desc:  'Members who contribute the most reviews to the catalogue.',
  },
  {
    key:   'contributors',
    label: 'Club contributors',
    icon:  '💬',
    valueKey:   'post_count',
    valueLabel: 'posts',
    desc:  'Most active voices in book club discussions.',
  },
]

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [category, setCategory] = useState('books_read')
  const { data, loading }       = useLeaderboard(category)
  const { member }              = useAuth()

  const cat    = CATEGORIES.find(c => c.key === category)
  const top3   = data.slice(0, 3)
  const rest   = data.slice(3)
  const myRank = member ? data.findIndex(r => r.id === member.id) + 1 : 0

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.pageHead}>
          <span className={styles.eyebrow}>Community</span>
          <h1 className={styles.title}>Leaderboard</h1>
          <p className={styles.sub}>Our most dedicated readers, reviewers, and contributors.</p>
        </div>

        {/* Category tabs */}
        <div className={styles.tabs}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`${styles.tab} ${category === c.key ? styles.tabActive : ''}`}
              onClick={() => setCategory(c.key)}
            >
              <span className={styles.tabIcon}>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        <p className={styles.catDesc}>{cat?.desc}</p>

        {/* My rank callout */}
        {member && myRank > 0 && (
          <div className={styles.myRank}>
            <span className={styles.myRankLabel}>Your rank</span>
            <span className={styles.myRankValue}>#{myRank}</span>
            <span className={styles.myRankSub}>
              {data[myRank - 1]?.[cat?.valueKey] ?? 0} {cat?.valueLabel}
            </span>
            <Link to="/member/stats" className={styles.myRankLink}>See your full stats →</Link>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingList}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className={styles.empty}>
            <p>No data yet — be the first to climb the ranks!</p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {top3.length >= 3 && (
              <div className={styles.podium}>
                {/* Reorder: 2nd, 1st, 3rd */}
                {[top3[1], top3[0], top3[2]].map((r, displayIdx) => {
                  const actualRank  = displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3
                  const heights     = [140, 180, 120]
                  const isMe        = member && r.id === member.id
                  return (
                    <div
                      key={r.id}
                      className={`${styles.podiumSlot} ${isMe ? styles.podiumMe : ''}`}
                      style={{ '--h': `${heights[displayIdx]}px` }}
                    >
                      <div className={styles.podiumAvatar}>
                        {r.full_name.charAt(0).toUpperCase()}
                        {isMe && <span className={styles.podiumYouBadge}>You</span>}
                      </div>
                      <p className={styles.podiumName}>{r.full_name.split(' ')[0]}</p>
                      <p className={styles.podiumVal}>
                        {r[cat.valueKey]}
                        <span> {cat.valueLabel}</span>
                      </p>
                      <div className={styles.podiumBlock}>
                        <span className={styles.podiumMedal}>{MEDALS[actualRank - 1]}</span>
                        <span className={styles.podiumRank}>#{actualRank}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Rest of the list */}
            {rest.length > 0 && (
              <div className={styles.list}>
                {rest.map((r, i) => {
                  const rank = i + 4
                  const isMe = member && r.id === member.id
                  return (
                    <div key={r.id} className={`${styles.listRow} ${isMe ? styles.listRowMe : ''} animate-fadeUp`}>
                      <span className={styles.listRank}>#{rank}</span>
                      <div className={styles.listAvatar}>
                        {r.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.listInfo}>
                        <span className={styles.listName}>
                          {r.full_name}
                          {isMe && <span className={styles.youBadge}>You</span>}
                        </span>
                        <span className={styles.listMem}>{r.membership_number}</span>
                      </div>
                      <div className={styles.listVal}>
                        <span className={styles.listValNum}>{r[cat.valueKey]}</span>
                        <span className={styles.listValLabel}>{cat.valueLabel}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
