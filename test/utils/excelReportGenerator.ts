import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import type { AxeResults, Result, NodeResult, ImpactValue } from 'axe-core';

type NormalizedImpact = Exclude<ImpactValue, null | undefined> | 'none';

function normalizeImpact(impact: ImpactValue | null | undefined): NormalizedImpact {
  return (impact ?? 'none') as NormalizedImpact;
}

function toSummaryRows(resultsMap: Map<string, AxeResults>) {
  const rows: Array<Record<string, string | number>> = [];

  for (const [key, results] of resultsMap.entries()) {
    const violations: Result[] = results?.violations || [];
    for (const v of violations) {
      rows.push({
        Scan: key,
        RuleId: v.id,
        Impact: normalizeImpact(v.impact),
        Description: v.description ?? '',
        HelpUrl: v.helpUrl ?? '',
        Tags: (v.tags || []).join(','),
        NodesCount: (v.nodes || []).length,
      });
    }
  }

  return rows;
}

function toNodeRows(resultsMap: Map<string, AxeResults>) {
  const rows: Array<Record<string, string>> = [];

  for (const [key, results] of resultsMap.entries()) {
    const violations: Result[] = results?.violations || [];
    for (const v of violations) {
      for (const n of (v.nodes || []) as NodeResult[]) {
        rows.push({
          Scan: key,
          RuleId: v.id,
          Impact: normalizeImpact(v.impact),
          Target: (n.target || []).join(' '),
          Html: n.html ?? '',
          FailureSummary: n.failureSummary ?? '',
        });
      }
    }
  }

  return rows;
}

function toStatsRows(resultsMap: Map<string, AxeResults>) {
  const rows: Array<Record<string, string | number>> = [];

  for (const [key, results] of resultsMap.entries()) {
    const impacts: Record<string, number> = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      none: 0,
    };

    for (const v of results?.violations || []) {
      const impactKey = normalizeImpact(v.impact) as keyof typeof impacts;
      impacts[impactKey] = (impacts[impactKey] || 0) + 1;
    }

    rows.push({
      Scan: key,
      Violations: (results?.violations || []).length,
      Critical: impacts.critical || 0,
      Serious: impacts.serious || 0,
      Moderate: impacts.moderate || 0,
      Minor: impacts.minor || 0,
    });
  }

  return rows;
}

function setHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = {
    vertical: 'middle',
    horizontal: 'left',
    wrapText: true,
  } as Partial<ExcelJS.Alignment>;
}

function autoWidth(worksheet: ExcelJS.Worksheet) {
  const totalColumns = worksheet.columnCount || 0;
  for (let i = 1; i <= totalColumns; i++) {
    const col = worksheet.getColumn(i);
    if (!col) continue;

    let maxLength = 12;
    if (typeof col.eachCell === 'function') {
      col.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
        const text = cell?.value != null ? String(cell.value) : '';
        maxLength = Math.max(maxLength, Math.min(text.length + 2, 60));
      });
    } else {
      const values: unknown[] = (col as any).values ?? [];
      for (const v of values) {
        const text = v != null ? String(v) : '';
        maxLength = Math.max(maxLength, Math.min(text.length + 2, 60));
      }
    }

    col.width = maxLength;
  }
}

export async function generateExcelFromResultsMap(
  resultsMap: Map<string, AxeResults>,
  outDir = path.join('reports', 'excel'),
) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Accessibility Scanner';
  workbook.created = new Date();

  const summary = toSummaryRows(resultsMap);
  const wsSummary = workbook.addWorksheet('Violations');
  wsSummary.columns = [
    { header: 'Scan', key: 'Scan' },
    { header: 'RuleId', key: 'RuleId' },
    { header: 'Impact', key: 'Impact' },
    { header: 'Description', key: 'Description' },
    { header: 'HelpUrl', key: 'HelpUrl' },
    { header: 'Tags', key: 'Tags' },
    { header: 'NodesCount', key: 'NodesCount' },
  ];
  wsSummary.addRows(summary);
  setHeaderStyle(wsSummary.getRow(1));
  autoWidth(wsSummary);

  const nodes = toNodeRows(resultsMap);
  const wsNodes = workbook.addWorksheet('Nodes');
  wsNodes.columns = [
    { header: 'Scan', key: 'Scan' },
    { header: 'RuleId', key: 'RuleId' },
    { header: 'Impact', key: 'Impact' },
    { header: 'Target', key: 'Target' },
    { header: 'Html', key: 'Html' },
    { header: 'FailureSummary', key: 'FailureSummary' },
  ];
  wsNodes.addRows(nodes);
  setHeaderStyle(wsNodes.getRow(1));
  autoWidth(wsNodes);

  const stats = toStatsRows(resultsMap);
  const wsStats = workbook.addWorksheet('Stats');
  wsStats.columns = [
    { header: 'Scan', key: 'Scan' },
    { header: 'Violations', key: 'Violations' },
    { header: 'Critical', key: 'Critical' },
    { header: 'Serious', key: 'Serious' },
    { header: 'Moderate', key: 'Moderate' },
    { header: 'Minor', key: 'Minor' },
  ];
  wsStats.addRows(stats);
  setHeaderStyle(wsStats.getRow(1));
  autoWidth(wsStats);

  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const filePath = path.join(outDir, `accessibility-report-${ts}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  console.log(`Excel report written to ${filePath}`);
}
