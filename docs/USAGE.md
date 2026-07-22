# Hướng dẫn sử dụng

Jira mcp là MCP server cho phép AI assistant (Claude Code, Claude Desktop, ...) đọc/ghi trực tiếp lên Jira Server/Data Center (REST API v2) của bạn.

## Yêu cầu

- Một tài khoản Jira Server/Data Center (username + password).
- Node.js 18+.

## Cách 1: Dùng Claude Code CLI (khuyến nghị)

```bash
claude mcp add jira-mcp npx -y g-jira-mcp@latest \
  --env JIRA_HOST="https://jira.company.com" \
  --env JIRA_USERNAME="your_username" \
  --env JIRA_PASSWORD="your_password"
```

## Cách 2: Cấu hình thủ công

Thêm vào `.claude/settings.json` (hoặc `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "npx",
      "args": ["-y", "g-jira-mcp@latest"],
      "env": {
        "JIRA_HOST": "https://jira.company.com",
        "JIRA_USERNAME": "your_username",
        "JIRA_PASSWORD": "your_password"
      }
    }
  }
}
```

Khởi động lại Claude Code/Desktop sau khi sửa config.

## Cách 3: Cài đặt từ file zip release

1. Tải `jira-mcp-v<version>.zip` từ trang release.
2. Giải nén vào một thư mục, ví dụ `C:\tools\jira-mcp`.
3. Copy `.env.example` thành `.env` trong thư mục đó và điền thông tin Jira (hoặc khai báo env trực tiếp trong config MCP client).
4. Không cần `npm install` — file `index.js` đã tự chứa toàn bộ dependencies.

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["/path/to/jira-mcp/index.js"],
      "env": { "...": "..." }
    }
  }
}
```

## Cấu hình biến môi trường

| Biến                    | Bắt buộc | Mô tả                                                                                    |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `JIRA_HOST`             | có       | URL gốc, ví dụ `https://jira.company.com`                                                |
| `JIRA_USERNAME`         | có       | Tên đăng nhập Jira                                                                       |
| `JIRA_PASSWORD`         | có       | Mật khẩu Jira                                                                            |
| `JIRA_START_DATE_FIELD` | không    | Custom field ID cho "Start date" (mặc định `customfield_11300`, khớp `pm.gem-corp.tech`) |
| `JIRA_TIMEZONE`         | không    | Múi giờ cho form WorklogPRO (mặc định `Asia/Ho_Chi_Minh`)                                |

Để tra custom field ID trên instance của bạn:

```bash
curl -u user:pass https://jira.company.com/rest/api/2/field | jq '.[] | select(.name | test("story|point|start"; "i")) | {id, name}'
```

## Danh sách công cụ (tools)

| Tool                     | Chức năng                                                                                                                   | Tham số chính                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_ticket`             | Lấy chi tiết đầy đủ của một ticket Jira theo key                                                                            | `ticket_id`                                                                                                                                                                          |
| `search_tickets`         | Tìm kiếm ticket Jira bằng JQL                                                                                               | `jql`, `max_results` (tùy chọn, mặc định 50)                                                                                                                                         |
| `create_ticket`          | Tạo một ticket Jira mới (Story, Task, Bug, Sub-task)                                                                        | `project`, `summary`, `issue_type`, tùy chọn: `body`, `parent_key`, `due_date`, `start_date`, `original_estimate`, `labels`                                                          |
| `update_ticket`          | Cập nhật các field của ticket Jira (summary, description, type, parent, labels, dates, estimate, assignee, priority, notes) | `ticket_id`, tùy chọn: `summary`, `description`, `issue_type`, `parent_key`, `labels`, `due_date`, `start_date`, `original_estimate`, `implementation_notes`, `assignee`, `priority` |
| `transition_ticket`      | Đổi trạng thái ticket theo tên                                                                                              | `ticket_id`, `status`                                                                                                                                                                |
| `add_comment`            | Thêm comment vào ticket Jira                                                                                                | `ticket_id`, `body`                                                                                                                                                                  |
| `log_work`               | Log thời gian làm việc trên ticket, tùy chọn đặt WorklogPRO Type of Work và Type of Activity                                | `ticket_id`, `time_spent`, tùy chọn: `comment`, `started`, `work_type`, `activity`                                                                                                   |
| `link_issues`            | Tạo liên kết giữa hai ticket Jira (e.g. Blocks, Relates to, Clones, Duplicate)                                              | `inward_issue`, `outward_issue`, tùy chọn: `link_type` (mặc định "Blocks")                                                                                                           |
| `generate_release_notes` | Tạo release notes dạng Markdown cho một fix version, nhóm theo loại issue                                                   | `fix_version`, tùy chọn: `project`                                                                                                                                                   |

### Lưu ý quan trọng

- Jira Server dùng plain text cho description — không dùng định dạng ADF.
- `duedate` là field chuẩn (`YYYY-MM-DD`); "Start date" là custom field, cấu hình qua `JIRA_START_DATE_FIELD`.
- `search_tickets` dùng cú pháp JQL, ví dụ: `project = GEM AND status = 'In Progress'`.
- `transition_ticket` khớp trạng thái đích theo tên và tự tìm transition ID tương ứng.
- `update_ticket` chỉ đổi các field bạn truyền vào; bỏ qua field để giữ nguyên giá trị cũ. Truyền `assignee=""` để gỡ assignee. `implementation_notes` sẽ được append thêm vào description.
- `log_work` chấp nhận alias có tên cho `work_type` (ví dụ: code, deploy, design, fix, testing) và `activity` (ví dụ: create, review, correct). `activity` bắt buộc khi đặt `work_type`. Nếu không đặt cả hai, sẽ log qua REST API thường (không dùng form WorklogPRO). Thời gian bắt đầu được diễn giải theo múi giờ server Jira (cấu hình qua `JIRA_TIMEZONE`).
- `generate_release_notes` nhóm ticket theo loại thành Features / Improvements / Bug Fixes / Other.
- Toàn bộ log ghi ra stderr; stdout dành riêng cho giao thức MCP.

## Ví dụ prompt cho AI assistant

- "Tìm các ticket trong project GEM đang In Progress"
- "Tạo một Story trong GEM tên 'Release notes v2.0' hạn 2026-08-01"
- "Cập nhật GEM-234, đặt assignee là namcp và thêm label BugFix"
- "Thêm comment vào GEM-234: 'Đã review xong'"
- "Tạo release notes cho fix version v2.4 trong project GEM"

## Xử lý sự cố

- Lỗi 401/403: kiểm tra lại `JIRA_USERNAME`/`JIRA_PASSWORD` và tài khoản có quyền truy cập project không.
- Lỗi kết nối/timeout: kiểm tra `JIRA_HOST` đúng định dạng (có `https://`, không có dấu `/` cuối), có VPN/mạng nội bộ cần thiết không.
- Start date không lưu: xác nhận `JIRA_START_DATE_FIELD` khớp với instance của bạn (xem lệnh tra field ở trên).
- Không thấy log lỗi: log server nằm ở stderr, kiểm tra output của MCP client (Claude Code/Desktop) thay vì stdout.

---

Được tạo bởi [NamCP](namcp@gem-corp.global)
