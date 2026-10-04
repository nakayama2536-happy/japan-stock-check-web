# 調査と解析の二目的化 / v1.12.0

Refs #34。状態はPR/IssueのCI・配信・実機証拠で管理し、本文だけで完了扱いにしない。

## なぜ3
1. 利用者の目的は画面要約の説明ではなく、データ不備の原因・対策と銘柄の独立評価である。
2. 表示要約はSource差分、QC理由、条件のpurpose/required、technical、財務、履歴を省いていた。
3. 公開済みの根拠と既存の検証済みbundle loaderを再利用。Core・売買条件・予測値・公開範囲を変更せず用途別に許可項目を出力する。

## 操作
判断サマリーの「データ不備を調べる」は5銘柄全体の根拠を集約。品質タブにも入口を置く。
「選んだ銘柄を詳しく解析」または各銘柄の同名ボタンは1銘柄の履歴付きデータを検証する。EDINETのデータ有無に入口を依存させない。
用途選択→内容の準備/検証→別の利用者操作でコピーまたは全文テキスト保存→ChatGPTへ貼り付ける。自動送信・API課金・設定変更・注文は追加しない。コピー拒否時は全文を選択でき、省略しない。

## A データ不備調査
schema jp-data-investigation/1。表示中の保存データから公開許可項目のみ抽出。取得元・差分・基準日/生成日時/Run/版、同一版対応、品質理由/条件、欠損/重複/未知銘柄、条件purpose/required、方向と過去中央値の違いを含める。WARNは空のwarning_notesに埋もれさせない。
このボタンはmanifestやActionsを再取得しない。manifest_verification=NOT_CHECKED、hash_check=NOT_PERFORMEDを明記。調査に必要な正本パスと不足情報を付記し、接続が使えるChatGPTにソース・ログの確認を依頼する。原因を確定した診断ソフトではない。
出力目標は不備→根拠→仕様上の制限→原因/仮説→最小修正→再試験→不足情報。

## B 独立解析
schema jp-security-analysis/1。既存loadVerifiedPayloadでpayload SHA-256、source inventoryとmanifestの対応、取得前後publication_idを検査。選択銘柄、表示側Run/基準日/生成日時/エンジン版、保存フィールド、履歴件数/開始終了日を追加検査。版混在/欠損/ハッシュ不備は停止し、表示要約をFULLとして代用しない。
source_files_hashesはMANIFEST_REFERENCES_CHECKED_NOT_INDIVIDUALLY_REFETCHEDとし、各元ファイルを再取得して検査したとは扱わない。
公開OHLCV、technical、weekly、levels、outlook score/analog、公開方針、条件、EDINET期間/単位/当期比較期、market contextを許可項目で出力。個人ポジション・口座・評価メモ・認証情報を読む経路はない。
公開履歴の期間/件数を画面と出力で明記。全計算履歴や類似40例の完全再現と称さない。外部情報はChatGPT側で必要時に一次資料を確認し、保存値と分ける。
SHADOWはアプリ正式採用の制限であり、根拠付きの独立評価・条件付き提案を禁止しない。自動採用や注文はしない。

## 非変更と残件
Core、docs/data原本、manifestデータ、予測/判断ロジック、5銘柄設定、品質6項目、個人記録、17:00正式系は非変更。既存表示要約APIと旧FULL機能は互換性のため保持するが、新しい主要入口は二目的にする。
旧6銘柄の保存データは既存のactive projectionを使用。データ対象変更の実市場Run確認は別工程。
実機で二つのコピーと、貼付後に原因/対策・独立解析が実用になるかを確認するまでは#34を閉じない。全計算履歴の再現、生成時commitの追跡、正式判断producer連携は別工程。
