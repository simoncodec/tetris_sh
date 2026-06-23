# Shifumi Blocks

Prototype web mobile du jeu puzzle pierre-feuille-ciseaux.

## Lancer

Ouvrir `index.html` dans un navigateur.

## Regles V2

- L'accueil lance une partie en mode Placement, Arcade ou Tetris Arcade.
- Grille de 6 colonnes par 8 lignes, sauf Tetris Arcade qui utilise 12 lignes.
- Le joueur pose un bloc unitaire : pierre, feuille ou ciseaux.
- Pierre bat ciseaux, ciseaux bat feuille, feuille bat pierre.
- Trois blocs identiques alignes horizontalement ou verticalement disparaissent.
- Quatre, cinq ou six blocs identiques alignes fusionnent en objet special.
- Les blocs restants tombent avec la gravite.
- Chaque vague suivante augmente le multiplicateur de combo.

## Fusions

- 4 pierres : Onix ; 5 pierres : pepite d'or ; 6 pierres : diamant.
- 4 feuilles : feuille verte ; 5 feuilles : sac en plastique ; 6 feuilles : liasse de billets.
- 4 ciseaux : secateur ; 5 ciseaux : sabre ; 6 ciseaux : tronconneuse.

Les objets speciaux s'activent quand ils sont alignes avec deux blocs simples du meme type.

## Pouvoirs speciaux

- Onix : efface les deux diagonales du plateau.
- Feuille verte : efface un carre de 3 x 3 cases.
- Secateur : efface une ligne et une colonne.
- Pepite d'or : efface un diamant de 13 cases.
- Sac en plastique : efface un rectangle de 12 cases, selon l'orientation du match.
- Sabre : efface deux lignes ou deux colonnes paralleles.
- Diamant : efface tous les ciseaux.
- Liasse de billets : efface toutes les pierres.
- Tronconneuse : efface toutes les feuilles.

## Modes

- Placement : aucune ligne automatique, defaite quand il n'y a plus de case libre.
- Arcade : une ligne pousse depuis le bas toutes les 8 poses, puis 6, puis 5.
- Tetris Arcade : des tetrominos d'un seul type tombent sur la grille. Deplace, tourne ou fais tomber la piece avec les boutons ou les gestes (balayer a gauche/droite, vers le haut pour tourner, vers le bas pour tomber) ; les lignes completes disparaissent, puis les fusions Shifumi se resoudent.

## Score

- Chaque bloc retire vaut `10 x vague`.
- Fusion 4 / 5 / 6 : bonus de 60 / 150 / 280 points.
- Activation d'un pouvoir 4 / 5 / 6 : bonus de 80 / 160 / 300 points.
- Si les 3 types quittent le plateau dans la meme chaine, bonus Shifumi.
