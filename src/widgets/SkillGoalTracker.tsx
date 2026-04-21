import { useState } from 'react'
import WidgetShell from '../components/WidgetShell'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import usePlayerStore from '../stores/usePlayerStore'
import useMarketStore from '../stores/useMarketStore'
import type { SkillGoal } from '../stores/useMarketStore'
import { xpForLevel, levelForXP, levelProgressPercent } from '../utils/xpCalc'

// ── Add Goal Form ─────────────────────────────────────────────────────────────

interface AddGoalFormProps {
  skills:     string[]
  rsn:        string
  onSubmit:   (goal: Omit<SkillGoal, 'id'>) => void
  onCancel:   () => void
}

function AddGoalForm({ skills, rsn, onSubmit, onCancel }: AddGoalFormProps) {
  const [selectedSkill, setSelectedSkill] = useState(skills[0] ?? '')
  const [targetLevel, setTargetLevel]     = useState(99)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSkill) return
    const clamped = Math.max(2, Math.min(120, targetLevel))
    onSubmit({
      rsn,
      skill:    selectedSkill,
      targetXP: xpForLevel(clamped),
      name:     `Level ${clamped} ${selectedSkill}`,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           8,
        padding:       '10px 12px',
        background:    'var(--bg-raised)',
        border:        '1px solid var(--border)',
        margin:        '8px 12px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        New Goal
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
            Skill
          </label>
          <select
            value={selectedSkill}
            onChange={e => setSelectedSkill(e.target.value)}
            style={{
              width:      '100%',
              background: 'var(--bg-base)',
              border:     '1px solid var(--border)',
              color:      'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize:   11,
              padding:    '3px 6px',
            }}
          >
            {skills.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ width: 64 }}>
          <label style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
            Level
          </label>
          <input
            type="number"
            min={2}
            max={120}
            value={targetLevel}
            onChange={e => setTargetLevel(Number(e.target.value))}
            style={{
              width:      '100%',
              background: 'var(--bg-base)',
              border:     '1px solid var(--border)',
              color:      'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize:   11,
              padding:    '3px 6px',
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize:   10,
            color:      'var(--text-muted)',
            background: 'none',
            border:     '1px solid var(--border-dim)',
            padding:    '3px 10px',
            cursor:     'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize:   10,
            color:      'var(--bg-base)',
            background: 'var(--gold)',
            border:     'none',
            padding:    '3px 10px',
            cursor:     'pointer',
            fontWeight: 600,
          }}
        >
          Add
        </button>
      </div>
    </form>
  )
}

// ── Goal Row ──────────────────────────────────────────────────────────────────

interface GoalRowProps {
  goal:       SkillGoal
  currentXP:  number
  onRemove:   (id: string) => void
}

function GoalRow({ goal, currentXP, onRemove }: GoalRowProps) {
  const pct          = goal.targetXP > 0 ? Math.min(100, (currentXP / goal.targetXP) * 100) : 0
  const currentLevel = levelForXP(currentXP)
  const targetLevel  = levelForXP(goal.targetXP)
  const done         = currentXP >= goal.targetXP

  return (
    <div style={{
      padding:      '8px 12px',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: done ? 'var(--teal)' : 'var(--gold)' }}>
            {goal.skill}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-secondary)', marginLeft: 6 }}>
            Lv {currentLevel} → {targetLevel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: done ? 'var(--teal)' : 'var(--text-primary)', fontWeight: 500 }}>
            {pct.toFixed(1)}%
          </span>
          <button
            onClick={() => onRemove(goal.id)}
            title="Remove goal"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 14 }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--bg-base)', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
        <div style={{
          height:     '100%',
          width:      `${pct}%`,
          background: done ? 'var(--teal)' : 'var(--gold)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
          {currentXP.toLocaleString()} xp
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>
          {goal.targetXP.toLocaleString()} xp
        </span>
      </div>
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────

export default function SkillGoalTracker() {
  const rsn = usePlayerStore(s => s.primaryRSN)
  const { data, isLoading, isError, error, dataUpdatedAt } = usePlayerProfile(rsn)

  const allGoals   = useMarketStore(s => s.goals)
  const addGoal    = useMarketStore(s => s.addGoal)
  const removeGoal = useMarketStore(s => s.removeGoal)
  const goals      = allGoals.filter(g => g.rsn === rsn)

  const [formOpen, setFormOpen] = useState(false)

  const skillNames = data?.skills
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(s => s.name) ?? []

  function handleAdd(partial: Omit<SkillGoal, 'id'>) {
    addGoal({ ...partial, id: crypto.randomUUID() })
    setFormOpen(false)
  }

  return (
    <WidgetShell
      title="Skill Goals"
      refreshKeys={[['player', 'profile', rsn]]}
      isLoading={isLoading}
      isError={isError}
      error={error}
      dataUpdatedAt={dataUpdatedAt}
    >
      {!rsn ? (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          height:         '100%',
          fontFamily:     'var(--font-body)',
          fontSize:       11,
          color:          'var(--text-muted)',
        }}>
          Set a player in Settings to track goals.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Goals list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {goals.length === 0 && !formOpen ? (
              <div style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                height:         '100%',
                gap:            8,
                fontFamily:     'var(--font-body)',
                fontSize:       11,
                color:          'var(--text-muted)',
              }}>
                No goals set.
              </div>
            ) : (
              goals.map(goal => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  currentXP={data?.skills.find(s => s.name === goal.skill)?.xp ?? 0}
                  onRemove={removeGoal}
                />
              ))
            )}
          </div>

          {/* Add goal form or button */}
          {formOpen ? (
            <AddGoalForm
              skills={skillNames}
              rsn={rsn}
              onSubmit={handleAdd}
              onCancel={() => setFormOpen(false)}
            />
          ) : (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-dim)', flexShrink: 0 }}>
              <button
                onClick={() => setFormOpen(true)}
                disabled={!data}
                style={{
                  width:      '100%',
                  background: 'none',
                  border:     '1px dashed var(--border)',
                  color:      data ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontSize:   10,
                  padding:    '5px',
                  cursor:     data ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.05em',
                }}
              >
                + Add Goal
              </button>
            </div>
          )}
        </div>
      )}
    </WidgetShell>
  )
}
