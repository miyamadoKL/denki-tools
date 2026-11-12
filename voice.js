/* 音声入力UI（voltage-drop.html専用）
流れ: マイク → 認識 → parseVoiceInput → → OKで反映して計算
音声で入れた値は即計算しない。必ず確認バーを経由する。

断面積のフォールバック方針:
プルダウンに存在しない値（例: 10 mm²）は、最も近い選択肢へ勝手に寄せない。
確認バーと入力欄の下に警告を表示し、その項目だけ反映しない（手動で選び直してもらう）。 */
(function () {
'use strict';

var btn = document.getElementById('voiceBtn');
var status = document.getElementById('voiceStatus');
var note = document.getElementById('voiceNote');
var confirmBar = document.getElementById('voiceConfirm');
var heardEl = document.getElementById('vcHeard');
var listEl = document.getElementById('vcList');
var warnEl = document.getElementById('vcWarn');
var areaWarn = document.getElementById('voiceAreaWarning');
if (!btn) { return;}

var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
btn.disabled = true;
btn.textContent = '🎤 音声入力はこのブラウザ非対応です';
if (note) {
note.style.display = 'block';
note.textContent = 'このブラウザは音声認識（Web Speech API）に対応していないため、音声入力は使えません。数値を直接入力してください。';
}
if (status) { status.textContent = '';}
return;
}

var pending = null; // {parsed:..., areaValid: bool}
var areaEl = document.getElementById('area');

function areaOptionExists(v) {
for (var i = 0; i < areaEl.options.length; i++) {
if (parseFloat(areaEl.options[i].value) === v) { return true;}
}
return false;
}

function systemLabel(v) { return v === 'three'? '三相3線式': '単相2線式';}

function showConfirm(transcript, parsed) {
pending = { parsed: parsed, areaValid: parsed.area === null || areaOptionExists(parsed.area)};
var items = [];
if (parsed.system) { items.push('配線方式：' + systemLabel(parsed.system));}
if (parsed.length!== null) { items.push('こう長 L：' + parsed.length + ' m');}
if (parsed.current!== null) { items.push('電流 I：' + parsed.current + ' A');}
if (parsed.area!== null) { items.push('断面積 A：' + parsed.area + ' mm²' + (pending.areaValid? '': '（選択肢にありません）'));}
if (parsed.voltage!== null) { items.push('供給電圧：' + parsed.voltage + ' V');}

if (items.length === 0) {
pending = null;
status.textContent = '数値を聞き取れませんでした。もう一度お試しください（例：「長さ50メートル、電流20アンペア、断面積5.5スケア」）。';
return;
}
listEl.innerHTML = '';
items.forEach(function (s) {
var li = document.createElement('li');
li.textContent = s;
listEl.appendChild(li);
});
heardEl.textContent = '聞き取り：' + transcript;
if (!pending.areaValid) {
warnEl.style.display = 'block';
warnEl.textContent = '⚠ 断面積 ' + parsed.area + ' mm² はプルダウンの選択肢にないため反映しません。計算前に手動で選び直してください。';
} else {
warnEl.style.display = 'none';
}
confirmBar.classList.add('show');
status.textContent = '内容を確認してください。';
confirmBar.scrollIntoView({ behavior: 'smooth', block: 'center'});
}

function applyPending() {
if (!pending) { return;}
var p = pending.parsed;
// 方式を先に反映（既存ロジックが供給電圧の既定値を切り替えるため、その後に電圧を上書きする）
if (p.system) {
var systemEl = document.getElementById('system');
systemEl.value = p.system;
systemEl.dispatchEvent(new Event('change'));
}
if (p.length!== null) { document.getElementById('length').value = p.length;}
if (p.current!== null) { document.getElementById('current').value = p.current;}
if (p.area!== null && pending.areaValid) { areaEl.value = String(p.area);}
if (p.voltage!== null) { document.getElementById('voltage').value = p.voltage;}
if (p.area!== null &&!pending.areaValid && areaWarn) {
areaWarn.style.display = 'block';
areaWarn.textContent = '⚠ 音声で聞き取った断面積 ' + p.area + ' mm² は選択肢にありません。手動で選び直してください。';
} else if (areaWarn) {
areaWarn.style.display = 'none';
}
pending = null;
confirmBar.classList.remove('show');
status.textContent = '反映しました。計算結果を確認してください。';
document.getElementById('calc').click();
}

document.getElementById('vcOk').addEventListener('click', applyPending);
document.getElementById('vcCancel').addEventListener('click', function () {
pending = null;
confirmBar.classList.remove('show');
status.textContent = 'キャンセルしました。もう一度話すか、数値を直接入力してください。';
});

var recognition = new SpeechRecognition();
recognition.lang = 'ja-JP';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

var listening = false;
recognition.addEventListener('start', function () {
listening = true;
btn.classList.add('listening');
btn.textContent = '🔴 聞き取り中…（タップで停止）';
status.textContent = '話してください（例：「長さ50メートル、電流20アンペア、断面積5.5スケア」）';
});
recognition.addEventListener('end', function () {
listening = false;
btn.classList.remove('listening');
btn.textContent = '🎤 音声で入力';
});
recognition.addEventListener('error', function (e) {
var msg = '音声認識でエラーが発生しました。';
if (e.error === 'not-allowed') { msg = 'マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。';}
else if (e.error === 'no-speech') { msg = '声が聞き取れませんでした。もう一度お試しください。';}
else if (e.error === 'network') { msg = '音声認識サーバーに接続できませんでした（音声認識はオンライン処理の場合があります）。';}
status.textContent = msg;
});
recognition.addEventListener('result', function (e) {
var finalText = '';
var interimText = '';
for (var i = e.resultIndex; i < e.results.length; i++) {
if (e.results[i].isFinal) { finalText += e.results[i][0].transcript;}
else { interimText += e.results[i][0].transcript;}
}
if (interimText) { status.textContent = '聞き取り中：' + interimText;}
if (finalText) {
var parsed = window.parseVoiceInput(finalText);
showConfirm(finalText, parsed);
}
});

btn.addEventListener('click', function () {
if (listening) { recognition.stop(); return;}
confirmBar.classList.remove('show');
pending = null;
try { recognition.start();}
catch (err) { status.textContent = '音声認識を開始できませんでした。';}
});
})();
