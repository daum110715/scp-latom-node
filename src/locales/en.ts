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
  entries: {
    'scp-001': {
      name: 'The Gate Guardian',
      summary:
        'A massive entity stationed at the eastern edge of the SCP-001 property. Standing at approximately 700 cubits tall, it wields a flaming sword and is perpetually ablaze.',
      containment:
        'No known containment procedures are effective. All personnel must maintain a distance of no less than 1 km from the entity. Any approach triggers an XK-class end-of-the-world scenario.',
      description:
        'SCP-001 is a humanoid entity of indeterminate origin, residing at the coordinates ██°██\'N, ██°██\'E. The entity appears to be an angelic figure consistent with descriptions found in multiple religious texts.',
      addenda: [
        'Incident 001-A: On ██/██/████, an unauthorized approach by MTF Omega-7 resulted in the annihilation of the entire task force within 0.03 seconds.',
        'Document 001-Ω: Declassified O5 Council minutes confirm SCP-001 has been in its current position since before recorded human history.',
      ],
    },
    'scp-173': {
      name: 'The Sculpture',
      summary:
        'A concrete sculpture capable of moving at extreme speeds when unobserved. It attacks by snapping the neck or strangling its victims.',
      containment:
        'Kept in a locked container at Site-19. Personnel must maintain direct eye contact at all times. Teams of three (3) are required for cleaning.',
      description:
        'SCP-173 is a sculpture constructed from concrete and rebar, with spray-painted Krylon brand paint. It is animate and extremely hostile.',
    },
    'scp-682': {
      name: 'Hard-to-Destroy Reptile',
      summary:
        'A large, vaguely reptilian creature of unknown origin with a deep hatred for all life. Displays extraordinary regenerative capabilities and adaptive resistance.',
      containment:
        'Housed in a pool of concentrated hydrochloric acid at Site-19. All attempts at termination have been authorized and subsequently failed.',
      description:
        'SCP-682 is a large, vaguely reptilian creature of unknown origin. It appears to be extremely intelligent and has been described as having a hatred of all life.',
      addenda: [
        'Termination Log: All 2,847 documented termination attempts have failed. SCP-682 has adapted to survive every known method of destruction.',
        'Audio Log 682-B: "You are disgusting. You, and everything like you." — SCP-682, addressing Dr. Clef.',
      ],
    },
    'scp-999': {
      name: 'The Tickle Monster',
      summary:
        'A large, amorphous, gelatinous mass of translucent orange slime. It actively seeks out humans and engages in behavior that induces happiness and laughter.',
      containment:
        'Contained in a standard humanoid containment cell at Site-19. No special containment procedures required beyond standard hygiene protocols.',
      description:
        'SCP-999 is a large, amorphous, gelatinous mass of translucent orange slime, weighing approximately 54 kg. It is docile and appears to be sentient.',
    },
    'scp-106': {
      name: 'The Old Man',
      summary:
        'An elderly humanoid entity capable of passing through solid matter and creating pocket dimensions. It displays sadistic tendencies toward prey.',
      containment:
        'Housed in a sealed container at Site-19, suspended by a series of magnets. Containment breach protocol "Blackout" is to be initiated immediately upon escape.',
      description:
        'SCP-106 appears to be an elderly humanoid, with a general appearance of advanced decomposition. It will attempt to capture and prey on humans.',
      addenda: [
        'Incident 106-Ω: During the breach of ██/██/████, SCP-106 was observed dragging subjects into its pocket dimension. Survivors reported [DATA EXPUNGED].',
      ],
    },
    'scp-096': {
      name: 'The Shy Guy',
      summary:
        'An emaciated, pale-skinned humanoid that enters an agitated state when its face is viewed, even through photographs or video.',
      containment:
        "Housed in a sealed, airtight steel cube at Site-██. No visual recordings of SCP-096's face are permitted.",
      description:
        'SCP-096 is a humanoid creature measuring approximately 2.38 meters in height. It has little to no muscle mass, and its arms are grossly oversized.',
    },
    'scp-343': {
      name: 'God',
      summary:
        'A middle-aged male of average height and build claiming to be the creator of the universe. Displays reality-altering capabilities consistent with this claim.',
      containment:
        'Contained in a standard humanoid living suite at Site-17. SCP-343 is free to leave at any time but has chosen not to.',
      description:
        'SCP-343 is a male humanoid of apparent European descent, appearing to be in his 40s. He claims to be God and demonstrates abilities consistent with omnipotence.',
    },
  },
  docs: {
    'doc-orientation': {
      title: 'Foundation Orientation Protocol',
      summary:
        'Standard orientation material for newly recruited Foundation personnel. Covers basic protocols, security clearances, and operational guidelines.',
      content:
        '# Foundation Orientation Protocol\n\n## Welcome to the SCP Foundation\n\nYou have been selected to join the most secretive and important organization in human history. Your previous identity has been expunged from all public records. You are now an asset of the SCP Foundation.\n\n## Your Responsibilities\n\n1. **Secure** — Contain anomalous objects, entities, and phenomena\n2. **Contain** — Prevent them from falling into civilian hands\n3. **Protect** — Safeguard humanity from threats beyond comprehension\n\n## Security Clearances\n\n| Level | Designation | Access |\n|-------|------------|--------|\n| Level 1 | Unrestricted | Basic facility access |\n| Level 2 | Restricted | Containment wing access |\n| Level 3 | Confidential | Full site access |\n| Level 4 | Secret | Cross-site operations |\n| Level 5 | Top Secret | O5 Command |\n\n## Remember\n\n> The Foundation exists to protect humanity. Every decision made, every life spent, every secret kept — it is all in service of that singular purpose.\n\n**You do not have the right to know everything. You have the obligation to do your part.**',
    },
    'doc-breach': {
      title: 'Containment Breach Protocol Alpha-9',
      summary:
        'Procedures to be followed in the event of a multi-entity containment breach at any Foundation facility.',
      content:
        '# Containment Breach Protocol Alpha-9\n\n## Immediate Actions\n\n1. **LOCKDOWN** — All blast doors seal automatically\n2. **ALERT** — Site-wide alarm activates (three ascending tones)\n3. **ASSEMBLY** — MTF units deploy to designated rally points\n4. **ACCOUNTING** — All personnel must report to nearest safe room\n\n## Classification of Breach\n\n- **Level 1**: Single Safe-class entity, localized\n- **Level 2**: Multiple Safe or single Euclid, contained wing\n- **Level 3**: Euclid/Keter, potential site-wide\n- **Level 4**: Keter breach, external threat confirmed\n- **Level 5**: Multiple Keter, site integrity compromised\n\n## Critical Reminder\n\n> Under no circumstances should personnel attempt to re-contain entities without MTF support. Your life is not expendable — it is irreplaceable.',
    },
    'doc-mtf': {
      title: 'Mobile Task Force Operations Manual',
      summary:
        'Comprehensive guide to MTF organization, deployment procedures, and field operations for Foundation tactical units.',
      content:
        '# Mobile Task Force Operations Manual\n\n## Overview\n\nMobile Task Forces (MTFs) are the Foundation\'s field operatives. Each MTF is specialized for specific types of anomalies or operational contexts.\n\n## Notable MTFs\n\n### Alpha-1 ("Red Right Hand")\nThe personal task force of the O5 Council. Their operations are classified beyond even Level 5 clearance.\n\n### Epsilon-11 ("Nine-Tailed Fox")\nInternal security for the Foundation. Deployed during containment breaches to restore order.\n\n### Omega-7 ("Pandora\'s Box")\n[REDACTED — CLEARANCE LEVEL 5 REQUIRED]\n\n### Nu-7 ("Hammer Down")\nThe Foundation\'s military arm. Capable of engaging conventional and anomalous threats at scale.\n\n## Field Protocol\n\n1. Assess the situation\n2. Establish a perimeter\n3. Minimize civilian exposure\n4. Contain or neutralize the anomaly\n5. Deploy cover story if necessary\n6. Extract and debrief',
    },
    'doc-incident': {
      title: 'Incident Report: Site-19 Breach 2024',
      summary:
        'Detailed analysis of the major containment breach at Site-19 involving SCP-173 and SCP-106.',
      content:
        '# Incident Report: Site-19 Breach 2024\n\n## Date: ██/██/2024\n## Classification: SECRET\n\n## Summary\n\nAt approximately 0347 hours, a cascading containment failure occurred in Wing-C of Site-19. The breach involved simultaneous failures of containment for SCP-173 and SCP-106.\n\n## Timeline\n\n- **0347**: Power fluctuation detected in Wing-C\n- **0348**: SCP-173 containment door lock fails\n- **0349**: SCP-106 breaches containment through unknown means\n- **0351**: Site-wide lockdown initiated\n- **0353**: MTF Epsilon-11 deployed\n- **0412**: SCP-173 re-contained\n- **0445**: SCP-106 re-contained using femur-breaker protocol\n- **0500**: All-clear issued\n\n## Casualties\n- 12 Foundation personnel deceased\n- 3 D-class personnel deceased\n- 8 personnel requiring amnestic treatment\n\n## Root Cause\n\nInvestigation ongoing. Preliminary analysis suggests coordinated sabotage by [REDACTED].',
    },
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
    profile: 'Agent Profile',
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
}
