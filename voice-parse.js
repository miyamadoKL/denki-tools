/* 音声入力パーサ（電圧降下計算用）
   認識テキストから 配線方式・こう長L・電流I・断面積A・供給電圧 を抽出する純粋関数。
   ブラウザでは window.parseVoiceInput、Nodeでは require() で使える（単体テスト用）。

   断面積Aの扱い（方針）: ここでは数値をそのまま返すだけ。
   呼び出し側（voice.js）が、ページのプルダウンに存在しない値だった場合は
   「最も近い選択肢へ勝手に寄せず」警告を表示し、その項目は反映しない。 */
(function (global) {
  'use strict';

  var KANJI_DIGITS = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  var KANJI_UNITS = { '十': 10, '百': 100, '千': 1000 };

  // 漢数字（例: 五十、二十、百二十三、五点五）を算用数字文字列へ変換
  function kanjiToNumber(str) {
    var total = 0, current = 0, seen = false;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (Object.prototype.hasOwnProperty.call(KANJI_DIGITS, ch)) {
        current = KANJI_DIGITS[ch]; seen = true;
      } else if (Object.prototype.hasOwnProperty.call(KANJI_UNITS, ch)) {
        var unit = KANJI_UNITS[ch];
        total += (current === 0 ? 1 : current) * unit;
        current = 0; seen = true;
      }
    }
    var value = total + current;
    return seen ? String(value) : null;
  }

  function convertKanjiNumbers(text) {
    return text.replace(/[〇零一二三四五六七八九十百千]+(?:点[〇零一二三四五六七八九]+)?/g, function (m) {
      var parts = m.split('点');
      var intPart = kanjiToNumber(parts[0]);
      if (intPart === null) { return m; }
      if (parts.length === 2) {
        var frac = '';
        for (var i = 0; i < parts[1].length; i++) {
          var d = KANJI_DIGITS[parts[1][i]];
          if (d === undefined) { return m; }
          frac += String(d);
        }
        return intPart + '.' + frac;
      }
      return intPart;
    });
  }

  // 全角→半角、漢数字→算用数字、空白除去などの正規化
  function normalize(text) {
    var t = String(text == null ? '' : text);
    t = t.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    t = t.replace(/．/g, '.').replace(/。/g, '、');
    t = convertKanjiNumbers(t);
    return t;
  }

  function findNumber(t, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      var m = t.match(patterns[i]);
      if (m) {
        var v = parseFloat(m[1]);
        if (!isNaN(v)) { return v; }
      }
    }
    return null;
  }

  /**
   * @param {string} text 音声認識テキスト
   * @returns {{system: (string|null), length: (number|null), current: (number|null),
   *            area: (number|null), voltage: (number|null), normalized: string}}
   *   system は 'single' | 'three' | null
   */
  function parseVoiceInput(text) {
    var t = normalize(text);
    var result = { system: null, length: null, current: null, area: null, voltage: null, normalized: t };

    // 配線方式
    if (/三相|３相|3相|さんそう/.test(t)) { result.system = 'three'; }
    else if (/単相|１相|1相|たんそう/.test(t)) { result.system = 'single'; }

    // こう長 L [m]（「校長」は「こう長」の誤認識として許容）
    result.length = findNumber(t, [
      /(?:長さ|ながさ|こう長|校長|全長|距離)(?:は|が)?[^\d]{0,3}?(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*(?:メートル|メーター|㍍)/,
      /(\d+(?:\.\d+)?)\s*(?:ｍ|m)(?![a-zA-Z0-9])/
    ]);

    // 電流 I [A]
    result.current = findNumber(t, [
      /(?:電流)(?:は|が)?[^\d]{0,3}?(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*(?:アンペア|アンペヤ)/,
      /(\d+(?:\.\d+)?)\s*A(?:[\s、]|$)/
    ]);

    // 断面積 A [mm²]
    result.area = findNumber(t, [
      /(?:断面積|だんめんせき|スケア|太さ)(?:は|が)?[^\d]{0,3}?(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*(?:スケア|スケヤ|sq|SQ|mm2|mm²|平方ミリメートル|平方ミリ)/
    ]);

    // 供給電圧 [V]
    result.voltage = findNumber(t, [
      /(?:供給電圧|電圧)(?:は|が)?[^\d]{0,3}?(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*(?:ボルト)/
    ]);

    return result;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseVoiceInput: parseVoiceInput, normalize: normalize };
  }
  global.parseVoiceInput = parseVoiceInput;
})(typeof window !== 'undefined' ? window : globalThis);
