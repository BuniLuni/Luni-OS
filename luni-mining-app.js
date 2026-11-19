/* Luni Mining 95 Ultimate: adds the game to the site as a desktop app (🪙).
   Load AFTER the main script in index.html:  <script src="luni-mining-app.js"></script>
   The game page (luni-mining-95.html) reuses the site's Supabase client, so the site's GitHub login is the game login. */
(()=>{
 if(typeof APPS==='undefined'||typeof win!=='function'||typeof sb==='undefined')return;
 window.LUNI_BRIDGE={sb,login,isOwner:()=>isOwner(),me:()=>me};
 if(APPS.some(a=>a[0]==='mining'))return;
 APPS.push(['mining','Luni Mining 95 Ultimate','🪙',b=>{b.style.padding='0';b.style.overflow='hidden';
  b.append(h('iframe',{src:'luni-mining-95.html',allow:'fullscreen',title:'Luni Mining 95 Ultimate',style:'width:100%;height:100%;border:0;background:#008080'}))},800,620]);
 desk();
})();
