'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../../wallpapers/listening-garden');
const html=fs.readFileSync(path.join(__dirname,'shell.html'),'utf8')
 .replace('/* THREE_BUNDLE */',()=>fs.readFileSync(path.join(__dirname,'vendor/three.min.js'),'utf8'))
 .replace('/* GARDEN_SCENE */',()=>fs.readFileSync(path.join(__dirname,'scene.js'),'utf8')
   .replace('/* GARDEN_NATURE */',()=>fs.readFileSync(path.join(__dirname,'nature.js'),'utf8'))
   .replace('/* GARDEN_WILLOW */',()=>fs.readFileSync(path.join(__dirname,'willow.js'),'utf8'))
   .replace('/* GARDEN_FLORA */',()=>fs.readFileSync(path.join(__dirname,'flora.js'),'utf8'))
   .replace('/* GARDEN_ARCHITECTURE */',()=>fs.readFileSync(path.join(__dirname,'architecture.js'),'utf8'))
   .replace('/* GARDEN_WATER */',()=>fs.readFileSync(path.join(__dirname,'water.js'),'utf8'))
   .replace('/* GARDEN_LIFE */',()=>fs.readFileSync(path.join(__dirname,'life.js'),'utf8'))
   .replace('/* GARDEN_RESIDENTS */',()=>fs.readFileSync(path.join(__dirname,'residents.js'),'utf8'))
   .replace('/* GARDEN_ANIMALS */',()=>fs.readFileSync(path.join(__dirname,'animals.js'),'utf8'))
   .replace('/* GARDEN_BIRDS */',()=>fs.readFileSync(path.join(__dirname,'birds.js'),'utf8')));
fs.writeFileSync(path.join(root,'wallpaper.html'),html);
console.log('Built standalone 3D garden:',html.length,'characters');
