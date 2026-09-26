import { ensureArtwork, decodePayload, renderPoster } from './poster.js';

const params = new URLSearchParams(window.location.search);
const payload = decodePayload(params.get('p') || '');
const canvas = document.getElementById('phone-poster');
const status = document.getElementById('share-status');
await ensureArtwork(payload?.persona || 'pulse');
if (payload) renderPoster(canvas, payload);
else {
  renderPoster(canvas, {});
  status.textContent = '分享链接无效，当前展示的是示例海报。';
}
document.getElementById('phone-image').src = canvas.toDataURL('image/png');

function getBlob() { return new Promise(resolve => canvas.toBlob(resolve, 'image/png')); }
const saveLink = document.getElementById('save-phone');
const posterBlob = await getBlob();
saveLink.href = posterBlob ? URL.createObjectURL(posterBlob) : canvas.toDataURL('image/png');
saveLink.removeAttribute('aria-disabled');
async function copyLink() {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  }
  const field = document.createElement('input');
  field.value = window.location.href;
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  return copied;
}
saveLink.addEventListener('click', () => {
  status.textContent = '若没有看到下载提示，请长按下方海报图片，选择保存图片。';
});
document.getElementById('native-share').addEventListener('click', async () => {
  try {
    const blob = await getBlob();
    const file = new File([blob], 'ECHO-WAVE-音乐海报.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: '我的 ECHO WAVE 音乐海报', files: [file] });
    else if (navigator.share) await navigator.share({ title: '我的 ECHO WAVE 音乐海报', url: window.location.href });
    else { status.textContent = await copyLink() ? '链接已复制，可粘贴分享。' : '请复制浏览器地址分享。'; }
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = '分享没有完成，请先保存图片再发送。';
  }
});
