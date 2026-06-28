export default {
  site: {
    title: 'SCP基金会 拉托姆节点',
    tagline: '控制。收容。保护。',
  },
  nav: {
    home: '首页',
    catalog: 'SCP目录',
    documents: '文档',
    about: '关于',
    dashboard: '控制台',
    proposals: '提案',
    activity: '动态',
  },
  header: {
    searchPlaceholder: '搜索',
    searchTitle: '搜索 (Ctrl+K)',
    lightMode: '亮色模式',
    darkMode: '暗色模式',
    langSwitch: 'EN',
  },
  sidebar: {
    node: '节点',
    nodeValue: 'LATOM-7',
    status: '状态',
    active: '运行中',
    clearance: '权限等级',
    level4: '4级',
    collapse: '收起侧边栏',
    expand: '展开侧边栏',
  },
  footer: {
    brand: 'SCP基金会',
    system: '拉托姆节点文档系统',
  },
  hero: {
    badge: '拉托姆节点 — 文档终端 v7.2.1',
    titleLine: 'SCP基金会',
    titleAccent: '拉托姆节点',
    description:
      '一个全面的文档与归档系统，用于管理基金会管辖下的异常物品、实体和现象。访问权限仅限于2级及以上授权人员。',
    browseCatalog: '浏览目录',
    learnMore: '了解更多',
  },
  stats: {
    totalEntries: '总条目数',
    safe: 'Safe',
    euclid: 'Euclid',
    keter: 'Keter',
    documents: '文档',
    personnel: '人员',
  },
  recent: {
    title: '最新条目',
    viewAll: '查看全部',
  },
  catalog: {
    title: 'SCP目录',
    description: '浏览基金会管辖下所有已记录的异常物品和实体。',
    searchPlaceholder: '搜索条目...',
    entriesFound: '找到 {count} 个条目',
    empty: '没有匹配搜索条件的条目。',
    protocol: {
      title: '运行协议',
      auto: '自动运行',
      manual: '手动运行',
      autoDesc: '系统根据您的语言设置自动推荐随机SCP条目，定时轮换推送。',
      manualDesc: '用户完全自主控制——通过搜索和筛选独立浏览选择条目。',
      autoActive: '自动轮换已激活',
      autoPaused: '轮换已暂停',
      nextEntry: '下次轮换',
      timerLabel: '计时器',
      pause: '暂停',
      resume: '继续',
      shuffle: '立即切换',
      recommended: '为您推荐',
      intervalLabel: '间隔',
      intervalUnit: '秒',
      scannerActive: '扫描器运行中',
      scannerPaused: '扫描器待机',
      entriesLoaded: '已加载 {count} 条目',
    },
  },
  backToTop: '返回顶部',
  entry: {
    back: '返回目录',
    author: '作者：',
    date: '日期：',
    objectClass: '对象等级',
    containment: '特殊收容措施',
    description: '描述',
    addenda: '附录',
    notFound: '条目未找到',
    notFoundDesc: '请求的SCP条目不存在于拉托姆节点数据库中。',
    returnToCatalog: '返回目录',
    download: '下载文章',
    downloading: '下载中…',
    report: '报告问题',
    reportType: '报告类型',
    reportTypes: {
      content_error: '内容错误',
      display_issue: '显示问题',
      special_handling: '特殊处理',
      other: '其他',
    },
    reportDescription: '问题描述',
    reportPlaceholder: '请描述您发现的问题（10-2000个字符）…',
    reportSubmit: '提交报告',
    reportSubmitting: '提交中…',
    reportSuccess: '报告提交成功。感谢您的反馈。',
    reportSlots: '此条目剩余 {remaining}/{max} 个报告名额',
  },
  documents: {
    title: '文档',
    description: '基金会协议、研究报告和事件记录。',
    all: '全部',
    read: '阅读 →',
    types: {
      protocol: '协议',
      research: '研究',
      incident: '事件',
      directive: '指令',
    },
  },
  docs: {
    'doc-user-manual': {
      title: '拉托姆节点用户手册',
      summary: '拉托姆节点文档终端导航与使用指南。',
      content: `# 拉托姆节点用户手册

## 1. 概述

拉托姆节点文档终端（LATOM-7节点）是由SCP基金会运营的安全归档与检索系统。本终端为授权人员提供SCP条目、基金会文档和操作工具的访问权限。

> 所有访问均被记录。未经授权的使用将受到纪律处分。

## 2. 快速开始

### 2.1 注册

创建基金会账户：

- 在登录页面点击 **注册**
- 选择唯一的 **工作代号**（3-32个字符，仅限字母、数字、下划线）
- 设置安全的 **登录密钥**（至少8个字符）
- 确认登录密钥并提交

### 2.2 身份验证

使用您的代号和登录密钥登录。您的会话将持续到您明确退出登录或令牌过期。所有操作均记录在您的人事档案下。

## 3. 导航

终端界面由三个主要区域组成：

- **标题栏** — 搜索栏、语言切换（中/英）、主题切换和用户资料
- **侧边栏** — 指向所有板块的主导航链接
- **内容区** — 当前页面内容及上下文控制

### 3.1 可用板块

- **控制台** — 首页，显示系统统计和最新条目
- **SCP目录** — 浏览所有已记录的异常物品和实体
- **文档** — 基金会协议、研究报告和事件记录
- **提案** — 提交和投票运营提案
- **动态** — 查看浏览历史和收藏条目
- **关于** — 基金会信息和对象分级参考

## 4. SCP目录

### 4.1 浏览条目

目录显示所有已索引的SCP条目。每个条目卡片包含：

- **SCP编号** — 唯一标识符（如SCP-173）
- **对象等级** — 收容分级（Safe、Euclid、Keter、Thaumiel、Apollyon、Neutralized）
- **名称** — 异常物品的指定名称

### 4.2 筛选与搜索

- 使用 **搜索栏** 按编号或名称查找条目
- 点击 **对象等级按钮** 按收容分级筛选
- 在 **英文**（英文SCP维基）和 **中文**（中文SCP基金会）数据库之间切换

### 4.3 条目详情

每个条目页面包含：

- **特殊收容措施** — 当前收容要求
- **描述** — 物理和行为特征
- **附录** — 补充研究笔记和事件记录

使用 **收藏按钮** 将条目保存到您的个人收藏。

## 5. 文档

基金会文档按类型组织：

- **协议** — 标准操作程序和收容指南
- **研究** — 科学论文和实验发现
- **事件** — 突破收容报告和事后分析
- **指令** — 行政命令和政策变更

每份文档都有一个 **保密等级**，表示其敏感程度：

- 未分类 — 公开可用信息
- 受限 — 仅限指定人员
- 机密 — 需要知悉权限
- 秘密 — 仅限高级人员
- 绝密 — 需要O5议会授权

## 6. 提案

### 6.1 提交提案

人员可提交运营提案供基金会审查：

- 导航至 **提案** 并点击 **提交提案**
- 选择类别：协议、研究、收容或综合
- 提供描述性标题（5-200个字符）
- 使用提供的模板详细说明您的提案
- 每日限制：每人2个提案

### 6.2 投票

所有人员均可对进行中的提案投票：

- **赞成** — 支持提案
- **反对** — 反对提案
- **弃权** — 不参与投票

投票一经投出 **不可更改**。高级人员将根据社区意见审查提案。

## 7. 动态

### 7.1 浏览历史

您的最近浏览记录会自动保存。使用 **清空全部** 选项可重置历史记录。每人历史记录上限为500条。

### 7.2 收藏

保存SCP条目以便快速参考：

- 在任何条目页面点击 **收藏图标**
- 从 **动态** 板块访问所有收藏
- 可单独移除收藏

## 8. 用户资料

从侧边栏页脚或标题菜单访问您的资料：

- **查看** 您的代号、角色、权限等级和注册日期
- **编辑** 您的代号（必须保持唯一）
- **更改** 您的登录密钥（需要当前密钥验证）
- **退出登录** 结束会话

## 9. 搜索

全局搜索功能（Ctrl+K 或点击搜索图标）搜索范围包括：

- SCP条目编号和名称
- 文档标题和内容

结果按类型（SCP或文档）分类，便于快速导航。

## 10. 界面控制

### 10.1 主题

使用标题栏中的太阳/月亮图标在 **暗色模式** 和 **亮色模式** 之间切换。您的偏好将保存在本地。

### 10.2 语言

使用语言切换在 **中文** 和 **英文** 之间切换。所有界面文本和内容标签将相应更新。您的语言偏好将被持久保存。

### 10.3 侧边栏

侧边栏可通过底部的箭头按钮 **收起**，以获得更宽的内容区域。收起后仍可通过图标标签访问导航。

## 11. 安全须知

- 切勿与其他人员共享您的登录密钥
- 向站点管理员报告可疑的终端活动
- 所有访问尝试，包括失败的身份验证，均被记录
- 机密信息不得在安全渠道外传输

## 12. 技术支持

如遇终端故障或访问问题，请联系您的站点IT部门或通过基金会内部工单系统提交报告。

> 文档保密等级：**受限**
> 最后更新：2026-06-27
> 节点：LATOM-7 | 版本：7.2.1`,
    },
    'doc-anomalous-materials': {
      title: '异常材料处理规范',
      summary: '实验室环境下异常材料处理与分析的标准研究程序。',
      content: `# 异常材料处理规范

## 安全协议

所有接触异常材料的人员必须遵守以下安全协议：

- 始终佩戴适当的个人防护装备
- 未获得2级以上权限不得处理材料
- 发现任何异常反应须立即报告
- 每次操作后执行去污程序

## 实验室程序

### 准备工作

确保所有设备已校准和消毒。打开任何样本容器前验证力场发生器是否正常运行。

### 分析

仅使用经批准的分析仪器。实时记录所有观察结果。任何偏离预期的行为必须记录并报告给主管研究员。

### 储存

异常材料必须在分析完成后30分钟内归还至指定收容单元。切勿在收容单元外无人看管材料。

> 文档保密等级：**机密**`,
    },
    'doc-site-breach-report': {
      title: '19号站点突破收容报告',
      summary: '19号站点第4扇区突破收容事件的事后分析。',
      content: `# 19号站点突破收容报告 — 第4扇区

## 事件概述

2026年1月18日约03:47（UTC），19号站点第4扇区发生突破收容事件。事件涉及SCP-████，导致收容暂时失效约12分钟。

## 时间线

- **03:47** — 第4扇区自动警报触发
- **03:49** — 安全队伍前往第4扇区
- **03:52** — 启动周边封锁
- **03:59** — SCP-████被机动特遣队Epsilon-11重新收容
- **04:01** — 发布解除警报信号

## 根本原因

调查确定突破收容是由备用电力系统故障引起的，该故障暂时中断了力场发生器的运行。主电力系统当时正在进行定期维护。

## 建议

- 升级所有Keter级收容扇区的备用电力系统
- 实施冗余力场发生器
- 修订维护排程以确保覆盖重叠

> 文档保密等级：**秘密**`,
    },
    'doc-o5-directive-7': {
      title: 'O5指令 — 泽塔-9协议',
      summary: '关于XK级情景下激活泽塔-9协议的行政指令。',
      content: `# O5指令 — 泽塔-9协议

## 保密等级：绝密 — 仅限O5议会

## 前言

本指令确立了在XK级世界末日情景发生时激活泽塔-9协议的程序和授权链。

## 第一条：激活权限

泽塔-9协议仅可由O5议会一致投票激活。任何单个成员，无论在何种情况下，不得独立授权激活。

## 第二条：激活条件

激活前必须满足以下条件：

- 已确认XK级情景正在进行
- 所有常规收容措施已用尽
- 预计完全突破时间：少于6小时
- 至少3名O5议会成员可参与投票

## 第三条：执行

激活后，将按顺序执行以下步骤：

- 通过ALPHA-13协议进行全球记忆删除分发
- 激活所有Thaumiel级资产
- 动员所有可用机动特遣队
- 实施叙事重构协议

## 第四条：事后处理

成功执行后，所有涉及人员将接受A级记忆删除处理。本指令及所有相关文档将重新分类。

> 文档保密等级：**绝密**`,
    },
  },
  about: {
    title: '关于基金会',
    description: '了解SCP基金会与拉托姆节点文档系统。',
    foundation: {
      title: 'SCP基金会',
      p1: 'SCP基金会是一个在联合国及各国政府授权下运作的秘密组织。其使命是控制、收容和保护对常态及人类文明构成威胁的异常物品、实体和现象。',
      p2: '基金会成立于19世纪初期，已发展成为一个全球性的安全设施、研究实验室和机动特遣队网络，致力于理解和消除异常威胁。',
    },
    latomNode: {
      title: '拉托姆节点',
      p1: '拉托姆节点是基金会信息网络中的一个文档终端。它作为SCP条目、收容措施、研究文档和操作协议的归档与检索系统。',
      p2: '该终端被指定为LATOM-7节点，在4级权限下运行，并与中央基金会数据库保持同步。所有呈现的信息均截至最近一次同步周期。',
    },
    classification: {
      title: '对象分级系统',
      safe: {
        name: 'Safe',
        desc: '可以轻松安全地收容的物品。遵循正确程序时风险极小。',
      },
      euclid: {
        name: 'Euclid',
        desc: '需要更广泛收容措施的物品。其行为尚未被完全理解或预测。',
      },
      keter: {
        name: 'Keter',
        desc: '极难持续收容或突破收容后将构成重大威胁的物品。',
      },
      thaumiel: {
        name: 'Thaumiel',
        desc: '被基金会用于收容或对抗其他异常实体或现象的物品。',
      },
      apollyon: {
        name: 'Apollyon',
        desc: '无法被收容、预计将立即突破收容并构成灾难性威胁的物品。',
      },
      neutralized: {
        name: 'Neutralized',
        desc: '不再具有异常性质、已被摧毁或失去异常属性的物品。',
      },
    },
    system: {
      title: '系统信息',
      terminal: '终端',
      version: '版本',
      clearance: '权限等级',
      status: '状态',
      lastSync: '最后同步',
      operational: '运行正常',
    },
  },
  notFound: {
    accessDenied: '访问被拒绝',
    title: '文档未找到',
    description: '请求的文件不存在于拉托姆节点数据库中，或您缺乏访问所需的权限。所有访问尝试均已被记录。',
    errorCode: '错误代码',
    errValue: 'ERR-404-RESOURCE',
    terminal: '终端',
    timestamp: '时间戳',
    returnBtn: '返回主终端',
  },
  search: {
    placeholder: '搜索SCP条目、文档...',
    results: '{count} 条结果',
    scp: 'SCP',
    doc: '文档',
    empty: '未找到 "{query}" 的相关结果',
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
    Unclassified: '未分类',
    Restricted: '受限',
    Confidential: '机密',
    Secret: '秘密',
    'Top Secret': '绝密',
  },
  auth: {
    loginTitle: '访问终端',
    loginSubtitle: '请输入工作代号和登录密钥',
    registerTitle: '人员注册',
    registerSubtitle: '创建您的基金会凭证',
    codename: '工作代号',
    codenamePlaceholder: '例如 agent_alpha',
    codenameHint: '3-32个字符，仅限字母、数字、下划线',
    password: '登录密钥',
    passwordPlaceholder: '请输入登录密钥',
    confirmPassword: '确认登录密钥',
    confirmPasswordPlaceholder: '请再次输入登录密钥',
    loginBtn: '身份验证',
    registerBtn: '注册',
    noAccount: '没有账户？',
    hasAccount: '已有账户？',
    registerLink: '点此注册',
    loginLink: '点此登录',
    profile: '个人终端',
    profileDesc: '查看和管理您的基金会凭证。',
    role: '角色',
    clearance: '权限等级',
    joinedAt: '注册时间',
    editCodename: '工作代号',
    changePassword: '登录密钥',
    currentPassword: '当前密钥',
    newPassword: '新密钥',
    edit: '编辑',
    save: '保存',
    cancel: '取消',
    logout: '退出登录',
    codenameUpdated: '代号更新成功。',
    passwordUpdated: '登录密钥更新成功。',
    loginSuccess: '身份验证成功。',
    registerSuccess: '注册完成。欢迎加入基金会。',
    errors: {
      codenameFormat: '代号必须为3-32个字符：仅限字母、数字或下划线。',
      passwordLength: '登录密钥至少需要8个字符。',
      passwordMismatch: '两次输入的登录密钥不一致。',
    },
  },
  proposals: {
    title: '提案',
    description: '提交和投票基金会运营提案。',
    submit: '提交提案',
    submitDesc: '创建新的基金会审查提案。',
    templateTitle: '提案模板',
    template: '## 目标\n\n[描述本提案的目标]\n\n## 理由\n\n[说明为何需要本提案]\n\n## 实施方案\n\n[详述拟议的实施步骤]\n\n## 预期结果\n\n[描述预期成果]',
    titleLabel: '标题',
    titlePlaceholder: '简要提案标题（5-200个字符）',
    contentLabel: '内容',
    contentPlaceholder: '使用上方模板来组织您的提案...',
    categoryLabel: '类别',
    categories: {
      protocol: '协议',
      research: '研究',
      containment: '收容',
      general: '综合',
    },
    dailyLimit: '每日限制：每天最多 {max} 个提案（今日已用 {used} 个）',
    dailyLimitReached: '您已达到每日提案上限（每天 {max} 个）。',
    vote: {
      for: '赞成',
      against: '反对',
      abstain: '弃权',
      cast: '投票',
      alreadyVoted: '您已对该提案投过票。',
      immutable: '投票后无法更改。',
      success: '投票成功记录。',
    },
    status: {
      open: '进行中',
      approved: '已通过',
      rejected: '已否决',
    },
    votes: '{for} 赞成 · {against} 反对 · {abstain} 弃权',
    by: '由 {author} 提交',
    empty: '暂无提案。',
    createSuccess: '提案提交成功。',
    back: '返回提案列表',
    view: '查看详情',
  },
  activity: {
    title: '动态',
    bookmarksTab: '收藏',
    historyTab: '历史',
    retry: '重试',
  },
  history: {
    title: '浏览历史',
    empty: '暂无浏览记录。',
    clearAll: '清空全部',
    confirmClear: '确定要清空所有浏览历史吗？',
    delete: '从历史中移除',
    visited: '访问于',
    entries: '{count} 条记录',
    all: '全部',
    yes: '确定',
    no: '取消',
  },
  bookmarks: {
    title: '已收藏条目',
    description: '你保存的SCP条目收藏。',
    empty: '暂无收藏。',
    emptyHint: '浏览条目并收藏你的最爱。',
    add: '收藏此条目',
    remove: '取消收藏',
    count: '{count} 个收藏',
  },
  errors: {
    'ERR-NETWORK': '网络错误。请检查连接后重试。',
    'ERR-TIMEOUT': '请求超时。请重试。',
    'ERR-OFFLINE': '您似乎处于离线状态。',
    'ERR-400-REQUEST': '无效请求。请检查输入内容。',
    'ERR-401-CLEARANCE': '权限不足。需要身份验证。',
    'ERR-403-ACCESS': '访问被拒绝。您缺少所需权限。',
    'ERR-404-RESOURCE': '资源未找到。',
    'ERR-409-CONFLICT': '冲突。资源已被修改。',
    'ERR-429-THROTTLE': '请求过于频繁。请稍后重试。',
    'ERR-500-SYSTEM': '系统错误。服务器遇到内部故障。',
    'ERR-503-MAINTENANCE': '系统维护中。请稍后重试。',
    'ERR-AUTH-EXPIRED': '会话已过期。请重新验证身份。',
    'ERR-AUTH-INVALID': '凭证无效。访问被拒绝。',
    'ERR-AUTH-REQUIRED': '访问此资源需要身份验证。',
    'ERR-UNKNOWN': '发生未知错误。',
    'ERR-RENDER-FAULT': '发生渲染错误。',
    'ERR-CHUNK-LOAD': '加载应用资源失败。',
    retry: '重试',
  },
  ai: {
    title: 'AI 助手',
    newConversation: '新对话',
    send: '发送',
    placeholder: '输入消息...',
    deleteConfirm: '确定删除此对话？',
    noConversations: '暂无对话，开始新对话吧！',
    thinking: '思考中...',
    conversations: '对话列表',
    regenerate: '重新生成',
  },
}
