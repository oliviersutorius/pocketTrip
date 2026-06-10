import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Project, CategorySummary, ExpenseWithDetails } from '../types';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Palette de couleurs pour les camemberts ---
const SLICE_COLORS = [
  '#1A6BAE', '#00BCD4', '#FF9800', '#4CAF50',
  '#9C27B0', '#E91E63', '#FF5722', '#00897B',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${escapeHtml(currency)}`;
}

// --- Génération SVG camembert ---

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: +(cx + r * Math.cos(rad)).toFixed(3),
    y: +(cy + r * Math.sin(rad)).toFixed(3),
  };
}

function svgPie(slices: { value: number; color: string }[], size: number): string {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return '';

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;

  // Cas un seul secteur = cercle plein
  const dominant = slices.length === 1 ? slices[0] : slices.find((s) => s.value === total);
  if (dominant) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dominant.color}"/>
    </svg>`;
  }

  let angle = 0;
  const paths = slices.map((slice) => {
    const sweep = (slice.value / total) * 360;
    const start = polarToCartesian(cx, cy, r, angle);
    const end = polarToCartesian(cx, cy, r, angle + sweep);
    const largeArc = sweep > 180 ? 1 : 0;
    const path = `<path d="M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z" fill="${slice.color}" stroke="white" stroke-width="2"/>`;
    angle += sweep;
    return path;
  });

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths.join('')}</svg>`;
}

// --- Section bilan budget ---

function buildBudgetSection(project: Project, totalSpent: number): string {
  const remaining = project.initial_budget - totalSpent;
  const isOver = totalSpent > project.initial_budget;
  const reference = Math.max(project.initial_budget, totalSpent);

  const slices = isOver
    ? [
        { value: project.initial_budget, color: '#1A6BAE' },
        { value: totalSpent - project.initial_budget, color: '#D32F2F' },
      ]
    : [
        { value: totalSpent, color: '#1A6BAE' },
        { value: project.initial_budget - totalSpent, color: '#4CAF50' },
      ];

  const statusColor = isOver ? '#D32F2F' : '#2E7D32';
  const statusLabel = isOver
    ? `Budget dépassé de <strong>${formatAmount(Math.abs(remaining), project.currency)}</strong>`
    : `Budget restant de <strong>${formatAmount(remaining, project.currency)}</strong>`;

  const legendItems = isOver
    ? [
        { color: '#1A6BAE', label: `Budget initial : ${formatAmount(project.initial_budget, project.currency)}` },
        { color: '#D32F2F', label: `Dépassement : ${formatAmount(totalSpent - project.initial_budget, project.currency)}` },
        { color: '#1A6BAE', label: `Total dépensé : ${formatAmount(totalSpent, project.currency)}` },
      ]
    : [
        { color: '#1A6BAE', label: `Total dépensé : ${formatAmount(totalSpent, project.currency)}` },
        { color: '#4CAF50', label: `Budget restant : ${formatAmount(remaining, project.currency)}` },
        { color: '#999', label: `Budget initial : ${formatAmount(project.initial_budget, project.currency)}` },
      ];

  const legendHTML = legendItems
    .map((l) => `<div class="legend-row"><span class="dot" style="background:${l.color}"></span>${l.label}</div>`)
    .join('');

  return `
    <div class="budget-row">
      <div class="pie-wrap">${svgPie(slices, 130)}</div>
      <div class="budget-details">
        ${legendHTML}
        <div class="status-label" style="color:${statusColor}">${statusLabel}</div>
      </div>
    </div>`;
}

// --- Section récap par catégorie ---

function buildCategorySection(summary: CategorySummary[], currency: string): string {
  const activeCats = summary.filter((c) => c.total > 0);
  if (activeCats.length === 0) return '<p style="color:#999">Aucune dépense enregistrée.</p>';

  const cards = activeCats.map((cat) => {
    const activeSubs = cat.subcategories.filter((s) => s.total > 0);
    const slices = activeSubs.map((sub, i) => ({
      value: sub.total,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));

    const legendHTML = activeSubs
      .map((sub, i) => {
        const pct = ((sub.total / cat.total) * 100).toFixed(0);
        return `<div class="legend-row">
          <span class="dot" style="background:${SLICE_COLORS[i % SLICE_COLORS.length]}"></span>
          <span>${escapeHtml(sub.subcategory_name)}</span>
          <span class="leg-amount">${formatAmount(sub.total, currency)} (${pct}%)</span>
        </div>`;
      })
      .join('');

    return `
      <div class="cat-card">
        <div class="cat-title">${escapeHtml(cat.category_name)}</div>
        <div class="cat-total">${formatAmount(cat.total, currency)}</div>
        <div class="pie-wrap">${svgPie(slices, 110)}</div>
        <div class="cat-legend">${legendHTML}</div>
      </div>`;
  });

  return `<div class="cats-grid">${cards.join('')}</div>`;
}

// --- Section liste des dépenses ---

function buildExpenseList(expenses: ExpenseWithDetails[]): string {
  if (expenses.length === 0) return '<p style="color:#999">Aucune dépense.</p>';

  const sorted = [...expenses].sort((a, b) => {
    const catCmp = a.category_name.localeCompare(b.category_name, 'fr');
    if (catCmp !== 0) return catCmp;
    const subCmp = a.subcategory_name.localeCompare(b.subcategory_name, 'fr');
    if (subCmp !== 0) return subCmp;
    return a.date.localeCompare(b.date);
  });

  // Grouper par catégorie → sous-catégorie
  interface SubGroup { name: string; rows: ExpenseWithDetails[] }
  interface CatGroup { name: string; subs: SubGroup[] }

  const groups: CatGroup[] = [];
  for (const e of sorted) {
    let cat = groups.find((g) => g.name === e.category_name);
    if (!cat) { cat = { name: e.category_name, subs: [] }; groups.push(cat); }
    let sub = cat.subs.find((s) => s.name === e.subcategory_name);
    if (!sub) { sub = { name: e.subcategory_name, rows: [] }; cat.subs.push(sub); }
    sub.rows.push(e);
  }

  const htmlRows: string[] = [];
  for (const cat of groups) {
    const catSpan = cat.subs.reduce((n, s) => n + s.rows.length, 0);
    let firstCat = true;

    for (const sub of cat.subs) {
      const subSpan = sub.rows.length;
      let firstSub = true;

      for (const e of sub.rows) {
        const dateStr = format(parseISO(e.date), 'd MMM yyyy', { locale: fr });
        const catCell = firstCat
          ? `<td rowspan="${catSpan}" class="cat-cell${firstCat ? ' cat-group-start' : ''}">${escapeHtml(cat.name)}</td>`
          : '';
        const subCell = firstSub
          ? `<td rowspan="${subSpan}" class="sub-cell">${escapeHtml(sub.name)}</td>`
          : '';
        const rowClass = firstCat ? ' class="group-start"' : firstSub ? ' class="sub-start"' : '';
        htmlRows.push(`<tr${rowClass}>
          ${catCell}${subCell}
          <td>${dateStr}</td>
          <td>${escapeHtml((e.comment ?? '').slice(0, 500))}</td>
          <td class="amount">${formatAmount(e.amount, e.currency)}</td>
        </tr>`);
        firstCat = false;
        firstSub = false;
      }
    }
  }

  return `<table>
    <thead>
      <tr>
        <th>Catégorie</th><th>Sous-catégorie</th><th>Date</th>
        <th>Commentaire</th><th style="text-align:right">Montant</th>
      </tr>
    </thead>
    <tbody>${htmlRows.join('')}</tbody>
  </table>`;
}

// --- Template HTML complet ---

function buildHTML(
  project: Project,
  summary: CategorySummary[],
  expenses: ExpenseWithDetails[],
  totalSpent: number
): string {
  const exportDate = format(new Date(), 'd MMMM yyyy', { locale: fr });
  const startDate = format(parseISO(project.start_date), 'd MMMM yyyy', { locale: fr });
  const endDate = format(parseISO(project.end_date), 'd MMMM yyyy', { locale: fr });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1A237E; padding: 28px; }

    /* En-tête */
    .header { background:#1A6BAE; color:white; padding:18px 22px; border-radius:8px; margin-bottom:22px; }
    .header h1 { font-size:20px; margin-bottom:3px; }
    .header p { font-size:11px; opacity:0.85; }

    /* Titres de section */
    h2 { font-size:13px; color:#1A6BAE; border-bottom:2px solid #1A6BAE; padding-bottom:4px;
         margin:22px 0 14px; text-transform:uppercase; letter-spacing:0.5px; }

    /* Bilan budget */
    .budget-row { display:flex; align-items:center; gap:28px; }
    .budget-details { flex:1; }
    .legend-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:12px; }
    .dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; display:inline-block; }
    .status-label { margin-top:12px; font-size:13px; font-weight:bold; }

    /* Camemberts catégories */
    .cats-grid { display:flex; flex-wrap:wrap; gap:16px; }
    .cat-card { width:calc(50% - 8px); background:#F8FBFF; border:1px solid #E3F2FD;
                border-radius:8px; padding:12px; }
    .cat-title { font-weight:bold; font-size:12px; color:#1A6BAE; margin-bottom:2px; }
    .cat-total { font-size:11px; color:#555; margin-bottom:8px; }
    .pie-wrap { margin-bottom:10px; }
    .cat-legend .legend-row { font-size:10px; margin-bottom:4px; justify-content:space-between; }
    .leg-amount { margin-left:auto; color:#1A6BAE; font-weight:bold; white-space:nowrap; }

    /* Tableau dépenses */
    table { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:11px; }
    th { background:#E3F2FD; color:#1A237E; text-align:left; padding:6px 8px; }
    td { padding:5px 8px; border-bottom:1px solid #EEF4FB; vertical-align:top; }
    tr:last-child td { border-bottom:none; }
    .amount { text-align:right; white-space:nowrap; }
    .cat-cell { font-weight:bold; background:#E3F2FD; color:#1A237E;
                border-right:2px solid #1A6BAE; white-space:nowrap; }
    .sub-cell { background:#F8FBFF; color:#555;
                border-right:1px solid #BBDEFB; white-space:nowrap; }
    tr.group-start td { border-top:2px solid #1A6BAE; }
    tr.sub-start td { border-top:1px dashed #BBDEFB; }

    .footer { margin-top:28px; text-align:center; font-size:10px; color:#999; }
  </style>
</head>
<body>

  <div class="header">
    <h1>${escapeHtml(project.name)}</h1>
    <p>${startDate} → ${endDate} &nbsp;|&nbsp; Exporté le ${exportDate}</p>
  </div>

  <h2>Bilan Budget</h2>
  ${buildBudgetSection(project, totalSpent)}

  <h2>Récapitulatif par Catégorie</h2>
  ${buildCategorySection(summary, project.currency)}

  <h2>Liste des Dépenses</h2>
  ${buildExpenseList(expenses)}

  <div class="footer">myTravel — ${escapeHtml(project.name)} — ${exportDate}</div>

</body>
</html>`;
}

// --- Export public ---

export async function exportToPDF(
  project: Project,
  summary: CategorySummary[],
  expenses: ExpenseWithDetails[],
  totalSpent: number
): Promise<void> {
  const html = buildHTML(project, summary, expenses, totalSpent);
  const { uri } = await Print.printToFileAsync({ html });
  const dateStr = format(new Date(), 'yyyy-MM-dd');

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Exporter ${project.name}`,
    UTI: 'com.adobe.pdf',
  });
}
