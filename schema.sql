-- 创建天气查询记录表
CREATE TABLE IF NOT EXISTS weather_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    location TEXT,
    temperature REAL,
    description TEXT,
    query_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_city ON weather_logs(city);
CREATE INDEX IF NOT EXISTS idx_query_time ON weather_logs(query_time);
