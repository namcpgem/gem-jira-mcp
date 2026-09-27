# Hướng dẫn Release

## Yêu cầu

- Node.js 18+
- pnpm
- Đã cài dependencies: `pnpm install`

## Quy trình release

1. Chạy release (thủ công, khi sẵn sàng):

   ```bash
   pnpm release
   ```

   release-it sẽ thực hiện tự động:
   - Lint + build kiểm tra
   - Hỏi phiên bản mới (patch/minor/major)
   - Commit với message "chore: release v${version}"
   - Tạo git tag "v${version}"
   - Push commit và tag lên GitHub
   - Mở trang tạo GitHub release (cần điền thủ công trong browser)

   Không cần commit trước; release-it xử lý git operations. Chỉ cần run khi muốn release.

2. Kiểm tra nhanh sau build (`pnpm build` chạy rsbuild theo `rsbuild.config.mjs`, bundle `src/index.js` thành file duy nhất `dist/index.js`, kèm shebang `#!/usr/bin/env node`):

   ```bash
   node dist/index.js
   ```

   Server phải khởi động và log ra stderr (stdout chỉ dành cho giao thức MCP), không có lỗi.

## Kênh phát hành

Các kênh cài đặt cho người dùng:

### 1. GitHub (git install, khuyến nghị)

```bash
npx github:namcpgem/gem-jira-mcp
```

Khi cài từ git, npm tự chạy script `prepare` (cấu hình `"prepare": "npm run build"`) để build `dist/index.js`. release-it tự động push tag lên GitHub — chỉ cần đảm bảo repo ở chế độ public.

Lưu ý: package chưa publish lên npm (tên `jira-mcp` đã bị chiếm bởi tài khoản khác). `.release-it.json` để `npm.publish: false`; phát hành qua GitHub + zip.

## Checklist trước `pnpm release`

- [ ] Kiểm tra `.env` không bị commit (đã có trong `.gitignore`)
- [ ] README/docs tools/params phản ánh đúng code hiện tại
- [ ] Local branch updated, tất cả changes đã commit

release-it sẽ tự động:

- [ ] Chạy lint + build
- [ ] Bump version trong package.json
- [ ] Commit, tag, push
- [ ] Mở browser để tạo GitHub release (copy changelog + submit form)
