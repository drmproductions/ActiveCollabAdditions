import * as shared from '../shared.js'
import { El } from '../ui/el.js'
import { GroupTasksBySelect } from '../ui/GroupTasksBySelect.js'

export default function() {
  const tasksEl = document.body.querySelector('div.profile_page_tasks')
  // console.log(tasksEl)
  if (!tasksEl) return

  const parentEl = tasksEl.parentElement
  if (!parentEl) return

  if (parentEl.querySelector('.acit-group-users-by')) return

  El.setStyle(parentEl, { $: { position: 'relative' } })

  parentEl.prepend(GroupTasksBySelect({
    id: 'acit-group-users-by',
    style: {
      position: 'absolute',
      right: '16px',
      top: '16px',
    },
  }))
}
