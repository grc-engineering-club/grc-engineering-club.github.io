(function () {
  var searchInput = document.getElementById("search-input");
  if (!searchInput) return;

  var cards = Array.from(document.querySelectorAll(".job-card"));
  var chips = Array.from(document.querySelectorAll(".chip"));
  var clearBtn = document.getElementById("clear-filters");
  var countEl = document.getElementById("results-count");
  var noResults = document.getElementById("no-results");
  var summaryEl = document.getElementById("active-filters-summary");
  var pillsEl = document.getElementById("active-filter-pills");

  var FILTER_KEYS = ["specializations", "frameworks", "workModes", "jobTypes", "sources"];
  var DATA_KEYS = {
    specializations: "specializations",
    frameworks: "frameworks",
    workModes: "workModes",
    jobTypes: "jobTypes",
    sources: "sources"
  };

  var activeFilters = {};
  FILTER_KEYS.forEach(function (key) { activeFilters[key] = []; });

  var chipCache = {};
  chips.forEach(function (chip) {
    var group = chip.closest("[data-filter]");
    if (!group) return;
    chipCache[group.dataset.filter + ":" + chip.dataset.value] = chip;
  });

  var badgeCache = {};
  FILTER_KEYS.forEach(function (key) {
    var group = document.querySelector('.filter-group[data-group="' + key + '"]');
    if (group) badgeCache[key] = group.querySelector(".count-badge");
  });

  var cardData = cards.map(function (card) {
    var parsed = {};
    FILTER_KEYS.forEach(function (key) {
      parsed[key] = (card.dataset[DATA_KEYS[key]] || "").split(",").filter(Boolean);
    });
    parsed.title = card.dataset.title || "";
    parsed.company = card.dataset.company || "";
    parsed.location = card.dataset.location || "";
    parsed.allText = [
      parsed.title,
      parsed.company,
      parsed.location
    ].concat(FILTER_KEYS.map(function (key) { return parsed[key].join(" "); })).join(" ");
    return parsed;
  });

  var FADE_MS = 250;
  var pendingTimers = new Map();

  function getChip(filterKey, value) {
    return chipCache[filterKey + ":" + value] || null;
  }

  function hideCard(card) {
    if (card.classList.contains("hidden")) return;
    if (pendingTimers.has(card)) {
      clearTimeout(pendingTimers.get(card));
      pendingTimers.delete(card);
    }
    card.classList.add("fading");
    var timer = setTimeout(function () {
      card.classList.add("hidden");
      pendingTimers.delete(card);
    }, FADE_MS);
    pendingTimers.set(card, timer);
  }

  function showCard(card) {
    if (!card.classList.contains("hidden") && !card.classList.contains("fading")) return;
    if (pendingTimers.has(card)) {
      clearTimeout(pendingTimers.get(card));
      pendingTimers.delete(card);
    }
    card.classList.remove("hidden", "fading");
  }

  function updateSummary() {
    if (!summaryEl || !pillsEl) return;

    var pills = [];
    FILTER_KEYS.forEach(function (key) {
      activeFilters[key].forEach(function (value) {
        var chip = getChip(key, value);
        pills.push({
          key: key,
          value: value,
          label: chip ? chip.textContent : value
        });
      });
    });

    summaryEl.style.display = pills.length ? "" : "none";
    pillsEl.innerHTML = "";

    pills.forEach(function (pill) {
      var btn = document.createElement("button");
      btn.className = "active-filter-pill";
      btn.dataset.filterKey = pill.key;
      btn.dataset.filterValue = pill.value;
      btn.innerHTML = pill.label + ' <span class="pill-x">\u00d7</span>';
      pillsEl.appendChild(btn);
    });
  }

  function updateBadgeCounts() {
    FILTER_KEYS.forEach(function (key) {
      var badge = badgeCache[key];
      if (!badge) return;
      badge.textContent = activeFilters[key].length;
      badge.style.display = activeFilters[key].length ? "" : "none";
    });
  }

  function updateCards() {
    var query = (searchInput.value || "").toLowerCase().trim();
    var visible = 0;

    cards.forEach(function (card, index) {
      var data = cardData[index];
      var show = true;

      if (query && data.allText.indexOf(query) === -1) show = false;

      for (var i = 0; show && i < FILTER_KEYS.length; i++) {
        var key = FILTER_KEYS[i];
        if (activeFilters[key].length) {
          var values = data[key];
          var hasMatch = activeFilters[key].some(function (value) {
            return values.indexOf(value) !== -1;
          });
          if (!hasMatch) show = false;
        }
      }

      if (show) {
        showCard(card);
        visible += 1;
      } else {
        hideCard(card);
      }
    });

    if (countEl) countEl.textContent = visible;
    if (noResults) noResults.style.display = visible === 0 ? "" : "none";
    updateSummary();
    updateBadgeCounts();
  }

  document.querySelectorAll(".filter-group-header").forEach(function (header) {
    header.addEventListener("click", function () {
      var group = header.closest(".filter-group");
      var isOpen = group.classList.toggle("open");
      header.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var group = chip.closest("[data-filter]");
      if (!group) return;
      var key = group.dataset.filter;
      var value = chip.dataset.value;
      var isActive = chip.classList.toggle("active");

      chip.setAttribute("aria-pressed", isActive ? "true" : "false");

      if (isActive) {
        if (activeFilters[key].indexOf(value) === -1) activeFilters[key].push(value);
      } else {
        activeFilters[key] = activeFilters[key].filter(function (item) { return item !== value; });
      }

      updateCards();
    });
  });

  pillsEl && pillsEl.addEventListener("click", function (event) {
    var pill = event.target.closest(".active-filter-pill");
    if (!pill) return;

    var key = pill.dataset.filterKey;
    var value = pill.dataset.filterValue;
    var chip = getChip(key, value);
    if (chip) {
      chip.classList.remove("active");
      chip.setAttribute("aria-pressed", "false");
    }
    activeFilters[key] = activeFilters[key].filter(function (item) { return item !== value; });
    updateCards();
  });

  clearBtn && clearBtn.addEventListener("click", function () {
    searchInput.value = "";
    FILTER_KEYS.forEach(function (key) { activeFilters[key] = []; });
    chips.forEach(function (chip) {
      chip.classList.remove("active");
      chip.setAttribute("aria-pressed", "false");
    });
    updateCards();
  });

  searchInput.addEventListener("input", updateCards);
  updateCards();
})();
