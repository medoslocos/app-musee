/**
 * Edge function Supabase `analyse-bijou` (Deno).
 * Reçoit une photo de bijou (JPEG base64), interroge l'API Anthropic en
 * multimodal avec le prompt versionné dans /prompts/analyse-bijou.md
 * (recopié ici par scripts/synchroniser-prompt.mjs), et renvoie le JSON
 * d'analyse. La clé Anthropic ne quitte JAMAIS le serveur.
 *
 * Secrets attendus (supabase secrets set) :
 *   CLE_API_ANTHROPIC   — clé API Anthropic
 *   MODELE_ANALYSE      — optionnel, défaut « claude-sonnet-5 »
 *
 * Déploiement : voir TODO-HUMAIN.md.
 */

const PROMPT_SYSTEME = await Deno.readTextFile(new URL('./prompt.md', import.meta.url));

const ENTETES_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function reponseJson(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json', ...ENTETES_CORS },
  });
}

Deno.serve(async (requete: Request) => {
  if (requete.method === 'OPTIONS') {
    return new Response(null, { headers: ENTETES_CORS });
  }
  if (requete.method !== 'POST') {
    return reponseJson({ erreur: 'Méthode non autorisée' }, 405);
  }

  const cleApi = Deno.env.get('CLE_API_ANTHROPIC');
  if (cleApi === undefined || cleApi === '') {
    return reponseJson({ erreur: 'CLE_API_ANTHROPIC non configurée côté serveur' }, 500);
  }

  let image: string;
  try {
    const corps = await requete.json();
    image = corps.image_jpeg_base64;
    if (typeof image !== 'string' || image.length === 0) {
      return reponseJson({ erreur: 'Champ image_jpeg_base64 manquant' }, 400);
    }
    // ~1,5 Mo de JPEG ≈ 2 Mo de base64 : au-delà, la photo n'a pas été compressée.
    if (image.length > 2_500_000) {
      return reponseJson({ erreur: 'Image trop lourde — compresser avant envoi' }, 413);
    }
  } catch {
    return reponseJson({ erreur: 'Corps JSON invalide' }, 400);
  }

  const reponseAnthropic = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': cleApi,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('MODELE_ANALYSE') ?? 'claude-sonnet-5',
      max_tokens: 1500,
      system: PROMPT_SYSTEME,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            {
              type: 'text',
              text: 'Analyse ce bijou et réponds avec le JSON strict demandé, sans aucun texte autour.',
            },
          ],
        },
      ],
    }),
  });

  if (!reponseAnthropic.ok) {
    const detail = await reponseAnthropic.text();
    console.error(`API Anthropic : ${reponseAnthropic.status}`);
    return reponseJson(
      { erreur: `Le service d'analyse a répondu ${reponseAnthropic.status}`, detail },
      502,
    );
  }

  const donnees = await reponseAnthropic.json();
  const texte = donnees?.content?.[0]?.text;
  if (typeof texte !== 'string') {
    return reponseJson({ erreur: 'Réponse du modèle sans texte' }, 502);
  }

  // Le client revalide avec le schéma Zod partagé ; on transmet le texte brut
  // dans une enveloppe stable.
  return reponseJson({ texte });
});
