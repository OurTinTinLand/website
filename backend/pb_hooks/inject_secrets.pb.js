/// <reference path="../pb_data/types.d.ts" />
//
// spec §pb_public —— 历史：PB onServe hook 方案尝试过但有兼容性坑
// （PB v0.39 routerAdd "/" 是前缀匹配，且 e.next() 不会真正 fall through 到
// 静态中间件，导致 /dist/bundle.js 等静态资源被吞掉返回 0 字节；
// routerUse middleware 方案同样破坏了响应链）。
//
// 当前方案：start.sh 在 PB 启动前用 sed 替换
//   <!--INJECT:PB_ADMIN_DEMO_SECRET-->  →  <script>window.PB_ADMIN_DEMO_SECRET="...";</script>
// 这样 PB 静态中间件直接 serve 替换后的 index.html，没有任何 hook 拦截。
//
// 副作用：pb_public/index.html 在容器内会被原地改写（PB 启动后不再回到原值）。
// 不影响其它资源（只改这一个文件）。
//
console.log("[inject_secrets.pb.js] LOADED (no-op; start.sh handles substitution)");
