/* === CBT-I Sleep Window Calculator ===
 * All calculations run in the browser only.
 * No server communication. No data storage.
 *
 * Future extensions (commented stubs):
 *   - sleep diary integration
 *   - AI-based personalised advice
 *   - SLEEPI database link
 */

(function () {
  'use strict';

  // ── Populate selects ──────────────────────────────────────────────────────
  function buildHourOptions(sel, max) {
    for (let h = 0; h <= max; h++) {
      const o = document.createElement('option');
      o.value = h;
      o.textContent = h + '時間';
      sel.appendChild(o);
    }
  }

  function buildMinOptions(sel) {
    [0, 15, 30, 45].forEach(m => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m + '分';
      sel.appendChild(o);
    });
  }

  const tstH = document.getElementById('tst-h');
  const tstM = document.getElementById('tst-m');
  const tibH = document.getElementById('tib-h');
  const tibM = document.getElementById('tib-m');

  buildHourOptions(tstH, 13);
  buildMinOptions(tstM);
  buildHourOptions(tibH, 16);
  buildMinOptions(tibM);

  // Default sensible values
  tstH.value = '6'; tstM.value = '0';
  tibH.value = '8'; tibM.value = '0';
  document.getElementById('wake-time').value = '07:00';

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toMin(h, m) { return parseInt(h) * 60 + parseInt(m); }

  function fmtDuration(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? h + '時間' : h + '時間' + m + '分';
  }

  function fmtTime(totalMin) {
    let t = ((totalMin % 1440) + 1440) % 1440;
    const h = Math.floor(t / 60);
    const m = t % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function clamp(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); }

  // ── Sleep efficiency ──────────────────────────────────────────────────────
  function calcSE(tstMin, tibMin) {
    if (tibMin === 0) return null;
    return Math.round((tstMin / tibMin) * 100);
  }

  function seState(se) {
    if (se >= 95) return 'sleep';
    if (se >= 85) return 'good';
    if (se >= 75) return 'ok';
    return 'bad';
  }

  function seInterpretation(se) {
    if (se > 100) return {
      icon: '⚠️',
      text: '臥床時間より睡眠時間が長くなっています。入力値をご確認ください。'
    };
    if (se >= 95) return {
      icon: '😴',
      text: '睡眠効率が非常に高い状態です。睡眠時間が不足している状態かもしれません。必要な睡眠時間を確保できているか見直してみましょう。'
    };
    if (se >= 85) return {
      icon: '✅',
      text: '睡眠効率は良好です。ベッドに入った時間のほとんどを眠れています。'
    };
    if (se >= 75) return {
      icon: '🟡',
      text: '基準範囲内ですが、睡眠の質に改善の余地があるかもしれません。'
    };
    return {
      icon: '🔴',
      text: '睡眠効率が低い傾向が見られます。不眠の認知行動療法に基づく臥床時間制限法は、このような状態に効果が研究されている方法の一つです。詳しくは専門家にご相談ください。'
    };
  }

  // ── Sleep window ─────────────────────────────────────────────────────────
  function calcWindow(tstMin) {
    const MIN_WINDOW = 300; // 5 hours safety minimum
    return Math.max(tstMin + 30, MIN_WINDOW);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderResults(se, tstMin, tibMin, wakeMin) {
    const windowMin = calcWindow(tstMin);
    const bedMin    = wakeMin - windowMin;

    const interp    = seInterpretation(se);
    const state     = seState(se);
    const fillCls   = { good: 'fill-good', ok: 'fill-ok', bad: 'fill-bad', sleep: 'fill-sleep' }[state];
    const circleCls = { good: 'state-good', ok: 'state-ok', bad: 'state-bad', sleep: 'state-sleep' }[state];
    const interpCls = { good: 'state-good', ok: 'state-ok', bad: 'state-bad', sleep: 'state-sleep' }[state];
    const barPct    = clamp(se, 0, 100);

    const bedTimeStr  = fmtTime(bedMin);
    const wakeTimeStr = fmtTime(wakeMin);
    const windowStr   = fmtDuration(windowMin);

    // Sleep insufficiency note (SE >= 90%)
    const insuffNote = (se >= 90 && se <= 100)
      ? `<div class="notice-box warn">
           <strong>睡眠時間の確保が優先される場合があります</strong><br>
           睡眠効率が90%以上と高い場合、睡眠時間そのものが不足している場合があります。
           下記スケジュールを参考にしつつ、まず十分な睡眠時間を確保することもご検討ください。
         </div>`
      : '';

    const shortNote = (tstMin < 300)
      ? `<div class="notice-box">
           安全のため、睡眠ウィンドウの最小値は<strong>5時間</strong>に設定されています。
         </div>`
      : '';

    const shareText = encodeURIComponent(
      `私の参考睡眠スケジュール：入床 ${bedTimeStr}→起床 ${wakeTimeStr}（睡眠効率 ${se}%）\n睡眠スケジュール計算ツールで表示しました。`
    );
    const shareUrl = encodeURIComponent('https://yukifurukawa.jp/sleep-window-calculator');

    document.getElementById('results').innerHTML = `
      <!-- 結果上部の免責 -->
      <div class="result-disclaimer">
        ※ 以下は一般的な参考情報です。医師による診断・治療の代替ではありません。
      </div>

      <!-- 睡眠効率 -->
      <div class="result-section">
        <div class="result-title">睡眠効率</div>
        <div class="se-row">
          <div class="se-circle ${circleCls}">
            <span class="pct">${se}%</span>
          </div>
          <div class="se-bar-wrap">
            <div class="se-bar-track">
              <div class="se-bar-fill ${fillCls}" style="width:${barPct}%"></div>
            </div>
            <div class="se-bar-label">
              臥床時間 ${fmtDuration(tibMin)} ／ 総睡眠時間 ${fmtDuration(tstMin)}
            </div>
          </div>
        </div>
        <div class="interp-box ${interpCls}">
          ${interp.icon} ${interp.text}
        </div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0">

      <!-- 参考スケジュール -->
      <div class="result-section">
        <div class="result-title">参考睡眠スケジュール（目安）</div>
        ${insuffNote}
        ${shortNote}
        <div class="schedule-grid">
          <div class="sched-item">
            <div class="sched-label">入床時刻</div>
            <div class="sched-val">${bedTimeStr}</div>
          </div>
          <div class="sched-item">
            <div class="sched-label">起床時刻</div>
            <div class="sched-val">${wakeTimeStr}</div>
          </div>
        </div>
        <div class="sched-item" style="margin-bottom:14px;border-radius:10px;background:var(--bg);padding:12px;text-align:center;">
          <div class="sched-label">参考臥床時間</div>
          <div class="sched-val" style="font-size:20px">${windowStr}</div>
          <div class="sched-sub">この時間帯をベッドで過ごすことを目標にします</div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0">

      <!-- CBT-I リンク -->
      <div class="result-section">
        <div class="cbtlink-box">
          このスケジュールは 臥床時間制限法 の考え方を参考にしています。
          不眠の認知行動療法の詳しい解説は
          <a href="https://yukifurukawa.jp/cbt-i-for-all/" target="_blank" rel="noopener">ブログ記事</a> や
          <a href="https://amzn.to/3MVZJjj" target="_blank" rel="noopener">書籍</a>
          もご参照ください。
        </div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0">

      <!-- シェア -->
      <div class="share-section">
        <div class="share-label">この結果をシェアする</div>
        <div class="share-btns">
          <a class="share-btn tw"
             href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}"
             target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            X でシェア
          </a>
          <a class="share-btn fb"
             href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}"
             target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <button class="share-btn cp" id="copy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            リンクをコピー
          </button>
        </div>
        <div class="copy-msg" id="copy-msg"></div>
      </div>
    `;

    document.getElementById('results').classList.remove('hidden');
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    document.getElementById('copy-btn').addEventListener('click', function () {
      const url = 'https://yukifurukawa.jp/sleep-window-calculator';
      navigator.clipboard.writeText(url).then(() => {
        const msg = document.getElementById('copy-msg');
        msg.textContent = 'URLをコピーしました！';
        setTimeout(() => { msg.textContent = ''; }, 2500);
      });
    });
  }

  // ── Validate & calculate ──────────────────────────────────────────────────
  function calculate() {
    const tstMin = toMin(tstH.value, tstM.value);
    const tibMin = toMin(tibH.value, tibM.value);
    const wakeVal = document.getElementById('wake-time').value;

    if (tstMin === 0) {
      alert('平均睡眠時間を入力してください。');
      return;
    }
    if (tibMin === 0) {
      alert('平均臥床時間を入力してください。');
      return;
    }
    if (!wakeVal) {
      alert('起床時刻を入力してください。');
      return;
    }
    if (tstMin > tibMin) {
      alert('睡眠時間が臥床時間を超えています。入力値をご確認ください。');
      return;
    }

    const se = calcSE(tstMin, tibMin);
    const [wh, wm] = wakeVal.split(':').map(Number);
    const wakeMin = wh * 60 + wm;

    renderResults(se, tstMin, tibMin, wakeMin);
  }

  document.getElementById('calc-btn').addEventListener('click', calculate);

  document.getElementById('wake-time').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') calculate();
  });

  /* ── Future extension stubs ──────────────────────────────────────────────
   *
   * // Sleep diary integration
   * function loadFromDiary(diary) { ... }
   *
   * // AI personalised advice (requires API key, opt-in)
   * async function fetchAIAdvice(se, window) { ... }
   *
   * // SLEEPI database link
   * function linkToSLEEPI(trialId) { ... }
   *
   * ────────────────────────────────────────────────────────────────────── */

})();
