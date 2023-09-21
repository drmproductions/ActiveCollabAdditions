import * as RadioPopup from './popups/radio.js'
import * as api from '../api.js'
import * as bus from '../bus.js'
import * as cache from '../cache.js'
import * as cacher from '../cacher.js'
import * as preferences from '../preferences.js'
import * as utils from '../utils.js'
import { El } from './el.js'

let lastValue

const spanStyle = {
  fontWeight: 500,
  fontSize: '0.875rem',
  lineHeight: '1.375',
}

const items = new Map([
  [ 'start-date', 'By Start Date' ],
  [ 'due-date', 'By Due Date' ],
  [ 'project', 'By Project' ],
])

export function GroupTasksBySelect({ id, style: extraStyle }) {
  let unsub

  const tasksTitleEl = El('div', {
    style: {
      $: { display: 'none' },
      color: 'var(--color-primary)',
      fontSize: 17,
      fontWeight: 'bold',
      marginBottom: 13,
      marginTop: 24,
      textDecoration: 'none',
      userSelect: 'none',
    },
  })

  const tasksInnerEl = El('div.task_list.reorder_disabled')

  const tasksEl = El('div.tasks.ui-sortable', {
    style: {
      $: { display: 'none' },
      marginBottom: 39,
    },
  }, [tasksInnerEl])

  const selectorTitleEl = El(`span.title`, {
    style: {
      ...spanStyle,
      marginRight: 2,
      opacity: 0.6,
    },
  }, 'Group:')

  const selectorValueEl = El(`span.value`, {
    style: spanStyle,
  }, 'By Project')

  const style = {
    border: 'none',
    borderRadius: 'var(--ac-br-6)',
    margin: 0,
    padding: '0px 8px',
    transition: 'background-color 0.3s ease 0s, box-shadow 0.3s ease 0s, color 0.3s ease 0s, border-color 0.3s ease 0s',
    ':hover': {
      backgroundColor: 'var(--color-theme-300)',
      color: 'var(--color-theme-900)',
    },
    ...extraStyle,
  }

  async function onClick() {
    await RadioPopup.show({
      target: this,
      async onClick({ id }) {
        selectorValueEl.innerText = items.get(id)
        await preferences.setUserPageGroupTasksBy(id)
        return 'hide'
      },
      async onUpdate() {
        const selectedId = await preferences.getUserPageGroupTasksBy()
        return Array.from(items.entries()).map(([id, text]) => {
          const checked = id === selectedId
          return { checked, id, text }
        })
      },
    })
  }

  function onConnected() {
    unsub = bus.onMessage(({ kind, data }) => {
      switch (kind) {
        case 'preference-changed':
          const { key } = data
          if (key !== 'userPageGroupTasksBy') return
          update()
          break
      }
    })

    const parentEl = this.parentElement.querySelector('.profile_page_tasks')
    if (!parentEl) return
    parentEl.prepend(tasksEl)
    parentEl.prepend(tasksTitleEl)
  }

  function onDisconnected() {
    unsub?.()
  }

  const el = El(`button.${id}`, {
    style,
    onClick,
    onConnected,
    onDisconnected,
  }, [selectorTitleEl, selectorValueEl])

  async function update() {
    const id = await preferences.getUserPageGroupTasksBy()
    const title = items.get(id)
    selectorValueEl.innerText = title
    tasksTitleEl.innerText = title

    const groupByProject = id === 'project'

    const projects = []
    for (const projectEl of document.querySelectorAll('.profile_page_section_group')) {
      const linkEl = projectEl.querySelector('.profile_page_section_group_label > a')
      if (!linkEl) continue
      const projectId = parseInt(linkEl.getAttribute('href')?.split('/').pop())
      if (isNaN(projectId)) continue
      const projectName = await cache.getProjectName({ projectId })
      await cacher.preloadProjectTasks({ projectId })
      projects.push({ projectEl, projectId, projectName })
    }

    const tasks = []
    for (const { projectEl, projectId, projectName } of projects) {
      let hiddenTaskListCount = 0

      for (const taskListEl of projectEl.querySelectorAll('.task_list_group')) {
        const taskListNameEl = taskListEl.querySelector('h3')
        if (!taskListNameEl) continue

        const taskListTasksEl = taskListEl.querySelector('.tasks.ui-sortable')
        if (!taskListTasksEl) continue

        const taskListName = taskListNameEl.innerText

        for (const taskEl of tasksInnerEl.querySelectorAll(`.task[aca-project-id='${projectId}'][aca-task-list-name='${taskListName}']`)) {
          const completeToggleEl = taskEl.querySelector('.complete_toggler')
          if (completeToggleEl) El.setStyle(completeToggleEl, { $: { display: '' } })
          const actionsEl = taskEl.querySelector('.task_actions_container')
          if (actionsEl) El.setStyle(actionsEl, { $: { display: '' } })
          let projectNameEl = taskEl.querySelector('.aca_project_name')
          if (projectNameEl) projectNameEl.remove()
          taskListTasksEl.appendChild(taskEl)
        }

        El.setStyle(taskListEl, { $: { display: '' } })

        if (groupByProject) continue

        let movedTaskCount = 0
        for (const taskEl of taskListEl.querySelectorAll('.task')) {
          const taskId = parseInt(taskEl.getAttribute('task-id'))
          if (isNaN(taskId)) continue

          const task = await cache.getTask({ projectId, taskId })

          if ((id === 'due-date' && !!task.due_on) || !!task.start_on) {
            // these don't work outside their original angular container
            const completeToggleEl = taskEl.querySelector('.complete_toggler')
            if (completeToggleEl) El.setStyle(completeToggleEl, { $: { display: 'none' } })
            const actionsEl = taskEl.querySelector('.task_actions_container')
            if (actionsEl) El.setStyle(actionsEl, { $: { display: 'none' } })

            taskEl.setAttribute('aca-project-id', projectId)
            taskEl.setAttribute('aca-task-list-name', taskListName)

            let projectNameEl = taskEl.querySelector('.aca_project_name')
            if (!projectNameEl) {
              const taskNameEl = taskEl.querySelector('.task_name')
              if (taskNameEl) {
                projectNameEl = El('span.aca_project_name.tasks_project_name_wrapper.tw-inline-block.tw-truncate')
                taskNameEl.parentElement.insertBefore(projectNameEl, taskNameEl)
                taskNameEl.parentElement.insertBefore(taskNameEl, projectNameEl)
              }
            }
            if (projectNameEl) {
              projectNameEl.innerText = projectName
            }

            tasks.push({ task, taskEl })
            movedTaskCount++
          }
        }

        if (taskListTasksEl.childElementCount === movedTaskCount) {
          El.setStyle(taskListEl, { $: { display: 'none' } })
          hiddenTaskListCount++
        }
      }

      const projectContentEl = projectEl.querySelector('.profile_page_section_group_content')
      if (projectContentEl) {
        const hideProject = projectContentEl.childElementCount === hiddenTaskListCount
        El.setStyle(projectEl, { $: { display: hideProject ? 'none' : '' } })
      }
    }

    if (id === 'due-date') {
      tasks.sort((a, b) => a.task.due_on - b.task.due_on)
    } else {
      tasks.sort((a, b) => a.task.start_on - b.task.start_on)
    }

    for (const { taskEl } of tasks) {
      tasksInnerEl.appendChild(taskEl)
    }

    El.setStyle(tasksTitleEl, { $: { display: groupByProject ? 'none' : '' } })
    El.setStyle(tasksEl, { $: { display: groupByProject ? 'none' : '' } })
  }

  update()

  return el
}
