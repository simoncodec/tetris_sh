# Shifumi Blocks

Prototype web mobile du jeu puzzle pierre-feuille-ciseaux.

## Lancer

Ouvrir `index.html` dans un navigateur.

## Regles V1

- L'accueil lance une partie en mode Placement ou Arcade.
- Grille de 6 colonnes par 8 lignes.
- Le joueur pose un bloc unitaire : pierre, feuille ou ciseaux.
- Pierre bat ciseaux, ciseaux bat feuille, feuille bat pierre.
- Les blocs orthogonaux du meme type fusionnent en cluster.
- Un cluster de 3 blocs ou plus devient charge.
- Un cluster charge detonne quand un bloc adjacent du type qu'il bat est present.
- La detonation retire le cluster charge et les victimes adjacentes.
- Les blocs restants tombent avec la gravite.
- Chaque vague suivante augmente le multiplicateur de combo.
- Un cluster charge sans victime reste sur le plateau.

## Modes

- Placement : aucune ligne automatique, defaite quand il n'y a plus de case libre.
- Arcade : une ligne pousse depuis le bas toutes les 8 poses, puis 6, puis 5.

## Score

- Chaque bloc retire vaut `10 x vague`.
- Cluster de 5+ : bonus de 50 points.
- Cluster de 7+ : bonus de 120 points.
- Si les 3 types quittent le plateau dans la meme chaine, bonus Shifumi.
