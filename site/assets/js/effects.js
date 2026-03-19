(function () {
  function isDark() {
    return window.getEffectiveTheme() === "dark";
  }

  var chartInstances = [];
  var PALETTE = [
    "#e8650a",
    "#f59e0b",
    "#d4a017",
    "#c2410c",
    "#ea580c",
    "#b45309",
    "#f97316",
    "#dc2626"
  ];

  function chartTextColor() {
    return isDark() ? "#a0a0a0" : "#555555";
  }

  function initCharts() {
    if (typeof Chart === "undefined") return;

    var element = document.getElementById("chart-data");
    if (!element) return;

    var data;
    try {
      data = JSON.parse(element.textContent);
    } catch (error) {
      return;
    }

    Chart.defaults.color = chartTextColor();

    var specLabels = Object.keys(data.specializations || {}).slice(0, 8);
    var specValues = specLabels.map(function (key) {
      return data.specializations[key];
    });

    chartInstances.push(new Chart(document.getElementById("chart-specs"), {
      type: "bar",
      data: {
        labels: specLabels,
        datasets: [{
          data: specValues,
          backgroundColor: PALETTE.slice(0, specLabels.length),
          borderWidth: 0
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: chartTextColor(), stepSize: 1 }, grid: { display: false } },
          y: { ticks: { color: chartTextColor() }, grid: { display: false } }
        }
      }
    }));

    var frameworkLabels = Object.keys(data.frameworks || {}).slice(0, 8);
    var frameworkValues = frameworkLabels.map(function (key) {
      return data.frameworks[key];
    });

    chartInstances.push(new Chart(document.getElementById("chart-frameworks"), {
      type: "doughnut",
      data: {
        labels: frameworkLabels,
        datasets: [{
          data: frameworkValues,
          backgroundColor: PALETTE.slice(0, frameworkLabels.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: chartTextColor(), font: { size: 10 }, boxWidth: 12 }
          }
        }
      }
    }));

    var languageLabels = Object.keys(data.languages || {}).slice(0, 8);
    var languageValues = languageLabels.map(function (key) {
      return data.languages[key];
    });

    if (languageLabels.length) {
      chartInstances.push(new Chart(document.getElementById("chart-languages"), {
        type: "bar",
        data: {
          labels: languageLabels,
          datasets: [{
            data: languageValues,
            backgroundColor: PALETTE.slice(0, languageLabels.length),
            borderWidth: 0
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: chartTextColor(), stepSize: 1 }, grid: { display: false } },
            y: { ticks: { color: chartTextColor() }, grid: { display: false } }
          }
        }
      }));
    }

    var availabilityLabels = Object.keys(data.available_for || {});
    var availabilityValues = availabilityLabels.map(function (key) {
      return data.available_for[key];
    });

    chartInstances.push(new Chart(document.getElementById("chart-available"), {
      type: "polarArea",
      data: {
        labels: availabilityLabels,
        datasets: [{
          data: availabilityValues,
          backgroundColor: PALETTE.slice(0, availabilityLabels.length).map(function (color) {
            return color + "cc";
          }),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: chartTextColor(), font: { size: 10 }, boxWidth: 12 }
          }
        },
        scales: {
          r: {
            ticks: { display: false },
            grid: { color: isDark() ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }
          }
        }
      }
    }));
  }

  function destroyCharts() {
    chartInstances.forEach(function (instance) {
      instance.destroy();
    });
    chartInstances = [];
  }

  function init() {
    initCharts();
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.attributeName === "data-theme") {
        destroyCharts();
        initCharts();
      }
    });
  });

  observer.observe(document.documentElement, { attributes: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.setTimeout(init, 50);
    });
  } else {
    window.setTimeout(init, 50);
  }
})();
