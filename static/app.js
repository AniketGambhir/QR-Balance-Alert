const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);
const $ = id => document.getElementById(id);
let stream = null;
let detector = null;
let toastTimer;

function toast(message){
  const el=$('toast'); el.textContent=message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
}
async function loadState(){
  const res=await fetch('/api/state'); const data=await res.json();
  $('totalBalance').textContent=money(data.total);
  $('accountsGrid').innerHTML=data.accounts.map((a,i)=>`
    <div class="account">
      <div class="account-top"><div class="bank-logo">${['H','S','I'][i]}</div><div><div class="account-name">${a.bank}</div><div class="account-label">${a.label} •••• ${a.last4}</div></div></div>
      <div class="account-balance">${money(a.balance)}</div>
      <div class="account-foot"><span>Sample balance</span><span>Demo data</span></div>
    </div>`).join('');
  const scans=data.events.filter(e=>e.kind==='scan').length;
  const payments=data.events.filter(e=>e.kind==='payment').length;
  $('scanCount').textContent=scans; $('paymentCount').textContent=payments;
  $('activityList').innerHTML=data.events.length?data.events.map(e=>`
    <div class="activity"><div class="activity-icon ${e.kind==='scan'?'scan':''}">${e.kind==='scan'?'▦':'↗'}</div>
      <div class="activity-info"><b>${escapeHtml(e.title)}</b><small>${escapeHtml(e.detail)}</small></div>
      <div class="activity-meta">${e.amount===null?'<strong>SCAN</strong>':`<strong class="${e.amount>=0?'positive':'negative'}">${e.amount>=0?'+':''}${money(e.amount)}</strong>`}<small>${escapeHtml(e.time)}</small></div>
    </div>`).join(''):'<div class="empty">No activity yet.</div>';
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function simulate(direction){
  const amount=Number($('amount').value);
  const res=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({direction,amount})});
  const data=await res.json(); if(!res.ok){toast(data.error||'Could not simulate payment.');return;}
  await loadState(); toast('Demo payment alert added.');
}
$('sendDemo').addEventListener('click',()=>simulate('sent'));
$('receiveDemo').addEventListener('click',()=>simulate('received'));
$('refresh').addEventListener('click',()=>loadState().then(()=>toast('Activity refreshed.')));

async function recordScan(value){
  await fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({value})});
  await loadState(); $('scanStatus').textContent='QR scan recorded locally. No payment was made.'; toast('Demo QR scan recorded.');
}
async function stopCamera(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  $('camera').srcObject=null; $('camera').style.display='none'; $('startScan').textContent='Start camera';
}
$('startScan').addEventListener('click',async()=>{
  if(stream){await stopCamera();return;}
  if(!('BarcodeDetector' in window)){toast('Live scanning is not supported here. Try uploading a QR image.');return;}
  try{
    detector=new BarcodeDetector({formats:['qr_code']});
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video=$('camera'); video.srcObject=stream; video.style.display='block'; await video.play();
    $('startScan').textContent='Stop camera'; $('scanStatus').textContent='Point your camera at a QR code.';
    const scanLoop=async()=>{
      if(!stream)return;
      try{const codes=await detector.detect(video);if(codes.length){await recordScan(codes[0].rawValue||'QR code');await stopCamera();return;}}catch(e){}
      if(stream)requestAnimationFrame(scanLoop);
    }; scanLoop();
  }catch(e){toast('Camera permission was not granted or camera is unavailable.');await stopCamera();}
});
$('qrFile').addEventListener('change',async event=>{
  const file=event.target.files[0]; if(!file)return;
  if(!('BarcodeDetector' in window)){toast('QR image detection is not supported by this browser.');return;}
  try{const bitmap=await createImageBitmap(file);const d=new BarcodeDetector({formats:['qr_code']});const codes=await d.detect(bitmap);if(codes.length)await recordScan(codes[0].rawValue||'Uploaded QR image');else toast('No QR code found in that image.');}
  catch(e){toast('Could not read this image. Try a clear QR photo.');}
  event.target.value='';
});
loadState().catch(()=>toast('Unable to load dashboard data.'));
