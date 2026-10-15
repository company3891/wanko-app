/* www を詰める（2026-10-15）
   アプリの中身は、ウェブ版に出している web/app/ と同じものを使う。
   ゲーム本体を二か所で持たないため（同じ表を二か所に持つと静かに食い違う）。

   どこから取るか：
     WEB_APP_DIR が立っていればそこ（GitHub Actions では公開の repo を取ってきた場所）
     無ければ ../web/app（悠さんの手元の Dropbox）

   入れないもの：
     .git           … 倉の帳面。アプリには要らない
     sw.js          … アプリの中ではサービスワーカーを使わない（capacitor:// では動かない）
     index_開発用.html／わんこ大戦国.html … index.html と同じ中身の写し。重さが倍になるだけ
     tools/ src/ sim/ … 束ねる前の材料。index.html に全部入っている */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.resolve(process.env.WEB_APP_DIR || path.join(ROOT, '..', 'web', 'app'));
const DST = path.join(ROOT, 'www');
const SKIP = new Set(['.git', '.github', 'sw.js', 'index_開発用.html', 'わんこ大戦国.html',
                      'tools', 'src', 'sim', 'node_modules', '.nojekyll', 'build_standalone.mjs', 'serve.mjs']);

if (!fs.existsSync(path.join(SRC, 'index.html'))) {
  console.error(`index.html が見つからない: ${SRC}`);
  process.exit(1);
}

/* 消す権限の無い置き場でも動くよう、消さずに上書きで写す。
   名前の変わった古い絵は残るが、index.html から呼ばれなければ害は無い */
let n = 0, bytes = 0;
function copyDir(a, b) {
  fs.mkdirSync(b, { recursive: true });
  for (const ent of fs.readdirSync(a, { withFileTypes: true })) {
    if (SKIP.has(ent.name) || ent.name.startsWith('_')) continue;
    const s = path.join(a, ent.name), d = path.join(b, ent.name);
    if (ent.isDirectory()) { copyDir(s, d); continue; }
    const st = fs.statSync(s);
    if (fs.existsSync(d)) {
      const dt = fs.statSync(d);
      if (dt.size === st.size && dt.mtimeMs + 1000 >= st.mtimeMs) continue;   // 同じものは飛ばす
    }
    fs.copyFileSync(s, d);
    n++; bytes += st.size;
  }
}
copyDir(SRC, DST);

/* アプリの中だと分かる印を index.html に一行だけ足す。
   ゲーム側は window.WANKO_NATIVE を見て、書き出しを共有の画面に切り替える */
const idx = path.join(DST, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
if (!html.includes('WANKO_NATIVE')) {
  /* アプリの中だけの手当て（2026-10-15）
     ・二本指で広げる／二度たたいて寄る、を止める。盤を触っているうちに画面が膨らむと戻せない
     ・絵の長押しで「画像を保存」が出るのを止める（ウェブ版では前から気にしていたもの） */
  html = html
    .replace('<head>', '<head><script>window.WANKO_NATIVE=true</script>'
      + '<style>img{-webkit-touch-callout:none}</style>')
    .replace('viewport-fit=cover"', 'viewport-fit=cover,maximum-scale=1,user-scalable=no"');
  fs.writeFileSync(idx, html);
}
console.log(`www に詰めた：${n}点（${(bytes / 1048576).toFixed(1)}MB）　もと：${SRC}`);
