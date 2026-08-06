# Hướng dẫn sử dụng

Jira mcp là MCP server cho phép AI assistant (Claude Code, Claude Desktop, ...) đọc/ghi trực tiếp lên Jira Server/Data Center (REST API v2) của bạn.

## Yêu cầu

- Một tài khoản Jira Server/Data Center (username + password).
- Node.js 18+.

## Cách 1: Dùng Claude Code CLI (khuyến nghị)

```bash
claude mcp add g-jira-mcp npx -y g-jira-mcp@latest \
  --env JIRA_HOST="https://jira.company.com" \
  --env JIRA_USERNAME="your_username" \
  --env JIRA_PASSWORD="your_password"
```

## Cách 2: Cấu hình thủ công

Thêm vào `.claude/settings.json` (hoặc `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "g-jira-mcp": {
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
    "g-jira-mcp": {
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
| `JIRA_EPIC_LINK_FIELD`  | không    | Custom field ID cho "Epic Link" (mặc định `customfield_10001`, khớp `pm.gem-corp.tech`)  |
| `JIRA_TIMEZONE`         | không    | Múi giờ cho form WorklogPRO (mặc định `Asia/Ho_Chi_Minh`)                                |

Để tra custom field ID trên instance của bạn:

```bash
curl -u user:pass https://jira.company.com/rest/api/2/field | jq '.[] | select(.name | test("story|point|start"; "i")) | {id, name}'
```

## Danh sách công cụ (tools)

| Tool                     | Chức năng                                                                                    | Tham số chính                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_ticket`             | Lấy chi tiết đầy đủ của một ticket Jira theo key                                             | `ticket_id`, tùy chọn: `include_comments`                                                                                                                                                        |
| `search_tickets`         | Tìm kiếm ticket Jira bằng JQL                                                                | `jql`, `max_results` (tùy chọn, mặc định 25)                                                                                                                                                     |
| `create_ticket`          | Tạo một ticket Jira mới                                                                      | `project`, `summary`, `issue_type`, tùy chọn: `assignee`, `body`, `parent_key`, `due_date`, `start_date`, `original_estimate`, `labels`                                                          |
| `update_ticket`          | Cập nhật các field của ticket Jira                                                           | `ticket_id`, tùy chọn: `summary`, `description`, `issue_type`, `parent_key`, `epic_key`, `labels`, `due_date`, `start_date`, `original_estimate`, `implementation_notes`, `assignee`, `priority` |
| `transition_ticket`      | Đổi trạng thái ticket theo tên, hiểu alias                                                   | `ticket_id`, `status`                                                                                                                                                                            |
| `add_comment`            | Thêm comment vào ticket Jira                                                                 | `ticket_id`, `body`                                                                                                                                                                              |
| `log_work`               | Log thời gian làm việc trên ticket, tùy chọn đặt WorklogPRO Type of Work và Type of Activity | `ticket_id`, `time_spent`, tùy chọn: `comment`, `started`, `work_type`, `activity`                                                                                                               |
| `link_issues`            | Tạo liên kết giữa hai ticket Jira                                                            | `inward_issue`, `outward_issue`, tùy chọn: `link_type` (mặc định "Blocks")                                                                                                                       |
| `generate_release_notes` | Tạo release notes dạng Markdown cho một fix version, nhóm theo loại issue                    | `fix_version`, tùy chọn: `project`                                                                                                                                                               |

### Lưu ý quan trọng

- Jira Server dùng plain text cho description — không dùng định dạng ADF.
- `get_ticket` bỏ qua các field không có giá trị thay vì in placeholder text. Key, Summary, Status và Assignee luôn hiện; các field khác chỉ xuất hiện khi có giá trị. Truyền `include_comments=true` để thêm thread comment của ticket vào output; comment tắt mặc định để giữ output nhỏ và tiết kiệm token. Cùng một request Jira fetch tất cả, nên include comments không tốn thêm API call. Comment được giới hạn 20 bình luận gần nhất; nếu ticket có nhiều hơn, header sẽ hiển thị `Comments (20 most recent of 45):` để người dùng biết rằng có bình luận cũ hơn và có thể mở ticket trong Jira để xem.
- `search_tickets` output thích ứng: các cột trống (không có giá trị ở bất kỳ hàng nào) bị bỏ hoàn toàn, các cột hằng số (cùng giá trị trên mọi hàng, khi có 3+ hàng) được nêu một lần trong header dạng `All: Status=In Progress` và bị xoá khỏi bảng. Khi bỏ các cột, header cũng ghi chú cột nào trống trên tất cả kết quả (ví dụ `Unset for every row: Priority, Parent, Start Date`) để người dùng phân biệt "không có ticket nào có due date" với "tool này không trả về due date". KEY và Summary luôn được giữ. Điều này giữ kết quả tập trung và tiết kiệm token. Header `Found N issue(s) (showing M)` cho biết khi kết quả bị cắt — tăng `max_results` lên trên mức mặc định 25 để xem thêm.
- `create_ticket` và `update_ticket` đều chấp nhận tham số `assignee` (username Jira dưới dạng string, gửi dưới dạng `{name: assignee}`). Trong `create_ticket`, giá trị assignee trống sẽ bị bỏ qua. Trong `update_ticket`, truyền `assignee=""` để gỡ assignee.
- `create_ticket` set `original_estimate` bằng một lệnh PUT ngay sau khi tạo, không gửi kèm trong payload tạo ticket: Jira Data Center trả về `500 Internal server error` trơ khi payload `POST /issue` có `timetracking`, nhưng cùng giá trị đó set qua update thì bình thường. Key của ticket vẫn được báo về ngay cả khi lệnh thứ hai lỗi, kèm cảnh báo set estimate qua `update_ticket` — nhờ vậy estimate lỗi không khiến bạn tạo lại ticket trùng.
- `duedate` là field chuẩn (`YYYY-MM-DD`); "Start date" là custom field, cấu hình qua `JIRA_START_DATE_FIELD`.
- `epic_key` trong `update_ticket` set field Epic Link (custom field, cấu hình qua `JIRA_EPIC_LINK_FIELD`, mặc định `customfield_10001`) để ticket hiện trong panel "Issues in Epic" của epic — khác với `link_issues`, chỉ tạo Linked Issue thông thường (ví dụ "Relates"). Epic Link chỉ set được trên loại issue chuẩn (Story/Task/Bug), không set được trên Sub-task hoặc trên Epic.
- `search_tickets` dùng cú pháp JQL, ví dụ: `project = GEM AND status = 'In Progress'`.
- `transition_ticket` tự tìm transition ID, khớp theo tên transition ("Resolve Issue") hoặc theo trạng thái đích mà nó dẫn tới ("Done"). Các alias thông dụng được map sang trạng thái mà workflow thực sự có (Closed/Resolved/Complete → Done, Reopen → Re-Open, Todo → To Do, Cancelled → Won't Do), nên cùng một lệnh chạy được trên các workflow đặt tên trạng thái khác nhau. Ưu tiên khớp chính xác, rồi alias, cuối cùng mới khớp chuỗi con. Khi không khớp gì, thông báo lỗi liệt kê mọi lựa chọn hợp lệ của ticket đó dạng `Transition -> Target Status`; description của tool không liệt kê được vì danh sách này thay đổi theo từng issue và từng workflow.
- `update_ticket` chỉ đổi các field bạn truyền vào; bỏ qua field để giữ nguyên giá trị cũ. Truyền `assignee=""` để gỡ assignee. `implementation_notes` sẽ được append thêm vào description. Chuyển đổi giữa loại issue chuẩn (Story, Task, Bug) và Sub-task hay ngược lại là hạn chế của REST API Jira — dùng hành động "Move" trong Jira UI thay vào đó.
- `log_work` chỉ nêu một tên quy chuẩn cho mỗi loại work (code, deploy, design, fix, management, meeting, misc, operation, qa, req, research, translation) và mỗi activity (correct, create, review) để schema gọn lại; mọi alias vẫn dùng được làm input (coding, dev, testing, ops, requirement, other, v.v.). `activity` bắt buộc khi đặt `work_type`. Nếu không đặt cả hai, sẽ log qua REST API thường (không dùng form WorklogPRO). Thời gian bắt đầu được diễn giải theo múi giờ server Jira (cấu hình qua `JIRA_TIMEZONE`).
- `generate_release_notes` nhóm ticket theo loại thành Features / Improvements / Bug Fixes / Other.
- Đăng ký server với tên `g-jira-mcp` và dùng đúng tên đó ở mọi project. Tên key này trở thành prefix của tool (`mcp__g-jira-mcp__get_ticket`), nên project nào đăng ký bằng tên khác sẽ có tên tool khác — agent quen tên ở project này mà sang project cấu hình tên kia sẽ nhận `No such tool available`.
- Lỗi tạm thời từ Jira (429, 500, 502, 503, 504) được retry tối đa 2 lần với backoff 250ms/500ms. Chỉ GET, PUT và DELETE được retry — một POST trả về 500 có thể đã tạo xong comment, worklog hoặc transition, nên nó báo lỗi ngay thay vì rủi ro tạo trùng.
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
