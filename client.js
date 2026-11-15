window.__ModuleLoader__.load({
  id: '@local/dsh-project-decisions',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useSyncExternalStore } = React;
    const NS = 'project-decisions';
    const dictionaries = {
      zh: {
        title: '项目决议', subtitle: '属于当前项目，与本项目的所有会话共享。',
        add: '新增事项', refresh: '刷新',
        pending: '待定事项', confirmed: '已确认共识',
        pendingHint: '记录问题与候选方案，尚未形成最终结论。',
        confirmedHint: '当前项目依据，不表示已经执行完成。',
        emptyPending: '从一个需要讨论的问题开始', emptyPendingHint: '由你新增事项，再与 agent 一起补充内容。',
        emptyConfirmed: '还没有已确认共识', emptyConfirmedHint: '将讨论成熟的事项移到这里。',
        edit: '编辑', confirm: '确认共识 →', reopen: '← 重新讨论',
        newTitle: '新增待定事项', editTitle: '编辑决议', fieldTitle: '标题', body: '内容（Markdown）',
        titlePlaceholder: '这个项目需要决定什么？', bodyPlaceholder: '背景、候选方案、补充信息或最终结论…',
        save: '保存', saving: '保存中…', cancel: '取消', loading: '正在读取项目决议…',
        saved: '已保存到 Markdown', fileMissing: '首次新增时创建文档',
        footer: '一份本地 Markdown · 两列均供 agent 讨论 · 新增由你决定',
        noProjects: '尚无 DSH 工作区，请先在侧栏打开项目。',
        conflict: '文档版本已变化。先刷新并比较下方最新内容；编辑框中的文字不会丢失。',
        rebase: '已比较，使用最新版本继续编辑', back: '返回对话',
      },
      en: {
        title: 'Project decisions', subtitle: 'Owned by this project and shared across its sessions.',
        add: 'Add question', refresh: 'Refresh',
        pending: 'Open questions', confirmed: 'Confirmed decisions',
        pendingHint: 'Context and options that still need a decision.',
        confirmedHint: 'Current project agreements, not completed tasks.',
        emptyPending: 'Start with an open question', emptyPendingHint: 'You create the question; refine it with your agent.',
        emptyConfirmed: 'No confirmed decisions yet', emptyConfirmedHint: 'Move an agreed decision here when it is ready.',
        edit: 'Edit', confirm: 'Confirm →', reopen: '← Reopen',
        newTitle: 'New open question', editTitle: 'Edit decision', fieldTitle: 'Title', body: 'Content (Markdown)',
        titlePlaceholder: 'What does this project need to decide?', bodyPlaceholder: 'Context, options, notes, or the final decision…',
        save: 'Save', saving: 'Saving…', cancel: 'Cancel', loading: 'Reading project decisions…',
        saved: 'Saved to Markdown', fileMissing: 'Created when you add the first question',
        footer: 'One local Markdown file · Both columns inform the agent · You create the questions',
        noProjects: 'No DSH workspace yet. Open a project in the sidebar first.',
        conflict: 'The document changed. Refresh and compare the latest content below; your draft is preserved.',
        rebase: 'Compared: continue with the latest version', back: 'Back to conversation',
      },
    };
    const css = `
.prd-page{min-height:320px;box-sizing:border-box;padding:24px clamp(20px,4vw,48px) 36px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);container-type:inline-size}
.prd-wrap{max-width:1100px;margin:0 auto}.prd-page *{box-sizing:border-box}.prd-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.prd-heading{display:flex;gap:12px;align-items:center}.prd-heading h1{font-size:24px;font-weight:600;letter-spacing:-.5px;margin:0}.prd-subtitle{color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1.7;margin:12px 0 28px}.prd-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.prd-page button,.prd-page select,.prd-page input,.prd-page textarea{font:inherit;color:inherit}.prd-page button{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:8px 12px;font-size:13px;cursor:pointer;line-height:1.5}.prd-page button:disabled{opacity:.45;cursor:default}.prd-page button.prd-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}.prd-page button:focus-visible,.prd-page select:focus-visible,.prd-page input:focus-visible,.prd-page textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}.prd-page select{max-width:100%;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:9px 30px 9px 10px;font-size:13px}.prd-path{font-size:12px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0 0 28px;line-height:1.6}.prd-board{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px}.prd-column{min-width:0}.prd-column-head{display:flex;gap:9px;align-items:center;border-bottom:1px solid var(--dsw-alias-border-l1);padding:0 0 12px}.prd-column h2{font-size:15px;font-weight:600;margin:0}.prd-count{color:var(--dsw-alias-label-secondary);font-size:12px;font-variant-numeric:tabular-nums}.prd-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary)}.prd-dot[data-status=confirmed]{background:var(--dsw-alias-state-success-primary)}.prd-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6;margin:10px 0 18px}.prd-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:18px;margin-bottom:12px;background:var(--dsw-alias-bg-layer-1)}.prd-card h3{font-size:15px;font-weight:600;line-height:1.6;margin:0 0 10px;overflow-wrap:anywhere}.prd-body{font:inherit;font-size:13px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;margin:0 0 16px;color:var(--dsw-alias-label-secondary)}.prd-card-actions{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.prd-card-actions button{font-size:12px;padding:5px 9px;background:transparent}.prd-card-id{font:10px ui-monospace,monospace;display:block;color:var(--dsw-alias-label-secondary);margin:14px 0 0;opacity:.7;overflow-wrap:anywhere}.prd-empty{text-align:center;padding:46px 15px;border:1px dashed var(--dsw-alias-border-l1);border-radius:10px}.prd-empty strong{font-size:14px;font-weight:500}.prd-empty p{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary);margin:10px 0 0}.prd-footer{border-top:1px solid var(--dsw-alias-border-l1);padding-top:18px;margin-top:32px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary)}.prd-editor{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:22px;margin-bottom:28px;background:var(--dsw-alias-bg-layer-1)}.prd-editor h2{font-size:16px;margin:0 0 18px}.prd-field{display:block;font-size:12px;margin-bottom:16px}.prd-field span{display:block;margin-bottom:7px;color:var(--dsw-alias-label-secondary)}.prd-field input,.prd-field textarea{width:100%;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);font-size:14px}.prd-field textarea{min-height:190px;resize:vertical;line-height:1.7}.prd-editor-actions{display:flex;gap:8px;justify-content:flex-end}.prd-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:1.7;margin:12px 0 20px;white-space:pre-wrap}.prd-notice{font-size:12px;color:var(--dsw-alias-state-success-primary);margin:12px 0}.prd-conflict{font-size:13px;line-height:1.7;color:var(--dsw-alias-state-warn-primary);margin:10px 0 18px}.prd-conflict button{margin-top:8px;display:block}@container(max-width:650px){.prd-board{grid-template-columns:1fr}.prd-top{align-items:flex-start}.prd-heading h1{font-size:21px}}@media(pointer:coarse){.prd-field input,.prd-field textarea,.prd-page select{font-size:16px}}@media(hover:hover){.prd-page button:not(:disabled):hover{filter:brightness(.94)}}
`;
    function Icon({ size = 22 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3 }), h('path', { d: 'M12 4v16M6 8h3M6 11h3M15 12l1.5 1.5L19 10' }));
    }
    async function api(input, write = false, signal) {
      const endpoint = new URL('api/project-decisions', window.location.href);
      if (!write) for (const [key, value] of Object.entries(input)) if (value != null) endpoint.searchParams.set(key, value);
      const response = await fetch(endpoint, { method: write ? 'POST' : 'GET', credentials: 'same-origin', signal,
        ...(write ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) } : {}) });
      const value = await response.json();
      if (!response.ok) throw Object.assign(new Error(value.error ?? `HTTP ${response.status}`), { code: value.code });
      return value;
    }
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        for (const [lang, dict] of Object.entries(dictionaries)) ctx.locale.register(NS, lang, dict);
        const t = ctx.locale.bind(NS);
        const drafts = new Map();
        // The view is session-scoped; the file and draft are project-scoped.
        function ProjectView({ sessionId }) {
          return h(Page, { key: sessionId, sessionId });
        }
        function Page({ sessionId }) {
          useSyncExternalStore(fn => ctx.locale.subscribe(fn), () => ctx.locale.getSnapshot());
          const [snapshot, setSnapshot] = useState(null);
          const [draft, updateDraft] = useState(null);
          function setDraft(next) {
            if (next) drafts.set(projectId.current, next); else drafts.delete(projectId.current);
            updateDraft(next);
          }
          const [error, setError] = useState('');
          const [notice, setNotice] = useState('');
          const [loading, setLoading] = useState(true);
          const [saving, setSaving] = useState(false);
          const requestId = useRef(0);
          const projectId = useRef(null);
          const mounted = useRef(true);
          async function reload() {
            const generation = ++requestId.current;
            setLoading(true); setError('');
            try {
              const value = await api({ sessionId });
              if (generation !== requestId.current) return;
              if (projectId.current !== value.project[0]) {
                projectId.current = value.project[0];
                updateDraft(drafts.get(value.project[0]) ?? null);
              }
              setSnapshot(value);
            } catch (e) { if (generation === requestId.current) { setError(e.message); setSnapshot(null); } }
            finally { if (generation === requestId.current) setLoading(false); }
          }
          useEffect(() => {
            mounted.current = true;
            void reload();
            return () => { mounted.current = false; ++requestId.current; };
          }, [sessionId]);
          useEffect(() => {
            const refresh = () => { if (!saving && document.visibilityState === 'visible') void reload(); };
            window.addEventListener('focus', refresh);
            document.addEventListener('visibilitychange', refresh);
            return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
          }, [sessionId, saving]);
          async function save(input) {
            const savedProject = projectId.current;
            const submittedDraft = drafts.get(savedProject);
            setSaving(true); setError(''); setNotice('');
            try {
              const value = await api({ ...input, sessionId }, true);
              if (drafts.get(savedProject) === submittedDraft) drafts.delete(savedProject);
              if (!mounted.current) return;
              ++requestId.current; setSnapshot(value); updateDraft(null); setNotice(t('saved')); setLoading(false);
            } catch (e) { if (mounted.current) setError(e.message); }
            finally { if (mounted.current) setSaving(false); }
          }
          const button = (label, action, extra = {}) => h('button', { type: 'button', onClick: action, ...extra }, label);
          const project = snapshot?.project;
          const conflict = draft && snapshot && draft.version !== snapshot.version;
          return h('section', { className: 'prd-page', 'aria-label': t('title') }, h('style', null, css), h('div', { className: 'prd-wrap' },
            h('div', { className: 'prd-top' }, h('div', { className: 'prd-heading' }, h(Icon, { size: 27 }), h('h1', null, project ? `${project[1]} · ${t('title')}` : t('title')))),
            h('p', { className: 'prd-subtitle' }, t('subtitle')),
            h('div', { className: 'prd-toolbar' },
              button(t('refresh'), () => reload(), { disabled: saving }),
              button(`＋ ${t('add')}`, () => { setDraft({ action: 'create', title: '', body: '', version: snapshot.version }); setNotice(''); }, { className: 'prd-primary', disabled: !snapshot || saving || !!draft || loading })),
            h('p', { className: 'prd-path' }, snapshot ? `${snapshot.path}${snapshot.exists ? '' : ` · ${t('fileMissing')}`}` : project?.[2]),
            error && h('div', { className: 'prd-error', role: 'alert' }, error),
            notice && h('div', { className: 'prd-notice', role: 'status' }, notice),
            draft && h('form', { className: 'prd-editor', onSubmit: event => { event.preventDefault(); void save(draft); } },
              h('h2', null, t(draft.action === 'create' ? 'newTitle' : 'editTitle')),
              h('label', { className: 'prd-field' }, h('span', null, t('fieldTitle')), h('input', { name: 'decision-title', autoFocus: true, required: true, value: draft.title, placeholder: t('titlePlaceholder'), disabled: saving, onChange: event => setDraft({ ...draft, title: event.target.value }) })),
              h('label', { className: 'prd-field' }, h('span', null, t('body')), h('textarea', { name: 'decision-body', value: draft.body, placeholder: t('bodyPlaceholder'), disabled: saving, onChange: event => setDraft({ ...draft, body: event.target.value }) })),
              conflict && h('div', { className: 'prd-conflict' }, t('conflict'), button(t('rebase'), () => setDraft({ ...draft, version: snapshot.version }))),
              h('div', { className: 'prd-editor-actions' }, button(t('cancel'), () => { setDraft(null); setError(''); }, { disabled: saving }),
                h('button', { type: 'submit', className: 'prd-primary', disabled: saving || !draft.title.trim() || !!conflict }, t(saving ? 'saving' : 'save')))),
            loading && h('p', { className: 'prd-hint', role: 'status' }, t('loading')),
            snapshot && h('div', { className: 'prd-board' }, ...['pending', 'confirmed'].map(status => {
              const rows = snapshot.rows.filter(row => row[3] === status);
              return h('section', { className: 'prd-column', key: status, 'aria-label': t(status) },
                h('div', { className: 'prd-column-head' }, h('span', { className: 'prd-dot', 'data-status': status }), h('h2', null, t(status)), h('span', { className: 'prd-count' }, rows.length)),
                h('p', { className: 'prd-hint' }, t(`${status}Hint`)),
                rows.length ? rows.map(([id, title, body]) => h('article', { className: 'prd-card', key: id }, h('h3', null, title),
                  body && h('div', { className: 'prd-body' }, body),
                  h('div', { className: 'prd-card-actions' },
                    button(t('edit'), () => { setDraft({ action: 'update', id, title, body, version: snapshot.version }); setNotice(''); }, { disabled: saving || !!draft || loading }),
                    button(t(status === 'pending' ? 'confirm' : 'reopen'), () => save({ action: 'update', id, version: snapshot.version, status: status === 'pending' ? 'confirmed' : 'pending' }), { disabled: saving || !!draft || loading })),
                  h('small', { className: 'prd-card-id' }, id))) :
                  h('div', { className: 'prd-empty' }, h('strong', null, t(status === 'pending' ? 'emptyPending' : 'emptyConfirmed')), h('p', null, t(status === 'pending' ? 'emptyPendingHint' : 'emptyConfirmedHint'))));
            })),
            h('footer', { className: 'prd-footer' }, t('footer'))));
        }
        ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: NS, order: 15, label: () => t('title') }, ProjectView));
      },
    };
  },
});
