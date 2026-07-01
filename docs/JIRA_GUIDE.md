# Hướng dẫn cài đặt Jira MCP Server

MCP server chạy theo giao thức stdio, kết nối tới Jira Server tại pm.gem-corp.tech.

## Yêu cầu

- Node.js 18+
- Tài khoản Jira Server với username/password

## Cài đặt

```bash
cd d:/ws/lab/jira-mcp
pnpm install
```

Để build bản release (bundle vào `dist/index.js` bằng esbuild):

```bash
pnpm build
```

## Cấu hình

Tạo file `.env` trong thư mục gốc:

```env
JIRA_HOST=https://pm.gem-corp.tech
JIRA_USERNAME=your-username
JIRA_PASSWORD=your-password
JIRA_START_DATE_FIELD=customfield_11300
```

`JIRA_START_DATE_FIELD` là ID field "Start date" — mặc định `customfield_11300` (đã xác nhận đúng trên `pm.gem-corp.tech`). Nếu dùng instance Jira khác, tra lại ID bằng:

```bash
curl -s -u 'user:pass' 'https://your-jira/rest/api/2/field' | jq '.[] | select(.name | test("start"; "i")) | {id, name}'
```

## Tích hợp Claude Desktop

Thêm vào file `claude_desktop_config.json` (Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["d:/ws/lab/jira-mcp/dist/index.js"],
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

Lưu ý: `dist/index.js` là bản build (chạy `pnpm build` trước). Khi đang phát triển, trỏ `args` vào `src/index.js` để không phải build lại mỗi lần sửa code.

## Tích hợp Claude Code (VSCode extension)

Thêm vào `.claude/settings.json` trong thư mục dự án hoặc `~/.claude/settings.json` (global):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["d:/ws/lab/jira-mcp/dist/index.js"]
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
