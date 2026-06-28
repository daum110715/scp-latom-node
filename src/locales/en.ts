export default {
  site: {
    title: 'SCP Foundation Latom Node',
    tagline: 'Secure. Contain. Protect.',
  },
  nav: {
    home: 'Home',
    catalog: 'SCP Catalog',
    documents: 'Documents',
    about: 'About',
    dashboard: 'Dashboard',
    proposals: 'Proposals',
    activity: 'Activity',
  },
  header: {
    searchPlaceholder: 'Search',
    searchTitle: 'Search (Ctrl+K)',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    langSwitch: '中文',
  },
  sidebar: {
    node: 'NODE',
    nodeValue: 'LATOM-7',
    status: 'STATUS',
    active: 'ACTIVE',
    clearance: 'CLEARANCE',
    level4: 'LEVEL 4',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
  },
  footer: {
    brand: 'SCP Foundation',
    system: 'Latom Node Documentation System',
  },
  hero: {
    badge: 'LATOM NODE — DOCUMENTATION TERMINAL v7.2.1',
    titleLine: 'SCP Foundation',
    titleAccent: 'Latom Node',
    description:
      'A comprehensive documentation and archival system for anomalous objects, entities, and phenomena under Foundation jurisdiction. Access restricted to authorized personnel with Level 2 clearance or above.',
    browseCatalog: 'Browse Catalog',
    learnMore: 'Learn More',
  },
  stats: {
    totalEntries: 'Total Entries',
    safe: 'Safe',
    euclid: 'Euclid',
    keter: 'Keter',
    documents: 'Documents',
    personnel: 'Personnel',
  },
  recent: {
    title: 'Recent Entries',
    viewAll: 'View all',
  },
  catalog: {
    title: 'SCP Catalog',
    description: 'Browse all documented anomalous objects and entities under Foundation jurisdiction.',
    searchPlaceholder: 'Search entries...',
    entriesFound: '{count} entries found',
    empty: 'No entries match your search criteria.',
  },
  backToTop: 'Back to top',
  entry: {
    back: 'Back to Catalog',
    author: 'Author:',
    date: 'Date:',
    objectClass: 'Object Class',
    containment: 'Special Containment Procedures',
    description: 'Description',
    addenda: 'Addenda',
    notFound: 'Entry Not Found',
    notFoundDesc: 'The requested SCP entry does not exist in the Latom Node database.',
    returnToCatalog: 'Return to Catalog',
    download: 'Download article',
    downloading: 'Downloading…',
    report: 'Report Issue',
    reportType: 'Report Type',
    reportTypes: {
      content_error: 'Content Error',
      display_issue: 'Display Issue',
      special_handling: 'Special Handling',
      other: 'Other',
    },
    reportDescription: 'Description',
    reportPlaceholder: 'Describe the issue you found (10-2000 characters)…',
    reportSubmit: 'Submit Report',
    reportSubmitting: 'Submitting…',
    reportSuccess: 'Report submitted successfully. Thank you for your feedback.',
    reportSlots: '{remaining} of {max} report slots remaining for this entry',
  },
  documents: {
    title: 'Documents',
    description: 'Foundation protocols, research papers, and incident reports.',
    all: 'All',
    read: 'Read →',
    types: {
      protocol: 'Protocol',
      research: 'Research',
      incident: 'Incident',
      directive: 'Directive',
    },
  },
  docs: {
    'doc-user-manual': {
      title: 'Latom Node User Manual',
      summary: 'Comprehensive guide for navigating and utilizing the Latom Node documentation terminal.',
      content: `# Latom Node User Manual

## 1. Overview

The Latom Node Documentation Terminal (Node LATOM-7) is a secure archival and retrieval system operated by the SCP Foundation. This terminal provides authorized personnel with access to SCP entries, Foundation documents, and operational tools.

> All access is logged. Unauthorized use will result in disciplinary action.

## 2. Getting Started

### 2.1 Registration

To create a Foundation account:

- Click **Register** on the login page
- Choose a unique **work codename** (3-32 characters, letters, numbers, underscores)
- Set a secure **login key** (minimum 8 characters)
- Confirm your login key and submit

### 2.2 Authentication

Log in using your codename and login key. Your session will persist until you explicitly log out or your token expires. All actions are recorded under your personnel profile.

## 3. Navigation

The terminal interface consists of three main areas:

- **Header** — Search bar, language toggle (EN/CN), theme switch, and personal terminal
- **Sidebar** — Primary navigation links to all sections
- **Content Area** — Active page content with contextual controls

### 3.1 Available Sections

- **Dashboard** — Homepage with system statistics and recent entries
- **SCP Catalog** — Browse all documented anomalous objects and entities
- **Documents** — Foundation protocols, research papers, and incident reports
- **Proposals** — Submit and vote on operational proposals
- **Activity** — View your browsing history and bookmarked entries
- **About** — Foundation information and object classification reference

## 4. SCP Catalog

### 4.1 Browsing Entries

The catalog displays all indexed SCP entries. Each entry card shows:

- **SCP Number** — Unique identifier (e.g., SCP-173)
- **Object Class** — Containment classification (Safe, Euclid, Keter, Thaumiel, Apollyon, Neutralized)
- **Name** — Designated name of the anomalous object

### 4.2 Filtering and Search

- Use the **search bar** to find entries by number or name
- Click **object class buttons** to filter by containment classification
- Switch between **EN** (English SCP Wiki) and **CN** (Chinese SCP Foundation) databases

### 4.3 Entry Details

Each entry page contains:

- **Special Containment Procedures** — Current containment requirements
- **Description** — Physical and behavioral characteristics
- **Addenda** — Supplementary research notes and incident logs

Use the **Bookmark** button to save entries to your personal collection.

## 5. Documents

Foundation documents are organized by type:

- **Protocol** — Standard operating procedures and containment guidelines
- **Research** — Scientific papers and experimental findings
- **Incident** — Breach reports and post-incident analyses
- **Directive** — Executive orders and policy changes

Each document has a **classification level** indicating its sensitivity:

- Unclassified — Publicly available information
- Restricted — Limited to assigned personnel
- Confidential — Requires need-to-know basis
- Secret — Senior staff only
- Top Secret — O5 Council authorization required

## 6. Proposals

### 6.1 Submitting Proposals

Personnel may submit operational proposals for Foundation review:

- Navigate to **Proposals** and click **Submit Proposal**
- Select a category: Protocol, Research, Containment, or General
- Provide a descriptive title (5-200 characters)
- Detail your proposal using the provided template
- Daily limit: 2 proposals per personnel

### 6.2 Voting

All personnel may vote on open proposals:

- **For** — Approve the proposal
- **Against** — Oppose the proposal
- **Abstain** — Decline to vote

Votes are **immutable** once cast. Proposals are reviewed by senior staff based on community input.

## 7. Activity

### 7.1 Browsing History

Your recent viewing history is automatically recorded. Use the **Clear All** option to reset your history. History is limited to 500 entries per personnel.

### 7.2 Bookmarks

Save SCP entries for quick reference:

- Click the **bookmark icon** on any entry page
- Access all bookmarks from the **Activity** section
- Remove bookmarks individually as needed

## 8. Personal Terminal

Access your terminal from the sidebar footer or header menu:

- **View** your codename, role, clearance level, and join date
- **Edit** your codename (must remain unique)
- **Change** your login key (requires current key verification)
- **Log out** to end your session

## 9. Search

The global search function (Ctrl+K or click the search icon) searches across:

- SCP entry numbers and names
- Document titles and content

Results are categorized by type (SCP or Document) for quick navigation.

## 10. Interface Controls

### 10.1 Theme

Toggle between **dark mode** and **light mode** using the sun/moon icon in the header. Your preference is saved locally.

### 10.2 Language

Switch between **English** and **Chinese** using the language toggle. All interface text and content labels update accordingly. Your language preference is persisted.

### 10.3 Sidebar

The sidebar can be **collapsed** using the arrow button at the bottom for a wider content area. Navigation remains accessible via the collapsed icon labels.

## 11. Security Notice

- Never share your login key with other personnel
- Report suspicious terminal activity to your site administrator
- All access attempts, including failed authentications, are logged
- Classified information must not be transmitted outside secure channels

## 12. Technical Support

For terminal malfunctions or access issues, contact your site IT department or submit a report through the Foundation's internal ticketing system.

> Document Classification: **Restricted**
> Last Updated: 2026-06-27
> Node: LATOM-7 | Version: 7.2.1`,
    },
    'doc-anomalous-materials': {
      title: 'Anomalous Materials Handling',
      summary: 'Standard research procedures for handling and analyzing anomalous materials in laboratory settings.',
      content: `# Anomalous Materials Handling

## Safety Protocols

All personnel working with anomalous materials must adhere to the following safety protocols:

- Wear appropriate PPE at all times
- Never handle materials without Level 2+ clearance
- Report any unusual reactions immediately
- Follow decontamination procedures after each session

## Laboratory Procedures

### Preparation

Ensure all equipment is calibrated and sanitized. Verify containment field generators are operational before opening any sample containers.

### Analysis

Use only approved analytical instruments. Record all observations in real-time. Any deviation from expected behavior must be documented and reported to the supervising researcher.

### Storage

Anomalous materials must be returned to their designated containment units within 30 minutes of analysis completion. Never leave materials unattended outside containment.

> Document Classification: **Confidential**`,
    },
    'doc-site-breach-report': {
      title: 'Site-19 Breach Report',
      summary: 'Post-incident analysis of the containment breach at Site-19, Sector-4.',
      content: `# Site-19 Breach Report — Sector-4

## Incident Summary

On 2026-01-18 at approximately 03:47 UTC, a containment breach occurred in Sector-4 of Site-19. The breach involved SCP-████ and resulted in a temporary loss of containment for approximately 12 minutes.

## Timeline

- **03:47** — Automated alarms triggered in Sector-4
- **03:49** — Security teams dispatched to Sector-4
- **03:52** — Perimeter lockdown initiated
- **03:59** — SCP-████ re-contained by MTF Epsilon-11
- **04:01** — All-clear signal issued

## Root Cause

Investigation determined the breach was caused by a failure in the backup power system, which temporarily disrupted the containment field generators. The primary power system had been undergoing scheduled maintenance.

## Recommendations

- Upgrade backup power systems in all Keter-level containment sectors
- Implement redundant containment field generators
- Revise maintenance scheduling to ensure overlap coverage

> Document Classification: **Secret**`,
    },
    'doc-o5-directive-7': {
      title: 'O5 Directive — Protocol Zeta-9',
      summary: 'Executive directive regarding the activation of Protocol Zeta-9 for XK-class scenarios.',
      content: `# O5 DIRECTIVE — PROTOCOL ZETA-9

## Classification: TOP SECRET — O5 EYES ONLY

## Preamble

This directive establishes the procedures and authorization chain for the activation of Protocol Zeta-9 in the event of an XK-class end-of-the-world scenario.

## Section 1: Activation Authority

Protocol Zeta-9 may only be activated by a unanimous vote of the O5 Council. No single member, regardless of circumstance, may authorize activation independently.

## Section 2: Activation Criteria

The following conditions must be met before activation:

- Confirmed XK-class scenario in progress
- All conventional containment measures exhausted
- Estimated time to total breach: less than 6 hours
- At least 3 O5 Council members available for vote

## Section 3: Execution

Upon activation, the following steps will be executed in sequence:

- Global amnestic distribution via Protocol ALPHA-13
- Activation of all Thaumiel-class assets
- Mobilization of all available Mobile Task Forces
- Implementation of narrative restructuring protocols

## Section 4: Post-Event

Following successful execution, all personnel involved will undergo Class-A amnestic treatment. This directive and all related documentation will be reclassified.

> Document Classification: **Top Secret**`,
    },
  },
  about: {
    title: 'About the Foundation',
    description: 'Understanding the SCP Foundation and the Latom Node documentation system.',
    foundation: {
      title: 'The SCP Foundation',
      p1: 'The SCP Foundation is a clandestine organization operating under the authority of the United Nations and various world governments. Its mission is to secure, contain, and protect anomalous objects, entities, and phenomena that pose a threat to normalcy and human civilization.',
      p2: 'Founded in the early 19th century, the Foundation has grown into a global network of secure facilities, research laboratories, and mobile task forces dedicated to understanding and neutralizing anomalous threats.',
    },
    latomNode: {
      title: 'The Latom Node',
      p1: 'The Latom Node is a documentation terminal within the Foundation\'s information network. It serves as an archival and retrieval system for SCP entries, containment procedures, research documents, and operational protocols.',
      p2: 'Designated as Node LATOM-7, this terminal operates under Level 4 clearance and maintains synchronization with the central Foundation database. All information presented is current as of the last synchronization cycle.',
    },
    classification: {
      title: 'Object Classification System',
      safe: {
        name: 'Safe',
        desc: 'Objects that are easily and safely contained. Minimal risk when proper procedures are followed.',
      },
      euclid: {
        name: 'Euclid',
        desc: 'Objects requiring more extensive containment procedures. Behavior is not fully understood or predictable.',
      },
      keter: {
        name: 'Keter',
        desc: 'Objects that are exceedingly difficult to contain consistently or pose significant threat if breached.',
      },
      thaumiel: {
        name: 'Thaumiel',
        desc: 'Objects used by the Foundation to contain or counteract other anomalous entities or phenomena.',
      },
      apollyon: {
        name: 'Apollyon',
        desc: 'Objects that cannot be contained, are expected to breach imminently, and pose a catastrophic threat.',
      },
      neutralized: {
        name: 'Neutralized',
        desc: 'Objects that are no longer anomalous, have been destroyed, or have lost their anomalous properties.',
      },
    },
    system: {
      title: 'System Information',
      terminal: 'Terminal',
      version: 'Version',
      clearance: 'Clearance',
      status: 'Status',
      lastSync: 'Last Sync',
      operational: 'Operational',
    },
  },
  notFound: {
    accessDenied: 'ACCESS DENIED',
    title: 'Document Not Found',
    description:
      'The requested file does not exist in the Latom Node database, or you lack the necessary clearance to access it. All access attempts have been logged.',
    errorCode: 'ERROR CODE',
    errValue: 'ERR-404-RESOURCE',
    terminal: 'TERMINAL',
    timestamp: 'TIMESTAMP',
    returnBtn: 'Return to Main Terminal',
  },
  search: {
    placeholder: 'Search SCP entries, documents...',
    results: '{count} results',
    scp: 'SCP',
    doc: 'DOC',
    empty: 'No results found for "{query}"',
  },
  classes: {
    Safe: 'Safe',
    Euclid: 'Euclid',
    Keter: 'Keter',
    Thaumiel: 'Thaumiel',
    Apollyon: 'Apollyon',
    Neutralized: 'Neutralized',
  },
  classification: {
    Unclassified: 'Unclassified',
    Restricted: 'Restricted',
    Confidential: 'Confidential',
    Secret: 'Secret',
    'Top Secret': 'Top Secret',
  },
  auth: {
    loginTitle: 'Access Terminal',
    loginSubtitle: 'Enter your work codename and login key',
    registerTitle: 'Personnel Registration',
    registerSubtitle: 'Create your Foundation credentials',
    codename: 'Work Codename',
    codenamePlaceholder: 'e.g. agent_alpha',
    codenameHint: '3-32 characters, letters, numbers, underscores',
    password: 'Login Key',
    passwordPlaceholder: 'Enter your login key',
    confirmPassword: 'Confirm Login Key',
    confirmPasswordPlaceholder: 'Re-enter your login key',
    loginBtn: 'Authenticate',
    registerBtn: 'Register',
    noAccount: 'No account?',
    hasAccount: 'Already registered?',
    registerLink: 'Register here',
    loginLink: 'Sign in',
    profile: 'Personal Terminal',
    profileDesc: 'View and manage your Foundation credentials.',
    role: 'Role',
    clearance: 'Clearance',
    joinedAt: 'Joined',
    editCodename: 'Work Codename',
    changePassword: 'Login Key',
    currentPassword: 'Current Key',
    newPassword: 'New Key',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    logout: 'Logout',
    codenameUpdated: 'Codename updated successfully.',
    passwordUpdated: 'Login key updated successfully.',
    loginSuccess: 'Authentication successful.',
    registerSuccess: 'Registration complete. Welcome to the Foundation.',
    errors: {
      codenameFormat: 'Codename must be 3-32 characters: letters, numbers, or underscores.',
      passwordLength: 'Login key must be at least 8 characters.',
      passwordMismatch: 'Login keys do not match.',
    },
  },
  proposals: {
    title: 'Proposals',
    description: 'Submit and vote on Foundation operational proposals.',
    submit: 'Submit Proposal',
    submitDesc: 'Create a new proposal for Foundation review.',
    templateTitle: 'Proposal Template',
    template: '## Objective\n\n[Describe the objective of this proposal]\n\n## Justification\n\n[Explain why this proposal is necessary]\n\n## Implementation\n\n[Detail the proposed implementation steps]\n\n## Expected Outcome\n\n[Describe the expected results]',
    titleLabel: 'Title',
    titlePlaceholder: 'Brief proposal title (5-200 characters)',
    contentLabel: 'Content',
    contentPlaceholder: 'Use the template above to structure your proposal...',
    categoryLabel: 'Category',
    categories: {
      protocol: 'Protocol',
      research: 'Research',
      containment: 'Containment',
      general: 'General',
    },
    dailyLimit: 'Daily limit: {max} proposals per day ({used} used today)',
    dailyLimitReached: 'You have reached the daily proposal limit ({max} per day).',
    vote: {
      for: 'For',
      against: 'Against',
      abstain: 'Abstain',
      cast: 'Cast Vote',
      alreadyVoted: 'You have already voted on this proposal.',
      immutable: 'Votes cannot be changed once cast.',
      success: 'Vote recorded successfully.',
    },
    status: {
      open: 'Open',
      approved: 'Approved',
      rejected: 'Rejected',
    },
    votes: '{for} for · {against} against · {abstain} abstain',
    by: 'by {author}',
    empty: 'No proposals found.',
    createSuccess: 'Proposal submitted successfully.',
    back: 'Back to Proposals',
    view: 'View Details',
  },
  activity: {
    title: 'Activity',
    bookmarksTab: 'Bookmarks',
    historyTab: 'History',
    retry: 'Retry',
  },
  history: {
    title: 'Browsing History',
    empty: 'No browsing history yet.',
    clearAll: 'Clear All',
    confirmClear: 'Are you sure you want to clear all browsing history?',
    delete: 'Remove from history',
    visited: 'Visited',
    entries: '{count} entries',
    all: 'All',
    yes: 'Yes',
    no: 'No',
  },
  bookmarks: {
    title: 'Bookmarked Entries',
    description: 'Your saved SCP entries collection.',
    empty: 'No bookmarks yet.',
    emptyHint: 'Browse entries and bookmark your favorites.',
    add: 'Bookmark this entry',
    remove: 'Remove bookmark',
    count: '{count} bookmark(s)',
  },
  errors: {
    'ERR-NETWORK': 'Network error. Check your connection and try again.',
    'ERR-TIMEOUT': 'Request timed out. Please try again.',
    'ERR-OFFLINE': 'You appear to be offline.',
    'ERR-400-REQUEST': 'Invalid request. Please check your input.',
    'ERR-401-CLEARANCE': 'Insufficient clearance. Authentication required.',
    'ERR-403-ACCESS': 'Access denied. You lack the required authorization.',
    'ERR-404-RESOURCE': 'Resource not found.',
    'ERR-409-CONFLICT': 'Conflict. The resource has been modified.',
    'ERR-429-THROTTLE': 'Too many requests. Please wait before trying again.',
    'ERR-500-SYSTEM': 'System error. The server encountered an internal failure.',
    'ERR-503-MAINTENANCE': 'System under maintenance. Please try again later.',
    'ERR-AUTH-EXPIRED': 'Session expired. Please authenticate again.',
    'ERR-AUTH-INVALID': 'Invalid credentials. Access denied.',
    'ERR-AUTH-REQUIRED': 'Authentication required to access this resource.',
    'ERR-UNKNOWN': 'An unknown error has occurred.',
    'ERR-RENDER-FAULT': 'A rendering error has occurred.',
    'ERR-CHUNK-LOAD': 'Failed to load application resources.',
    retry: 'Retry',
  },
  ai: {
    title: 'AI Assistant',
    newConversation: 'New Conversation',
    send: 'Send',
    placeholder: 'Type your message...',
    deleteConfirm: 'Delete this conversation?',
    noConversations: 'No conversations yet. Start a new one!',
    thinking: 'Thinking...',
    conversations: 'Conversations',
    regenerate: 'Regenerate',
  },
}
