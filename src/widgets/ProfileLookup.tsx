import { useState, useId } from 'react'
import WidgetShell from '../components/WidgetShell'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { usePlayerQuests } from '../hooks/usePlayerQuests'
import usePlayerStore from '../stores/usePlayerStore'
import type { SkillData, QuestEntry, ActivityEntry } from '../api/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatXP(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`
  if (xp >= 1_000)     return `${(xp / 1_000).toFixed(1)}K`
  return String(xp)
}

const DIFFICULTY_LABELS: Record<number, string> = {
  0: 'Novice', 1: 'Intermediate', 2: 'Experienced',
  3: 'Master', 4: 'Grandmaster',  5: 'Special',
}

const DIFFICULTY_COLORS: Record<number, string> = {
  0: '#5cb85c',   // green
  1: '#5bc0de',   // cyan
  2: '#e2b93b',   // gold
  3: '#f0802a',   // orange
  4: '#d9534f',   // red
  5: '#9b59b6',   // purple
}

const QUEST_STATUS_COLOR: Record<QuestEntry['status'], string> = {
  COMPLETED:   'var(--teal)',
  STARTED:     'var(--gold)',
  NOT_STARTED: 'var(--text-muted)',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkillCell({ skill }: { skill: SkillData }) {
  const isMax120 = skill.level >= 120
  const isMax99  = skill.level === 99 && !isMax120
  return (
    <div style={{
      background:    'var(--bg-raised)',
      border:        '1px solid var(--border-dim)',
      padding:       '5px 6px',
      textAlign:     'center',
      display:       'flex',
      flexDirection: 'column',
      gap:           1,
    }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
        {skill.name}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   17,
        fontWeight: 500,
        lineHeight: 1.1,
        color: isMax120 ? 'var(--teal)' : isMax99 ? 'var(--gold)' : 'var(--text-primary)',
      }}>
        {skill.level}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
        {formatXP(skill.xp)}
      </div>
    </div>
  )
}

function SkillsTab({ skills }: { skills: SkillData[] }) {
  const sorted = skills.slice().sort((a, b) => a.id - b.id)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: 4 }}>
      {sorted.map(skill => <SkillCell key={skill.id} skill={skill} />)}
    </div>
  )
}

function QuestsTab({ quests }: { quests: QuestEntry[] }) {
  const [filter, setFilter] = useState<'ALL' | QuestEntry['status']>('ALL')

  const counts = {
    COMPLETED:   quests.filter(q => q.status === 'COMPLETED').length,
    STARTED:     quests.filter(q => q.status === 'STARTED').length,
    NOT_STARTED: quests.filter(q => q.status === 'NOT_STARTED').length,
  }

  const visible = filter === 'ALL' ? quests : quests.filter(q => q.status === filter)

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily:    'var(--font-body)',
    fontSize:      9,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding:       '2px 7px',
    border:        `1px solid ${active ? 'var(--gold)' : 'var(--border-dim)'}`,
    background:    active ? 'rgba(200,146,58,0.12)' : 'transparent',
    color:         active ? 'var(--gold)' : 'var(--text-muted)',
    cursor:        'pointer',
    borderRadius:  2,
  })

  const totalQP = quests.filter(q => q.status === 'COMPLETED').reduce((s, q) => s + q.questPoints, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
        <button style={filterBtnStyle(filter === 'ALL')} onClick={() => setFilter('ALL')}>All ({quests.length})</button>
        <button style={filterBtnStyle(filter === 'COMPLETED')} onClick={() => setFilter('COMPLETED')}>Done ({counts.COMPLETED})</button>
        <button style={filterBtnStyle(filter === 'STARTED')} onClick={() => setFilter('STARTED')}>Started ({counts.STARTED})</button>
        <button style={filterBtnStyle(filter === 'NOT_STARTED')} onClick={() => setFilter('NOT_STARTED')}>Not started ({counts.NOT_STARTED})</button>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{totalQP}</span> QP
        </div>
      </div>

      {/* Quest list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {visible.map((quest, i) => (
          <div
            key={quest.title}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '6px 12px',
              borderBottom: i < visible.length - 1 ? '1px solid var(--border-dim)' : 'none',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: QUEST_STATUS_COLOR[quest.status], flexShrink: 0 }} />
            <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {quest.title}
              {quest.members && (
                <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>P2P</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{
                fontFamily:    'var(--font-body)',
                fontSize:      8,
                color:         DIFFICULTY_COLORS[quest.difficulty] ?? 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {DIFFICULTY_LABELS[quest.difficulty] ?? '—'}
              </span>
              {quest.questPoints > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                  {quest.questPoints}QP
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivitiesTab({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
        No recent activities found.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 0' }}>
      {activities.map((activity, i) => (
        <div
          key={i}
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           2,
            padding:       '8px 14px',
            borderBottom:  i < activities.length - 1 ? '1px solid var(--border-dim)' : 'none',
          }}
        >
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {activity.text}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-secondary)' }}>
              {activity.details}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              {activity.date}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────

type Tab = 'skills' | 'quests' | 'activities'

export default function ProfileLookup() {
  const primaryRSN  = usePlayerStore(s => s.primaryRSN)
  const trackedRSNs = usePlayerStore(s => s.trackedRSNs)

  const [inputValue, setInputValue] = useState(primaryRSN)
  const [lookupRSN, setLookupRSN]   = useState(primaryRSN)
  const [activeTab, setActiveTab]   = useState<Tab>('skills')

  const datalistId = useId()

  const profile = usePlayerProfile(lookupRSN)
  const quests  = usePlayerQuests(lookupRSN)

  function commitSearch() {
    const trimmed = inputValue.trim()
    if (trimmed) setLookupRSN(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitSearch()
  }

  function selectTracked(rsn: string) {
    setInputValue(rsn)
    setLookupRSN(rsn)
  }

  const profileData = profile.data
  const questData   = quests.data ?? []

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    fontFamily:    'var(--font-body)',
    fontSize:      10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding:       '6px 12px',
    border:        'none',
    borderBottom:  `2px solid ${activeTab === tab ? 'var(--gold)' : 'transparent'}`,
    background:    'transparent',
    color:         activeTab === tab ? 'var(--gold)' : 'var(--text-muted)',
    cursor:        'pointer',
    transition:    'color 0.15s, border-color 0.15s',
  })

  return (
    <WidgetShell
      title="Profile Lookup"
      refreshKeys={lookupRSN ? [['player', 'profile', lookupRSN], ['player', 'quests', lookupRSN]] : []}
      isLoading={profile.isLoading}
      isFetching={profile.isFetching || quests.isFetching}
      isError={profile.isError}
      error={profile.error}
      dataUpdatedAt={profile.dataUpdatedAt}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Search bar */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          padding:      '8px 12px',
          borderBottom: '1px solid var(--border-dim)',
          flexShrink:   0,
        }}>
          <input
            list={datalistId}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter RSN…"
            style={{
              flex:        1,
              background:  'var(--bg-raised)',
              border:      '1px solid var(--border-dim)',
              borderRadius: 2,
              padding:     '4px 8px',
              fontFamily:  'var(--font-body)',
              fontSize:    11,
              color:       'var(--text-primary)',
              outline:     'none',
            }}
          />
          <datalist id={datalistId}>
            {trackedRSNs.map(rsn => <option key={rsn} value={rsn} />)}
          </datalist>
          <button
            onClick={commitSearch}
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      10,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding:       '4px 10px',
              background:    'rgba(200,146,58,0.12)',
              border:        '1px solid var(--gold)',
              color:         'var(--gold)',
              borderRadius:  2,
              cursor:        'pointer',
              flexShrink:    0,
            }}
          >
            Search
          </button>
        </div>

        {/* Tracked player chips */}
        {trackedRSNs.length > 0 && (
          <div style={{
            display:    'flex',
            flexWrap:   'wrap',
            gap:        4,
            padding:    '5px 12px',
            borderBottom: '1px solid var(--border-dim)',
            flexShrink: 0,
          }}>
            {trackedRSNs.map(rsn => (
              <button
                key={rsn}
                onClick={() => selectTracked(rsn)}
                style={{
                  fontFamily:    'var(--font-body)',
                  fontSize:      9,
                  padding:       '2px 7px',
                  border:        `1px solid ${lookupRSN === rsn ? 'var(--gold)' : 'var(--border-dim)'}`,
                  background:    lookupRSN === rsn ? 'rgba(200,146,58,0.12)' : 'transparent',
                  color:         lookupRSN === rsn ? 'var(--gold)' : 'var(--text-secondary)',
                  borderRadius:  2,
                  cursor:        'pointer',
                }}
              >
                {rsn}
              </button>
            ))}
          </div>
        )}

        {/* Profile header */}
        {profileData && (
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:           16,
            padding:       '8px 14px',
            borderBottom:  '1px solid var(--border-dim)',
            flexShrink:    0,
            flexWrap:      'wrap',
          }}>
            {/* Online dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   profileData.loggedIn ? '#4caf72' : '#c0392b',
                flexShrink:   0,
                boxShadow:    profileData.loggedIn ? '0 0 5px rgba(76,175,114,0.5)' : 'none',
              }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                {profileData.rsn}
              </span>
            </div>

            {[
              { label: 'Total Level', value: profileData.totalLevel.toLocaleString() },
              { label: 'Combat',      value: String(profileData.combatLevel) },
              { label: 'Total XP',    value: formatXP(profileData.totalXP) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}

            <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: 9, color: profileData.loggedIn ? '#4caf72' : 'var(--text-muted)' }}>
              {profileData.loggedIn ? 'Online' : 'Offline'}
            </div>
          </div>
        )}

        {/* Empty state when no RSN yet */}
        {!lookupRSN && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
            Enter a player name above to look up their profile.
          </div>
        )}

        {/* Tab bar — only shown when profile is loaded */}
        {profileData && (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 }}>
              <button style={tabStyle('skills')}     onClick={() => setActiveTab('skills')}>Skills</button>
              <button style={tabStyle('quests')}     onClick={() => setActiveTab('quests')}>
                Quests{quests.data ? ` (${quests.data.filter(q => q.status === 'COMPLETED').length}/${quests.data.length})` : ''}
              </button>
              <button style={tabStyle('activities')} onClick={() => setActiveTab('activities')}>Activities</button>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: 'auto', padding: activeTab === 'skills' ? '10px 12px' : 0 }}>
              {activeTab === 'skills' && <SkillsTab skills={profileData.skills} />}
              {activeTab === 'quests' && (
                quests.isLoading
                  ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>Loading quests…</div>
                  : <QuestsTab quests={questData} />
              )}
              {activeTab === 'activities' && <ActivitiesTab activities={profileData.activities} />}
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  )
}
