CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  codename   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'personnel',
  clearance  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_codename ON users(codename);

-- ─── SCP Index Entries ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS scp_entries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  scp_number   INTEGER NOT NULL,
  language     TEXT NOT NULL CHECK (language IN ('en', 'cn')),
  name         TEXT NOT NULL DEFAULT '',
  object_class TEXT NOT NULL DEFAULT 'Unknown',
  url          TEXT NOT NULL DEFAULT '',
  series            INTEGER NOT NULL DEFAULT 1,
  content           TEXT,
  content_fetched_at TEXT,
  content_error     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scp_number, language)
);

CREATE INDEX IF NOT EXISTS idx_scp_entries_lang ON scp_entries(language);
CREATE INDEX IF NOT EXISTS idx_scp_entries_number ON scp_entries(scp_number);
CREATE INDEX IF NOT EXISTS idx_scp_entries_class ON scp_entries(object_class);
CREATE INDEX IF NOT EXISTS idx_scp_entries_series ON scp_entries(series);

-- ─── Crawl State ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crawl_state (
  language     TEXT PRIMARY KEY CHECK (language IN ('en', 'cn')),
  status       TEXT NOT NULL DEFAULT 'idle',
  last_crawl   INTEGER NOT NULL DEFAULT 0,
  total_entries INTEGER NOT NULL DEFAULT 0,
  next_series  INTEGER NOT NULL DEFAULT 0,
  error        TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Browsing History ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS browsing_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  language     TEXT NOT NULL CHECK (language IN ('en', 'cn')),
  scp_number   INTEGER NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  object_class TEXT NOT NULL DEFAULT 'Unknown',
  visited_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, language, scp_number)
);

CREATE INDEX IF NOT EXISTS idx_history_user ON browsing_history(user_id, visited_at);

-- ─── Bookmarks ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  scp_number  INTEGER NOT NULL,
  language    TEXT NOT NULL CHECK (language IN ('en', 'cn')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, scp_number, language)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- ─── Proposals ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS proposals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general',
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_at);

-- ─── Proposal Votes ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS proposal_votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  vote        TEXT NOT NULL CHECK (vote IN ('for', 'against', 'abstain')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_user ON proposal_votes(user_id);

-- ─── Entry Reports ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS entry_reports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  scp_number   INTEGER NOT NULL,
  language     TEXT NOT NULL CHECK (language IN ('en', 'cn')),
  report_type  TEXT NOT NULL CHECK (report_type IN ('content_error', 'display_issue', 'special_handling', 'other')),
  description  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, scp_number, language, report_type)
);

CREATE INDEX IF NOT EXISTS idx_entry_reports_user ON entry_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_reports_entry ON entry_reports(scp_number, language);
CREATE INDEX IF NOT EXISTS idx_entry_reports_status ON entry_reports(status);

-- ─── System Logs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
  level       TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message     TEXT NOT NULL,
  context     TEXT,
  request_id  TEXT,
  user_id     INTEGER,
  source      TEXT NOT NULL CHECK (source IN ('server', 'client')),
  category    TEXT,
  path        TEXT,
  user_agent  TEXT,
  ip          TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);

-- ─── AI Conversations ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER NOT NULL,
  title           TEXT NOT NULL DEFAULT 'New Conversation',
  system_prompt   TEXT NOT NULL DEFAULT '',
  message_count   INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, last_message_at);

-- ─── Tag Categories ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS tag_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Tags ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id           TEXT PRIMARY KEY,
  category_id  TEXT NOT NULL REFERENCES tag_categories(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  name_zh      TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  ai_keywords  TEXT NOT NULL DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- ─── Entry Tags (junction) ────────────────────────────────

CREATE TABLE IF NOT EXISTS entry_tags (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scp_number  INTEGER NOT NULL,
  language    TEXT NOT NULL CHECK (language IN ('en', 'cn')),
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scp_number, language, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(scp_number, language);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);

-- ─── Tag Seed Data ────────────────────────────────────────

-- Categories
INSERT OR IGNORE INTO tag_categories (id, name, name_en, description, sort_order) VALUES
  ('object_class', '核心项目等级', 'Object Class', 'SCP条目的收容难易程度', 1),
  ('anomaly',      '异常性质与形态', 'Anomaly Type',  '描述SCP项目的核心异常性质或其存在形态', 2),
  ('goi',          '相关组织与团体', 'Groups of Interest', '标识SCP项目中涉及的相关组织', 3),
  ('narrative',    '叙事与格式', 'Narrative Format', '描述条目的文体、格式或特殊性质', 4),
  ('theme',        '主题与设定', 'Theme', '描述条目涉及的主题、场景或抽象概念', 5);

-- Object Class tags
INSERT OR IGNORE INTO tags (id, category_id, name, name_zh, description, ai_keywords, sort_order) VALUES
  ('OC001', 'object_class', 'Safe',        '安全级',     '易于且安全收容',                                  '["安全","可控","低风险","容易收容"]', 1),
  ('OC002', 'object_class', 'Euclid',      '欧几里得级', '收容需要更多资源，或收容措施并非完全可靠',          '["中等风险","收容不完全","不可预测","需要资源"]', 2),
  ('OC003', 'object_class', 'Keter',       '凯特尔级',   '极难持续或确实地收容',                              '["高风险","极难收容","持续威胁","高危险"]', 3),
  ('OC004', 'object_class', 'Thaumiel',    '图米埃尔级', '用于收容或对抗其他异常项目的异常项目',                '["收容工具","对抗异常","基金会武器"]', 4),
  ('OC005', 'object_class', 'Neutralized', '无效化',     '已失去所有异常特性',                                '["失效","已解除","无异常","常规化"]', 5),
  ('OC006', 'object_class', 'Explained',   '已解明',     '异常属性已被主流科学解释',                           '["已解释","科学解释","非异常","已解明"]', 6),
  ('OC007', 'object_class', 'Apollyon',    '阿波里昂级', '无法被收容，且预计将造成世界末日级情景',              '["无法收容","末日威胁","世界毁灭","不可控"]', 7),
  ('OC008', 'object_class', 'Archon',      '执政官级',   '可以被收容，但收容会引发更严重的后果',                '["收容代价","后果更严重","不干预"]', 8),
  ('OC009', 'object_class', 'Decommissioned', '被处决',  '已被基金会彻底摧毁',                                '["已摧毁","消灭","不复存在"]', 9),
  ('OC010', 'object_class', 'Pending',     '待定',       '项目等级尚未确定',                                  '["未定级","待评估","等级待定"]', 10);

-- Anomaly tags
INSERT OR IGNORE INTO tags (id, category_id, name, name_zh, description, ai_keywords, sort_order) VALUES
  ('AN001', 'anomaly', 'Humanoid',    '人形生物', '具有人类或类人形态',              '["人形","类人","人型"]', 1),
  ('AN002', 'anomaly', 'Living',      '活物',     '拥有新陈代谢、反应和繁殖等生命特征', '["有生命","生物","活体"]', 2),
  ('AN003', 'anomaly', 'Animal',      '动物',     '本身是动物或带有动物特性',          '["动物","兽","生物"]', 3),
  ('AN004', 'anomaly', 'Botanical',   '植物',     '具有植物特性',                      '["植物","植被","草木"]', 4),
  ('AN005', 'anomaly', 'Mechanical',  '机械',     '具有机械或科技属性',                '["机械","机器","科技","人工"]', 5),
  ('AN006', 'anomaly', 'Conceptual',  '概念性',   '异常是一种概念、想法或信息',         '["概念","想法","抽象","非实体"]', 6),
  ('AN007', 'anomaly', 'Memetic',     '模因',     '能通过信息传播影响认知',             '["模因","信息传播","认知影响"]', 7),
  ('AN008', 'anomaly', 'Cognitohazard', '认知危害', '通过视觉、听觉等感知造成危害',     '["认知危害","感知影响","视听危害"]', 8),
  ('AN009', 'anomaly', 'Infohazard',  '信息危害', '仅仅知晓其存在就可能造成危害',       '["信息危害","知晓即危险","知识危害"]', 9),
  ('AN010', 'anomaly', 'Thaumaturgic','奇术',     '涉及魔法、仪式等超自然力量',         '["魔法","仪式","超自然","神秘"]', 10);

-- GOI tags
INSERT OR IGNORE INTO tags (id, category_id, name, name_zh, description, ai_keywords, sort_order) VALUES
  ('GO001', 'goi', 'Foundation-Made',      '基金会制',               '由基金会自身制造或创造',              '["基金会制造","基金会创造","自制"]', 1),
  ('GO002', 'goi', 'Chaos Insurgency',     '混沌分裂者',             '涉及混沌分裂者组织',                 '["混沌分裂者","分裂者"]', 2),
  ('GO003', 'goi', 'Serpent''s Hand',      '蛇之手',                 '涉及蛇之手组织',                     '["蛇之手"]', 3),
  ('GO004', 'goi', 'Church of the Broken God', '破碎之神教会',       '涉及破碎之神教会',                   '["破碎之神","破碎神教"]', 4),
  ('GO005', 'goi', 'Sarkic Cults',         '欲肉教派',               '涉及欲肉教派',                       '["欲肉","欲肉教","肉"]', 5),
  ('GO006', 'goi', 'GOC',                  '全球超自然联盟',          '涉及全球超自然联盟（GOC）',           '["GOC","全球超自然联盟","联盟"]', 6),
  ('GO007', 'goi', 'MC&D',                 'Marshall, Carter & Dark 有限公司', '涉及Marshall, Carter & Dark公司', '["MC&D","Marshall","Carter","Dark"]', 7),
  ('GO008', 'goi', 'Anderson Robotics',    '安德森机器人',            '涉及安德森机器人公司',               '["安德森","机器人"]', 8),
  ('GO009', 'goi', 'AWCY',                'Are We Cool Yet?',       '涉及Are We Cool Yet?艺术家团体',    '["AWCY","艺术家","艺术团体"]', 9),
  ('GO010', 'goi', 'GRU Division P',      '格鲁乌P部门',            '涉及格鲁乌P部门',                   '["格鲁乌","GRU","P部门","苏联"]', 10);

-- Narrative tags
INSERT OR IGNORE INTO tags (id, category_id, name, name_zh, description, ai_keywords, sort_order) VALUES
  ('NA001', 'narrative', 'SCP',        'SCP',     '标准的SCP格式文档',                         '["标准SCP","SCP格式","文档"]', 1),
  ('NA002', 'narrative', 'Tale',       '故事',    '以叙事性文学为主的SCP宇宙故事',               '["故事","叙事","文学"]', 2),
  ('NA003', 'narrative', 'GOI Format', 'GOI格式', '从某个相关组织视角撰写的格式文档',             '["GOI格式","组织视角","特别格式"]', 3),
  ('NA004', 'narrative', 'Hub',        '中心页',  '用于汇总和链接同一系列页面的索引页',            '["中心页","索引","汇总"]', 4),
  ('NA005', 'narrative', 'Supplement', '补充文件', '需要依赖其父页面才能理解的文档',               '["补充","附属","依赖"]', 5),
  ('NA006', 'narrative', 'Joke',       'J条目',   '玩笑性质的SCP条目',                          '["玩笑","搞笑","幽默","-J"]', 6),
  ('NA007', 'narrative', 'Archived',   'ARC条目', '已归档的SCP条目',                            '["归档","已归档","ARC"]', 7),
  ('NA008', 'narrative', 'Explained',  'EX条目',  '已解明的SCP条目',                            '["已解明","EX","解释"]', 8),
  ('NA009', 'narrative', 'Original',   '原创',    '作者原创的内容',                              '["原创","创作"]', 9),
  ('NA010', 'narrative', 'Translated', '翻译',    '从其他语言分部翻译而来的内容',                 '["翻译","转载","多语言"]', 10);

-- Theme tags
INSERT OR IGNORE INTO tags (id, category_id, name, name_zh, description, ai_keywords, sort_order) VALUES
  ('TH001', 'theme', 'Science Fiction', '科幻',     '涉及科幻主题',                    '["科幻","未来","科技","科学"]', 1),
  ('TH002', 'theme', 'Horror',          '恐怖',     '涉及恐怖元素',                    '["恐怖","惊悚","黑暗"]', 2),
  ('TH003', 'theme', 'Fantasy',         '奇幻',     '涉及奇幻设定',                    '["奇幻","魔法","神话","幻想"]', 3),
  ('TH004', 'theme', 'Urban Legend',     '都市传说', '基于都市传说改编',                '["都市传说","传说","民间"]', 4),
  ('TH005', 'theme', 'Religious',       '宗教性',   '涉及宗教或神话元素',              '["宗教","神话","信仰","神"]', 5),
  ('TH006', 'theme', 'Historical',      '历史性',   '涉及历史事件或时期',              '["历史","过去","事件","时期"]', 6),
  ('TH007', 'theme', 'Ritualistic',     '仪式性',   '涉及仪式或典礼',                  '["仪式","典礼","祭祀"]', 7),
  ('TH008', 'theme', 'Compulsive',      '强迫性',   '能强迫或驱使个体进行某种行为',      '["强迫","驱使","控制"]', 8),
  ('TH009', 'theme', 'Electronic',      '电子/电脑', '涉及电子或计算机技术',            '["电子","电脑","技术","数字"]', 9),
  ('TH010', 'theme', 'Sky',             '天空',     '生活在空中或通过空气传播',          '["天空","空中","飞行","空气"]', 10),
  ('TH011', 'theme', 'Warm',            '温馨',     '给人温暖、治愈或积极感受的条目',    '["温暖","治愈","积极","感动","友善"]', 11);
