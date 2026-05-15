# 费控一体化

从 `zima-demo-3` 抽离出的费控一体化后台项目。

## 范围

- 登录、会话与受保护后台布局
- 系统用户、系统角色和日志审计
- 费用管控：普通用户上传、管理员上传、报销审核队列
- 预算监控：预算总额、已使用、剩余、超支禁报和分类汇总
- SQLite + Drizzle ORM 本地数据访问层

## 本地开发

```bash
pnpm install
pnpm dev
```

默认开发端口为 `8001`。

## 内置账号

开发环境会自动创建 root、管理员和普通用户示例账号。

- root: `root` / `root123456`
- 管理员: `demo.admin01` / `seeded-admin-123456`
- 普通用户: `demo.user01` / `seeded-user-123456`

生产环境首次初始化 root 账号时需要设置 `ADMIN_ROOT_PASSWORD`。

## 主要路径

- `/admin/expense/user-upload`: 普通用户上传
- `/admin/expense/reimbursements`: 管理员上传与报销审核
- `/admin/expense/budgets`: 预算监控
- `/admin/system/users`: 用户管理
- `/admin/system/roles`: 角色管理
- `/admin/system/audit-logs`: 日志审计

## Mock 文件名

报销审核只读取上传文件的文件名 stem 作为 mock 场景选择器，不解析图片内容。

- `mock-success`: 正常通过
- `mock-fake`: 发票验真失败
- `mock-duplicate`: 重复报销阻断
- `mock-compliance`: 合规问题阻断
- `mock-overbudget`: 超支禁报并进入预算统计
