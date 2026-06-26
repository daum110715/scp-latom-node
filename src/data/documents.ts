import type { Document } from '@/types'

export const documents: Document[] = [
  {
    id: 'doc-orientation',
    title: 'Foundation Orientation Protocol',
    type: 'directive',
    summary: 'Standard orientation material for newly recruited Foundation personnel. Covers basic protocols, security clearances, and operational guidelines.',
    content: `# Foundation Orientation Protocol

## Welcome to the SCP Foundation

You have been selected to join the most secretive and important organization in human history. Your previous identity has been expunged from all public records. You are now an asset of the SCP Foundation.

## Your Responsibilities

1. **Secure** — Contain anomalous objects, entities, and phenomena
2. **Contain** — Prevent them from falling into civilian hands
3. **Protect** — Safeguard humanity from threats beyond comprehension

## Security Clearances

| Level | Designation | Access |
|-------|------------|--------|
| Level 1 | Unrestricted | Basic facility access |
| Level 2 | Restricted | Containment wing access |
| Level 3 | Confidential | Full site access |
| Level 4 | Secret | Cross-site operations |
| Level 5 | Top Secret | O5 Command |

## Remember

> The Foundation exists to protect humanity. Every decision made, every life spent, every secret kept — it is all in service of that singular purpose.

**You do not have the right to know everything. You have the obligation to do your part.**`,
    date: '2024-01-01',
    classification: 'Unclassified',
  },
  {
    id: 'doc-breach',
    title: 'Containment Breach Protocol Alpha-9',
    type: 'protocol',
    summary: 'Procedures to be followed in the event of a multi-entity containment breach at any Foundation facility.',
    content: `# Containment Breach Protocol Alpha-9

## Immediate Actions

1. **LOCKDOWN** — All blast doors seal automatically
2. **ALERT** — Site-wide alarm activates (three ascending tones)
3. **ASSEMBLY** — MTF units deploy to designated rally points
4. **ACCOUNTING** — All personnel must report to nearest safe room

## Classification of Breach

- **Level 1**: Single Safe-class entity, localized
- **Level 2**: Multiple Safe or single Euclid, contained wing
- **Level 3**: Euclid/Keter, potential site-wide
- **Level 4**: Keter breach, external threat confirmed
- **Level 5**: Multiple Keter, site integrity compromised

## Critical Reminder

> Under no circumstances should personnel attempt to re-contain entities without MTF support. Your life is not expendable — it is irreplaceable.`,
    date: '2024-03-15',
    classification: 'Confidential',
  },
  {
    id: 'doc-mtf',
    title: 'Mobile Task Force Operations Manual',
    type: 'research',
    summary: 'Comprehensive guide to MTF organization, deployment procedures, and field operations for Foundation tactical units.',
    content: `# Mobile Task Force Operations Manual

## Overview

Mobile Task Forces (MTFs) are the Foundation's field operatives. Each MTF is specialized for specific types of anomalies or operational contexts.

## Notable MTFs

### Alpha-1 ("Red Right Hand")
The personal task force of the O5 Council. Their operations are classified beyond even Level 5 clearance.

### Epsilon-11 ("Nine-Tailed Fox")
Internal security for the Foundation. Deployed during containment breaches to restore order.

### Omega-7 ("Pandora's Box")
[REDACTED — CLEARANCE LEVEL 5 REQUIRED]

### Nu-7 ("Hammer Down")
The Foundation's military arm. Capable of engaging conventional and anomalous threats at scale.

## Field Protocol

1. Assess the situation
2. Establish a perimeter
3. Minimize civilian exposure
4. Contain or neutralize the anomaly
5. Deploy cover story if necessary
6. Extract and debrief`,
    date: '2024-02-20',
    classification: 'Restricted',
  },
  {
    id: 'doc-incident',
    title: 'Incident Report: Site-19 Breach 2024',
    type: 'incident',
    summary: 'Detailed analysis of the major containment breach at Site-19 involving SCP-173 and SCP-106.',
    content: `# Incident Report: Site-19 Breach 2024

## Date: ██/██/2024
## Classification: SECRET

## Summary

At approximately 0347 hours, a cascading containment failure occurred in Wing-C of Site-19. The breach involved simultaneous failures of containment for SCP-173 and SCP-106.

## Timeline

- **0347**: Power fluctuation detected in Wing-C
- **0348**: SCP-173 containment door lock fails
- **0349**: SCP-106 breaches containment through unknown means
- **0351**: Site-wide lockdown initiated
- **0353**: MTF Epsilon-11 deployed
- **0412**: SCP-173 re-contained
- **0445**: SCP-106 re-contained using femur-breaker protocol
- **0500**: All-clear issued

## Casualties
- 12 Foundation personnel deceased
- 3 D-class personnel deceased
- 8 personnel requiring amnestic treatment

## Root Cause

Investigation ongoing. Preliminary analysis suggests coordinated sabotage by [REDACTED].`,
    date: '2024-04-10',
    classification: 'Secret',
  },
]
