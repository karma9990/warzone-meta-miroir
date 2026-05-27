@AGENTS.md
Lors de l'ajout d'une arme, utilise toujours data/template-arme.json comme base. Ne génère jamais la structure JSON de zéro.

Utiliser data/template-arme.json comme base.

Préparer l'objet JSON avec les infos méta.

Exécuter : node scripts/add-weapon.js '{"id":"...", "name":"...", ...}'

Ne jamais réécrire le fichier weapons.json manuellement.
## 🛠️ Instructions pour l'Assistant (Claude Code)

Pour toute modification des données d'armes (`data/*.json`), utilisez exclusivement les scripts fournis dans `/scripts`. 

- **Pour ajouter une arme :** Utilisez `node scripts/add-weapon.js '<json_object>'`.
- **Pour modifier une arme :** Utilisez `node scripts/update-weapon.js <id> '<json_object>'`.
- **Règle stricte :** Ne modifiez jamais manuellement les fichiers JSON pour éviter les erreurs de structure et limiter la consommation de jetons.