function e(c){const a=document.createElement("a");return a.className="card card-oeuvre",a.href=`./oeuvre.html?id=${encodeURIComponent(c.id)}`,a.innerHTML=`
    <img class="card-photo" src="${c.image}" alt="" />
    <h3>${c.titre}</h3>
    <p>${c.categorie} — ${c.date}</p>
    <p class="card-accroche">${c.accroche}</p>
    <span class="card-cta">Découvrir l'œuvre&nbsp;→</span>
  `,a}export{e as c};
