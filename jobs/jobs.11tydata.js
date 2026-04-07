function addDays(dateValue, days) {
  const base = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function normalizeList(data, arrayKey, scalarKey) {
  if (Array.isArray(data[arrayKey]) && data[arrayKey].length) return data[arrayKey];
  if (data[scalarKey]) return [data[scalarKey]];
  return [];
}

module.exports = {
  layout: "layouts/job.njk",
  permalink: (data) => "jobs/" + (data.slug || data.page.fileSlug) + "/index.html",
  tags: "jobs-content",
  eleventyComputed: {
    slug: (data) => data.slug || data.page.fileSlug,
    status: (data) => data.status || "published",
    sources: (data) => normalizeList(data, "sources", "source"),
    work_modes: (data) => normalizeList(data, "work_modes", "work_mode"),
    job_types: (data) => normalizeList(data, "job_types", "job_type"),
    expires_date: (data) => data.expires_date || addDays(data.posted_date, 30),
    description: (data) => data.description || ((data.title && data.company) ? (data.title + " at " + data.company) : "Open governance, risk, and compliance role"),
    eleventyExcludeFromCollections: (data) => String(data.page.fileSlug || "").startsWith("_")
  }
};
