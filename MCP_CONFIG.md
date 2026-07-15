# MCP Weather Server 配置指南

## 在 Claude Desktop 中配置

### 1. 找到配置文件

根据你的操作系统，找到 Claude Desktop 的配置文件：

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### 2. 添加 MCP 服务器配置

在配置文件中添加以下内容：

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["E:\\公司项目\\mcp-weather\\mcp-server.js"],
      "env": {
        "WORKER_URL": "http://localhost:8787"
      }
    }
  }
}
```

**注意事项：**
- 将路径 `E:\\公司项目\\mcp-weather\\mcp-server.js` 替换为你的实际项目路径
- Windows 路径需要使用双反斜杠 `\\` 或单正斜杠 `/`
- 确保 `WORKER_URL` 指向你的 Worker 地址（本地开发用 `http://localhost:8787`，生产环境用你的 Workers 域名）

### 3. 生产环境配置

如果你已经部署到 Cloudflare Workers，将 `WORKER_URL` 改为你的生产地址：

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["E:\\公司项目\\mcp-weather\\mcp-server.js"],
      "env": {
        "WORKER_URL": "https://mcp-weather.你的域名.workers.dev"
      }
    }
  }
}
```

### 4. 重启 Claude Desktop

保存配置文件后，重启 Claude Desktop 应用程序。

### 5. 验证配置

重启后，在 Claude Desktop 中，你应该能看到以下三个可用的工具：

1. **get_weather** - 查询指定城市的天气信息
2. **get_weather_logs** - 获取天气查询的访问日志
3. **get_weather_stats** - 获取城市查询统计信息

## 使用示例

配置成功后，你可以在 Claude Desktop 中这样使用：

```
请帮我查询北京的天气

请查看最近20条天气查询记录

哪些城市被查询最多？
```

Claude 会自动调用相应的 MCP 工具来获取数据。

## 可用的 MCP 工具

### 1. get_weather
查询指定城市的天气信息

**参数：**
- `city` (必需): 城市名称（中文或英文）

**示例：**
```
查询上海的天气
What's the weather in Tokyo?
```

### 2. get_weather_logs
获取天气查询的访问日志

**参数：**
- `limit` (可选): 返回的记录数量，默认50条

**示例：**
```
显示最近10条天气查询记录
查看访问日志
```

### 3. get_weather_stats
获取城市查询统计信息

**参数：** 无

**示例：**
```
哪些城市被查询最多？
显示天气查询统计
```

## 故障排查

### 问题：MCP 服务器无法启动

1. 确保已安装依赖：
   ```bash
   cd E:\公司项目\mcp-weather
   npm install
   ```

2. 确保 Worker 正在运行：
   ```bash
   npm run dev
   ```

3. 检查配置文件路径是否正确

4. 查看 Claude Desktop 的日志文件（通常在配置文件同目录下）

### 问题：工具调用失败

1. 确认 `WORKER_URL` 配置正确
2. 确认 Worker 服务正在运行
3. 检查网络连接

## 开发模式 vs 生产模式

**开发模式（本地测试）：**
```json
"env": {
  "WORKER_URL": "http://localhost:8787"
}
```
需要先运行 `npm run dev` 启动本地 Worker

**生产模式（已部署）：**
```json
"env": {
  "WORKER_URL": "https://mcp-weather.你的域名.workers.dev"
}
```
使用已部署的 Cloudflare Workers 地址
