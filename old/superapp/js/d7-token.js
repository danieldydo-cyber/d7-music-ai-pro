/* D7 admin token shim: adds X-Admin-Token (localStorage d7.tok) to same-origin /api/ calls; degrades silently on 401. */
(function(){if(window.__d7tok)return;window.__d7tok=1;var F=window.fetch;if(!F)return;
window.fetch=function(u,o){try{var s=typeof u=='string'?u:(u&&u.url)||'';var a=new URL(s,location.href);
 if(a.origin==location.origin&&a.pathname.indexOf('/api/')==0){var t=localStorage.getItem('d7.tok');if(t){o=o||{};var h=new Headers(o.headers||(typeof u!='string'&&u.headers)||{});h.set('X-Admin-Token',t);o.headers=h}}}catch(e){}
 return F.call(this,u,o)}})();
/* D7 shared nav (one nav across all apps) */
(function(){function go(){if(document.getElementById('d7nav')||!document.body)return;
var L=[['/superapp.html','⚡ Super App'],['/app.html','🎛 App ONE'],['/index.html','🎚 DJ Pro Fly'],['/super.html','🚀 D7 SUPER'],['/pro-dj.html','💿 Pro DJ'],['/kali-live.html','📻 Kali Live'],['/d.html','🤖 Bot D'],['/public-chat.html','💬 Chat'],['/D7-SuperApp.apk','📱 APK']];
var n=document.createElement('div');n.id='d7nav';n.style.cssText='position:fixed;right:10px;bottom:10px;z-index:2147483000;font:13px system-ui,sans-serif';
var b=document.createElement('button');b.textContent='D7 ☰';b.title='Nawigacja D7';b.style.cssText='background:linear-gradient(90deg,#00f0ff,#ff2bd6);border:0;border-radius:18px;padding:8px 12px;font-weight:700;color:#000;cursor:pointer;box-shadow:0 0 12px #00f0ff88';
var m=document.createElement('div');m.style.cssText='display:none;position:absolute;right:0;bottom:42px;background:#0b0b14f2;border:1px solid #333;border-radius:10px;padding:6px;min-width:170px';
m.innerHTML=L.map(function(x){var on=location.pathname==x[0];return'<a href="'+x[0]+'" style="display:block;padding:6px 8px;border-radius:6px;text-decoration:none;color:'+(on?'#ff2bd6':'#00f0ff')+'">'+x[1]+'</a>'}).join('')+'<a href="#" id="d7navtok" style="display:block;padding:6px 8px;color:#aaa;text-decoration:none">🔑 Token: '+(localStorage.getItem('d7.tok')?'✅':'—')+'</a>';
b.onclick=function(){m.style.display=m.style.display=='none'?'block':'none'};n.appendChild(m);n.appendChild(b);document.body.appendChild(n);
document.getElementById('d7navtok').onclick=function(e){e.preventDefault();var t=prompt('Token admina D7 (wspólny dla wszystkich aplikacji):',localStorage.getItem('d7.tok')||'');if(t!==null){t.trim()?localStorage.setItem('d7.tok',t.trim()):localStorage.removeItem('d7.tok');this.textContent='🔑 Token: '+(t.trim()?'✅':'—')}}}
if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',go);else go()})();
