// Turns DB rows into the JSON shape the mobile app / website consumes.
const BUCKETS = [1, 5, 10, 50, 100, 500, 1e3, 5e3, 1e4, 5e4, 1e5, 5e5, 1e6, 5e6, 1e7, 5e7, 1e8, 5e8, 1e9];

// Play-Store style "10K+" labels
function downloadsLabel(n) {
  n = Number(n);
  let b = 0;
  for (const x of BUCKETS) if (n >= x) b = x;
  if (b === 0) return "0+";
  if (b >= 1e9) return `${b / 1e9}B+`;
  if (b >= 1e6) return `${b / 1e6}M+`;
  if (b >= 1e3) return `${b / 1e3}K+`;
  return `${b}+`;
}

function sizeLabel(bytes) {
  const mb = Number(bytes) / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(mb >= 100 ? 0 : 1)} MB` : `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
}

const fileUrl = (base, id) => (id ? `${base}/api/files/${id}/download` : null);

// `row` comes from the apps table joined with the latest version (see store.js SELECT).
function serializeApp(row, base, { detail = false, admin = false } = {}) {
  const count = Number(row.rating_count);
  const out = {
    packageName: row.package_name,
    title: row.title,
    shortDescription: row.short_description,
    developer: row.developer,
    category: row.category,
    icon: fileUrl(base, row.icon_file),
    rating: { average: count ? Math.round((Number(row.rating_sum) / count) * 10) / 10 : 0, count },
    downloads: Number(row.downloads),
    downloadsLabel: downloadsLabel(row.downloads),
    contentRating: row.content_rating,
    featured: row.featured,
    latestVersion: row.version_code
      ? {
          versionName: row.version_name,
          versionCode: row.version_code,
          size: Number(row.v_size),
          sizeLabel: sizeLabel(row.v_size),
          minSdk: row.v_min_sdk,
          sha256: row.v_sha256,
          changelog: row.v_changelog,
          updatedAt: row.v_created_at,
        }
      : null,
    downloadUrl: row.version_code ? `${base}/api/store/apps/${row.package_name}/download` : null,
    updatedAt: row.updated_at,
    // small preview set for list/home cards (detail views get the full list below)
    featureGraphic: fileUrl(base, row.feature_file),
    screenshots: (row.screenshots || []).slice(0, 4).map((id) => fileUrl(base, id)),
  };
  if (detail || admin) {
    out.description = row.description;
    out.screenshots = (row.screenshots || []).map((id) => fileUrl(base, id));
    out.tags = row.tags;
    out.website = row.website;
    out.privacyPolicyUrl = row.privacy_policy_url;
    out.createdAt = row.created_at;
  }
  if (admin) {
    out.status = row.status;
    out.id = row.id;
  }
  return out;
}

const serializeReview = (r) => ({
  id: r.id,
  author: r.author,
  rating: r.rating,
  body: r.body,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

module.exports = { serializeApp, serializeReview, downloadsLabel, sizeLabel, fileUrl };
