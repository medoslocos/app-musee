// Rendu d'une carte d'œuvre (utilisé par l'accueil et la page Collections).
export function creerCarteOeuvre(oeuvre) {
  const carte = document.createElement("a");
  carte.className = "card card-oeuvre";
  carte.href = `./oeuvre.html?id=${encodeURIComponent(oeuvre.id)}`;
  carte.innerHTML = `
    <img class="card-photo" src="${oeuvre.image}" alt="" />
    <h3>${oeuvre.titre}</h3>
    <p>${oeuvre.categorie} — ${oeuvre.date}</p>
    <p class="card-accroche">${oeuvre.accroche}</p>
    <span class="card-cta">Découvrir l'œuvre&nbsp;→</span>
  `;
  return carte;
}
