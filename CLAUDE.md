@AGENTS.md

## 🛠️ Instructions pour l'Assistant

### Gestion des armes (catalogue)
- `data/template-arme.json` sert de base pour ajouter/modifier une arme dans le catalogue.
- Le catalogue est stocké dans `scripts/weapons.json` (liste complète avec URLs d'images).
- Pour **ajouter** une arme au catalogue : `node scripts/add-weapon.js '<json_object>'`
- Pour **modifier** une arme au catalogue : `node scripts/update-weapon.js <id> '<json_object>'`
- Ne jamais réécrire les fichiers JSON du catalogue manuellement.

### Meta Loadouts (builds méta)
- Les loadouts méta sont gérés dans `data/loadouts.json` via `lib/data.ts`.
- Pour ajouter/modifier un loadout méta, utiliser les fonctions exportées de `lib/data.ts`.
- Le catalogue d'armes (`scripts/weapons.json`) et les loadouts méta (`data/loadouts.json`) sont deux systèmes distincts.

### Base de données / Cache
- Le boilerplate Upstash Redis est centralisé dans `lib/upstash.ts`.
- Utiliser `hasUpstash()`, `upstashCommand()`, `upstashPipeline()` depuis ce module.
