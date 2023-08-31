UsersPage.STATE = {
  ASCEND: 0,
  DESCEND: 1,
  ORIGINAL: 2
}

export function UsersPage() {
  let type = 0;
  let section = null;
  let original = null;
  let datedTasksAscendHtml = null;
  let datedTasksDescendHtml = null;
  let non_dated_important_tasks = null;
  let tasks = null;
  let findTasks = null
  function getSortedTasksHtml(isDescending) {
    let html = '';
    const datedTasks = $('.task:has(span.task_date)').clone();
    if(isDescending) {
      datedTasks.sort(function (a, b) {
        return new Date($(a).find('.task_date').html().split('-').pop() + ' ' + new Date().getFullYear()) >
        new Date($(b).find('.task_date').html().split('-').pop() + ' ' + new Date().getFullYear())? 1 : -1
      });
    }
    else {
      datedTasks.sort(function (a, b) {
        return new Date($(a).find('.task_date').html().split('-').pop() + ' ' + new Date().getFullYear()) >
        new Date($(b).find('.task_date').html().split('-').pop() + ' ' + new Date().getFullYear()) ? -1 : 1
      });
    }

    datedTasks.each(function () {
      html += $(this).wrap('<div/>').parent().html();
    });

    return html;
  }

  function addTasks(sortedTasks) {
    $('.profile_page_tasks').html('');
    $('.profile_page_tasks').append('<div class="task_list reorder_disabled" project="project_group.project" tasks="task_list_group.tasks" skip-assignee="true"></div>');
    $('.task_list').append('<div class="tasks ui-sortable"></div>');
    $('.tasks').append(sortedTasks);
    $('.tasks').append(non_dated_important_tasks);
    $('.tasks').append(tasks);
  }
  function setup(url) {
    clearInterval(findTasks)
    findTasks = null;
    if (url.indexOf('/users/') !== -1) {
      let attempts = 0;
      let maxAttempts = 10;
      findTasks = setInterval(() => {
        if ($('h2:contains("Tasks")').length || attempts === maxAttempts) {
          clearInterval(findTasks);
          $('li.sorter').show();
          const tasksLabel = $('h2:contains("Tasks")');
          type = 0;
          section = tasksLabel.parent();
          original = tasksLabel.parent().clone().html();
          datedTasksAscendHtml = getSortedTasksHtml();
          datedTasksDescendHtml = getSortedTasksHtml(true);

          non_dated_important_tasks = $('.task.important:not(:has(span.task_date))').clone();
          tasks = $('.task:not(:has(span.task_date)):not(.important)').clone();
        }

        attempts++;
      }, 200);
    } else {
      $('li.sorter').hide();
      type = null;
      section = null;
      original = null;
      datedTasksAscendHtml = null;
      datedTasksDescendHtml = null;
      non_dated_important_tasks = null;
      tasks = null;
    }
  }

  window.addEventListener('load', () => {
    setup(window.location.href);
  })

  navigation.addEventListener('navigate', (event) => {
    setup(event.destination.url);
  });

  return {
    sort: () => {
      const url = window.location.href;
      if (url.indexOf('/users/') !== -1) {
        if (type === UsersPage.STATE.ORIGINAL) {
          section.html('');
          section.append(original);
        } else if (type === UsersPage.STATE.ASCEND) {
          // ascend Apr, Mar
          addTasks(datedTasksAscendHtml);
        } else if (type === UsersPage.STATE.DESCEND) {
          // descend Mar, Apr
          addTasks(datedTasksDescendHtml);
        }
        type++;
        if (type > UsersPage.STATE.ORIGINAL) {
          type = 0;
        }
      }
    }
  }
}
