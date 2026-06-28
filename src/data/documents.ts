import type { Document } from '@/types'

export const documents: Document[] = [
  {
    id: 'doc-user-manual',
    title: 'Latom Node User Manual',
    type: 'protocol',
    summary: 'Comprehensive guide for navigating and utilizing the Latom Node documentation terminal.',
    content: 'Latom Node User Manual — comprehensive guide for navigating and utilizing the documentation terminal.',
    date: '2026-06-27',
    classification: 'Restricted',
  },
  {
    id: 'doc-anomalous-materials',
    title: 'Anomalous Materials Handling',
    type: 'research',
    summary: 'Standard research procedures for handling and analyzing anomalous materials in laboratory settings.',
    content: 'Standard research procedures for handling and analyzing anomalous materials in laboratory settings.',
    date: '2026-03-15',
    classification: 'Confidential',
  },
  {
    id: 'doc-site-breach-report',
    title: 'Site-19 Breach Report',
    type: 'incident',
    summary: 'Post-incident analysis of the containment breach at Site-19, Sector-4.',
    content: 'Post-incident analysis of the containment breach at Site-19, Sector-4.',
    date: '2026-01-20',
    classification: 'Secret',
  },
  {
    id: 'doc-o5-directive-7',
    title: 'O5 Directive — Protocol Zeta-9',
    type: 'directive',
    summary: 'Executive directive regarding the activation of Protocol Zeta-9 for XK-class scenarios.',
    content: 'Executive directive regarding the activation of Protocol Zeta-9 for XK-class scenarios.',
    date: '2025-11-02',
    classification: 'Top Secret',
  },
]
