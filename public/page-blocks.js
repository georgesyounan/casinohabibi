export const pageRoles={
  home:['Home','Accueil'],about:['About the casino','À propos du casino'],accounts:['Accounts','Comptes'],bonuses:['Bonuses','Bonus'],
  deposit:['Deposit','Dépôt'],faq:['FAQ','FAQ'],games:['All games','Tous les jeux'],profile:['Profile','Profil'],terms:['Terms and conditions','Conditions'],transactions:['Transactions','Transactions']
};
export const blockTypes={section:['Section','Section'],text:['Text','Texte'],image:['Image','Image'],video:['Video','Vidéo'],button:['Button','Bouton'],slider:['Carousel','Carrousel'],space:['Spacing','Espacement']};
export const pictures=['campaign-casino.webp','campaign-match.webp','campaign-reels.webp','sports-weekend.webp','club-gift.webp','lobby-coast.webp'];
export const destinations={games:'#games',club:'?view=promotions#player-club',sports:'?view=sports',support:'?view=help',account:'?access=signin'};
export const newLayout=()=>({theme:'navy',font:'system',blocks:[]});
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function drawLayout(doc,base,fr){
  if(!doc?.blocks?.length)return '';
  const html=doc.blocks.map(b=>{
    const value=esc(fr?(b.fr||b.en):(b.en||b.fr)),media=esc(base+'/'+b.media);
    switch(b.type){
      case 'section':return '<h2>'+value+'</h2>';
      case 'text':return '<p>'+value+'</p>';
      case 'image':return '<figure><img loading="lazy" src="'+media+'" alt="'+value+'"></figure>';
      case 'video':return '<figure><video controls playsinline preload="none" poster="'+esc(base+'/sports-weekend.webp')+'" src="'+esc(base+'/studio-replay.mp4')+'" aria-label="'+value+'"></video><figcaption>'+value+'</figcaption></figure>';
      case 'button':return '<a class="button" href="'+esc(base+'/'+destinations[b.target])+'">'+value+'</a>';
      case 'slider':return '<section aria-label="'+value+'"><h3>'+value+'</h3><div class="block-slides" tabindex="0">'+b.pictures.map(p=>'<img loading="lazy" alt="" src="'+esc(base+'/'+p)+'">').join('')+'</div></section>';
      case 'space':return '<div aria-hidden="true" class="block-space-'+b.size+'"></div>';
      default:return '';
    }
  }).join('');
  return '<section class="published-blocks theme-'+esc(doc.theme)+' font-'+esc(doc.font)+'">'+html+'</section>';
}
