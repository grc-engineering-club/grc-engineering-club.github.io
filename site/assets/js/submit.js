(function () {
  'use strict';

  var REPO_OWNER = 'GRCEngClub';
  var REPO_NAME = 'directory';
  var GH_USERNAME_RE = /^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/;
  var PROFILE_SUBMISSION_START = '<!-- PROFILE_SUBMISSION_START -->';
  var PROFILE_SUBMISSION_END = '<!-- PROFILE_SUBMISSION_END -->';
  var PREFILLED_ISSUE_BODY = [
    'Paste the copied profile payload into this issue body, replacing this text, then click "Submit new issue".',
    '',
    'If the payload is not on your clipboard, return to the submit form and use "Copy profile payload" again.'
  ].join('\n');

  var state = {
    specializations: [],
    frameworks: [],
    languages: [],
    available_for: [],
    certifications: [],
    projects: []
  };

  var submitState = {
    issueUrl: '',
    payload: ''
  };

  var currentStep = 1;
  var firstInvalidField = null;

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  var githubInput = $('#field-github');
  var avatarPreview = $('#github-avatar-preview');
  var certInput = $('#field-certifications');
  var certTagsEl = $('#cert-tags');
  var projectsList = $('#projects-list');
  var addProjectBtn = $('#add-project');
  var submitBtn = $('#btn-submit-github');
  var submitFallback = $('#submit-fallback');
  var submitFallbackStatus = $('#submit-fallback-status');
  var submitIssueLink = $('#submit-issue-link');
  var submitPayloadField = $('#submit-payload');
  var submitPayloadWrap = $('.submit-payload-wrap');
  var copyPayloadBtn = $('#btn-copy-payload');

  function normalizeGitHubUsername(value) {
    return (value || '').trim().toLowerCase();
  }

  function normalizeFreeText(value) {
    return (value || '').trim();
  }

  function showStep(n) {
    $$('.form-step').forEach(function (el) {
      el.hidden = Number(el.dataset.step) !== n;
    });

    $$('.step-indicator .step').forEach(function (el) {
      var stepNumber = Number(el.dataset.step);
      var isFuture = stepNumber > n;
      el.classList.toggle('active', stepNumber === n);
      el.classList.toggle('completed', stepNumber < n);
      el.disabled = isFuture;
      if (stepNumber === n) {
        el.setAttribute('aria-current', 'step');
        el.removeAttribute('aria-disabled');
      } else {
        el.removeAttribute('aria-current');
        if (isFuture) el.setAttribute('aria-disabled', 'true');
        else el.removeAttribute('aria-disabled');
      }
    });

    currentStep = n;
    if (n === 4) renderPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-next]');
    if (button) {
      if (validateStep(currentStep)) showStep(Number(button.dataset.next));
      return;
    }

    button = event.target.closest('[data-prev]');
    if (button) {
      showStep(Number(button.dataset.prev));
    }
  });

  $$('.step-indicator .step').forEach(function (el) {
    el.addEventListener('click', function () {
      var target = Number(el.dataset.step);
      if (target < currentStep) {
        showStep(target);
      } else if (target === currentStep + 1 && validateStep(currentStep)) {
        showStep(target);
      }
    });
  });

  $$('.chip-selector').forEach(function (container) {
    var field = container.dataset.field;
    container.addEventListener('click', function (event) {
      var chip = event.target.closest('.chip');
      if (!chip) return;
      chip.classList.toggle('active');
      syncChips(container, field);
      clearFieldError(field);
    });
  });

  function syncChips(container, field) {
    state[field] = [];
    container.querySelectorAll('.chip.active').forEach(function (chip) {
      state[field].push(chip.dataset.value);
    });
  }

  function findChipByValue(container, value) {
    var needle = value.toLowerCase();
    return Array.prototype.find.call(container.querySelectorAll('.chip'), function (chip) {
      return chip.dataset.value.toLowerCase() === needle;
    });
  }

  function addCustomChip(inputEl, containerId, fieldName) {
    var value = inputEl.value.trim();
    if (!value) return;

    var container = $(containerId);
    var existing = findChipByValue(container, value);
    if (existing) {
      existing.classList.add('active');
      inputEl.value = '';
      syncChips(container, fieldName);
      clearFieldError(fieldName);
      return;
    }

    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip active';
    chip.dataset.value = value;
    chip.textContent = value;
    container.appendChild(chip);
    inputEl.value = '';
    syncChips(container, fieldName);
    clearFieldError(fieldName);
  }

  var addSpecBtn = $('#add-custom-specialization');
  var customSpecInput = $('#custom-specialization');
  if (addSpecBtn) {
    addSpecBtn.addEventListener('click', function () {
      addCustomChip(customSpecInput, '#chips-specializations', 'specializations');
    });
    customSpecInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustomChip(customSpecInput, '#chips-specializations', 'specializations');
      }
    });
  }

  var addLangBtn = $('#add-custom-language');
  var customLangInput = $('#custom-language');
  if (addLangBtn) {
    addLangBtn.addEventListener('click', function () {
      addCustomChip(customLangInput, '#chips-languages', 'languages');
    });
    customLangInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustomChip(customLangInput, '#chips-languages', 'languages');
      }
    });
  }

  if (certInput) {
    certInput.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      var value = certInput.value.trim();
      if (!value) return;

      var exists = state.certifications.some(function (cert) {
        return cert.toLowerCase() === value.toLowerCase();
      });

      if (!exists) {
        state.certifications.push(value);
        renderCertTags();
      }
      certInput.value = '';
    });
  }

  function renderCertTags() {
    if (!certTagsEl) return;
    certTagsEl.innerHTML = '';

    state.certifications.forEach(function (certification, index) {
      var tag = document.createElement('span');
      tag.className = 'tag tag-outline tag-removable';
      tag.textContent = certification + ' ';

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.dataset.removeCert = index;
      removeBtn.setAttribute('aria-label', 'Remove ' + certification);
      removeBtn.innerHTML = '&times;';
      tag.appendChild(removeBtn);
      certTagsEl.appendChild(tag);
    });
  }

  if (certTagsEl) {
    certTagsEl.addEventListener('click', function (event) {
      var button = event.target.closest('[data-remove-cert]');
      if (!button) return;
      state.certifications.splice(Number(button.dataset.removeCert), 1);
      renderCertTags();
    });
  }

  if (addProjectBtn) {
    addProjectBtn.addEventListener('click', function () {
      if (state.projects.length >= 5) return;
      state.projects.push({ name: '', url: '', description: '' });
      renderProjects();
    });
  }

  function renderProjects() {
    if (!projectsList || !addProjectBtn) return;

    projectsList.innerHTML = '';
    state.projects.forEach(function (project, index) {
      var entry = document.createElement('div');
      entry.className = 'project-entry';
      entry.innerHTML =
        '<div class="project-entry-header"><strong>Project ' + (index + 1) + '</strong><button type="button" class="btn-remove" data-remove-project="' + index + '" aria-label="Remove project ' + (index + 1) + '">&times;</button></div>' +
        '<input type="text" placeholder="Project name" value="' + escHtml(project.name) + '" data-proj="' + index + '" data-field="name">' +
        '<input type="url" placeholder="https://github.com/..." value="' + escHtml(project.url) + '" data-proj="' + index + '" data-field="url">' +
        '<input type="text" placeholder="Brief description" value="' + escHtml(project.description) + '" data-proj="' + index + '" data-field="description">';
      projectsList.appendChild(entry);
    });

    addProjectBtn.style.display = state.projects.length >= 5 ? 'none' : '';
  }

  if (projectsList) {
    projectsList.addEventListener('input', function (event) {
      var input = event.target;
      if (input.dataset.proj === undefined) return;
      state.projects[Number(input.dataset.proj)][input.dataset.field] = input.value;
      clearFieldError('projects');
    });

    projectsList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-remove-project]');
      if (!button) return;
      state.projects.splice(Number(button.dataset.removeProject), 1);
      renderProjects();
      clearFieldError('projects');
    });
  }

  if (githubInput) {
    githubInput.addEventListener('input', function () {
      clearFieldError('github');
      if (!githubInput.value.trim()) avatarPreview.hidden = true;
    });

    githubInput.addEventListener('blur', function () {
      var username = normalizeGitHubUsername(githubInput.value);
      githubInput.value = username;

      if (!username || !GH_USERNAME_RE.test(username)) {
        avatarPreview.hidden = true;
        return;
      }

      var image = new Image();
      image.onload = function () {
        avatarPreview.src = image.src;
        avatarPreview.alt = username;
        avatarPreview.hidden = false;
      };
      image.onerror = function () {
        avatarPreview.hidden = true;
      };
      image.src = 'https://github.com/' + username + '.png?size=80';
    });
  }

  function getFieldContainer(field) {
    switch (field) {
      case 'github': return githubInput;
      case 'name': return $('#field-name');
      case 'linkedin': return $('#field-linkedin');
      case 'blog': return $('#field-blog');
      case 'specializations': return $('#chips-specializations');
      case 'projects': return projectsList;
      default: return null;
    }
  }

  function getFocusableTarget(field, targetOverride) {
    if (targetOverride) return targetOverride;

    switch (field) {
      case 'specializations': return $('#chips-specializations .chip');
      case 'projects': return projectsList ? projectsList.querySelector('input, button') || addProjectBtn : addProjectBtn;
      default: return getFieldContainer(field);
    }
  }

  function clearFieldError(field) {
    var errorEl = $('#error-' + field);
    var container = getFieldContainer(field);
    if (errorEl) errorEl.textContent = '';
    if (!container) return;

    container.removeAttribute('aria-invalid');
    container.removeAttribute('aria-describedby');
    if (container.classList && (container.classList.contains('chip-selector') || container.id === 'projects-list')) {
      container.removeAttribute('tabindex');
    }
  }

  function clearErrors() {
    firstInvalidField = null;
    $$('.form-error').forEach(function (el) {
      el.textContent = '';
    });
    ['github', 'name', 'linkedin', 'blog', 'specializations', 'projects'].forEach(clearFieldError);
  }

  function setError(field, message, targetOverride) {
    var errorEl = $('#error-' + field);
    var container = getFieldContainer(field);
    var focusTarget = getFocusableTarget(field, targetOverride);

    if (errorEl) errorEl.textContent = message;
    if (container) {
      container.setAttribute('aria-invalid', 'true');
      container.setAttribute('aria-describedby', 'error-' + field);
      if (container.classList && (container.classList.contains('chip-selector') || container.id === 'projects-list')) {
        container.setAttribute('tabindex', '-1');
      }
    }

    if (!firstInvalidField) {
      firstInvalidField = focusTarget || container;
    }
  }

  function focusFirstInvalidField() {
    if (!firstInvalidField) return;

    var focusTarget = firstInvalidField;
    if (focusTarget.matches && (focusTarget.matches('.chip-selector') || focusTarget.id === 'projects-list')) {
      focusTarget = focusTarget.querySelector('button, input, textarea') || focusTarget;
    }

    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus({ preventScroll: true });
    }

    if (focusTarget && typeof focusTarget.scrollIntoView === 'function') {
      focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function isValidHttpUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function validateStep(step, options) {
    var config = options || {};
    clearErrors();

    var valid = true;

    if (step === 1) {
      var github = normalizeGitHubUsername(githubInput.value);
      githubInput.value = github;
      if (!github) {
        setError('github', 'GitHub username is required.');
        valid = false;
      } else if (!GH_USERNAME_RE.test(github)) {
        setError('github', 'Use a valid GitHub username: 1-39 lowercase letters, numbers, or hyphens, with no leading or trailing hyphen.');
        valid = false;
      }

      var name = normalizeFreeText($('#field-name').value);
      if (!name) {
        setError('name', 'Name is required.');
        valid = false;
      }

      if (state.specializations.length === 0) {
        setError('specializations', 'Select at least one specialization.');
        valid = false;
      }
    }

    if (step === 2) {
      var linkedin = normalizeFreeText($('#field-linkedin').value);
      if (linkedin && !/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(linkedin)) {
        setError('linkedin', 'Use a LinkedIn profile URL in the form https://linkedin.com/in/your-name.');
        valid = false;
      }

      var blog = normalizeFreeText($('#field-blog').value);
      if (blog && !isValidHttpUrl(blog)) {
        setError('blog', 'Use a full URL that starts with http:// or https://.');
        valid = false;
      }
    }

    if (step === 3) {
      var hasProjectError = false;

      state.projects.forEach(function (project, index) {
        if (hasProjectError) return;

        var nameValue = normalizeFreeText(project.name);
        var urlValue = normalizeFreeText(project.url);
        var descriptionValue = normalizeFreeText(project.description);
        var hasAnyValue = Boolean(nameValue || urlValue || descriptionValue);

        if (!hasAnyValue) return;

        if (!nameValue) {
          setError(
            'projects',
            'Every project with a link or description also needs a project name.',
            projectsList.querySelector('[data-proj="' + index + '"][data-field="name"]')
          );
          hasProjectError = true;
          valid = false;
          return;
        }

        if (urlValue && !isValidHttpUrl(urlValue)) {
          setError(
            'projects',
            'Project links must start with http:// or https://.',
            projectsList.querySelector('[data-proj="' + index + '"][data-field="url"]')
          );
          hasProjectError = true;
          valid = false;
        }
      });
    }

    if (!valid && !config.deferFocus) {
      focusFirstInvalidField();
    }

    return valid;
  }

  function validateAllSteps() {
    var step;
    for (step = 1; step <= 3; step += 1) {
      if (!validateStep(step, { deferFocus: true })) {
        showStep(step);
        focusFirstInvalidField();
        return false;
      }
    }

    clearErrors();
    return true;
  }

  function generateMarkdown() {
    var data = getFormData();
    var lines = ['---'];

    lines.push('name: "' + escYaml(data.name) + '"');
    lines.push('github: "' + escYaml(data.github) + '"');
    lines.push('specializations:');
    data.specializations.forEach(function (specialization) {
      lines.push('  - "' + escYaml(specialization) + '"');
    });

    if (data.title) lines.push('title: "' + escYaml(data.title) + '"');
    if (data.company) lines.push('company: "' + escYaml(data.company) + '"');
    if (data.location) lines.push('location: "' + escYaml(data.location) + '"');
    if (data.linkedin) lines.push('linkedin: "' + escYaml(data.linkedin) + '"');
    if (data.twitter) lines.push('twitter: "' + escYaml(data.twitter) + '"');
    if (data.bluesky) lines.push('bluesky: "' + escYaml(data.bluesky) + '"');
    if (data.blog) lines.push('blog: "' + escYaml(data.blog) + '"');
    if (data.huggingface) lines.push('huggingface: "' + escYaml(data.huggingface) + '"');

    if (data.frameworks.length) {
      lines.push('frameworks:');
      data.frameworks.forEach(function (framework) {
        lines.push('  - "' + escYaml(framework) + '"');
      });
    }

    if (data.languages.length) {
      lines.push('languages:');
      data.languages.forEach(function (language) {
        lines.push('  - "' + escYaml(language) + '"');
      });
    }

    if (data.certifications.length) {
      lines.push('certifications:');
      data.certifications.forEach(function (certification) {
        lines.push('  - "' + escYaml(certification) + '"');
      });
    }

    if (data.available_for.length) {
      lines.push('available_for:');
      data.available_for.forEach(function (value) {
        lines.push('  - "' + escYaml(value) + '"');
      });
    }

    if (data.projects.length) {
      lines.push('projects:');
      data.projects.forEach(function (project) {
        lines.push('  - name: "' + escYaml(project.name) + '"');
        if (project.url) lines.push('    url: "' + escYaml(project.url) + '"');
        if (project.description) lines.push('    description: "' + escYaml(project.description) + '"');
      });
    }

    lines.push('---');
    lines.push('');

    if (data.about) {
      lines.push('## About Me');
      lines.push('');
      lines.push(data.about);
      lines.push('');
    }

    if (data.highlights) {
      lines.push('## Experience Highlights');
      lines.push('');
      data.highlights.split('\n').forEach(function (line) {
        var trimmed = line.trim();
        if (trimmed) lines.push('- ' + trimmed);
      });
      lines.push('');
    }

    if (data.contact) {
      lines.push('## Get in Touch');
      lines.push('');
      lines.push(data.contact);
      lines.push('');
    }

    return lines.join('\n');
  }

  function getFormData() {
    return {
      github: normalizeGitHubUsername(githubInput.value),
      name: normalizeFreeText($('#field-name').value),
      specializations: state.specializations.slice(),
      title: normalizeFreeText($('#field-title').value),
      company: normalizeFreeText($('#field-company').value),
      location: normalizeFreeText($('#field-location').value),
      linkedin: normalizeFreeText($('#field-linkedin').value),
      twitter: normalizeFreeText($('#field-twitter').value),
      bluesky: normalizeFreeText($('#field-bluesky').value),
      blog: normalizeFreeText($('#field-blog').value),
      huggingface: normalizeFreeText($('#field-huggingface').value),
      frameworks: state.frameworks.slice(),
      languages: state.languages.slice(),
      certifications: state.certifications.slice(),
      available_for: state.available_for.slice(),
      projects: state.projects
        .map(function (project) {
          return {
            name: normalizeFreeText(project.name),
            url: normalizeFreeText(project.url),
            description: normalizeFreeText(project.description)
          };
        })
        .filter(function (project) { return project.name; }),
      about: normalizeFreeText($('#field-about').value),
      highlights: normalizeFreeText($('#field-highlights').value),
      contact: normalizeFreeText($('#field-contact').value)
    };
  }

  function renderPreview() {
    var data = getFormData();
    var avatarUrl = 'https://github.com/' + encodeURIComponent(data.github) + '.png?size=120';
    var html = '<div class="profile-header">';

    html += '<img class="profile-avatar" src="' + escHtml(avatarUrl) + '" alt="' + escHtml(data.name) + '">';
    html += '<div>';
    html += '<div class="profile-name">' + escHtml(data.name) + '</div>';

    if (data.title) {
      html += '<div class="profile-title">' + escHtml(data.title) + (data.company ? ' at ' + escHtml(data.company) : '') + '</div>';
    } else if (data.company) {
      html += '<div class="profile-company">' + escHtml(data.company) + '</div>';
    }

    if (data.location) html += '<div class="profile-location">' + escHtml(data.location) + '</div>';

    var socials = [];
    if (data.linkedin) socials.push('<a href="' + escHtml(data.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>');
    if (data.twitter) socials.push('<a href="https://x.com/' + escHtml(data.twitter.replace(/^@/, '')) + '" target="_blank" rel="noopener">Twitter</a>');
    if (data.bluesky) socials.push('<a href="https://bsky.app/profile/' + escHtml(data.bluesky) + '" target="_blank" rel="noopener">Bluesky</a>');
    if (data.huggingface) socials.push('<a href="https://huggingface.co/' + escHtml(data.huggingface) + '" target="_blank" rel="noopener">Hugging Face</a>');
    if (data.blog) socials.push('<a href="' + escHtml(data.blog) + '" target="_blank" rel="noopener">Blog</a>');
    socials.push('<a href="https://github.com/' + escHtml(data.github) + '" target="_blank" rel="noopener">GitHub</a>');

    html += '<div class="profile-socials">' + socials.join('') + '</div>';
    html += '</div></div>';

    html += '<div class="profile-sections">';
    html += '<div class="profile-section"><h2>Specializations</h2><div class="tags">';
    data.specializations.forEach(function (specialization) {
      html += '<span class="tag tag-accent">' + escHtml(specialization) + '</span>';
    });
    html += '</div></div>';

    if (data.languages.length) {
      html += '<div class="profile-section"><h2>Languages & Tools</h2><div class="tags">';
      data.languages.forEach(function (language) {
        html += '<span class="tag tag-language">' + escHtml(language) + '</span>';
      });
      html += '</div></div>';
    }

    if (data.frameworks.length) {
      html += '<div class="profile-section"><h2>Frameworks</h2><div class="tags">';
      data.frameworks.forEach(function (framework) {
        html += '<span class="tag tag-outline">' + escHtml(framework) + '</span>';
      });
      html += '</div></div>';
    }

    if (data.certifications.length) {
      html += '<div class="profile-section"><h2>Certifications</h2><div class="tags">';
      data.certifications.forEach(function (certification) {
        html += '<span class="tag tag-outline">' + escHtml(certification) + '</span>';
      });
      html += '</div></div>';
    }

    if (data.available_for.length) {
      html += '<div class="profile-section"><h2>Available For</h2><div class="tags">';
      data.available_for.forEach(function (value) {
        html += '<span class="tag tag-available">' + escHtml(value) + '</span>';
      });
      html += '</div></div>';
    }
    html += '</div>';

    if (data.projects.length) {
      html += '<div class="profile-section"><h2>Projects</h2><div class="project-list">';
      data.projects.forEach(function (project) {
        html += '<div class="project-card">';
        html += '<div class="project-name">' + (project.url ? '<a href="' + escHtml(project.url) + '" target="_blank" rel="noopener">' + escHtml(project.name) + '</a>' : escHtml(project.name)) + '</div>';
        if (project.description) html += '<div class="project-desc">' + escHtml(project.description) + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    if (data.about) {
      html += '<div class="profile-body"><h2>About Me</h2>';
      data.about.split('\n\n').forEach(function (paragraph) {
        if (paragraph.trim()) html += '<p>' + escHtml(paragraph.trim()) + '</p>';
      });
      html += '</div>';
    }

    if (data.highlights) {
      html += '<div class="profile-body"><h2>Experience Highlights</h2><ul>';
      data.highlights.split('\n').forEach(function (line) {
        var trimmed = line.trim();
        if (trimmed) html += '<li>' + escHtml(trimmed) + '</li>';
      });
      html += '</ul></div>';
    }

    if (data.contact) {
      html += '<div class="profile-body"><h2>Get in Touch</h2>';
      data.contact.split('\n\n').forEach(function (paragraph) {
        if (paragraph.trim()) html += '<p>' + escHtml(paragraph.trim()) + '</p>';
      });
      html += '</div>';
    }

    $('#profile-preview').innerHTML = html;
  }

  function buildSubmissionPayload(markdown) {
    var payloadJson = JSON.stringify({ version: 1, markdown: markdown });
    return PROFILE_SUBMISSION_START + '\n' + toBase64(payloadJson) + '\n' + PROFILE_SUBMISSION_END;
  }

  function buildIssueUrl(title) {
    return 'https://github.com/' + REPO_OWNER + '/' + REPO_NAME + '/issues/new'
      + '?title=' + encodeURIComponent(title)
      + '&body=' + encodeURIComponent(PREFILLED_ISSUE_BODY)
      + '&labels=' + encodeURIComponent('profile-submission');
  }

  function toBase64(value) {
    var bytes = new TextEncoder().encode(value);
    var binary = '';
    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  async function copyTextToClipboard(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(value),
          new Promise(function (_, reject) {
            window.setTimeout(function () {
              reject(new Error('Clipboard write timed out.'));
            }, 1200);
          })
        ]);
        return true;
      } catch (error) {
        // Fall through to legacy copy path.
      }
    }

    if (submitPayloadWrap) submitPayloadWrap.open = true;
    if (submitPayloadField) {
      submitPayloadField.value = value;
      submitPayloadField.focus();
      submitPayloadField.select();
      submitPayloadField.setSelectionRange(0, value.length);
    }

    try {
      return document.execCommand('copy');
    } catch (error) {
      return false;
    }
  }

  function setSubmitButtonBusy(isBusy) {
    if (!submitBtn) return;

    if (!submitBtn.dataset.defaultLabel) {
      submitBtn.dataset.defaultLabel = submitBtn.textContent;
    }

    submitBtn.disabled = isBusy;
    submitBtn.textContent = isBusy ? 'Preparing GitHub submission issue…' : submitBtn.dataset.defaultLabel;
  }

  function showSubmitFallback(copyWorked, issueOpened) {
    if (!submitFallback || !submitFallbackStatus || !submitIssueLink || !submitPayloadField) return;

    submitFallback.hidden = false;
    submitIssueLink.href = submitState.issueUrl;
    submitPayloadField.value = submitState.payload;

    var message = copyWorked
      ? 'Profile payload copied. Paste it into the GitHub issue body before you submit the issue.'
      : 'Automatic copy did not work. Use the button below or copy the payload from the expandable panel before submitting the GitHub issue.';

    if (!issueOpened) {
      message += ' GitHub did not open automatically, so use the "Open GitHub submission issue" button below.';
    }

    submitFallbackStatus.textContent = message;

    if (!copyWorked && submitPayloadWrap) {
      submitPayloadWrap.open = true;
    }

    submitFallback.focus({ preventScroll: true });
    submitFallback.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (copyPayloadBtn) {
    copyPayloadBtn.addEventListener('click', async function () {
      if (!submitState.payload) return;
      var copied = await copyTextToClipboard(submitState.payload);
      submitFallbackStatus.textContent = copied
        ? 'Profile payload copied again. Paste it into the GitHub issue body, then submit the issue.'
        : 'Copy still needs to happen manually. Select the payload below and copy it into the GitHub issue body.';
      if (!copied && submitPayloadWrap) submitPayloadWrap.open = true;
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async function () {
      if (!validateAllSteps()) return;

      setSubmitButtonBusy(true);

      try {
        var formData = getFormData();
        var markdown = generateMarkdown();
        var issueTitle = 'New Profile: ' + formData.github;
        var popup = window.open('', '_blank');

        submitState.payload = buildSubmissionPayload(markdown);
        submitState.issueUrl = buildIssueUrl(issueTitle);

        var copied = await copyTextToClipboard(submitState.payload);
        if (popup) {
          popup.opener = null;
          popup.location = submitState.issueUrl;
        }

        showSubmitFallback(copied, Boolean(popup));
      } finally {
        setSubmitButtonBusy(false);
      }
    });
  }

  function escHtml(value) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(value));
    return div.innerHTML;
  }

  function escYaml(value) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
})();
