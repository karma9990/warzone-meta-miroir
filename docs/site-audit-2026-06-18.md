# Audit complet du site WZPRO Meta

Date: 2026-06-18
Perimetre: site web uniquement (`app/`, `components/`, `lib/`, contenus, SEO, UI/UX, parcours). L'application desktop/companion et ses scripts ne sont pas audites comme produit, sauf quand ils brouillent le site public.
Methode: 5 passes paralleles (UI/UX, conversion, SEO/i18n, performance Next.js, backlog produit), lecture code, checks locaux, build, lint, tests. Aucun screenshot.

## Executive summary

Le site a deja beaucoup de matiere utile: loadouts, fiches armes, quiz, IA WZPRO, Pro Tools, profils, leaderboard, actualites, newsletter et paiement. Le probleme principal n'est pas le manque de contenu; c'est la dispersion de l'experience.

Aujourd'hui, un joueur peut arriver sur le site et voir plusieurs promesses concurrentes: meta, pro tools, outils individuels, IA, leaderboard, actualites, createur, community/builds, companion. Le site gagnerait beaucoup a devenir un parcours simple:

1. Voir la meta du jour.
2. Trouver sa classe.
3. Comprendre ce qui a change avec le patch.
4. Sauvegarder/suivre ses armes.
5. Debloquer les outils avances si la valeur est claire.

Les trois priorites fortes:

1. Corriger les blocages de confiance et de build.
2. Clarifier navigation, offres et parcours paiement.
3. Allegir le rendu Next/CSS pour rendre le site plus rapide et plus maintenable.

## Check final

- `npm.cmd run lint`: OK avec 3 warnings dans `components/AccountProfileForm.tsx` (variables inutilisees).
- `npm.cmd test`: OK, 7 tests passent + audit assets OK.
- `npm.cmd run build`: ECHEC au 2026-06-18.

Erreur build:

```txt
./app/tier-list/page.tsx:9:1
Export translateTerm doesn't exist in target module
import { translateTerm } from '@/lib/runtimeTranslations';
```

Cause probable: `translateTerm` existe dans `lib/i18n.ts`, pas dans `lib/runtimeTranslations.ts`.
Note: `app/tier-list/` est non suivi dans Git au moment de l'audit, donc probablement une modification recente non stabilisee.

## P0 - Blocants immediats

### 1. Le build ne passe plus

Preuve:
- `app/tier-list/page.tsx:9` importe `translateTerm` depuis le mauvais module.
- `lib/i18n.ts:372` exporte bien `translateTerm`.
- `lib/runtimeTranslations.ts:1340` exporte `translateRuntimeText`, pas `translateTerm`.

Impact:
- Impossible de deployer proprement tant que cette route reste ainsi.
- Cette page peut aussi exposer du texte mojibake dans les titres si elle arrive en prod.

Action recommandee:
- Importer `translateTerm` depuis `@/lib/i18n`.
- Ajouter la route `/tier-list` a la navigation seulement si elle devient une vraie page pilier.
- Ajouter un test/build check obligatoire avant deploy.

### 2. Parcours paiement/claim a risque

Le parcours Pro permet d'acheter avec un email sur `components/ProAccessClientPage.tsx`, puis `app/api/polar-claim/route.ts` peut accorder l'entitlement a `user?.sub || metadata.userId || email`.

Le souci UX:
- L'utilisateur paie.
- Il arrive sur `/payment-success`.
- Il doit manipuler un checkout ID et email dans `components/PolarClaimForm.tsx`.
- Le claim Pro renvoie vers `/tools/aim-tools?claimed=1`.
- Mais `app/tools/[toolId]/page.tsx` exige un compte connecte avec entitlement pour ouvrir l'outil.

Impact:
- Moment de paiement anxiogene.
- Risque de "j'ai paye mais c'est verrouille".
- Forte perte de confiance sur une offre a 50 EUR/mois.

Action recommandee:
- Rendre le compte obligatoire avant paiement Pro et achat outil.
- Ou creer automatiquement un flow magic-link depuis l'email checkout.
- Sur `/payment-success`, auto-claim si `checkout_id` existe, puis afficher un etat clair:
  - "Acces active"
  - "Connecte-toi avec cet email"
  - "Ouvrir mes outils"
  - "Gerer mon abonnement"

### 3. Offre individuelle a 9 EUR incoherente

Preuve:
- `app/pro-tools/page.tsx` affiche une offre modulaire "From 9 EUR".
- `components/ToolsIndividualClientPage.tsx` liste les outils a `9 EUR`.
- Mais pour les outils hors companion, le bouton renvoie vers `/pro-access` au lieu de lancer l'achat individuel (`components/ToolsIndividualClientPage.tsx:188`).

Impact:
- L'utilisateur lit "GET AIM TOOLS - 9 EUR" mais atterrit sur l'offre Pro a 50 EUR/mois.
- Rupture de confiance directe.

Action recommandee:
- Option A: activer le vrai checkout individuel pour chaque `productKey`.
- Option B: supprimer l'offre 9 EUR et renommer la page en "Comparer les offres Pro".
- Option C: garder 9 EUR mais expliquer clairement "mensuel par outil" + "bundle Pro a 50 EUR".

## P1 - UI/UX et architecture produit

### 4. Navigation trop large et dupliquee

La navigation principale est definie a plusieurs endroits:
- Home: `components/HomeClient.tsx`
- Navigation generique: `components/LocalizedSafariBar.tsx`
- Pro Tools: `app/pro-tools/page.tsx`
- Leaderboard: topbar dediee dans `app/leaderboard/page.tsx`

Problemes observes:
- Certaines pages affichent "Createur", d'autres non.
- Pro Tools a une recherche visuelle sans comportement clair.
- Les entrees "Actualites", "Patchnote", "Meta Trends", "Quiz", "Pro Tools", "Tools Individual", "IA", "Pro Classe", "Community" se concurrencent.

Action recommandee:
- Creer une source unique `NAV_ITEMS`.
- Limiter la nav visible a 5 entrees:
  1. Meta
  2. Loadouts
  3. IA WZPRO
  4. News
  5. Profil / Leaderboard
- Mettre Pro Tools, Quiz, Tier List, Pro Classes et Setup dans une sous-navigation contextuelle.
- Si "Community" n'est pas une vraie zone produit assumee, la retirer de la navigation principale ou la renommer "Builds partages".

### 5. Accueil: proposition de valeur forte mais trop dispersee

Points positifs:
- Hero visuel marque.
- Loadouts et classement accessibles.
- Comparateur present.
- Favoris locaux/compte.

Friction:
- CTA FR "Outil Pro" pointe vers `#all-loadouts`, donc pas vers un outil.
- La home charge beaucoup de logique client dans `components/HomeClient.tsx` (655 lignes).
- La recherche melange loadouts et profils, ce qui peut brouiller l'objectif principal.

Action recommandee:
- Transformer la home en "Meta du jour":
  - meilleure longue portee
  - meilleur close range
  - duo recommande
  - armes qui montent/descendent
  - derniere verification patch
  - CTA "Copier la classe" / "Comparer" / "Recevoir l'alerte"
- Deplacer les fonctions secondaires plus bas.

### 6. Pages loadout: riches mais pas assez actionnables

Les fiches loadout ont deja de bonnes bases: score, image, accessoires, stats, partage et watch button.

Actions a ajouter:
- Copier les accessoires en un clic.
- Sauvegarder en favori compte.
- Comparer avec une autre arme.
- Demander a l'IA d'adapter la classe.
- Voir le meilleur duo.
- Voir les alternatives "faible recul", "ranked", "resurgence".
- Recevoir une alerte si l'arme change apres patch.

Impact:
- Les fiches deviennent le coeur du site, pas juste une page d'information.

### 7. Pro Access: prix eleve pour une page trop compacte

La page `components/ProAccessClientPage.tsx` a des preuves, FAQ et consentement legal. C'est propre. Mais pour 50 EUR/mois, elle manque de demonstration concrete.

Action recommandee:
- Ajouter une section "Ce que tu debloques vraiment":
  - exemple Aim Tools
  - exemple Next Meta
  - exemple plan de rotation
  - exemple routine 10 minutes
- Ajouter comparaison claire:
  - Gratuit
  - 9 EUR / outil
  - 50 EUR / Pro complet
- Ajouter "preview avant achat" avec mini extraits reels.
- Ajouter reassurance: annulation, acces, support, facture, compte.

## P1 - SEO, i18n et contenu

### 8. Confusion `/`, `/home` et URLs localisees

Etat actuel:
- `/` est une page de choix de langue.
- `/fr`, `/en`, `/es` sont reecrites vers `/home` via `proxy.ts`.
- Le sitemap donne la priorite 1 a la route vide `""`.
- `/home` reste accessible directement.

Risque:
- Signaux SEO dilues.
- Canonical peu clair.
- Experience utilisateur moins directe.

Action recommandee:
- Decider une strategie:
  - soit `/` redirige vers `/en` ou la meilleure locale detectee;
  - soit `/` reste language landing mais en `noindex` ou priorite faible.
- Ajouter canonical explicite pour `/home` et les locales.

### 9. Hreflang incomplet dans les metadata HTML

Le sitemap genere des alternates dans `app/sitemap.ts`, mais les pages n'exposent pas toutes `alternates.languages` dans leurs metadata.

Action recommandee:
- Creer un helper SEO central:
  - `canonicalFor(route, locale)`
  - `languagesFor(route)`
  - metadata localisee par page pilier.
- L'utiliser sur home, loadouts, pro tools, actualites, quiz, tier-list, leaderboard.

### 10. i18n annoncee plus large que support reel

Preuve:
- `ALL_LOCALES` contient 9 langues.
- `SUPPORTED_LOCALES` contient seulement `en`, `fr`, `es`.
- `LANGUAGE_OPTIONS` liste plus de langues.
- Le JSON-LD annonce plusieurs langues.

Risque:
- L'utilisateur voit des langues pas vraiment completement supportees.
- SEO international confus.

Action recommandee:
- Soit limiter visuellement aux 3 langues supportees.
- Soit assumer les 9 langues et finir la localisation.
- Supprimer la traduction runtime DOM comme strategie principale.

### 11. Contenu actualites fragile

Les routes actualites existent, mais le contenu peut etre vide ou fallback selon les donnees.

Action recommandee:
- Si une categorie n'a pas d'article: `noindex` ou page non exposee.
- Ajouter 1 page pilier par intention SEO:
  - `/meta/long-range`
  - `/meta/smg`
  - `/meta/ranked`
  - `/meta/controller`
  - `/meta/easy-recoil`
- Relier chaque patch note aux armes concernees.

## P1 - Performance et maintenabilite

### 12. Root layout dynamique

Preuve:
- `app/layout.tsx` appelle `headers()` pour obtenir la locale.
- Le build precedent montrait presque toutes les routes en rendu dynamique.

Impact:
- Moins de cache.
- Plus de cout serveur.
- Pages statiques rendues dynamiques sans necessite.

Action recommandee:
- Sortir la detection locale du root layout.
- Garder le root layout statique.
- Faire la locale dans un segment, un proxy plus clair, ou par page quand necessaire.

### 13. CSS global trop lourd

Mesures:
- `app/globals.css`: 175,723 octets, 8,290 lignes.
- `app/home-priority.css`: 77,345 octets, 3,093 lignes.
- `app/pro-tools/pro-tools.css`: 44,244 octets, 1,850 lignes.
- 2,846 occurrences de `!important` dans les fichiers audites.

Risque:
- Regressions visuelles faciles.
- Styles page-only charges partout.
- Difficile de comprendre quelle regle gagne.

Action recommandee:
- Garder en global uniquement tokens, reset, typographie, surfaces de base.
- Deplacer `home-priority.css` vers le layout/page home.
- Deplacer les styles Pro Tools vers la page Pro Tools uniquement.
- Creer des composants/states communs: `Button`, `Field`, `TopNav`, `Panel`, `StatPill`, `LoadoutCard`.

### 14. RuntimeI18n mute le DOM cote client

Preuve:
- `components/RuntimeI18n.tsx` parcourt les text nodes et attributs avec `createTreeWalker` et `querySelectorAll('*')`.

Risque:
- Travail client sur toutes les pages non anglaises.
- Risque de flash ou traduction incoherente.
- Accessibilite et SEO moins fiables.

Action recommandee:
- Localiser cote serveur.
- Garder une traduction runtime seulement comme fallback temporaire sur pages legacy.

### 15. Scene Three.js chargee directement sur Pro Tools

Preuve:
- `components/ProToolsWeaponScene.tsx` importe `three`, `GLTFLoader`, `OBJLoader`.
- Assets lourds:
  - `public/assets/3d/czbren2.glb`: 1,979,580 octets.
  - `public/assets/3d/bullet-762.obj`: 832,025 octets.
- Animation RAF continue tant que le composant est monte.

Action recommandee:
- Lazy-load au scroll ou interaction.
- Ajouter fallback image statique.
- Pause RAF hors viewport.
- Respecter `prefers-reduced-motion`.
- Convertir OBJ en GLB compresse si possible.

### 16. Gros fichiers dans `public`

Mesures:
- `public/downloads/WZPRO-Companion-Setup.exe`: 55,898,670 octets.
- doublon dans `public/downloads/wzpro-companion/v0.1.0/`.
- HDR `photo_studio_broadway_hall_4k.hdr`: 24,690,938 octets.

Impact:
- Artefacts de deploy plus lourds.
- Couts et crawls possibles.

Action recommandee:
- Mettre les fichiers de telechargement sur Blob/CDN.
- Garder dans `public` uniquement ce qui est necessaire au rendu site.

## Backlog fonctionnel recommande

### MVP - prochain sprint

1. Corriger le build `/tier-list`.
2. Clarifier offre 9 EUR vs Pro 50 EUR.
3. Refaire le post-paiement/claim.
4. Centraliser la navigation.
5. Creer le bloc "Meta du jour".
6. Ajouter filtres loadout orientes joueur:
   - mode
   - role
   - input
   - faible recul
   - ranked
   - resurgence
   - debutant
7. Ajouter actions rapides sur fiches loadout.
8. Corriger les textes FR/ES visibles et supprimer les blocs parasites.

### Next

1. Relier patch notes et loadouts.
2. IA personnalisee avec favoris, profil et stats.
3. Comparateur 3-4 armes.
4. Score meta explicable.
5. Leaderboard par saison/semaine, input, region, mode.
6. Pages SEO par intention.
7. Admin health dashboard contenu: dernier sync, routes vides, images manquantes, armes obsoletes.

### Later

1. Cartes partageables automatiques pour loadouts/profils/classements.
2. Recommandations post-session.
3. Historique des saisons leaderboard.
4. Mode esport/tournois plus structure.
5. IA image/VOD plus profonde.

## Roadmap 30 jours

### Semaine 1 - Stabiliser

- Corriger build.
- Nettoyer `sign-in` et OAuth provider status.
- Aligner paiement individuel vs Pro.
- Corriger payment success.
- Retirer ou renommer Community/Builds si ce n'est pas assume dans le produit.

### Semaine 2 - Clarifier

- Centraliser navigation.
- Simplifier home autour de "Meta du jour".
- Ajouter CTA coherents sur home, loadouts, Pro Tools.
- Nettoyer textes FR/ES principaux.

### Semaine 3 - Rendre utile

- Filtres loadouts.
- Actions rapides loadout.
- Patch-to-loadout.
- Watch/favoris plus visibles.

### Semaine 4 - Optimiser

- Root layout statique.
- Decouper CSS global.
- Server-render home + ilots client.
- Lazy-load Three.js.
- Retirer gros downloads de `public`.

## Definition d'une meilleure experience cible

Un joueur arrive et comprend en moins de 10 secondes:

- quelle arme jouer aujourd'hui;
- pourquoi elle est meta;
- quel duo prendre;
- ce qui a change depuis le patch;
- quoi faire ensuite selon son profil.

Le site doit devenir moins "catalogue de pages" et plus "assistant de decision Warzone".

Phrase de positionnement recommandee:

> WZPRO Meta t'aide a choisir la bonne classe Warzone avant de lancer: meta du jour, loadouts expliques, patch alerts et outils d'entrainement.

## Notes de prudence

- Les routes community/builds existent dans le code, mais si ce n'est pas un axe produit voulu, elles doivent etre retirees de la navigation principale ou renommees.
- Les pages companion/download existent sur le site, mais n'ont pas ete auditees comme app desktop. Elles sont seulement signalees quand elles brouillent le site ou alourdissent `public`.
- Le rapport ne modifie pas le produit; il sert de dossier de decision.
