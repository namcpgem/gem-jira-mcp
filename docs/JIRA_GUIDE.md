# Hướng dẫn cài đặt Jira MCP Server

MCP server chạy theo giao thức stdio, kết nối tới Jira Server tại pm.gem-corp.tech.

## Yêu cầu

- Node.js 18+
- Tài khoản Jira Server với username/password

## Cài đặt

```bash
cd d:/ws/lab/jira-mcp
npm install
```

## Cấu hình

Tạo file `.env` trong thư mục gốc:

```env
JIRA_HOST=https://pm.gem-corp.tech
JIRA_USERNAME=your-username
JIRA_PASSWORD=your-password
```

## Tích hợp Claude Desktop

Thêm vào file `claude_desktop_config.json` (Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["d:/ws/lab/jira-mcp/src/index.js"],
      "env": {
        "JIRA_HOST": "https://pm.gem-corp.tech",
        "JIRA_USERNAME": "your-username",
        "JIRA_PASSWORD": "your-password"
      }
    }
  }
}
```

Hoặc nếu dùng file `.env`, bỏ phần `env` và giữ nguyên `command`/`args` — server tự load `.env`.

## Tích hợp Claude Code (VSCode extension)

Thêm vào `.claude/settings.json` trong thư mục dự án hoặc `~/.claude/settings.json` (global):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["d:/ws/lab/jira-mcp/src/index.js"]
    }
  }
}
```

## Kiểm tra kết nối

```bash
# Test Jira API
curl -s -u 'your-username:your-password' \
  'https://pm.gem-corp.tech/rest/api/2/myself' | python3 -m json.tool

# Test chạy server
node src/index.js
# Output mong đợi: Jira MCP server running on stdio
```

## Xác minh tools

Sau khi kết nối Claude, gõ thử:
- "Lấy thông tin ticket GEM-1" → dùng `get_ticket`
- "Tìm ticket đang In Progress của project GEM" → dùng `search_tickets`
