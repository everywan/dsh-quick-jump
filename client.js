/**
 * dsh-quick-jump — Client half.
 *
 * Cmd/Ctrl + 1–9 jump to the Nth entry of one ordered list:
 *   "sessions" mode (default): pinned sessions first (most recently pinned
 *   first), then the remaining sessions in sidebar order.
 *   "panels" mode: the sidebar panel rows first, then the same sessions.
 * The mode is a General-settings preference row; every key is a normal
 * application command, so the host's Settings > Shortcuts page rebinds it.
 */
window.__ModuleLoader__.load({
  id: 'dsh-quick-jump',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'quickJump'
    const SLOT_COUNT = 9
    const PREF_KEY = 'dsh.quick-jump.v1'

    const ZH = {
      rowtitle: '数字键直达',
      rowdesc: '按顺序直达侧栏面板与会话。「会话优先」：第 1 个数字是第 1 个置顶会话（没有置顶时是第 1 个会话）；「面板优先」：第 1 个数字是侧栏第 1 个面板。键位可在「设置 › 快捷键」里修改。',
      modeSessions: '会话优先',
      modePanels: '面板优先',
      slot1: '直达第 1 项',
      slot2: '直达第 2 项',
      slot3: '直达第 3 项',
      slot4: '直达第 4 项',
      slot5: '直达第 5 项',
      slot6: '直达第 6 项',
      slot7: '直达第 7 项',
      slot8: '直达第 8 项',
      slot9: '直达第 9 项',
    }

    const EN = {
      rowtitle: 'Number-key jumps',
      rowdesc: 'Jump through sidebar panels and sessions in order. Sessions first: number 1 is the first pinned session (or the first session when nothing is pinned). Panels first: number 1 is the first sidebar panel. Rebind the keys in Settings > Shortcuts.',
      modeSessions: 'Sessions first',
      modePanels: 'Panels first',
      slot1: 'Jump to item 1',
      slot2: 'Jump to item 2',
      slot3: 'Jump to item 3',
      slot4: 'Jump to item 4',
      slot5: 'Jump to item 5',
      slot6: 'Jump to item 6',
      slot7: 'Jump to item 7',
      slot8: 'Jump to item 8',
      slot9: 'Jump to item 9',
    }

    const ROW_CSS = [
      '.dsh-qj-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2);}',
      '.dsh-qj-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-right:48px;}',
      '.dsh-qj-title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary);}',
      '.dsh-qj-desc{font-size:12px;font-weight:400;line-height:18px;color:var(--dsw-alias-label-secondary);}',
      '.dsh-qj-seg{flex:none;display:inline-flex;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);}',
      '.dsh-qj-seg button{border:none;background:transparent;font:inherit;font-size:13px;line-height:20px;padding:4px 10px;border-radius:6px;color:var(--dsw-alias-label-secondary);cursor:pointer;}',
      '.dsh-qj-seg button[data-on]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);}',
      '@media (hover:hover){.dsh-qj-seg button:not([data-on]):hover{color:var(--dsw-alias-label-primary);}}',
    ].join('')

    /** Read the stored mode; unknown or unreadable storage keeps the default. */
    function readMode() {
      try {
        const raw = globalThis.localStorage?.getItem(PREF_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        return parsed && parsed.mode === 'panels' ? 'panels' : 'sessions'
      } catch (_error) {
        return 'sessions'
      }
    }

    /** One shared mode value with a bare observable source for the settings row. */
    function createModeStore() {
      let value = readMode()
      const listeners = new Set()
      return {
        source: {
          getSnapshot: () => value,
          subscribe(listener) {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
          },
        },
        set(next) {
          const normalized = next === 'panels' ? 'panels' : 'sessions'
          if (normalized === value) return
          value = normalized
          try {
            globalThis.localStorage?.setItem(PREF_KEY, JSON.stringify({ mode: value }))
          } catch (_error) {
            // A browser that refuses storage keeps the in-memory choice.
          }
          for (const listener of [...listeners]) listener()
        },
      }
    }

    /** Resolve a slot label that may be a string or a locale-aware function. */
    function textOf(label, fallback) {
      try {
        const text = typeof label === 'function' ? label() : label
        return typeof text === 'string' && text.trim() !== '' ? text.trim() : fallback
      } catch (_error) {
        return fallback
      }
    }

    /** Sidebar panel rows in launcher order, restricted to live main panels. */
    function panelTargets(ctx) {
      const mainKeys = new Set()
      for (const entry of ctx.slots.entries('main')) {
        if (entry.options && entry.options.key !== undefined) mainKeys.add(entry.options.key)
      }
      const rows = []
      ctx.slots.entries('sidebar.panellist').forEach((entry, index) => {
        const options = entry.options
        if (!options || typeof options.id !== 'string') return
        if (mainKeys.size > 0 && !mainKeys.has(options.id)) return
        rows.push({
          id: options.id,
          order: typeof options.order === 'number' ? options.order : index,
          index,
          label: options.label,
        })
      })
      rows.sort((left, right) => left.order - right.order || left.index - right.index)
      return rows.map(row => ({ kind: 'panel', id: row.id, label: textOf(row.label, row.id) }))
    }

    /** Pinned sessions (most recently pinned first), then every other session. */
    function sessionTargets(ctx) {
      const sessions = ctx.get('sessions')
      if (!sessions) return []
      const state = sessions.list.getSnapshot()
      const workspaces = ctx.get('workspaces')
      const snapshot = workspaces ? workspaces.list.getSnapshot() : undefined
      const archived = new Set(snapshot ? snapshot.archivedSessionIds : [])
      const pinnedIds = snapshot ? snapshot.pinnedSessionIds : []

      const order = []
      const seen = new Set()
      const push = (id) => {
        if (id === undefined || seen.has(id)) return
        seen.add(id)
        order.push(id)
      }
      if (snapshot) {
        for (const workspace of snapshot.items || []) {
          for (const id of workspace.sessionIds || []) push(id)
        }
      }
      for (const id of state.ids || []) push(id)

      const rowOf = id => (state.byId ? state.byId[id] : undefined)
      const usable = (id) => {
        const row = rowOf(id)
        return row !== undefined && row.blank !== true && !archived.has(id)
      }

      const pinned = pinnedIds.filter(usable)
      const pinnedSet = new Set(pinned)
      const rest = order.filter(id => !pinnedSet.has(id) && usable(id))
      return [...pinned, ...rest].map((id) => ({
        kind: 'session',
        id,
        label: textOf(rowOf(id)?.displayTitle, id),
      }))
    }

    /** The numbered list for one mode. */
    function buildSequence(ctx, mode) {
      const sessions = sessionTargets(ctx)
      return mode === 'panels' ? [...panelTargets(ctx), ...sessions] : sessions
    }

    /** Open one numbered target through the owning service. */
    function runTarget(ctx, target) {
      if (target.kind === 'panel') {
        ctx.layout.selectPanel(target.id)
        return
      }
      const uiWorkspace = ctx.get('uiWorkspace')
      if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
        uiWorkspace.openSession(target.id)
        return
      }
      const sessions = ctx.get('sessions')
      if (sessions && typeof sessions.open === 'function') sessions.open(target.id)
    }

    /** General-settings row selecting the numbered list's leading group. */
    function ModeRow({ useMode, setMode, t }) {
      const mode = useMode(value => value)
      const option = (value, label) => h('button', {
        type: 'button',
        'data-on': mode === value ? '' : undefined,
        'aria-pressed': mode === value,
        onClick: () => { setMode(value) },
      }, label)
      return h('div', { className: 'dsh-qj-row' },
        h('style', null, ROW_CSS),
        h('div', { className: 'dsh-qj-text' },
          h('div', { className: 'dsh-qj-title' }, t('rowtitle')),
          h('div', { className: 'dsh-qj-desc' }, t('rowdesc'))),
        h('div', { className: 'dsh-qj-seg', role: 'group' },
          option('sessions', t('modeSessions')),
          option('panels', t('modePanels'))))
    }

    return {
      inject: ['slots', 'locale', 'shortcuts', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'quick-jump: locale')
        const t = ctx.locale.bind(NS)
        const modeStore = createModeStore()

        ctx.effect(() => {
          const disposers = []
          for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
            const code = `Digit${slot}`
            disposers.push(ctx.shortcuts.register({
              id: `quickjump.slot${slot}`,
              label: () => t(`slot${slot}`),
              aliases: [],
              defaults: {
                'desktop:macos': { code, modifiers: ['primary'] },
                'desktop:windows': { code, modifiers: ['primary'] },
                'desktop:linux': { code, modifiers: ['primary'] },
                'web:macos': { code, modifiers: ['primary', 'alt'] },
                'web:windows': { code, modifiers: ['primary', 'alt'] },
                'web:linux': { code, modifiers: ['primary', 'alt'] },
              },
              regions: ['page', 'editable', 'terminal'],
              modals: [],
              resolve: () => {
                const target = buildSequence(ctx, modeStore.source.getSnapshot())[slot - 1]
                if (target === undefined) return { status: 'pass' }
                return { status: 'handled', run: () => { runTarget(ctx, target) } }
              },
            }))
          }
          return () => {
            for (const dispose of disposers) dispose()
          }
        }, 'quick-jump: shortcuts')

        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'quick-jump-mode',
          order: 9,
          locale: NS,
          inject: () => ({
            hooks: { mode: modeStore.source },
            setMode: next => { modeStore.set(next) },
          }),
        }, ModeRow))
      },
    }
  },
})
