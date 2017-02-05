'use strict';

const elBody = document.querySelector('body');
const elButton = document.getElementById('submit_button');
const elMode = document.getElementById('mode');
const elResultWrapper = document.getElementById('result-wrapper');
const elMessage = document.getElementById('message');
const elResults = document.getElementById('results');
const elTotalBookmarks = document.getElementById('totalBookmarks');
const elCheckedBookmarks = document.getElementById('checkedBookmarks');
const elBookmarksErrors = document.getElementById('bookmarksErrors');
const elBookmarksWarnings = document.getElementById('bookmarksWarnings');
const elUnknownBookmarks = document.getElementById('unknownBookmarks');
const elProgress = document.getElementById('progress');
const elMassActions = document.getElementById('mass-actions');
const elRepairAllRedirects = document.getElementById('repairAllRedirects');
const elRemoveAllBookmarksWithErrors = document.getElementById('removeAllBookmarksWithErrors');
const elFilterBar = document.getElementById('filterbar');
const elSearch = document.getElementById('search');
const elDebugOutput = document.getElementById('debug-output');

const ui = {
  markedBookmarks : 0,
  warnings : 0,
  showNoResultsMessage : false,
  showSearchField : false,
  showFilterCheckboxes : false,
  showMassActionButtons : false,
  showDebugOutput : false,
  
  execute : function (e) {
    e.preventDefault();
    browser.runtime.sendMessage({ 'message' : 'execute', 'mode' : elMode.value });
  },

  handleResponse : function (response) {
    if (response.message === 'total-bookmarks') {
      elResultWrapper.classList.add('hidden');
      elMessage.textContent = '';
      elResults.textContent = '';
      elDebugOutput.textContent = '';
      elProgress.setAttribute('value', 0.01);
      elCheckedBookmarks.textContent = 0;
      elBookmarksErrors.textContent = 0;
      elBookmarksWarnings.textContent = 0;
      elUnknownBookmarks.textContent = 0;
      elTotalBookmarks.textContent = response.total_bookmarks;
      elButton.disabled = true;
    }
    else if (response.message === 'update-counters') {
      elTotalBookmarks.textContent = response.total_bookmarks;
      elCheckedBookmarks.textContent = response.checked_bookmarks;
      elBookmarksErrors.textContent = response.bookmarks_errors;
      elBookmarksWarnings.textContent = response.bookmarks_warnings;
      elUnknownBookmarks.textContent = response.unknown_bookmarks;
      elProgress.setAttribute('value', response.progress);
      ui.markedBookmarks = response.bookmarks_errors + response.bookmarks_warnings + response.unknown_bookmarks;
      ui.warnings = response.bookmarks_warnings;
    }
    else if (response.message === 'finished') {
      ui.buildBookmarksTree(response.bookmarks);
      ui.hideEmptyCategories();

      if (ui.markedBookmarks === 0) {
        ui.showNoResultsMessage = true;
        ui.showSearchField = false;
        ui.showFilterCheckboxes = false;
      }
      else {
        ui.showNoResultsMessage = false;
        ui.showSearchField = true;
        ui.showFilterCheckboxes = true;
      }

      if (ui.warnings === 0) {
        ui.showMassActionButtons = false;
      }
      else {
        ui.showMassActionButtons = true;
      }

      if (response.debug.length === 0) {
        ui.showDebugOutput = false;
      }
      else {
        elDebugOutput.textContent = JSON.stringify(response.debug);
        ui.showDebugOutput = true;
      }

      ui.doUiCleanup();
    }
    else if (response.message === 'show-duplicates-ui') {
      elBookmarksWarnings.textContent = response.warnings;

      if (response.warnings === 0) {
        ui.showNoResultsMessage = true;
      }
      else {
        ui.showNoResultsMessage = false;
      }

      ui.showSearchField = false;
      ui.showFilterCheckboxes = false;
      ui.showMassActionButtons = false;
      ui.showDebugOutput = false;

      ui.buildDuplicatesUi(response.bookmarks);
      ui.doUiCleanup();
    }
    else if (response.message === 'update-listitem') {
      const listItem = document.getElementById(response.bookmarkId);

      if (response.mode === 'duplicate') {
        const title = browser.i18n.getMessage('bookmark_title') + ': ' + response.title;
        const path = browser.i18n.getMessage('bookmark_path') + ': ' + response.path.join(' / ');

        listItem.getElementsByClassName('title')[0].textContent = title;
        listItem.getElementsByClassName('url')[0].textContent = path;
      }
      else {
        listItem.replaceWith(ui.getSingleNode(response.bookmark));
      }
    }
  },

  doUiCleanup : function (debug) {
    elButton.disabled = false;
    elResultWrapper.classList.remove('hidden');
    elSearch.focus();

    if (ui.showNoResultsMessage) {
      elMessage.textContent = browser.i18n.getMessage('no_marked_bookmarks');
    }

    if (ui.showMassActionButtons) {
      elMassActions.classList.remove('hidden');
    }
    else {
      elMassActions.classList.add('hidden');
    }

    if (ui.showSearchField) {
      elSearch.classList.remove('hidden');
    }
    else {
      elSearch.classList.add('hidden');
    }

    if (ui.showFilterCheckboxes) {
      elFilterBar.classList.remove('hidden');
    }
    else {
      elFilterBar.classList.add('hidden');
    }

    if (ui.showDebugOutput) {
      elDebugOutput.classList.remove('hidden');
    }
    else {
      elDebugOutput.classList.add('hidden');
    }
  },

  buildDuplicatesUi : function (bookmarks) {
    const list = document.createElement('ul');

    for (let url in bookmarks) {
      if (Object.prototype.hasOwnProperty.call(bookmarks, url)) {
        list.appendChild(ui.getSingleDuplicateNode(bookmarks, url));
      }
    }

    elResults.appendChild(list);
  },

  getSingleDuplicateNode : function (bookmarks, url) {
    const template = document.getElementById('duplicates-template').content.cloneNode(true);
    const elListItem = document.createElement('li');

    const elUrlText = document.createTextNode(url);
    const elUrl = template.querySelector('.url');
    elUrl.appendChild(elUrlText);
    elUrl.setAttribute('href', url);
    elUrl.setAttribute('target', '_blank');
    elUrl.setAttribute('rel', 'noopener');
    elListItem.appendChild(elUrl);

    const elDuplicatesList = document.createElement('ul');
    const duplicates = bookmarks[url];

    for (let duplicate of duplicates) {
      const elDuplicate = document.createElement('li');
      elDuplicate.id = duplicate.id;

      const elDuplicateTitle = document.createElement('div');
      elDuplicateTitle.classList.add('title');
      elDuplicateTitle.textContent = browser.i18n.getMessage('bookmark_title') + ': ' + duplicate.title;
      elDuplicate.appendChild(elDuplicateTitle);

      const elDuplicatePath = document.createElement('div');
      elDuplicatePath.classList.add('url');
      elDuplicatePath.textContent = browser.i18n.getMessage('bookmark_path') + ': ' + duplicate.path.join(' / ');
      elDuplicate.appendChild(elDuplicatePath);

      const elActionButtons = document.createElement('div');

      const elRemoveButtonText = document.createTextNode(browser.i18n.getMessage('bookmark_action_remove'));
      const elRemoveButton = document.createElement('a');
      elRemoveButton.appendChild(elRemoveButtonText);
      elRemoveButton.setAttribute('data-id', duplicate.id);
      elRemoveButton.setAttribute('data-action', 'remove');
      elRemoveButton.setAttribute('data-confirmation', 'true');
      elRemoveButton.setAttribute('data-confirmation-msg', browser.i18n.getMessage('bookmark_confirmation_remove'));
      elRemoveButton.setAttribute('href', '#');
      elActionButtons.appendChild(elRemoveButton);

      const elEditButtonText = document.createTextNode(browser.i18n.getMessage('bookmark_action_edit'));
      const elEditButton = document.createElement('a');
      elEditButton.appendChild(elEditButtonText);
      elEditButton.setAttribute('data-id', duplicate.id);
      elEditButton.setAttribute('data-action', 'edit');
      elEditButton.setAttribute('data-title', duplicate.title);
      elEditButton.setAttribute('data-url', duplicate.url);
      elEditButton.setAttribute('data-mode', 'duplicate');
      elEditButton.setAttribute('href', '#');
      elActionButtons.appendChild(elEditButton);

      elDuplicate.appendChild(elActionButtons);
      elDuplicatesList.appendChild(elDuplicate);
    }

    elListItem.appendChild(elDuplicatesList);

    return elListItem;
  },

  buildBookmarksTree : function (bookmarks) {
    elResults.appendChild(ui.getNodes(bookmarks));
  },

  getNodes : function (bookmarks) {
    const list = document.createElement('ul');

    for (let bookmark of bookmarks) {
      if (bookmark.url || (!bookmark.url && bookmark.children.length > 0)) {
        list.appendChild(ui.getSingleNode(bookmark));
      }
    }

    return list;
  },

  getSingleNode : function (bookmark) {
    let template;
    const li = document.createElement('li');
    li.id = bookmark.id;
    li.setAttribute('data-filter-searchfield', 'true');
    li.setAttribute('data-filter-checkbox', 'true');

    if (bookmark.url) {
      li.classList.add('is-bookmark');
      template = document.getElementById('result-template-url').content.cloneNode(true);

      const title = bookmark.title ? bookmark.title : browser.i18n.getMessage('bookmark_no_title');
      const elTitleText = document.createTextNode(title);
      const elTitle = template.querySelector('.title');
      elTitle.appendChild(elTitleText);

      const elUrlText = document.createTextNode(bookmark.url);
      const elUrl = template.querySelector('.url');
      elUrl.appendChild(elUrlText);
      elUrl.setAttribute('href', bookmark.url);
      elUrl.setAttribute('target', '_blank');
      elUrl.setAttribute('rel', 'noopener');

      const elStatus = template.querySelector('.status');
      let elStatusText;

      if (bookmark.status) {
        switch (bookmark.status) {
          case STATUS.REDIRECT:
            elStatusText = document.createTextNode(browser.i18n.getMessage('bookmark_state_label') + ': ' + browser.i18n.getMessage('bookmark_state_redirect'));
            elStatus.appendChild(elStatusText);
            li.classList.add('warning', 'redirect');
            break;
          case STATUS.NOT_FOUND:
          case STATUS.FETCH_ERROR:
            elStatusText = document.createTextNode(browser.i18n.getMessage('bookmark_state_label') + ': ' + browser.i18n.getMessage('bookmark_state_not_found'));
            elStatus.appendChild(elStatusText);
            li.classList.add('error');
            break;
          case STATUS.TIMEOUT:
          case STATUS.UNKNOWN_ERROR:
            elStatusText = document.createTextNode(browser.i18n.getMessage('bookmark_state_label') + ': ' + browser.i18n.getMessage('bookmark_state_unknown'));
            elStatus.appendChild(elStatusText);
            li.classList.add('unknown');
            break;
        }
      }

      const elActionButtons = template.querySelector('.action-buttons');

      const elRemoveButtonText = document.createTextNode(browser.i18n.getMessage('bookmark_action_remove'));
      const elRemoveButton = document.createElement('a');
      elRemoveButton.appendChild(elRemoveButtonText);
      elRemoveButton.setAttribute('data-id', bookmark.id);
      elRemoveButton.setAttribute('data-action', 'remove');
      elRemoveButton.setAttribute('data-confirmation', 'true');
      elRemoveButton.setAttribute('data-confirmation-msg', browser.i18n.getMessage('bookmark_confirmation_remove'));
      elRemoveButton.setAttribute('href', '#');
      elActionButtons.appendChild(elRemoveButton);

      if (bookmark.status && bookmark.status === STATUS.REDIRECT) {
        const elNewUrlText = document.createTextNode(browser.i18n.getMessage('bookmark_new_url') + ': ' + bookmark.newUrl);
        const elNewUrl = template.querySelector('.newUrl');
        elNewUrl.appendChild(elNewUrlText);
        elNewUrl.setAttribute('href', bookmark.newUrl);
        elNewUrl.setAttribute('target', '_blank');
        elNewUrl.setAttribute('rel', 'noopener');

        const elRepairRedirectButtonText = document.createTextNode(browser.i18n.getMessage('bookmark_action_repair_redirect'));
        const elRepairRedirectButton = document.createElement('a');
        elRepairRedirectButton.appendChild(elRepairRedirectButtonText);
        elRepairRedirectButton.setAttribute('data-id', bookmark.id);
        elRepairRedirectButton.setAttribute('data-action', 'repair-redirect');
        elRepairRedirectButton.setAttribute('data-confirmation', 'true');
        elRepairRedirectButton.setAttribute('data-confirmation-msg', browser.i18n.getMessage('bookmark_confirmation_repair_redirect'));
        elRepairRedirectButton.setAttribute('data-new-url', bookmark.newUrl);
        elRepairRedirectButton.setAttribute('href', '#');
        elActionButtons.appendChild(elRepairRedirectButton);
      }

      const elEditButtonText = document.createTextNode(browser.i18n.getMessage('bookmark_action_edit'));
      const elEditButton = document.createElement('a');
      elEditButton.appendChild(elEditButtonText);
      elEditButton.setAttribute('data-id', bookmark.id);
      elEditButton.setAttribute('data-action', 'edit');
      elEditButton.setAttribute('data-title', bookmark.title);
      elEditButton.setAttribute('data-url', bookmark.url);
      elEditButton.setAttribute('data-mode', 'default');
      elEditButton.setAttribute('href', '#');
      elActionButtons.appendChild(elEditButton);
    }
    else {
      template = document.getElementById('result-template-title').content.cloneNode(true);

      const title = bookmark.title ? bookmark.title : browser.i18n.getMessage('bookmark_no_title');
      const elTitleText = document.createTextNode(title);
      const elTitle = template.querySelector('.title');
      elTitle.appendChild(elTitleText);
    }

    li.appendChild(template);

    if (bookmark.children && bookmark.children.length > 0) {
      li.classList.add('has-children');
      li.appendChild(ui.getNodes(bookmark.children));
    }

    return li;
  },

  showEditBookmarkOverlay : function (bookmarkId, title, url, mode) {
    const modal = document.getElementById('modal-dialog');
    modal.classList.remove('hidden');

    const closeButton = document.getElementById('close_button');
    closeButton.onclick = function () {
      modal.classList.add('hidden');
    }

    window.onclick = function (e) {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    }

    window.onkeydown = function (e) {
      if (e.keyCode === 27) {
        modal.classList.add('hidden');
      }
    };

    const elTitle = document.getElementById('title');
    elTitle.value = title;

    const elUrl = document.getElementById('url');
    elUrl.value = url;

    const submitButton = document.getElementById('submit_changes');
    submitButton.onclick = function (e) {
      e.preventDefault();

      modal.classList.add('hidden');
      ui.editBookmark(bookmarkId, elTitle.value, elUrl.value, mode);
    }
  },

  editBookmark : function (bookmarkId, title, url, mode) {
    browser.runtime.sendMessage({
      'message' : 'edit',
      'bookmarkId' : bookmarkId,
      'title' : title,
      'url' : url,
      'mode' : mode
    });
  },

  removeBookmark : function (bookmarkId) {
    browser.runtime.sendMessage({
      'message' : 'remove',
      'bookmarkId' : bookmarkId
    });
  },

  repairRedirect : function (bookmarkId, newUrl) {
    browser.runtime.sendMessage({
      'message' : 'repair-redirect',
      'bookmarkId' : bookmarkId,
      'newUrl' : newUrl
    });
  },

  handleActionButtonClicks : function (e) {
    if (e.target.getAttribute('data-action')) {
      e.preventDefault();

      if (e.target.getAttribute('data-confirmation')) {
        if (!confirm(e.target.getAttribute('data-confirmation-msg'))) {
          return;
        }
      }

      const bookmarkId = e.target.getAttribute('data-id');
      const elBookmark = document.getElementById(bookmarkId);

      switch (e.target.getAttribute('data-action')) {
        case 'edit':
          const title = e.target.getAttribute('data-title');
          const url = e.target.getAttribute('data-url');
          const mode = e.target.getAttribute('data-mode')
          ui.showEditBookmarkOverlay(bookmarkId, title, url, mode);
          break;
        case 'remove':
          elBookmark.remove();
          ui.hideEmptyCategories();
          ui.removeBookmark(bookmarkId);
          break;
        case 'repair-redirect':
          elBookmark.remove();
          ui.hideEmptyCategories();
          ui.repairRedirect(bookmarkId, e.target.getAttribute('data-new-url'));
          break;
      }
    }
    else if (e.target.getAttribute('data-filter')) {
      ui.applyCheckboxFilter(e);
    }
  },

  repairAllRedirects : function (e) {
    e.preventDefault();

    if (!confirm(browser.i18n.getMessage('bookmark_confirmation_repair_all_redirects'))) {
      return;
    }

    const bookmarks = document.querySelectorAll('.redirect');

    for (let bookmark of bookmarks) {
      if (!bookmark.classList.contains('hidden')) {
        bookmark.remove();
        ui.repairRedirect(bookmark.id, bookmark.getElementsByClassName('newUrl')[0].getAttribute('href'));
      }
    }

    ui.hideEmptyCategories();
  },

  removeAllBookmarksWithErrors : function (e) {
    e.preventDefault();

    if (!confirm(browser.i18n.getMessage('bookmark_confirmation_remove_all_bookmarks_with_errors'))) {
      return;
    }

    const bookmarks = document.querySelectorAll('.error');

    for (let bookmark of bookmarks) {
      if (!bookmark.classList.contains('hidden')) {
        bookmark.remove();
        ui.removeBookmark(bookmark.id);
      }
    }

    ui.hideEmptyCategories();
  },

  applySearchFieldFilter : function (e) {
    const matcher = new RegExp(e.target.value, 'i');
    const urls = elResults.querySelectorAll('.url');

    for (let url of urls) {
      const parent = url.parentNode.parentNode;
      const title = parent.querySelector('.title');

      if (matcher.test(title.textContent) || matcher.test(url.textContent)) {
        parent.setAttribute('data-filter-searchfield', 'true');
      }
      else {
        parent.removeAttribute('data-filter-searchfield');
      }
    }

    ui.hideFilteredElements();
  },

  applyCheckboxFilter : function (e) {
    const urls = elResults.querySelectorAll('.url');

    for (let url of urls) {
      const parent = url.parentNode.parentNode;

      if (parent.classList.contains(e.target.getAttribute('data-filter'))) {
        if (e.target.checked) {
          parent.setAttribute('data-filter-checkbox', 'true');
        }
        else {
          parent.removeAttribute('data-filter-checkbox');
        }
      }
    }

    ui.hideFilteredElements();
  },

  hideFilteredElements : function () {
    const elements = elResults.querySelectorAll('li');

    for (let element of elements) {
      if (element.getElementsByClassName('url').length !== 0) {
        if (element.hasAttribute('data-filter-searchfield') && element.hasAttribute('data-filter-checkbox')) {
          element.classList.remove('hidden');
        }
        else {
          element.classList.add('hidden');
        }
      }
    }

    ui.hideEmptyCategories();
  },

  hideEmptyCategories : function () {
    const elements = elResults.querySelectorAll('li.has-children');
    for (let element of elements) {
      const subelements = element.querySelectorAll('li.is-bookmark');
      let count = 0;

      for (let subelement of subelements) {
        if (!subelement.classList.contains('hidden')) {
          count++;
          break;
        }
      }

      if (count > 0) {
        element.classList.remove('hidden');
      }
      else {
        element.classList.add('hidden');
      }
    }
  }
};

elButton.addEventListener('click', ui.execute);
elBody.addEventListener('click', ui.handleActionButtonClicks);
elRepairAllRedirects.addEventListener('click', ui.repairAllRedirects);
elRemoveAllBookmarksWithErrors.addEventListener('click', ui.removeAllBookmarksWithErrors);
elSearch.addEventListener('input', ui.applySearchFieldFilter);

browser.runtime.onMessage.addListener(ui.handleResponse);
