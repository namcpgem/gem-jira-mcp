# Mô tả các công cụ (Tools) của Jira MCP Server

9 tools được hỗ trợ, kết nối tới Jira Server tại pm.gem-corp.tech.

## 1. get_ticket

Đọc toàn bộ thông tin chi tiết của một ticket.

Tham số:
- `ticket_id` (required): Mã ticket. VD: `"GEM-234"`

Trả về: key, summary, status, assignee, priority, start date, due date, labels, description, subtasks.

## 2. transition_ticket

Chuyển đổi trạng thái (status) của ticket.

Tham số:
- `ticket_id` (required): Mã ticket. VD: `"GEM-234"`
- `status` (required): Tên trạng thái đích. VD: `"In Progress"`, `"Done"`, `"In Review"`

Lưu ý: Tự động tra cứu transition ID tương ứng, khớp gần đúng theo tên.

## 3. update_ticket

Cập nhật các trường của ticket.

Tham số:
- `ticket_id` (required): Mã ticket.
- `summary` (optional): Ghi đè tiêu đề ticket.
- `description` (optional): Ghi đè toàn bộ mô tả.
- `implementation_notes` (optional): Nối thêm vào cuối description.
- `issue_type` (optional): Loại ticket: `"Story"`, `"Task"`, `"Bug"`, `"Sub-task"`
- `parent_key` (optional): Ticket cha, dùng khi đổi thành Sub-task. VD: `"GEM-100"`
- `labels` (optional): Danh sách nhãn. VD: `["Dev", "BugFix"]`
- `due_date` (optional): Ngày đến hạn định dạng YYYY-MM-DD.
- `start_date` (optional): Ngày bắt đầu định dạng YYYY-MM-DD.
- `original_estimate` (optional): Ước tính thời gian. VD: `"2h"`, `"1d 4h"`

## 4. add_comment

Thêm bình luận vào ticket.

Tham số:
- `ticket_id` (required): Mã ticket.
- `body` (required): Nội dung bình luận.

## 5. search_tickets

Tìm kiếm tickets bằng JQL.

Tham số:
- `jql` (required): Câu truy vấn JQL. VD: `"project = GEM AND status = 'In Progress'"`
- `max_results` (optional): Số kết quả tối đa. Mặc định: 50.

## 6. create_ticket

Tạo ticket mới.

Tham số:
- `project` (required): Mã dự án. VD: `"GEM"`
- `summary` (required): Tiêu đề ticket.
- `issue_type` (required): Loại ticket: `"Story"`, `"Task"`, `"Bug"`, `"Sub-task"`
- `body` (optional): Description chi tiết.
- `parent_key` (optional): Ticket cha khi tạo Sub-task. VD: `"GEM-100"`
- `due_date` (optional): Ngày đến hạn YYYY-MM-DD.
- `start_date` (optional): Ngày bắt đầu YYYY-MM-DD.
- `original_estimate` (optional): Ước tính thời gian. VD: `"3h"`
- `labels` (optional): Danh sách nhãn.

## 7. generate_release_notes

Tự động tạo Release Notes theo fix version, phân loại theo loại ticket.

Tham số:
- `fix_version` (required): Tên version. VD: `"v2.4"`, `"Labo_App__20260325"`
- `project` (optional): Mã dự án để giới hạn phạm vi tìm kiếm.

Trả về: Markdown phân nhóm Features / Improvements / Bug Fixes / Other.

## 8. link_issues

Tạo liên kết giữa hai tickets.

Tham số:
- `inward_issue` (required): Ticket nguồn. VD: `"GEM-1"`
- `outward_issue` (required): Ticket đích. VD: `"GEM-2"`
- `link_type` (optional): Loại liên kết. Mặc định: `"Blocks"`. Các giá trị hợp lệ: `"Blocks"`, `"Clones"`, `"Relates to"`, `"Duplicate"`

## 9. log_work

Ghi nhận thời gian làm việc (worklog) trên ticket.

Tham số:
- `ticket_id` (required): Mã ticket. VD: `"GEM-234"`
- `time_spent` (required): Thời gian đã dùng. VD: `"2h 30m"`, `"1d"`, `"45m"`
- `comment` (optional): Ghi chú cho worklog.
- `started` (optional): Thời điểm bắt đầu, định dạng ISO. VD: `"2026-06-29T09:00:00.000+0700"`. Mặc định là thời điểm hiện tại.
