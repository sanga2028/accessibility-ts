import * as fs from 'fs';
import * as path from 'path';
import xmlbuilder from 'xmlbuilder';
import type { AxeResults } from 'axe-core';

export function generateXmlReport(results: AxeResults, urlKey: string) {
  const xml = xmlbuilder.create('AccessibilityReport');
  xml.ele('URL', urlKey);

  const violations = xml.ele('Violations');
  (results.violations || []).forEach(v => {
    const violation = violations.ele('Violation');
    violation.ele('Id', v.id);
    violation.ele('Description', v.description);
    violation.ele('Impact', v.impact || '');
    violation.ele('HelpUrl', v.helpUrl || '');
  });

  const xmlstring = xml.end({ pretty: true });
  const safeFileName = `${urlKey.replace(/https?:\/\//, '').replace(/\W+/g, '-')}-report.xml`;
  const xmlPath = path.join('reports', 'xml', safeFileName);

  fs.mkdirSync(path.dirname(xmlPath), { recursive: true });
  fs.writeFileSync(xmlPath, xmlstring, 'utf8');
}