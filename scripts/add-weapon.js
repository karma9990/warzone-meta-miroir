const fs = require('fs');
const path = require('path');

const WEAPONS_DB = path.join(__dirname, 'weapons.json');

function addWeapon(newWeapon) {
    const data = JSON.parse(fs.readFileSync(WEAPONS_DB, 'utf8'));
    
    // Vérification de doublon
    if (data.find(w => w.id === newWeapon.id)) {
        console.error(`Erreur : L'ID '${newWeapon.id}' existe déjà.`);
        process.exit(1);
    }
    
    data.push({ ...newWeapon, last_updated: new Date().toISOString().split('T')[0] });
    fs.writeFileSync(WEAPONS_DB, JSON.stringify(data, null, 2));
    console.log(`Succès : ${newWeapon.name} a été ajoutée.`);
}

// Lit soit un chemin de fichier, soit un JSON direct
const input = process.argv[2];
let weaponData;

if (input.endsWith('.json')) {
    weaponData = JSON.parse(fs.readFileSync(path.join(process.cwd(), input), 'utf8'));
} else {
    weaponData = JSON.parse(input);
}

addWeapon(weaponData);