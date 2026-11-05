# 筋トレ記録（Web版）

iPhoneのSafariで開いて、ホーム画面に追加して使うWebアプリです。SwiftUI版と同じ機能と計算式で作っています。ビルドや外部ライブラリは不要で、このフォルダのファイルを置くだけで動きます。

## データ

- 記録は端末のブラウザ内（IndexedDB）にだけ保存します。サーバーには送信しません。
- 書き出したバックアップから復元できます。SwiftUI版の `data.json` も読み込めます。
- Safariの履歴とWebサイトデータの消去、ホーム画面からの削除などで消えることがあります。設定タブからときどき書き出してください。

## 手元で動かす

```bash
python3 -m http.server 8765 --directory web
```

ブラウザで `http://localhost:8765` を開きます。

## iPhoneで使う

1. このフォルダの中身をHTTPSの静的ホスティング（GitHub Pages、Cloudflare Pagesなど）へ公開します。
2. iPhoneのSafariでそのURLを開きます。
3. 共有ボタンから「ホーム画面に追加」を選びます。

## 更新するとき

ファイルを変更したら、`sw.js` の `VERSION` を上げて公開します。上げないとiPhone側に古いファイルが残ります。

## テスト

```bash
node --test web-tests/
```
