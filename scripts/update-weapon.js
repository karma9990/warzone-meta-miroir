const fs = require('fs');
const path = require('path');

const WEAPONS_DB = path.join(__dirname, 'weapons.json');

function updateWeapon(id, updates) {
    try {
        const data = JSON.parse(fs.readFileSync(WEAPONS_DB, 'utf8'));
        const index = data.findIndex(w => w.id === id);

        if (index === -1) {
            console.error(`Erreur : L'arme avec l'ID ${id} est introuvable.`);
            process.exit(1);
        }

        // Fusionner l'ancienne arme avec les mises à jour
        data[index] = { 
            ...data[index], 
            ...updates, 
            last_updated: new Date().toISOString().split('T')[0] 
        };

        fs.writeFileSync(WEAPONS_DB, JSON.stringify(data, null, 2));
        console.log(`Succès : ${data[index].name} (ID: ${id}) a été mise à jour.`);
    } catch (err) {
        console.error("Erreur critique :", err.message);
    }
}

// Récupération des arguments : ID puis Objet de mise à jour
const id = process.argv[2];
const input = process.argv[3];
let updates;

if (input.endsWith('.json')) {
    updates = JSON.parse(fs.readFileSync(path.join(process.cwd(), input), 'utf8'));
} else {
    updates = JSON.parse(input);
}

if (id && updates) {
    updateWeapon(id, updates);
}