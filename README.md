# Capitaine Cortese

Site de podcast pour publier mes poèmes lus à voix haute. Site statique, prévu pour GitHub Pages.

## Ajouter un poème

1. Mettre le fichier audio (de préférence `.mp3`) dans le dossier `audio/`, par ex. `audio/02-la-houle.mp3`.
2. Ajouter un bloc dans `episodes.json`, dans la liste `episodes` :

```json
{
  "id": "la-houle",
  "numero": 2,
  "titre": "La houle",
  "date": "2026-11-14",
  "duree": "2:35",
  "audio": "audio/02-la-houle.mp3",
  "album": "nouveau-depart",
  "partie": "I. Le diamant",
  "resume": "Une phrase qui présente le poème.",
  "texte": "Premier vers,\nsecond vers,\n\nnouvelle strophe."
}
```

   - `numero` : place dans l'album (le site et le flux suivent cet ordre, pas la date).
   - `album` : l'`id` d'un album de la liste `albums` en haut du fichier ; `partie` : le titre de section affiché au-dessus.
   - `id` : court, sans espaces ni accents (sert de lien direct : `…/#la-houle`).
   - `audio` vide (`""`) : le poème s'affiche avec « Enregistrement bientôt disponible ».
   - `texte` : `\n` = retour à la ligne, `\n\n` = nouvelle strophe.
   - Attention aux virgules entre les blocs.

3. Régénérer le flux RSS : `python generer_flux.py`
4. Pousser sur GitHub.

## Mise en ligne (une fois)

1. Créer un dépôt GitHub `capitaine-cortese` et y pousser ce dossier.
2. Settings → Pages → « Deploy from a branch » → `main` / racine.
3. Dans `episodes.json`, remplacer `urlSite` par l'adresse réelle du site, puis relancer `python generer_flux.py`.

## Spotify, Apple Podcasts, Deezer…

Le fichier `feed.xml` est un flux de podcast standard : il suffit de donner son adresse
(`https://…/capitaine-cortese/feed.xml`) sur Spotify for Creators, Apple Podcasts Connect, etc.
Apple exige une image de couverture carrée en **JPG ou PNG de 1400 à 3000 px** : exporter
`assets/couverture.svg` (ou une vraie photo) en `assets/couverture.jpg` et changer `image` dans `episodes.json`.

Limite GitHub : 100 Mo par fichier, ~1 Go par dépôt — largement assez pour des poèmes en MP3.

## Tester en local

```
python -m http.server 8000
```
puis ouvrir http://localhost:8000 (ouvrir `index.html` directement ne marche pas, le navigateur bloque la lecture de `episodes.json`).
